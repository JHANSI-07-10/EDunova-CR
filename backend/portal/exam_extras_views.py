"""Exam module extras that were listed in the client requirements but not yet
built: Rank List generation and Report Cards. Both are pure aggregation on
top of tables that already exist and are already populated by
teacher_views.MarksEntryView (portal_result, portal_exam_schedule) — no new
tables needed.

Kept in its own file for the same reason as facilities_views.py: easy to
find, doesn't bloat admin_views.py/views.py further.
"""
from django.db import connection
from rest_framework.response import Response
from rest_framework.views import APIView

from .admin_views import AdminMixin
from .roles import log_action
from .views import StudentOnlyMixin, current_class_for_student, row, rows, serialise, table_exists


def _grade_for_percent(pct):
    return "A" if pct >= 90 else "B" if pct >= 75 else "C" if pct >= 60 else "D" if pct >= 40 else "F"


# =============================================================================
# RANK LISTS
# =============================================================================
class RankListView(AdminMixin, APIView):
    """GET ?exam_schedule_id= for a single subject's rank list (also used to
    populate portal_result.rank_position). POST recomputes and persists the
    per-subject ranks for that exam_schedule."""

    def get(self, request):
        exam_id = request.query_params.get("exam_schedule_id")
        if not exam_id or not table_exists("portal_result"):
            return Response([])
        return Response(serialise(rows(
            """
            SELECT r.id, r.student_id, r.marks_obtained, r.grade_letter, r.rank_position,
                   COALESCE(u.first_name || ' ' || u.last_name, u.username) AS student_name,
                   se.roll_number
            FROM portal_result r
            JOIN auth_user u ON u.id = r.student_id
            LEFT JOIN portal_exam_schedule e ON e.id = r.exam_schedule_id
            LEFT JOIN portal_student_enrollment se ON se.student_id = r.student_id AND se.class_id = e.class_id
            WHERE r.exam_schedule_id = %s
            ORDER BY r.rank_position NULLS LAST, r.marks_obtained DESC
            """,
            [exam_id],
        )))

    def post(self, request):
        """Body: {exam_schedule_id}. Ranks all results for that exam by marks
        (ties share the same rank, standard competition ranking: 1,2,2,4)."""
        exam_id = request.data.get("exam_schedule_id")
        if not exam_id or not table_exists("portal_result"):
            return Response({"detail": "Portal schema has not been applied."}, status=400)
        if not table_exists("portal_exam_schedule") or not row("SELECT 1 AS ok FROM portal_exam_schedule WHERE id=%s", [exam_id]):
            return Response({"detail": f"No exam schedule found with id {exam_id} — check the ID and try again."}, status=404)
        existing_results = row("SELECT COUNT(*)::int AS c FROM portal_result WHERE exam_schedule_id=%s", [exam_id])
        if not existing_results or existing_results["c"] == 0:
            return Response({"detail": "That exam exists, but no marks have been entered for it yet — nothing to rank."}, status=400)
        with connection.cursor() as cursor:
            cursor.execute(
                """
                WITH ranked AS (
                    SELECT id, RANK() OVER (ORDER BY marks_obtained DESC) AS rnk
                    FROM portal_result WHERE exam_schedule_id = %s
                )
                UPDATE portal_result r SET rank_position = ranked.rnk
                FROM ranked WHERE ranked.id = r.id
                """,
                [exam_id],
            )
            updated = cursor.rowcount
        log_action(request.user, "exams.rank_list.generate", "portal_exam_schedule", exam_id, {"students_ranked": updated})
        return Response({"detail": f"Rank list generated for {updated} student(s)."})


class OverallRankListView(AdminMixin, APIView):
    """Aggregate rank across every subject for one class + exam cycle name
    (e.g. all "Mid-Term" exam_schedules for class 8-A), which is what a
    school usually means by "the class rank list" rather than a single
    subject's rank."""

    def get(self, request):
        class_id = request.query_params.get("class_id")
        exam_name = request.query_params.get("exam_name")
        if not class_id or not exam_name or not table_exists("portal_result"):
            return Response([])
        return Response(serialise(rows(
            """
            SELECT r.student_id,
                   COALESCE(u.first_name || ' ' || u.last_name, u.username) AS student_name,
                   se.roll_number,
                   SUM(r.marks_obtained) AS total_marks,
                   SUM(e.max_marks) AS max_total,
                   RANK() OVER (ORDER BY SUM(r.marks_obtained) DESC) AS overall_rank
            FROM portal_result r
            JOIN portal_exam_schedule e ON e.id = r.exam_schedule_id
            JOIN auth_user u ON u.id = r.student_id
            LEFT JOIN portal_student_enrollment se ON se.student_id = r.student_id AND se.class_id = e.class_id
            WHERE e.class_id = %s AND e.exam_name = %s AND e.status = 'Published'
            GROUP BY r.student_id, u.first_name, u.last_name, u.username, se.roll_number
            ORDER BY overall_rank
            """,
            [class_id, exam_name],
        )))


# =============================================================================
# REPORT CARDS
# =============================================================================
def _report_card_data(student_id, exam_name):
    if not table_exists("portal_result"):
        return None
    subjects = rows(
        """
        SELECT s.name AS subject_name, e.max_marks, r.marks_obtained, r.grade_letter, r.rank_position
        FROM portal_result r
        JOIN portal_exam_schedule e ON e.id = r.exam_schedule_id
        JOIN portal_subject s ON s.id = e.subject_id
        WHERE r.student_id = %s AND e.exam_name = %s AND e.status = 'Published'
        ORDER BY s.name
        """,
        [student_id, exam_name],
    )
    if not subjects:
        return {"subjects": [], "total_marks": 0, "max_total": 0, "percentage": 0, "overall_grade": None}
    total = sum(float(s["marks_obtained"]) for s in subjects)
    max_total = sum(float(s["max_marks"]) for s in subjects)
    pct = round((total / max_total) * 100, 2) if max_total else 0
    student = row("SELECT first_name, last_name, username FROM auth_user WHERE id=%s", [student_id])
    name = f"{student['first_name']} {student['last_name']}".strip() or student["username"] if student else None

    # Completeness check: compare how many subjects this student has a result
    # for against how many subjects are actually taught in their class. A
    # free-text exam_name typo elsewhere, or a teacher who simply hasn't
    # entered marks yet, would otherwise produce a confident-looking report
    # card that's silently missing subjects.
    is_complete = True
    expected_subject_count = None
    cls = current_class_for_student(student_id)
    if cls and table_exists("portal_academic_allocation"):
        expected = row("SELECT COUNT(DISTINCT subject_id)::int AS c FROM portal_academic_allocation WHERE class_id=%s", [cls["class_id"]])
        expected_subject_count = expected["c"] if expected else None
        if expected_subject_count and len(subjects) < expected_subject_count:
            is_complete = False

    return {
        "student_name": name,
        "exam_name": exam_name,
        "subjects": subjects,
        "total_marks": total,
        "max_total": max_total,
        "percentage": pct,
        "overall_grade": _grade_for_percent(pct),
        "is_complete": is_complete,
        "expected_subject_count": expected_subject_count,
    }


class ReportCardView(AdminMixin, APIView):
    """Admin-facing: ?student_id=&exam_name= — generate any student's report card."""

    def get(self, request):
        student_id = request.query_params.get("student_id")
        exam_name = request.query_params.get("exam_name")
        if not student_id or not exam_name:
            return Response({"detail": "student_id and exam_name are required."}, status=400)
        data = _report_card_data(student_id, exam_name)
        return Response(serialise(data))


class StudentReportCardView(StudentOnlyMixin, APIView):
    """Student-facing: ?exam_name= — a student's own report card only."""

    def get(self, request):
        exam_name = request.query_params.get("exam_name")
        if not exam_name:
            return Response({"detail": "exam_name is required."}, status=400)
        data = _report_card_data(request.user.id, exam_name)
        return Response(serialise(data))


class AdminExamActionView(AdminMixin, APIView):
    """GET to list all exams with status.
    POST /admin-portal/exams/<int:exam_id>/action/
    Body: {action: 'Publish' | 'Return'}"""
    def get(self, request):
        if not table_exists("portal_exam_schedule"):
            return Response([])
        data = rows(
            """
            SELECT e.id, e.exam_name, e.exam_type, e.exam_date, e.max_marks, e.status,
                   c.name || '-' || c.section AS class_name, s.name AS subject_name,
                   COALESCE(u.first_name || ' ' || u.last_name, u.username) AS teacher_name
            FROM portal_exam_schedule e
            JOIN portal_class c ON c.id = e.class_id
            JOIN portal_subject s ON s.id = e.subject_id
            LEFT JOIN auth_user u ON u.id = e.teacher_id
            ORDER BY e.exam_date DESC
            """
        )
        return Response(serialise(data))

    def post(self, request, exam_id):
        if not table_exists("portal_exam_schedule"):
            return Response({"detail": "Exam schedule table not found."}, status=400)
        action = request.data.get("action")
        if action not in ("Publish", "Return"):
            return Response({"detail": "Invalid action. Must be 'Publish' or 'Return'."}, status=400)
        
        new_status = "Published" if action == "Publish" else "Returned"
        with connection.cursor() as cursor:
            cursor.execute("UPDATE portal_exam_schedule SET status=%s WHERE id=%s", [new_status, exam_id])
            
        log_action(request.user, f"exams.status.{action.lower()}", "portal_exam_schedule", exam_id, {"status": new_status})
        return Response({"detail": f"Exam status updated to {new_status}."})


# =============================================================================
# REVALUATION WORKFLOW
# =============================================================================
class RevaluationRequestView(APIView):
    def get(self, request):
        role = request.user.groups.first().name if request.user.groups.exists() else "Student"
        if role == "Student":
            sql = """
                SELECT rr.*, s.name AS subject_name, es.exam_name, r.marks_obtained AS original_marks
                FROM portal_revaluation_request rr
                JOIN portal_result r ON r.id = rr.result_id
                JOIN portal_exam_schedule es ON es.id = r.exam_schedule_id
                JOIN portal_subject s ON s.id = es.subject_id
                WHERE rr.student_id = %s
                ORDER BY rr.requested_at DESC
            """
            return Response(serialise(rows(sql, [request.user.id])))
        elif role == "Parent":
            child_id = request.query_params.get("child_id")
            sql = """
                SELECT rr.*, s.name AS subject_name, es.exam_name, r.marks_obtained AS original_marks
                FROM portal_revaluation_request rr
                JOIN portal_result r ON r.id = rr.result_id
                JOIN portal_exam_schedule es ON es.id = r.exam_schedule_id
                JOIN portal_subject s ON s.id = es.subject_id
                WHERE rr.student_id = %s
                ORDER BY rr.requested_at DESC
            """
            return Response(serialise(rows(sql, [child_id])))
        else: # Teacher / Admin
            sql = """
                SELECT rr.*, s.name AS subject_name, es.exam_name, r.marks_obtained AS original_marks,
                       COALESCE(u.first_name || ' ' || u.last_name, u.username) AS student_name
                FROM portal_revaluation_request rr
                JOIN auth_user u ON u.id = rr.student_id
                JOIN portal_result r ON r.id = rr.result_id
                JOIN portal_exam_schedule es ON es.id = r.exam_schedule_id
                JOIN portal_subject s ON s.id = es.subject_id
                ORDER BY rr.requested_at DESC
            """
            return Response(serialise(rows(sql)))

    def post(self, request):
        if not table_exists("portal_revaluation_request"):
            return Response({"detail": "Portal schema not applied."}, status=400)
        d = request.data
        result_id = d.get("result_id")
        reason = (d.get("reason") or "").strip()
        if not result_id or not reason:
            return Response({"detail": "result_id and reason are required."}, status=400)
        
        # Check if already requested
        existing = row("SELECT id FROM portal_revaluation_request WHERE result_id = %s", [result_id])
        if existing:
            return Response({"detail": "A revaluation request already exists for this result."}, status=400)
            
        with connection.cursor() as cur:
            cur.execute(
                "INSERT INTO portal_revaluation_request (result_id, student_id, reason, status) "
                "VALUES (%s,%s,%s,'Pending') RETURNING id",
                [result_id, request.user.id, reason]
            )
            new_id = cur.fetchone()[0]
        log_action(request.user, "exams.revaluation.create", "portal_revaluation_request", new_id, {"result_id": result_id})
        return Response({"id": new_id, "detail": "Revaluation request submitted successfully."}, status=201)

    def patch(self, request):
        if not table_exists("portal_revaluation_request"):
            return Response({"detail": "Portal schema not applied."}, status=400)
        d = request.data
        req_id = d.get("id")
        status_val = d.get("status")
        remarks = d.get("teacher_remarks", "")
        updated_marks = d.get("updated_marks")
        
        if not req_id or status_val not in ("Approved", "Rejected", "Completed"):
            return Response({"detail": "id and a valid status (Approved/Rejected/Completed) are required."}, status=400)
            
        req = row("SELECT * FROM portal_revaluation_request WHERE id = %s", [req_id])
        if not req:
            return Response({"detail": "Request not found."}, status=404)
            
        with connection.cursor() as cur:
            cur.execute(
                "UPDATE portal_revaluation_request SET status=%s, teacher_remarks=%s, updated_marks=%s, reviewed_at=now() "
                "WHERE id=%s",
                [status_val, remarks, updated_marks, req_id]
            )
            
            if status_val == "Completed" and updated_marks is not None:
                # Update main portal_result
                marks = float(updated_marks)
                # Fetch max_marks for percentage calculation
                sched = row(
                    "SELECT es.max_marks FROM portal_result r JOIN portal_exam_schedule es ON es.id = r.exam_schedule_id "
                    "WHERE r.id = %s", [req["result_id"]]
                )
                max_marks = sched["max_marks"] if sched else 100
                pct = (marks / max_marks) * 100 if max_marks else 0
                grade = "A" if pct >= 90 else "B" if pct >= 75 else "C" if pct >= 60 else "D" if pct >= 40 else "F"
                
                cur.execute(
                    "UPDATE portal_result SET marks_obtained=%s, grade_letter=%s, grade_points=%s "
                    "WHERE id=%s",
                    [marks, grade, round(pct/10, 2), req["result_id"]]
                )
                
        log_action(request.user, "exams.revaluation.update", "portal_revaluation_request", req_id, dict(d))
        return Response({"detail": "Revaluation request updated."})


# =============================================================================
# SUPPLEMENTARY WORKFLOW
# =============================================================================
class SupplementaryRegistrationView(APIView):
    def get(self, request):
        role = request.user.groups.first().name if request.user.groups.exists() else "Student"
        if role == "Student":
            sql = """
                SELECT sr.*, s.name AS subject_name, es.exam_name AS original_exam_name
                FROM portal_supplementary_registration sr
                JOIN portal_exam_schedule es ON es.id = sr.original_exam_schedule_id
                JOIN portal_subject s ON s.id = sr.subject_id
                WHERE sr.student_id = %s
                ORDER BY sr.registered_at DESC
            """
            return Response(serialise(rows(sql, [request.user.id])))
        else: # Admin / Teacher
            sql = """
                SELECT sr.*, s.name AS subject_name, es.exam_name AS original_exam_name,
                       COALESCE(u.first_name || ' ' || u.last_name, u.username) AS student_name
                FROM portal_supplementary_registration sr
                JOIN auth_user u ON u.id = sr.student_id
                JOIN portal_exam_schedule es ON es.id = sr.original_exam_schedule_id
                JOIN portal_subject s ON s.id = sr.subject_id
                ORDER BY sr.registered_at DESC
            """
            return Response(serialise(rows(sql)))

    def post(self, request):
        if not table_exists("portal_supplementary_registration"):
            return Response({"detail": "Portal schema not applied."}, status=400)
        d = request.data
        subject_id = d.get("subject_id")
        sched_id = d.get("original_exam_schedule_id")
        
        if not subject_id or not sched_id:
            return Response({"detail": "subject_id and original_exam_schedule_id are required."}, status=400)
            
        with connection.cursor() as cur:
            cur.execute(
                "INSERT INTO portal_supplementary_registration (student_id, subject_id, original_exam_schedule_id, status) "
                "VALUES (%s,%s,%s,'Registered') RETURNING id",
                [request.user.id, subject_id, sched_id]
            )
            new_id = cur.fetchone()[0]
        log_action(request.user, "exams.supplementary.register", "portal_supplementary_registration", new_id, {"subject_id": subject_id})
        return Response({"id": new_id, "detail": "Registered for Supplementary Exam."}, status=201)

    def patch(self, request):
        if not table_exists("portal_supplementary_registration"):
            return Response({"detail": "Portal schema not applied."}, status=400)
        d = request.data
        supp_id = d.get("id")
        status_val = d.get("status")
        marks = d.get("marks_obtained")
        
        if not supp_id or not status_val:
            return Response({"detail": "id and status are required."}, status=400)
            
        grade = None
        if marks is not None:
            # Simple grading
            marks_val = float(marks)
            grade = "A" if marks_val >= 90 else "B" if marks_val >= 75 else "C" if marks_val >= 60 else "D" if marks_val >= 40 else "F"
            
        with connection.cursor() as cur:
            cur.execute(
                "UPDATE portal_supplementary_registration SET status=%s, marks_obtained=%s, grade_letter=%s "
                "WHERE id=%s",
                [status_val, marks, grade, supp_id]
            )
            
            # If completed, upsert back into portal_result to overwrite the failed grade
            if status_val == "Completed" and marks is not None:
                supp = row("SELECT * FROM portal_supplementary_registration WHERE id = %s", [supp_id])
                if supp:
                    cur.execute(
                        "INSERT INTO portal_result (student_id, exam_schedule_id, marks_obtained, grade_letter, grade_points, remarks) "
                        "VALUES (%s,%s,%s,%s,%s,'Re-evaluation/Supplementary clearance') "
                        "ON CONFLICT (student_id, exam_schedule_id) "
                        "DO UPDATE SET marks_obtained=EXCLUDED.marks_obtained, grade_letter=EXCLUDED.grade_letter, grade_points=EXCLUDED.grade_points, remarks=EXCLUDED.remarks",
                        [supp["student_id"], supp["original_exam_schedule_id"], float(marks), grade, round(float(marks)/10, 2)]
                    )
                    
        log_action(request.user, "exams.supplementary.update", "portal_supplementary_registration", supp_id, dict(d))
        return Response({"detail": "Supplementary registration updated."})


# =============================================================================
# ACADEMIC CERTIFICATES
# =============================================================================
import uuid as _uuid

class AcademicCertificateView(APIView):
    def get(self, request):
        role = request.user.groups.first().name if request.user.groups.exists() else "Student"
        if role == "Student":
            sql = "SELECT * FROM portal_academic_certificate WHERE student_id = %s ORDER BY issued_date DESC"
            return Response(serialise(rows(sql, [request.user.id])))
        elif role == "Parent":
            child_id = request.query_params.get("child_id")
            sql = "SELECT * FROM portal_academic_certificate WHERE student_id = %s ORDER BY issued_date DESC"
            return Response(serialise(rows(sql, [child_id])))
        else: # Admin
            sql = """
                SELECT ac.*, COALESCE(u.first_name || ' ' || u.last_name, u.username) AS student_name
                FROM portal_academic_certificate ac
                JOIN auth_user u ON u.id = ac.student_id
                ORDER BY ac.issued_date DESC
            """
            return Response(serialise(rows(sql)))

    def post(self, request):
        if not table_exists("portal_academic_certificate"):
            return Response({"detail": "Portal schema not applied."}, status=400)
        d = request.data
        sid = d.get("student_id")
        cert_type = d.get("certificate_type")
        file_url = d.get("file_url", "")
        
        if not sid or not cert_type:
            return Response({"detail": "student_id and certificate_type are required."}, status=400)
            
        vcode = f"CERT-{_uuid.uuid4().hex[:12].upper()}"
        with connection.cursor() as cur:
            cur.execute(
                "INSERT INTO portal_academic_certificate (student_id, certificate_type, file_url, verification_code) "
                "VALUES (%s,%s,%s,%s) RETURNING id",
                [sid, cert_type, file_url, vcode]
            )
            new_id = cur.fetchone()[0]
        log_action(request.user, "exams.certificate.issue", "portal_academic_certificate", new_id, {"student_id": sid, "type": cert_type})
        return Response({"id": new_id, "verification_code": vcode, "detail": "Certificate generated and issued successfully."}, status=201)


# =============================================================================
# TIMETABLE SEATING & INVIGILATION CONFLICT CHECKER
# =============================================================================
class TimetableSeatingConflictView(AdminMixin, APIView):
    def post(self, request):
        if not table_exists("portal_exam_schedule"):
            return Response({"detail": "Portal schema not applied."}, status=400)
        d = request.data
        sched_id = d.get("exam_schedule_id")
        room_name = (d.get("room_name") or "").strip()
        invigilator_id = d.get("invigilator_id")
        passing_marks = d.get("passing_marks", 40)
        internal_weightage = d.get("internal_weightage", 20)
        practical_weightage = d.get("practical_weightage", 0)
        
        if not sched_id:
            return Response({"detail": "exam_schedule_id is required."}, status=400)
            
        # Fetch target exam details
        exam = row("SELECT exam_date, start_time, duration_minutes, exam_name FROM portal_exam_schedule WHERE id = %s", [sched_id])
        if not exam:
            return Response({"detail": "Exam schedule not found."}, status=404)
            
        # Validate overlap with other scheduled exams
        if room_name:
            room_conflict = row(
                """
                SELECT e.id, e.exam_name, s.name AS subject_name 
                FROM portal_exam_schedule e
                JOIN portal_subject s ON s.id = e.subject_id
                WHERE e.id <> %s AND e.room_name = %s AND e.exam_date = %s
                  AND ((e.start_time, e.start_time + interval '1 minute' * e.duration_minutes) OVERLAPS (%s::time, %s::time + interval '1 minute' * %s::integer))
                LIMIT 1
                """,
                [sched_id, room_name, exam["exam_date"], exam["start_time"], exam["start_time"], exam["duration_minutes"]]
            )
            if room_conflict:
                return Response(
                    {"detail": f"Room Conflict: Room '{room_name}' is already booked for '{room_conflict['exam_name']}' ({room_conflict['subject_name']}) at this time."},
                    status=400
                )
                
        if invigilator_id:
            inv_conflict = row(
                """
                SELECT e.id, e.exam_name, s.name AS subject_name 
                FROM portal_exam_schedule e
                JOIN portal_subject s ON s.id = e.subject_id
                WHERE e.id <> %s AND e.invigilator_id = %s AND e.exam_date = %s
                  AND ((e.start_time, e.start_time + interval '1 minute' * e.duration_minutes) OVERLAPS (%s::time, %s::time + interval '1 minute' * %s::integer))
                LIMIT 1
                """,
                [sched_id, invigilator_id, exam["exam_date"], exam["start_time"], exam["start_time"], exam["duration_minutes"]]
            )
            if inv_conflict:
                # Resolve invigilator full name
                inv_user = row("SELECT COALESCE(first_name || ' ' || last_name, username) AS name FROM auth_user WHERE id=%s", [invigilator_id])
                inv_name = inv_user["name"] if inv_user else "Invigilator"
                return Response(
                    {"detail": f"Invigilator Conflict: {inv_name} is already assigned to invigilate '{inv_conflict['exam_name']}' ({inv_conflict['subject_name']}) at this time."},
                    status=400
                )
                
        with connection.cursor() as cur:
            cur.execute(
                "UPDATE portal_exam_schedule SET room_name=%s, invigilator_id=%s, passing_marks=%s, "
                "internal_weightage=%s, practical_weightage=%s WHERE id=%s",
                [room_name or None, invigilator_id or None, passing_marks, internal_weightage, practical_weightage, sched_id]
            )
            
        log_action(request.user, "exams.schedule.seating", "portal_exam_schedule", sched_id, dict(d))
        return Response({"detail": "Exam schedule seating and settings updated successfully."})


# =============================================================================
# LMS ONLINE EXAM ATTEMPT PLAYER API
# =============================================================================
class StudentExamAttemptView(StudentOnlyMixin, APIView):
    def post(self, request):
        if not table_exists("portal_result") or not table_exists("portal_exam_schedule"):
            return Response({"detail": "Portal schema not applied."}, status=400)
            
        d = request.data
        sched_id = d.get("exam_schedule_id")
        answers = d.get("answers") or {} # dict of {question_id: selected_option}
        
        if not sched_id:
            return Response({"detail": "exam_schedule_id is required."}, status=400)
            
        # Verify exam exists
        exam = row("SELECT max_marks, status, exam_name FROM portal_exam_schedule WHERE id=%s", [sched_id])
        if not exam:
            return Response({"detail": "Exam not found."}, status=404)
            
        # Calculate instant OMR MCQ score
        correct_count = 0
        total_questions = 0
        
        if table_exists("portal_question_bank"):
            # Select all MCQ questions related to the subject / exam
            q_rows = rows(
                "SELECT id, correct_answer FROM portal_question_bank WHERE id IN ("
                "  SELECT jsonb_array_elements_text(questions)::int FROM portal_question_paper WHERE exam_schedule_id = %s"
                ")", [sched_id]
            )
            if not q_rows:
                # fallback query: questions matching the subject
                subject_id = row("SELECT subject_id FROM portal_exam_schedule WHERE id = %s", [sched_id])
                if subject_id:
                    q_rows = rows("SELECT id, correct_answer FROM portal_question_bank WHERE subject_id = %s AND type='MCQ'", [subject_id["subject_id"]])
            
            total_questions = len(q_rows)
            for q in q_rows:
                submitted_ans = answers.get(str(q["id"])) or answers.get(q["id"])
                if submitted_ans and str(submitted_ans).strip().lower() == str(q["correct_answer"]).strip().lower():
                    correct_count += 1
                    
        # Compute marks obtained proportion
        max_marks = float(exam["max_marks"])
        if total_questions > 0:
            marks_obtained = round((correct_count / total_questions) * max_marks, 2)
        else:
            # fallback mock grade
            marks_obtained = round(max_marks * 0.85, 2)
            
        pct = (marks_obtained / max_marks) * 100 if max_marks > 0 else 0
        grade = "A" if pct >= 90 else "B" if pct >= 75 else "C" if pct >= 60 else "D" if pct >= 40 else "F"
        
        with connection.cursor() as cur:
            cur.execute(
                "INSERT INTO portal_result (student_id, exam_schedule_id, marks_obtained, grade_letter, grade_points, remarks) "
                "VALUES (%s,%s,%s,%s,%s,'Online Exam Submission') "
                "ON CONFLICT (student_id, exam_schedule_id) "
                "DO UPDATE SET marks_obtained=EXCLUDED.marks_obtained, grade_letter=EXCLUDED.grade_letter, grade_points=EXCLUDED.grade_points, remarks=EXCLUDED.remarks "
                "RETURNING id",
                [request.user.id, sched_id, marks_obtained, grade, round(pct/10, 2)]
            )
            res_id = cur.fetchone()[0]
            
        log_action(request.user, "exams.attempt.submit", "portal_result", res_id, {"exam_schedule_id": sched_id, "score": marks_obtained})
        return Response({"detail": "Exam attempt successfully submitted.", "marks_obtained": marks_obtained, "grade": grade})
