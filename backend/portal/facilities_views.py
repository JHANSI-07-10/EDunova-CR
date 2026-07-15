"""Facilities & back-office modules added after the initial client review:
Hostel, Inventory, Visitor Management, Alumni Registry, Medical Records.

Follows the same conventions as admin_views.py / views.py / parent_views.py:
raw SQL against portal_* tables (no ORM models — see portal/models.py for why),
role resolved server-side via portal.roles, every admin write logged via
log_action(). Kept in its own file so the five new modules are easy to find
and don't bloat admin_views.py further.
"""
from datetime import date
import uuid as _uuid

from django.db import connection, transaction
from rest_framework.response import Response
from rest_framework.views import APIView

from .admin_views import AdminMixin, SimpleTableView
from .parent_views import ParentMixin, _assert_own_child
from .roles import log_action, get_role
from .views import StudentOnlyMixin, row, rows, serialise, table_exists

# =============================================================================
# HOSTEL
# =============================================================================
class HostelView(AdminMixin, APIView):
    """
    GET - list hostels with warden name joined
    POST - create hostel
    PATCH - update hostel
    DELETE ?id= - delete hostel
    """
    def get(self, request):
        if not table_exists("portal_hostel"):
            return Response([])
        return Response(serialise(rows(
            """
            SELECT h.*, COALESCE(u.first_name || ' ' || u.last_name, u.username) AS warden_name
            FROM portal_hostel h
            LEFT JOIN auth_user u ON u.id = h.warden_id
            ORDER BY h.name
            """
        )))

    def post(self, request):
        if not table_exists("portal_hostel"):
            return Response({"detail": "Schema not applied."}, status=400)
        d = request.data
        name = (d.get("name") or "").strip()
        if not name:
            return Response({"detail": "name is required."}, status=400)
        with connection.cursor() as cur:
            cur.execute(
                "INSERT INTO portal_hostel (name, type, warden_id) VALUES (%s,%s,%s) RETURNING id",
                [name, d.get("type", "Boys"), d.get("warden_id") or None]
            )
            new_id = cur.fetchone()[0]
        log_action(request.user, "hostel.create", "portal_hostel", new_id, {"name": name})
        return Response({"id": new_id, "detail": "Hostel created."}, status=201)

    def patch(self, request):
        if not table_exists("portal_hostel"):
            return Response({"detail": "Schema not applied."}, status=400)
        d = request.data
        hid = d.get("id")
        if not hid:
            return Response({"detail": "id is required."}, status=400)
        with connection.cursor() as cur:
            cur.execute(
                "UPDATE portal_hostel SET name=%s, type=%s, warden_id=%s WHERE id=%s",
                [d.get("name"), d.get("type"), d.get("warden_id") or None, hid]
            )
        log_action(request.user, "hostel.update", "portal_hostel", hid, dict(d))
        return Response({"detail": "Hostel updated."})

    def delete(self, request):
        hid = request.query_params.get("id")
        if not hid:
            return Response({"detail": "id required."}, status=400)
        with connection.cursor() as cur:
            cur.execute("DELETE FROM portal_hostel WHERE id=%s", [hid])
        log_action(request.user, "hostel.delete", "portal_hostel", hid, {})
        return Response({"detail": "Hostel deleted."})


class RoomView(AdminMixin, APIView):
    """
    GET - list all rooms with floor/facilities/occupancy details
    POST - add room
    PATCH - update room
    DELETE ?id= - delete room
    """
    def get(self, request):
        if not table_exists("portal_room"):
            return Response([])
        hostel_id = request.query_params.get("hostel_id")
        sql = (
            "SELECT r.*, h.name AS hostel_name, h.type AS hostel_type FROM portal_room r "
            "JOIN portal_hostel h ON h.id = r.hostel_id"
        )
        params = []
        if hostel_id:
            sql += " WHERE r.hostel_id=%s"
            params.append(hostel_id)
        sql += " ORDER BY h.name, r.floor, r.room_number"
        return Response(serialise(rows(sql, params)))

    def post(self, request):
        if not table_exists("portal_room"):
            return Response({"detail": "Schema not applied."}, status=400)
        d = request.data
        hid = d.get("hostel_id")
        room_num = (d.get("room_number") or "").strip()
        if not hid or not room_num:
            return Response({"detail": "hostel_id and room_number are required."}, status=400)
        with connection.cursor() as cur:
            cur.execute(
                "INSERT INTO portal_room (hostel_id, room_number, capacity, floor, facilities) "
                "VALUES (%s,%s,%s,%s,%s) RETURNING id",
                [hid, room_num, d.get("capacity", 2), d.get("floor", "1"), d.get("facilities", "Basic Bed, Study Table")]
            )
            new_id = cur.fetchone()[0]
        log_action(request.user, "hostel.room.create", "portal_room", new_id, {"room_number": room_num})
        return Response({"id": new_id, "detail": "Room added."}, status=201)

    def patch(self, request):
        if not table_exists("portal_room"):
            return Response({"detail": "Schema not applied."}, status=400)
        d = request.data
        rid = d.get("id")
        if not rid:
            return Response({"detail": "id is required."}, status=400)
        with connection.cursor() as cur:
            cur.execute(
                "UPDATE portal_room SET room_number=%s, capacity=%s, floor=%s, facilities=%s WHERE id=%s",
                [d.get("room_number"), d.get("capacity"), d.get("floor"), d.get("facilities"), rid]
            )
        log_action(request.user, "hostel.room.update", "portal_room", rid, dict(d))
        return Response({"detail": "Room updated."})

    def delete(self, request):
        rid = request.query_params.get("id")
        if not rid:
            return Response({"detail": "id required."}, status=400)
        with connection.cursor() as cur:
            cur.execute("DELETE FROM portal_room WHERE id=%s", [rid])
        log_action(request.user, "hostel.room.delete", "portal_room", rid, {})
        return Response({"detail": "Room deleted."})


class HostelAllocationView(AdminMixin, APIView):
    """
    GET - list active allocations with pass details
    POST - allocate student to room (and auto-generate pass_number)
    """
    def get(self, request):
        if not table_exists("portal_hostel_allocation"):
            return Response([])
        return Response(serialise(rows(
            """
            SELECT a.id, a.student_id, a.room_id, a.allocated_date, a.mess_plan,
                   COALESCE(u.first_name || ' ' || u.last_name, u.username) AS student_name,
                   r.room_number, r.floor, h.name AS hostel_name, h.type AS hostel_type,
                   p.pass_number
            FROM portal_hostel_allocation a
            JOIN auth_user u ON u.id = a.student_id
            JOIN portal_room r ON r.id = a.room_id
            JOIN portal_hostel h ON h.id = r.hostel_id
            LEFT JOIN portal_hostel_pass p ON p.student_id = a.student_id
            WHERE a.vacated_date IS NULL
            ORDER BY h.name, r.room_number
            """
        )))

    def post(self, request):
        """Allocate a student to a room. Rejects if the room is already full."""
        if not table_exists("portal_hostel_allocation"):
            return Response({"detail": "Portal schema has not been applied."}, status=400)
        student_id = request.data.get("student_id")
        room_id = request.data.get("room_id")
        plan = request.data.get("mess_plan", "Veg Standard")
        room = row("SELECT capacity, occupied_beds FROM portal_room WHERE id=%s", [room_id])
        if not room:
            return Response({"detail": "Room not found."}, status=404)
        if room["occupied_beds"] >= room["capacity"]:
            return Response({"detail": "Room is already at full capacity."}, status=400)
        
        with transaction.atomic():
            with connection.cursor() as cursor:
                cursor.execute(
                    "INSERT INTO portal_hostel_allocation (student_id, room_id, mess_plan) VALUES (%s,%s,%s) "
                    "ON CONFLICT (student_id, room_id, allocated_date) DO UPDATE SET mess_plan=EXCLUDED.mess_plan, vacated_date=NULL RETURNING id",
                    [student_id, room_id, plan],
                )
                alloc_id = cursor.fetchone()[0]
                cursor.execute("UPDATE portal_room SET occupied_beds = occupied_beds + 1 WHERE id=%s", [room_id])
                
                # Check and generate hostel pass
                p_exists = row("SELECT id FROM portal_hostel_pass WHERE student_id=%s", [student_id])
                if not p_exists:
                    pnum = f"HST-{_uuid.uuid4().hex[:8].upper()}"
                    cursor.execute(
                        "INSERT INTO portal_hostel_pass (student_id, pass_number) VALUES (%s,%s)",
                        [student_id, pnum]
                    )
        
        log_action(request.user, "hostel.allocate", "student", student_id, {"room_id": room_id, "mess_plan": plan})
        return Response({"id": alloc_id, "detail": "Student allocated to room."})


class HostelVacateView(AdminMixin, APIView):
    def post(self, request, allocation_id):
        if not table_exists("portal_hostel_allocation"):
            return Response({"detail": "Portal schema has not been applied."}, status=400)
        alloc = row("SELECT room_id, vacated_date FROM portal_hostel_allocation WHERE id=%s", [allocation_id])
        if not alloc:
            return Response({"detail": "Allocation not found."}, status=404)
        if alloc["vacated_date"]:
            return Response({"detail": "Already vacated."}, status=400)
        with connection.cursor() as cursor:
            cursor.execute(
                "UPDATE portal_hostel_allocation SET vacated_date=%s WHERE id=%s",
                [date.today(), allocation_id],
            )
            cursor.execute(
                "UPDATE portal_room SET occupied_beds = GREATEST(occupied_beds - 1, 0) WHERE id=%s",
                [alloc["room_id"]],
            )
        log_action(request.user, "hostel.vacate", "allocation", allocation_id, {})
        return Response({"detail": "Room vacated."})


class StudentHostelView(StudentOnlyMixin, APIView):
    """A student's own current room allocation, roommates, pass, leaves, and complaints."""

    def get(self, request):
        if not table_exists("portal_hostel_allocation"):
            return Response(None)
        alloc = row(
            """
            SELECT a.id AS allocation_id, a.allocated_date, a.mess_plan,
                   r.id AS room_id, r.room_number, r.floor, r.facilities,
                   h.name AS hostel_name, h.type AS hostel_type,
                   COALESCE(wu.first_name || ' ' || wu.last_name, wu.username) AS warden_name,
                   we.phone AS warden_phone
            FROM portal_hostel_allocation a
            JOIN portal_room r ON r.id = a.room_id
            JOIN portal_hostel h ON h.id = r.hostel_id
            LEFT JOIN auth_user wu ON wu.id = h.warden_id
            LEFT JOIN portal_transport_driver we ON we.user_id = h.warden_id  -- fallback driver/employee contact check
            WHERE a.student_id=%s AND a.vacated_date IS NULL
            """,
            [request.user.id],
        )
        if not alloc:
            return Response({"allocation": None})

        # Roommates
        roommates = rows(
            """
            SELECT COALESCE(u.first_name || ' ' || u.last_name, u.username) AS name, u.email
            FROM portal_hostel_allocation a
            JOIN auth_user u ON u.id = a.student_id
            WHERE a.room_id=%s AND a.student_id != %s AND a.vacated_date IS NULL
            """,
            [alloc["room_id"], request.user.id]
        )

        # Pass
        pass_data = None
        if table_exists("portal_hostel_pass"):
            pass_data = row("SELECT pass_number, issued_at, is_active FROM portal_hostel_pass WHERE student_id=%s", [request.user.id])

        # Leaves
        recent_leaves = []
        if table_exists("portal_hostel_leave"):
            recent_leaves = rows("SELECT * FROM portal_hostel_leave WHERE student_id=%s ORDER BY created_at DESC LIMIT 10", [request.user.id])

        # Complaints
        recent_complaints = []
        if table_exists("portal_hostel_complaint"):
            recent_complaints = rows("SELECT * FROM portal_hostel_complaint WHERE student_id=%s ORDER BY created_at DESC LIMIT 10", [request.user.id])

        # Fee
        fee_data = None
        if table_exists("portal_hostel_fee"):
            fee_data = row("SELECT * FROM portal_hostel_fee WHERE student_id=%s ORDER BY academic_year DESC LIMIT 1", [request.user.id])

        return Response(serialise({
            "allocation": alloc,
            "roommates": roommates,
            "pass": pass_data,
            "leaves": recent_leaves,
            "complaints": recent_complaints,
            "fee": fee_data
        }))


class ChildHostelView(ParentMixin, APIView):
    """A parent's view of their child's hostel room."""

    def get(self, request):
        child_id = request.query_params.get("child_id")
        if not _assert_own_child(request.user.id, child_id):
            return Response({"detail": "Not your child, or child not found."}, status=403)
        if not table_exists("portal_hostel_allocation"):
            return Response(None)
        
        alloc = row(
            """
            SELECT a.id AS allocation_id, a.allocated_date, a.mess_plan,
                   r.id AS room_id, r.room_number, r.floor, r.facilities,
                   h.name AS hostel_name, h.type AS hostel_type,
                   COALESCE(wu.first_name || ' ' || wu.last_name, wu.username) AS warden_name
            FROM portal_hostel_allocation a
            JOIN portal_room r ON r.id = a.room_id
            JOIN portal_hostel h ON h.id = r.hostel_id
            LEFT JOIN auth_user wu ON wu.id = h.warden_id
            WHERE a.student_id=%s AND a.vacated_date IS NULL
            """,
            [child_id],
        )
        if not alloc:
            return Response({"allocation": None})

        # Pass
        pass_data = None
        if table_exists("portal_hostel_pass"):
            pass_data = row("SELECT pass_number, issued_at, is_active FROM portal_hostel_pass WHERE student_id=%s", [child_id])

        # Leaves
        recent_leaves = []
        if table_exists("portal_hostel_leave"):
            recent_leaves = rows("SELECT * FROM portal_hostel_leave WHERE student_id=%s ORDER BY created_at DESC LIMIT 10", [child_id])

        # Complaints
        recent_complaints = []
        if table_exists("portal_hostel_complaint"):
            recent_complaints = rows("SELECT * FROM portal_hostel_complaint WHERE student_id=%s ORDER BY created_at DESC LIMIT 10", [child_id])

        # Fee
        fee_data = None
        if table_exists("portal_hostel_fee"):
            fee_data = row("SELECT * FROM portal_hostel_fee WHERE student_id=%s ORDER BY academic_year DESC LIMIT 1", [child_id])

        return Response(serialise({
            "allocation": alloc,
            "pass": pass_data,
            "leaves": recent_leaves,
            "complaints": recent_complaints,
            "fee": fee_data
        }))


# ---------------------------------------------------------------------------
# New Hostel Application & Verification
# ---------------------------------------------------------------------------
class HostelApplicationView(APIView):
    """
    GET - Admin lists all. Student lists own applications.
    POST - Student submits a new application.
    PATCH - Admin reviews and approves/rejects application.
    """
    def get(self, request):
        if not table_exists("portal_hostel_application"):
            return Response([])
        
        role = get_role(request.user)
        if role == "Admin":
            return Response(serialise(rows(
                """
                SELECT a.*, COALESCE(u.first_name || ' ' || u.last_name, u.username) AS student_name,
                       h.name AS hostel_name
                FROM portal_hostel_application a
                JOIN auth_user u ON u.id = a.student_id
                JOIN portal_hostel h ON h.id = a.hostel_id
                ORDER BY a.created_at DESC
                """
            )))
        else:
            return Response(serialise(rows(
                """
                SELECT a.*, h.name AS hostel_name
                FROM portal_hostel_application a
                JOIN portal_hostel h ON h.id = a.hostel_id
                WHERE a.student_id = %s
                ORDER BY a.created_at DESC
                """,
                [request.user.id]
            )))

    def post(self, request):
        if not table_exists("portal_hostel_application"):
            return Response({"detail": "Schema not applied."}, status=400)
        d = request.data
        hid = d.get("hostel_id")
        rtype = d.get("preferred_room_type", "2-Sharing")
        reason = d.get("reason", "")
        if not hid:
            return Response({"detail": "hostel_id is required."}, status=400)
        
        with connection.cursor() as cur:
            cur.execute(
                "INSERT INTO portal_hostel_application (student_id, hostel_id, preferred_room_type, reason, status) "
                "VALUES (%s,%s,%s,%s,'Pending') RETURNING id",
                [request.user.id, hid, rtype, reason]
            )
            new_id = cur.fetchone()[0]
        
        return Response({"id": new_id, "detail": "Hostel application submitted."}, status=201)

    def patch(self, request):
        role = get_role(request.user)
        if role != "Admin":
            return Response({"detail": "Permission denied."}, status=403)
        
        d = request.data
        app_id = d.get("id")
        status_val = d.get("status")
        notes = d.get("review_notes", "")
        if not app_id or status_val not in ["Approved", "Rejected"]:
            return Response({"detail": "id and status ('Approved' or 'Rejected') are required."}, status=400)
        
        with connection.cursor() as cur:
            cur.execute(
                "UPDATE portal_hostel_application SET status=%s, review_notes=%s, reviewed_by=%s WHERE id=%s",
                [status_val, notes, request.user.id, app_id]
            )
        
        log_action(request.user, "hostel.application.review", "portal_hostel_application", app_id, {"status": status_val})
        return Response({"detail": f"Application marked as {status_val}."})


# ---------------------------------------------------------------------------
# New Hostel Leaves (Student, Parent, Admin)
# ---------------------------------------------------------------------------
class HostelLeaveView(APIView):
    """
    GET - Admin lists all, Student lists own, Parent lists child's leaves
    POST - Student submits a leave request, Parent approves leave request
    PATCH - Admin approves/rejects leave request
    """
    def get(self, request):
        if not table_exists("portal_hostel_leave"):
            return Response([])
        
        role = get_role(request.user)
        child_id = request.query_params.get("child_id")
        
        if role == "Admin":
            return Response(serialise(rows(
                """
                SELECT l.*, COALESCE(u.first_name || ' ' || u.last_name, u.username) AS student_name
                FROM portal_hostel_leave l
                JOIN auth_user u ON u.id = l.student_id
                ORDER BY l.created_at DESC
                """
            )))
        elif role == "Parent" and child_id:
            if not _assert_own_child(request.user.id, child_id):
                return Response({"detail": "Forbidden"}, status=403)
            return Response(serialise(rows(
                "SELECT * FROM portal_hostel_leave WHERE student_id=%s ORDER BY created_at DESC",
                [child_id]
            )))
        else:
            return Response(serialise(rows(
                "SELECT * FROM portal_hostel_leave WHERE student_id=%s ORDER BY created_at DESC",
                [request.user.id]
            )))

    def post(self, request):
        if not table_exists("portal_hostel_leave"):
            return Response({"detail": "Schema not applied."}, status=400)
        
        role = get_role(request.user)
        d = request.data
        
        if role == "Parent":
            leave_id = d.get("id")
            approved = bool(d.get("parent_approved"))
            if not leave_id:
                return Response({"detail": "id is required."}, status=400)
            with connection.cursor() as cur:
                cur.execute(
                    "UPDATE portal_hostel_leave SET parent_approved=%s WHERE id=%s",
                    [approved, leave_id]
                )
            return Response({"detail": "Parent decision recorded."})
        else:
            start = d.get("start_date")
            end = d.get("end_date")
            reason = d.get("reason", "")
            if not start or not end or not reason:
                return Response({"detail": "start_date, end_date, and reason are required."}, status=400)
            
            with connection.cursor() as cur:
                cur.execute(
                    "INSERT INTO portal_hostel_leave (student_id, start_date, end_date, reason) "
                    "VALUES (%s,%s,%s,%s) RETURNING id",
                    [request.user.id, start, end, reason]
                )
                new_id = cur.fetchone()[0]
            return Response({"id": new_id, "detail": "Leave request submitted."}, status=201)

    def patch(self, request):
        role = get_role(request.user)
        if role != "Admin":
            return Response({"detail": "Forbidden"}, status=403)
        d = request.data
        lid = d.get("id")
        status_val = d.get("status")
        if not lid or status_val not in ["Approved", "Rejected"]:
            return Response({"detail": "id and status required."}, status=400)
        
        with connection.cursor() as cur:
            cur.execute(
                "UPDATE portal_hostel_leave SET status=%s WHERE id=%s",
                [status_val, lid]
            )
        log_action(request.user, "hostel.leave.review", "portal_hostel_leave", lid, {"status": status_val})
        return Response({"detail": f"Leave status updated to {status_val}."})


# ---------------------------------------------------------------------------
# New Hostel Complaint Registry (Student, Parent, Admin)
# ---------------------------------------------------------------------------
class HostelComplaintView(APIView):
    """
    GET - Admin lists all, Student lists own, Parent lists child's complaints
    POST - Student submits a complaint
    PATCH - Admin resolves/updates complaint
    """
    def get(self, request):
        if not table_exists("portal_hostel_complaint"):
            return Response([])
        
        role = get_role(request.user)
        child_id = request.query_params.get("child_id")
        
        if role == "Admin":
            return Response(serialise(rows(
                """
                SELECT c.*, COALESCE(u.first_name || ' ' || u.last_name, u.username) AS student_name
                FROM portal_hostel_complaint c
                JOIN auth_user u ON u.id = c.student_id
                ORDER BY c.created_at DESC
                """
            )))
        elif role == "Parent" and child_id:
            if not _assert_own_child(request.user.id, child_id):
                return Response({"detail": "Forbidden"}, status=403)
            return Response(serialise(rows(
                "SELECT * FROM portal_hostel_complaint WHERE student_id=%s ORDER BY created_at DESC",
                [child_id]
            )))
        else:
            return Response(serialise(rows(
                "SELECT * FROM portal_hostel_complaint WHERE student_id=%s ORDER BY created_at DESC",
                [request.user.id]
            )))

    def post(self, request):
        if not table_exists("portal_hostel_complaint"):
            return Response({"detail": "Schema not applied."}, status=400)
        d = request.data
        cat = d.get("category", "Maintenance")
        title = d.get("title", "")
        desc = d.get("description", "")
        if not title or not desc:
            return Response({"detail": "title and description are required."}, status=400)
        
        with connection.cursor() as cur:
            cur.execute(
                "INSERT INTO portal_hostel_complaint (student_id, category, title, description) "
                "VALUES (%s,%s,%s,%s) RETURNING id",
                [request.user.id, cat, title, desc]
            )
            new_id = cur.fetchone()[0]
        return Response({"id": new_id, "detail": "Complaint registered."}, status=201)

    def patch(self, request):
        role = get_role(request.user)
        if role != "Admin":
            return Response({"detail": "Forbidden"}, status=403)
        d = request.data
        cid = d.get("id")
        status_val = d.get("status")
        notes = d.get("admin_notes", "")
        if not cid or status_val not in ["Open", "In Progress", "Resolved"]:
            return Response({"detail": "id and status required."}, status=400)
        
        with connection.cursor() as cur:
            cur.execute(
                "UPDATE portal_hostel_complaint SET status=%s, admin_notes=%s WHERE id=%s",
                [status_val, notes, cid]
            )
        log_action(request.user, "hostel.complaint.update", "portal_hostel_complaint", cid, {"status": status_val})
        return Response({"detail": "Complaint updated."})


# ---------------------------------------------------------------------------
# New Hostel Fee View
# ---------------------------------------------------------------------------
class HostelFeeView(AdminMixin, APIView):
    """
    GET ?student_id=
    POST {student_id, amount, academic_year?, due_date?}
    PATCH {student_id, amount_paid, status}
    """
    def get(self, request):
        if not table_exists("portal_hostel_fee"):
            return Response([])
        sid = request.query_params.get("student_id")
        if sid:
            return Response(serialise(row("SELECT * FROM portal_hostel_fee WHERE student_id=%s ORDER BY academic_year DESC LIMIT 1", [sid])))
        return Response(serialise(rows(
            """
            SELECT hf.*, COALESCE(u.first_name || ' ' || u.last_name, u.username) AS student_name
            FROM portal_hostel_fee hf JOIN auth_user u ON u.id = hf.student_id
            ORDER BY hf.status, student_name
            """
        )))

    def post(self, request):
        if not table_exists("portal_hostel_fee"):
            return Response({"detail": "Schema not applied."}, status=400)
        d = request.data
        sid = d.get("student_id")
        if not sid:
            return Response({"detail": "student_id is required."}, status=400)
        yr = d.get("academic_year") or str(date.today().year)
        with connection.cursor() as cur:
            cur.execute(
                "INSERT INTO portal_hostel_fee (student_id, academic_year, amount, due_date) "
                "VALUES (%s,%s,%s,%s) ON CONFLICT (student_id, academic_year) DO UPDATE SET "
                "amount=EXCLUDED.amount, due_date=EXCLUDED.due_date RETURNING id",
                [sid, yr, d.get("amount", 0), d.get("due_date") or None]
            )
            new_id = cur.fetchone()[0]
        log_action(request.user, "hostel.fee.set", "portal_hostel_fee", new_id, dict(d))
        return Response({"id": new_id, "detail": "Hostel fee set."}, status=201)

    def patch(self, request):
        if not table_exists("portal_hostel_fee"):
            return Response({"detail": "Schema not applied."}, status=400)
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
                f"UPDATE portal_hostel_fee SET amount_paid=%s, status=%s, paid_at={paid_at_sql} "
                "WHERE student_id=%s AND academic_year=%s",
                [amount_paid, status_val, sid, yr]
            )
        log_action(request.user, "hostel.fee.payment", "portal_hostel_fee", sid, dict(d))
        return Response({"detail": "Fee payment recorded."})


# ---------------------------------------------------------------------------
# New Hostel Reports & Analytics
# ---------------------------------------------------------------------------
class HostelReportsView(AdminMixin, APIView):
    def get(self, request):
        def safe_count(sql, params=None):
            r = row(sql, params or [])
            return r[list(r.keys())[0]] if r else 0

        total_hostels = safe_count("SELECT COUNT(*)::int AS c FROM portal_hostel") if table_exists("portal_hostel") else 0
        total_rooms = safe_count("SELECT COUNT(*)::int AS c FROM portal_room") if table_exists("portal_room") else 0
        total_beds = safe_count("SELECT COALESCE(SUM(capacity),0)::int AS c FROM portal_room") if table_exists("portal_room") else 0
        occupied_beds = safe_count("SELECT COALESCE(SUM(occupied_beds),0)::int AS c FROM portal_room") if table_exists("portal_room") else 0
        pending_apps = safe_count("SELECT COUNT(*)::int AS c FROM portal_hostel_application WHERE status='Pending'") if table_exists("portal_hostel_application") else 0
        active_leaves = safe_count("SELECT COUNT(*)::int AS c FROM portal_hostel_leave WHERE status='Pending'") if table_exists("portal_hostel_leave") else 0
        open_complaints = safe_count("SELECT COUNT(*)::int AS c FROM portal_hostel_complaint WHERE status IN ('Open', 'In Progress')") if table_exists("portal_hostel_complaint") else 0

        hostel_occupancy = []
        if table_exists("portal_hostel") and table_exists("portal_room"):
            hostel_occupancy = serialise(rows(
                """
                SELECT h.name AS hostel_name, h.type,
                       COALESCE(SUM(r.capacity), 0)::int AS total_capacity,
                       COALESCE(SUM(r.occupied_beds), 0)::int AS total_occupied
                FROM portal_hostel h
                LEFT JOIN portal_room r ON r.hostel_id = h.id
                GROUP BY h.id, h.name, h.type
                ORDER BY h.name
                """
            ))

        return Response(serialise({
            "total_hostels": total_hostels,
            "total_rooms": total_rooms,
            "total_beds": total_beds,
            "occupied_beds": occupied_beds,
            "pending_applications": pending_apps,
            "active_leaves": active_leaves,
            "open_complaints": open_complaints,
            "hostel_occupancy": hostel_occupancy
        }))


class StudentTransportView(StudentOnlyMixin, APIView):
    """A student's own current transport allocation + pass + pickup timing + latest GPS ping."""

    def get(self, request):
        if not table_exists("portal_transport_allocation"):
            return Response(None)
        data = row(
            """
            SELECT ta.pickup_point, v.id AS vehicle_id, v.vehicle_number, v.maintenance_status,
                   r.id AS route_id, r.route_name, r.start_point, r.end_point,
                   COALESCE(du.first_name || ' ' || du.last_name, du.username) AS driver_name,
                   dr.phone AS driver_phone, dr.license_number
            FROM portal_transport_allocation ta
            JOIN portal_vehicle v ON v.id = ta.vehicle_id
            JOIN portal_route r ON r.id = ta.route_id
            LEFT JOIN auth_user du ON du.id = v.driver_id
            LEFT JOIN portal_transport_driver dr ON dr.user_id = v.driver_id
            WHERE ta.student_id = %s
            """,
            [request.user.id],
        )
        if not data:
            return Response(None)

        # Transport pass
        transport_pass = None
        if table_exists("portal_transport_pass"):
            transport_pass = row(
                "SELECT pass_number, issued_at, valid_until, is_active FROM portal_transport_pass WHERE student_id=%s",
                [request.user.id],
            )

        # Pickup point details (the stop matching the student's pickup_point name)
        pickup_detail = None
        if table_exists("portal_pickup_point") and data.get("pickup_point"):
            pickup_detail = row(
                "SELECT name, sequence_order, pickup_time, drop_time FROM portal_pickup_point "
                "WHERE route_id=%s AND name=%s",
                [data["route_id"], data["pickup_point"]],
            )

        # All stops on this route (for the route timeline)
        all_stops = []
        if table_exists("portal_pickup_point"):
            all_stops = rows(
                "SELECT name, sequence_order, pickup_time, drop_time FROM portal_pickup_point "
                "WHERE route_id=%s ORDER BY sequence_order",
                [data["route_id"]],
            )

        # Latest GPS ping
        last_location = None
        if table_exists("portal_live_bus_log"):
            last_location = row(
                "SELECT latitude, longitude, updated_at FROM portal_live_bus_log "
                "WHERE vehicle_id=%s ORDER BY updated_at DESC LIMIT 1",
                [data["vehicle_id"]],
            )

        return Response(serialise({
            **data,
            "transport_pass": transport_pass,
            "pickup_detail": pickup_detail,
            "all_stops": all_stops,
            "last_location": last_location,
        }))




class ChildHostelView(ParentMixin, APIView):
    """A parent's view of their child's current hostel room."""

    def get(self, request):
        child_id = request.query_params.get("child_id")
        if not _assert_own_child(request.user.id, child_id):
            return Response({"detail": "Not your child, or child not found."}, status=403)
        if not table_exists("portal_hostel_allocation"):
            return Response(None)
        data = row(
            """
            SELECT r.room_number, h.name AS hostel_name, h.type, a.allocated_date
            FROM portal_hostel_allocation a
            JOIN portal_room r ON r.id = a.room_id
            JOIN portal_hostel h ON h.id = r.hostel_id
            WHERE a.student_id=%s AND a.vacated_date IS NULL
            """,
            [child_id],
        )
        return Response(serialise(data))


# =============================================================================
# INVENTORY
# =============================================================================
class InventoryView(AdminMixin, APIView):
    """GET ?department= to filter; PATCH via item id in the body for quantity
    adjustments (simple stock in/out), POST to add a new item line."""

    def get(self, request):
        if not table_exists("portal_inventory"):
            return Response([])
        department = request.query_params.get("department")
        sql = "SELECT * FROM portal_inventory"
        params = []
        if department:
            sql += " WHERE department=%s"
            params.append(department)
        sql += " ORDER BY department, item_name"
        return Response(serialise(rows(sql, params)))

    def post(self, request):
        if not table_exists("portal_inventory"):
            return Response({"detail": "Portal schema has not been applied."}, status=400)
        d = request.data
        with connection.cursor() as cursor:
            cursor.execute(
                "INSERT INTO portal_inventory (item_name, category, quantity, department) "
                "VALUES (%s,%s,%s,%s) RETURNING id",
                [d.get("item_name"), d.get("category", "General"), d.get("quantity", 0), d.get("department", "Administration")],
            )
            new_id = cursor.fetchone()[0]
        log_action(request.user, "inventory.create", "portal_inventory", new_id, dict(d))
        return Response({"id": new_id, "detail": "Item added."})

    def patch(self, request):
        """Body: {id, quantity_delta} — adjusts stock up or down."""
        if not table_exists("portal_inventory"):
            return Response({"detail": "Portal schema has not been applied."}, status=400)
        item_id = request.data.get("id")
        delta = int(request.data.get("quantity_delta", 0))
        with connection.cursor() as cursor:
            cursor.execute(
                "UPDATE portal_inventory SET quantity = GREATEST(quantity + %s, 0), updated_at = now() "
                "WHERE id=%s RETURNING quantity",
                [delta, item_id],
            )
            result = cursor.fetchone()
        if not result:
            return Response({"detail": "Item not found."}, status=404)
        log_action(request.user, "inventory.adjust", "portal_inventory", item_id, {"delta": delta})
        return Response({"quantity": result[0], "detail": "Stock updated."})


# =============================================================================
# VISITOR MANAGEMENT
# =============================================================================
class VisitorLogView(AdminMixin, APIView):
    def get(self, request):
        if not table_exists("portal_visitor_log"):
            return Response([])
        only_open = request.query_params.get("open") == "true"
        sql = (
            "SELECT v.*, COALESCE(u.first_name || ' ' || u.last_name, u.username) AS host_name "
            "FROM portal_visitor_log v LEFT JOIN auth_user u ON u.id = v.host_user_id"
        )
        if only_open:
            sql += " WHERE v.check_out_time IS NULL"
        sql += " ORDER BY v.check_in_time DESC LIMIT 200"
        return Response(serialise(rows(sql)))

    def post(self, request):
        if not table_exists("portal_visitor_log"):
            return Response({"detail": "Portal schema has not been applied."}, status=400)
        d = request.data
        with connection.cursor() as cursor:
            cursor.execute(
                "INSERT INTO portal_visitor_log (visitor_name, purpose, host_user_id, id_proof_type) "
                "VALUES (%s,%s,%s,%s) RETURNING id, check_in_time",
                [d.get("visitor_name"), d.get("purpose"), d.get("host_user_id") or None, d.get("id_proof_type", "Other")],
            )
            new_id, check_in = cursor.fetchone()
        log_action(request.user, "visitor.checkin", "portal_visitor_log", new_id, {"visitor_name": d.get("visitor_name")})
        return Response({"id": new_id, "check_in_time": check_in.isoformat(), "detail": "Visitor checked in."})


class VisitorCheckoutView(AdminMixin, APIView):
    def post(self, request, visitor_id):
        if not table_exists("portal_visitor_log"):
            return Response({"detail": "Portal schema has not been applied."}, status=400)
        visitor = row("SELECT check_out_time FROM portal_visitor_log WHERE id=%s", [visitor_id])
        if not visitor:
            return Response({"detail": "Visitor log not found."}, status=404)
        if visitor["check_out_time"]:
            return Response({"detail": "Already checked out."}, status=400)
        with connection.cursor() as cursor:
            cursor.execute("UPDATE portal_visitor_log SET check_out_time = now() WHERE id=%s", [visitor_id])
        log_action(request.user, "visitor.checkout", "portal_visitor_log", visitor_id, {})
        return Response({"detail": "Visitor checked out."})


# =============================================================================
# ALUMNI REGISTRY
# =============================================================================
class AlumniView(AdminMixin, APIView):
    def get(self, request):
        if not table_exists("portal_alumni"):
            return Response([])
        year = request.query_params.get("graduation_year")
        sql = (
            "SELECT a.*, COALESCE(u.first_name || ' ' || u.last_name, u.username) AS student_name, u.email "
            "FROM portal_alumni a JOIN auth_user u ON u.id = a.student_id"
        )
        params = []
        if year:
            sql += " WHERE a.graduation_year=%s"
            params.append(year)
        sql += " ORDER BY a.graduation_year DESC, student_name"
        return Response(serialise(rows(sql, params)))

    def post(self, request):
        if not table_exists("portal_alumni"):
            return Response({"detail": "Portal schema has not been applied."}, status=400)
        d = request.data
        with connection.cursor() as cursor:
            cursor.execute(
                "INSERT INTO portal_alumni (student_id, graduation_year, current_occupation, higher_studies_details) "
                "VALUES (%s,%s,%s,%s) ON CONFLICT (student_id) DO UPDATE SET "
                "graduation_year=EXCLUDED.graduation_year, current_occupation=EXCLUDED.current_occupation, "
                "higher_studies_details=EXCLUDED.higher_studies_details RETURNING id",
                [d.get("student_id"), d.get("graduation_year"), d.get("current_occupation"), d.get("higher_studies_details")],
            )
            new_id = cursor.fetchone()[0]
        log_action(request.user, "alumni.upsert", "portal_alumni", new_id, dict(d))
        return Response({"id": new_id, "detail": "Alumni record saved."})


# =============================================================================
# MEDICAL RECORDS
# =============================================================================
class MedicalLogView(AdminMixin, APIView):
    """Admin/nurse-facing: list (optionally by student) + create."""

    def get(self, request):
        if not table_exists("portal_medical_log"):
            return Response([])
        student_id = request.query_params.get("student_id")
        sql = (
            "SELECT m.*, COALESCE(u.first_name || ' ' || u.last_name, u.username) AS student_name "
            "FROM portal_medical_log m JOIN auth_user u ON u.id = m.student_id"
        )
        params = []
        if student_id:
            sql += " WHERE m.student_id=%s"
            params.append(student_id)
        sql += " ORDER BY m.visit_date DESC LIMIT 200"
        return Response(serialise(rows(sql, params)))

    def post(self, request):
        if not table_exists("portal_medical_log"):
            return Response({"detail": "Portal schema has not been applied."}, status=400)
        d = request.data
        with connection.cursor() as cursor:
            cursor.execute(
                "INSERT INTO portal_medical_log (student_id, symptoms, treatment_given, doctor_notes, recorded_by) "
                "VALUES (%s,%s,%s,%s,%s) RETURNING id",
                [d.get("student_id"), d.get("symptoms"), d.get("treatment_given"), d.get("doctor_notes"), request.user.id],
            )
            new_id = cursor.fetchone()[0]
        log_action(request.user, "medical.log.create", "portal_medical_log", new_id, {"student_id": d.get("student_id")})
        return Response({"id": new_id, "detail": "Medical record saved."})


class StudentMedicalView(StudentOnlyMixin, APIView):
    """Read-only — a student can see their own medical visit history."""

    def get(self, request):
        if not table_exists("portal_medical_log"):
            return Response([])
        return Response(serialise(rows(
            "SELECT id, visit_date, symptoms, treatment_given, doctor_notes FROM portal_medical_log "
            "WHERE student_id=%s ORDER BY visit_date DESC",
            [request.user.id],
        )))


# =============================================================================
# PAYROLL / HR
# =============================================================================
class PayrollView(AdminMixin, APIView):
    """GET ?month=YYYY-MM-01 to list a period's payslips (generates them on
    first request for that month, one per active employee, from their
    current portal_employee.monthly_salary). POST body {employee_id, month,
    allowances, deductions} lets Admin adjust a single payslip before it's
    marked Paid."""

    def get(self, request):
        if not table_exists("portal_payroll_record") or not table_exists("portal_employee"):
            return Response([])
        month = request.query_params.get("month") or date.today().replace(day=1).isoformat()

        # Auto-generate a Pending payslip for every active employee who doesn't
        # already have one this month, so Admin never has to "create" payroll
        # by hand — they only review, adjust, and mark it Paid.
        with connection.cursor() as cursor:
            cursor.execute(
                "INSERT INTO portal_payroll_record (employee_id, pay_month, basic_salary, net_pay, generated_by) "
                "SELECT user_id, %s, COALESCE(monthly_salary, 0), COALESCE(monthly_salary, 0), %s "
                "FROM portal_employee WHERE is_active = true "
                "ON CONFLICT (employee_id, pay_month) DO NOTHING",
                [month, request.user.id],
            )

        return Response(serialise(rows(
            "SELECT p.*, COALESCE(u.first_name || ' ' || u.last_name, u.username) AS employee_name, "
            "e.designation, e.department, e.employee_code "
            "FROM portal_payroll_record p "
            "JOIN portal_employee e ON e.user_id = p.employee_id "
            "JOIN auth_user u ON u.id = p.employee_id "
            "WHERE p.pay_month = %s ORDER BY e.department, employee_name",
            [month],
        )))

    def patch(self, request):
        """Body: {id, allowances?, deductions?, status?} — recomputes net_pay
        and, when status is set to Paid, stamps paid_on."""
        if not table_exists("portal_payroll_record"):
            return Response({"detail": "Portal schema has not been applied."}, status=400)
        d = request.data
        record_id = d.get("id")
        with connection.cursor() as cursor:
            cursor.execute(
                "SELECT basic_salary, allowances, deductions FROM portal_payroll_record WHERE id=%s", [record_id]
            )
            row_ = cursor.fetchone()
            if not row_:
                return Response({"detail": "Payslip not found."}, status=404)
            basic, allowances, deductions = row_
            allowances = d.get("allowances", allowances)
            deductions = d.get("deductions", deductions)
            net_pay = float(basic) + float(allowances) - float(deductions)
            status_val = d.get("status")
            if status_val == "Paid":
                cursor.execute(
                    "UPDATE portal_payroll_record SET allowances=%s, deductions=%s, net_pay=%s, "
                    "status='Paid', paid_on=now() WHERE id=%s",
                    [allowances, deductions, net_pay, record_id],
                )
            else:
                cursor.execute(
                    "UPDATE portal_payroll_record SET allowances=%s, deductions=%s, net_pay=%s WHERE id=%s",
                    [allowances, deductions, net_pay, record_id],
                )
        log_action(request.user, "payroll.update", "portal_payroll_record", record_id, dict(d))
        return Response({"detail": "Payslip updated."})
