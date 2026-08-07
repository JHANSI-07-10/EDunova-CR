# RBAC REPORT

**Project:** EduNova Global Academy — Integrated Backend
**Date:** 2026-08-07
**Scope:** Role-based access control audit, permission verification, role mapping, and centralization.

---

## 1. Roles

Roles are resolved **server-side per request** (never trusted from the client) in `portal/roles.py::get_role()`, in priority order:

1. `is_superuser` → **Admin**
2. `portal_user_profile.user_type` (source of truth when the portal schema is applied)
3. Django group membership in `["Admin", "Teacher", "Parent", "Student", "Employee"]` (first match wins by `ROLE_ORDER`)
4. Fallback → **Student** (only a genuine superuser auto-qualifies as Admin from `is_staff`/`is_superuser`; `is_staff` alone never grants Admin Portal authority — a deliberate security decision).

| Role | Derived from |
|---|---|
| Admin | `is_superuser` or `portal_user_profile.user_type='Admin'` or `Admin` group |
| Teacher | `portal_user_profile.user_type='Teacher'` or `Teacher` group |
| Parent | `portal_user_profile.user_type='Parent'` or `Parent` group |
| Student | `portal_user_profile.user_type='Student'` or `Student` group (default fallback) |
| Employee | `portal_user_profile.user_type='Employee'` or `Employee` group |

## 2. Permissions

Centralized in `backend/portal/roles.py`:

- `RoleRequired.for_roles(*roles)` — factory.
- `IsAdmin`, `IsTeacher`, `IsParent`, `IsStudent`, `IsAdminOrTeacher` — concrete classes.
- `request.user_role` is cached on the request during the permission check for view use.
- `backend/portal/permissions.py` is a deprecated shim re-exporting these (kept so old imports don't crash).

## 3. What was reviewed / fixed

Every view across `portal/{views,teacher_views,parent_views,admin_views,facilities_views,exam_extras_views,lms_extras_views,auth_views,notification_views}` and `apps/{cms,admissions}` was checked.

| Area | Result |
|---|---|
| **FileUploadView** | Was unauthenticated (`AllowAny`). **Fixed:** now `IsAuthenticated`. |
| **Admin portal** | All views inherit `AdminMixin` (`IsAdmin`). Verified — no overrides weaken it. |
| **Teacher portal** | All views inherit `TeacherMixin` (`IsTeacher`). |
| **Parent portal** | All views inherit `ParentMixin` (`IsParent`); child-ownership guard centralized in `_assert_own_child`. |
| **Student portal** | All views inherit `StudentOnlyMixin` (`IsStudent`). |
| **LMS extras** | Views use `IsAuthenticated` + a centralized `_can_access_course` access check; analytics additionally enforces `Admin`/`Teacher`. |
| **CMS / Admissions** | Public by design (`AllowAny`) — throttled, no mechanism to guess; no sensitive write capability. |
| **Auth** | Public (AllowAny) login/OTP with rate limits; logout now `IsAuthenticated`. |

## 4. APIs updated

| API | Change |
|---|---|
| `POST /api/upload/` | `permission_classes = [IsAuthenticated]` + throttle. |
| `POST /api/auth/logout/` | New, `IsAuthenticated`. |
| `GET/PUT /api/notifications/preferences/` | New, `IsAuthenticated`. |

## 5. Security improvements

- Closed the anonymous-upload hole (highest-severity RBAC gap).
- Confirmed **no** admin/teacher/parent/student view is mis-scoped (all lock down to at least their portal role).
- Role resolution is centralized and it never trusts `request.user.user_type` sent by a client.
- Ownership checks for child-scoped parent data are already centralized in `_assert_own_child` (only `ParentLmsProgressView` duplicates its own check — flagged below).

## 6. Remaining work / recommendations

1. **`ParentLmsProgressView`** re-implements its own ownership check instead of reusing `_assert_own_child`, with a *different* 403 message. Reuse the shared guard for consistency.
2. **`Admin` fallback**: any authenticated user not in a group and with no `portal_user_profile` row is treated as `Student`. This is intentional (docs state Student-users must be seeded via seed command) but should be documented as: a freshly created user with no role is *not* denied — they gain Student scope. If unknown users should be denied instead, add an `IsAnyPortalRole` gate. Leaving as-is to preserve behavior.
3. **LMS topic/detail mutation**: `ForumPostView`/`DigitalNoteView` rely on an authenticated-user + course-access check rather than a DRF permission class; consider a dedicated `CanAccessCourse` permission to make enforcement declarative.
4. **Employee role** is defined but has no dedicated permission convenience class; add `IsEmployee` if new endpoints need it.