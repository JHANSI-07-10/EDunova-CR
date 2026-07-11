from datetime import date, timedelta
from django.contrib.auth import get_user_model
from django.contrib.auth.models import Group
from django.core.management import call_command
from django.core.management.base import BaseCommand
from django.db import connection, transaction


class Command(BaseCommand):
    help = "Clear all database tables and seed production-ready portals with specified credentials."

    def handle(self, *args, **options):
        User = get_user_model()
        self.stdout.write("Truncating database tables...")

        tables_to_truncate = [
            "portal_payment", "portal_fee_structure", "portal_result", "portal_hall_ticket",
            "portal_exam_schedule", "portal_quiz_question", "portal_quiz", "portal_assignment_submission",
            "portal_assignment", "portal_course_content", "portal_lesson", "portal_chapter",
            "portal_course", "portal_homework", "portal_attendance", "portal_timetable",
            "portal_academic_allocation", "portal_student_enrollment", "portal_student_profile",
            "portal_teacher_profile", "portal_parent_profile", "portal_user_profile",
            "portal_book_issue", "portal_book", "portal_transport_allocation", "portal_transport_stop",
            "portal_transport_route", "portal_vehicle", "portal_hostel_allocation", "portal_room",
            "portal_hostel", "portal_inventory", "portal_visitor_log", "portal_alumni",
            "portal_medical_log", "portal_forum_post", "portal_forum_topic", "portal_digital_note",
            "portal_course_progress", "portal_audit_log", "portal_payroll_record", "portal_employee",
            "portal_subject", "portal_class", "portal_notification"
        ]

        with connection.cursor() as cursor:
            # Disable triggers to avoid constraint conflicts during truncate cascade
            cursor.execute("SET CONSTRAINTS ALL DEFERRED;")
            for table in tables_to_truncate:
                try:
                    cursor.execute(f"TRUNCATE TABLE public.{table} CASCADE;")
                    self.stdout.write(f"  Truncated public.{table}")
                except Exception as e:
                    # Table might not exist or be named slightly differently
                    self.stdout.write(f"  Skipped public.{table}: {e}")

        # Clear Django model tables
        self.stdout.write("Clearing Django-managed tables...")
        User.objects.all().delete()
        
        # Trigger the CMS seeding command to rebuild public site CMS pages and stats
        self.stdout.write("Running public CMS seeding...")
        call_command("seed_public_data")

        self.stdout.write("Creating Groups...")
        admin_group, _ = Group.objects.get_or_create(name="Admin")
        teacher_group, _ = Group.objects.get_or_create(name="Teacher")
        parent_group, _ = Group.objects.get_or_create(name="Parent")
        student_group, _ = Group.objects.get_or_create(name="Student")

        self.stdout.write("Seeding users...")
        # 1. ADMIN
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
        admin.set_password("Edunova@123")
        admin.save()
        admin.groups.add(admin_group)

        # 2. PARENT
        parent, _ = User.objects.get_or_create(
            username="parent.demo",
            defaults={
                "email": "ravitejamandugula57@gmail.com",
                "first_name": "Teja",
                "last_name": "Mandugula",
                "is_active": True,
            },
        )
        parent.set_password("Edunova@123")
        parent.save()
        parent.groups.add(parent_group)

        # 3. STUDENT
        student, _ = User.objects.get_or_create(
            username="student.demo",
            defaults={
                "email": "tarannumarshiya489@gmail.com",
                "first_name": "Arshiya",
                "last_name": "Tarannum",
                "is_active": True,
            },
        )
        student.set_password("Edunova@123")
        student.save()
        student.groups.add(student_group)

        # 4. TEACHER
        teacher, _ = User.objects.get_or_create(
            username="teacher.demo",
            defaults={
                "email": "manoharmanuu1027@gmail.com",
                "first_name": "Manohar",
                "last_name": "Manuu",
                "is_active": True,
            },
        )
        teacher.set_password("Edunova@123")
        teacher.save()
        teacher.groups.add(teacher_group)

        # -------------------------
        # Seed Profile Details and Relationships
        # -------------------------
        self.stdout.write("Linking custom profiles...")
        with connection.cursor() as c:
            # User Profiles
            c.execute("""
                INSERT INTO portal_user_profile (user_id, user_type, phone_number)
                VALUES 
                    (%s,'Admin','9000000004'),
                    (%s,'Parent','9000000003'),
                    (%s,'Student','9000000002'),
                    (%s,'Teacher','9000000001')
                ON CONFLICT (user_id) DO UPDATE SET user_type=EXCLUDED.user_type, phone_number=EXCLUDED.phone_number
            """, [admin.id, parent.id, student.id, teacher.id])

            # Employee/Admin record
            c.execute("""
                INSERT INTO portal_employee (user_id, employee_code, department, designation, is_active)
                VALUES (%s,'EMP-ADMIN-001','Administration','School Administrator',true)
                ON CONFLICT (user_id) DO NOTHING
            """, [admin.id])

            # Parent Profile details
            c.execute("""
                INSERT INTO portal_parent_profile (user_id, parent_code, father_name, emergency_contact, is_verified)
                VALUES (%s,'PAR-DEMO-001','Teja Mandugula','9000000003',true)
                ON CONFLICT (user_id) DO NOTHING
            """, [parent.id])

            # Student Profile linked to Parent
            c.execute("""
                INSERT INTO portal_student_profile (user_id, parent_id, admission_number, qr_id_code, date_of_birth, gender, blood_group, status)
                VALUES (%s,%s,'EDN-STU-001','QR-EDN-STU-001','2012-06-12','Female','O+','Active')
                ON CONFLICT (user_id) DO NOTHING
            """, [student.id, parent.id])

            # Teacher Profile
            c.execute("""
                INSERT INTO portal_teacher_profile (user_id, employee_code, qualification, specialization, date_of_joining)
                VALUES (%s,'TCH-DEMO-001','M.Sc., B.Ed.','Mathematics', current_date - interval '3 years')
                ON CONFLICT (user_id) DO NOTHING
            """, [teacher.id])

            # Class, Subject, and Teacher Allocations
            c.execute("""
                INSERT INTO portal_class (name, section, curriculum, room_number)
                VALUES ('Grade 8','A','CBSE','B-204')
                ON CONFLICT (name, section) DO NOTHING
                RETURNING id
            """)
            class_id = c.fetchone()[0]

            c.execute("""
                INSERT INTO portal_subject (name, subject_code, type)
                VALUES ('Mathematics','MATH-8','Theory')
                ON CONFLICT (subject_code) DO NOTHING
                RETURNING id
            """)
            subject_id = c.fetchone()[0]

            c.execute("""
                INSERT INTO portal_student_enrollment (student_id, class_id, academic_year, roll_number)
                VALUES (%s,%s,'2026-27',12)
                ON CONFLICT (student_id, class_id, academic_year) DO NOTHING
            """, [student.id, class_id])

            c.execute("""
                INSERT INTO portal_academic_allocation (class_id, subject_id, teacher_id)
                VALUES (%s,%s,%s)
                ON CONFLICT (class_id, subject_id, teacher_id) DO NOTHING
            """, [class_id, subject_id, teacher.id])

            # LMS Courses & Contents
            c.execute("""
                INSERT INTO portal_course (subject_id, class_id, title, description)
                VALUES (%s,%s,'Mathematics Grade 8','Demo course for Grade 8 Mathematics')
                RETURNING id
            """)
            course_id = c.fetchone()[0]

            c.execute("""
                INSERT INTO portal_course_content (course_id, content_type, title, resource_url, sort_order)
                VALUES (%s,'PDF_Notes','Chapter 1 — Linear Equations','https://example.com/demo-notes.pdf',1)
            """, [course_id])

            # Classroom Timetable
            for i, day in enumerate(["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"]):
                c.execute("""
                    INSERT INTO portal_timetable (class_id, subject_id, teacher_id, day_of_week, start_time, end_time, room_number)
                    VALUES (%s,%s,%s,%s,'09:00','09:45','B-204')
                """, [class_id, subject_id, teacher.id, day])

            # Attendance records
            for offset, status in enumerate(["Present", "Present", "Late", "Present", "Absent"]):
                c.execute("""
                    INSERT INTO portal_attendance (student_id, class_id, date, status, marked_by, remarks)
                    VALUES (%s,%s,%s,%s,%s,'Demo record')
                """, [student.id, class_id, date.today() - timedelta(days=offset), status, teacher.id])

            # Homework, Assignments & Exams
            c.execute("""
                INSERT INTO portal_homework (class_id, subject_id, teacher_id, title, description, due_date)
                VALUES (%s,%s,%s,'Algebra Worksheet','Complete questions 1 to 15 from the worksheet.', current_date + interval '3 days')
            """, [class_id, subject_id, teacher.id])

            c.execute("""
                INSERT INTO portal_assignment (class_id, subject_id, teacher_id, title, description, max_marks, due_date)
                VALUES (%s,%s,%s,'Linear Equations Assignment','Upload your solved PDF.', 50, now() + interval '5 days')
            """, [class_id, subject_id, teacher.id])

            c.execute("""
                INSERT INTO portal_exam_schedule (class_id, subject_id, teacher_id, exam_name, exam_type, exam_date, max_marks)
                VALUES (%s,%s,%s,'Unit_Test_1','Unit_Test', current_date + interval '10 days', 50)
            """, [class_id, subject_id, teacher.id])

            # Fee Structure
            c.execute("""
                INSERT INTO portal_fee_structure (class_id, term_name, tuition_fee, transport_fee, hostel_fee, total_amount)
                VALUES (%s,'Term 1',25000,5000,0,30000)
            """, [class_id])

            # Notifications
            c.execute("""
                INSERT INTO portal_notification (sender_id, recipient_type, target_class_id, title, message)
                VALUES (%s,'Student',%s,'Welcome to EduNova Portal','Your demo student and teacher portals are connected.')
            """, [teacher.id, class_id])

            # Library demo book
            c.execute("""
                INSERT INTO portal_book (title, author, isbn, barcode_id, quantity, available_quantity)
                VALUES ('Mathematics Grade 8 Reference','EduNova Academic Team','DEMO-ISBN-001','DEMO-BOOK-001',10,8)
            """)

        self.stdout.write(self.style.SUCCESS("Database fully cleared and re-seeded successfully!"))
