"""
Anthropic provider — available if a key is ever added.

Not the default: the project is a student demo and Gemini's free tier covers
it without the spend.
"""

from django.conf import settings

from .base import GenerationError, Provider


class AnthropicProvider(Provider):
    name = 'anthropic'

    def __init__(self, api_key=None, model=None):
        self.api_key = api_key or settings.ANTHROPIC_API_KEY
        self.model = model or settings.ANTHROPIC_MODEL
        if not self.api_key:
            raise GenerationError(
                'ANTHROPIC_API_KEY is not set. Add it to backend/.env, or set '
                'LLM_PROVIDER=gemini to use the free tier instead.'
            )

    def generate(self, system_prompt, user_message, history=()):
        import anthropic

        client = anthropic.Anthropic(api_key=self.api_key)

        messages = [{'role': turn.role, 'content': turn.content} for turn in history]
        messages.append({'role': 'user', 'content': user_message})

        try:
            # No temperature/top_p: current models reject sampling parameters.
            response = client.messages.create(
                model=self.model,
                max_tokens=2048,
                system=system_prompt,
                messages=messages,
            )
        except Exception as exc:
            raise GenerationError(f'Anthropic request failed: {exc}') from exc

        # Refusals return HTTP 200 with an empty content list, so check the
        # stop reason before indexing into content.
        if response.stop_reason == 'refusal':
            raise GenerationError('The model declined to answer this question.')

        text = ''.join(
            block.text for block in response.content if block.type == 'text'
        ).strip()
        if not text:
            raise GenerationError('Anthropic returned an empty response.')
        return text
