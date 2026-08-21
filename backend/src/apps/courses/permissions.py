"""
Who may do what, in one place.

Before this module the rule `course.teacher_id == user.id` was written out in
eight separate places across six files. Any change to the role model -- adding
a co-teacher, a teaching assistant, a read-only auditor -- would have meant
finding all eight and hoping none were missed. One of those copies protecting
material it should not is exactly how the original client-supplied `course_id`
hole happened.

Everything that needs an authorisation decision now asks here.
"""

from rest_framework import permissions
from rest_framework.exceptions import NotFound, PermissionDenied

from .models import Course


class CourseRole:
    """A user's standing in one specific course."""

    TEACHER = 'teacher'
    STUDENT = 'student'
    NONE = 'none'


# ---------------------------------------------------------------- the rules

def role_in_course(user, course):
    """The single place that decides a user's role in a course."""
    if not user or not user.is_authenticated:
        return CourseRole.NONE
    if course.teacher_id == user.id:
        return CourseRole.TEACHER
    if course.students.filter(pk=user.pk).exists():
        return CourseRole.STUDENT
    return CourseRole.NONE


def can_view_course(user, course):
    """Read the course, its documents and its material."""
    return role_in_course(user, course) != CourseRole.NONE


def can_manage_course(user, course):
    """
    Edit or delete the course, and add, rename or remove its documents.

    Currently teacher-only. A co-teacher or TA role would be added here and
    nowhere else.
    """
    return role_in_course(user, course) == CourseRole.TEACHER


def can_ask_questions(user, course):
    """Use the assistant. Teachers can too -- useful for checking coverage."""
    return can_view_course(user, course)


# ------------------------------------------------------- helpers for views

def viewable_courses(user):
    """
    Every course this user may see, as a queryset.

    The object-level checks above cannot express a filter, so this is the
    query-level twin of `can_view_course`. Anything listing course-scoped rows
    filters through here rather than repeating the join.
    """
    from django.db.models import Q

    if not user or not user.is_authenticated:
        return Course.objects.none()
    return Course.objects.filter(Q(teacher=user) | Q(students=user)).distinct()


def get_accessible_course(user, course_id):
    """
    Fetch a course the user is entitled to see, or raise.

    Every course-scoped endpoint goes through this. Without it a student could
    pass any course_id and read syllabi they never enrolled in -- the defect
    the original design shipped with.
    """
    try:
        course = Course.objects.get(pk=course_id)
    except (Course.DoesNotExist, ValueError, TypeError):
        raise NotFound('Course not found.')

    if not can_view_course(user, course):
        raise PermissionDenied('You are not enrolled in this course.')
    return course


def require_course_manager(user, course, action='change this'):
    """Raise unless the user may manage the course. For use inside a view."""
    if not can_manage_course(user, course):
        raise PermissionDenied(
            f'Only the teacher who owns this course can {action}.'
        )


# ------------------------------------------------------ DRF permission classes

class IsCourseTeacher(permissions.BasePermission):
    """Read for any member; write only for whoever manages the course."""

    message = 'Only the teacher who created this course can change it.'

    def has_object_permission(self, request, view, obj):
        if request.method in permissions.SAFE_METHODS:
            return can_view_course(request.user, obj)
        return can_manage_course(request.user, obj)


class IsTeacher(permissions.BasePermission):
    """Account-level check, independent of any one course."""

    message = 'Only teachers can do this.'

    def has_permission(self, request, view):
        user = request.user
        return bool(user and user.is_authenticated and user.is_teacher)
