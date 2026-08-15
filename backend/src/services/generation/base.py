"""Provider-neutral contract for the answer-generation step."""

from dataclasses import dataclass


class GenerationError(Exception):
    """Raised when a provider cannot produce an answer."""


@dataclass
class Turn:
    """One prior message, used to give the model conversational context."""

    role: str  # 'user' or 'assistant'
    content: str


class Provider:
    """
    Interface every generation backend implements.

    Keeping this one method wide means swapping Gemini for Anthropic (or the
    mock used by the tests) touches nothing outside this package.
    """

    name = 'base'

    def generate(self, system_prompt, user_message, history=()):
        raise NotImplementedError
