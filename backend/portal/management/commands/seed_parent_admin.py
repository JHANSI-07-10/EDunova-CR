import os

from django.contrib.auth import get_user_model
from django.contrib.auth.models import Group
from django.core.management.base import BaseCommand
from django.db import connection

from .seed_utils import resolve_seed_password


class Command(BaseCommand):
    help = "Seed demo Parent and Admin portal users. Set SEED_PARENT_PASSWORD / SEED_ADMIN_PASSWORD to pin their passwords."

    def handle(self, *args, **options):
        User = get_user_model()

        parent_group, _ = Group.objects.get_or_create(name="Parent")
        admin_group, _ = Group.objects.get_or_create(name="Admin")

        parent_password = resolve_seed_password("SEED_PARENT_PASSWORD", "Parent demo account")
        admin_password = resolve_seed_password("SEED_ADMIN_PASSWORD", "Admin account")

        # -------------------------
        # Parent User
        # -------------------------
        parent, _ = User.objects.get_or_create(
            username="parent.demo",
            defaults={
                "email": "veereshgollapu@gmail.com",
                "first_name": "Veeresh",
                "last_name": "Gollapu",
                "is_active": True,
            },
        )

        parent.email = "veereshgollapu@gmail.com"
        parent.first_name = "Veeresh"
        parent.last_name = "Gollapu"
        parent.set_password(parent_password)
        parent.save()
        parent.groups.add(parent_group)

        # -------------------------
        # Admin User
        # -------------------------
        admin, _ = User.objects.get_or_create(
            username="jhansi.admin",
            defaults={
                "email": "jhansilakshmi1004@gmail.com",
                "first_name": "Jhansi",
                "last_name": "Lakshmi",
                "is_active": True,
                "is_staff": True,
                "is_superuser": True,
            },
        )

        admin.email = "jhansilakshmi1004@gmail.com"
        admin.first_name = "Jhansi"
        admin.last_name = "Lakshmi"
        admin.is_staff = True
        admin.is_superuser = True
        admin.set_password(admin_password)
        admin.save()
        admin.groups.add(admin_group)

        with connection.cursor() as c:

            # -------------------------
            # User Profiles
            # -------------------------
            c.execute("""
                INSERT INTO portal_user_profile (user_id, user_type, phone_number)
                VALUES
                    (%s,'Parent','9000000003'),
                    (%s,'Admin','9000000004')
                ON CONFLICT (user_id)
                DO UPDATE
                SET
                    user_type = EXCLUDED.user_type,
                    phone_number = EXCLUDED.phone_number
            """, [parent.id, admin.id])

            # -------------------------
            # Parent Profile
            # -------------------------
            c.execute("""
                INSERT INTO portal_parent_profile
                    (user_id, father_name, emergency_contact, is_verified)
                VALUES
                    (%s,'Ravi Khan','9000000003',true)
                ON CONFLICT (user_id)
                DO UPDATE
                SET
                    father_name = EXCLUDED.father_name,
                    emergency_contact = EXCLUDED.emergency_contact,
                    is_verified = EXCLUDED.is_verified
            """, [parent.id])

            # -------------------------
            # Link Parent to Demo Student
            # -------------------------
            c.execute("""
                UPDATE portal_student_profile
                SET parent_id = %s
                WHERE admission_number = 'EDN-STU-001'
            """, [parent.id])

            # -------------------------
            # Admin Employee Record
            # -------------------------
            c.execute("""
                INSERT INTO portal_employee
                    (user_id, employee_code, department, designation, is_active)
                VALUES
                    (%s,'EMP-ADMIN-002','Administration','School Administrator',true)
                ON CONFLICT (user_id)
                DO UPDATE
                SET
                    department = EXCLUDED.department,
                    designation = EXCLUDED.designation,
                    is_active = EXCLUDED.is_active
            """, [admin.id])

        self.stdout.write(
            self.style.SUCCESS("Parent demo + real Admin seeded successfully.")
        )

        self.stdout.write("")
        self.stdout.write("======================================")
        self.stdout.write("Login users")
        self.stdout.write("Parent login email : veereshgollapu@gmail.com")
        self.stdout.write("Admin  login email : jhansilakshmi1004@gmail.com")
        self.stdout.write("")
        if os.environ.get("SEED_PARENT_PASSWORD"):
            self.stdout.write("Parent password set from SEED_PARENT_PASSWORD.")
        else:
            self.stdout.write(f"Parent password (generated) : {parent_password}")
        if os.environ.get("SEED_ADMIN_PASSWORD"):
            self.stdout.write("Admin password set from SEED_ADMIN_PASSWORD.")
        else:
            self.stdout.write(f"Admin password (generated) : {admin_password}")
        self.stdout.write("======================================")