from django.conf import settings
from django.db import models

from apps.courses.models import Course


class ChatSession(models.Model):
    """One conversation between a student and the assistant about one course."""

    student = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='sessions'
    )
    course = models.ForeignKey(Course, on_delete=models.CASCADE, related_name='sessions')
    title = models.CharField(max_length=100, default='New Chat')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-updated_at']

    def __str__(self):
        return f'{self.title} - {self.student.email}'


class Message(models.Model):
    """
    One turn in a session.

    Assistant messages keep their retrieval provenance: which chunks were
    used and how close each was. Without this the evidence behind an answer
    is thrown away as soon as the response is returned, and the chat UI
    cannot show citations or similarity scores.
    """

    class Role(models.TextChoices):
        USER = 'user', 'User'
        ASSISTANT = 'assistant', 'Assistant'

    session = models.ForeignKey(ChatSession, on_delete=models.CASCADE, related_name='messages')
    role = models.CharField(max_length=20, choices=Role.choices)
    content = models.TextField()
    created_at = models.DateTimeField(auto_now_add=True)

    chunks_used = models.IntegerField(default=0)
    # [{"chunk_id": 12, "distance": 0.21, "page_number": 34,
    #   "document_title": "Unit 3"}, ...]
    citations = models.JSONField(default=list, blank=True)

    class Meta:
        ordering = ['created_at']

    def __str__(self):
        return f'{self.role}: {self.content[:50]}'
