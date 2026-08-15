"""
Deterministic provider used by the test suite.

Echoes back enough of the prompt to prove the pipeline wired the right chunks
in, without a network call or a cent of API spend.
"""

from .base import Provider


class MockProvider(Provider):
    name = 'mock'

    NOT_COVERED = 'This topic is not covered in your uploaded syllabus for this course.'

    def generate(self, system_prompt, user_message, history=()):
        question = user_message.split('STUDENT QUESTION:')[-1].strip()
        excerpt_count = user_message.count('[Excerpt ')
        return (
            f'[mock answer] Question: {question}\n'
            f'Answered from {excerpt_count} syllabus excerpt(s).'
        )
