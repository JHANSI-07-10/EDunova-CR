from datetime import date
from django.db import connection
from rest_framework.views import APIView
from rest_framework.response import Response

from .views import table_exists, rows, row, serialise, EXAM_NAME_CHOICES
from .roles import IsTeacher


class TeacherMixin:
    # RBAC: only accounts whose resolved role is 'Teacher' pass.
    permission_classes = [IsTeacher]


def teacher_classes(user_id):
    if not table_exists("portal_academic_allocation"):
        return []
    # Union class allocations with class teacher mappings
    sql = """
        SELECT DISTINCT c.id AS class_id, c.name || '-' || c.section AS class_name,
               (SELECT COUNT(*) FROM portal_student_enrollment se WHERE se.class_id=c.id)::int AS student_count
        FROM portal_class c
        LEFT JOIN portal_academic_allocation aa ON aa.class_id=c.id
        LEFT JOIN portal_class_teacher ct ON ct.class_id=c.id
        WHERE aa.teacher_id=%s OR ct.teacher_id=%s
        ORDER BY class_name
    """
    data = rows(sql, [user_id, user_id])
    
    result = []
    for r in data:
        allocations = rows(
            """
            SELECT aa.id, aa.subject_id, s.name AS subject_name
            FROM portal_academic_allocation aa
            JOIN portal_subject s ON s.id=aa.subject_id
            WHERE aa.teacher_id=%s AND aa.class_id=%s
            """, [user_id, r["class_id"]]
        )
        if allocations:
            for a in allocations:
                result.append({
                    "id": a["id"],
                    "class_id": r["class_id"],
                    "class_name": r["class_name"],
                    "subject_id": a["subject_id"],
                    "subject_name": a["subject_name"],
                    "student_count": r["student_count"]
                })
        else:
            result.append({
                "id": f"ct-{r['class_id']}",
                "class_id": r["class_id"],
                "class_name": r["class_name"],
                "subject_id": 0,
                "subject_name": "Class Administration",
                "student_count": r["student_count"]
            })
    return result


class TeacherProfileView(TeacherMixin, APIView):
    def get(self, request):
        u = request.user
        profile = {
            "id": u.id,
            "name": u.get_full_name().strip() or u.username,
            "email": u.email,
            "user_type": "Teacher",
            "phone_number": "",
            "employee_code": "—",
            "qualification": "",
            "specialization": "",
            "date_of_joining": None,
        }
        if table_exists("portal_user_profile"):
            p = row("SELECT phone_number FROM portal_user_profile WHERE user_id=%s", [u.id])
            if p: profile.update(p)
        if table_exists("portal_teacher_profile"):
            t = row("SELECT employee_code, qualification, specialization, date_of_joining FROM portal_teacher_profile WHERE user_id=%s", [u.id])
            if t: profile.update(t)
        return Response(serialise(profile))


class TeacherDashboardView(TeacherMixin, APIView):
    def get(self, request):
        uid = request.user.id
        classes = teacher_classes(uid)
        today = date.today()
        todays_timetable = []
        if table_exists("portal_timetable"):
            todays_timetable = rows(
                """
                SELECT t.id, c.name || '-' || c.section AS class_name, s.name AS subject_name,
                       t.start_time, t.end_time
                FROM portal_timetable t
                JOIN portal_class c ON c.id=t.class_id
                JOIN portal_subject s ON s.id=t.subject_id
                WHERE t.teacher_id=%s AND lower(t.day_of_week)=lower(to_char(current_date, 'FMDay'))
                ORDER BY t.start_time
                """, [uid]
            )
        upcoming_exams = []
        if table_exists("portal_exam_schedule"):
            upcoming_exams = rows(
                """
                SELECT e.id, e.exam_name, e.exam_date, c.name || '-' || c.section AS class_name, s.name AS subject_name
                FROM portal_exam_schedule e
                JOIN portal_class c ON c.id=e.class_id
                JOIN portal_subject s ON s.id=e.subject_id
                WHERE e.teacher_id=%s AND e.exam_date >= current_date
                ORDER BY e.exam_date ASC LIMIT 8
                """, [uid]
            )
        pending_grading = 0
        if table_exists("portal_assignment_submission"):
            p = row(
                """
                SELECT COUNT(*)::int AS count
                FROM portal_assignment_submission sub
                JOIN portal_assignment a ON a.id=sub.assignment_id
                WHERE a.teacher_id=%s AND sub.marks_obtained IS NULL
                """, [uid]
            )
            pending_grading = p["count"] if p else 0
        unread_messages = 0
        if table_exists("portal_message"):
            m = row("SELECT COUNT(*)::int AS count FROM portal_message WHERE receiver_id=%s AND is_read=false", [uid])
            unread_messages = m["count"] if m else 0
        attendance_flags = []
        if table_exists("portal_attendance"):
            for c in classes:
                marked = row("SELECT COUNT(*)::int AS count FROM portal_attendance WHERE class_id=%s AND date=current_date", [c["class_id"]])
                attendance_flags.append({
                    "class_name": c["class_name"],
                    "subject_name": c["subject_name"],
                    "marked_count": marked["count"] if marked else 0,
                    "roster_count": c["student_count"],
                    "complete": (marked["count"] if marked else 0) >= c["student_count"] and c["student_count"] > 0,
                })
        return Response(serialise({
            "total_classes": len(classes),
            "pending_grading": pending_grading,
            "upcoming_exams": upcoming_exams,
            "unread_messages": unread_messages,
            "today": today.isoformat(),
            "todays_timetable": todays_timetable,
            "attendance_flags": attendance_flags,
        }))


class MyClassesView(TeacherMixin, APIView):
    def get(self, request):
        return Response(serialise(teacher_classes(request.user.id)))


class ClassRosterView(TeacherMixin, APIView):
    def get(self, request, class_id):
        if not table_exists("portal_student_enrollment"):
            return Response([])
        data = rows(
            """
            SELECT u.id AS student, COALESCE(u.first_name || ' ' || u.last_name, u.username) AS student_name,
                   sp.admission_number, se.roll_number
            FROM portal_student_enrollment se
            JOIN auth_user u ON u.id=se.student_id
            LEFT JOIN portal_student_profile sp ON sp.user_id=u.id
            WHERE se.class_id=%s ORDER BY se.roll_number NULLS LAST, student_name
            """, [class_id]
        )
        return Response(serialise(data))


class AttendanceView(TeacherMixin, APIView):
    def get(self, request):
        class_id = request.query_params.get("class_id")
        if not class_id:
            classes = teacher_classes(request.user.id)
            class_id = classes[0]["class_id"] if classes else None
        if not class_id:
            return Response({"records": []})
        roster = rows(
            """
            SELECT u.id AS student, COALESCE(u.first_name || ' ' || u.last_name, u.username) AS student_name,
                   sp.admission_number,
                   COALESCE(a.status, 'Present') AS status,
                   COALESCE(a.remarks, '') AS remarks
            FROM portal_student_enrollment se
            JOIN auth_user u ON u.id=se.student_id
            LEFT JOIN portal_student_profile sp ON sp.user_id=u.id
            LEFT JOIN portal_attendance a ON a.student_id=u.id AND a.class_id=se.class_id AND a.date=current_date
            WHERE se.class_id=%s ORDER BY se.roll_number NULLS LAST, student_name
            """, [class_id]
        ) if table_exists("portal_student_enrollment") else []
        return Response(serialise({"records": roster}))

    def post(self, request):
        class_id = request.data.get("class_id")
        date_value = request.data.get("date") or date.today().isoformat()
        records = request.data.get("records", [])
        if not table_exists("portal_attendance"):
            return Response({"detail": "Portal schema has not been applied."}, status=400)
        with connection.cursor() as cursor:
            for rec in records:
                cursor.execute(
                    """
                    INSERT INTO portal_attendance (student_id, class_id, date, status, marked_by, remarks)
                    VALUES (%s,%s,%s,%s,%s,%s)
                    ON CONFLICT (student_id, class_id, date)
                    DO UPDATE SET status=EXCLUDED.status, marked_by=EXCLUDED.marked_by, remarks=EXCLUDED.remarks
                    """,
                    [rec.get("student"), class_id, date_value, rec.get("status", "Present"), request.user.id, rec.get("remarks", "")],
                )
        return Response({"detail": "Attendance synced successfully."})


class HomeworkView(TeacherMixin, APIView):
    def get(self, request):
        if not table_exists("portal_homework"):
            return Response([])
        data = rows(
            """
            SELECT h.id, h.title, h.description, h.assigned_date, h.due_date,
                   c.name || '-' || c.section AS class_name, COALESCE(s.name, 'General') AS subject_name
            FROM portal_homework h
            JOIN portal_class c ON c.id=h.class_id
            LEFT JOIN portal_subject s ON s.id=h.subject_id
            WHERE h.teacher_id=%s ORDER BY h.due_date DESC
            """, [request.user.id]
        )
        return Response(serialise(data))

    def post(self, request):
        if not table_exists("portal_homework"):
            return Response({"detail": "Portal schema has not been applied."}, status=400)
        data = request.data
        class_id = data.get("class_id")
        subject_id = data.get("subject_id")
        if not subject_id or str(subject_id) == "0":
            subject_id = None
        with connection.cursor() as cursor:
            cursor.execute(
                """INSERT INTO portal_homework (class_id, subject_id, teacher_id, title, description, assigned_date, due_date)
                   VALUES (%s,%s,%s,%s,%s,%s,%s) RETURNING id""",
                [class_id, subject_id, request.user.id, data.get("title"), data.get("description"), data.get("assigned_date") or date.today(), data.get("due_date")],
            )
            hid = cursor.fetchone()[0]
        return Response({"id": hid, "detail": "Homework assigned."})


class AssignmentView(TeacherMixin, APIView):
    def get(self, request):
        if not table_exists("portal_assignment"):
            return Response([])
        data = rows(
            """
            SELECT a.id, a.title, a.description, a.file_url, a.max_marks, a.due_date, a.assignment_type, a.quiz_questions,
                   c.name || '-' || c.section AS class_name, s.name AS subject_name,
                   (SELECT COUNT(*) FROM portal_assignment_submission sub WHERE sub.assignment_id=a.id)::int AS submission_count,
                   (SELECT COUNT(*) FROM portal_assignment_submission sub WHERE sub.assignment_id=a.id AND sub.marks_obtained IS NOT NULL)::int AS graded_count
            FROM portal_assignment a
            JOIN portal_class c ON c.id=a.class_id
            JOIN portal_subject s ON s.id=a.subject_id
            WHERE a.teacher_id=%s ORDER BY a.due_date DESC
            """, [request.user.id]
        )
        return Response(serialise(data))

    def post(self, request):
        if not table_exists("portal_assignment"):
            return Response({"detail": "Portal schema has not been applied."}, status=400)
        data = request.data
        class_id = data.get("class_id")
        subject_id = data.get("subject_id")
        if not class_id:
            return Response({"detail": "class_id is required."}, status=400)
        if not subject_id or str(subject_id) == "0":
            return Response({"detail": "A valid subject is required. Assignments cannot be created for Class Administration."}, status=400)
        assignment_type = data.get("assignment_type", "File")
        import json
        quiz_questions = json.dumps(data.get("quiz_questions", []))
        with connection.cursor() as cursor:
            cursor.execute(
                """INSERT INTO portal_assignment (class_id, subject_id, teacher_id, title, description, file_url, max_marks, due_date, assignment_type, quiz_questions)
                   VALUES (%s,%s,%s,%s,%s,%s,%s,%s,%s,%s) RETURNING id""",
                [class_id, subject_id, request.user.id, data.get("title"), data.get("description"), data.get("file_url"), data.get("max_marks") or 100, data.get("due_date"), assignment_type, quiz_questions],
            )
            aid = cursor.fetchone()[0]
        return Response({"id": aid, "detail": "Assignment created."})


class AssignmentDetailView(TeacherMixin, APIView):
    def patch(self, request, assignment_id):
        if not table_exists("portal_assignment"):
            return Response({"detail": "Portal schema has not been applied."}, status=400)
        data = request.data
        import json
        with connection.cursor() as cursor:
            cursor.execute(
                """UPDATE portal_assignment 
                   SET title=%s, description=%s, file_url=%s, max_marks=%s, due_date=%s, assignment_type=%s, quiz_questions=%s
                   WHERE id=%s""",
                [
                    data.get("title"),
                    data.get("description"),
                    data.get("file_url"),
                    data.get("max_marks") or 100,
                    data.get("due_date"),
                    data.get("assignment_type", "File"),
                    json.dumps(data.get("quiz_questions", [])),
                    assignment_id
                ]
            )
        return Response({"detail": "Assignment updated."})

    def delete(self, request, assignment_id):
        if not table_exists("portal_assignment"):
            return Response({"detail": "Portal schema has not been applied."}, status=400)
        with connection.cursor() as cursor:
            cursor.execute("DELETE FROM portal_assignment WHERE id=%s", [assignment_id])
        return Response({"detail": "Assignment deleted."})


class AssignmentSubmissionsView(TeacherMixin, APIView):
    def get(self, request, assignment_id, submission_id=None):
        if not table_exists("portal_assignment_submission"):
            return Response([])
        return Response(serialise(rows(
            """
            SELECT sub.id, sub.submission_url, sub.submitted_at, sub.marks_obtained, sub.teacher_feedback, sub.grade,
                   u.id AS student, COALESCE(u.first_name || ' ' || u.last_name, u.username) AS student_name,
                   sp.admission_number
            FROM portal_assignment_submission sub
            JOIN auth_user u ON u.id=sub.student_id
            LEFT JOIN portal_student_profile sp ON sp.user_id=u.id
            WHERE sub.assignment_id=%s ORDER BY sub.submitted_at DESC
            """, [assignment_id]
        )))

    def patch(self, request, assignment_id, submission_id):
        if not table_exists("portal_assignment_submission"):
            return Response({"detail": "Portal schema has not been applied."}, status=400)
        
        marks = request.data.get("marks_obtained")
        assign = row("SELECT max_marks FROM portal_assignment WHERE id=%s", [assignment_id])
        grade = None
        if marks is not None and assign and assign.get("max_marks"):
            try:
                pct = (float(marks) / float(assign["max_marks"])) * 100
                if pct >= 90: grade = 'A+'
                elif pct >= 80: grade = 'A'
                elif pct >= 70: grade = 'B'
                elif pct >= 60: grade = 'C'
                elif pct >= 50: grade = 'D'
                else: grade = 'F'
            except Exception:
                pass

        with connection.cursor() as cursor:
            cursor.execute(
                "UPDATE portal_assignment_submission SET marks_obtained=%s, teacher_feedback=%s, grade=%s WHERE id=%s AND assignment_id=%s",
                [marks, request.data.get("teacher_feedback", ""), grade, submission_id, assignment_id],
            )
        return Response({"detail": "Submission graded."})


class QuestionBankView(TeacherMixin, APIView):
    def get(self, request, question_id=None):
        if not table_exists("portal_question_bank"):
            return Response([])
        return Response(serialise(rows(
            """
            SELECT q.id, q.difficulty_level, q.question_text, q.answer_schema, s.id AS subject_id, s.name AS subject_name
            FROM portal_question_bank q JOIN portal_subject s ON s.id=q.subject_id
            WHERE q.teacher_id=%s ORDER BY q.id DESC
            """, [request.user.id]
        )))

    def post(self, request, question_id=None):
        if not table_exists("portal_question_bank"):
            return Response({"detail": "Portal schema has not been applied."}, status=400)
        with connection.cursor() as cursor:
            cursor.execute(
                "INSERT INTO portal_question_bank (subject_id, teacher_id, difficulty_level, question_text, answer_schema) VALUES (%s,%s,%s,%s,%s::jsonb) RETURNING id",
                [request.data.get("subject_id"), request.user.id, request.data.get("difficulty_level", "Medium"), request.data.get("question_text"), request.data.get("answer_schema", "{}")],
            )
            qid = cursor.fetchone()[0]
        return Response({"id": qid, "detail": "Question added."})

    def delete(self, request, question_id):
        if table_exists("portal_question_bank"):
            with connection.cursor() as cursor:
                cursor.execute("DELETE FROM portal_question_bank WHERE id=%s AND teacher_id=%s", [question_id, request.user.id])
        return Response({"detail": "Question removed."})


class TeacherExamView(TeacherMixin, APIView):
    def get(self, request):
        if not table_exists("portal_exam_schedule"):
            return Response([])
        return Response(serialise(rows(
            """
            SELECT e.id, e.exam_name, e.exam_type, e.exam_date, e.start_time, e.duration_minutes, e.max_marks,
                   c.name || '-' || c.section AS class_name, s.name AS subject_name
            FROM portal_exam_schedule e JOIN portal_class c ON c.id=e.class_id JOIN portal_subject s ON s.id=e.subject_id
            WHERE e.teacher_id=%s ORDER BY e.exam_date DESC
            """, [request.user.id]
        )))

    def post(self, request):
        if not table_exists("portal_exam_schedule"):
            return Response({"detail": "Portal schema has not been applied.", "exam_name_choices": EXAM_NAME_CHOICES}, status=400)
        data = request.data
        exam_name = (data.get("exam_name") or "").strip()
        if exam_name not in EXAM_NAME_CHOICES:
            return Response(
                {"detail": f"exam_name must be one of {EXAM_NAME_CHOICES}.",
                 "exam_name_choices": EXAM_NAME_CHOICES},
                status=400,
            )
        class_id = data.get("class_id")
        subject_id = data.get("subject_id")
        with connection.cursor() as cursor:
            cursor.execute(
                """INSERT INTO portal_exam_schedule (class_id, subject_id, teacher_id, exam_name, exam_type, exam_date, start_time, duration_minutes, max_marks)
                   VALUES (%s,%s,%s,%s,%s,%s,%s,%s,%s) RETURNING id""",
                [class_id, subject_id, request.user.id, exam_name, data.get("exam_type", "Unit_Test"), data.get("exam_date"), data.get("start_time", "09:00"), data.get("duration_minutes") or 60, data.get("max_marks") or 100],
            )
            eid = cursor.fetchone()[0]
        return Response({"id": eid, "detail": "Exam scheduled."})


class MarksEntryView(TeacherMixin, APIView):
    def get(self, request):
        exam_id = request.query_params.get("exam_schedule_id")
        if not exam_id or not table_exists("portal_exam_schedule"):
            return Response({"exam": None, "rows": []})
        exam = row("SELECT e.id, e.exam_name, e.max_marks, c.name || '-' || c.section AS class_name, s.name AS subject_name FROM portal_exam_schedule e JOIN portal_class c ON c.id=e.class_id JOIN portal_subject s ON s.id=e.subject_id WHERE e.id=%s", [exam_id])
        if not exam:
            return Response({"exam": None, "rows": []})
        data = rows(
            """
            SELECT u.id AS student, COALESCE(u.first_name || ' ' || u.last_name, u.username) AS student_name,
                   sp.admission_number, r.marks_obtained, r.grade_letter, r.remarks,
                   CASE WHEN r.id IS NULL THEN false ELSE true END AS published
            FROM portal_student_enrollment se
            JOIN portal_exam_schedule e ON e.class_id=se.class_id
            JOIN auth_user u ON u.id=se.student_id
            LEFT JOIN portal_student_profile sp ON sp.user_id=u.id
            LEFT JOIN portal_result r ON r.student_id=u.id AND r.exam_schedule_id=e.id
            WHERE e.id=%s ORDER BY se.roll_number NULLS LAST, student_name
            """, [exam_id]
        ) if table_exists("portal_student_enrollment") else []
        return Response(serialise({"exam": exam, "rows": data}))

    def post(self, request):
        if not table_exists("portal_result"):
            return Response({"detail": "Portal schema has not been applied."}, status=400)
        exam_id = request.data.get("exam_schedule_id")
        # Accept both 'entries' (frontend key) and 'rows' (legacy)
        marks_rows = request.data.get("entries") or request.data.get("rows", [])
        submit = request.data.get("submit", True)
        exam = row("SELECT max_marks FROM portal_exam_schedule WHERE id=%s", [exam_id])
        max_marks = exam["max_marks"] if exam else 100
        with connection.cursor() as cursor:
            for r in marks_rows:
                raw = r.get("marks_obtained")
                if raw is None or raw == "":
                    continue
                marks = float(raw)
                pct = (marks / max_marks) * 100 if max_marks else 0
                grade = r.get("grade_letter") or ("A" if pct >= 90 else "B" if pct >= 75 else "C" if pct >= 60 else "D" if pct >= 40 else "F")
                cursor.execute(
                    """
                    INSERT INTO portal_result (student_id, exam_schedule_id, marks_obtained, grade_letter, grade_points, remarks)
                    VALUES (%s,%s,%s,%s,%s,%s)
                    ON CONFLICT (student_id, exam_schedule_id)
                    DO UPDATE SET marks_obtained=EXCLUDED.marks_obtained, grade_letter=EXCLUDED.grade_letter, grade_points=EXCLUDED.grade_points, remarks=EXCLUDED.remarks
                    """, [r.get("student"), exam_id, marks, grade, round(pct/10, 2), r.get("remarks", "")]
                )
        detail = "Marks submitted for publication." if submit else "Marks saved as draft."
        return Response({"detail": detail})


class PerformanceAnalyticsView(TeacherMixin, APIView):
    def get(self, request):
        class_id = request.query_params.get("class_id")
        subject_id = request.query_params.get("subject_id")
        if not class_id:
            return Response({"class_average": 0, "students": []})
        data = rows(
            """
            SELECT u.id AS student_id, COALESCE(u.first_name || ' ' || u.last_name, u.username) AS name,
              COALESCE(ROUND(AVG(r.marks_obtained),1),0) AS average_marks,
              COUNT(r.id)::int AS exams_taken,
              COALESCE(ROUND(AVG(CASE WHEN a.status='Present' THEN 100 ELSE 0 END),1),0) AS attendance_percentage
            FROM portal_student_enrollment se
            JOIN auth_user u ON u.id=se.student_id
            LEFT JOIN portal_exam_schedule e ON e.class_id=se.class_id AND (%s IS NULL OR e.subject_id=%s)
            LEFT JOIN portal_result r ON r.student_id=u.id AND r.exam_schedule_id=e.id
            LEFT JOIN portal_attendance a ON a.student_id=u.id AND a.class_id=se.class_id
            WHERE se.class_id=%s
            GROUP BY u.id, name ORDER BY name
            """, [subject_id, subject_id, class_id]
        ) if table_exists("portal_student_enrollment") else []
        class_avg = round(sum(float(s["average_marks"] or 0) for s in data) / len(data), 1) if data else 0
        return Response(serialise({"class_average": class_avg, "students": data}))


class MessageThreadView(TeacherMixin, APIView):
    def get(self, request):
        other = request.query_params.get("with")
        if not table_exists("portal_message"):
            return Response([])
        if other:
            data = rows(
                """
                SELECT m.id, m.sender_id AS sender, m.receiver_id AS receiver, m.message_text, m.created_at,
                       su.username AS sender_name, ru.username AS receiver_name
                FROM portal_message m JOIN auth_user su ON su.id=m.sender_id JOIN auth_user ru ON ru.id=m.receiver_id
                WHERE (m.sender_id=%s AND m.receiver_id=%s) OR (m.sender_id=%s AND m.receiver_id=%s)
                ORDER BY m.created_at
                """, [request.user.id, other, other, request.user.id]
            )
        else:
            data = rows(
                """
                SELECT DISTINCT ON (CASE WHEN sender_id=%s THEN receiver_id ELSE sender_id END)
                       m.id, m.sender_id AS sender, m.receiver_id AS receiver, m.message_text, m.created_at,
                       su.username AS sender_name, ru.username AS receiver_name
                FROM portal_message m JOIN auth_user su ON su.id=m.sender_id JOIN auth_user ru ON ru.id=m.receiver_id
                WHERE m.sender_id=%s OR m.receiver_id=%s
                ORDER BY CASE WHEN sender_id=%s THEN receiver_id ELSE sender_id END, m.created_at DESC
                """, [request.user.id, request.user.id, request.user.id, request.user.id]
            )
        return Response(serialise(data))

    def post(self, request):
        if not table_exists("portal_message"):
            return Response({"detail": "Portal schema has not been applied."}, status=400)
        with connection.cursor() as cursor:
            cursor.execute("INSERT INTO portal_message (sender_id, receiver_id, message_text) VALUES (%s,%s,%s) RETURNING id", [request.user.id, request.data.get("receiver"), request.data.get("message_text")])
            mid = cursor.fetchone()[0]
        return Response({"id": mid, "detail": "Message sent."})


class MyContactsView(TeacherMixin, APIView):
    def get(self, request):
        if not table_exists("portal_user_profile"):
            return Response([])
        data = rows("SELECT u.id, COALESCE(u.first_name || ' ' || u.last_name, u.username) AS name, p.user_type AS role FROM auth_user u JOIN portal_user_profile p ON p.user_id=u.id WHERE u.id<>%s ORDER BY name LIMIT 50", [request.user.id])
        return Response(serialise(data))


class NoticeListView(TeacherMixin, APIView):
    def get(self, request):
        if table_exists("cms_newspost"):
            data = rows("SELECT id, title, content, published_date AS created_at, NULL AS file_attachment_url, false AS is_pinned FROM cms_newspost WHERE is_published=true ORDER BY published_date DESC")
            return Response(serialise(data))
        return Response([])


class LeaveView(TeacherMixin, APIView):
    def get(self, request):
        if not table_exists("portal_leave"):
            return Response([])
        return Response(serialise(rows("SELECT id, leave_type, start_date, end_date, reason, status FROM portal_leave WHERE user_id=%s ORDER BY start_date DESC", [request.user.id])))

    def post(self, request):
        if not table_exists("portal_leave"):
            return Response({"detail": "Portal schema has not been applied."}, status=400)
        with connection.cursor() as cursor:
            cursor.execute("INSERT INTO portal_leave (user_id, leave_type, start_date, end_date, reason) VALUES (%s,%s,%s,%s,%s) RETURNING id", [request.user.id, request.data.get("leave_type"), request.data.get("start_date"), request.data.get("end_date"), request.data.get("reason")])
            lid = cursor.fetchone()[0]
        return Response({"id": lid, "detail": "Leave request submitted."})


class TeacherTimetableView(TeacherMixin, APIView):
    def get(self, request):
        if not table_exists("portal_timetable"):
            return Response([])
        data = rows(
            """
            SELECT t.id, t.day_of_week, t.start_time, t.end_time, c.name || '-' || c.section AS class_name, s.name AS subject_name
            FROM portal_timetable t JOIN portal_class c ON c.id=t.class_id JOIN portal_subject s ON s.id=t.subject_id
            WHERE t.teacher_id=%s ORDER BY t.day_of_week, t.start_time
            """, [request.user.id]
        )
        return Response(serialise(data))


class TeacherDocumentsView(TeacherMixin, APIView):
    def get(self, request):
        if not table_exists("portal_teacher_document"):
            return Response([])
        return Response(serialise(rows("SELECT id, content_type, title, resource_url FROM portal_teacher_document WHERE teacher_id=%s ORDER BY created_at DESC", [request.user.id])))

    def post(self, request):
        if not table_exists("portal_teacher_document"):
            return Response({"detail": "Portal schema has not been applied."}, status=400)
        data = request.data
        class_id = data.get("class_id")
        subject_id = data.get("subject_id")
        with connection.cursor() as cursor:
            cursor.execute("INSERT INTO portal_teacher_document (teacher_id, class_id, subject_id, content_type, title, resource_url) VALUES (%s,%s,%s,%s,%s,%s) RETURNING id", [request.user.id, class_id, subject_id, data.get("content_type"), data.get("title"), data.get("resource_url")])
            did = cursor.fetchone()[0]
        return Response({"id": did, "detail": "Document uploaded."})


class TeacherAdmissionsReviewView(TeacherMixin, APIView):
    """
    Teacher views admission enquiries in Verification/Screening,
    provides interview remarks, counselling feedback, and submits recommendations.
    """
    def get(self, request):
        from apps.admissions.models import AdmissionEnquiry
        qs = AdmissionEnquiry.objects.filter(status__in=["Verification", "Screening"]).order_by("-submitted_at")
        data = list(qs.values(
            "registration_number", "applicant_name", "date_of_birth", "gender", "target_class",
            "parent_name", "parent_phone", "parent_email", "scholarship_applied", "status",
            "rejection_reason", "submitted_at"
        ))
        return Response(serialise(data))

    def post(self, request):
        from apps.admissions.models import AdmissionEnquiry
        from .admin_views import NEXT_STATUS
        reg_num = request.data.get("registration_number")
        action = request.data.get("action")  # "recommend_advance" or "recommend_reject"
        remarks = request.data.get("remarks", "").strip()

        try:
            enquiry = AdmissionEnquiry.objects.get(registration_number=reg_num)
        except AdmissionEnquiry.DoesNotExist:
            return Response({"detail": "Enquiry not found."}, status=404)

        if enquiry.status not in ["Verification", "Screening"]:
            return Response({"detail": "Enquiry is not in Verification or Screening stage."}, status=400)

        # Store remarks in rejection_reason field
        if remarks:
            enquiry.rejection_reason = f"[Teacher Interview Feedback]: {remarks}"

        if action == "recommend_reject":
            enquiry.status = "Rejected"
            enquiry.reviewed_by = f"Teacher: {request.user.username}"
            enquiry.save()
            return Response({"detail": "Application rejected based on interview recommendation.", "status": "Rejected"})

        elif action == "recommend_advance":
            nxt = NEXT_STATUS.get(enquiry.status)
            if not nxt:
                return Response({"detail": "Cannot advance status."}, status=400)
            enquiry.status = nxt
            enquiry.reviewed_by = f"Teacher: {request.user.username}"
            enquiry.save()
            return Response({"detail": f"Application advanced to {nxt} based on interview recommendation.", "status": nxt})

        return Response({"detail": "Invalid action."}, status=400)


class AssignmentScanPDFView(TeacherMixin, APIView):
    def post(self, request):
        uploaded_file = request.FILES.get("file")
        if not uploaded_file:
            return Response({"detail": "No file uploaded."}, status=400)

        # 1. Extract text using pypdf
        try:
            from pypdf import PdfReader
            reader = PdfReader(uploaded_file)
            text = ""
            for page in reader.pages:
                page_text = page.extract_text()
                if page_text:
                    text += page_text + "\n"
        except Exception as e:
            return Response({"detail": f"Failed to read PDF file: {str(e)}"}, status=400)

        if not text.strip():
            return Response({"detail": "The PDF file is empty or contains no extractable text."}, status=400)

        # 2. Try parsing with Gemini if API key is present
        import os
        gemini_key = os.environ.get("GEMINI_API_KEY")
        questions = None

        if gemini_key:
            try:
                import urllib.request
                import json
                
                url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key={gemini_key}"
                headers = {"Content-Type": "application/json"}
                
                prompt = (
                    "You are an expert assessment parser. Extract multiple-choice questions from the following text. "
                    "Return a JSON object with a single root key 'questions' containing an array of objects. "
                    "Each question object MUST contain the following properties:\n"
                    "1. 'question_text' (string): The text of the question.\n"
                    "2. 'options' (array of exactly 4 strings): The options/choices.\n"
                    "3. 'correct_answer' (string): The correct option value (must match one of the options exactly).\n"
                    "If correct answers are not explicitly defined in the text, determine the correct answer yourself. "
                    "Format the response strictly as valid JSON matching the specified schema. Output NO markdown formatting or text besides the raw JSON.\n\n"
                    f"Text to parse:\n{text}"
                )
                
                payload = {
                    "contents": [{
                        "parts": [{
                            "text": prompt
                        }]
                    }],
                    "generationConfig": {
                        "responseMimeType": "application/json"
                    }
                }
                
                req = urllib.request.Request(
                    url,
                    data=json.dumps(payload).encode("utf-8"),
                    headers=headers,
                    method="POST"
                )
                
                with urllib.request.urlopen(req, timeout=25) as response:
                    res_body = json.loads(response.read().decode("utf-8"))
                    content = res_body["candidates"][0]["content"]["parts"][0]["text"]
                    
                    content_clean = content.strip()
                    if content_clean.startswith("```json"):
                        content_clean = content_clean[7:]
                    if content_clean.endswith("```"):
                        content_clean = content_clean[:-3]
                    content_clean = content_clean.strip()
                    
                    parsed = json.loads(content_clean)
                    if "questions" in parsed and isinstance(parsed["questions"], list):
                        questions = parsed["questions"]
            except Exception as e:
                print("Gemini parsing failed, falling back to rule-based parser. Error:", str(e))

        # 3. Fallback to rule-based parsing if Gemini wasn't used or failed
        if not questions:
            questions = self.parse_questions_fallback(text)

        return Response({"questions": questions})

    def parse_questions_fallback(self, text):
        import re
        lines = [line.strip() for line in text.split("\n") if line.strip()]
        questions = []
        current_q = None
        
        q_re = re.compile(r'^(?:Q(?:uestion)?\s*\d+[\.:\)]|\d+[\.:\)])\s*(.*)', re.IGNORECASE)
        opt_re = re.compile(r'^\s*[\(\[]?([A-Da-d])[\)\]\.]?\s+(.*)')
        ans_re = re.compile(r'^\s*(?:Correct\s+Answer|Correct\s+Option|Correct|Answer|Ans|Option)\s*[:\.-]?\s*([A-Da-d]|\S+)', re.IGNORECASE)

        for line in lines:
            q_match = q_re.match(line)
            if q_match:
                if current_q:
                    questions.append(current_q)
                current_q = {
                    "question_text": q_match.group(1).strip(),
                    "options": ["", "", "", ""],
                    "correct_answer": ""
                }
                continue

            if not current_q:
                continue

            opt_match = opt_re.match(line)
            if opt_match:
                letter = opt_match.group(1).upper()
                opt_text = opt_match.group(2).strip()
                idx = ord(letter) - ord('A')
                if 0 <= idx < 4:
                    current_q["options"][idx] = opt_text
                continue

            ans_match = ans_re.match(line)
            if ans_match:
                ans_val = ans_match.group(1).strip().upper()
                if len(ans_val) == 1 and 'A' <= ans_val <= 'D':
                    idx = ord(ans_val) - ord('A')
                    current_q["correct_answer"] = current_q["options"][idx]
                else:
                    current_q["correct_answer"] = ans_match.group(1).strip()
                continue

            if not any(current_q["options"]):
                current_q["question_text"] += " " + line
            else:
                last_idx = -1
                for idx in range(3, -1, -1):
                    if current_q["options"][idx]:
                        last_idx = idx
                        break
                if last_idx != -1:
                    current_q["options"][last_idx] += " " + line

        if current_q:
            questions.append(current_q)

        cleaned_questions = []
        for q in questions:
            if not q["question_text"].strip():
                continue
            
            for idx in range(4):
                if not q["options"][idx].strip():
                    q["options"][idx] = f"Option {chr(65+idx)}"
                    
            o_clean = [o.strip().lower() for o in q["options"]]
            ans_clean = q["correct_answer"].strip().lower()
            
            if ans_clean in o_clean:
                q["correct_answer"] = q["options"][o_clean.index(ans_clean)]
        return cleaned_questions


class TeacherLmsCoursesView(TeacherMixin, APIView):
    def get(self, request):
        if not table_exists("portal_academic_allocation") or not table_exists("portal_course"):
            return Response([])
        
        # Auto-create courses for any allocated subjects if they do not exist
        allocations = rows(
            """
            SELECT aa.class_id, aa.subject_id, c.name || '-' || c.section AS class_name, s.name AS subject_name
            FROM portal_academic_allocation aa
            JOIN portal_class c ON c.id = aa.class_id
            JOIN portal_subject s ON s.id = aa.subject_id
            WHERE aa.teacher_id = %s
            """, [request.user.id]
        )
        for a in allocations:
            exist = row("SELECT id FROM portal_course WHERE class_id=%s AND subject_id=%s", [a["class_id"], a["subject_id"]])
            if not exist:
                with connection.cursor() as cursor:
                    cursor.execute(
                        "INSERT INTO portal_course (class_id, subject_id, title, description) VALUES (%s,%s,%s,%s)",
                        [a["class_id"], a["subject_id"], f"{a['subject_name']} - {a['class_name']}", f"Course materials for {a['subject_name']}"]
                    )

        # Return all allocated courses
        courses = rows(
            """
            SELECT c.id, c.title, c.description, cl.name || '-' || cl.section AS class_name, s.name AS subject_name,
                   cl.id AS class_id, s.id AS subject_id
            FROM portal_course c
            JOIN portal_class cl ON cl.id = c.class_id
            JOIN portal_subject s ON s.id = c.subject_id
            JOIN portal_academic_allocation aa ON aa.class_id = c.class_id AND aa.subject_id = c.subject_id
            WHERE aa.teacher_id = %s ORDER BY cl.name, cl.section, s.name
            """,
            [request.user.id]
        )
        return Response(serialise(courses))


class TeacherLmsChaptersView(TeacherMixin, APIView):
    def get(self, request):
        course_id = request.query_params.get("course_id")
        if not course_id or not table_exists("portal_chapter"):
            return Response([])
        return Response(serialise(rows("SELECT id, title, description, sort_order FROM portal_chapter WHERE course_id=%s ORDER BY sort_order, id", [course_id])))

    def post(self, request):
        d = request.data
        course_id = d.get("course_id")
        class_id = d.get("class_id")
        subject_id = d.get("subject_id")
        title = d.get("title", "").strip()
        description = d.get("description", "").strip()
        sort_order = d.get("sort_order", 0)
        pdf_url = d.get("pdf_url")

        if not course_id and class_id and subject_id:
            # Find course
            exist = row("SELECT id FROM portal_course WHERE class_id=%s AND subject_id=%s", [class_id, subject_id])
            if exist:
                course_id = exist["id"]
            else:
                with connection.cursor() as cursor:
                    cursor.execute(
                        "INSERT INTO portal_course (class_id, subject_id, title) VALUES (%s,%s,%s) RETURNING id",
                        [class_id, subject_id, "Subject Course"]
                    )
                    course_id = cursor.fetchone()[0]

        if not course_id or not title:
            return Response({"detail": "course_id (or class_id + subject_id) and title are required."}, status=400)

        with connection.cursor() as cursor:
            cursor.execute(
                "INSERT INTO portal_chapter (course_id, title, description, sort_order) VALUES (%s,%s,%s,%s) RETURNING id",
                [course_id, title, description, sort_order]
            )
            cid = cursor.fetchone()[0]

            if pdf_url:
                cursor.execute(
                    """
                    INSERT INTO portal_course_content (course_id, chapter_id, content_type, title, resource_url, description)
                    VALUES (%s,%s,'PDF',%s,%s,'Chapter syllabus/intro document')
                    """,
                    [course_id, cid, f"{title} PDF Notes", pdf_url]
                )

        return Response({"id": cid, "detail": "Chapter created."})

    def put(self, request):
        d = request.data
        cid = d.get("id")
        title = d.get("title", "").strip()
        description = d.get("description", "").strip()
        pdf_url = d.get("pdf_url")
        
        if not cid or not title:
            return Response({"detail": "id and title are required."}, status=400)
            
        with connection.cursor() as cursor:
            cursor.execute(
                "UPDATE portal_chapter SET title=%s, description=%s WHERE id=%s",
                [title, description, cid]
            )
            if pdf_url:
                # Update chapter resource if it exists, otherwise create it
                exist = row("SELECT id FROM portal_course_content WHERE chapter_id=%s AND lesson_id IS NULL", [cid])
                if exist:
                    cursor.execute(
                        "UPDATE portal_course_content SET resource_url=%s, title=%s WHERE id=%s",
                        [pdf_url, f"{title} PDF Notes", exist["id"]]
                    )
                else:
                    # Fetch course_id first
                    ch = row("SELECT course_id FROM portal_chapter WHERE id=%s", [cid])
                    cursor.execute(
                        """
                        INSERT INTO portal_course_content (course_id, chapter_id, content_type, title, resource_url, description)
                        VALUES (%s,%s,'PDF',%s,%s,'Chapter syllabus/intro document')
                        """,
                        [ch["course_id"], cid, f"{title} PDF Notes", pdf_url]
                    )
        return Response({"detail": "Chapter updated."})

    def delete(self, request):
        chapter_id = request.query_params.get("id")
        if not chapter_id:
            return Response({"detail": "id parameter required."}, status=400)
        with connection.cursor() as cursor:
            cursor.execute("DELETE FROM portal_chapter WHERE id=%s", [chapter_id])
        return Response({"detail": "Chapter deleted."})


class TeacherLmsLessonsView(TeacherMixin, APIView):
    def get(self, request):
        chapter_id = request.query_params.get("chapter_id")
        if not chapter_id or not table_exists("portal_lesson"):
            return Response([])
        return Response(serialise(rows("SELECT id, title, description, sort_order FROM portal_lesson WHERE chapter_id=%s ORDER BY sort_order, id", [chapter_id])))

    def post(self, request):
        d = request.data
        chapter_id = d.get("chapter_id")
        title = d.get("title", "").strip()
        description = d.get("description", "").strip()
        sort_order = d.get("sort_order", 0)
        if not chapter_id or not title:
            return Response({"detail": "chapter_id and title are required."}, status=400)

        with connection.cursor() as cursor:
            cursor.execute(
                "INSERT INTO portal_lesson (chapter_id, title, description, sort_order) VALUES (%s,%s,%s,%s) RETURNING id",
                [chapter_id, title, description, sort_order]
            )
            lid = cursor.fetchone()[0]
        return Response({"id": lid, "detail": "Lesson created."})

    def put(self, request):
        d = request.data
        lid = d.get("id")
        title = d.get("title", "").strip()
        description = d.get("description", "").strip()
        if not lid or not title:
            return Response({"detail": "id and title are required."}, status=400)
            
        with connection.cursor() as cursor:
            cursor.execute(
                "UPDATE portal_lesson SET title=%s, description=%s WHERE id=%s",
                [title, description, lid]
            )
        return Response({"detail": "Lesson updated."})

    def delete(self, request):
        lesson_id = request.query_params.get("id")
        if not lesson_id:
            return Response({"detail": "id parameter required."}, status=400)
        with connection.cursor() as cursor:
            cursor.execute("DELETE FROM portal_lesson WHERE id=%s", [lesson_id])
        return Response({"detail": "Lesson deleted."})


class TeacherLmsResourcesView(TeacherMixin, APIView):
    def get(self, request):
        lesson_id = request.query_params.get("lesson_id")
        if not lesson_id or not table_exists("portal_course_content"):
            return Response([])
        return Response(serialise(rows("SELECT id, content_type, title, resource_url, description, due_date, max_marks, quiz_id, assignment_id, visible_from FROM portal_course_content WHERE lesson_id=%s ORDER BY sort_order, id", [lesson_id])))

    def post(self, request):
        d = request.data
        course_id = d.get("course_id")
        lesson_id = d.get("lesson_id")
        content_type = d.get("content_type", "PDF")
        title = d.get("title", "").strip()
        resource_url = d.get("resource_url", "").strip()
        description = d.get("description", "").strip()
        due_date = d.get("due_date")
        max_marks = d.get("max_marks")
        visible_from = d.get("visible_from")

        if not course_id or not lesson_id or not title:
            return Response({"detail": "course_id, lesson_id, and title are required."}, status=400)

        course = row("SELECT class_id, subject_id FROM portal_course WHERE id=%s", [course_id])
        if not course:
            return Response({"detail": "Course not found."}, status=404)

        quiz_id = None
        assignment_id = None

        with connection.cursor() as cursor:
            # Check if this resource is an Assignment
            if content_type == "Assignment":
                # Create a record in portal_assignment
                cursor.execute(
                    """
                    INSERT INTO portal_assignment (class_id, subject_id, teacher_id, title, description, file_url, max_marks, due_date)
                    VALUES (%s,%s,%s,%s,%s,%s,%s,%s) RETURNING id
                    """,
                    [course["class_id"], course["subject_id"], request.user.id, title, description or "Course Assignment", resource_url, max_marks or 100, due_date or "2026-12-31T23:59:59Z"]
                )
                assignment_id = cursor.fetchone()[0]

            # Check if this resource is a Quiz
            elif content_type == "Quiz":
                # Create a record in portal_quiz
                cursor.execute(
                    "INSERT INTO portal_quiz (course_id, title, duration_minutes, passing_score) VALUES (%s,%s,30,40) RETURNING id",
                    [course_id, title]
                )
                quiz_id = cursor.fetchone()[0]
                
                # Insert questions if provided
                questions = d.get("questions", [])
                for q in questions:
                    import json
                    cursor.execute(
                        "INSERT INTO portal_quiz_question (quiz_id, question_text, options, correct_answer) VALUES (%s,%s,%s,%s)",
                        [quiz_id, q.get("question_text"), json.dumps(q.get("options", [])), q.get("correct_answer")]
                    )

            # Insert into portal_course_content
            cursor.execute(
                """
                INSERT INTO portal_course_content (course_id, lesson_id, content_type, title, resource_url, description, due_date, max_marks, quiz_id, assignment_id, visible_from)
                VALUES (%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s) RETURNING id
                """,
                [course_id, lesson_id, content_type, title, resource_url, description, due_date, max_marks, quiz_id, assignment_id, visible_from or "now()"]
            )
            rid = cursor.fetchone()[0]

        return Response({"id": rid, "detail": "Resource uploaded and added to lesson."})

    def put(self, request):
        d = request.data
        rid = d.get("id")
        title = d.get("title", "").strip()
        resource_url = d.get("resource_url", "").strip()
        description = d.get("description", "").strip()
        due_date = d.get("due_date")
        max_marks = d.get("max_marks")
        
        if not rid or not title:
            return Response({"detail": "id and title are required."}, status=400)
            
        with connection.cursor() as cursor:
            cursor.execute(
                """
                UPDATE portal_course_content 
                SET title=%s, resource_url=COALESCE(NULLIF(%s, ''), resource_url), 
                    description=%s, due_date=%s, max_marks=%s
                WHERE id=%s
                """,
                [title, resource_url, description, due_date, max_marks, rid]
            )
            
            # If this is linked to an assignment, update assignment details too!
            ref = row("SELECT quiz_id, assignment_id FROM portal_course_content WHERE id=%s", [rid])
            if ref and ref.get("assignment_id"):
                cursor.execute(
                    """
                    UPDATE portal_assignment 
                    SET title=%s, description=%s, file_url=COALESCE(NULLIF(%s, ''), file_url), 
                        max_marks=%s, due_date=%s
                    WHERE id=%s
                    """,
                    [title, description, resource_url, max_marks or 100, due_date or "2026-12-31T23:59:59Z", ref["assignment_id"]]
                )
            if ref and ref.get("quiz_id"):
                cursor.execute(
                    "UPDATE portal_quiz SET title=%s WHERE id=%s",
                    [title, ref["quiz_id"]]
                )
        return Response({"detail": "Resource updated successfully."})

    def delete(self, request):
        resource_id = request.query_params.get("id")
        if not resource_id:
            return Response({"detail": "id parameter required."}, status=400)
        with connection.cursor() as cursor:
            # Fetch quiz_id/assignment_id if exists to clean up references
            ref = row("SELECT quiz_id, assignment_id FROM portal_course_content WHERE id=%s", [resource_id])
            cursor.execute("DELETE FROM portal_course_content WHERE id=%s", [resource_id])
            if ref:
                if ref.get("quiz_id"):
                    cursor.execute("DELETE FROM portal_quiz WHERE id=%s", [ref["quiz_id"]])
                if ref.get("assignment_id"):
                    cursor.execute("DELETE FROM portal_assignment WHERE id=%s", [ref["assignment_id"]])
        return Response({"detail": "Resource deleted."})


