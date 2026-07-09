import json
from datetime import date, timedelta

from django.contrib.auth import get_user_model
from django.contrib.auth.models import Group
from django.db import connection, transaction
from django.utils.crypto import get_random_string
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.admissions.models import AdmissionEnquiry
from .roles import IsAdmin, get_role, log_action
from .views import row, rows, serialise, table_exists

User = get_user_model()


class AdminMixin:
    permission_classes = [IsAdmin]


# ---------------------------------------------------------------------------
# Dashboard
# ---------------------------------------------------------------------------
class AdminDashboardView(AdminMixin, APIView):
    def get(self, request):
        def count(table, where=""):
            if not table_exists(table):
                return 0
            r = row(f"SELECT COUNT(*)::int AS c FROM {table} {where}")
            return r["c"] if r else 0

        pending_admissions = AdmissionEnquiry.objects.exclude(status__in=["Confirmed", "Rejected"]).count()
        total_students = count("portal_student_profile")
        total_teachers = count("portal_teacher_profile")
        total_parents = count("portal_parent_profile")
        total_employees = count("portal_employee")
        open_leaves = count("portal_leave", "WHERE status='Pending'")
        fee_collected_month = 0
        if table_exists("portal_payment"):
            r = row(
                "SELECT COALESCE(SUM(amount_paid),0)::float AS total FROM portal_payment "
                "WHERE status='Success' AND date_trunc('month', paid_at) = date_trunc('month', now())"
            )
            fee_collected_month = r["total"] if r else 0
        library_out = count("portal_library_transaction", "WHERE return_date IS NULL")
        recent_admissions = list(
            AdmissionEnquiry.objects.order_by("-submitted_at").values(
                "registration_number", "applicant_name", "target_class", "status", "submitted_at"
            )[:8]
        )
        return Response(serialise({
            "pending_admissions": pending_admissions,
            "total_students": total_students,
            "total_teachers": total_teachers,
            "total_parents": total_parents,
            "total_employees": total_employees,
            "open_leaves": open_leaves,
            "fee_collected_this_month": fee_collected_month,
            "library_books_out": library_out,
            "recent_admissions": recent_admissions,
        }))


# ---------------------------------------------------------------------------
# Admissions workflow (Registered -> Verification -> Screening -> Fee_Pending
# -> Confirmed/Rejected), including credential generation on Confirmed.
# ---------------------------------------------------------------------------
NEXT_STATUS = {
    "Registered": "Verification",
    "Verification": "Screening",
    "Screening": "Fee_Pending",
    "Fee_Pending": "Confirmed",
}


def _unique_username(base):
    base = (base or "user").lower().replace(" ", ".")
    candidate = base
    i = 1
    while User.objects.filter(username=candidate).exists():
        i += 1
        candidate = f"{base}{i}"
    return candidate


def _ensure_group(name):
    grp, _ = Group.objects.get_or_create(name=name)
    return grp


def _generate_credentials(enquiry):
    """Creates a Parent account (if needed) + Student account for a Confirmed
    admission enquiry, and links both back onto portal_* tables. Idempotent:
    if the enquiry already has student_user_id/parent_user_id set, does
    nothing and returns the existing accounts."""
    if enquiry.student_user_id:
        student = User.objects.filter(id=enquiry.student_user_id).first()
        parent = User.objects.filter(id=enquiry.parent_user_id).first() if enquiry.parent_user_id else None
        return student, parent, None

    temp_password = get_random_string(10)
    parent_temp_password = get_random_string(10)

    with transaction.atomic():
        parent = User.objects.filter(email__iexact=enquiry.parent_email).first()
        parent_is_new = parent is None
        if parent is None:
            parent = User.objects.create_user(
                username=_unique_username(enquiry.parent_email.split("@")[0]),
                email=enquiry.parent_email,
                password=parent_temp_password,
                first_name=enquiry.parent_name.split(" ")[0] if enquiry.parent_name else "",
                last_name=" ".join(enquiry.parent_name.split(" ")[1:]) if enquiry.parent_name else "",
            )
            _ensure_group("Parent")
            parent.groups.add(Group.objects.get(name="Parent"))

        student_username = _unique_username(f"{enquiry.applicant_name}.{enquiry.registration_number[-4:]}")
        student = User.objects.create_user(
            username=student_username,
            email=f"{student_username}@students.edunova.edu",
            password=temp_password,
            first_name=enquiry.applicant_name.split(" ")[0] if enquiry.applicant_name else "",
            last_name=" ".join(enquiry.applicant_name.split(" ")[1:]) if enquiry.applicant_name else "",
        )
        _ensure_group("Student")
        student.groups.add(Group.objects.get(name="Student"))

        with connection.cursor() as cursor:
            if table_exists("portal_user_profile"):
                cursor.execute(
                    "INSERT INTO portal_user_profile (user_id, user_type) VALUES (%s,'Parent') "
                    "ON CONFLICT (user_id) DO NOTHING",
                    [parent.id],
                )
                cursor.execute(
                    "INSERT INTO portal_user_profile (user_id, user_type) VALUES (%s,'Student') "
                    "ON CONFLICT (user_id) DO NOTHING",
                    [student.id],
                )
            if table_exists("portal_parent_profile"):
                parent_code = f"PRN-{parent.id:04d}-{get_random_string(4).upper()}"
                cursor.execute(
                    "INSERT INTO portal_parent_profile (user_id, parent_code, address) VALUES (%s,%s,%s) "
                    "ON CONFLICT (user_id) DO NOTHING",
                    [parent.id, parent_code, enquiry.address],
                )
            if table_exists("portal_student_profile"):
                admission_number = f"STU-{enquiry.registration_number[-8:]}"
                cursor.execute(
                    "INSERT INTO portal_student_profile (user_id, parent_id, admission_number, date_of_birth, gender) "
                    "VALUES (%s,%s,%s,%s,%s) ON CONFLICT (user_id) DO NOTHING",
                    [student.id, parent.id, admission_number, enquiry.date_of_birth, enquiry.gender],
                )

        enquiry.student_user_id = student.id
        enquiry.parent_user_id = parent.id
        enquiry.save(update_fields=["student_user_id", "parent_user_id"])

    credentials = {
        "student_username": student.username,
        "student_temp_password": temp_password,
        "parent_username": parent.username,
        "parent_temp_password": parent_temp_password if parent_is_new else None,
        "parent_account_reused": not parent_is_new,
    }
    return student, parent, credentials


class AdmissionListView(AdminMixin, APIView):
    def get(self, request):
        qs = AdmissionEnquiry.objects.all().order_by("-submitted_at")
        status_filter = request.query_params.get("status")
        if status_filter:
            qs = qs.filter(status=status_filter)
        data = list(qs.values(
            "registration_number", "applicant_name", "date_of_birth", "gender", "target_class",
            "parent_name", "parent_phone", "parent_email", "scholarship_applied", "status",
            "rejection_reason", "submitted_at",
        ))
        return Response(serialise(data))

    def post(self, request):
        d = request.data
        from django.utils.crypto import get_random_string
        reg_num = f"REG-{get_random_string(8).upper()}"
        
        # Ensure model is imported locally
        from apps.admissions.models import AdmissionEnquiry
        enquiry = AdmissionEnquiry.objects.create(
            registration_number=reg_num,
            applicant_name=d.get("applicant_name"),
            date_of_birth=d.get("date_of_birth"),
            gender=d.get("gender", "Male"),
            target_class=d.get("target_class"),
            parent_name=d.get("parent_name"),
            parent_phone=d.get("parent_phone"),
            parent_email=d.get("parent_email"),
            address=d.get("address", ""),
            scholarship_applied=d.get("scholarship_applied", False),
            status="Registered"
        )
        return Response({"detail": "Admission application manually registered.", "registration_number": reg_num})


class AdmissionActionView(AdminMixin, APIView):
    """POST { action: 'advance' | 'reject' | 'confirm', reason? } to move an
    application through Verification -> Screening -> Fee_Pending -> Confirmed,
    or reject it at any stage. 'confirm' also generates student+parent logins."""

    def post(self, request, registration_number):
        try:
            enquiry = AdmissionEnquiry.objects.get(registration_number=registration_number)
        except AdmissionEnquiry.DoesNotExist:
            return Response({"detail": "Application not found."}, status=404)

        action = request.data.get("action")
        if action == "reject":
            enquiry.status = "Rejected"
            enquiry.rejection_reason = request.data.get("reason", "")
            enquiry.reviewed_by = request.user.get_full_name() or request.user.username
            enquiry.save()
            log_action(request.user, "admission.reject", "admission", registration_number, {"reason": enquiry.rejection_reason})
            return Response(serialise({"status": enquiry.status}))

        if action == "advance":
            nxt = NEXT_STATUS.get(enquiry.status)
            if not nxt:
                return Response({"detail": f"Cannot advance from status '{enquiry.status}'."}, status=400)
            enquiry.status = nxt
            enquiry.reviewed_by = request.user.get_full_name() or request.user.username
            enquiry.save()
            log_action(request.user, "admission.advance", "admission", registration_number, {"to": nxt})
            payload = {"status": enquiry.status}
            if nxt == "Confirmed":
                student, parent, credentials = _generate_credentials(enquiry)
                if credentials:
                    payload["credentials"] = credentials
                    log_action(request.user, "admission.credentials_generated", "admission", registration_number,
                               {"student_username": credentials["student_username"]})
            return Response(serialise(payload))

        return Response({"detail": "Unknown action. Use 'advance' or 'reject'."}, status=400)


# ---------------------------------------------------------------------------
# Users / RBAC
# ---------------------------------------------------------------------------
class UserListView(AdminMixin, APIView):
    def get(self, request):
        from django.contrib.auth.models import User
        from .roles import get_role
        role_filter = request.query_params.get("role")
        
        users = User.objects.all().prefetch_related("groups").order_by("-date_joined")
        data = []
        for u in users:
            data.append({
                "id": u.id,
                "username": u.username,
                "email": u.email,
                "name": u.get_full_name() or u.username,
                "is_active": u.is_active,
                "date_joined": u.date_joined,
                "role": get_role(u)
            })

        if role_filter:
            data = [d for d in data if d["role"] == role_filter]
        return Response(serialise(data))

    def post(self, request):
        """Create a user of any role with a temporary password."""
        d = request.data
        role = d.get("role")
        if role not in ("Student", "Teacher", "Parent", "Admin", "Employee"):
            return Response({"detail": "role must be one of Student/Teacher/Parent/Admin/Employee."}, status=400)
        if User.objects.filter(email__iexact=d.get("email", "")).exists():
            return Response({"detail": "A user with this email already exists."}, status=400)
        temp_password = get_random_string(10)
        username = _unique_username(d.get("username") or d.get("email", "user").split("@")[0])
        user = User.objects.create_user(
            username=username,
            email=d.get("email"),
            password=temp_password,
            first_name=d.get("first_name", ""),
            last_name=d.get("last_name", ""),
            is_staff=(role == "Admin"),
        )
        _ensure_group(role)
        user.groups.add(Group.objects.get(name=role))
        if table_exists("portal_user_profile"):
            with connection.cursor() as cursor:
                cursor.execute(
                    "INSERT INTO portal_user_profile (user_id, user_type, phone_number) VALUES (%s,%s,%s) "
                    "ON CONFLICT (user_id) DO UPDATE SET user_type=EXCLUDED.user_type",
                    [user.id, role, d.get("phone_number", "")],
                )
        if role == "Student":
            parent_id = None
            parent_email = d.get("parent_email")
            if parent_email:
                parent_user = User.objects.filter(email__iexact=parent_email).first()
                if not parent_user:
                    parent_temp_password = get_random_string(10)
                    parent_name = d.get("parent_name") or "Parent"
                    p_first = parent_name.split(" ")[0]
                    p_last = " ".join(parent_name.split(" ")[1:]) if " " in parent_name else ""
                    parent_user = User.objects.create_user(
                        username=_unique_username(parent_email.split("@")[0]),
                        email=parent_email,
                        password=parent_temp_password,
                        first_name=p_first,
                        last_name=p_last,
                    )
                    _ensure_group("Parent")
                    parent_user.groups.add(Group.objects.get(name="Parent"))
                    
                    with connection.cursor() as cursor:
                        if table_exists("portal_user_profile"):
                            cursor.execute(
                                "INSERT INTO portal_user_profile (user_id, user_type, phone_number) VALUES (%s,'Parent',%s) "
                                "ON CONFLICT (user_id) DO NOTHING",
                                [parent_user.id, d.get("parent_phone", "")],
                            )
                        if table_exists("portal_parent_profile"):
                            parent_code = f"PRN-{parent_user.id:04d}-{get_random_string(4).upper()}"
                            cursor.execute(
                                "INSERT INTO portal_parent_profile (user_id, parent_code, father_name, emergency_contact) VALUES (%s,%s,%s,%s) "
                                "ON CONFLICT (user_id) DO NOTHING",
                                [parent_user.id, parent_code, parent_name, d.get("parent_phone", "")],
                            )
                parent_id = parent_user.id

            admission_number = f"ADM-{user.id:04d}-{get_random_string(4).upper()}"
            with connection.cursor() as cursor:
                cursor.execute(
                    "INSERT INTO portal_student_profile (user_id, parent_id, admission_number, date_of_birth, gender, status) "
                    "VALUES (%s,%s,%s,current_date,'Male','Active') "
                    "ON CONFLICT (user_id) DO UPDATE SET parent_id=EXCLUDED.parent_id",
                    [user.id, parent_id, admission_number]
                )
                if d.get("class_id"):
                    cursor.execute(
                        "INSERT INTO portal_student_enrollment (student_id, class_id, academic_year, roll_number) "
                        "VALUES (%s,%s,'2025-26',%s) "
                        "ON CONFLICT DO NOTHING",
                        [user.id, d.get("class_id"), d.get("roll_number") or 1]
                    )
        elif role == "Teacher":
            employee_code = f"TCH-{user.id:04d}-{get_random_string(4).upper()}"
            with connection.cursor() as cursor:
                cursor.execute(
                    "INSERT INTO portal_teacher_profile (user_id, employee_code, date_of_joining) "
                    "VALUES (%s,%s,current_date) "
                    "ON CONFLICT (user_id) DO NOTHING",
                    [user.id, employee_code]
                )
        elif role == "Parent":
            parent_code = f"PRN-{user.id:04d}-{get_random_string(4).upper()}"
            with connection.cursor() as cursor:
                cursor.execute(
                    "INSERT INTO portal_parent_profile (user_id, parent_code) "
                    "VALUES (%s,%s) "
                    "ON CONFLICT (user_id) DO NOTHING",
                    [user.id, parent_code]
                )
        log_action(request.user, f"Audit {role} Created", "user", user.id, {"role": role})
        return Response({"id": user.id, "username": user.username, "temp_password": temp_password, "role": role})


class UserDetailView(AdminMixin, APIView):
    def patch(self, request, user_id):
        try:
            target = User.objects.get(id=user_id)
        except User.DoesNotExist:
            return Response({"detail": "User not found."}, status=404)
        
        role = "User"
        if target.groups.exists():
            role = target.groups.first().name

        if "is_active" in request.data:
            target.is_active = bool(request.data["is_active"])
            target.save(update_fields=["is_active"])
            log_action(request.user, f"Audit {role} Toggled", "user", user_id, {"is_active": target.is_active})
        if "role" in request.data:
            new_role = request.data["role"]
            if new_role not in ("Student", "Teacher", "Parent", "Admin", "Employee"):
                return Response({"detail": "Invalid role."}, status=400)
            target.groups.clear()
            target.groups.add(_ensure_group(new_role))
            if table_exists("portal_user_profile"):
                with connection.cursor() as cursor:
                    cursor.execute(
                        "INSERT INTO portal_user_profile (user_id, user_type) VALUES (%s,%s) "
                        "ON CONFLICT (user_id) DO UPDATE SET user_type=EXCLUDED.user_type",
                        [user_id, new_role],
                    )
            log_action(request.user, f"Audit {role} Role Changed", "user", user_id, {"role": new_role})
        return Response({"detail": "Updated."})

    def post(self, request, user_id):
        """Admin-triggered password reset."""
        try:
            target = User.objects.get(id=user_id)
        except User.DoesNotExist:
            return Response({"detail": "User not found."}, status=404)
        
        role = "User"
        if target.groups.exists():
            role = target.groups.first().name

        temp_password = get_random_string(10)
        target.set_password(temp_password)
        target.save(update_fields=["password"])
        log_action(request.user, f"Audit {role} Password Reset", "user", user_id, {})

        email_sent = True
        try:
            from .services.email_service import send_reset_password_email
            send_reset_password_email(target, temp_password)
        except Exception:
            import logging
            logger = logging.getLogger(__name__)
            logger.exception("Failed to send reset password email")
            email_sent = False

        if not email_sent:
            return Response({
                "detail": "Password reset, but unable to send email.",
                "temp_password": temp_password,
                "email_error": True
            })

        return Response({
            "detail": "Password reset. Email sent successfully.",
            "temp_password": temp_password
        })


class RolesView(AdminMixin, APIView):
    def get(self, request):
        roles = ["Student", "Teacher", "Parent", "Admin", "Employee"]
        counts = {}
        for r in roles:
            grp = Group.objects.filter(name=r).first()
            counts[r] = grp.user_set.count() if grp else 0
        return Response(counts)


# ---------------------------------------------------------------------------
# Generic small CRUD helper for simple lookup-style portal_* tables
# ---------------------------------------------------------------------------
class SimpleTableView(AdminMixin, APIView):
    table = None
    columns = ()          # columns accepted on create, in order
    order_by = "id"

    def get(self, request):
        if not table_exists(self.table):
            return Response([])
        return Response(serialise(rows(f"SELECT * FROM {self.table} ORDER BY {self.order_by}")))

    def post(self, request):
        if not table_exists(self.table):
            return Response({"detail": "Table not found. Apply the schema extension SQL first."}, status=400)
        values = [request.data.get(c) for c in self.columns]
        placeholders = ",".join(["%s"] * len(self.columns))
        col_sql = ",".join(self.columns)
        with connection.cursor() as cursor:
            cursor.execute(f"INSERT INTO {self.table} ({col_sql}) VALUES ({placeholders}) RETURNING id", values)
            new_id = cursor.fetchone()[0]
        log_action(request.user, f"{self.table}.create", self.table, new_id, dict(zip(self.columns, [str(v) for v in values])))
        return Response({"id": new_id, "detail": "Created."})


class ClassView(SimpleTableView):
    table = "portal_class"
    columns = ("name", "section", "curriculum", "room_number")
    order_by = "name, section"


class SubjectView(SimpleTableView):
    table = "portal_subject"
    columns = ("name", "subject_code", "type")
    order_by = "name"


class VehicleView(SimpleTableView):
    table = "portal_vehicle"
    columns = ("vehicle_number", "capacity", "driver_id", "gps_device_id", "maintenance_status")
    order_by = "vehicle_number"


class RouteView(SimpleTableView):
    table = "portal_route"
    columns = ("route_name", "start_point", "end_point")
    order_by = "route_name"


class TransportAllocationView(SimpleTableView):
    table = "portal_transport_allocation"
    columns = ("student_id", "vehicle_id", "route_id", "pickup_point")
    order_by = "id"


class FeeStructureView(SimpleTableView):
    table = "portal_fee_structure"
    columns = ("class_id", "term_name", "tuition_fee", "transport_fee", "hostel_fee", "total_amount")
    order_by = "class_id"


class PaymentListView(AdminMixin, APIView):
    def get(self, request):
        if not table_exists("portal_payment"):
            return Response([])
        data = rows(
            """
            SELECT p.id, p.transaction_id, p.amount_paid, p.status, p.paid_at,
                   COALESCE(u.first_name || ' ' || u.last_name, u.username) AS student_name,
                   fs.term_name
            FROM portal_payment p
            JOIN auth_user u ON u.id = p.student_id
            JOIN portal_fee_structure fs ON fs.id = p.fee_structure_id
            ORDER BY p.paid_at DESC LIMIT 200
            """
        )
        return Response(serialise(data))


# ---------------------------------------------------------------------------
# Library — barcode lookup, issue/return with automatic fine calculation
# ---------------------------------------------------------------------------
FINE_PER_DAY = 5  # rupees/day late, beyond due_date


class LibraryBookView(SimpleTableView):
    table = "portal_book"
    columns = ("title", "author", "isbn", "barcode_id", "quantity", "available_quantity", "book_type", "digital_file_url")
    order_by = "title"

    def get(self, request):
        barcode = request.query_params.get("barcode")
        if barcode:
            if not table_exists("portal_book"):
                return Response(None)
            book = row("SELECT * FROM portal_book WHERE barcode_id=%s OR isbn=%s", [barcode, barcode])
            return Response(serialise(book))
        return super().get(request)


class LibraryIssueView(AdminMixin, APIView):
    def post(self, request):
        if not table_exists("portal_library_transaction"):
            return Response({"detail": "Portal schema has not been applied."}, status=400)
        book_id = request.data.get("book_id")
        borrower_id = request.data.get("borrower_id")
        days = int(request.data.get("loan_days", 14))
        book = row("SELECT available_quantity FROM portal_book WHERE id=%s", [book_id])
        if not book or book["available_quantity"] < 1:
            return Response({"detail": "No copies available."}, status=400)
        due = date.today() + timedelta(days=days)
        with connection.cursor() as cursor:
            cursor.execute(
                "INSERT INTO portal_library_transaction (book_id, borrower_id, due_date) VALUES (%s,%s,%s) RETURNING id",
                [book_id, borrower_id, due],
            )
            tid = cursor.fetchone()[0]
            cursor.execute("UPDATE portal_book SET available_quantity = available_quantity - 1 WHERE id=%s", [book_id])
        log_action(request.user, "library.issue", "book", book_id, {"borrower_id": borrower_id, "due_date": str(due)})
        return Response({"id": tid, "due_date": due.isoformat(), "detail": "Book issued."})


class LibraryReturnView(AdminMixin, APIView):
    def post(self, request, transaction_id):
        if not table_exists("portal_library_transaction"):
            return Response({"detail": "Portal schema has not been applied."}, status=400)
        txn = row("SELECT book_id, due_date, return_date FROM portal_library_transaction WHERE id=%s", [transaction_id])
        if not txn:
            return Response({"detail": "Transaction not found."}, status=404)
        if txn["return_date"]:
            return Response({"detail": "Already returned."}, status=400)
        today = date.today()
        late_days = max(0, (today - txn["due_date"]).days)
        fine = late_days * FINE_PER_DAY
        with connection.cursor() as cursor:
            cursor.execute(
                "UPDATE portal_library_transaction SET return_date=%s, fine_amount=%s WHERE id=%s",
                [today, fine, transaction_id],
            )
            cursor.execute("UPDATE portal_book SET available_quantity = available_quantity + 1 WHERE id=%s", [txn["book_id"]])
        log_action(request.user, "library.return", "transaction", transaction_id, {"fine": fine})
        return Response({"detail": "Book returned.", "late_days": late_days, "fine_amount": fine})


# ---------------------------------------------------------------------------
# Notices (broadcast) — reuses portal_notification
# ---------------------------------------------------------------------------
class NoticeBroadcastView(AdminMixin, APIView):
    def get(self, request):
        if not table_exists("portal_notification"):
            return Response([])
        return Response(serialise(rows("SELECT * FROM portal_notification ORDER BY created_at DESC LIMIT 100")))

    def post(self, request):
        if not table_exists("portal_notification"):
            return Response({"detail": "Portal schema has not been applied."}, status=400)
        d = request.data
        with connection.cursor() as cursor:
            cursor.execute(
                "INSERT INTO portal_notification (sender_id, recipient_type, target_class_id, title, message) "
                "VALUES (%s,%s,%s,%s,%s) RETURNING id",
                [request.user.id, d.get("recipient_type", "All"), d.get("target_class_id"), d.get("title"), d.get("message")],
            )
            nid = cursor.fetchone()[0]
        log_action(request.user, "notice.broadcast", "notification", nid, {"recipient_type": d.get("recipient_type", "All")})
        return Response({"id": nid, "detail": "Notice sent."})


# ---------------------------------------------------------------------------
# Leave approvals (all staff/student leave requests, Admin can approve/reject)
# ---------------------------------------------------------------------------
class LeaveApprovalListView(AdminMixin, APIView):
    def get(self, request):
        if not table_exists("portal_leave"):
            return Response([])
        status_filter = request.query_params.get("status", "Pending")
        data = rows(
            """
            SELECT l.id, l.leave_type, l.start_date, l.end_date, l.reason, l.status,
                   COALESCE(u.first_name || ' ' || u.last_name, u.username) AS applicant_name
            FROM portal_leave l JOIN auth_user u ON u.id = l.user_id
            WHERE (%s = '' OR l.status = %s) ORDER BY l.start_date DESC
            """,
            [status_filter or "", status_filter or ""],
        )
        return Response(serialise(data))

    def post(self, request, leave_id):
        if not table_exists("portal_leave"):
            return Response({"detail": "Portal schema has not been applied."}, status=400)
        decision = request.data.get("decision")
        if decision not in ("Approved", "Rejected"):
            return Response({"detail": "decision must be Approved or Rejected."}, status=400)
        with connection.cursor() as cursor:
            cursor.execute(
                "UPDATE portal_leave SET status=%s, approved_by=%s WHERE id=%s",
                [decision, request.user.id, leave_id],
            )
        log_action(request.user, "leave.decide", "leave", leave_id, {"decision": decision})
        return Response({"detail": f"Leave {decision.lower()}."})


# ---------------------------------------------------------------------------
# Reports / analytics (basic)
# ---------------------------------------------------------------------------
class ReportsView(AdminMixin, APIView):
    def get(self, request):
        report = {}
        if table_exists("portal_attendance"):
            report["attendance_by_class"] = rows(
                """
                SELECT c.name || '-' || c.section AS class_name,
                       ROUND(AVG(CASE WHEN a.status='Present' THEN 100 ELSE 0 END), 1) AS attendance_pct
                FROM portal_attendance a JOIN portal_class c ON c.id = a.class_id
                GROUP BY c.name, c.section ORDER BY c.name
                """
            )
        if table_exists("portal_payment"):
            report["fee_collection_by_month"] = rows(
                """
                SELECT to_char(paid_at, 'YYYY-MM') AS month, SUM(amount_paid)::float AS total
                FROM portal_payment WHERE status='Success'
                GROUP BY month ORDER BY month DESC LIMIT 12
                """
            )
        if table_exists("portal_result"):
            report["average_marks_by_subject"] = rows(
                """
                SELECT s.name AS subject_name, ROUND(AVG(r.marks_obtained), 1) AS average_marks
                FROM portal_result r
                JOIN portal_exam_schedule e ON e.id = r.exam_schedule_id
                JOIN portal_subject s ON s.id = e.subject_id
                GROUP BY s.name ORDER BY s.name
                """
            )
        return Response(serialise(report))


# ---------------------------------------------------------------------------
# Audit log (read-only view of every admin write above)
# ---------------------------------------------------------------------------
class AuditLogListView(AdminMixin, APIView):
    def get(self, request):
        if not table_exists("portal_audit_log"):
            return Response([])
        data = rows(
            """
            SELECT a.id, a.action, a.target_type, a.target_id, a.details, a.created_at,
                   COALESCE(u.first_name || ' ' || u.last_name, u.username, 'System') AS actor_name
            FROM portal_audit_log a LEFT JOIN auth_user u ON u.id = a.actor_id
            ORDER BY a.created_at DESC LIMIT 300
            """
        )
        return Response(serialise(data))


# ---------------------------------------------------------------------------
# Basic data export — a pragmatic stand-in for the "Backup" module. This is
# NOT a substitute for real automated, encrypted, offsite daily backups
# (see the security notes for that); it just lets an admin download a JSON
# snapshot of the operational tables on demand.
# ---------------------------------------------------------------------------
EXPORT_TABLES = [
    "portal_class", "portal_subject", "portal_student_profile", "portal_teacher_profile",
    "portal_parent_profile", "portal_employee", "portal_fee_structure", "portal_payment",
    "portal_book", "portal_library_transaction", "portal_vehicle", "portal_route",
    "portal_student_enrollment", "portal_exam_schedule", "portal_result", "portal_hall_ticket",
    "portal_hostel", "portal_room", "portal_hostel_allocation", "portal_inventory",
    "portal_visitor_log", "portal_alumni", "portal_medical_log",
    "portal_course", "portal_course_content", "portal_quiz", "portal_quiz_question",
    "portal_assignment", "portal_assignment_submission", "portal_forum_topic",
    "portal_forum_post", "portal_digital_note", "portal_course_progress",
    "portal_payroll_record", "portal_audit_log",
]


class BackupExportView(AdminMixin, APIView):
    def get(self, request):
        snapshot = {}
        for t in EXPORT_TABLES:
            if table_exists(t):
                snapshot[t] = rows(f"SELECT * FROM {t}")
        log_action(request.user, "backup.export", "database", "-", {"tables": list(snapshot.keys())})
        return Response(serialise({"generated_at": date.today().isoformat(), "tables": snapshot}))


class ClassEnrollmentView(AdminMixin, APIView):
    def get(self, request):
        if not table_exists("portal_student_enrollment"):
            return Response([])
        data = rows(
            """
            SELECT se.id, se.student_id, u.username AS student_username,
                   COALESCE(u.first_name || ' ' || u.last_name, u.username) AS student_name,
                   se.class_id, c.name || '-' || c.section AS class_name,
                   se.academic_year, se.roll_number
            FROM portal_student_enrollment se
            JOIN auth_user u ON u.id = se.student_id
            JOIN portal_class c ON c.id = se.class_id
            ORDER BY class_name, se.roll_number
            """
        )
        return Response(serialise(data))

    def post(self, request):
        d = request.data
        student_id = d.get("student_id")
        class_id = d.get("class_id")
        roll_number = d.get("roll_number")
        academic_year = d.get("academic_year", "2025-26")

        if not student_id or not class_id:
            return Response({"detail": "student_id and class_id are required."}, status=400)

        with connection.cursor() as cursor:
            # Check if student is already enrolled in this class for the academic year
            cursor.execute(
                "SELECT id FROM portal_student_enrollment WHERE student_id=%s AND class_id=%s AND academic_year=%s",
                [student_id, class_id, academic_year]
            )
            if cursor.fetchone():
                return Response({"detail": "Student already enrolled in this class for the selected academic year."}, status=400)

            cursor.execute(
                "INSERT INTO portal_student_enrollment (student_id, class_id, academic_year, roll_number) "
                "VALUES (%s,%s,%s,%s) RETURNING id",
                [student_id, class_id, academic_year, roll_number]
            )
            new_id = cursor.fetchone()[0]

        log_action(request.user, "student_enrollment.create", "portal_student_enrollment", new_id, d)
        return Response({"id": new_id, "detail": "Student enrolled successfully."})


class ClassTeacherAssignView(AdminMixin, APIView):
    def get(self, request):
        if not table_exists("portal_class_teacher"):
            return Response([])
        data = rows(
            """
            SELECT ct.class_id, c.name || '-' || c.section AS class_name,
                   ct.teacher_id, COALESCE(u.first_name || ' ' || u.last_name, u.username) AS teacher_name,
                   (
                       SELECT COALESCE(json_agg(json_build_object('id', s.id, 'name', s.name)), '[]'::json)
                       FROM portal_academic_allocation aa
                       JOIN portal_subject s ON s.id = aa.subject_id
                       WHERE aa.class_id = ct.class_id AND aa.teacher_id = ct.teacher_id
                   ) AS assigned_subjects
            FROM portal_class_teacher ct
            JOIN portal_class c ON c.id = ct.class_id
            JOIN auth_user u ON u.id = ct.teacher_id
            ORDER BY class_name
            """
        )
        return Response(serialise(data))

    def post(self, request):
        d = request.data
        class_id = d.get("class_id")
        teacher_id = d.get("teacher_id")
        subject_id = d.get("subject_id")

        if not class_id or not teacher_id:
            return Response({"detail": "class_id and teacher_id are required."}, status=400)

        with connection.cursor() as cursor:
            cursor.execute(
                "INSERT INTO portal_class_teacher (class_id, teacher_id) VALUES (%s,%s) "
                "ON CONFLICT (class_id) DO UPDATE SET teacher_id = EXCLUDED.teacher_id",
                [class_id, teacher_id]
            )
            if subject_id:
                cursor.execute(
                    "INSERT INTO portal_academic_allocation (class_id, subject_id, teacher_id) VALUES (%s,%s,%s) "
                    "ON CONFLICT (class_id, subject_id, teacher_id) DO NOTHING",
                    [class_id, subject_id, teacher_id]
                )
        log_action(request.user, "class_teacher.assign", "portal_class_teacher", class_id, d)
        return Response({"detail": "Class teacher and subject assigned successfully."})


class AdminLmsAnalyticsView(AdminMixin, APIView):
    def get(self, request):
        if not table_exists("portal_course_content"):
            return Response({"uploads": [], "stats": {}})
            
        # Recent uploads
        uploads = rows(
            """
            SELECT cc.id, cc.title, cc.content_type, cc.uploaded_at,
                   c.title AS course_title, cl.name || '-' || cl.section AS class_name, s.name AS subject_name,
                   COALESCE(u.first_name || ' ' || u.last_name, u.username) AS teacher_name
            FROM portal_course_content cc
            JOIN portal_course c ON c.id = cc.course_id
            JOIN portal_class cl ON cl.id = c.class_id
            JOIN portal_subject s ON s.id = c.subject_id
            LEFT JOIN portal_academic_allocation aa ON aa.class_id = c.class_id AND aa.subject_id = c.subject_id
            LEFT JOIN auth_user u ON u.id = aa.teacher_id
            ORDER BY cc.uploaded_at DESC LIMIT 50
            """
        )
        
        # Statistics
        total_courses = row("SELECT COUNT(*)::int AS c FROM portal_course")["c"]
        total_chapters = row("SELECT COUNT(*)::int AS c FROM portal_chapter")["c"] if table_exists("portal_chapter") else 0
        total_lessons = row("SELECT COUNT(*)::int AS c FROM portal_lesson")["c"] if table_exists("portal_lesson") else 0
        total_resources = row("SELECT COUNT(*)::int AS c FROM portal_course_content")["c"]
        
        resources_by_type = rows(
            """
            SELECT content_type AS type, COUNT(*)::int AS count
            FROM portal_course_content GROUP BY content_type
            """
        )
        
        # Estimated storage (each resource is ~2.4MB on average, simulated metrics)
        file_count = row("SELECT COUNT(*)::int AS c FROM portal_course_content WHERE content_type IN ('PDF', 'PPT', 'DOC', 'Image', 'Audio', 'PDF_Notes')")["c"]
        estimated_storage_mb = round(file_count * 2.4, 2)
        
        return Response(serialise({
            "uploads": uploads,
            "stats": {
                "total_courses": total_courses,
                "total_chapters": total_chapters,
                "total_lessons": total_lessons,
                "total_resources": total_resources,
                "estimated_storage_mb": estimated_storage_mb,
                "resources_by_type": {r["type"]: r["count"] for r in resources_by_type}
            }
        }))
        
    def delete(self, request):
        resource_id = request.query_params.get("id")
        if not resource_id:
            return Response({"detail": "id parameter required."}, status=400)
            
        with connection.cursor() as cursor:
            # Clean up associated Quiz or Assignment if referenced
            ref = row("SELECT quiz_id, assignment_id FROM portal_course_content WHERE id=%s", [resource_id])
            cursor.execute("DELETE FROM portal_course_content WHERE id=%s", [resource_id])
            if ref:
                if ref.get("quiz_id"):
                    cursor.execute("DELETE FROM portal_quiz WHERE id=%s", [ref["quiz_id"]])
                if ref.get("assignment_id"):
                    cursor.execute("DELETE FROM portal_assignment WHERE id=%s", [ref["assignment_id"]])
                    
        log_action(request.user, "lms_resource.delete", "portal_course_content", resource_id, {"id": resource_id})
        return Response({"detail": "Resource deleted."})

