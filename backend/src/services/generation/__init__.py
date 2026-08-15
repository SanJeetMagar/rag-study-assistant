"""
Answer generation, one provider at a time.

Selected by the LLM_PROVIDER setting: 'gemini' (default, free tier),
'anthropic', or 'mock' (deterministic, used by the tests).
"""

from django.conf import settings

from .base import GenerationError, Provider, Turn

_PROVIDERS = {}


def get_provider(name=None):
    """Build the configured provider. Instances are cached per name."""
    name = (name or settings.LLM_PROVIDER).lower()

    if name not in _PROVIDERS:
        if name == 'gemini':
            from .gemini import GeminiProvider

            _PROVIDERS[name] = GeminiProvider()
        elif name == 'anthropic':
            from .anthropic_provider import AnthropicProvider

            _PROVIDERS[name] = AnthropicProvider()
        elif name == 'mock':
            from .mock import MockProvider

            _PROVIDERS[name] = MockProvider()
        else:
            raise GenerationError(
                f"Unknown LLM_PROVIDER '{name}'. Use 'gemini', 'anthropic', or 'mock'."
            )

    return _PROVIDERS[name]


def reset_provider_cache():
    """Drop cached instances so a settings override takes effect in tests."""
    _PROVIDERS.clear()


__all__ = ['get_provider', 'reset_provider_cache', 'GenerationError', 'Provider', 'Turn']
