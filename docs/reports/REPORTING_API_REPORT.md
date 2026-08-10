# REPORTING API REPORT

**Project:** EduNova Global Academy — Integrated Backend
**Date:** 2026-08-07
**Scope:** Reporting/analytics APIs for students, attendance, fees, faculty, academics, dashboards, and export-ready endpoints; SQL optimization.

---

## 1. Existing reporting surface

| Endpoint | Method | What it returns |
|---|---|---|
| `GET /api/admin-portal/dashboard/` | GET | Aggregated counts: pending admissions, students, teachers, parents, employees, open leaves, fees collected this month, books out, recent admissions. |
| `GET /api/admin-portal/reports/` | GET | `attendance_by_class`, `fee_collection_by_month`, `average_marks_by_subject` — each a raw aggregation, conditionally present when its table exists. |
| `GET /api/admin-portal/lms/analytics/` | GET | LMS uploads + aggregate storage/stats. |
| `GET /api/lms/analytics/` | GET | Per-student course-completion analytics (Admin/Teacher). |
| `GET /api/teacher/performance/` | GET | Per-student averages + class average (by class/subject). |
| Portal dashboards | GET | Student, teacher, parent dashboards (aggregate summaries, not report endpoints). |

## 2. Gaps identified

- No **dedicated student/attendance/fee/faculty/academic report endpoints** with date-range and class/subject filters.
- No **consolidated dashboard summaries** endpoint beyond the separate per-portal dashboards.
- Reports return JSON only; **no export-ready** format (`csv`/`xlsx`/`pdf`) support.
- The existing `ReportsView` returns data only when the underlying tables exist (keys omitted otherwise), and each report is a single aggregate with hard-coded groupings.

## 3. Design (documented — deferred by scope decision)

The user directed that heavy new report/export code be **deferred**; this section records the agreed design for implementation.

### Proposed endpoints (under `/api/admin-portal/reports/`)
1. `GET /reports/students/` — list with filters `class_id`, `status`, `search` (name/admission no), optional `format`.
   `format=json|csv|xlsx|pdf`.
2. `GET /attendance/` — date range (`from`,`to`), `class_id`, `student_id`; returns summary (present/late/absent/medical_leave %) + detail rows.
3. `GET /fees/` — `month` (or `from`/`to`), `class_id`; totals collected, pending, by term.
4. `GET /faculty/` — teacher load, classes, subjects.
5. `GET /academic/` — marks/grade distribution by exam (`exam_schedule_id`), subject, class.
6. `GET /dashboard/summary/` — consolidated KPI rollup for a `dashboard` tab.

### SQL optimization
- All report queries are/will be single or few aggregate `GROUP BY` queries with `WHERE`-push filters on **indexed** columns (indexes added in the Performance report: `idx_payment_student_paid`, `idx_attendance_class_date`, `idx_result_exam_student`, `idx_exam_schedule_class`, `idx_book_title_author`, etc.).
- Limit window and paginate detail rows; aggregate totals in the same query via `COUNT/FILTER`.
- Use `to_char(date,'YYYY-MM')` only in the final projection (not in `WHERE`) so indexes aren't defeated; filter on date intervals instead.

## 4. Files modified (this pass)
- None for new report endpoints (deferred). Performance indexes that support reports were added in `portal_extension_improvements.sql` (applied).

## 5. Remaining work
- Implement the six report endpoints above, or a single extensible `ReportsView` with a `report` query parameter + `format` param.
- Add `openpyxl`/`reportlab` (already installed) for xlsx/pdf formats; `csv` uses stdlib.