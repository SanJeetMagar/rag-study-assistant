"""
Generating quiz questions from a document, and grading the answers.

Questions are written from the document's own passages, not from the model's
general knowledge -- a quiz that tests material the syllabus does not cover is
the same failure as an invented answer, just harder to notice.
"""

import json
import logging
import re
import threading

from django.db import close_old_connections, transaction

from .generation import get_provider

logger = logging.getLogger(__name__)

QUESTIONS_PER_QUIZ = 8
OPTIONS_PER_QUESTION = 4

GENERATION_SYSTEM_PROMPT = """You write exam questions for BICTE students at Tribhuvan University.

You are given numbered passages from one course document. Write questions that
test understanding of those passages and nothing else.

Rules:
1. Every question must be answerable from the passages alone. Never rely on
   outside knowledge, and never test a fact the passages do not state.
2. Cite the passage each question came from by its number.
3. For multiple choice, give exactly four options. Exactly one is correct. The
   wrong options must be plausible to someone who half-remembers the material —
   not obviously absurd, and not subtly ambiguous.
4. Vary what you test: definitions, comparisons, ordering, purpose, application.
5. Write a one- or two-sentence explanation of why the correct answer is right,
   referring to what the passage says.
6. Use the terminology the passages use.

Return ONLY a JSON array, no prose and no code fences. Each element:

{"kind": "mcq", "passage": 2, "question": "...", "options": ["...","...","...","..."],
 "correct_index": 0, "explanation": "..."}

or, for a question with no fixed set of choices:

{"kind": "short", "passage": 3, "question": "...", "expected_answer": "what a correct answer must say", "explanation": "..."}

Write mostly multiple choice, with one or two short-answer questions."""


GRADING_SYSTEM_PROMPT = """You mark one short exam answer for a BICTE student.

You are given the question, what a correct answer must contain, the syllabus
passage it came from, and the student's answer.

Judge only whether the student's answer conveys the required meaning. Ignore
spelling, grammar, phrasing and length. A correct idea in the student's own
words is correct. A fluent answer that misses or contradicts the required
point is not.

Return ONLY this JSON, no prose and no code fences:

{"correct": true, "feedback": "one or two sentences addressed to the student"}

If it is wrong, say what was missing and point at what the passage says. Be
direct and brief. Do not be encouraging about an incorrect answer."""


class QuizGenerationError(Exception):
    """Raised when a usable set of questions could not be produced."""


def _extract_json(text):
    """
    Pull the JSON payload out of a model response.

    Models wrap JSON in ```json fences often enough that stripping them is
    cheaper than fighting it in the prompt.
    """
    cleaned = re.sub(r'^\s*```(?:json)?|```\s*$', '', text.strip(), flags=re.MULTILINE)
    try:
        return json.loads(cleaned)
    except json.JSONDecodeError:
        # Fall back to the outermost array in the response.
        match = re.search(r'\[.*\]', cleaned, re.DOTALL)
        if not match:
            raise QuizGenerationError('The model did not return usable JSON.')
        try:
            return json.loads(match.group(0))
        except json.JSONDecodeError as exc:
            raise QuizGenerationError(f'The model returned malformed JSON: {exc}') from exc


def _select_chunks(document, limit=6):
    """
    Spread the sample across the document rather than taking the first N.

    Chunks are ordered, so the first six are all the opening pages -- a quiz
    built from those would only ever test the introduction.
    """
    chunks = list(document.chunks.all())
    if len(chunks) <= limit:
        return chunks
    step = len(chunks) / limit
    return [chunks[int(i * step)] for i in range(limit)]


def _validate(raw, chunks):
    """Keep only well-formed questions. A malformed one is dropped, not guessed at."""
    questions = []
    for item in raw:
        if not isinstance(item, dict):
            continue
        text = (item.get('question') or '').strip()
        if not text:
            continue

        kind = item.get('kind', 'mcq')
        # `passage` is 1-based in the prompt.
        index = item.get('passage')
        source = None
        if isinstance(index, int) and 1 <= index <= len(chunks):
            source = chunks[index - 1]

        if kind == 'short':
            questions.append({
                'kind': 'short',
                'text': text,
                'options': [],
                'correct_index': None,
                'expected_answer': (item.get('expected_answer') or '').strip(),
                'explanation': (item.get('explanation') or '').strip(),
                'source': source,
            })
            continue

        options = item.get('options')
        correct = item.get('correct_index')
        if (
            not isinstance(options, list)
            or len(options) != OPTIONS_PER_QUESTION
            or not all(isinstance(o, str) and o.strip() for o in options)
            or not isinstance(correct, int)
            or not 0 <= correct < OPTIONS_PER_QUESTION
        ):
            logger.warning('Dropping malformed MCQ: %s', text[:60])
            continue

        questions.append({
            'kind': 'mcq',
            'text': text,
            'options': [o.strip() for o in options],
            'correct_index': correct,
            'expected_answer': '',
            'explanation': (item.get('explanation') or '').strip(),
            'source': source,
        })
    return questions


def generate_quiz(quiz):
    """Fill a quiz with questions drawn from its document. Runs synchronously."""
    from apps.quizzes.models import Question, Quiz

    quiz.status = Quiz.Status.GENERATING
    quiz.error_message = ''
    quiz.save(update_fields=['status', 'error_message'])

    try:
        chunks = _select_chunks(quiz.document)
        if not chunks:
            raise QuizGenerationError(
                'This document has no indexed passages yet, so there is nothing '
                'to write questions from.'
            )

        passages = '\n\n'.join(
            f'[Passage {i}'
            + (f', page {chunk.page_number}' if chunk.page_number else '')
            + f']\n{chunk.content}'
            for i, chunk in enumerate(chunks, start=1)
        )
        user_message = (
            f'DOCUMENT: {quiz.document.title}\n\n{passages}\n\n---\n\n'
            f'Write {QUESTIONS_PER_QUIZ} questions from these passages.'
        )

        response = get_provider().generate(GENERATION_SYSTEM_PROMPT, user_message)
        questions = _validate(_extract_json(response), chunks)

        if not questions:
            raise QuizGenerationError(
                'No usable questions came back. Try again, or check the document '
                'has enough readable text.'
            )

        with transaction.atomic():
            quiz.questions.all().delete()
            Question.objects.bulk_create([
                Question(
                    quiz=quiz,
                    order=i,
                    kind=q['kind'],
                    text=q['text'],
                    options=q['options'],
                    correct_index=q['correct_index'],
                    expected_answer=q['expected_answer'],
                    explanation=q['explanation'],
                    source_chunk=q['source'],
                )
                for i, q in enumerate(questions)
            ])
            quiz.status = Quiz.Status.READY
            quiz.save(update_fields=['status'])

        logger.info('Generated %d questions for quiz %s', len(questions), quiz.pk)
        return len(questions)

    except Exception as exc:
        quiz.status = Quiz.Status.ERROR
        quiz.error_message = str(exc)
        quiz.save(update_fields=['status', 'error_message'])
        logger.exception('Quiz generation failed for %s', quiz.pk)
        raise


def generate_quiz_async(quiz):
    """Generate in a background thread; the frontend polls `status`."""

    def run():
        close_old_connections()
        try:
            generate_quiz(quiz)
        except Exception:
            pass  # already recorded on the model
        finally:
            close_old_connections()

    thread = threading.Thread(target=run, daemon=True, name=f'quiz-{quiz.pk}')
    thread.start()
    return thread


# ------------------------------------------------------------------- grading

def grade_multiple_choice(question, selected_index):
    """
    Mark an MCQ.

    Deterministic on purpose. Comparing two integers is instant, free and
    exactly right; a language model asked to do the same would be slower,
    cost money and occasionally disagree with itself.
    """
    correct = selected_index == question.correct_index
    return correct, question.explanation


def grade_short_answer(question, text_answer):
    """
    Mark a free-text answer with the model.

    This is where a grader earns its place: there is no key to compare
    against, and a correct idea in different words must still count. The
    source passage goes into the prompt so the judgement stays anchored to
    the syllabus rather than the model's own opinion.
    """
    answer = (text_answer or '').strip()
    if not answer:
        return False, 'No answer given.'

    passage = question.source_chunk.content if question.source_chunk else ''
    user_message = (
        f'QUESTION: {question.text}\n\n'
        f'A CORRECT ANSWER MUST CONVEY: {question.expected_answer}\n\n'
        f'SYLLABUS PASSAGE:\n{passage}\n\n'
        f"STUDENT'S ANSWER: {answer}"
    )

    try:
        response = get_provider().generate(GRADING_SYSTEM_PROMPT, user_message)
        verdict = _extract_json(response)
        if isinstance(verdict, list):
            verdict = verdict[0] if verdict else {}
        return bool(verdict.get('correct')), (verdict.get('feedback') or '').strip()
    except Exception as exc:
        logger.warning('Short-answer grading failed: %s', exc)
        # Never silently mark a student wrong because the grader was
        # unavailable -- say so, and leave it uncounted.
        return False, 'This answer could not be marked automatically. Ask your teacher to review it.'
