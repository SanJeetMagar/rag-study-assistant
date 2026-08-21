"""
Deterministic provider used by the test suite.

Recognises what it is being asked for and returns a well-formed response of
that shape, so the whole suite -- answering, quiz generation and short-answer
grading -- runs with no network call and no API spend.
"""

import json
import re

from .base import Provider


class MockProvider(Provider):
    name = 'mock'

    NOT_COVERED = 'This topic is not covered in your uploaded syllabus for this course.'

    def generate(self, system_prompt, user_message, history=()):
        if 'exam questions' in system_prompt:
            return self._quiz(user_message)
        if 'mark one short exam answer' in system_prompt:
            return self._grade(user_message)
        return self._answer(user_message)

    # ------------------------------------------------------------- answering

    def _answer(self, user_message):
        question = user_message.split('STUDENT QUESTION:')[-1].strip()
        excerpts = user_message.count('[Excerpt ')
        return (
            f'[mock answer] Question: {question}\n'
            f'Answered from {excerpts} syllabus excerpt(s).'
        )

    # ------------------------------------------------------- quiz generation

    def _quiz(self, user_message):
        """Three MCQs and one short answer, each citing a real passage number."""
        passages = len(re.findall(r'\[Passage \d+', user_message)) or 1
        questions = [
            {
                'kind': 'mcq',
                'passage': (i % passages) + 1,
                'question': f'[mock] Question {i + 1} about the material?',
                'options': ['First option', 'Second option', 'Third option', 'Fourth option'],
                'correct_index': i % 4,
                'explanation': f'[mock] Option {(i % 4) + 1} is what the passage states.',
            }
            for i in range(3)
        ]
        questions.append({
            'kind': 'short',
            'passage': 1,
            'question': '[mock] Explain the main idea of this passage.',
            'expected_answer': 'The central point the passage makes.',
            'explanation': '[mock] The passage states the central point directly.',
        })
        return json.dumps(questions)

    # --------------------------------------------------------------- grading

    def _grade(self, user_message):
        """
        Marks non-empty answers correct.

        Enough for tests to exercise both branches -- an empty answer is
        rejected before it reaches a provider at all.
        """
        answer = user_message.split("STUDENT'S ANSWER:")[-1].strip()
        correct = len(answer) > 3
        return json.dumps({
            'correct': correct,
            'feedback': (
                '[mock] That covers the required point.'
                if correct
                else '[mock] That does not address what the passage says.'
            ),
        })
