from django.conf import settings
from django.db import models

from apps.documents.models import Document, DocumentChunk


class Quiz(models.Model):
    """
    A set of questions generated from one document.

    Generation calls the language model and takes several seconds, so it runs
    in a background thread with a status the frontend polls -- the same shape
    as document ingestion, for the same reason.
    """

    class Status(models.TextChoices):
        PENDING = 'pending', 'Pending'
        GENERATING = 'generating', 'Generating'
        READY = 'ready', 'Ready'
        ERROR = 'error', 'Error'

    document = models.ForeignKey(Document, on_delete=models.CASCADE, related_name='quizzes')
    title = models.CharField(max_length=200)
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True
    )
    created_at = models.DateTimeField(auto_now_add=True)
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.PENDING)
    error_message = models.TextField(blank=True)

    class Meta:
        ordering = ['-created_at']
        verbose_name_plural = 'quizzes'

    def __str__(self):
        return f'{self.title} ({self.document.title})'


class Question(models.Model):
    """
    One question, tied to the passage it came from.

    `source_chunk` is the point: a question that cannot be traced back to the
    syllabus is exactly the invented content this project exists to avoid, and
    the link is what lets a student read the passage after getting it wrong.
    """

    class Kind(models.TextChoices):
        MCQ = 'mcq', 'Multiple choice'
        SHORT = 'short', 'Short answer'

    quiz = models.ForeignKey(Quiz, on_delete=models.CASCADE, related_name='questions')
    order = models.IntegerField()
    kind = models.CharField(max_length=10, choices=Kind.choices, default=Kind.MCQ)
    text = models.TextField()

    # MCQ only: the choices, and which one is right.
    options = models.JSONField(default=list, blank=True)
    correct_index = models.IntegerField(null=True, blank=True)

    # Short answer only: what a correct response needs to contain. Used to
    # ground the grader rather than shown to the student.
    expected_answer = models.TextField(blank=True)

    explanation = models.TextField(blank=True)
    source_chunk = models.ForeignKey(
        DocumentChunk, on_delete=models.SET_NULL, null=True, blank=True
    )

    class Meta:
        ordering = ['order']

    def __str__(self):
        return self.text[:60]


class QuizAttempt(models.Model):
    """One student's run at a quiz. Re-attempts create new rows."""

    quiz = models.ForeignKey(Quiz, on_delete=models.CASCADE, related_name='attempts')
    student = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='quiz_attempts'
    )
    started_at = models.DateTimeField(auto_now_add=True)
    completed_at = models.DateTimeField(null=True, blank=True)
    score = models.IntegerField(default=0)
    total = models.IntegerField(default=0)

    class Meta:
        ordering = ['-started_at']

    @property
    def percentage(self):
        return round(100 * self.score / self.total) if self.total else 0

    def __str__(self):
        return f'{self.student.email} — {self.quiz.title} ({self.score}/{self.total})'


class AttemptAnswer(models.Model):
    """
    What the student answered, and how it was judged.

    Multiple choice is marked by comparing indexes -- deterministic, instant
    and exact. Asking a language model to do that would be slower, cost money
    and be less reliable. The model is used only where there is no key to
    compare against: short answers, and the feedback attached to them.
    """

    attempt = models.ForeignKey(QuizAttempt, on_delete=models.CASCADE, related_name='answers')
    question = models.ForeignKey(Question, on_delete=models.CASCADE)
    selected_index = models.IntegerField(null=True, blank=True)
    text_answer = models.TextField(blank=True)
    is_correct = models.BooleanField(default=False)
    feedback = models.TextField(blank=True)

    class Meta:
        unique_together = [('attempt', 'question')]
