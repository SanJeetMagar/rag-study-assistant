from django.contrib import admin

from .models import AttemptAnswer, Question, Quiz, QuizAttempt


class QuestionInline(admin.TabularInline):
    model = Question
    extra = 0


@admin.register(Quiz)
class QuizAdmin(admin.ModelAdmin):
    list_display = ['title', 'document', 'status', 'created_at']
    list_filter = ['status']
    inlines = [QuestionInline]


@admin.register(QuizAttempt)
class QuizAttemptAdmin(admin.ModelAdmin):
    list_display = ['quiz', 'student', 'score', 'total', 'completed_at']


admin.site.register(AttemptAnswer)
