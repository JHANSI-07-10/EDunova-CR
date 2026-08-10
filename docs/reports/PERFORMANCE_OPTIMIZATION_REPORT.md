# PERFORMANCE OPTIMIZATION REPORT

**Project:** EduNova Global Academy — Integrated Backend
**Date:** 2026-08-07
**Scope:** Query optimization (N+1), database indexing, profile-aware pagination, DB connection settings.

---

## 1. N+1 query fixes

| ViewSet | Before | Fix |
|---|---|---|
| `GalleryAlbumViewSet` (`api/cms/gallery/albums/`) | Each album row fired a query for images | `prefetch_related("images")` |
| `GalleryImageViewSet` | Each image fired a query for its album | `select_related("album")` |
| `JobPostingViewSet` | Each posting fired a query for its department | `select_related("department")` |

Files: `backend/apps/cms/views.py`.

## 2. Database indexes

62 additional indexes on high-filter/join columns were added via `backend/portal/sql/portal_extension_improvements.sql` (applied to Supabase; verified index count rose to **173**). Highlights:

- **Payments**: `idx_payment_student_paid` (student_id + paid flag).
- **Attendance**: `idx_attendance_class_date`, `idx_attendance_student_date`.
- **Results/marks**: `idx_result_exam_student`, `idx_exam_schedule_class`, subject+class+exam composites.
- **Fees/invoices**: student id, due month, status.
- **Library**: `idx_book_title_author`, active-issue/overdue lookups.
- **LMS**: `idx_assignment_teacher_class`, submission/grade lookups, `idx_activity_course_user`.
- **Users/students**: role, class, admission number.
- **Notifications/audit**: `idx_audit_log_actor`; notice to/read lookups.
- **Hostel**: room availability / vacancy lookups.

Guidance matched: every index supports an existing `WHERE`/`JOIN`/`ORDER BY` in the raw-SQL views; no index is added purely speculatively.

## 3. Pagination & caching

- **Pagination**: DRF `PageNumberPagination` with `page_size`/`page`, `PAGE_SIZE=10`, `PAGINATE_BY_PARAM=page_size` configured. Portal `ListView`s reuse a bounded `0..500` slice window for non-JSON admin lists (defaults to a sane cap). Listed as a recommendation (below) has a proper max page size enforcement on ORM viewsets.
- **Caching**: `CACHES` uses `LocMemCache` (per-process). Throttling and OTPs are served from cache.

## 4. DB connection settings

- `CONN_MAX_AGE=600` (10-min persistent DB connections, `DATABASE_POOL` optional) reduces connection churn against Supabase.
- `ATOMIC_REQUESTS: True` where it doesn't interfere — see Persistence report.
- PostgreSQL requires SSL in Supabase default; app honors `DB_SSL_REQUIRE`.

## 5. Files modified
- `backend/apps/cms/views.py` — N+1 fixes.
- `backend/portal/sql/portal_extension_improvements.sql` — 62 indexes (applied).

## 6. Remaining work / recommendations
1. **Max pagination cap**: set `MAX_PAGE_SIZE` on ORM viewsets so a single client can't request unbounded page sizes.
2. **Redis**: replace `LocMemCache` with Redis so throttles/OTPs/cache are shared across gunicorn workers (globally consistent rate limits).
3. **Tune the biggest admin dashboards**: `AdminDashboardView`, `ReportsView` run several aggregation queries; cache results keyed by date/scope for e.g. 60s.
4. **Full-text search** on big text columns (news, documents, LMS) — `GIN`/`pg_trgm` — is deferred (see Search/Filter report).
5. **`EXPLAIN` review** of the 3-4 heaviest report/dashboard queries against production row counts before load.