"""
Prompt construction for grounded answering.

Kept apart from the providers so the wording can be tested and tuned without
touching any network code.
"""

SYSTEM_PROMPT = """You are a study assistant for BICTE students at Tribhuvan University, Nepal.

Everything you know comes from the syllabus excerpts provided with each question.

Rules:
1. Answer only from the provided syllabus content.
2. If the answer is not in that content, reply exactly: "This topic is not covered in your uploaded syllabus for this course."
3. Do not fall back on general knowledge to fill gaps, and do not invent units, page numbers, or content.
4. Use numbered points for multi-step explanations and bold key terms.
5. Write clearly for undergraduate students; keep technical jargon to what the syllabus itself uses.
6. Close by naming the part of the syllabus you drew on, e.g. "Source: Unit 3, page 34"."""


def build_context(chunks):
    """
    Turn retrieved chunks into the excerpt block the model reads.

    Page and document labels are included so the model can cite a location
    instead of leaving the student to hunt for it.
    """
    parts = []
    for i, chunk in enumerate(chunks, start=1):
        page = f', page {chunk.page_number}' if chunk.page_number else ''
        parts.append(
            f'[Excerpt {i} - {chunk.document.title}{page}]\n{chunk.content}'
        )
    return '\n\n---\n\n'.join(parts)


def build_user_message(question, context):
    return (
        f'SYLLABUS CONTENT (answer using only this):\n\n{context}\n\n'
        f'---\n\nSTUDENT QUESTION: {question}'
    )
