from django.contrib import admin
from django.contrib.auth.admin import UserAdmin as BaseUserAdmin

from .models import User


@admin.register(User)
class UserAdmin(BaseUserAdmin):
    list_display = ['email', 'username', 'role', 'is_staff']
    list_filter = ['role', 'is_staff', 'is_superuser']
    ordering = ['email']
    fieldsets = BaseUserAdmin.fieldsets + (('Study assistant', {'fields': ('role',)}),)
    add_fieldsets = BaseUserAdmin.add_fieldsets + (('Study assistant', {'fields': ('email', 'role')}),)
