import json
from django.db import connection
from rest_framework.views import APIView
from rest_framework.response import Response
from .views import (
    rows, row, table_exists, serialise
)
from .roles import log_action, IsStudent
from .admin_views import AdminMixin

# =============================================================================
# SCHOLARSHIP MANAGEMENT API VIEWS
# =============================================================================

class ScholarshipStudentApplicationView(APIView):
    permission_classes = [IsStudent]
    def get(self, request):
        if not table_exists("portal_scholarship"):
            return Response({"schemes": [], "applications": []})
            
        # Get active scholarship schemes
        schemes = rows("SELECT * FROM portal_scholarship ORDER BY id")
        
        # Get active student applications
        sql_apps = """
            SELECT sa.*, s.name AS scheme_name, s.coverage_percent, s.description
            FROM portal_scholarship_application sa
            JOIN portal_scholarship s ON s.id = sa.scheme_id
            WHERE sa.student_id = %s
            ORDER BY sa.applied_at DESC
        """
        apps = rows(sql_apps, [request.user.id])
        return Response(serialise({"schemes": schemes, "applications": apps}))

    def post(self, request):
        if not table_exists("portal_scholarship_application"):
            return Response({"detail": "Scholarship schema not applied."}, status=400)
            
        d = request.data
        scheme_id = d.get("scheme_id")
        gpa = d.get("academic_gpa")
        attendance = d.get("attendance_percentage")
        income_url = d.get("income_certificate_url", "").strip()
        other_url = d.get("other_certificate_url", "").strip()

        if not scheme_id or gpa is None or attendance is None:
            return Response({"detail": "scheme_id, academic_gpa, and attendance_percentage are required."}, status=400)

        # Check if already applied
        exist = row("SELECT id FROM portal_scholarship_application WHERE student_id = %s AND scheme_id = %s", [request.user.id, scheme_id])
        if exist:
            return Response({"detail": "You have already applied for this scholarship scheme."}, status=400)

        with connection.cursor() as cur:
            cur.execute(
                """
                INSERT INTO portal_scholarship_application 
                  (student_id, scheme_id, status, academic_gpa, attendance_percentage, income_certificate_url, other_certificate_url)
                VALUES (%s,%s,'Pending',%s,%s,%s,%s) RETURNING id
                """,
                [request.user.id, scheme_id, float(gpa), float(attendance), income_url or None, other_url or None]
            )
            new_id = cur.fetchone()[0]

        log_action(request.user, "scholarships.application.submit", "portal_scholarship_application", new_id, {"scheme_id": scheme_id})
        return Response({"id": new_id, "detail": "Scholarship application submitted successfully."}, status=201)


class ScholarshipAdminActionView(AdminMixin, APIView):
    def get(self, request):
        if not table_exists("portal_scholarship_application"):
            return Response([])
            
        sql = """
            SELECT sa.*, s.name AS scheme_name, s.coverage_percent,
                   COALESCE(u.first_name || ' ' || u.last_name, u.username) AS student_name,
                   sp.admission_number,
                   (SELECT name FROM portal_class c JOIN portal_student_enrollment se ON se.class_id = c.id WHERE se.student_id = sa.student_id LIMIT 1) AS class_name
            FROM portal_scholarship_application sa
            JOIN portal_scholarship s ON s.id = sa.scheme_id
            JOIN auth_user u ON u.id = sa.student_id
            LEFT JOIN portal_student_profile sp ON sp.user_id = u.id
            ORDER BY sa.applied_at DESC
        """
        return Response(serialise(rows(sql)))

    def post(self, request):
        if not table_exists("portal_scholarship_application"):
            return Response({"detail": "Scholarship schema not applied."}, status=400)

        d = request.data
        app_id = d.get("id")
        action = d.get("action") # Verify | Approve | Reject
        reason = d.get("rejection_reason", "").strip()

        if not app_id or not action:
            return Response({"detail": "id and action are required."}, status=400)

        app = row("SELECT * FROM portal_scholarship_application WHERE id = %s", [app_id])
        if not app:
            return Response({"detail": "Application not found."}, status=404)

        scheme = row("SELECT * FROM portal_scholarship WHERE id = %s", [app["scheme_id"]])
        if not scheme:
            return Response({"detail": "Scholarship scheme not found."}, status=404)

        new_status = "Pending"
        if action == "Verify":
            new_status = "Verified"
        elif action == "Approve":
            new_status = "Approved"
        elif action == "Reject":
            new_status = "Rejected"

        with connection.cursor() as cur:
            cur.execute(
                "UPDATE portal_scholarship_application SET status=%s, rejection_reason=%s, verified_at=now(), verified_by_id=%s WHERE id=%s",
                [new_status, reason if action == "Reject" else None, request.user.id, app_id]
            )

            # AUTOMATIC FEE ADJUSTMENT WORKFLOW
            # Recalculate student payable fees upon approval or rejection reversal
            if action == "Approve":
                # Find student's active fee assignment structure
                fee_assign = row("SELECT fee_structure_id FROM portal_fee_assignment WHERE student_id = %s LIMIT 1", [app["student_id"]])
                if fee_assign:
                    fs_id = fee_assign["fee_structure_id"]
                    # Apply or update the concession
                    cur.execute(
                        """
                        INSERT INTO portal_fee_concession (student_id, fee_structure_id, concession_type, discount_percent, reason, approved_by)
                        VALUES (%s,%s,'Scholarship',%s,%s,%s)
                        ON CONFLICT (student_id, fee_structure_id) 
                        DO UPDATE SET concession_type=EXCLUDED.concession_type, discount_percent=EXCLUDED.discount_percent, reason=EXCLUDED.reason, approved_by=EXCLUDED.approved_by
                        """,
                        [app["student_id"], fs_id, float(scheme["coverage_percent"]), scheme["name"], request.user.id]
                    )
                    # Recalculate ledger balance (not available in CR yet)
                    # StudentFeeLedgerView()._compute_ledger(app["student_id"], fs_id)

            elif action == "Reject":
                # Remove any existing scholarship concessions
                fee_assign = row("SELECT fee_structure_id FROM portal_fee_assignment WHERE student_id = %s LIMIT 1", [app["student_id"]])
                if fee_assign:
                    fs_id = fee_assign["fee_structure_id"]
                    cur.execute("DELETE FROM portal_fee_concession WHERE student_id=%s AND fee_structure_id=%s AND concession_type='Scholarship'", [app["student_id"], fs_id])
                    # Recalculate ledger balance (not available in CR yet)
                    # StudentFeeLedgerView()._compute_ledger(app["student_id"], fs_id)

        log_action(request.user, f"scholarships.application.{action.lower()}", "portal_scholarship_application", app_id, {"student_id": app["student_id"]})
        return Response({"detail": f"Scholarship application successfully {action.lower()}ed."})


class ScholarshipRenewalView(APIView):
    def get(self, request):
        if not table_exists("portal_scholarship_renewal"):
            return Response([])

        # If staff/admin, return all renewals
        if request.user.is_staff:
            sql = """
                SELECT sr.*, sa.student_id, s.name AS scheme_name,
                       COALESCE(u.first_name || ' ' || u.last_name, u.username) AS student_name,
                       sp.admission_number
                FROM portal_scholarship_renewal sr
                JOIN portal_scholarship_application sa ON sa.id = sr.application_id
                JOIN portal_scholarship s ON s.id = sa.scheme_id
                JOIN auth_user u ON u.id = sa.student_id
                LEFT JOIN portal_student_profile sp ON sp.user_id = u.id
                ORDER BY sr.submitted_at DESC
            """
            return Response(serialise(rows(sql)))
        else:
            # Return authenticated student renewals
            sql = """
                SELECT sr.*, s.name AS scheme_name, s.coverage_percent
                FROM portal_scholarship_renewal sr
                JOIN portal_scholarship_application sa ON sa.id = sr.application_id
                JOIN portal_scholarship s ON s.id = sa.scheme_id
                WHERE sa.student_id = %s
                ORDER BY sr.submitted_at DESC
            """
            return Response(serialise(rows(sql, [request.user.id])))

    def post(self, request):
        if not table_exists("portal_scholarship_renewal"):
            return Response({"detail": "Scholarship schema not applied."}, status=400)

        d = request.data
        app_id = d.get("application_id")
        gpa = d.get("academic_gpa")
        attendance = d.get("attendance_percentage")
        docs_url = d.get("documents_url", "").strip()

        if not app_id or gpa is None or attendance is None:
            return Response({"detail": "application_id, academic_gpa, and attendance_percentage are required."}, status=400)

        # Check eligibility: application must be approved
        app = row("SELECT * FROM portal_scholarship_application WHERE id=%s", [app_id])
        if not app:
            return Response({"detail": "Scholarship application not found."}, status=404)
        if app["status"] != "Approved":
            return Response({"detail": "Scholarship must be approved before requesting renewal."}, status=400)

        # Check existing pending renewals
        exist = row("SELECT id FROM portal_scholarship_renewal WHERE application_id=%s AND status='Pending'", [app_id])
        if exist:
            return Response({"detail": "You already have a pending renewal request under review."}, status=400)

        with connection.cursor() as cur:
            cur.execute(
                """
                INSERT INTO portal_scholarship_renewal (application_id, status, academic_gpa, attendance_percentage, documents_url)
                VALUES (%s, 'Pending', %s, %s, %s) RETURNING id
                """,
                [app_id, float(gpa), float(attendance), docs_url or None]
            )
            new_id = cur.fetchone()[0]

        log_action(request.user, "scholarships.renewal.submit", "portal_scholarship_renewal", new_id, {"application_id": app_id})
        return Response({"id": new_id, "detail": "Scholarship renewal request submitted successfully."}, status=201)

    def patch(self, request):
        if not request.user.is_staff:
            return Response({"detail": "Admin permission required."}, status=403)

        d = request.data
        renewal_id = d.get("id")
        action = d.get("action") # Approve | Reject

        if not renewal_id or not action:
            return Response({"detail": "id and action are required."}, status=400)

        renewal = row("SELECT * FROM portal_scholarship_renewal WHERE id=%s", [renewal_id])
        if not renewal:
            return Response({"detail": "Renewal request not found."}, status=404)

        new_status = "Approved" if action == "Approve" else "Rejected"

        with connection.cursor() as cur:
            cur.execute(
                "UPDATE portal_scholarship_renewal SET status=%s, resolved_at=now(), resolved_by_id=%s WHERE id=%s",
                [new_status, request.user.id, renewal_id]
            )

        log_action(request.user, f"scholarships.renewal.{action.lower()}", "portal_scholarship_renewal", renewal_id, {})
        return Response({"detail": f"Scholarship renewal request successfully {action.lower()}ed."})


class ScholarshipParentView(APIView):
    """Parent portal proxy to view active child scholarship allocations and revised fee invoices."""
    def get(self, request):
        child_id = request.query_params.get("child_id")
        if not child_id:
            return Response({"detail": "child_id is required."}, status=400)

        # Retrieve active scholarships
        sql = """
            SELECT sa.*, s.name AS scheme_name, s.coverage_percent, s.description
            FROM portal_scholarship_application sa
            JOIN portal_scholarship s ON s.id = sa.scheme_id
            WHERE sa.student_id = %s AND sa.status = 'Approved'
            ORDER BY sa.applied_at DESC
        """
        benefits = rows(sql, [child_id])
        return Response(serialise(benefits))
