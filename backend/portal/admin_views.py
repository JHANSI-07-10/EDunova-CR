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
        pending_admissions = AdmissionEnquiry.objects.exclude(status__in=["Confirmed", "Rejected"]).count()
        
        try:
            with connection.cursor() as cursor:
                cursor.execute("""
                    SELECT 
                        (SELECT COUNT(*)::int FROM portal_student_profile) AS students,
                        (SELECT COUNT(*)::int FROM portal_teacher_profile) AS teachers,
                        (SELECT COUNT(*)::int FROM portal_parent_profile) AS parents,
                        (SELECT COUNT(*)::int FROM portal_employee) AS employees,
                        (SELECT COUNT(*)::int FROM portal_leave WHERE status='Pending') AS leaves,
                        (SELECT COALESCE(SUM(amount_paid), 0)::float FROM portal_payment WHERE status='Success' AND date_trunc('month', paid_at) = date_trunc('month', now())) AS fees,
                        (SELECT COUNT(*)::int FROM portal_library_transaction WHERE return_date IS NULL) AS library
                """)
                counts = cursor.fetchone()
                total_students = counts[0]
                total_teachers = counts[1]
                total_parents = counts[2]
                total_employees = counts[3]
                open_leaves = counts[4]
                fee_collected_month = counts[5]
                library_out = counts[6]
        except Exception:
            def count(table, where=""):
                if not table_exists(table):
                    return 0
                r = row(f"SELECT COUNT(*)::int AS c FROM {table} {where}")
                return r["c"] if r else 0

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
        
        user_types = {}
        if table_exists("portal_user_profile"):
            with connection.cursor() as cursor:
                cursor.execute("SELECT user_id, user_type FROM portal_user_profile")
                for uid, utype in cursor.fetchall():
                    user_types[uid] = utype
                    
        data = []
        for u in users:
            role = user_types.get(u.id) or get_role(u)
            data.append({
                "id": u.id,
                "username": u.username,
                "email": u.email,
                "name": u.get_full_name() or u.username,
                "is_active": u.is_active,
                "date_joined": u.date_joined,
                "role": role
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
            try:
                from .services.email_service import send_account_status_email
                send_account_status_email(target, target.is_active)
            except Exception:
                import logging
                logging.getLogger(__name__).exception("Failed to send status toggle email")
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

    def get(self, request):
        if not table_exists(self.table):
            return Response([])
        # Optional: return enriched list with student/teacher counts
        data = rows(
            """
            SELECT c.id, c.name, c.section, c.curriculum, c.room_number,
                   (SELECT COUNT(*)::int FROM portal_student_enrollment se WHERE se.class_id=c.id) AS enrolled_students,
                   (SELECT COUNT(DISTINCT ct.teacher_id)::int FROM portal_class_teacher ct WHERE ct.class_id=c.id) AS assigned_teachers
            FROM portal_class c ORDER BY c.name, c.section
            """
        ) if table_exists("portal_student_enrollment") and table_exists("portal_class_teacher") else \
        rows(f"SELECT * FROM {self.table} ORDER BY {self.order_by}")
        return Response(serialise(data))

    def post(self, request):
        if not table_exists(self.table):
            return Response({"detail": "Table not found. Apply the schema extension SQL first."}, status=400)
        name = request.data.get("name", "").strip()
        section = request.data.get("section", "").strip()
        curriculum = request.data.get("curriculum", "CBSE")
        room_number = request.data.get("room_number", "")
        if not name or not section:
            return Response({"detail": "Class name and section are required."}, status=400)
        with connection.cursor() as cursor:
            cursor.execute(
                "INSERT INTO portal_class (name, section, curriculum, room_number) VALUES (%s,%s,%s,%s) RETURNING id",
                [name, section, curriculum, room_number]
            )
            new_id = cursor.fetchone()[0]
        log_action(request.user, "portal_class.create", self.table, new_id,
                   {"name": name, "section": section, "curriculum": curriculum, "room_number": room_number})
        return Response({
            "id": new_id,
            "name": name,
            "section": section,
            "curriculum": curriculum,
            "room_number": room_number,
            "enrolled_students": 0,
            "assigned_teachers": 0,
            "detail": "Class created."
        }, status=201)


class SubjectView(SimpleTableView):
    table = "portal_subject"
    columns = ("name", "subject_code", "type")
    order_by = "name"


class VehicleView(AdminMixin, APIView):
    """
    GET  — list all vehicles with driver name joined
    POST — add a new vehicle
    PATCH — update vehicle (body must include id)
    DELETE ?id= — remove vehicle
    """

    def get(self, request):
        if not table_exists("portal_vehicle"):
            return Response([])
        return Response(serialise(rows(
            """
            SELECT v.id, v.vehicle_number, v.capacity, v.gps_device_id, v.maintenance_status,
                   v.driver_id,
                   COALESCE(u.first_name || ' ' || u.last_name, u.username) AS driver_name,
                   d.phone AS driver_phone, d.license_number,
                   v.driver_id IS NOT NULL AS has_driver
            FROM portal_vehicle v
            LEFT JOIN portal_transport_driver d ON d.vehicle_id = v.id
            LEFT JOIN auth_user u ON u.id = v.driver_id
            ORDER BY v.vehicle_number
            """
        )))

    def post(self, request):
        if not table_exists("portal_vehicle"):
            return Response({"detail": "Portal schema not applied."}, status=400)
        d = request.data
        vnum = (d.get("vehicle_number") or "").strip()
        if not vnum:
            return Response({"detail": "vehicle_number is required."}, status=400)
        with connection.cursor() as cur:
            cur.execute(
                "INSERT INTO portal_vehicle (vehicle_number, capacity, driver_id, gps_device_id, maintenance_status) "
                "VALUES (%s,%s,%s,%s,%s) RETURNING id",
                [vnum, d.get("capacity") or None, d.get("driver_id") or None,
                 d.get("gps_device_id") or None, d.get("maintenance_status", "Active")],
            )
            new_id = cur.fetchone()[0]
        log_action(request.user, "transport.vehicle.create", "portal_vehicle", new_id, {"vehicle_number": vnum})
        return Response({"id": new_id, "detail": "Vehicle added."}, status=201)

    def patch(self, request):
        if not table_exists("portal_vehicle"):
            return Response({"detail": "Portal schema not applied."}, status=400)
        d = request.data
        vid = d.get("id")
        if not vid:
            return Response({"detail": "id is required."}, status=400)
        with connection.cursor() as cur:
            cur.execute(
                "UPDATE portal_vehicle SET vehicle_number=%s, capacity=%s, driver_id=%s, "
                "gps_device_id=%s, maintenance_status=%s WHERE id=%s",
                [d.get("vehicle_number"), d.get("capacity") or None,
                 d.get("driver_id") or None, d.get("gps_device_id") or None,
                 d.get("maintenance_status", "Active"), vid],
            )
        log_action(request.user, "transport.vehicle.update", "portal_vehicle", vid, dict(d))
        return Response({"detail": "Vehicle updated."})

    def delete(self, request):
        vid = request.query_params.get("id")
        if not vid:
            return Response({"detail": "id required."}, status=400)
        with connection.cursor() as cur:
            cur.execute("DELETE FROM portal_vehicle WHERE id=%s", [vid])
        log_action(request.user, "transport.vehicle.delete", "portal_vehicle", vid, {})
        return Response({"detail": "Vehicle deleted."})


class RouteView(AdminMixin, APIView):
    """
    GET  — list routes with vehicle & attendant names + stop counts
    POST — create route
    PATCH — update route (body must include id)
    DELETE ?id= — remove route
    """

    def get(self, request):
        if not table_exists("portal_route"):
            return Response([])
        return Response(serialise(rows(
            """
            SELECT r.id, r.route_name, r.start_point, r.end_point,
                   r.vehicle_id, v.vehicle_number,
                   r.attendant_id,
                   COALESCE(au.first_name || ' ' || au.last_name, au.username) AS attendant_name,
                   (SELECT COUNT(*)::int FROM portal_pickup_point pp WHERE pp.route_id = r.id) AS stop_count
            FROM portal_route r
            LEFT JOIN portal_vehicle v ON v.id = r.vehicle_id
            LEFT JOIN portal_transport_attendant a ON a.id = r.attendant_id
            LEFT JOIN auth_user au ON au.id = a.user_id
            ORDER BY r.route_name
            """
        )))

    def post(self, request):
        if not table_exists("portal_route"):
            return Response({"detail": "Portal schema not applied."}, status=400)
        d = request.data
        name = (d.get("route_name") or "").strip()
        if not name:
            return Response({"detail": "route_name is required."}, status=400)
        with connection.cursor() as cur:
            cur.execute(
                "INSERT INTO portal_route (route_name, start_point, end_point, vehicle_id, attendant_id) "
                "VALUES (%s,%s,%s,%s,%s) RETURNING id",
                [name, d.get("start_point", ""), d.get("end_point", ""),
                 d.get("vehicle_id") or None, d.get("attendant_id") or None],
            )
            new_id = cur.fetchone()[0]
        log_action(request.user, "transport.route.create", "portal_route", new_id, {"route_name": name})
        return Response({"id": new_id, "detail": "Route created."}, status=201)

    def patch(self, request):
        if not table_exists("portal_route"):
            return Response({"detail": "Portal schema not applied."}, status=400)
        d = request.data
        rid = d.get("id")
        if not rid:
            return Response({"detail": "id is required."}, status=400)
        with connection.cursor() as cur:
            cur.execute(
                "UPDATE portal_route SET route_name=%s, start_point=%s, end_point=%s, "
                "vehicle_id=%s, attendant_id=%s WHERE id=%s",
                [d.get("route_name"), d.get("start_point", ""), d.get("end_point", ""),
                 d.get("vehicle_id") or None, d.get("attendant_id") or None, rid],
            )
        log_action(request.user, "transport.route.update", "portal_route", rid, dict(d))
        return Response({"detail": "Route updated."})

    def delete(self, request):
        rid = request.query_params.get("id")
        if not rid:
            return Response({"detail": "id required."}, status=400)
        with connection.cursor() as cur:
            cur.execute("DELETE FROM portal_route WHERE id=%s", [rid])
        log_action(request.user, "transport.route.delete", "portal_route", rid, {})
        return Response({"detail": "Route deleted."})


class TransportAllocationView(AdminMixin, APIView):
    """
    GET  — list all allocations with student name, route name, vehicle number
    POST — allocate (upsert — one route per student)
    DELETE ?student_id= — remove allocation
    """

    def get(self, request):
        if not table_exists("portal_transport_allocation"):
            return Response([])
        return Response(serialise(rows(
            """
            SELECT ta.id, ta.student_id, ta.vehicle_id, ta.route_id, ta.pickup_point,
                   COALESCE(u.first_name || ' ' || u.last_name, u.username) AS student_name,
                   u.username AS student_username,
                   r.route_name, v.vehicle_number,
                   tp.pass_number, tp.is_active AS pass_active
            FROM portal_transport_allocation ta
            JOIN auth_user u ON u.id = ta.student_id
            JOIN portal_route r ON r.id = ta.route_id
            JOIN portal_vehicle v ON v.id = ta.vehicle_id
            LEFT JOIN portal_transport_pass tp ON tp.student_id = ta.student_id
            ORDER BY u.first_name, u.last_name
            """
        )))

    def post(self, request):
        if not table_exists("portal_transport_allocation"):
            return Response({"detail": "Portal schema not applied."}, status=400)
        d = request.data
        sid = d.get("student_id")
        vid = d.get("vehicle_id")
        rid = d.get("route_id")
        if not sid or not vid or not rid:
            return Response({"detail": "student_id, vehicle_id, and route_id are required."}, status=400)
        with connection.cursor() as cur:
            cur.execute(
                "INSERT INTO portal_transport_allocation (student_id, vehicle_id, route_id, pickup_point) "
                "VALUES (%s,%s,%s,%s) ON CONFLICT (student_id) DO UPDATE SET "
                "vehicle_id=EXCLUDED.vehicle_id, route_id=EXCLUDED.route_id, pickup_point=EXCLUDED.pickup_point "
                "RETURNING id",
                [sid, vid, rid, d.get("pickup_point", "")],
            )
            alloc_id = cur.fetchone()[0]
        log_action(request.user, "transport.allocate", "portal_transport_allocation", alloc_id,
                   {"student_id": sid, "vehicle_id": vid, "route_id": rid})
        return Response({"id": alloc_id, "detail": "Student allocated to bus route."}, status=201)

    def delete(self, request):
        sid = request.query_params.get("student_id")
        if not sid:
            return Response({"detail": "student_id required."}, status=400)
        with connection.cursor() as cur:
            cur.execute("DELETE FROM portal_transport_allocation WHERE student_id=%s", [sid])
        log_action(request.user, "transport.deallocate", "portal_transport_allocation", sid, {})
        return Response({"detail": "Allocation removed."})


# ---------------------------------------------------------------------------
# Transport Drivers
# ---------------------------------------------------------------------------
class DriverView(AdminMixin, APIView):
    """CRUD for portal_transport_driver."""

    def get(self, request):
        if not table_exists("portal_transport_driver"):
            return Response([])
        return Response(serialise(rows(
            """
            SELECT d.id, d.user_id, d.license_number, d.phone, d.vehicle_id, d.is_active,
                   COALESCE(u.first_name || ' ' || u.last_name, u.username) AS name,
                   v.vehicle_number
            FROM portal_transport_driver d
            JOIN auth_user u ON u.id = d.user_id
            LEFT JOIN portal_vehicle v ON v.id = d.vehicle_id
            ORDER BY name
            """
        )))

    def post(self, request):
        if not table_exists("portal_transport_driver"):
            return Response({"detail": "Portal schema not applied."}, status=400)
        d = request.data
        uid = d.get("user_id")
        if not uid:
            return Response({"detail": "user_id is required."}, status=400)
        with connection.cursor() as cur:
            cur.execute(
                "INSERT INTO portal_transport_driver (user_id, license_number, phone, vehicle_id) "
                "VALUES (%s,%s,%s,%s) ON CONFLICT (user_id) DO UPDATE SET "
                "license_number=EXCLUDED.license_number, phone=EXCLUDED.phone, vehicle_id=EXCLUDED.vehicle_id "
                "RETURNING id",
                [uid, d.get("license_number", ""), d.get("phone", ""), d.get("vehicle_id") or None],
            )
            new_id = cur.fetchone()[0]
        log_action(request.user, "transport.driver.upsert", "portal_transport_driver", new_id, dict(d))
        return Response({"id": new_id, "detail": "Driver saved."}, status=201)

    def patch(self, request):
        if not table_exists("portal_transport_driver"):
            return Response({"detail": "Portal schema not applied."}, status=400)
        d = request.data
        did = d.get("id")
        if not did:
            return Response({"detail": "id is required."}, status=400)
        with connection.cursor() as cur:
            cur.execute(
                "UPDATE portal_transport_driver SET license_number=%s, phone=%s, vehicle_id=%s, is_active=%s WHERE id=%s",
                [d.get("license_number", ""), d.get("phone", ""), d.get("vehicle_id") or None,
                 d.get("is_active", True), did],
            )
        log_action(request.user, "transport.driver.update", "portal_transport_driver", did, dict(d))
        return Response({"detail": "Driver updated."})


# ---------------------------------------------------------------------------
# Transport Attendants
# ---------------------------------------------------------------------------
class AttendantView(AdminMixin, APIView):
    """CRUD for portal_transport_attendant."""

    def get(self, request):
        if not table_exists("portal_transport_attendant"):
            return Response([])
        return Response(serialise(rows(
            """
            SELECT a.id, a.user_id, a.phone, a.assigned_route_id, a.is_active,
                   COALESCE(u.first_name || ' ' || u.last_name, u.username) AS name,
                   r.route_name
            FROM portal_transport_attendant a
            JOIN auth_user u ON u.id = a.user_id
            LEFT JOIN portal_route r ON r.id = a.assigned_route_id
            ORDER BY name
            """
        )))

    def post(self, request):
        if not table_exists("portal_transport_attendant"):
            return Response({"detail": "Portal schema not applied."}, status=400)
        d = request.data
        uid = d.get("user_id")
        if not uid:
            return Response({"detail": "user_id is required."}, status=400)
        with connection.cursor() as cur:
            cur.execute(
                "INSERT INTO portal_transport_attendant (user_id, phone, assigned_route_id) "
                "VALUES (%s,%s,%s) ON CONFLICT (user_id) DO UPDATE SET "
                "phone=EXCLUDED.phone, assigned_route_id=EXCLUDED.assigned_route_id RETURNING id",
                [uid, d.get("phone", ""), d.get("assigned_route_id") or None],
            )
            new_id = cur.fetchone()[0]
        log_action(request.user, "transport.attendant.upsert", "portal_transport_attendant", new_id, dict(d))
        return Response({"id": new_id, "detail": "Attendant saved."}, status=201)

    def patch(self, request):
        if not table_exists("portal_transport_attendant"):
            return Response({"detail": "Portal schema not applied."}, status=400)
        d = request.data
        aid = d.get("id")
        if not aid:
            return Response({"detail": "id is required."}, status=400)
        with connection.cursor() as cur:
            cur.execute(
                "UPDATE portal_transport_attendant SET phone=%s, assigned_route_id=%s, is_active=%s WHERE id=%s",
                [d.get("phone", ""), d.get("assigned_route_id") or None, d.get("is_active", True), aid],
            )
        log_action(request.user, "transport.attendant.update", "portal_transport_attendant", aid, dict(d))
        return Response({"detail": "Attendant updated."})


# ---------------------------------------------------------------------------
# Pickup / Drop Points
# ---------------------------------------------------------------------------
class PickupPointView(AdminMixin, APIView):
    """GET ?route_id=  POST  PATCH  DELETE ?id="""

    def get(self, request):
        if not table_exists("portal_pickup_point"):
            return Response([])
        route_id = request.query_params.get("route_id")
        sql = "SELECT * FROM portal_pickup_point"
        params = []
        if route_id:
            sql += " WHERE route_id=%s"
            params.append(route_id)
        sql += " ORDER BY route_id, sequence_order"
        return Response(serialise(rows(sql, params)))

    def post(self, request):
        if not table_exists("portal_pickup_point"):
            return Response({"detail": "Portal schema not applied."}, status=400)
        d = request.data
        rid = d.get("route_id")
        name = (d.get("name") or "").strip()
        if not rid or not name:
            return Response({"detail": "route_id and name are required."}, status=400)
        with connection.cursor() as cur:
            cur.execute(
                "INSERT INTO portal_pickup_point (route_id, name, sequence_order, pickup_time, drop_time) "
                "VALUES (%s,%s,%s,%s,%s) ON CONFLICT (route_id, name) DO UPDATE SET "
                "sequence_order=EXCLUDED.sequence_order, pickup_time=EXCLUDED.pickup_time, drop_time=EXCLUDED.drop_time "
                "RETURNING id",
                [rid, name, d.get("sequence_order", 1), d.get("pickup_time") or None, d.get("drop_time") or None],
            )
            new_id = cur.fetchone()[0]
        log_action(request.user, "transport.stop.create", "portal_pickup_point", new_id, dict(d))
        return Response({"id": new_id, "detail": "Stop saved."}, status=201)

    def patch(self, request):
        if not table_exists("portal_pickup_point"):
            return Response({"detail": "Portal schema not applied."}, status=400)
        d = request.data
        pid = d.get("id")
        if not pid:
            return Response({"detail": "id is required."}, status=400)
        with connection.cursor() as cur:
            cur.execute(
                "UPDATE portal_pickup_point SET name=%s, sequence_order=%s, pickup_time=%s, drop_time=%s WHERE id=%s",
                [d.get("name"), d.get("sequence_order", 1), d.get("pickup_time") or None, d.get("drop_time") or None, pid],
            )
        log_action(request.user, "transport.stop.update", "portal_pickup_point", pid, dict(d))
        return Response({"detail": "Stop updated."})

    def delete(self, request):
        pid = request.query_params.get("id")
        if not pid:
            return Response({"detail": "id required."}, status=400)
        with connection.cursor() as cur:
            cur.execute("DELETE FROM portal_pickup_point WHERE id=%s", [pid])
        log_action(request.user, "transport.stop.delete", "portal_pickup_point", pid, {})
        return Response({"detail": "Stop deleted."})


# ---------------------------------------------------------------------------
# Transport Pass
# ---------------------------------------------------------------------------
import uuid as _uuid

class TransportPassView(AdminMixin, APIView):
    """
    GET ?student_id=  — get the pass for a student
    POST {student_id} — generate or regenerate pass
    DELETE ?student_id= — deactivate pass
    """

    def get(self, request):
        if not table_exists("portal_transport_pass"):
            return Response([])
        sid = request.query_params.get("student_id")
        if sid:
            data = row("SELECT * FROM portal_transport_pass WHERE student_id=%s", [sid])
            return Response(serialise(data))
        return Response(serialise(rows(
            """
            SELECT tp.*, COALESCE(u.first_name || ' ' || u.last_name, u.username) AS student_name
            FROM portal_transport_pass tp JOIN auth_user u ON u.id = tp.student_id
            ORDER BY tp.issued_at DESC
            """
        )))

    def post(self, request):
        if not table_exists("portal_transport_pass"):
            return Response({"detail": "Portal schema not applied."}, status=400)
        d = request.data
        sid = d.get("student_id")
        if not sid:
            return Response({"detail": "student_id is required."}, status=400)
        pass_number = f"TRP-{_uuid.uuid4().hex[:8].upper()}"
        with connection.cursor() as cur:
            cur.execute(
                "INSERT INTO portal_transport_pass (student_id, pass_number, valid_until, is_active) "
                "VALUES (%s,%s,%s,true) ON CONFLICT (student_id) DO UPDATE SET "
                "pass_number=%s, issued_at=CURRENT_DATE, valid_until=EXCLUDED.valid_until, is_active=true "
                "RETURNING id, pass_number",
                [sid, pass_number, d.get("valid_until") or None, pass_number],
            )
            pid, pnum = cur.fetchone()
        log_action(request.user, "transport.pass.generate", "portal_transport_pass", pid,
                   {"student_id": sid, "pass_number": pnum})
        return Response({"id": pid, "pass_number": pnum, "detail": "Transport pass generated."}, status=201)

    def delete(self, request):
        sid = request.query_params.get("student_id")
        if not sid:
            return Response({"detail": "student_id required."}, status=400)
        with connection.cursor() as cur:
            cur.execute("UPDATE portal_transport_pass SET is_active=false WHERE student_id=%s", [sid])
        log_action(request.user, "transport.pass.deactivate", "portal_transport_pass", sid, {})
        return Response({"detail": "Pass deactivated."})


# ---------------------------------------------------------------------------
# Trip Log
# ---------------------------------------------------------------------------
class TripLogView(AdminMixin, APIView):
    """
    GET ?date=YYYY-MM-DD  — list trips for a date (today if omitted)
    POST {vehicle_id, route_id} — start a trip
    PATCH {id, status, notes?} — update trip (mark In Progress / Completed / Cancelled)
    """

    def get(self, request):
        if not table_exists("portal_trip_log"):
            return Response([])
        trip_date = request.query_params.get("date") or date.today().isoformat()
        return Response(serialise(rows(
            """
            SELECT tl.id, tl.trip_date, tl.started_at, tl.ended_at, tl.status, tl.notes,
                   v.vehicle_number, r.route_name,
                   COALESCE(u.first_name || ' ' || u.last_name, u.username) AS started_by_name
            FROM portal_trip_log tl
            JOIN portal_vehicle v ON v.id = tl.vehicle_id
            LEFT JOIN portal_route r ON r.id = tl.route_id
            LEFT JOIN auth_user u ON u.id = tl.started_by
            WHERE tl.trip_date = %s
            ORDER BY tl.started_at DESC NULLS LAST
            """,
            [trip_date],
        )))

    def post(self, request):
        if not table_exists("portal_trip_log"):
            return Response({"detail": "Portal schema not applied."}, status=400)
        d = request.data
        vid = d.get("vehicle_id")
        if not vid:
            return Response({"detail": "vehicle_id is required."}, status=400)
        with connection.cursor() as cur:
            cur.execute(
                "INSERT INTO portal_trip_log (vehicle_id, route_id, started_at, status, started_by) "
                "VALUES (%s,%s,now(),'In Progress',%s) RETURNING id",
                [vid, d.get("route_id") or None, request.user.id],
            )
            new_id = cur.fetchone()[0]
        log_action(request.user, "transport.trip.start", "portal_trip_log", new_id, {"vehicle_id": vid})
        return Response({"id": new_id, "detail": "Trip started."}, status=201)

    def patch(self, request):
        if not table_exists("portal_trip_log"):
            return Response({"detail": "Portal schema not applied."}, status=400)
        d = request.data
        tid = d.get("id")
        status_val = d.get("status", "Completed")
        if not tid:
            return Response({"detail": "id is required."}, status=400)
        if status_val == "Completed":
            with connection.cursor() as cur:
                cur.execute(
                    "UPDATE portal_trip_log SET status=%s, ended_at=now(), notes=%s WHERE id=%s",
                    [status_val, d.get("notes", ""), tid],
                )
        else:
            with connection.cursor() as cur:
                cur.execute(
                    "UPDATE portal_trip_log SET status=%s, notes=%s WHERE id=%s",
                    [status_val, d.get("notes", ""), tid],
                )
        log_action(request.user, "transport.trip.update", "portal_trip_log", tid, {"status": status_val})
        return Response({"detail": "Trip updated."})


# ---------------------------------------------------------------------------
# Transport Notifications / Alerts
# ---------------------------------------------------------------------------
class TransportNotificationView(AdminMixin, APIView):
    """
    GET ?route_id=  — list recent notifications (last 50)
    POST {type, message, vehicle_id?, route_id?} — broadcast alert
    """

    def get(self, request):
        if not table_exists("portal_transport_notification"):
            return Response([])
        rid = request.query_params.get("route_id")
        sql = (
            "SELECT n.*, v.vehicle_number, r.route_name, "
            "COALESCE(u.first_name || ' ' || u.last_name, u.username) AS created_by_name "
            "FROM portal_transport_notification n "
            "LEFT JOIN portal_vehicle v ON v.id = n.vehicle_id "
            "LEFT JOIN portal_route r ON r.id = n.route_id "
            "LEFT JOIN auth_user u ON u.id = n.created_by"
        )
        params = []
        if rid:
            sql += " WHERE n.route_id=%s"
            params.append(rid)
        sql += " ORDER BY n.created_at DESC LIMIT 50"
        return Response(serialise(rows(sql, params)))

    def post(self, request):
        if not table_exists("portal_transport_notification"):
            return Response({"detail": "Portal schema not applied."}, status=400)
        d = request.data
        msg = (d.get("message") or "").strip()
        ntype = d.get("type", "Info")
        if not msg:
            return Response({"detail": "message is required."}, status=400)
        with connection.cursor() as cur:
            cur.execute(
                "INSERT INTO portal_transport_notification (vehicle_id, route_id, type, message, created_by) "
                "VALUES (%s,%s,%s,%s,%s) RETURNING id",
                [d.get("vehicle_id") or None, d.get("route_id") or None, ntype, msg, request.user.id],
            )
            new_id = cur.fetchone()[0]
        log_action(request.user, "transport.notify", "portal_transport_notification", new_id, {"type": ntype})
        return Response({"id": new_id, "detail": "Alert broadcasted."}, status=201)


# ---------------------------------------------------------------------------
# Transport Settings
# ---------------------------------------------------------------------------
class TransportSettingsView(AdminMixin, APIView):
    """GET — returns all settings as key/value dict.  POST/PATCH {key, value} to upsert."""

    def get(self, request):
        if not table_exists("portal_transport_settings"):
            return Response({})
        data = rows("SELECT key, value FROM portal_transport_settings ORDER BY key")
        return Response({r["key"]: r["value"] for r in data})

    def post(self, request):
        if not table_exists("portal_transport_settings"):
            return Response({"detail": "Portal schema not applied."}, status=400)
        updates = request.data  # dict of {key: value}
        if not isinstance(updates, dict):
            return Response({"detail": "Expected a JSON object {key: value}."}, status=400)
        with connection.cursor() as cur:
            for k, v in updates.items():
                cur.execute(
                    "INSERT INTO portal_transport_settings (key, value) VALUES (%s,%s) "
                    "ON CONFLICT (key) DO UPDATE SET value=EXCLUDED.value, updated_at=now()",
                    [k, str(v)],
                )
        log_action(request.user, "transport.settings.update", "portal_transport_settings", None, updates)
        return Response({"detail": "Settings saved."})


# ---------------------------------------------------------------------------
# Transport Reports / Analytics
# ---------------------------------------------------------------------------
class TransportReportsView(AdminMixin, APIView):
    """GET — summary stats + per-route utilisation."""

    def get(self, request):
        def safe_count(sql, params=None):
            r = row(sql, params or [])
            return r[list(r.keys())[0]] if r else 0

        total_vehicles = safe_count("SELECT COUNT(*)::int AS c FROM portal_vehicle") if table_exists("portal_vehicle") else 0
        total_routes = safe_count("SELECT COUNT(*)::int AS c FROM portal_route") if table_exists("portal_route") else 0
        allocated_students = safe_count("SELECT COUNT(*)::int AS c FROM portal_transport_allocation") if table_exists("portal_transport_allocation") else 0
        active_trips = safe_count("SELECT COUNT(*)::int AS c FROM portal_trip_log WHERE status='In Progress'") if table_exists("portal_trip_log") else 0
        active_passes = safe_count("SELECT COUNT(*)::int AS c FROM portal_transport_pass WHERE is_active=true") if table_exists("portal_transport_pass") else 0

        route_utilisation = []
        if table_exists("portal_route") and table_exists("portal_transport_allocation"):
            route_utilisation = serialise(rows(
                """
                SELECT r.route_name, r.start_point, r.end_point,
                       COUNT(ta.id)::int AS student_count,
                       v.vehicle_number, v.capacity
                FROM portal_route r
                LEFT JOIN portal_transport_allocation ta ON ta.route_id = r.id
                LEFT JOIN portal_vehicle v ON v.id = r.vehicle_id
                GROUP BY r.id, r.route_name, r.start_point, r.end_point, v.vehicle_number, v.capacity
                ORDER BY student_count DESC
                """
            ))

        recent_trips = []
        if table_exists("portal_trip_log"):
            recent_trips = serialise(rows(
                """
                SELECT tl.trip_date, tl.status, tl.started_at, tl.ended_at,
                       v.vehicle_number, r.route_name
                FROM portal_trip_log tl
                JOIN portal_vehicle v ON v.id = tl.vehicle_id
                LEFT JOIN portal_route r ON r.id = tl.route_id
                ORDER BY tl.trip_date DESC, tl.started_at DESC
                LIMIT 20
                """
            ))

        return Response(serialise({
            "total_vehicles": total_vehicles,
            "total_routes": total_routes,
            "allocated_students": allocated_students,
            "active_trips": active_trips,
            "active_passes": active_passes,
            "route_utilisation": route_utilisation,
            "recent_trips": recent_trips,
        }))


# ---------------------------------------------------------------------------
# Live Bus Map — latest GPS ping per vehicle
# ---------------------------------------------------------------------------
class LiveBusMapView(AdminMixin, APIView):
    """Returns the most recent GPS ping for every vehicle, for the admin fleet map."""

    def get(self, request):
        if not table_exists("portal_live_bus_log") or not table_exists("portal_vehicle"):
            return Response([])
        return Response(serialise(rows(
            """
            SELECT DISTINCT ON (v.id)
                   v.id AS vehicle_id, v.vehicle_number, v.maintenance_status,
                   l.latitude, l.longitude, l.updated_at
            FROM portal_vehicle v
            LEFT JOIN portal_live_bus_log l ON l.vehicle_id = v.id
            ORDER BY v.id, l.updated_at DESC
            """
        )))


# ---------------------------------------------------------------------------
# Transport Fee
# ---------------------------------------------------------------------------
class TransportFeeView(AdminMixin, APIView):
    """
    GET ?student_id=  — get fee record(s)
    POST {student_id, amount, academic_year?, due_date?} — create/update fee
    PATCH {student_id, amount_paid, status} — record payment
    """

    def get(self, request):
        if not table_exists("portal_transport_fee"):
            return Response([])
        sid = request.query_params.get("student_id")
        if sid:
            return Response(serialise(row("SELECT * FROM portal_transport_fee WHERE student_id=%s", [sid])))
        return Response(serialise(rows(
            """
            SELECT tf.*, COALESCE(u.first_name || ' ' || u.last_name, u.username) AS student_name
            FROM portal_transport_fee tf JOIN auth_user u ON u.id = tf.student_id
            ORDER BY tf.status, student_name
            """
        )))

    def post(self, request):
        if not table_exists("portal_transport_fee"):
            return Response({"detail": "Portal schema not applied."}, status=400)
        d = request.data
        sid = d.get("student_id")
        if not sid:
            return Response({"detail": "student_id is required."}, status=400)
        yr = d.get("academic_year") or str(date.today().year)
        with connection.cursor() as cur:
            cur.execute(
                "INSERT INTO portal_transport_fee (student_id, academic_year, amount, due_date) "
                "VALUES (%s,%s,%s,%s) ON CONFLICT (student_id, academic_year) DO UPDATE SET "
                "amount=EXCLUDED.amount, due_date=EXCLUDED.due_date RETURNING id",
                [sid, yr, d.get("amount", 0), d.get("due_date") or None],
            )
            new_id = cur.fetchone()[0]
        log_action(request.user, "transport.fee.set", "portal_transport_fee", new_id, dict(d))
        return Response({"id": new_id, "detail": "Transport fee set."}, status=201)

    def patch(self, request):
        if not table_exists("portal_transport_fee"):
            return Response({"detail": "Portal schema not applied."}, status=400)
        d = request.data
        sid = d.get("student_id")
        if not sid:
            return Response({"detail": "student_id is required."}, status=400)
        yr = d.get("academic_year") or str(date.today().year)
        amount_paid = d.get("amount_paid", 0)
        status_val = d.get("status", "Pending")
        paid_at_sql = "now()" if status_val == "Paid" else "NULL"
        with connection.cursor() as cur:
            cur.execute(
                f"UPDATE portal_transport_fee SET amount_paid=%s, status=%s, paid_at={paid_at_sql} "
                "WHERE student_id=%s AND academic_year=%s",
                [amount_paid, status_val, sid, yr],
            )
        log_action(request.user, "transport.fee.payment", "portal_transport_fee", sid, dict(d))
        return Response({"detail": "Fee payment recorded."})


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


from .roles import IsAdmin

class AdminCampusView(APIView):
    permission_classes = [IsAdmin]

    def get(self, request):
        if not table_exists("portal_campus_location"):
            return Response([])
        campuses = rows(
            """
            SELECT id, name, address, city, state, country, postal_code, latitude, longitude,
                   phone, email, website, office_hours, facilities, programs, image_url,
                   student_count, faculty_count, status, created_at, updated_at
            FROM portal_campus_location
            ORDER BY id ASC
            """
        )
        return Response(serialise(campuses))

    def post(self, request):
        name = (request.data.get("name") or "").strip()
        address = (request.data.get("address") or "").strip()
        city = (request.data.get("city") or "").strip()
        state = (request.data.get("state") or "").strip()
        country = (request.data.get("country") or "India").strip()
        postal_code = (request.data.get("postal_code") or "").strip()
        latitude = request.data.get("latitude")
        longitude = request.data.get("longitude")
        phone = (request.data.get("phone") or "").strip()
        email = (request.data.get("email") or "").strip()
        website = (request.data.get("website") or "").strip()
        office_hours = (request.data.get("office_hours") or "").strip()
        facilities = request.data.get("facilities") or []
        programs = request.data.get("programs") or []
        image_url = (request.data.get("image_url") or "").strip()
        status_val = (request.data.get("status") or "Active").strip()
        student_count = request.data.get("student_count") or 0
        faculty_count = request.data.get("faculty_count") or 0

        if not (name and address and city and state and postal_code and latitude is not None and longitude is not None and phone and email and office_hours):
            return Response({"detail": "All required fields must be provided."}, status=status.HTTP_400_BAD_REQUEST)

        with connection.cursor() as cursor:
            cursor.execute(
                """
                INSERT INTO portal_campus_location 
                    (name, address, city, state, country, postal_code, latitude, longitude,
                     phone, email, website, office_hours, facilities, programs, image_url,
                     student_count, faculty_count, status)
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
                RETURNING id
                """,
                [name, address, city, state, country, postal_code, latitude, longitude,
                 phone, email, website, office_hours, facilities, programs, image_url,
                 student_count, faculty_count, status_val]
            )
            campus_id = cursor.fetchone()[0]

        log_action(request.user, "campus.create", "portal_campus_location", campus_id, {"name": name})
        return Response({"id": campus_id, "detail": "Campus location created successfully."}, status=status.HTTP_201_CREATED)


class AdminCampusDetailView(APIView):
    permission_classes = [IsAdmin]

    def put(self, request, campus_id):
        name = (request.data.get("name") or "").strip()
        address = (request.data.get("address") or "").strip()
        city = (request.data.get("city") or "").strip()
        state = (request.data.get("state") or "").strip()
        country = (request.data.get("country") or "India").strip()
        postal_code = (request.data.get("postal_code") or "").strip()
        latitude = request.data.get("latitude")
        longitude = request.data.get("longitude")
        phone = (request.data.get("phone") or "").strip()
        email = (request.data.get("email") or "").strip()
        website = (request.data.get("website") or "").strip()
        office_hours = (request.data.get("office_hours") or "").strip()
        facilities = request.data.get("facilities") or []
        programs = request.data.get("programs") or []
        image_url = (request.data.get("image_url") or "").strip()
        status_val = (request.data.get("status") or "Active").strip()
        student_count = request.data.get("student_count") or 0
        faculty_count = request.data.get("faculty_count") or 0

        if not (name and address and city and state and postal_code and latitude is not None and longitude is not None and phone and email and office_hours):
            return Response({"detail": "All required fields must be provided."}, status=status.HTTP_400_BAD_REQUEST)

        with connection.cursor() as cursor:
            cursor.execute(
                """
                UPDATE portal_campus_location 
                SET name=%s, address=%s, city=%s, state=%s, country=%s, postal_code=%s,
                    latitude=%s, longitude=%s, phone=%s, email=%s, website=%s, office_hours=%s,
                    facilities=%s, programs=%s, image_url=%s, student_count=%s, faculty_count=%s,
                    status=%s, updated_at=now()
                WHERE id=%s
                """,
                [name, address, city, state, country, postal_code, latitude, longitude,
                 phone, email, website, office_hours, facilities, programs, image_url,
                 student_count, faculty_count, status_val, campus_id]
            )

        log_action(request.user, "campus.update", "portal_campus_location", campus_id, {"name": name})
        return Response({"detail": "Campus location updated successfully."})

    def delete(self, request, campus_id):
        with connection.cursor() as cursor:
            cursor.execute("DELETE FROM portal_campus_location WHERE id=%s", [campus_id])
        log_action(request.user, "campus.delete", "portal_campus_location", campus_id, {"id": campus_id})
        return Response({"detail": "Campus location deleted successfully."})


class AdminCampusVisitsView(APIView):
    permission_classes = [IsAdmin]

    def get(self, request):
        if not table_exists("portal_campus_visit"):
            return Response([])
        visits = rows(
            """
            SELECT v.id, v.campus_id, c.name as campus_name, v.visitor_name, v.visitor_email,
                   v.visitor_phone, v.visit_date, v.visit_time, v.purpose, v.status, v.created_at
            FROM portal_campus_visit v
            LEFT JOIN portal_campus_location c ON c.id = v.campus_id
            ORDER BY v.visit_date DESC, v.id DESC
            """
        )
        return Response(serialise(visits))

    def put(self, request, visit_id):
        status_val = request.data.get("status")
        if status_val not in ["Pending", "Confirmed", "Completed", "Cancelled"]:
            return Response({"detail": "Invalid status value."}, status=status.HTTP_400_BAD_REQUEST)

        with connection.cursor() as cursor:
            cursor.execute(
                "UPDATE portal_campus_visit SET status=%s, updated_at=now() WHERE id=%s",
                [status_val, visit_id]
            )

        log_action(request.user, "campus_visit.status_update", "portal_campus_visit", visit_id, {"status": status_val})
        return Response({"detail": "Campus visit status updated successfully."})


