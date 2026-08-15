"""
Semantic search over stored chunks, and the grounded answer built from them.
"""

from dataclasses import dataclass

from django.conf import settings
from pgvector.django import CosineDistance

from apps.documents.models import Document, DocumentChunk

from . import prompts
from .embedder import embed_text
from .generation import Turn, get_provider


@dataclass
class Answer:
    text: str
    chunks_used: int
    citations: list


def find_relevant_chunks(question, course_id, top_k=None, max_distance=None):
    """
    Find the chunks closest in meaning to the question.

    Cosine distance runs from 0 (identical meaning) to 1 (unrelated), so the
    smallest distances are the best matches. Anything past max_distance is
    dropped rather than fed to the model — answering from loosely related
    text is how a grounded assistant starts hallucinating.

    Only ready documents are searched; a document mid-ingestion has an
    incomplete set of chunks and would give partial answers.
    """
    top_k = top_k or settings.RETRIEVAL_TOP_K
    max_distance = max_distance if max_distance is not None else settings.RETRIEVAL_MAX_DISTANCE

    question_embedding = embed_text(question)

    return list(
        DocumentChunk.objects.filter(
            document__course_id=course_id,
            document__status=Document.Status.READY,
        )
        .select_related('document')
        .annotate(distance=CosineDistance('embedding', question_embedding))
        .filter(distance__lt=max_distance)
        .order_by('distance')[:top_k]
    )


def generate_answer(question, course_id, history=()):
    """
    Full query pipeline: question -> chunks -> grounded answer.

    Returns the answer plus the chunks behind it, so the UI can show which
    part of the syllabus each answer came from and how close the match was.
    """
    chunks = find_relevant_chunks(question, course_id)

    if not chunks:
        return Answer(
            text=(
                'This topic is not covered in your uploaded syllabus for this course.'
            ),
            chunks_used=0,
            citations=[],
        )

    context = prompts.build_context(chunks)
    user_message = prompts.build_user_message(question, context)

    text = get_provider().generate(
        system_prompt=prompts.SYSTEM_PROMPT,
        user_message=user_message,
        history=[Turn(role=t.role, content=t.content) for t in history],
    )

    citations = [
        {
            'chunk_id': chunk.id,
            'document_title': chunk.document.title,
            'page_number': chunk.page_number,
            'distance': round(float(chunk.distance), 4),
        }
        for chunk in chunks
    ]

    return Answer(text=text, chunks_used=len(chunks), citations=citations)
