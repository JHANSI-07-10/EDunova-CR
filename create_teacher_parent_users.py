import os
import django

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings")
django.setup()

from django.contrib.auth import get_user_model
from django.contrib.auth.models import Group

User = get_user_model()

def create_users():
    # 1. Teacher
    teacher_username = "teacher"
    teacher_email = "teacher@edunovaacademy.edu.in"
    teacher_user, created = User.objects.get_or_create(
        username=teacher_username,
        defaults={
            "first_name": "Test",
            "last_name": "Teacher",
            "is_active": True,
            "email": teacher_email
        }
    )
    teacher_user.set_password("teacher123")
    teacher_user.save()
    
    teacher_group, _ = Group.objects.get_or_create(name="Teacher")
    teacher_user.groups.add(teacher_group)
    print(f"Teacher created/updated: {teacher_username} / teacher123")

    # 2. Parent
    parent_username = "parent"
    parent_email = "parent@edunovaacademy.edu.in"
    parent_user, created = User.objects.get_or_create(
        username=parent_username,
        defaults={
            "first_name": "Test",
            "last_name": "Parent",
            "is_active": True,
            "email": parent_email
        }
    )
    parent_user.set_password("parent123")
    parent_user.save()
    
    parent_group, _ = Group.objects.get_or_create(name="Parent")
    parent_user.groups.add(parent_group)
    print(f"Parent created/updated: {parent_username} / parent123")

if __name__ == "__main__":
    create_users()
