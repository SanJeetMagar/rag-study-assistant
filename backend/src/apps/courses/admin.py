from django.contrib import admin

from .models import Course


@admin.register(Course)
class CourseAdmin(admin.ModelAdmin):
    list_display = ['title', 'course_code', 'teacher', 'is_active', 'created_at']
    search_fields = ['title', 'course_code']
    filter_horizontal = ['students']
