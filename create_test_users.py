import os
import django

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings")
django.setup()

from django.contrib.auth import get_user_model
from django.contrib.auth.models import Group

User = get_user_model()

def create_users():
    # 1. Admin
    admin_email = "admin@edunovaacademy.edu.in"
    admin_user, created = User.objects.get_or_create(
        email=admin_email,
        defaults={
            "first_name": "System",
            "last_name": "Admin",
            "is_staff": True,
            "is_superuser": True,
            "is_active": True,
            "username": "admin"
        }
    )
    admin_user.set_password("admin123")
    admin_user.save()
    print(f"Admin created/updated: {admin_email} / admin123")

    # 2. Student
    student_email = "student@edunovaacademy.edu.in"
    student_user, created = User.objects.get_or_create(
        email=student_email,
        defaults={
            "first_name": "Test",
            "last_name": "Student",
            "is_active": True,
            "username": "student"
        }
    )
    student_user.set_password("student123")
    student_user.save()
    
    student_group, _ = Group.objects.get_or_create(name="Student")
    student_user.groups.add(student_group)
    print(f"Student created/updated: {student_email} / student123")

if __name__ == "__main__":
    create_users()
