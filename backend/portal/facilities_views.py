"""Facilities & back-office modules added after the initial client review:
Hostel, Inventory, Visitor Management, Alumni Registry, Medical Records.

Follows the same conventions as admin_views.py / views.py / parent_views.py:
raw SQL against portal_* tables (no ORM models — see portal/models.py for why),
role resolved server-side via portal.roles, every admin write logged via
log_action(). Kept in its own file so the five new modules are easy to find
and don't bloat admin_views.py further.
"""
import re
from datetime import date

from django.db import connection, transaction
from drf_spectacular.types import OpenApiTypes
from drf_spectacular.utils import OpenApiExample, OpenApiParameter, extend_schema, inline_serializer
from rest_framework import serializers
from rest_framework.response import Response
from rest_framework.views import APIView

from .admin_views import AdminMixin, SimpleTableView
from .doc_schemas import (
    DetailErrorSerializer,
    ERROR_RESPONSES,
    IdDetailResponseSerializer,
    STUDENT_ID_PARAMETER,
)
from .parent_views import ParentMixin, _assert_own_child
from .roles import get_role, log_action
from .views import StudentOnlyMixin, row, rows, serialise, table_exists

# =============================================================================
# Documentation-only schemas (raw-SQL views have no DRF serializers)
# =============================================================================
_HOSTEL_ITEM = inline_serializer(
    name="HostelItem",
    fields={
        "id": serializers.IntegerField(),
        "name": serializers.CharField(),
        "type": serializers.CharField(required=False),
        "warden_id": serializers.IntegerField(required=False),
    },
)
_HOSTEL_CREATE_REQUEST = inline_serializer(
    name="HostelCreateRequest",
    fields={
        "name": serializers.CharField(),
        "type": serializers.CharField(required=False),
        "warden_id": serializers.IntegerField(required=False),
    },
)

_ROOM_ITEM = inline_serializer(
    name="RoomItem",
    fields={
        "id": serializers.IntegerField(),
        "hostel_id": serializers.IntegerField(),
        "room_number": serializers.CharField(),
        "capacity": serializers.IntegerField(),
        "occupied_beds": serializers.IntegerField(required=False),
        "hostel_name": serializers.CharField(),
    },
)
_ROOM_CREATE_REQUEST = inline_serializer(
    name="RoomCreateRequest",
    fields={
        "hostel_id": serializers.IntegerField(),
        "room_number": serializers.CharField(),
        "capacity": serializers.IntegerField(required=False),
    },
)
_ROOM_CREATE_EXAMPLE = OpenApiExample(
    name="RoomCreateExample",
    value={"hostel_id": 1, "room_number": "A-101", "capacity": 2},
)

_HOSTEL_ALLOCATION_ITEM = inline_serializer(
    name="HostelAllocationItem",
    fields={
        "id": serializers.IntegerField(),
        "allocated_date": serializers.DateField(),
        "vacated_date": serializers.DateField(required=False),
        "student_name": serializers.CharField(),
        "room_number": serializers.CharField(),
        "hostel_name": serializers.CharField(),
    },
)
_HOSTEL_ALLOCATION_CREATE_REQUEST = inline_serializer(
    name="HostelAllocationCreateRequest",
    fields={
        "student_id": serializers.IntegerField(),
        "room_id": serializers.IntegerField(),
    },
)
_HOSTEL_ALLOCATION_CREATE_EXAMPLE = OpenApiExample(
    name="HostelAllocationExample",
    value={"student_id": 12, "room_id": 3},
)

_STOCK_HOSTEL_ITEM = inline_serializer(
    name="StudentHostelItem",
    fields={
        "room_number": serializers.CharField(),
        "hostel_name": serializers.CharField(),
        "type": serializers.CharField(required=False),
        "allocated_date": serializers.DateField(),
    },
)
_STUDENT_TRANSPORT_ITEM = inline_serializer(
    name="StudentTransportItem",
    fields={
        "pickup_point": serializers.CharField(),
        "vehicle_id": serializers.IntegerField(),
        "vehicle_number": serializers.CharField(),
        "maintenance_status": serializers.CharField(required=False),
        "route_name": serializers.CharField(),
        "start_point": serializers.CharField(),
        "end_point": serializers.CharField(),
        "driver_name": serializers.CharField(required=False),
    },
)

_INVENTORY_ITEM = inline_serializer(
    name="InventoryItem",
    fields={
        "id": serializers.IntegerField(),
        "item_name": serializers.CharField(),
        "category": serializers.CharField(),
        "quantity": serializers.IntegerField(),
        "department": serializers.CharField(),
    },
)
_INVENTORY_CREATE_REQUEST = inline_serializer(
    name="InventoryCreateRequest",
    fields={
        "item_name": serializers.CharField(),
        "category": serializers.CharField(required=False),
        "quantity": serializers.IntegerField(required=False),
        "department": serializers.CharField(required=False),
    },
)
_INVENTORY_CREATE_EXAMPLE = OpenApiExample(
    name="InventoryCreateExample",
    value={
        "item_name": "A4 paper reams",
        "category": "Stationery",
        "quantity": 200,
        "department": "Administration",
    },
)
_INVENTORY_ADJUST_REQUEST = inline_serializer(
    name="InventoryAdjustRequest",
    fields={
        "id": serializers.IntegerField(),
        "quantity_delta": serializers.IntegerField(),
    },
)
_INVENTORY_ADJUST_EXAMPLE = OpenApiExample(
    name="InventoryAdjustExample",
    value={"id": 7, "quantity_delta": -25},
)
_QUANTITY_DETAIL_RESPONSE = inline_serializer(
    name="QuantityDetailResponse",
    fields={
        "quantity": serializers.IntegerField(),
        "detail": serializers.CharField(),
    },
)

_VISITOR_LOG_ITEM = inline_serializer(
    name="VisitorLogItem",
    fields={
        "id": serializers.IntegerField(),
        "visitor_name": serializers.CharField(),
        "purpose": serializers.CharField(),
        "host_user_id": serializers.IntegerField(required=False),
        "id_proof_type": serializers.CharField(),
        "check_in_time": serializers.DateTimeField(required=False),
        "check_out_time": serializers.DateTimeField(required=False),
        "host_name": serializers.CharField(required=False),
    },
)
_VISITOR_LOG_CREATE_REQUEST = inline_serializer(
    name="VisitorLogCreateRequest",
    fields={
        "visitor_name": serializers.CharField(),
        "purpose": serializers.CharField(),
        "host_user_id": serializers.IntegerField(required=False),
        "id_proof_type": serializers.CharField(required=False),
    },
)
_VISITOR_LOG_CREATE_EXAMPLE = OpenApiExample(
    name="VisitorCheckInExample",
    value={
        "visitor_name": "Ravi Kumar",
        "purpose": "Parent meeting with class teacher",
        "host_user_id": 12,
        "id_proof_type": "Aadhaar",
    },
)
_VISITOR_CHECKIN_RESPONSE = inline_serializer(
    name="VisitorCheckInResponse",
    fields={
        "id": serializers.IntegerField(),
        "check_in_time": serializers.DateTimeField(),
        "detail": serializers.CharField(),
    },
)

_ALUMNI_ITEM = inline_serializer(
    name="AlumniItem",
    fields={
        "id": serializers.IntegerField(),
        "student_id": serializers.IntegerField(),
        "graduation_year": serializers.IntegerField(),
        "current_occupation": serializers.CharField(required=False),
        "higher_studies_details": serializers.CharField(required=False),
        "student_name": serializers.CharField(),
        "email": serializers.EmailField(required=False),
    },
)
_ALUMNI_UPSERT_REQUEST = inline_serializer(
    name="AlumniUpsertRequest",
    fields={
        "student_id": serializers.IntegerField(),
        "graduation_year": serializers.IntegerField(),
        "current_occupation": serializers.CharField(required=False),
        "higher_studies_details": serializers.CharField(required=False),
    },
)

_MEDICAL_LOG_ITEM = inline_serializer(
    name="MedicalLogItem",
    fields={
        "id": serializers.IntegerField(),
        "student_id": serializers.IntegerField(),
        "visit_date": serializers.DateField(),
        "symptoms": serializers.CharField(required=False),
        "treatment_given": serializers.CharField(required=False),
        "doctor_notes": serializers.CharField(required=False),
        "recorded_by": serializers.IntegerField(),
        "student_name": serializers.CharField(),
    },
)
_MEDICAL_LOG_CREATE_REQUEST = inline_serializer(
    name="MedicalLogCreateRequest",
    fields={
        "student_id": serializers.IntegerField(),
        "symptoms": serializers.CharField(required=False),
        "treatment_given": serializers.CharField(required=False),
        "doctor_notes": serializers.CharField(required=False),
    },
)
_STUDENT_MEDICAL_ITEM = inline_serializer(
    name="StudentMedicalItem",
    fields={
        "id": serializers.IntegerField(),
        "visit_date": serializers.DateField(),
        "symptoms": serializers.CharField(required=False),
        "treatment_given": serializers.CharField(required=False),
        "doctor_notes": serializers.CharField(required=False),
    },
)

_PAYROLL_ITEM = inline_serializer(
    name="PayrollItem",
    fields={
        "id": serializers.IntegerField(),
        "employee_id": serializers.IntegerField(),
        "pay_month": serializers.CharField(),
        "basic_salary": serializers.DecimalField(max_digits=12, decimal_places=2),
        "allowances": serializers.DecimalField(max_digits=12, decimal_places=2),
        "deductions": serializers.DecimalField(max_digits=12, decimal_places=2),
        "net_pay": serializers.DecimalField(max_digits=12, decimal_places=2),
        "status": serializers.CharField(),
        "paid_on": serializers.DateTimeField(required=False),
        "generated_by": serializers.IntegerField(required=False),
        "employee_name": serializers.CharField(),
        "designation": serializers.CharField(required=False),
        "department": serializers.CharField(required=False),
        "employee_code": serializers.CharField(required=False),
    },
)
_PAYROLL_UPDATE_REQUEST = inline_serializer(
    name="PayrollUpdateRequest",
    fields={
        "id": serializers.IntegerField(),
        "allowances": serializers.DecimalField(max_digits=12, decimal_places=2, required=False),
        "deductions": serializers.DecimalField(max_digits=12, decimal_places=2, required=False),
        "status": serializers.CharField(required=False),
    },
)
_PAYROLL_UPDATE_EXAMPLE = OpenApiExample(
    name="PayrollUpdateExample",
    value={"id": 41, "allowances": 5000.0, "deductions": 1200.0, "status": "Paid"},
)


# ---------------------------------------------------------------------------
# Reusable query path/query parameters for these modules
# ---------------------------------------------------------------------------
_HOSTEL_ID_PARAMETER = OpenApiParameter(
    name="hostel_id",
    type=OpenApiTypes.INT,
    location=OpenApiParameter.QUERY,
    required=False,
    description="Filter rooms belonging to this hostel.",
)
_DEPARTMENT_PARAMETER = OpenApiParameter(
    name="department",
    type=OpenApiTypes.STR,
    location=OpenApiParameter.QUERY,
    required=False,
    description="Filter inventory items by department.",
)
_OPEN_PARAMETER = OpenApiParameter(
    name="open",
    type=OpenApiTypes.BOOL,
    location=OpenApiParameter.QUERY,
    required=False,
    description="Pass open=true to list only visitors still checked in.",
)
_GRADUATION_YEAR_PARAMETER = OpenApiParameter(
    name="graduation_year",
    type=OpenApiTypes.INT,
    location=OpenApiParameter.QUERY,
    required=False,
    description="Filter alumni by graduation year.",
)
_CHILD_ID_PARAMETER = OpenApiParameter(
    name="child_id",
    type=OpenApiTypes.INT,
    location=OpenApiParameter.QUERY,
    required=True,
    description="The parent's child (student) to look up.",
)
_ALLOCATION_ID_PARAMETER = OpenApiParameter(
    name="allocation_id",
    type=OpenApiTypes.INT,
    location=OpenApiParameter.PATH,
    required=True,
    description="Hostel allocation id to vacate.",
)
_VISITOR_ID_PARAMETER = OpenApiParameter(
    name="visitor_id",
    type=OpenApiTypes.INT,
    location=OpenApiParameter.PATH,
    required=True,
    description="Visitor log id to check out.",
)


# =============================================================================
# HOSTEL
# =============================================================================
class HostelView(SimpleTableView):
    table = "portal_hostel"
    columns = ("name", "type", "warden_id")
    order_by = "name"

    @extend_schema(
        operation_id="HostelList",
        summary="List hostels",
        description="Return all hostels.",
        tags=["Hostel"],
        responses={200: serializers.ListSerializer(child=_HOSTEL_ITEM), **ERROR_RESPONSES},
    )
    def get(self, request):
        return super().get(request)

    @extend_schema(
        operation_id="HostelCreate",
        summary="Create a hostel",
        description="Create a new hostel.",
        tags=["Hostel"],
        request=_HOSTEL_CREATE_REQUEST,
        responses={200: IdDetailResponseSerializer, **ERROR_RESPONSES},
    )
    def post(self, request):
        return super().post(request)


class RoomView(AdminMixin, APIView):
    """GET ?hostel_id= to scope to one hostel; POST to add a room."""

    @extend_schema(
        operation_id="RoomList",
        summary="List rooms",
        description="Return rooms, optionally filtered to one hostel.",
        tags=["Hostel"],
        parameters=[_HOSTEL_ID_PARAMETER],
        responses={200: serializers.ListSerializer(child=_ROOM_ITEM), **ERROR_RESPONSES},
    )
    def get(self, request):
        if not table_exists("portal_room"):
            return Response([])
        hostel_id = request.query_params.get("hostel_id")
        sql = (
            "SELECT r.*, h.name AS hostel_name FROM portal_room r "
            "JOIN portal_hostel h ON h.id = r.hostel_id"
        )
        params = []
        if hostel_id:
            sql += " WHERE r.hostel_id=%s"
            params.append(hostel_id)
        sql += " ORDER BY h.name, r.room_number"
        return Response(serialise(rows(sql, params)))

    @extend_schema(
        operation_id="RoomCreate",
        summary="Add a room",
        description="Create a new room in a hostel.",
        tags=["Hostel"],
        request=_ROOM_CREATE_REQUEST,
        examples=[_ROOM_CREATE_EXAMPLE],
        responses={200: IdDetailResponseSerializer, **ERROR_RESPONSES},
    )
    def post(self, request):
        if not table_exists("portal_room"):
            return Response({"detail": "Portal schema has not been applied."}, status=400)
        d = request.data
        with connection.cursor() as cursor:
            cursor.execute(
                "INSERT INTO portal_room (hostel_id, room_number, capacity, floor, facilities) VALUES (%s,%s,%s,%s,%s) RETURNING id",
                [d.get("hostel_id"), d.get("room_number"), d.get("capacity", 1), d.get("floor"), d.get("facilities")],
            )
            new_id = cursor.fetchone()[0]
        log_action(request.user, "hostel.room.create", "portal_room", new_id, dict(d))
        return Response({"id": new_id, "detail": "Room added."})

    @extend_schema(
        operation_id="RoomUpdate",
        summary="Update a room",
        description="Edit room details (hostel, number, floor, capacity, facilities).",
        tags=["Hostel"],
        request=OpenApiTypes.OBJECT,
        responses={200: IdDetailResponseSerializer, **ERROR_RESPONSES},
    )
    def patch(self, request):
        """Body: {id, hostel_id?, room_number?, floor?, capacity?, facilities?}."""
        if not table_exists("portal_room"):
            return Response({"detail": "Portal schema has not been applied."}, status=400)
        d = request.data
        record_id = d.get("id")
        if record_id in (None, ""):
            return Response({"detail": "The 'id' field is required for updates."}, status=400)
        fields = {}
        for col in ("hostel_id", "room_number", "floor", "capacity", "facilities"):
            if col in d and d[col] not in (None, ""):
                fields[col] = d[col]
        if not fields:
            return Response({"detail": "No updatable fields were provided."}, status=400)
        cols = list(fields)
        with connection.cursor() as cursor:
            cursor.execute(
                f"UPDATE portal_room SET {', '.join(f'{c}=%s' for c in cols)} WHERE id=%s RETURNING id",
                [fields[c] for c in cols] + [record_id],
            )
            if cursor.fetchone() is None:
                return Response({"detail": "Room not found."}, status=404)
        log_action(request.user, "hostel.room.update", "portal_room", record_id, dict(fields))
        return Response({"id": record_id, "detail": "Room updated."})

    @extend_schema(
        operation_id="RoomDelete",
        summary="Delete a room",
        description="Remove a room. Refuses if students are currently allocated to it.",
        tags=["Hostel"],
        parameters=[_HOSTEL_ID_PARAMETER],
        responses={200: IdDetailResponseSerializer, **ERROR_RESPONSES},
    )
    def delete(self, request):
        if not table_exists("portal_room"):
            return Response({"detail": "Portal schema has not been applied."}, status=400)
        try:
            record_id = int(request.query_params.get("id", ""))
        except (TypeError, ValueError):
            return Response({"detail": "The 'id' query parameter is required."}, status=400)
        with connection.cursor() as cursor:
            cursor.execute("SELECT id FROM portal_hostel_allocation WHERE room_id=%s AND vacated_date IS NULL", [record_id])
            if cursor.fetchone():
                return Response({"detail": "Cannot delete: students are currently allocated to this room."}, status=400)
            cursor.execute("DELETE FROM portal_room WHERE id=%s", [record_id])
            if cursor.rowcount == 0:
                return Response({"detail": "Room not found."}, status=404)
        log_action(request.user, "hostel.room.delete", "portal_room", record_id)
        return Response({"detail": "Room deleted."})


class HostelAllocationView(AdminMixin, APIView):
    @extend_schema(
        operation_id="HostelAllocationList",
        summary="List current hostel allocations",
        description="Return all active (non-vacated) hostel allocations.",
        tags=["Hostel"],
        responses={200: serializers.ListSerializer(child=_HOSTEL_ALLOCATION_ITEM), **ERROR_RESPONSES},
    )
    def get(self, request):
        if not table_exists("portal_hostel_allocation"):
            return Response([])
        return Response(serialise(rows(
            """
            SELECT a.id, a.allocated_date, a.vacated_date,
                   COALESCE(u.first_name || ' ' || u.last_name, u.username) AS student_name,
                   r.room_number, h.name AS hostel_name
            FROM portal_hostel_allocation a
            JOIN auth_user u ON u.id = a.student_id
            JOIN portal_room r ON r.id = a.room_id
            JOIN portal_hostel h ON h.id = r.hostel_id
            WHERE a.vacated_date IS NULL
            ORDER BY h.name, r.room_number
            """
        )))

    @extend_schema(
        operation_id="HostelAllocationCreate",
        summary="Allocate a student to a room",
        description="Allocate a student to a room. Rejects if the room is already full.",
        tags=["Hostel"],
        request=_HOSTEL_ALLOCATION_CREATE_REQUEST,
        examples=[_HOSTEL_ALLOCATION_CREATE_EXAMPLE],
        responses={200: IdDetailResponseSerializer, **ERROR_RESPONSES},
    )
    def post(self, request):
        """Allocate a student to a room. Rejects if the room is already full."""
        if not table_exists("portal_hostel_allocation"):
            return Response({"detail": "Portal schema has not been applied."}, status=400)
        student_id = request.data.get("student_id")
        room_id = request.data.get("room_id")
        room = row("SELECT capacity, occupied_beds FROM portal_room WHERE id=%s", [room_id])
        if not room:
            return Response({"detail": "Room not found."}, status=404)
        if room["occupied_beds"] >= room["capacity"]:
            return Response({"detail": "Room is already at full capacity."}, status=400)
        with transaction.atomic():
            with connection.cursor() as cursor:
                cursor.execute(
                    "INSERT INTO portal_hostel_allocation (student_id, room_id) VALUES (%s,%s) RETURNING id",
                    [student_id, room_id],
                )
                alloc_id = cursor.fetchone()[0]
                cursor.execute("UPDATE portal_room SET occupied_beds = occupied_beds + 1 WHERE id=%s", [room_id])
        log_action(request.user, "hostel.allocate", "student", student_id, {"room_id": room_id})
        return Response({"id": alloc_id, "detail": "Student allocated to room."})


class HostelVacateView(AdminMixin, APIView):
    @extend_schema(
        operation_id="HostelVacate",
        summary="Vacate a hostel allocation",
        description="Mark a hostel allocation as vacated today and free the room's occupied bed.",
        tags=["Hostel"],
        parameters=[_ALLOCATION_ID_PARAMETER],
        request=None,
        responses={200: DetailErrorSerializer, **ERROR_RESPONSES},
    )
    def post(self, request, allocation_id):
        if not table_exists("portal_hostel_allocation"):
            return Response({"detail": "Portal schema has not been applied."}, status=400)
        alloc = row("SELECT room_id, vacated_date FROM portal_hostel_allocation WHERE id=%s", [allocation_id])
        if not alloc:
            return Response({"detail": "Allocation not found."}, status=404)
        if alloc["vacated_date"]:
            return Response({"detail": "Already vacated."}, status=400)
        with transaction.atomic():
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
    """A student's own current room, if any."""

    @extend_schema(
        operation_id="StudentHostelView",
        summary="Student's current hostel room",
        description="Return the current student's hostel room allocation, if any.",
        tags=["Hostel"],
        responses={200: _STOCK_HOSTEL_ITEM, **ERROR_RESPONSES},
    )
    def get(self, request):
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
            [request.user.id],
        )
        return Response(serialise(data))


class StudentTransportView(StudentOnlyMixin, APIView):
    """A student's own current transport allocation, if any."""

    @extend_schema(
        operation_id="StudentTransportView",
        summary="Student's current transport allocation",
        description="Return the current student's transport allocation, if any.",
        tags=["Transport"],
        responses={200: _STUDENT_TRANSPORT_ITEM, **ERROR_RESPONSES},
    )
    def get(self, request):
        if not table_exists("portal_transport_allocation"):
            return Response(None)
        data = row(
            """
            SELECT ta.pickup_point, v.id AS vehicle_id, v.vehicle_number, v.maintenance_status,
                   r.route_name, r.start_point, r.end_point,
                   COALESCE(du.first_name || ' ' || du.last_name, du.username) AS driver_name
            FROM portal_transport_allocation ta
            JOIN portal_vehicle v ON v.id = ta.vehicle_id
            JOIN portal_route r ON r.id = ta.route_id
            LEFT JOIN auth_user du ON du.id = v.driver_id
            WHERE ta.student_id = %s
            """,
            [request.user.id],
        )
        return Response(serialise(data))


class ChildHostelView(ParentMixin, APIView):
    """A parent's view of their child's current hostel room."""

    @extend_schema(
        operation_id="ChildHostelView",
        summary="Parent's view of a child's hostel room",
        description="Return a parent's child's current hostel room, if any.",
        tags=["Hostel"],
        parameters=[_CHILD_ID_PARAMETER],
        responses={200: _STOCK_HOSTEL_ITEM, **ERROR_RESPONSES},
    )
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

    @extend_schema(
        operation_id="InventoryList",
        summary="List inventory items",
        description="Return inventory items, optionally filtered by department.",
        tags=["System"],
        parameters=[_DEPARTMENT_PARAMETER],
        responses={200: serializers.ListSerializer(child=_INVENTORY_ITEM), **ERROR_RESPONSES},
    )
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

    @extend_schema(
        operation_id="InventoryCreate",
        summary="Add an inventory item",
        description="Create a new inventory line item.",
        tags=["System"],
        request=_INVENTORY_CREATE_REQUEST,
        examples=[_INVENTORY_CREATE_EXAMPLE],
        responses={200: IdDetailResponseSerializer, **ERROR_RESPONSES},
    )
    def post(self, request):
        if not table_exists("portal_inventory"):
            return Response({"detail": "Portal schema has not been applied."}, status=400)
        d = request.data if isinstance(request.data, dict) else {}
        if not d.get("item_name"):
            return Response({"detail": "item_name is required."}, status=400)
        quantity = d.get("quantity", 0)
        try:
            quantity = int(quantity)
        except (TypeError, ValueError):
            return Response({"detail": "quantity must be an integer."}, status=400)
        if quantity < 0:
            return Response({"detail": "quantity cannot be negative."}, status=400)
        with connection.cursor() as cursor:
            cursor.execute(
                "INSERT INTO portal_inventory (item_name, category, quantity, department) "
                "VALUES (%s,%s,%s,%s) RETURNING id",
                [d.get("item_name"), d.get("category", "General"), quantity, d.get("department", "Administration")],
            )
            new_id = cursor.fetchone()[0]
        log_action(request.user, "inventory.create", "portal_inventory", new_id, dict(d))
        return Response({"id": new_id, "detail": "Item added."}, status=201)

    @extend_schema(
        operation_id="InventoryAdjust",
        summary="Adjust stock quantity",
        description="Body: {id, quantity_delta} — adjusts stock up or down (never below zero).",
        tags=["System"],
        request=_INVENTORY_ADJUST_REQUEST,
        examples=[_INVENTORY_ADJUST_EXAMPLE],
        responses={200: _QUANTITY_DETAIL_RESPONSE, **ERROR_RESPONSES},
    )
    def patch(self, request):
        """Body: {id, quantity_delta} — adjusts stock up or down."""
        if not table_exists("portal_inventory"):
            return Response({"detail": "Portal schema has not been applied."}, status=400)
        if not isinstance(request.data, dict):
            return Response({"detail": "A JSON object body is required."}, status=400)
        item_id = request.data.get("id")
        try:
            delta = int(request.data.get("quantity_delta", 0))
        except (TypeError, ValueError):
            return Response({"detail": "quantity_delta must be an integer."}, status=400)
        with connection.cursor() as cursor:
            cursor.execute(
                "SELECT quantity FROM portal_inventory WHERE id=%s",
                [item_id],
            )
            current = cursor.fetchone()
            if not current:
                return Response({"detail": "Item not found."}, status=404)
            cursor.execute(
                "UPDATE portal_inventory SET quantity = GREATEST(quantity + %s, 0), updated_at = now() "
                "WHERE id=%s RETURNING quantity",
                [delta, item_id],
            )
            result = cursor.fetchone()
        clamped = (current[0] + delta) < 0
        log_action(request.user, "inventory.adjust", "portal_inventory", item_id, {"delta": delta})
        detail = "Stock updated." if not clamped else "Stock updated (adjustment clamped at zero — insufficient stock)."
        return Response({"quantity": result[0], "detail": detail})


# =============================================================================
# VISITOR MANAGEMENT
# =============================================================================
class VisitorLogView(AdminMixin, APIView):
    @extend_schema(
        operation_id="VisitorLogList",
        summary="List visitor logs",
        description="Return recent visitor check-in logs, optionally only those still checked in.",
        tags=["System"],
        parameters=[_OPEN_PARAMETER],
        responses={200: serializers.ListSerializer(child=_VISITOR_LOG_ITEM), **ERROR_RESPONSES},
    )
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

    @extend_schema(
        operation_id="VisitorLogCheckIn",
        summary="Check in a visitor",
        description="Create a visitor log entry with a check-in time.",
        tags=["System"],
        request=_VISITOR_LOG_CREATE_REQUEST,
        examples=[_VISITOR_LOG_CREATE_EXAMPLE],
        responses={200: _VISITOR_CHECKIN_RESPONSE, **ERROR_RESPONSES},
    )
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
    @extend_schema(
        operation_id="VisitorCheckout",
        summary="Check out a visitor",
        description="Stamp a check-out time on an open visitor log.",
        tags=["System"],
        parameters=[_VISITOR_ID_PARAMETER],
        request=None,
        responses={200: DetailErrorSerializer, **ERROR_RESPONSES},
    )
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
    @extend_schema(
        operation_id="AlumniList",
        summary="List alumni",
        description="Return alumni records, optionally filtered by graduation year.",
        tags=["Admin Portal"],
        parameters=[_GRADUATION_YEAR_PARAMETER],
        responses={200: serializers.ListSerializer(child=_ALUMNI_ITEM), **ERROR_RESPONSES},
    )
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

    @extend_schema(
        operation_id="AlumniUpsert",
        summary="Create or update an alumni record",
        description="Upsert an alumni record keyed by student_id.",
        tags=["Admin Portal"],
        request=_ALUMNI_UPSERT_REQUEST,
        responses={200: IdDetailResponseSerializer, **ERROR_RESPONSES},
    )
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

    @extend_schema(
        operation_id="MedicalLogList",
        summary="List medical logs",
        description="Return medical visit logs, optionally filtered by student.",
        tags=["Admin Portal"],
        parameters=[STUDENT_ID_PARAMETER],
        responses={200: serializers.ListSerializer(child=_MEDICAL_LOG_ITEM), **ERROR_RESPONSES},
    )
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

    @extend_schema(
        operation_id="MedicalLogCreate",
        summary="Create a medical log",
        description="Record a medical visit for a student.",
        tags=["Admin Portal"],
        request=_MEDICAL_LOG_CREATE_REQUEST,
        responses={200: IdDetailResponseSerializer, **ERROR_RESPONSES},
    )
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

    @extend_schema(
        operation_id="StudentMedicalView",
        summary="Student's own medical history",
        description="Return the current student's medical visit history.",
        tags=["Student"],
        responses={200: serializers.ListSerializer(child=_STUDENT_MEDICAL_ITEM), **ERROR_RESPONSES},
    )
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

    @extend_schema(
        operation_id="PayrollList",
        summary="List payroll records",
        description=(
            "List a pay period's payslips (auto-generates one Pending payslip per active "
            "employee for the month on first request)."
        ),
        tags=["Payroll"],
        parameters=[
            OpenApiParameter(
                name="month",
                type=OpenApiTypes.STR,
                location=OpenApiParameter.QUERY,
                required=False,
                description="Pay period as 'YYYY-MM-01'. Defaults to the current month.",
            )
        ],
        responses={200: serializers.ListSerializer(child=_PAYROLL_ITEM), **ERROR_RESPONSES},
    )
    def get(self, request):
        if not table_exists("portal_payroll_record") or not table_exists("portal_employee"):
            return Response([])
        month = request.query_params.get("month") or date.today().replace(day=1).isoformat()
        # The HTML <input type="month"> control submits "YYYY-MM"; the
        # pay_month column is a date, so normalize to the first of the month.
        # (An invalid value would otherwise crash the INSERT with a DataError.)
        if re.fullmatch(r"\d{4}-\d{2}", month):
            month = f"{month}-01"

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

    @extend_schema(
        operation_id="PayrollUpdate",
        summary="Adjust or pay a payslip",
        description=(
            "Body: {id, allowances?, deductions?, status?} — recomputes net_pay and, when "
            "status is set to Paid, stamps paid_on."
        ),
        tags=["Payroll"],
        request=_PAYROLL_UPDATE_REQUEST,
        examples=[_PAYROLL_UPDATE_EXAMPLE],
        responses={200: DetailErrorSerializer, **ERROR_RESPONSES},
    )
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


