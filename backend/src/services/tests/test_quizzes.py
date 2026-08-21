"""
Quiz generation, taking and marking.

Runs on the mock provider, so no network and no API spend.
"""

from django.contrib.auth import get_user_model
from django.test import TestCase, override_settings
from rest_framework.test import APIClient

from apps.courses.models import Course
from apps.documents.models import Document, DocumentChunk
from apps.quizzes.models import Question, Quiz
from services.embedder import embed_text
from services.generation import reset_provider_cache
from services.quiz import generate_quiz

User = get_user_model()


@override_settings(LLM_PROVIDER='mock')
class QuizTestCase(TestCase):
    def setUp(self):
        reset_provider_cache()
        self.client = APIClient()

        self.teacher = User.objects.create_user(
            username='teacher', email='teacher@tu.edu.np',
            password='syllabus-pass-123', role=User.Role.TEACHER,
        )
        self.student = User.objects.create_user(
            username='student', email='student@tu.edu.np',
            password='syllabus-pass-123', role=User.Role.STUDENT,
        )
        self.course = Course.objects.create(title='Computer Networks', teacher=self.teacher)
        self.course.students.add(self.student)

        self.document = Document.objects.create(
            course=self.course, title='Unit 2 - OSI Model',
            file='documents/unit2.pdf', uploaded_by=self.teacher,
            status=Document.Status.READY, total_chunks=2,
        )
        for i, text in enumerate([
            'The OSI model divides network communication into seven layers, from '
            'physical up to application.',
            'TCP is connection-oriented and guarantees ordered delivery; UDP is '
            'connectionless and guarantees nothing.',
        ]):
            DocumentChunk.objects.create(
                document=self.document, content=text, embedding=embed_text(text),
                chunk_index=i, page_number=i + 1,
            )

    def auth(self, user):
        self.client.force_authenticate(user=user)

    def ready_quiz(self):
        quiz = Quiz.objects.create(
            document=self.document, title='Unit 2 quiz', created_by=self.teacher
        )
        generate_quiz(quiz)
        quiz.refresh_from_db()
        return quiz


class GenerationTests(QuizTestCase):
    def test_questions_are_generated_from_the_document(self):
        quiz = self.ready_quiz()

        self.assertEqual(quiz.status, Quiz.Status.READY)
        self.assertGreater(quiz.questions.count(), 0)

    def test_every_question_traces_back_to_a_passage(self):
        """
        A question that cannot be traced to the syllabus is the same failure as
        an invented answer, just harder to spot.
        """
        quiz = self.ready_quiz()

        for question in quiz.questions.all():
            self.assertIsNotNone(
                question.source_chunk,
                f'question has no source passage: {question.text}',
            )
            self.assertEqual(question.source_chunk.document_id, self.document.id)

    def test_multiple_choice_questions_are_well_formed(self):
        quiz = self.ready_quiz()

        for question in quiz.questions.filter(kind=Question.Kind.MCQ):
            self.assertEqual(len(question.options), 4)
            self.assertIsNotNone(question.correct_index)
            self.assertTrue(0 <= question.correct_index < 4)

    def test_a_document_with_no_passages_fails_with_a_clear_message(self):
        empty = Document.objects.create(
            course=self.course, title='Empty', file='documents/empty.pdf',
            uploaded_by=self.teacher, status=Document.Status.READY,
        )
        quiz = Quiz.objects.create(document=empty, title='Nothing', created_by=self.teacher)

        with self.assertRaises(Exception):
            generate_quiz(quiz)

        quiz.refresh_from_db()
        self.assertEqual(quiz.status, Quiz.Status.ERROR)
        self.assertIn('no indexed passages', quiz.error_message)


class QuizAccessTests(QuizTestCase):
    def test_teacher_can_create_a_quiz(self):
        self.auth(self.teacher)
        response = self.client.post(
            '/api/quizzes/',
            {'document': self.document.id, 'title': 'Unit 2 quiz'},
            format='json',
        )
        self.assertEqual(response.status_code, 201)

    def test_student_cannot_create_a_quiz(self):
        """Generation costs an API call, so it is not a button every student has."""
        self.auth(self.student)
        response = self.client.post(
            '/api/quizzes/',
            {'document': self.document.id, 'title': 'Sneaky'},
            format='json',
        )
        self.assertEqual(response.status_code, 403)

    def test_an_unenrolled_student_cannot_see_the_quiz(self):
        quiz = self.ready_quiz()
        outsider = User.objects.create_user(
            username='outsider', email='outsider@tu.edu.np', password='x-y-z-123456'
        )
        self.auth(outsider)
        self.assertEqual(self.client.get(f'/api/quizzes/{quiz.id}/').status_code, 404)

    def test_a_quiz_cannot_be_made_from_a_document_still_processing(self):
        self.document.status = Document.Status.PROCESSING
        self.document.save()

        self.auth(self.teacher)
        response = self.client.post(
            '/api/quizzes/',
            {'document': self.document.id, 'title': 'Too early'},
            format='json',
        )
        self.assertEqual(response.status_code, 400)


class AnswerKeyLeakTests(QuizTestCase):
    def test_taking_a_quiz_does_not_reveal_the_answers(self):
        """
        The taking payload reaches the browser, so anything in it is one
        devtools panel away from the student being tested.
        """
        quiz = self.ready_quiz()
        self.auth(self.student)
        response = self.client.get(f'/api/quizzes/{quiz.id}/')

        self.assertEqual(response.status_code, 200)
        body = response.content.decode()
        for leaked in ('correct_index', 'expected_answer', 'explanation'):
            self.assertNotIn(leaked, body, f'{leaked} was sent to the student')

    def test_answers_are_revealed_after_submitting(self):
        quiz = self.ready_quiz()
        self.auth(self.student)
        response = self.client.post(
            f'/api/quizzes/{quiz.id}/submit/', {'answers': []}, format='json'
        )

        self.assertEqual(response.status_code, 201)
        first = response.data['answers'][0]['question']
        self.assertIn('explanation', first)


class MarkingTests(QuizTestCase):
    def test_correct_choices_score_and_wrong_ones_do_not(self):
        quiz = self.ready_quiz()
        mcqs = list(quiz.questions.filter(kind=Question.Kind.MCQ))

        answers = [
            {'question_id': q.id, 'selected_index': q.correct_index}
            for q in mcqs
        ]
        self.auth(self.student)
        response = self.client.post(
            f'/api/quizzes/{quiz.id}/submit/', {'answers': answers}, format='json'
        )

        self.assertEqual(response.status_code, 201)
        marked = {
            a['question']['id']: a['is_correct'] for a in response.data['answers']
        }
        for q in mcqs:
            self.assertTrue(marked[q.id], f'correct choice marked wrong: {q.text}')

    def test_a_wrong_choice_is_marked_wrong(self):
        quiz = self.ready_quiz()
        question = quiz.questions.filter(kind=Question.Kind.MCQ).first()
        wrong = (question.correct_index + 1) % 4

        self.auth(self.student)
        response = self.client.post(
            f'/api/quizzes/{quiz.id}/submit/',
            {'answers': [{'question_id': question.id, 'selected_index': wrong}]},
            format='json',
        )

        marked = next(
            a for a in response.data['answers'] if a['question']['id'] == question.id
        )
        self.assertFalse(marked['is_correct'])

    def test_unanswered_questions_count_against_the_score(self):
        quiz = self.ready_quiz()
        self.auth(self.student)
        response = self.client.post(
            f'/api/quizzes/{quiz.id}/submit/', {'answers': []}, format='json'
        )

        self.assertEqual(response.data['score'], 0)
        self.assertEqual(response.data['total'], quiz.questions.count())
        self.assertEqual(response.data['percentage'], 0)

    def test_short_answers_are_marked_by_the_model(self):
        quiz = self.ready_quiz()
        short = quiz.questions.filter(kind=Question.Kind.SHORT).first()
        self.assertIsNotNone(short, 'expected at least one short-answer question')

        self.auth(self.student)
        response = self.client.post(
            f'/api/quizzes/{quiz.id}/submit/',
            {'answers': [{
                'question_id': short.id,
                'text_answer': 'The passage explains the central point.',
            }]},
            format='json',
        )

        marked = next(
            a for a in response.data['answers'] if a['question']['id'] == short.id
        )
        self.assertTrue(marked['is_correct'])
        self.assertTrue(marked['feedback'])

    def test_attempts_are_recorded_for_the_student(self):
        quiz = self.ready_quiz()
        self.auth(self.student)
        self.client.post(f'/api/quizzes/{quiz.id}/submit/', {'answers': []}, format='json')

        response = self.client.get(f'/api/quizzes/{quiz.id}/attempts/')
        self.assertEqual(len(response.data), 1)
        self.assertIsNotNone(response.data[0]['completed_at'])
