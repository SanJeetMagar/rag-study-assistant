from rest_framework import permissions

from .models import Course


class IsCourseTeacher(permissions.BasePermission):
    """Only the teacher who owns a course may modify it."""

    message = 'Only the teacher who created this course can change it.'

    def has_object_permission(self, request, view, obj):
        if request.method in permissions.SAFE_METHODS:
            return obj.is_accessible_by(request.user)
        return obj.teacher_id == request.user.id


def get_accessible_course(user, course_id):
    """
    Fetch a course the user is actually entitled to see.

    Every course-scoped endpoint goes through here. Without it a student could
    pass any course_id and read syllabi they never enrolled in — the source
    spec's retriever trusted the client-supplied id outright.
    """
    from rest_framework.exceptions import NotFound, PermissionDenied

    try:
        course = Course.objects.get(pk=course_id)
    except (Course.DoesNotExist, ValueError, TypeError):
        raise NotFound('Course not found.')

    if not course.is_accessible_by(user):
        raise PermissionDenied('You are not enrolled in this course.')
    return course
