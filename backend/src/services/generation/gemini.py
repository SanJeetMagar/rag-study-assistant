"""Gemini provider — the default, chosen for its free tier."""

import logging
import time

from django.conf import settings

from .base import GenerationError, Provider

logger = logging.getLogger(__name__)

# The free tier limits requests per minute. Asking several questions quickly --
# exactly what happens during a live demo -- trips it, and the raw failure is an
# opaque 429. One short backoff turns most of those into a normal answer.
RATE_LIMIT_RETRIES = 2
RATE_LIMIT_BACKOFF_SECONDS = 3


class GeminiProvider(Provider):
    name = 'gemini'

    def __init__(self, api_key=None, model=None):
        self.api_key = api_key or settings.GEMINI_API_KEY
        self.model = model or settings.GEMINI_MODEL
        if not self.api_key:
            raise GenerationError(
                'GEMINI_API_KEY is not set. Add it to backend/.env — get a free '
                'key from https://aistudio.google.com/apikey'
            )

    def generate(self, system_prompt, user_message, history=()):
        from google import genai
        from google.genai import types

        client = genai.Client(api_key=self.api_key)

        # Gemini names the assistant role 'model'.
        contents = [
            types.Content(
                role='model' if turn.role == 'assistant' else 'user',
                parts=[types.Part(text=turn.content)],
            )
            for turn in history
        ]
        contents.append(
            types.Content(role='user', parts=[types.Part(text=user_message)])
        )

        config = types.GenerateContentConfig(system_instruction=system_prompt)

        for attempt in range(RATE_LIMIT_RETRIES + 1):
            try:
                response = client.models.generate_content(
                    model=self.model, contents=contents, config=config
                )
                break
            except Exception as exc:
                message = str(exc)

                if _is_rate_limit(message) and attempt < RATE_LIMIT_RETRIES:
                    wait = RATE_LIMIT_BACKOFF_SECONDS * (attempt + 1)
                    logger.warning('Gemini rate limited; retrying in %ss', wait)
                    time.sleep(wait)
                    continue

                if _is_rate_limit(message):
                    raise GenerationError(
                        'Gemini is rate limiting this key (free tier). Wait about a '
                        'minute and ask again.'
                    ) from exc

                if 'NOT_FOUND' in message and 'model' in message.lower():
                    raise GenerationError(
                        f"The model '{self.model}' is no longer available. Set "
                        f'GEMINI_MODEL in backend/.env to a current one — list them '
                        f'with client.models.list().'
                    ) from exc

                raise GenerationError(f'Gemini request failed: {exc}') from exc

        text = (response.text or '').strip()
        if not text:
            raise GenerationError('Gemini returned an empty response.')
        return text


def _is_rate_limit(message):
    return '429' in message or 'RESOURCE_EXHAUSTED' in message
