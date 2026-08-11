# Generated manually — data migration.
#
# Ensures the four portal demo accounts exist in every environment with the
# documented credentials (password: Edunova@123):
#   Admin   jhansilakshmi1004@gmail.com
#   Student tarannumarshiya489@gmail.com
#   Teacher sameerbasha.0809@gmail.com
#   Parent  veereshgollapu@gmail.com
#
# The parent account was verified live in production; admin/student/teacher
# returned "Invalid email/username or password." because the auth_user rows
# (or their passwords) are absent there. Runs automatically on deploy because
# entrypoint.sh executes `python manage.py migrate --noinput` first.
#
# User rows go through the ORM (auth_user is Django-managed); the portal_*
# profile tables are raw SQL in Supabase (see portal/models.py), so those are
# upserted with connection.cursor(), mirroring seed_parent_admin.py and
# seed_portal_demo.py.
from django.contrib.auth.hashers import make_password
from django.db import connection, migrations

DEMO_PASSWORD = "Edunova@123"

ACCOUNTS = [
    {
        "username": "jhansi.admin",
        "email": "jhansilakshmi1004@gmail.com",
        "first_name": "Jhansi",
        "last_name": "Lakshmi",
        "group": "Admin",
        "user_type": "Admin",
        "phone": "9000000004",
    },
    {
        "username": "student.demo",
        "email": "tarannumarshiya489@gmail.com",
        "first_name": "Tarannum",
        "last_name": "Arshiya",
        "group": "Student",
        "user_type": "Student",
        "phone": "9000000002",
    },
    {
        "username": "teacher.demo",
        "email": "sameerbasha.0809@gmail.com",
        "first_name": "Sameer",
        "last_name": "Basha",
        "group": "Teacher",
        "user_type": "Teacher",
        "phone": "9000000001",
    },
    {
        "username": "parent.demo",
        "email": "veereshgollapu@gmail.com",
        "first_name": "Veeresh",
        "last_name": "Gollapu",
        "group": "Parent",
        "user_type": "Parent",
        "phone": "9000000003",
    },
]


def ensure_demo_accounts(apps, schema_editor):
    User = apps.get_model("auth", "User")
    Group = apps.get_model("auth", "Group")
    hashed = make_password(DEMO_PASSWORD)

    rows = []
    for acc in ACCOUNTS:
        group, _ = Group.objects.get_or_create(name=acc["group"])
        user, _ = User.objects.get_or_create(
            username=acc["username"],
            defaults={
                "email": acc["email"],
                "first_name": acc["first_name"],
                "last_name": acc["last_name"],
                "is_active": True,
                "is_staff": acc["user_type"] == "Admin",
                "is_superuser": acc["user_type"] == "Admin",
                "password": hashed,
            },
        )
        user.email = acc["email"]
        user.first_name = acc["first_name"]
        user.last_name = acc["last_name"]
        user.is_active = True
        if acc["user_type"] == "Admin":
            user.is_staff = True
            user.is_superuser = True
        user.password = hashed
        user.save()
        user.groups.add(group)
        rows.append((acc, user.id))

    with connection.cursor() as c:
        c.executemany(
            """
            INSERT INTO portal_user_profile (user_id, user_type, phone_number)
            VALUES (%s,%s,%s)
            ON CONFLICT (user_id) DO UPDATE
            SET user_type = EXCLUDED.user_type, phone_number = EXCLUDED.phone_number
            """,
            [(user_id, acc["user_type"], acc["phone"]) for acc, user_id in rows],
        )

        admin_id = next(uid for acc, uid in rows if acc["user_type"] == "Admin")
        parent_id = next(uid for acc, uid in rows if acc["user_type"] == "Parent")
        student_id = next(uid for acc, uid in rows if acc["user_type"] == "Student")
        teacher_id = next(uid for acc, uid in rows if acc["user_type"] == "Teacher")

        c.execute(
            """
            INSERT INTO portal_parent_profile
                (user_id, father_name, emergency_contact, is_verified)
            VALUES (%s,'Ravi Khan','9000000003',true)
            ON CONFLICT (user_id) DO UPDATE
            SET father_name = EXCLUDED.father_name,
                emergency_contact = EXCLUDED.emergency_contact,
                is_verified = EXCLUDED.is_verified
            """,
            [parent_id],
        )

        c.execute(
            """
            UPDATE portal_student_profile
            SET parent_id = %s
            WHERE admission_number = 'EDN-STU-001'
            """,
            [parent_id],
        )

        c.execute(
            """
            INSERT INTO portal_teacher_profile
                (user_id, employee_code, qualification, specialization, date_of_joining)
            VALUES (%s,'TCH-DEMO-001','M.Sc., B.Ed.','Mathematics', current_date - interval '3 years')
            ON CONFLICT (user_id) DO UPDATE
            SET qualification = EXCLUDED.qualification, specialization = EXCLUDED.specialization
            """,
            [teacher_id],
        )

        c.execute(
            """
            INSERT INTO portal_employee
                (user_id, employee_code, department, designation, is_active)
            VALUES (%s,'EMP-ADMIN-002','Administration','School Administrator',true)
            ON CONFLICT (user_id) DO UPDATE
            SET department = EXCLUDED.department,
                designation = EXCLUDED.designation,
                is_active = EXCLUDED.is_active
            """,
            [admin_id],
        )

        c.execute(
            """
            INSERT INTO portal_student_profile
                (user_id, admission_number, qr_id_code, date_of_birth, gender, blood_group, status)
            VALUES (%s,'EDN-STU-001','QR-EDN-STU-001','2012-06-12','Female','O+','Active')
            ON CONFLICT (user_id) DO UPDATE
            SET admission_number = EXCLUDED.admission_number, status = EXCLUDED.status
            """,
            [student_id],
        )

        c.execute(
            """
            INSERT INTO portal_class (name, section, curriculum, room_number)
            VALUES ('Grade 8','A','CBSE','B-204')
            ON CONFLICT (name, section) DO UPDATE SET curriculum = EXCLUDED.curriculum
            RETURNING id
            """
        )
        class_id = c.fetchone()[0]
        c.execute(
            """
            INSERT INTO portal_student_enrollment (student_id, class_id, academic_year, roll_number)
            VALUES (%s,%s,'2026-27',12)
            ON CONFLICT (student_id, class_id, academic_year)
            DO UPDATE SET roll_number = EXCLUDED.roll_number
            """,
            [student_id, class_id],
        )


class Migration(migrations.Migration):

    dependencies = []

    operations = [
        migrations.RunPython(ensure_demo_accounts),
    ]
