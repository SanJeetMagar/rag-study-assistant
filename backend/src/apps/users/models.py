from django.contrib.auth.models import AbstractUser
from django.db import models


class User(AbstractUser):
    """
    Custom user with a role, so the frontend can tell teachers from students.

    Swapping in a custom user model is only cheap before the first migration
    runs, which is why it is done here rather than bolted on as a Profile
    model later.
    """

    class Role(models.TextChoices):
        TEACHER = 'teacher', 'Teacher'
        STUDENT = 'student', 'Student'

    email = models.EmailField(unique=True)
    role = models.CharField(max_length=20, choices=Role.choices, default=Role.STUDENT)

    # Log in with email; username stays because AbstractUser requires it.
    USERNAME_FIELD = 'email'
    REQUIRED_FIELDS = ['username']

    @property
    def is_teacher(self):
        return self.role == self.Role.TEACHER

    def __str__(self):
        return f'{self.email} ({self.role})'
