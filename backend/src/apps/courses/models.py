import secrets
import string

from django.conf import settings
from django.db import models

CODE_ALPHABET = string.ascii_uppercase + string.digits


def generate_course_code():
    """Short, unambiguous code a teacher can read out in class."""
    return ''.join(secrets.choice(CODE_ALPHABET) for _ in range(6))


class Course(models.Model):
    """
    A course such as "Computer Networks - 7th Sem BICTE".

    Documents and chat sessions both hang off a course, and retrieval is
    scoped to one -- a question only ever searches its own course's chunks.
    """

    title = models.CharField(max_length=200)
    description = models.TextField(blank=True)
    teacher = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='taught_courses',
    )
    students = models.ManyToManyField(
        settings.AUTH_USER_MODEL,
        related_name='enrolled_courses',
        blank=True,
    )
    course_code = models.CharField(max_length=20, unique=True, default=generate_course_code)
    created_at = models.DateTimeField(auto_now_add=True)
    is_active = models.BooleanField(default=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return self.title

    def is_accessible_by(self, user):
        """Teacher who owns it, or a student enrolled in it."""
        # Imported here rather than at module level: permissions imports this
        # model, so a top-level import would be circular.
        from .permissions import can_view_course

        return can_view_course(user, self)
