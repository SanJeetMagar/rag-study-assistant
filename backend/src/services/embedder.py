"""
Text -> 384-dimension vector.

The model is loaded once, lazily, and cached for the life of the process.
Loading it per call is the single biggest performance trap in this system:
`SentenceTransformer(...)` takes seconds, and a 130-chunk document would pay
that cost 130 times over.
"""

import threading

from django.conf import settings

_model = None
_model_lock = threading.Lock()


def get_model():
    """Load the sentence-transformer once, thread-safely."""
    global _model
    if _model is None:
        with _model_lock:
            # Re-check: another thread may have loaded it while we waited.
            if _model is None:
                from sentence_transformers import SentenceTransformer

                _model = SentenceTransformer(settings.EMBEDDING_MODEL_NAME)
    return _model


def embed_text(text):
    """Embed one string. Returns a list of floats, length EMBEDDING_DIMENSIONS."""
    return embed_batch([text])[0]


def embed_batch(texts):
    """
    Embed many strings at once.

    Batching matters: the model vectorises a batch far faster than the same
    strings one at a time, and ingestion always has a whole document to do.
    """
    if not texts:
        return []
    vectors = get_model().encode(
        list(texts),
        batch_size=32,
        show_progress_bar=False,
        convert_to_numpy=True,
        normalize_embeddings=True,
    )
    return [vector.tolist() for vector in vectors]


def warm_up():
    """
    Force the model into memory ahead of the first real request.

    Without this the first upload or question of each server run pays the
    load cost and looks broken to the user.
    """
    embed_text('warm up')
