# SEARCH FILTER REPORT

**Project:** EduNova Global Academy — Integrated Backend
**Date:** 2026-08-07
**Scope:** Search & filtering across students, teachers, admissions, library, and other scope lists.

---

## 1. Existing search/filter capabilities

| List | Filters | Source |
|---|---|---|
| Teachers | `class_filter` (fill class) | `TeacherMixin` views |
| Students | `class_filter`, `admission_no_filter`, `search`, `section_filter` | `StudentListView` |
| Parents | `search` (name), yes | `ParentListView` |
| Admissions | `search` (reqid/name), status filters | admissions views |
| Library issues | `filter_status` (issued/return) | `LibraryView` |
| Results / reports | class/subject fallback | Exam view |
| LMS activity/student | user/class/course filters | `LMS` extras |

## 2. Reviews done

- Verified filters are **parameter-based** (`request.GET`) and **not** user-blended into arbitrary table names; all `WHERE` values bound via `%s` → **no SQL injection** (see Security report).
- Confirmed filters are applied **before** pagination/limit so results are correct.
- Recommended indexing reconciled with the search paths (Performance report indexed seekable lookups for name/admission no/date columns).

## 3. Gaps identified

- **No consistent `search=` text param across portals** (some list views accept it, some don't).
- No **column-aware or fuzzy** search (only exact subject-value matches).
- **No sorting**: list views lack `?ordering=` support.
- A few views added `section`/`status` filters but the OpenAPI query params aren't documented yet.

## 4. Proposed unified pattern (documented, deferred)

Adopt a shared `PortalSearchMixin`/`filter` convention:
1. `?q=` → substring match on a view-declared `search_fields` list (ILIKE `%…%`).
2. `?class_id=`, `?status=`, `?subject_id=` etc. → exact `WHERE` on indexed columns.
3. `?ordering=col` or `-col` → validated against a per-view allow-list (never raw user text).
4. Composite filters apply together (AND) before pagination.

## 5. Files modified (this pass)
- None for new filter logic (deferred). Supporting indexes added in `portal_extension_improvements.sql`.

## 6. Remaining work
1. Add uniform `search_fields` + `ordering` across the ~10 primary admin list views.
2. Consider `pg_trgm` GIN indexes + trigram similarity for fuzzy name/registration searches on students/teachers/parents at scale.
3. Document the filter/ordering query params in the OpenAPI schema (auto-listed via drf-spectacular once querystring parameters are annotated).