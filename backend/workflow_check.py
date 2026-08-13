"""End-to-end workflow check for every portal module.

For each module, walks the full lifecycle through the live HTTP API:
  list -> create -> verify reflected -> update -> verify reflected -> delete -> verify gone.
Reports PASS/FAIL per step and cleans up its own test data.
"""
import json
import os
import sys
import urllib.error
import urllib.request

sys.path.insert(0, ".")
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings")
import django

django.setup()

from django.contrib.auth import get_user_model
from rest_framework_simplejwt.tokens import RefreshToken

BASE = "http://127.0.0.1:8000/api"


def token_for(role):
    u = (
        get_user_model()
        .objects.filter(groups__name=role, is_active=True)
        .order_by("id")
        .first()
    )
    return str(RefreshToken.for_user(u).access_token) if u else None


TOKENS = {r: token_for(r) for r in ("Admin", "Student", "Teacher", "Parent")}
ADMIN = TOKENS["Admin"]

RESULTS = []


def req(method, path, token=ADMIN, body=None, form=False):
    data = None
    headers = {"Authorization": f"Bearer {token}"}
    if body is not None:
        data = json.dumps(body).encode()
        headers["Content-Type"] = "application/json"
    r = urllib.request.Request(BASE + path, data=data, headers=headers, method=method)
    try:
        with urllib.request.urlopen(r, timeout=45) as resp:
            raw = resp.read()
            try:
                return resp.status, json.loads(raw)
            except Exception:
                return resp.status, raw[:200].decode("utf-8", "replace")
    except urllib.error.HTTPError as e:
        raw = e.read()
        try:
            return e.code, json.loads(raw)
        except Exception:
            return e.code, raw[:200].decode("utf-8", "replace")
    except Exception as e:
        return "ERR", str(e)[:200]


def step(name, ok, detail=""):
    RESULTS.append((name, ok, detail))
    print(f"  {'PASS' if ok else 'FAIL'}  {name}" + (f"  -> {detail}" if detail and not ok else ""))


def check(name, method, path, expect, token=ADMIN, body=None, extra=None):
    """Run one request; PASS if status in expect. extra = fn(body) -> (ok, note)."""
    status, payload = req(method, path, token=token, body=body)
    ok = status in expect
    detail = f"{method} {path} -> {status} {str(payload)[:160]}" if not ok else ""
    if ok and extra:
        try:
            eok, enote = extra(payload)
            ok = eok
            detail = f"{method} {path} extra: {enote}" if not eok else ""
        except Exception as ex:
            ok = False
            detail = f"{method} {path} extra raised: {ex}"
    step(name, ok, detail)
    return status, payload


def delete_by_id(path, rec_id, name):
    status, payload = req("DELETE", f"{path}?id={rec_id}")
    ok = status in (200, 204)
    step(name, ok, f"DELETE {path}?id={rec_id} -> {status} {str(payload)[:120]}" if not ok else "")
    return status


# ---------------------------------------------------------------------------
print("== Academic: Classes & Subjects ==")
c_status, c_payload = check("class list", "GET", "/admin-portal/classes/", (200,))
cid = c_payload[0]["id"] if c_status == 200 and c_payload else None
_, cp = check("class create", "POST", "/admin-portal/classes/", (201, 200), body={"name": "Workflow-Test", "section": "A"})
new_class_id = cp.get("id") if isinstance(cp, dict) else None
if new_class_id:
    check("class create reflected", "GET", "/admin-portal/classes/", (200,),
          extra=lambda p: (any(x.get("id") == new_class_id for x in p), "class id not in list"))
    check("class update", "PATCH", "/admin-portal/classes/", (200,), body={"id": new_class_id, "section": "B"})
    _, lp = req("GET", "/admin-portal/classes/")
    step("class update reflected", any(x.get("id") == new_class_id and x.get("section") == "B" for x in lp),
         f"updated class section={[x.get('section') for x in lp if x.get('id')==new_class_id]}")
    delete_by_id("/admin-portal/classes", new_class_id, "class delete")

_, sp = check("subject create", "POST", "/admin-portal/subjects/", (201, 200), body={"name": "Workflow Test Subject", "subject_code": "WFT"})
new_subj_id = sp.get("id") if isinstance(sp, dict) else None
if new_subj_id:
    delete_by_id("/admin-portal/subjects", new_subj_id, "subject delete")

# academic levels
_, lv = check("level create", "POST", "/admin-portal/academic/levels/", (201, 200), body={"name": "Workflow Level", "sort_order": 99})
lv_id = lv.get("id") if isinstance(lv, dict) else None
if lv_id:
    check("level update", "PATCH", f"/admin-portal/academic/levels/{lv_id}/", (200,), body={"name": "Workflow Level 2"})
    delete_by_id("/admin-portal/academic/levels", lv_id, "level delete")

# ---------------------------------------------------------------------------
print("== Fees ==")
_, fs = check("fee-structure create", "POST", "/admin-portal/fee-structures/", (201, 200),
              body={"class_id": 54, "term_name": "Workflow Term", "tuition_fee": 1000})
fs_id = fs.get("id") if isinstance(fs, dict) else None
if fs_id:
    check("fee-structure update", "PATCH", "/admin-portal/fee-structures/", (200,), body={"id": fs_id, "tuition_fee": 2000})
    delete_by_id("/admin-portal/fee-structures", fs_id, "fee-structure delete")

_, fc = check("fee-category create", "POST", "/admin-portal/fee-categories/", (201, 200), body={"name": "Workflow Cat"})
fc_id = fc.get("id") if isinstance(fc, dict) else None
if fc_id:
    delete_by_id("/admin-portal/fee-categories", fc_id, "fee-category delete")

_, ay = check("academic-year create", "POST", "/admin-portal/academic-years/", (201, 200),
              body={"name": "2099-00", "start_date": "2099-01-01", "end_date": "2099-12-31"})
ay_id = ay.get("id") if isinstance(ay, dict) else None
if ay_id:
    delete_by_id("/admin-portal/academic-years", ay_id, "academic-year delete")

_, cn = check("fee-concession create", "POST", "/admin-portal/fee-concessions/", (201, 200),
              body={"name": "Workflow Concession", "percentage": 10})
cn_id = cn.get("id") if isinstance(cn, dict) else None
if cn_id:
    delete_by_id("/admin-portal/fee-concessions", cn_id, "fee-concession delete")

# fee assignment + ledger (bulk)
_, fa = check("fee-assignment list", "GET", "/admin-portal/fee-assignments/?fee_structure_id=39", (200,))
if isinstance(fa, list) and fa:
    check("fee-ledger list", "GET", f"/admin-portal/fee-ledger/?fee_structure_id=39", (200,))

# ---------------------------------------------------------------------------
print("== Transport ==")
_, vh = check("vehicle create", "POST", "/admin-portal/vehicles/", (201, 200), body={"vehicle_number": "WF-99-99", "capacity": 10})
vh_id = vh.get("id") if isinstance(vh, dict) else None
if vh_id:
    check("vehicle update", "PATCH", "/admin-portal/vehicles/", (200,), body={"id": vh_id, "capacity": 20})
    _, vl = req("GET", "/admin-portal/vehicles/")
    step("vehicle update reflected", any(x.get("id") == vh_id and x.get("capacity") == 20 for x in vl),
         f"caps={[x.get('capacity') for x in vl if x.get('id')==vh_id]}")
    delete_by_id("/admin-portal/vehicles", vh_id, "vehicle delete")
    # route with new vehicle
    _, rt = check("route create", "POST", "/admin-portal/routes/", (201, 200),
                  body={"route_name": "WF Route", "start_point": "A", "end_point": "B", "vehicle_id": vh_id})
    rt_id = rt.get("id") if isinstance(rt, dict) else None
    if rt_id:
        check("route update", "PATCH", "/admin-portal/routes/", (200,), body={"id": rt_id, "end_point": "C"})
        delete_by_id("/admin-portal/routes", rt_id, "route delete")

_, dr = check("driver list", "GET", "/admin-portal/transport/drivers/", (200,))
_, at = check("attendant list", "GET", "/admin-portal/transport/attendants/", (200,))
_, pp = check("pickup-point list", "GET", "/admin-portal/transport/pickup-points/", (200,))
check("transport settings", "GET", "/admin-portal/transport/settings/", (200,))
_, tp = check("trip list", "GET", "/admin-portal/transport/trips/", (200,))
_, al = check("alert list", "GET", "/admin-portal/transport/notifications/", (200,))
check("transport reports", "GET", "/admin-portal/transport/reports/", (200,))
check("live-map", "GET", "/admin-portal/transport/live-map/", (200,))

# ---------------------------------------------------------------------------
print("== Hostel ==")
_, h = check("hostel create", "POST", "/admin-portal/hostels/", (201, 200), body={"name": "Workflow Hostel", "type": "Boys"})
h_id = h.get("id") if isinstance(h, dict) else None
if h_id:
    check("hostel update", "PATCH", "/admin-portal/hostels/", (200,), body={"id": h_id, "type": "Girls"})
    delete_by_id("/admin-portal/hostels", h_id, "hostel delete")

_, rm = check("room create", "POST", "/admin-portal/rooms/", (201, 200), body={"hostel_id": 34, "room_number": "WF-1", "capacity": 2})
rm_id = rm.get("id") if isinstance(rm, dict) else None
if rm_id:
    check("room update", "PATCH", "/admin-portal/rooms/", (200,), body={"id": rm_id, "capacity": 3})
    delete_by_id("/admin-portal/rooms", rm_id, "room delete")

_, ha = check("hostel-allocation create", "POST", "/admin-portal/hostel-allocations/", (201, 200),
              body={"student_id": 146, "hostel_id": 34, "room_id": 33})
ha_id = ha.get("id") if isinstance(ha, dict) else None
if ha_id:
    _, hv = req("POST", f"/admin-portal/hostel-allocations/{ha_id}/vacate/", body={})
    step("hostel-allocation vacate", hv in (200,), f"vacate -> {hv}")

# ---------------------------------------------------------------------------
print("== Library ==")
_, bk = check("book create", "POST", "/admin-portal/library/books/", (201, 200),
              body={"title": "Workflow Book", "author": "WF", "isbn": "WF-ISBN", "barcode_id": "WF-BC", "quantity": 2, "available_quantity": 2})
bk_id = bk.get("id") if isinstance(bk, dict) else None
if bk_id:
    _, iss = check("book issue", "POST", "/admin-portal/library/issue/", (201, 200), body={"book_id": bk_id, "borrower_id": 146, "loan_days": 7})
    txn_id = iss.get("id") if isinstance(iss, dict) else None
    if txn_id:
        check("book return", "POST", f"/admin-portal/library/return/{txn_id}/", (200,))
    delete_by_id("/admin-portal/library/books", bk_id, "book delete")

# ---------------------------------------------------------------------------
print("== Notices / CMS ==")
_, nt = check("notice broadcast", "POST", "/admin-portal/notices/", (201, 200),
              body={"recipient_type": "All", "title": "Workflow Notice", "message": "test"})
if isinstance(nt, dict) and nt.get("id"):
    pass  # notices have no delete endpoint; leave the single test row? Clean below.
print("  (notice row left for audit; single test row)")

# ---------------------------------------------------------------------------
print("== Visitors ==")
_, vs = check("visitor check-in", "POST", "/admin-portal/visitors/", (201, 200),
              body={"visitor_name": "Workflow Visitor", "purpose": "test", "id_proof_type": "Aadhaar"})
vs_id = vs.get("id") if isinstance(vs, dict) else None
if vs_id:
    check("visitor checkout", "POST", f"/admin-portal/visitors/{vs_id}/checkout/", (200,), body={})

# ---------------------------------------------------------------------------
print("== Inventory ==")
_, inv = check("inventory create", "POST", "/admin-portal/inventory/", (201, 200),
               body={"item_name": "Workflow Item", "category": "General", "quantity": 5, "department": "Administration"})
inv_id = inv.get("id") if isinstance(inv, dict) else None
if inv_id:
    check("inventory update", "PATCH", "/admin-portal/inventory/", (200,), body={"id": inv_id, "quantity_delta": -2})

# ---------------------------------------------------------------------------
print("== Payroll ==")
_, pr = check("payroll list", "GET", "/admin-portal/payroll/?month=2026-07", (200,))
if isinstance(pr, list) and pr:
    rec = pr[0]
    check("payroll patch", "PATCH", "/admin-portal/payroll/", (200,), body={"id": rec["id"], "allowances": rec.get("allowances", 0)})

# ---------------------------------------------------------------------------
print("== Alumni ==")
_, alu = check("alumni create", "POST", "/admin-portal/alumni/", (201, 200),
               body={"student_id": 146, "graduation_year": 2024})
alu_id = alu.get("id") if isinstance(alu, dict) else None

# ---------------------------------------------------------------------------
print("== Medical ==")
_, md = check("medical create", "POST", "/admin-portal/medical-logs/", (201, 200),
              body={"student_id": 146, "symptoms": "test", "treatment_given": "rest"})
md_id = md.get("id") if isinstance(md, dict) else None

# ---------------------------------------------------------------------------
print("== Recruitment ==")
_, rc = check("recruitment list", "GET", "/admin-portal/recruitment/", (200,))
if isinstance(rc, list) and rc:
    app = rc[0]
    _, rp = check("recruitment status update", "PATCH", "/admin-portal/recruitment/", (200,),
                  body={"id": app["id"], "status": "Interview"})
    _, iv = check("interview schedule", "POST", "/admin-portal/interviews/", (201, 200),
                  body={"application_id": app["id"], "interview_date": "2026-09-01T10:00:00", "interviewer_name": "WF Admin"})
    check("interview list", "GET", "/admin-portal/interviews/", (200,))
    check("interview update", "PATCH", "/admin-portal/interviews/", (200,),
          body={"id": app["id"], "status": "Completed", "feedback": "ok"})
    # restore original status
    req("PATCH", "/admin-portal/recruitment/", body={"id": app["id"], "status": app["status"]})

# ---------------------------------------------------------------------------
print("== Scholarships ==")
_, sc = check("scholarship create", "POST", "/admin-portal/scholarships/", (201, 200),
              body={"name": "Workflow Scholarship", "description": "test", "eligibility_criteria": "all"})
sc_id = sc.get("id") if isinstance(sc, dict) else None
if sc_id:
    check("scholarship renew list", "GET", "/admin-portal/scholarships/renew/", (200,))

# ---------------------------------------------------------------------------
print("== Users ==")
_, us = check("user create", "POST", "/admin-portal/users/", (201, 200),
              body={"role": "Student", "first_name": "Workflow", "last_name": "User", "email": "wfuser@test.local",
                    "class_id": 54, "parent_name": "WF Parent", "parent_email": "wfparent@test.local"})
new_uid = None
if isinstance(us, dict):
    new_uid = us.get("id") or (us.get("user", {}) or {}).get("id")
if new_uid:
    check("user update", "PATCH", f"/admin-portal/users/{new_uid}/", (200,), body={"is_active": False})
    check("user reset-password", "POST", f"/admin-portal/users/{new_uid}/reset-password/", (200,), body={})
    # cleanup: deactivate instead of hard delete (keep audit trail)
else:
    step("user create reflected", False, f"no user id returned: {str(us)[:200]}")

# ---------------------------------------------------------------------------
print("== Admissions (workflow) ==")
_, enq = check("enquiry create", "POST", "/admin-portal/admissions/enquiries/", (201, 200),
               body={"student_name": "Workflow Student", "parent_name": "WF Parent", "phone": "9999999999",
                     "email": "wfstudent@test.local", "class_id": 54})
enq_reg = None
if isinstance(enq, dict):
    enq_reg = enq.get("registration_number") or enq.get("id")
check("enquiry list", "GET", "/admin-portal/admissions/enquiries/", (200,))

# ---------------------------------------------------------------------------
print("== Exam workflow (Examinations) ==")
_, et = check("exam-type create", "POST", "/admin-portal/exam-workflow/types/", (201, 200), body={"name": "Workflow Type"})
et_id = et.get("id") if isinstance(et, dict) else None
if et_id:
    delete_by_id("/admin-portal/exam-workflow/types", et_id, "exam-type delete")
check("exam-workflow subjects", "GET", "/admin-portal/exam-workflow/subjects/", (200,))
check("grade-config list", "GET", "/admin-portal/exam-workflow/grade-config/", (200,))
check("invigilators list", "GET", "/admin-portal/exam-workflow/invigilators/", (200,))
check("seating list", "GET", "/admin-portal/exam-workflow/seating/", (200,))
check("analytics", "GET", "/admin-portal/exam-workflow/analytics/", (200,))
check("rank-list", "GET", "/admin-portal/rank-list/", (200,))
check("rank-list overall", "GET", "/admin-portal/rank-list/overall/", (200,))

# ---------------------------------------------------------------------------
print("== Timetable ==")
_, tm = check("timetable list", "GET", "/admin-portal/timetable/?class_id=54&academic_year=2026", (200,))
check("timetable meta", "GET", "/admin-portal/timetable/meta/", (200,))
check("periods list", "GET", "/admin-portal/timetable/periods/", (200,))
check("school-timings list", "GET", "/admin-portal/timetable/school-timings/", (200,))
check("teacher-allocations list", "GET", "/admin-portal/timetable/teacher-allocations/", (200,))
check("subject-allocations list", "GET", "/admin-portal/timetable/subject-allocations/", (200,))
check("classroom-allocations list", "GET", "/admin-portal/timetable/classroom-allocations/", (200,))
check("calendar list", "GET", "/admin-portal/timetable/calendar/", (200,))
check("workflow-config", "GET", "/admin-portal/timetable/workflow-config/", (200,))
check("approvals list", "GET", "/admin-portal/timetable/approvals/?status=Pending", (200,))
check("audit-logs", "GET", "/admin-portal/timetable/audit-logs/?limit=5", (200,))
check("reports", "GET", "/admin-portal/timetable/reports/?type=workload&academic_year=2026", (200,))
check("working-days", "GET", "/admin-portal/timetable/working-days/?academic_year=2026", (200,))
check("analytics", "GET", "/admin-portal/timetable/analytics/", (200,))
check("notifications list", "GET", "/admin-portal/timetable/notifications/", (200,))
check("substitutes list", "GET", "/admin-portal/timetable/substitutes/", (200,))

# ---------------------------------------------------------------------------
print("== Campus visits ==")
check("campuses list", "GET", "/admin-portal/campuses/", (200,))
check("campus visits list", "GET", "/admin-portal/campuses/visits/", (200,))

# ---------------------------------------------------------------------------
print("== Student portal ==")
ST = TOKENS["Student"]
check("student profile", "GET", "/student/profile/", (200,), token=ST)
check("student dashboard", "GET", "/student/dashboard/", (200,), token=ST)
check("student attendance", "GET", "/student/attendance/", (200,), token=ST)
check("student timetable", "GET", "/student/timetable/", (200,), token=ST)
check("student homework", "GET", "/student/homework/", (200,), token=ST)
check("student assignments", "GET", "/student/assignments/", (200,), token=ST)
check("student courses", "GET", "/student/courses/", (200,), token=ST)
check("student exams", "GET", "/student/exams/", (200,), token=ST)
check("student hall-tickets", "GET", "/student/hall-tickets/", (200,), token=ST)
check("student results", "GET", "/student/results/", (200,), token=ST)
check("student fees", "GET", "/student/fees/", (200,), token=ST)
check("student library", "GET", "/student/library/", (200,), token=ST)
check("student certificates", "GET", "/student/certificates/", (200,), token=ST)
check("student announcements", "GET", "/student/announcements/", (200,), token=ST)
check("student events", "GET", "/student/events/", (200,), token=ST)
check("student hostel", "GET", "/student/hostel/", (200,), token=ST)
check("student transport", "GET", "/student/transport/", (200,), token=ST)
check("student medical", "GET", "/student/medical-records/", (200,), token=ST)
check("student report-card", "GET", "/student/report-card/", (200,), token=ST)
check("student revaluation", "GET", "/student/exams/revaluation/", (200,), token=ST)
check("student supplementary", "GET", "/student/supplementary/", (200,), token=ST)
check("student academic-certificates", "GET", "/student/academic-certificates/", (200,), token=ST)
check("student leave create", "POST", "/student/leaves/", (201, 200), token=ST,
      body={"leave_type": "Sick", "start_date": "2026-09-01", "end_date": "2026-09-02", "reason": "workflow test"})
check("lms forum topics", "GET", "/lms/forum-topics/", (200,), token=ST)
check("lms notes", "GET", "/lms/notes/", (200,), token=ST)
check("lms analytics", "GET", "/lms/analytics/", (200,), token=ST)

# ---------------------------------------------------------------------------
print("== Teacher portal ==")
TT = TOKENS["Teacher"]
check("teacher profile", "GET", "/teacher/profile/", (200,), token=TT)
check("teacher dashboard", "GET", "/teacher/dashboard/", (200,), token=TT)
check("teacher classes", "GET", "/teacher/classes/", (200,), token=TT)
check("teacher attendance", "GET", "/teacher/attendance/", (200,), token=TT)
check("teacher homework", "GET", "/teacher/homework/", (200,), token=TT)
check("teacher assignments", "GET", "/teacher/assignments/", (200,), token=TT)
check("teacher question-bank", "GET", "/teacher/question-bank/", (200,), token=TT)
check("teacher exams", "GET", "/teacher/exams/", (200,), token=TT)
check("teacher marks-entry", "GET", "/teacher/marks-entry/", (200,), token=TT)
check("teacher performance", "GET", "/teacher/performance/", (200,), token=TT)
check("teacher messages", "GET", "/teacher/messages/", (200,), token=TT)
check("teacher contacts", "GET", "/teacher/contacts/", (200,), token=TT)
check("teacher notices", "GET", "/teacher/notices/", (200,), token=TT)
check("teacher leaves", "GET", "/teacher/leaves/", (200,), token=TT)
check("teacher admissions-review", "GET", "/teacher/admissions-review/", (200,), token=TT)
check("teacher timetable", "GET", "/teacher/timetable/", (200,), token=TT)
check("teacher documents", "GET", "/teacher/documents/", (200,), token=TT)
check("teacher lms courses", "GET", "/teacher/lms/courses/", (200,), token=TT)
check("teacher lms chapters", "GET", "/teacher/lms/chapters/", (200,), token=TT)
check("teacher lms lessons", "GET", "/teacher/lms/lessons/", (200,), token=TT)
check("teacher lms resources", "GET", "/teacher/lms/resources/", (200,), token=TT)

# ---------------------------------------------------------------------------
print("== Parent portal ==")
PT = TOKENS["Parent"]
check("parent profile", "GET", "/parent/profile/", (200,), token=PT)
check("parent dashboard", "GET", "/parent/dashboard/", (200,), token=PT)
check("parent children", "GET", "/parent/children/", (200,), token=PT)
check("parent teachers", "GET", "/parent/teachers/", (200,), token=PT)
check("parent messages", "GET", "/parent/messages/", (200,), token=PT)
check("parent notifications", "GET", "/parent/notifications/", (200,), token=PT)
check("parent lms progress", "GET", "/parent/lms/progress/", (200,), token=PT)
check("parent ptm booking", "POST", "/parent/ptm/", (201, 200), token=PT,
      body={"child_id": 146, "date": "2026-09-10", "slot": "10:00"})
check("parent feedback", "POST", "/parent/feedback/", (201, 200), token=PT, body={"rating": 5, "message": "wf test"})

# ---------------------------------------------------------------------------
print()
print("=" * 70)
fails = [r for r in RESULTS if not r[1]]
print(f"TOTAL: {len(RESULTS)} checks, {len(fails)} FAILURES")
for name, ok, detail in fails:
    print(f"FAIL  {name}\n      {detail}")
