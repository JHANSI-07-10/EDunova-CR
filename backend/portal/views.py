from datetime import date, datetime
from functools import lru_cache
from uuid import uuid4

from django.db import connection
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from rest_framework import status

from .roles import IsStudent


@lru_cache(maxsize=128)
def table_exists(table_name):
    try:
        with connection.cursor() as cursor:
            cursor.execute(
                """
                SELECT EXISTS (
                    SELECT 1 FROM information_schema.tables
                    WHERE table_schema='public' AND table_name=%s
                )
                """,
                [table_name],
            )
            return cursor.fetchone()[0]
    except Exception:
        return False


def rows(sql, params=None):
    with connection.cursor() as cursor:
        cursor.execute(sql, params or [])
        cols = [c[0] for c in cursor.description]
        return [dict(zip(cols, r)) for r in cursor.fetchall()]


def row(sql, params=None):
    result = rows(sql, params)
    return result[0] if result else None


# Fixed set of exam-cycle names. Rank lists and report cards group results by
# exam_name as a raw string — without a fixed set, "Mid Term" vs "Mid-Term"
# vs "midterm" would silently split one exam cycle's results across three
# different "cycles", producing incomplete report cards with no error.
EXAM_NAME_CHOICES = [
    "Unit_Test_1", "Unit_Test_2", "Unit_Test_3", "Unit_Test_4",
    "Mid_Term", "Final_Term", "Pre_Board", "Board_Exam",
]


def qdate(v):
    if isinstance(v, (date, datetime)):
        return v.isoformat()
    return v


def serialise(obj):
    if isinstance(obj, list):
        return [serialise(i) for i in obj]
    if isinstance(obj, dict):
        return {k: qdate(v) for k, v in obj.items()}
    return qdate(obj)


def current_class_for_student(user_id):
    if not table_exists("portal_student_enrollment"):
        return None
    return row(
        """
        SELECT e.class_id, c.name || '-' || c.section AS class_name, e.academic_year, e.roll_number
        FROM portal_student_enrollment e
        JOIN portal_class c ON c.id=e.class_id
        WHERE e.student_id=%s
        ORDER BY e.academic_year DESC, e.id DESC
        LIMIT 1
        """,
        [user_id],
    )


def student_profile_payload(user):
    full_name = user.get_full_name().strip() or user.username
    base = {
        "id": user.id,
        "name": full_name,
        "email": user.email,
        "phone_number": "",
        "admission_number": "—",
        "class_name": "Not assigned",
        "date_of_birth": None,
        "gender": "",
        "blood_group": "",
        "status": "Active",
    }
    if table_exists("portal_user_profile"):
        p = row("SELECT phone_number FROM portal_user_profile WHERE user_id=%s", [user.id])
        if p:
            base["phone_number"] = p.get("phone_number") or ""
    if table_exists("portal_student_profile"):
        sp = row("SELECT admission_number, date_of_birth, gender, blood_group, status FROM portal_student_profile WHERE user_id=%s", [user.id])
        if sp:
            base.update(serialise(sp))
    cls = current_class_for_student(user.id)
    if cls:
        base["class_name"] = cls["class_name"]
        base["roll_number"] = cls.get("roll_number")
        base["academic_year"] = cls.get("academic_year")
    return base


class StudentOnlyMixin:
    # RBAC: only accounts whose resolved role is 'Student' pass. Resolved via
    # portal.roles.get_role (portal_user_profile -> groups -> is_staff), never
    # trusted from the client.
    permission_classes = [IsStudent]


class ProfileView(StudentOnlyMixin, APIView):
    def get(self, request):
        return Response(student_profile_payload(request.user))


class DashboardView(StudentOnlyMixin, APIView):
    def get(self, request):
        uid = request.user.id
        cls = current_class_for_student(uid)
        class_id = cls["class_id"] if cls else None

        attendance_percentage = None
        if class_id and table_exists("portal_attendance"):
            stats = row(
                """
                SELECT COUNT(*)::int total,
                       SUM(CASE WHEN status='Present' THEN 1 ELSE 0 END)::int present
                FROM portal_attendance WHERE student_id=%s
                """,
                [uid],
            )
            if stats and stats["total"]:
                attendance_percentage = round((stats["present"] or 0) * 100 / stats["total"], 1)

        assignments_due = []
        if class_id and table_exists("portal_assignment"):
            assignments_due = rows(
                """
                SELECT a.id, a.title, a.description, a.due_date, a.max_marks, s.name AS subject_name
                FROM portal_assignment a JOIN portal_subject s ON s.id=a.subject_id
                WHERE a.class_id=%s AND a.due_date >= now()
                ORDER BY a.due_date ASC LIMIT 5
                """,
                [class_id],
            )

        upcoming_exams = []
        if class_id and table_exists("portal_exam_schedule"):
            upcoming_exams = rows(
                """
                SELECT e.id, e.exam_name, e.exam_type, e.exam_date, e.duration_minutes, e.max_marks,
                       s.name AS subject_name
                FROM portal_exam_schedule e JOIN portal_subject s ON s.id=e.subject_id
                WHERE e.class_id=%s AND e.exam_date >= current_date
                ORDER BY e.exam_date ASC LIMIT 5
                """,
                [class_id],
            )

        recent_results = []
        if table_exists("portal_result"):
            recent_results = rows(
                """
                SELECT r.id, r.marks_obtained, r.rank_position, r.grade_letter, r.remarks,
                       ROUND((r.marks_obtained / NULLIF(e.max_marks,0)) * 100, 1) AS percentage,
                       json_build_object('id', e.id, 'exam_name', e.exam_name, 'max_marks', e.max_marks, 'subject_name', s.name) AS exam
                FROM portal_result r
                JOIN portal_exam_schedule e ON e.id=r.exam_schedule_id
                JOIN portal_subject s ON s.id=e.subject_id
                WHERE r.student_id=%s
                ORDER BY e.exam_date DESC LIMIT 6
                """,
                [uid],
            )

        homework_due = []
        if class_id and table_exists("portal_homework"):
            homework_due = rows(
                """
                SELECT h.id, h.title, h.description, h.assigned_date, h.due_date,
                       COALESCE(s.name, 'General') AS subject_name, (h.due_date < current_date) AS is_overdue
                FROM portal_homework h LEFT JOIN portal_subject s ON s.id=h.subject_id
                WHERE h.class_id=%s
                ORDER BY h.due_date ASC LIMIT 5
                """,
                [class_id],
            )

        announcements = []
        if table_exists("portal_notification"):
            announcements = rows(
                """
                SELECT n.id, n.title, n.message, n.created_at,
                       COALESCE(u.first_name || ' ' || u.last_name, u.username, 'EduNova Admin') AS sender_name
                FROM portal_notification n LEFT JOIN auth_user u ON u.id=n.sender_id
                WHERE n.recipient_type IN ('All','Student') OR n.target_class_id=%s
                ORDER BY n.created_at DESC LIMIT 5
                """,
                [class_id],
            )
        elif table_exists("cms_newspost"):
            announcements = rows(
                """
                SELECT id, title, content AS message, published_date AS created_at, 'EduNova Admin' AS sender_name
                FROM cms_newspost WHERE is_published=true ORDER BY published_date DESC LIMIT 5
                """
            )

        pending_fees = []
        if class_id and table_exists("portal_fee_structure"):
            pending_fees = rows(
                """
                SELECT fs.id, fs.term_name, fs.tuition_fee, fs.transport_fee, fs.hostel_fee, fs.total_amount
                FROM portal_fee_structure fs
                WHERE fs.class_id=%s AND NOT EXISTS (
                  SELECT 1 FROM portal_payment p WHERE p.fee_structure_id=fs.id AND p.student_id=%s AND p.status='Success'
                )
                ORDER BY fs.id LIMIT 5
                """,
                [class_id, uid],
            )

        return Response(serialise({
            "attendance_percentage": attendance_percentage,
            "assignments_due": assignments_due,
            "upcoming_exams": upcoming_exams,
            "pending_fees": pending_fees,
            "recent_results": recent_results,
            "homework_due": homework_due,
            "announcements": announcements,
        }))


class AttendanceListView(StudentOnlyMixin, APIView):
    def get(self, request):
        month = request.query_params.get("month")
        uid = request.user.id
        records = []
        if table_exists("portal_attendance"):
            sql = "SELECT id, date, status, remarks FROM portal_attendance WHERE student_id=%s"
            params = [uid]
            if month:
                sql += " AND to_char(date, 'YYYY-MM')=%s"
                params.append(month)
            sql += " ORDER BY date DESC"
            records = rows(sql, params)
        summary = {"present": 0, "absent": 0, "late": 0, "medical_leave": 0, "percentage": None}
        for r in records:
            key = str(r["status"]).lower()
            if key == "medical_leave": key = "medical_leave"
            if key in summary: summary[key] += 1
        total = len(records)
        if total:
            summary["percentage"] = round(summary["present"] * 100 / total, 1)
        return Response(serialise({"summary": summary, "records": records}))


class TimetableView(StudentOnlyMixin, APIView):
    def get(self, request):
        cls = current_class_for_student(request.user.id)
        if not cls or not table_exists("portal_timetable"):
            return Response([])
        data = rows(
            """
            SELECT t.id, t.day_of_week, t.start_time, t.end_time,
                   s.name AS subject_name,
                   COALESCE(u.first_name || ' ' || u.last_name, u.username) AS teacher_name,
                   COALESCE(t.room_number, cl.room_number, 'Online / Remote') AS room_number,
                   t.meeting_link
            FROM portal_timetable t
            JOIN portal_subject s ON s.id=t.subject_id
            JOIN auth_user u ON u.id=t.teacher_id
            JOIN portal_class cl ON cl.id=t.class_id
            WHERE t.class_id=%s
            ORDER BY t.day_of_week, t.start_time
            """, [cls["class_id"]]
        )
        return Response(serialise(data))


class HomeworkListView(StudentOnlyMixin, APIView):
    def get(self, request):
        cls = current_class_for_student(request.user.id)
        if not cls or not table_exists("portal_homework"):
            return Response([])
        data = rows(
            """
            SELECT h.id, h.title, h.description, h.assigned_date, h.due_date,
                   COALESCE(s.name, 'General') AS subject_name,
                   COALESCE(u.first_name || ' ' || u.last_name, u.username) AS teacher_name,
                   (h.due_date < current_date) AS is_overdue
            FROM portal_homework h
            LEFT JOIN portal_subject s ON s.id=h.subject_id
            JOIN auth_user u ON u.id=h.teacher_id
            WHERE h.class_id=%s ORDER BY h.due_date DESC
            """, [cls["class_id"]]
        )
        return Response(serialise(data))


class AssignmentListView(StudentOnlyMixin, APIView):
    def get(self, request):
        cls = current_class_for_student(request.user.id)
        if not cls or not table_exists("portal_assignment"):
            return Response([])
        data = rows(
            """
            SELECT a.id, a.title, a.description, a.file_url, a.max_marks, a.due_date, a.assignment_type, a.quiz_questions, s.name AS subject_name,
              (SELECT json_build_object('id', sub.id, 'submission_url', sub.submission_url, 'submitted_at', sub.submitted_at,
                                        'marks_obtained', sub.marks_obtained, 'teacher_feedback', sub.teacher_feedback, 'grade', sub.grade)
               FROM portal_assignment_submission sub WHERE sub.assignment_id=a.id AND sub.student_id=%s) AS my_submission
            FROM portal_assignment a JOIN portal_subject s ON s.id=a.subject_id
            WHERE a.class_id=%s ORDER BY a.due_date DESC
            """, [request.user.id, cls["class_id"]]
        )
        
        # Strip correct answers if not submitted yet to prevent cheating
        import json
        for row_dict in data:
            if row_dict.get("assignment_type") == "Quiz" and row_dict.get("quiz_questions"):
                has_submitted = row_dict.get("my_submission") is not None
                try:
                    questions = json.loads(row_dict["quiz_questions"]) if isinstance(row_dict["quiz_questions"], str) else row_dict["quiz_questions"]
                    clean_qs = []
                    for q in questions:
                        clean_q = {
                            "question_text": q.get("question_text"),
                            "options": q.get("options") or []
                        }
                        if has_submitted:
                            clean_q["correct_answer"] = q.get("correct_answer")
                        clean_qs.append(clean_q)
                    row_dict["quiz_questions"] = clean_qs
                except Exception:
                    pass

        return Response(serialise(data))


class AssignmentSubmitView(StudentOnlyMixin, APIView):
    def post(self, request, assignment_id):
        if not table_exists("portal_assignment_submission"):
            return Response({"detail": "Portal schema has not been applied."}, status=400)
        
        assign = row("SELECT id, assignment_type, quiz_questions, max_marks FROM portal_assignment WHERE id=%s", [assignment_id])
        if not assign:
            return Response({"detail": "Assignment not found."}, status=404)

        url = request.data.get("submission_url") or request.data.get("file_url")
        if not url:
            return Response({"detail": "submission_url is required."}, status=400)

        marks_obtained = None
        grade = None

        if assign.get("assignment_type") == "Quiz":
            import json
            try:
                student_answers = json.loads(url) if isinstance(url, str) else url
                questions = assign.get("quiz_questions") or []
                if isinstance(questions, str):
                    questions = json.loads(questions)

                correct_count = 0
                total_questions = len(questions)

                if total_questions > 0:
                    for i, q in enumerate(questions):
                        expected = q.get("correct_answer")
                        student_ans = student_answers.get(str(i)) or student_answers.get(i)
                        if student_ans and str(student_ans).strip().lower() == str(expected).strip().lower():
                            correct_count += 1

                    max_m = float(assign.get("max_marks") or 100)
                    marks_obtained = round((correct_count / total_questions) * max_m, 2)
                    pct = (marks_obtained / max_m) * 100
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
                """
                INSERT INTO portal_assignment_submission (assignment_id, student_id, submission_url, marks_obtained, grade)
                VALUES (%s,%s,%s,%s,%s)
                ON CONFLICT (assignment_id, student_id)
                DO UPDATE SET submission_url=EXCLUDED.submission_url, submitted_at=now(),
                              marks_obtained=EXCLUDED.marks_obtained, grade=EXCLUDED.grade
                RETURNING id
                """, [assignment_id, request.user.id, str(url) if isinstance(url, (dict, list)) else url, marks_obtained, grade]
            )
            sid = cursor.fetchone()[0]
        return Response({"detail": "Assignment submitted.", "id": sid, "marks_obtained": marks_obtained, "grade": grade})


class CourseListView(StudentOnlyMixin, APIView):
    def get(self, request):
        if not table_exists("portal_course"):
            return Response({"enrollments": [], "courses": []})

        # Fetch student enrollments
        enrollments = rows(
            """
            SELECT DISTINCT e.academic_year, e.class_id, c.name, c.section, c.name || '-' || c.section AS class_name
            FROM portal_student_enrollment e
            JOIN portal_class c ON c.id=e.class_id
            WHERE e.student_id=%s
            ORDER BY e.academic_year DESC, c.name, c.section
            """, [request.user.id]
        ) if table_exists("portal_student_enrollment") else []

        class_id = request.query_params.get("class_id")
        if not class_id:
            if enrollments:
                class_id = enrollments[0]["class_id"]
            else:
                cls = current_class_for_student(request.user.id)
                class_id = cls["class_id"] if cls else None

        if not class_id:
            return Response({"enrollments": enrollments, "courses": []})

        courses = rows(
            """
            SELECT c.id, c.title, c.description, s.name AS subject_name
            FROM portal_course c JOIN portal_subject s ON s.id=c.subject_id
            WHERE c.class_id=%s ORDER BY c.id
            """, [class_id]
        )

        for c in courses:
            # 1. Fetch Chapters for this Course
            chapters = rows(
                "SELECT id, title, description, sort_order FROM portal_chapter WHERE course_id=%s ORDER BY sort_order, id",
                [c["id"]]
            ) if table_exists("portal_chapter") else []
            
            for ch in chapters:
                # 1.5 Fetch Chapter-level Resources (directly attached)
                ch["resources"] = rows(
                    """
                    SELECT r.id, r.content_type, r.title, r.resource_url, r.description,
                           r.visible_from, r.uploaded_at, r.download_count, r.sort_order,
                           EXISTS(SELECT 1 FROM portal_course_progress cp WHERE cp.student_id=%s AND cp.content_id=r.id) AS is_completed
                    FROM portal_course_content r
                    WHERE r.chapter_id=%s AND r.lesson_id IS NULL AND (r.visible_from IS NULL OR r.visible_from <= now())
                    ORDER BY r.sort_order, r.id
                    """, [request.user.id, ch["id"]]
                ) if table_exists("portal_course_content") else []

                # 2. Fetch Lessons for each Chapter
                lessons = rows(
                    "SELECT id, title, description, sort_order FROM portal_lesson WHERE chapter_id=%s ORDER BY sort_order, id",
                    [ch["id"]]
                ) if table_exists("portal_lesson") else []
                
                for les in lessons:
                    # 3. Fetch Resources for each Lesson
                    resources = rows(
                        """
                        SELECT r.id, r.content_type, r.title, r.resource_url, r.description,
                               r.due_date, r.max_marks, r.quiz_id, r.assignment_id, r.visible_from,
                               r.uploaded_at, r.download_count, r.sort_order,
                               EXISTS(SELECT 1 FROM portal_course_progress cp WHERE cp.student_id=%s AND cp.content_id=r.id) AS is_completed
                        FROM portal_course_content r
                        WHERE r.lesson_id=%s AND (r.visible_from IS NULL OR r.visible_from <= now())
                        ORDER BY r.sort_order, r.id
                        """, [request.user.id, les["id"]]
                    ) if table_exists("portal_course_content") else []
                    
                    # Check assignment status for resources
                    for res in resources:
                        if res.get("assignment_id"):
                            sub = row(
                                "SELECT submitted_at, marks_obtained, teacher_feedback, grade FROM portal_assignment_submission WHERE assignment_id=%s AND student_id=%s",
                                [res["assignment_id"], request.user.id]
                            )
                            res["submission"] = sub if sub else None
                    les["resources"] = resources
                ch["lessons"] = lessons
            c["chapters"] = chapters
            # Fallback legacy content if any
            c["legacy_content"] = rows(
                """
                SELECT r.id, r.content_type, r.title, r.resource_url, r.sort_order,
                       EXISTS(SELECT 1 FROM portal_course_progress cp WHERE cp.student_id=%s AND cp.content_id=r.id) AS is_completed
                FROM portal_course_content r WHERE r.course_id=%s AND r.lesson_id IS NULL
                ORDER BY r.sort_order, r.id
                """, [request.user.id, c["id"]]
            ) if table_exists("portal_course_content") else []
            c["quizzes"] = rows("SELECT id, title, duration_minutes, passing_score FROM portal_quiz WHERE course_id=%s ORDER BY id", [c["id"]]) if table_exists("portal_quiz") else []
            
        return Response(serialise({"enrollments": enrollments, "courses": courses}))


class QuizDetailView(StudentOnlyMixin, APIView):
    def get(self, request, quiz_id):
        if not table_exists("portal_quiz"):
            return Response({"id": quiz_id, "title": "Quiz", "questions": []})
        quiz = row("SELECT id, title, duration_minutes, passing_score FROM portal_quiz WHERE id=%s", [quiz_id]) or {"id": quiz_id, "title": "Quiz"}
        quiz["questions"] = rows("SELECT id, question_text, options FROM portal_quiz_question WHERE quiz_id=%s", [quiz_id]) if table_exists("portal_quiz_question") else []
        return Response(serialise(quiz))

    def post(self, request, quiz_id):
        if not table_exists("portal_quiz"):
            return Response({"score": 0, "percentage": 0, "total": 0, "passed": False})
        
        quiz = row("SELECT id, title, duration_minutes, passing_score FROM portal_quiz WHERE id=%s", [quiz_id])
        if not quiz:
            return Response({"detail": "Quiz not found."}, status=404)
            
        questions = rows("SELECT id, question_text, options, correct_answer FROM portal_quiz_question WHERE quiz_id=%s", [quiz_id])
        if not questions:
            return Response({"score": 0, "percentage": 0, "total": 0, "passed": True})
            
        student_answers = request.data.get("answers", {})
        correct_count = 0
        total_questions = len(questions)
        
        for q in questions:
            correct_ans = q.get("correct_answer")
            ans_key = str(q["id"])
            student_ans = student_answers.get(ans_key) or student_answers.get(q["id"])
            if student_ans and str(student_ans).strip().lower() == str(correct_ans).strip().lower():
                correct_count += 1
                
        percentage = round((correct_count / total_questions) * 100, 2) if total_questions > 0 else 0
        passing_score = quiz.get("passing_score") or 40
        passed = percentage >= passing_score
        
        # Mark completion dynamically in course progress
        content = row("SELECT id FROM portal_course_content WHERE quiz_id=%s", [quiz_id])
        if content and table_exists("portal_course_progress"):
            with connection.cursor() as cursor:
                cursor.execute(
                    """
                    INSERT INTO portal_course_progress (student_id, content_id, completed_at)
                    VALUES (%s,%s,now())
                    ON CONFLICT (student_id, content_id) DO UPDATE SET completed_at=now()
                    """,
                    [request.user.id, content["id"]]
                )
                
        return Response({
            "percentage": percentage,
            "score": correct_count,
            "total": total_questions,
            "passed": passed
        })


class ExamListView(StudentOnlyMixin, APIView):
    def get(self, request):
        cls = current_class_for_student(request.user.id)
        if not cls or not table_exists("portal_exam_schedule"):
            return Response([])
        data = rows(
            """
            SELECT e.id, e.exam_name, e.exam_type, e.exam_date, e.start_time, e.duration_minutes, e.max_marks,
                   s.name AS subject_name
            FROM portal_exam_schedule e JOIN portal_subject s ON s.id=e.subject_id
            WHERE e.class_id=%s ORDER BY e.exam_date DESC
            """, [cls["class_id"]]
        )
        return Response(serialise(data))


class HallTicketListView(StudentOnlyMixin, APIView):
    def get(self, request):
        if not table_exists("portal_hall_ticket"):
            return Response([])
        data = rows(
            """
            SELECT ht.id, ht.ticket_number, ht.is_verified,
                   json_build_object('id', e.id, 'exam_name', e.exam_name, 'exam_date', e.exam_date, 'subject_name', s.name) AS exam
            FROM portal_hall_ticket ht
            JOIN portal_exam_schedule e ON e.id=ht.exam_schedule_id
            JOIN portal_subject s ON s.id=e.subject_id
            WHERE ht.student_id=%s ORDER BY e.exam_date DESC
            """, [request.user.id]
        )
        return Response(serialise(data))


class ResultListView(StudentOnlyMixin, APIView):
    def get(self, request):
        if not table_exists("portal_result"):
            return Response([])
        data = rows(
            """
            SELECT r.id, r.marks_obtained, r.rank_position, r.grade_letter, r.remarks,
                   ROUND((r.marks_obtained / NULLIF(e.max_marks,0)) * 100, 1) AS percentage,
                   json_build_object('id', e.id, 'exam_name', e.exam_name, 'max_marks', e.max_marks, 'subject_name', s.name) AS exam
            FROM portal_result r
            JOIN portal_exam_schedule e ON e.id=r.exam_schedule_id
            JOIN portal_subject s ON s.id=e.subject_id
            WHERE r.student_id=%s ORDER BY e.exam_date DESC
            """, [request.user.id]
        )
        return Response(serialise(data))


class FeesView(StudentOnlyMixin, APIView):
    def get(self, request):
        cls = current_class_for_student(request.user.id)
        pending, history = [], []
        if cls and table_exists("portal_fee_structure"):
            pending = rows(
                """
                SELECT fs.id, fs.term_name, fs.tuition_fee, fs.transport_fee, fs.hostel_fee, fs.total_amount
                FROM portal_fee_structure fs
                WHERE fs.class_id=%s AND NOT EXISTS (
                  SELECT 1 FROM portal_payment p WHERE p.fee_structure_id=fs.id AND p.student_id=%s AND p.status='Success'
                ) ORDER BY fs.id
                """, [cls["class_id"], request.user.id]
            )
        if table_exists("portal_payment"):
            history = rows(
                """
                SELECT p.id, p.transaction_id, p.amount_paid, p.status, p.paid_at,
                       json_build_object('id', fs.id, 'term_name', fs.term_name, 'total_amount', fs.total_amount) AS fee_structure_detail
                FROM portal_payment p JOIN portal_fee_structure fs ON fs.id=p.fee_structure_id
                WHERE p.student_id=%s ORDER BY p.paid_at DESC
                """, [request.user.id]
            )
        return Response(serialise({"pending": pending, "payment_history": history}))


class InitiatePaymentView(StudentOnlyMixin, APIView):
    def post(self, request):
        if not table_exists("portal_payment"):
            return Response({"detail": "Portal schema has not been applied."}, status=400)
        fee_id = request.data.get("fee_structure_id")
        method = request.data.get("payment_method") or "Online"
        fee = row("SELECT total_amount FROM portal_fee_structure WHERE id=%s", [fee_id])
        if not fee:
            return Response({"detail": "Invalid fee."}, status=400)
        tx = f"EDN-{uuid4().hex[:10].upper()}"
        with connection.cursor() as cursor:
            cursor.execute(
                """
                INSERT INTO portal_payment (student_id, fee_structure_id, transaction_id, amount_paid, payment_method, status)
                VALUES (%s,%s,%s,%s,%s,'Success') RETURNING id
                """, [request.user.id, fee_id, tx, fee["total_amount"], method]
            )
            pid = cursor.fetchone()[0]
        return Response({"detail": "Payment recorded successfully.", "id": pid, "transaction_id": tx})


class LibraryView(StudentOnlyMixin, APIView):
    def get(self, request):
        if not table_exists("portal_library_transaction"):
            return Response([])
        data = rows(
            """
            SELECT t.id, t.issue_date, t.due_date, t.return_date, t.fine_amount,
                   json_build_object('id', b.id, 'title', b.title, 'author', b.author) AS book_detail
            FROM portal_library_transaction t JOIN portal_book b ON b.id=t.book_id
            WHERE t.borrower_id=%s ORDER BY t.issue_date DESC
            """, [request.user.id]
        )
        return Response(serialise(data))


class BookSearchView(StudentOnlyMixin, APIView):
    def get(self, request):
        q = request.query_params.get("q", "").strip()
        if not q or not table_exists("portal_book"):
            return Response([])
        return Response(serialise(rows(
            """
            SELECT id, title, author, available_quantity FROM portal_book
            WHERE title ILIKE %s OR author ILIKE %s ORDER BY title LIMIT 20
            """, [f"%{q}%", f"%{q}%"]
        )))


class CertificateListView(StudentOnlyMixin, APIView):
    def get(self, request):
        if not table_exists("portal_certificate"):
            return Response([])
        return Response(serialise(rows("SELECT id, certificate_type, issued_date, file_url FROM portal_certificate WHERE student_id=%s ORDER BY issued_date DESC", [request.user.id])))


class AnnouncementListView(StudentOnlyMixin, APIView):
    def get(self, request):
        cls = current_class_for_student(request.user.id)
        class_id = cls["class_id"] if cls else None
        if table_exists("portal_notification"):
            data = rows(
                """
                SELECT n.id, n.title, n.message, n.created_at,
                       COALESCE(u.first_name || ' ' || u.last_name, u.username, 'EduNova Admin') AS sender_name
                FROM portal_notification n LEFT JOIN auth_user u ON u.id=n.sender_id
                WHERE n.recipient_type IN ('All','Student') OR n.target_class_id=%s
                ORDER BY n.created_at DESC
                """, [class_id]
            )
            return Response(serialise(data))
        if table_exists("cms_newspost"):
            return Response(serialise(rows("SELECT id, title, content AS message, published_date AS created_at, 'EduNova Admin' AS sender_name FROM cms_newspost WHERE is_published=true ORDER BY published_date DESC")))
        return Response([])


class EventListView(StudentOnlyMixin, APIView):
    def get(self, request):
        if not table_exists("cms_event"):
            return Response([])
        return Response(serialise(rows("SELECT id, title, description, event_date, venue FROM cms_event ORDER BY event_date DESC")))


class StudentLeaveView(StudentOnlyMixin, APIView):
    """Student submits or views their own leave applications."""

    def get(self, request):
        if not table_exists("portal_leave"):
            return Response([])
        return Response(serialise(rows(
            "SELECT id, leave_type, start_date, end_date, reason, status FROM portal_leave WHERE user_id=%s ORDER BY start_date DESC",
            [request.user.id],
        )))

    def post(self, request):
        if not table_exists("portal_leave"):
            return Response({"detail": "Portal schema has not been applied."}, status=400)
        with connection.cursor() as cursor:
            cursor.execute(
                """
                INSERT INTO portal_leave (user_id, leave_type, start_date, end_date, reason, submitted_by)
                VALUES (%s,%s,%s,%s,%s,%s) RETURNING id
                """,
                [request.user.id, request.data.get("leave_type"), request.data.get("start_date"),
                 request.data.get("end_date"), request.data.get("reason"), request.user.id],
            )
            lid = cursor.fetchone()[0]
        return Response({"id": lid, "detail": "Leave request submitted."})


class FileUploadView(APIView):
    from rest_framework.parsers import MultiPartParser, FormParser
    parser_classes = (MultiPartParser, FormParser)

    def post(self, request):
        file_obj = request.FILES.get('file')
        if not file_obj:
            return Response({"detail": "No file uploaded."}, status=400)
            
        bucket_name = request.data.get('bucket', 'lms-resources')
        
        from django.conf import settings
        from supabase import create_client
        import uuid

        url = getattr(settings, "SUPABASE_URL", "")
        key = getattr(settings, "SUPABASE_SERVICE_ROLE_KEY", "")
        if not url or not key:
            from django.core.files.storage import default_storage
            filename = default_storage.save(f"uploads/{uuid.uuid4()}_{file_obj.name}", file_obj)
            file_url = request.build_absolute_uri(default_storage.url(filename))
            return Response({"url": file_url})

        try:
            client = create_client(url, key)
            file_extension = file_obj.name.split('.')[-1]
            unique_filename = f"{uuid.uuid4()}.{file_extension}"
            
            # Read file bytes
            file_bytes = file_obj.read()
            
            # Upload
            client.storage.from_(bucket_name).upload(
                path=unique_filename,
                file=file_bytes,
                file_options={"content-type": file_obj.content_type}
            )
            
            file_url = client.storage.from_(bucket_name).get_public_url(unique_filename)
            return Response({"url": file_url})
        except Exception as e:
            # Fallback to local storage if Supabase upload fails (e.g. connection error)
            print(f"Supabase upload failed, falling back to local storage. Error: {str(e)}")
            from django.core.files.storage import default_storage
            filename = default_storage.save(f"uploads/{uuid.uuid4()}_{file_obj.name}", file_obj)
            file_url = request.build_absolute_uri(default_storage.url(filename))
            return Response({"url": file_url})


class StudentAIChatView(StudentOnlyMixin, APIView):
    def post(self, request):
        message = request.data.get("message", "").strip()
        if not message:
            return Response({"reply": "Hello! How can I help you today?"})

        msg_lower = message.lower()
        user_id = request.user.id
        
        cls = current_class_for_student(user_id)
        class_id = cls["class_id"] if cls else None
        
        # 1. Homework / Assignment queries
        if any(w in msg_lower for w in ["homework", "hw", "assignment", "assignments", "task"]):
            if class_id:
                # Query due assignments
                assignments = rows(
                    """
                    SELECT a.title, a.due_date, a.max_marks, s.name AS subject_name 
                    FROM portal_assignment a
                    LEFT JOIN portal_subject s ON s.id=a.subject_id
                    WHERE a.class_id=%s AND a.id NOT IN (
                        SELECT assignment_id FROM portal_assignment_submission WHERE student_id=%s
                    ) AND a.due_date > now()
                    ORDER BY a.due_date LIMIT 3
                    """,
                    [class_id, user_id]
                )
                if assignments:
                    reply = "Here are your upcoming pending assignments:\n" + "\n".join(
                        f"• **{a['title']}** ({a['subject_name'] or 'General'}) — Due {a['due_date'].strftime('%b %d, %I:%M %p') if hasattr(a['due_date'], 'strftime') else a['due_date']}"
                        for a in assignments
                    )
                else:
                    reply = "🎉 Great news! You have no pending assignments due soon."
            else:
                reply = "I couldn't find any enrolled class for you, so I can't track assignments."
            return Response({"reply": reply})

        # 2. Timetable / Schedule queries
        elif any(w in msg_lower for w in ["timetable", "schedule", "classes", "today", "timetable"]):
            if class_id:
                timetable = rows(
                    """
                    SELECT t.day_of_week, t.start_time, t.end_time, s.name AS subject_name,
                           COALESCE(u.first_name || ' ' || u.last_name, u.username) AS teacher_name
                    FROM portal_timetable t
                    JOIN portal_subject s ON s.id=t.subject_id
                    JOIN auth_user u ON u.id=t.teacher_id
                    WHERE t.class_id=%s
                    ORDER BY t.day_of_week, t.start_time
                    """,
                    [class_id]
                )
                if timetable:
                    days = {}
                    for item in timetable:
                        day = item["day_of_week"]
                        if day not in days:
                            days[day] = []
                        days[day].append(f"{item['subject_name']} ({item['start_time']} - {item['end_time']}) by {item['teacher_name']}")
                    
                    reply = "Here is your class timetable:\n" + "\n".join(
                        f"🗓️ **{d}**:\n" + "\n".join(f"  • {session}" for session in sessions)
                        for d, sessions in days.items()
                    )
                else:
                    reply = "No timetable sessions are scheduled for your class yet."
            else:
                reply = "You are not currently enrolled in any class."
            return Response({"reply": reply})

        # 3. Grades / Quiz results
        elif any(w in msg_lower for w in ["grade", "marks", "result", "score", "grades", "quiz"]):
            grades = rows(
                """
                SELECT a.title, s.marks_obtained, a.max_marks, s.grade
                FROM portal_assignment_submission s
                JOIN portal_assignment a ON a.id = s.assignment_id
                WHERE s.student_id=%s AND s.marks_obtained IS NOT NULL
                ORDER BY s.submitted_at DESC LIMIT 5
                """,
                [user_id]
            )
            if grades:
                reply = "Here are your recent assignment grades:\n" + "\n".join(
                    f"• **{g['title']}**: {g['marks_obtained']}/{g['max_marks']} (Grade: **{g['grade'] or 'N/A'}**)"
                    for g in grades
                )
            else:
                reply = "I couldn't find any graded submissions for your profile yet. Keep studying!"
            return Response({"reply": reply})

        # Default help menu response
        name = request.user.first_name or request.user.username
        reply = (
            f"Hello {name}! I am your EduNova AI Assistant. 🎓\n\n"
            f"I can help you navigate your student portal and view your records. Try asking me:\n"
            f"• *'What assignments are due?'*\n"
            f"• *'Show my class timetable'* \n"
            f"• *'What are my recent grades?'*"
        )
        return Response({"reply": reply})


import math
from rest_framework.permissions import AllowAny

class PublicCampusView(APIView):
    permission_classes = [AllowAny]

    def get(self, request):
        with connection.cursor() as cursor:
            cursor.execute(
                """
                CREATE TABLE IF NOT EXISTS public.portal_campus_location (
                  id integer GENERATED BY DEFAULT AS IDENTITY PRIMARY KEY,
                  name varchar(100) NOT NULL UNIQUE,
                  address text NOT NULL,
                  city varchar(100) NOT NULL,
                  state varchar(100) NOT NULL,
                  country varchar(100) NOT NULL DEFAULT 'India',
                  postal_code varchar(20) NOT NULL,
                  latitude numeric(9, 6) NOT NULL,
                  longitude numeric(9, 6) NOT NULL,
                  phone varchar(30) NOT NULL,
                  email varchar(100) NOT NULL,
                  website varchar(200) NOT NULL,
                  office_hours varchar(200) NOT NULL,
                  facilities text[] NOT NULL DEFAULT '{}',
                  programs text[] NOT NULL DEFAULT '{}',
                  image_url text,
                  status varchar(20) NOT NULL DEFAULT 'Active' CHECK (status IN ('Active', 'Inactive')),
                  student_count integer NOT NULL DEFAULT 0,
                  faculty_count integer NOT NULL DEFAULT 0,
                  created_at timestamptz NOT NULL DEFAULT now(),
                  updated_at timestamptz NOT NULL DEFAULT now()
                );
                """
            )
            cursor.execute(
                """
                CREATE TABLE IF NOT EXISTS public.portal_campus_visit (
                  id integer GENERATED BY DEFAULT AS IDENTITY PRIMARY KEY,
                  campus_id integer REFERENCES public.portal_campus_location(id) ON DELETE CASCADE,
                  visitor_name varchar(150) NOT NULL,
                  visitor_email varchar(100) NOT NULL,
                  visitor_phone varchar(30) NOT NULL,
                  visit_date date NOT NULL,
                  visit_time varchar(20) NOT NULL,
                  purpose varchar(255),
                  status varchar(20) NOT NULL DEFAULT 'Pending' CHECK (status IN ('Pending', 'Confirmed', 'Completed', 'Cancelled')),
                  created_at timestamptz NOT NULL DEFAULT now(),
                  updated_at timestamptz NOT NULL DEFAULT now()
                );
                """
            )

        campus_list = rows("SELECT * FROM portal_campus_location WHERE status = 'Active' ORDER BY id ASC")
        if not campus_list:
            with connection.cursor() as cursor:
                cursor.execute(
                    """
                    INSERT INTO portal_campus_location 
                        (name, address, city, state, country, postal_code, latitude, longitude, phone, email, website, office_hours, facilities, programs, student_count, faculty_count, status)
                    VALUES 
                        ('Head Office (Dwarka)', 'EduNova Education Campus, Sector 21, Dwarka', 'New Delhi', 'Delhi', 'India', '110075', 28.5921, 77.0460, '+91-11-4567890', 'info@edunovaacademy.edu.in', 'www.edunovaacademy.edu.in', '9:00 AM - 5:00 PM', ARRAY['Administrative Offices', 'Conference Halls', 'Visitor Center'], ARRAY['Administration', 'Parent Support'], 0, 45, 'Active'),
                        ('Noida Campus', 'Plot No. 12, Sector 62', 'Noida', 'Uttar Pradesh', 'India', '201301', 28.5355, 77.3910, '+91-120-6543210', 'noida@edunovaacademy.edu.in', 'www.edunovaacademy.edu.in/noida', '8:00 AM - 4:00 PM', ARRAY['Science Labs', 'Smart Classrooms', 'Library', 'Sports Ground'], ARRAY['Pre Primary', 'Middle School', 'High School', 'CBSE'], 1200, 80, 'Active'),
                        ('Gurugram Campus', 'Sector 45, Near Huda City Centre', 'Gurugram', 'Haryana', 'India', '122003', 28.4595, 77.0266, '+91-124-7890123', 'gurugram@edunovaacademy.edu.in', 'www.edunovaacademy.edu.in/gurugram', '8:00 AM - 4:00 PM', ARRAY['STEM Lab', 'Computer Lab', 'Indoor Auditorium', 'Cafeteria'], ARRAY['Middle School', 'High School', 'Cambridge Curriculum'], 950, 65, 'Active'),
                        ('Faridabad Campus', 'Mathura Road, Sector 31', 'Faridabad', 'Haryana', 'India', '121003', 28.4089, 77.3178, '+91-129-4561230', 'faridabad@edunovaacademy.edu.in', 'www.edunovaacademy.edu.in/faridabad', '8:00 AM - 4:00 PM', ARRAY['Sports Complex', 'Medical Center', 'Library', 'Smart Classrooms'], ARRAY['Pre Primary', 'Middle School', 'High School', 'CBSE'], 800, 55, 'Active'),
                        ('Jaipur Campus', 'Mansarovar, Shipra Path', 'Jaipur', 'Rajasthan', 'India', '302020', 26.9124, 75.7873, '+91-141-8904561', 'jaipur@edunovaacademy.edu.in', 'www.edunovaacademy.edu.in/jaipur', '8:00 AM - 4:00 PM', ARRAY['Digital Library', 'Science Labs', 'Hostel Facilities', 'Innovation Hub'], ARRAY['Middle School', 'High School', 'Senior Secondary', 'Skill Development'], 650, 45, 'Active'),
                        ('Lucknow Campus', 'Gomti Nagar, Bypass Road', 'Lucknow', 'Uttar Pradesh', 'India', '226010', 26.8467, 80.9462, '+91-522-7890124', 'lucknow@edunovaacademy.edu.in', 'www.edunovaacademy.edu.in/lucknow', '8:00 AM - 4:00 PM', ARRAY['Science Labs', 'Hostel Facilities', 'Sports Ground', 'Cafeteria'], ARRAY['Pre Primary', 'Middle School', 'High School', 'Senior Secondary', 'CBSE'], 700, 50, 'Active')
                    """
                )
            campus_list = rows("SELECT * FROM portal_campus_location WHERE status = 'Active' ORDER BY id ASC")
        return Response(serialise(campus_list))


class PublicCampusVisitView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        with connection.cursor() as cursor:
            cursor.execute(
                """
                CREATE TABLE IF NOT EXISTS public.portal_campus_visit (
                  id integer GENERATED BY DEFAULT AS IDENTITY PRIMARY KEY,
                  campus_id integer REFERENCES public.portal_campus_location(id) ON DELETE CASCADE,
                  visitor_name varchar(150) NOT NULL,
                  visitor_email varchar(100) NOT NULL,
                  visitor_phone varchar(30) NOT NULL,
                  visit_date date NOT NULL,
                  visit_time varchar(20) NOT NULL,
                  purpose varchar(255),
                  status varchar(20) NOT NULL DEFAULT 'Pending' CHECK (status IN ('Pending', 'Confirmed', 'Completed', 'Cancelled')),
                  created_at timestamptz NOT NULL DEFAULT now(),
                  updated_at timestamptz NOT NULL DEFAULT now()
                );
                """
            )

        campus_id = request.data.get("campus_id")
        visitor_name = (request.data.get("visitor_name") or "").strip()
        visitor_email = (request.data.get("visitor_email") or "").strip()
        visitor_phone = (request.data.get("visitor_phone") or "").strip()
        visit_date = request.data.get("visit_date")
        visit_time = (request.data.get("visit_time") or "").strip()
        purpose = (request.data.get("purpose") or "").strip()

        if not (campus_id and visitor_name and visitor_email and visitor_phone and visit_date and visit_time):
            return Response({"detail": "All required fields must be provided."}, status=status.HTTP_400_BAD_REQUEST)

        with connection.cursor() as cursor:
            cursor.execute(
                """
                INSERT INTO portal_campus_visit 
                    (campus_id, visitor_name, visitor_email, visitor_phone, visit_date, visit_time, purpose, status)
                VALUES (%s, %s, %s, %s, %s, %s, %s, 'Pending')
                RETURNING id
                """,
                [campus_id, visitor_name, visitor_email, visitor_phone, visit_date, visit_time, purpose]
            )
            visit_id = cursor.fetchone()[0]

        # Audit log entry (since visitor is public/unauthenticated, log actor_id as NULL)
        from .roles import log_action
        log_action(
            actor=None,
            action="BOOK_CAMPUS_VISIT",
            target_type="portal_campus_visit",
            target_id=visit_id,
            details={
                "visitor_name": visitor_name,
                "campus_id": campus_id,
                "visit_date": str(visit_date)
            }
        )

        return Response({"id": visit_id, "detail": "Campus visit booked successfully. Admissions will contact you shortly."}, status=status.HTTP_201_CREATED)


class NearestCampusView(APIView):
    permission_classes = [AllowAny]

    def get(self, request):
        if not table_exists("portal_campus_location"):
            return Response({"detail": "Campus service unavailable."}, status=status.HTTP_503_SERVICE_UNAVAILABLE)

        try:
            visitor_lat = float(request.query_params.get("lat"))
            visitor_lng = float(request.query_params.get("lng"))
        except (TypeError, ValueError):
            return Response({"detail": "Valid lat and lng query coordinates required."}, status=status.HTTP_400_BAD_REQUEST)

        campuses = rows(
            """
            SELECT id, name, address, city, state, latitude, longitude, phone, email, status
            FROM portal_campus_location
            WHERE status = 'Active'
            """
        )

        if not campuses:
            return Response({"detail": "No active campuses found."}, status=status.HTTP_404_NOT_FOUND)

        def haversine(lat1, lon1, lat2, lon2):
            R = 6371.0  # kilometers
            dlat = math.radians(lat2 - lat1)
            dlon = math.radians(lon2 - lon1)
            a = math.sin(dlat / 2)**2 + math.cos(math.radians(lat1)) * math.cos(math.radians(lat2)) * math.sin(dlon / 2)**2
            c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))
            return R * c

        nearest = None
        min_dist = float("inf")

        for c in campuses:
            dist = haversine(visitor_lat, visitor_lng, float(c["latitude"]), float(c["longitude"]))
            if dist < min_dist:
                min_dist = dist
                nearest = c

        # Estimated travel time at ~30 km/h avg city speed
        est_travel_time_mins = math.ceil((min_dist / 30.0) * 60.0)

        return Response({
            "nearest_campus": nearest["name"],
            "campus_id": nearest["id"],
            "distance_km": round(min_dist, 1),
            "estimated_travel_time_mins": est_travel_time_mins,
            "address": nearest["address"],
            "city": nearest["city"],
            "state": nearest["state"],
            "phone": nearest["phone"],
            "email": nearest["email"]
        })


class PublicScholarshipsView(APIView):
    def get(self, request):
        with connection.cursor() as cursor:
            cursor.execute(
                """
                CREATE TABLE IF NOT EXISTS public.portal_scholarship (
                    id SERIAL PRIMARY KEY,
                    name varchar(200) NOT NULL,
                    description text NOT NULL,
                    eligibility text NOT NULL,
                    coverage_percent integer NOT NULL
                )
                """
            )
        data = rows("SELECT * FROM portal_scholarship ORDER BY id")
        if not data:
            with connection.cursor() as cursor:
                cursor.execute(
                    """
                    INSERT INTO portal_scholarship (name, description, eligibility, coverage_percent) VALUES
                    ('Academic Excellence Merit Scholarship', 'Awarded to top 5% academic performers of each grade to incentivize higher learning standards.', 'GPA 9.2 or above / overall percentage above 90% in the last academic year.', 50),
                    ('EduNova Financial Assistance Grant', 'Need-based scholarship program aimed at supporting students from economically weaker sections.', 'Family annual income below specified threshold, verified by financial documentation.', 100),
                    ('Sports & Athletics Champion Scholarship', 'Encouraging young sportspersons representing the school or state in athletic events.', 'State or National level representation in sports in the past 2 years.', 40)
                    """
                )
            data = rows("SELECT * FROM portal_scholarship ORDER BY id")
        return Response(serialise(data))

    def post(self, request):
        if not request.user or not request.user.is_authenticated or not request.user.is_staff:
            return Response({"detail": "Admin permission required."}, status=403)
        name = request.data.get("name")
        description = request.data.get("description")
        eligibility = request.data.get("eligibility")
        coverage_percent = request.data.get("coverage_percent")
        
        if not name or not description or not eligibility or not coverage_percent:
            return Response({"detail": "All fields are required."}, status=400)
            
        with connection.cursor() as cursor:
            cursor.execute(
                "INSERT INTO portal_scholarship (name, description, eligibility, coverage_percent) VALUES (%s,%s,%s,%s) RETURNING id",
                [name, description, eligibility, int(coverage_percent)]
            )
            nid = cursor.fetchone()[0]
        return Response({"id": nid, "detail": "Scholarship created successfully."})

    def delete(self, request):
        if not request.user or not request.user.is_authenticated or not request.user.is_staff:
            return Response({"detail": "Admin permission required."}, status=403)
        sid = request.query_params.get("id")
        if not sid:
            return Response({"detail": "Scholarship ID is required."}, status=400)
        with connection.cursor() as cursor:
            cursor.execute("DELETE FROM portal_scholarship WHERE id=%s", [sid])
        return Response({"detail": "Scholarship deleted."})

