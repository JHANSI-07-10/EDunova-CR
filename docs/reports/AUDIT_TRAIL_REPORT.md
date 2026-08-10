# AUDIT TRAIL REPORT

**Project:** EduNova Global Academy — Integrated Backend
**Date:** 2026-08-07
**Scope:** Comprehensive audit logging of logins/logouts, creates, updates, deletes, role changes, status changes and administrative actions.

---

## 1. Summary

An `portal_audit_log` table and a `log_action()` helper already existed; several admin mutating views logged semantically, but coverage was inconsistent and **no IP address was captured** and **logout was never recorded**. A middleware now records **every** authenticated mutating API request centrally, the schema was extended with an `ip_address` column, and login/logout are logged explicitly.

## 2. What is stored

| Field | Source |
|---|---|
| `actor_id` | Requesting user (`portal_audit_log.actor_id → auth_user`), NULL for anonymous |
| `action` | `auth.login`, `auth.logout`, `create`, `update`, `delete`, or view-specific (`library.issue`, `hostel.allocate`, `notice.broadcast`, …) |
| `target_type` | Readable path, e.g. `teacher/assignments`, `admissions/enquiries` |
| `target_id` | Numeric id segment from the path when present |
| `ip_address` | **New.** Best-effort client IP from `X-Forwarded-For` (first value) or `REMOTE_ADDR` |
| `details` | JSONB — method, HTTP status, plus action-specific metadata |
| `created_at` | Timestamp (default `now()`) |

## 3. Implementation

### 3.1 Schema
`backend/portal/sql/portal_extension_improvements.sql` (applied to Supabase via `apply_portal_schema`):
- `ALTER TABLE portal_audit_log ADD COLUMN IF NOT EXISTS ip_address varchar(45)`
- `CREATE INDEX idx_audit_log_actor`

### 3.2 Files modified
| File | Change |
|---|---|
| `backend/portal/middleware.py` | **New** `AuditTrailMiddleware` — records every `POST/PATCH/PUT/DELETE` under `/api/` (excluding `/api/auth/*`, which are logged explicitly). Registered in `settings.MIDDLEWARE`. Best-effort: a failing audit write never breaks the request. |
| `backend/portal/roles.py` | `log_action()` gained an `ip_address` parameter. |
| `backend/portal/auth_views.py` | Logs `auth.login` on OTP verification and `auth.logout` on the new logout endpoint/final, both with IP. |
| `backend/portal/urls.py` | `POST /api/auth/logout/` route. |

### 2.3 Coverage (inherited + middleware)
- **Login / Logout** — `auth.login` (verify-otp) and `auth.logout` (logout endpoint).
- **Create** — every authenticated POST under `/api/` (students, teachers, parents, admin, facilities, LMS, admissions review, file uploads).
- **Update** — every authenticated PATCH/PUT under `/api/`.
- **Delete** — every authenticated DELETE under `/api/`.
- **Role/status changes & admin actions** — existing semantic `log_action` calls (admission advance/reject/credentials, user role/active toggles, password resets, library issue/return, leave decisions, enrollments, class-teacher assignments, LMS deletes, backup exports) are preserved and enriched with IP.

## 4. Files modified
- `backend/portal/middleware.py` (new)
- `backend/portal/roles.py`
- `backend/portal/auth_views.py`
- `backend/portal/urls.py`
- `backend/portal/sql/portal_extension_improvements.sql` (new, applied)
- `backend/config/settings.py` (middleware registration)

## 5. Reading the trail
Existing admin UI: `GET /api/admin-portal/audit-log/` (`AuditLogListView`) lists the 300 most recent entries with actor names, ordered by `created_at DESC` — now including `ip_address`.

## 6. Remaining work
- **View/retention**: the admin audit list returns the most recent 300 rows and has no pagination; add a filterable/paginated `/api/admin-portal/audit-log` with `ip` and date filters for forensics.
- **Logout propagation**: JWT is stateless; logout currently records the event only. If token blacklisting is required, add a JWT denylist (or map to refresh-token rotation).
- **Retention policy**: for long-running compliance needs, schedule pruning of rows older than N months (a `manage.py` command would be a lightweight addition).