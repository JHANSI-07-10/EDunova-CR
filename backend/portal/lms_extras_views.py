"""LMS extras that were listed in the client requirements but not yet built:
Discussion Forums, Digital Notes, Learning Analytics. Course/Quiz/Assignment
core was already implemented (portal_course, portal_quiz, portal_assignment in
portal_extension_auth_user.sql) — these three round it out, using the new
portal_forum_topic / portal_forum_post / portal_digital_note /
portal_course_progress tables (portal_extension_facilities.sql).

Every view here checks _can_access_course() before touching a course's data:
a Student must be enrolled in that course's class, a Teacher must be
allocated to teach that class+subject, Admin always passes. An earlier
version of this file let any authenticated user of any role read/post in any
course's forum — meaning a student in one grade could see another grade's
discussion threads with no barrier at all. That's fixed everywhere below.
"""
from django.db import connection
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from .roles import get_role, log_action
from .views import row, rows, serialise, table_exists


class AuthenticatedMixin:
    permission_classes = [IsAuthenticated]


def _can_access_course(user, course_id):
    """A student may access a course's forum/notes only if they're currently
    enrolled in that course's class; a teacher only if they're allocated to
    teach that class+subject; Admin always can."""
    role = get_role(user)
    if role == "Admin":
        return True
    course = row("SELECT class_id, subject_id FROM portal_course WHERE id=%s", [course_id])
    if not course:
        return False
    if role == "Student" and table_exists("portal_student_enrollment"):
        return bool(row(
            "SELECT 1 AS ok FROM portal_student_enrollment WHERE student_id=%s AND class_id=%s",
            [user.id, course["class_id"]],
        ))
    if role == "Teacher" and table_exists("portal_academic_allocation"):
        return bool(row(
            "SELECT 1 AS ok FROM portal_academic_allocation WHERE teacher_id=%s AND class_id=%s AND subject_id=%s",
            [user.id, course["class_id"], course["subject_id"]],
        ))
    return False


def _course_id_for_topic(topic_id):
    t = row("SELECT course_id FROM portal_forum_topic WHERE id=%s", [topic_id])
    return t["course_id"] if t else None


_FORBIDDEN = Response({"detail": "You don't have access to this course."}, status=403)


# =============================================================================
# DISCUSSION FORUMS
# =============================================================================
class ForumTopicListView(AuthenticatedMixin, APIView):
    """GET ?course_id= — topics for a course. POST — create a topic."""

    def get(self, request):
        course_id = request.query_params.get("course_id")
        if not course_id or not table_exists("portal_forum_topic"):
            return Response([])
        if not _can_access_course(request.user, course_id):
            return _FORBIDDEN
        return Response(serialise(rows(
            """
            SELECT t.id, t.title, t.content, t.created_at,
                   COALESCE(u.first_name || ' ' || u.last_name, u.username) AS creator_name,
                   (SELECT COUNT(*) FROM portal_forum_post p WHERE p.topic_id = t.id) AS reply_count
            FROM portal_forum_topic t JOIN auth_user u ON u.id = t.creator_id
            WHERE t.course_id = %s ORDER BY t.updated_at DESC
            """,
            [course_id],
        )))

    def post(self, request):
        if not table_exists("portal_forum_topic"):
            return Response({"detail": "Portal schema has not been applied."}, status=400)
        d = request.data
        course_id = d.get("course_id")
        if not _can_access_course(request.user, course_id):
            return _FORBIDDEN
        with connection.cursor() as cursor:
            cursor.execute(
                "INSERT INTO portal_forum_topic (course_id, creator_id, title, content) VALUES (%s,%s,%s,%s) RETURNING id",
                [course_id, request.user.id, d.get("title"), d.get("content")],
            )
            new_id = cursor.fetchone()[0]
        log_action(request.user, "forum.topic.create", "portal_forum_topic", new_id, {"course_id": course_id})
        return Response({"id": new_id, "detail": "Topic posted."})


class ForumTopicDetailView(AuthenticatedMixin, APIView):
    """GET a topic with all its replies."""

    def get(self, request, topic_id):
        if not table_exists("portal_forum_topic"):
            return Response(None)
        course_id = _course_id_for_topic(topic_id)
        if course_id is None:
            return Response({"detail": "Topic not found."}, status=404)
        if not _can_access_course(request.user, course_id):
            return _FORBIDDEN
        topic = row(
            """
            SELECT t.id, t.title, t.content, t.created_at,
                   COALESCE(u.first_name || ' ' || u.last_name, u.username) AS creator_name
            FROM portal_forum_topic t JOIN auth_user u ON u.id = t.creator_id WHERE t.id=%s
            """,
            [topic_id],
        )
        if not topic:
            return Response({"detail": "Topic not found."}, status=404)
        topic["posts"] = rows(
            """
            SELECT p.id, p.post_text, p.created_at,
                   COALESCE(u.first_name || ' ' || u.last_name, u.username) AS author_name
            FROM portal_forum_post p JOIN auth_user u ON u.id = p.author_id
            WHERE p.topic_id=%s ORDER BY p.created_at
            """,
            [topic_id],
        )
        return Response(serialise(topic))


class ForumPostView(AuthenticatedMixin, APIView):
    """POST a reply to a topic."""

    def post(self, request, topic_id):
        if not table_exists("portal_forum_post"):
            return Response({"detail": "Portal schema has not been applied."}, status=400)
        course_id = _course_id_for_topic(topic_id)
        if course_id is None:
            return Response({"detail": "Topic not found."}, status=404)
        if not _can_access_course(request.user, course_id):
            return _FORBIDDEN
        text = request.data.get("post_text", "").strip()
        if not text:
            return Response({"detail": "Reply text is required."}, status=400)
        with connection.cursor() as cursor:
            cursor.execute(
                "INSERT INTO portal_forum_post (topic_id, author_id, post_text) VALUES (%s,%s,%s) RETURNING id",
                [topic_id, request.user.id, text],
            )
            new_id = cursor.fetchone()[0]
            cursor.execute("UPDATE portal_forum_topic SET updated_at = now() WHERE id=%s", [topic_id])
        return Response({"id": new_id, "detail": "Reply posted."})


# =============================================================================
# DIGITAL NOTES
# =============================================================================
class DigitalNoteView(AuthenticatedMixin, APIView):
    """GET ?course_id= — notes for a course. POST — add a note (any
    authenticated user, e.g. a teacher sharing notes or a student's own)."""

    def get(self, request):
        course_id = request.query_params.get("course_id")
        if not course_id or not table_exists("portal_digital_note"):
            return Response([])
        if not _can_access_course(request.user, course_id):
            return _FORBIDDEN
        return Response(serialise(rows(
            """
            SELECT n.id, n.title, n.body_markdown, n.created_at,
                   COALESCE(u.first_name || ' ' || u.last_name, u.username) AS author_name
            FROM portal_digital_note n JOIN auth_user u ON u.id = n.author_id
            WHERE n.course_id = %s ORDER BY n.created_at DESC
            """,
            [course_id],
        )))

    def post(self, request):
        if not table_exists("portal_digital_note"):
            return Response({"detail": "Portal schema has not been applied."}, status=400)
        d = request.data
        course_id = d.get("course_id")
        if not _can_access_course(request.user, course_id):
            return _FORBIDDEN
        with connection.cursor() as cursor:
            cursor.execute(
                "INSERT INTO portal_digital_note (course_id, author_id, title, body_markdown) VALUES (%s,%s,%s,%s) RETURNING id",
                [course_id, request.user.id, d.get("title"), d.get("body_markdown")],
            )
            new_id = cursor.fetchone()[0]
        return Response({"id": new_id, "detail": "Note saved."})


# =============================================================================
# LEARNING ANALYTICS
# =============================================================================
class MarkContentCompleteView(AuthenticatedMixin, APIView):
    """POST {content_id} — a student marks one piece of course content (a
    video, PDF, etc.) as done. This is what feeds the analytics below."""

    def post(self, request):
        content_id = request.data.get("content_id")
        if not content_id or not table_exists("portal_course_progress"):
            return Response({"detail": "Portal schema has not been applied."}, status=400)
        content = row("SELECT course_id FROM portal_course_content WHERE id=%s", [content_id])
        if not content:
            return Response({"detail": "Content not found."}, status=404)
        if not _can_access_course(request.user, content["course_id"]):
            return _FORBIDDEN
        with connection.cursor() as cursor:
            cursor.execute(
                "INSERT INTO portal_course_progress (student_id, content_id) VALUES (%s,%s) "
                "ON CONFLICT (student_id, content_id) DO NOTHING",
                [request.user.id, content_id],
            )
        return Response({"detail": "Marked as complete."})


class CourseAnalyticsView(AuthenticatedMixin, APIView):
    """GET ?course_id= — completion % per student for a course. Deliberately
    Admin/Teacher only: this shows every enrolled student's individual
    progress, which a classmate has no business seeing about another
    classmate — unlike the forum/notes views, there's no "your own record"
    case here to allow a Student role through."""

    def get(self, request):
        course_id = request.query_params.get("course_id")
        student_id = request.query_params.get("student_id")
        if not course_id or not table_exists("portal_course_content"):
            return Response([])
        role = get_role(request.user)
        if role not in ("Admin", "Teacher"):
            return _FORBIDDEN
        if role == "Teacher" and not _can_access_course(request.user, course_id):
            return _FORBIDDEN
        total_content = row("SELECT COUNT(*)::int AS c FROM portal_course_content WHERE course_id=%s", [course_id])
        total = total_content["c"] if total_content else 0
        if total == 0:
            return Response([])

        sql = """
            SELECT u.id AS student_id, COALESCE(u.first_name || ' ' || u.last_name, u.username) AS student_name,
                   COUNT(cp.id)::int AS completed_count
            FROM auth_user u
            LEFT JOIN portal_course_progress cp ON cp.student_id = u.id
                AND cp.content_id IN (SELECT id FROM portal_course_content WHERE course_id=%s)
            WHERE u.id IN (SELECT DISTINCT student_id FROM portal_course_progress)
        """
        params = [course_id]
        if student_id:
            sql += " AND u.id = %s"
            params.append(student_id)
        sql += " GROUP BY u.id, u.first_name, u.last_name, u.username ORDER BY student_name"

        data = rows(sql, params)
        for d in data:
            d["total_content"] = total
            d["completion_percent"] = round((d["completed_count"] / total) * 100, 1)
        return Response(serialise(data))


# =============================================================================
# AI TUTOR WORKFLOWS
# =============================================================================
class StudentAITutorView(AuthenticatedMixin, APIView):
    """POST {course_id, message} — student queries AI Tutor for a subject."""

    def get(self, request):
        if not table_exists("portal_ai_usage"):
            return Response([])
        course_id = request.query_params.get("course_id")
        if not course_id:
            return Response({"detail": "course_id parameter is required."}, status=400)
        if not _can_access_course(request.user, course_id):
            return _FORBIDDEN
        
        logs = rows(
            """
            SELECT id, question, answer_explanation, answer_examples, answer_questions, answer_video, created_at
            FROM portal_ai_usage
            WHERE student_id = %s AND course_id = %s
            ORDER BY created_at ASC
            """,
            [request.user.id, course_id]
        )
        return Response(serialise(logs))

    def post(self, request):
        d = request.data
        course_id = d.get("course_id")
        message = d.get("message", "").strip()
        if not course_id or not message:
            return Response({"detail": "course_id and message are required."}, status=400)
        if not _can_access_course(request.user, course_id):
            return _FORBIDDEN
            
        msg_lower = message.lower()
        
        if any(w in msg_lower for w in ["equation", "math", "algebra", "calculus", "trigonometry", "geometry"]):
            explanation = (
                "Quadratic and algebraic equations describe relationships between variables. "
                "For quadratic equations (ax² + bx + c = 0), the solutions are given by the quadratic formula: "
                "x = (-b ± √(b² - 4ac)) / 2a."
            )
            examples = (
                "Solve: x² - 5x + 6 = 0\n"
                "1. Identify coefficients: a = 1, b = -5, c = 6.\n"
                "2. Apply formula or factorize: (x - 2)(x - 3) = 0.\n"
                "3. Roots are x = 2 and x = 3."
            )
            practice_questions = (
                "1. Find the roots of the equation: x² - 7x + 12 = 0.\n"
                "2. Find the discriminant of 3x² + 2x + 1 = 0."
            )
            video = "https://www.youtube.com/watch?v=XUt8LnbJvXQ"
        elif any(w in msg_lower for w in ["force", "physics", "gravity", "motion", "velocity", "acceleration"]):
            explanation = (
                "Newton's laws of motion form the basis of classical mechanics. "
                "The second law states that the force acting on an object is equal to its mass times acceleration (F = ma)."
            )
            examples = (
                "Calculate force required to accelerate a 5 kg object at 3 m/s².\n"
                "F = m * a\n"
                "F = 5 kg * 3 m/s² = 15 Newtons."
            )
            practice_questions = (
                "1. What is the force on a 10 kg object under gravity (a = 9.8 m/s²)?\n"
                "2. State Newton's first law of motion in your own words."
            )
            video = "https://www.youtube.com/watch?v=keyMstO13F4"
        elif any(w in msg_lower for w in ["code", "program", "html", "javascript", "python", "css", "web"]):
            explanation = (
                "HTML (HyperText Markup Language) structures web content, while CSS handles the styling. "
                "JavaScript adds interactivity. Python is a highly popular, clean general-purpose language."
            )
            examples = (
                "HTML structure example:\n"
                "```html\n"
                "<div>\n"
                "  <h1>EduNova AI Tutor</h1>\n"
                "  <p>Learn programming step by step.</p>\n"
                "</div>\n"
                "```"
            )
            practice_questions = (
                "1. What is the difference between `==` and `===` in JavaScript?\n"
                "2. Write a Python function that takes a number and returns its square."
            )
            video = "https://www.youtube.com/watch?v=pQN-pnXPaVg"
        else:
            explanation = (
                f"Here is an educational explanation for your query on '{message}'. "
                "We recommend reviewing the chapter lecture notes and syllabus resources for further study."
            )
            examples = (
                "Consider the primary textbook examples and check the practice exercises under this lesson's PDFs."
            )
            practice_questions = (
                "1. Discuss the key points of this topic with your course instructor.\n"
                "2. Write a brief summary of how this concept applies in practical scenarios."
            )
            video = "https://www.youtube.com/watch?v=dQw4w9WgXcQ"

        with connection.cursor() as cursor:
            cursor.execute(
                """
                CREATE TABLE IF NOT EXISTS public.portal_ai_usage (
                  id integer GENERATED BY DEFAULT AS IDENTITY PRIMARY KEY,
                  student_id integer NOT NULL REFERENCES public.auth_user(id) ON DELETE CASCADE,
                  course_id integer REFERENCES public.portal_course(id) ON DELETE CASCADE,
                  question text NOT NULL,
                  answer_explanation text NOT NULL,
                  answer_examples text NOT NULL,
                  answer_questions text NOT NULL,
                  answer_video text NOT NULL,
                  created_at timestamptz NOT NULL DEFAULT now()
                )
                """
            )
            cursor.execute(
                """
                INSERT INTO portal_ai_usage (student_id, course_id, question, answer_explanation, answer_examples, answer_questions, answer_video)
                VALUES (%s, %s, %s, %s, %s, %s, %s)
                """,
                [request.user.id, course_id, message, explanation, examples, practice_questions, video]
            )

        return Response({
            "explanation": explanation,
            "examples": examples,
            "practice_questions": practice_questions,
            "video": video
        })


class TeacherAIUsageView(AuthenticatedMixin, APIView):
    """GET ?course_id= — returns student AI Tutor queries list for a course."""

    def get(self, request):
        if not table_exists("portal_ai_usage"):
            return Response([])
        course_id = request.query_params.get("course_id")
        if not course_id:
            return Response({"detail": "course_id parameter is required."}, status=400)
        if not _can_access_course(request.user, course_id):
            return _FORBIDDEN
        
        logs = rows(
            """
            SELECT u.id, u.question, u.answer_explanation, u.answer_examples, u.answer_questions, u.answer_video, u.created_at,
                   COALESCE(st.first_name || ' ' || st.last_name, st.username) AS student_name
            FROM portal_ai_usage u
            JOIN auth_user st ON st.id = u.student_id
            WHERE u.course_id = %s
            ORDER BY u.created_at DESC
            """,
            [course_id]
        )
        return Response(serialise(logs))


class AdminAIUsageView(AuthenticatedMixin, APIView):
    """GET — returns school-wide student AI Tutor queries logs."""

    def get(self, request):
        role = get_role(request.user)
        if role != "Admin":
            return _FORBIDDEN
        if not table_exists("portal_ai_usage"):
            return Response([])
        
        logs = rows(
            """
            SELECT u.id, u.question, u.answer_explanation, u.answer_examples, u.answer_questions, u.answer_video, u.created_at,
                   c.title AS course_title, s.name AS subject_name,
                   COALESCE(st.first_name || ' ' || st.last_name, st.username) AS student_name
            FROM portal_ai_usage u
            JOIN portal_course c ON c.id = u.course_id
            JOIN portal_subject s ON s.id = c.subject_id
            JOIN auth_user st ON st.id = u.student_id
            ORDER BY u.created_at DESC
            """
        )
        return Response(serialise(logs))

