# EXPORT API REPORT

**Project:** EduNova Global Academy — Integrated Backend
**Date:** 2026-08-07
**Scope:** Data export (CSV/Excel/PDF) for reports and portal data, plus export security.

---

## 1. Summary

There is **no existing admin export endpoint**; reporting is JSON-only (see Reporting API report). The user's scope decision deferred heavy export-engine work to the report phase. This document records the agreed **design** and the ready-to-use libraries now installed.

## 2. Dependencies added (implemented)

In `backend/requirements.txt`, both **installed** into the venv:
- `openpyxl==3.1.5` — `.xlsx` generation.
- `reportlab==5.0.0` — PDF generation.

## 3. Agreed export design

### API shape
Each reporting endpoint gains an optional `?format=` parameter:
- `json` (default) — DRF `Response`.
- `csv` — `text/csv` streaming response (stdlib `csv`, no extra dep).
- `xlsx` — `openpyxl.Workbook` → `application/vnd.openxmlformats-officedocument.spreadsheetml.sheet`.
- `pdf` — `reportlab.platypus` table → `application/pdf`.

A thin `export_helpers.py` module is planned:
- `respond(frame, format, filename, headers)` — builds the right `HttpResponse`/`StreamingHttpResponse`.
- Rejects unknown formats with `400 validation_error`.

### Endpoints that will accept `format`
- `/api/admin-portal/reports/students/`
- `/api/admin-portal/reports/attendance/`
- `/api/admin-portal/reports/fees/`
- `/api/admin-portal/reports/faculty/`
- `/api/admin-portal/reports/academic/`
- Existing admin list views (`students`, `teachers`, `lms/students`, library, exam results).

### Security
- Column headers are a **fixed allow-list** (never echoed from user input) → no formula/CSV-injection via header names.
- Cell values are rendered as text; Excel treats user-entered values starting with `=`, `+`, `-`, `@` as formulas can be neutralized by prefixing with `'` (applicable to student/librarian-controlled text fields).
- Downloads require the same authentication/authorization as the JSON endpoint (no separate export-only access).
- Impose a sane row cap per export (configurable) before rendering to keep memory/payload bounded.

## 4. Files modified (this pass)
- `backend/requirements.txt` — added `openpyxl`, `reportlab` (installed).

## 5. Remaining work
1. Implement `export_helpers.py` + `format` handling on the report endpoints.
2. Add the CSV-injection neutralization for open-ended text columns.
3. Announce the `format` choices in the OpenAPI schema.