# EduNova — Audit & Update, 2026-07-08

## What was audited
- Every route file (`*Routes.jsx`) in all 5 portals compared against every sidebar/nav
  component, to find dead links or orphaned pages. **Result: none found** — every
  sidebar link resolves to a real, registered route in all portals.
- Every relative import (`from './...'`) across the entire `frontend/src` tree,
  checked for a matching file on disk. **Result: 0 broken imports.**
- Every frontend API call (in `api/*.js` and each portal's `lib/api.js`) checked
  against the real Django `urls.py` patterns (109 endpoints across `portal/`,
  `apps/cms/`, `apps/admissions/`). **Result: all calls match a real, implemented
  endpoint** — nothing was calling a non-existent route.
- Searched for stub/placeholder content ("Coming soon", "Lorem ipsum", "TODO",
  "under construction"). The only hit was a legitimate empty-state message in
  `TestimonialsCarousel.jsx` shown only when the CMS has zero testimonials seeded —
  this is correct behavior, not a stub, and was left as-is.
- Confirmed the admission → approval → account-provisioning → welcome-email →
  login/OTP → role routing flow (Flowchart Doc, Section 1) is implemented for
  real, end-to-end, in `apps/admissions/` + `portal/admin_views.py` +
  `portal/auth_views.py` — not mocked.
- Confirmed "Website CMS" (News, Events, Gallery, Testimonials, FAQs, Jobs,
  Scholarships, Leadership, Departments, Documents) is managed through Django's
  built-in admin at `/admin/` (all 20 CMS models registered in
  `apps/cms/admin.py`) rather than a duplicate custom React CMS UI — this was a
  deliberate, reasonable architecture choice already in the codebase, not a gap,
  and matches the brief's instruction to avoid duplicate code.
- Confirmed "Student/Teacher/Parent/Employee Management" (listed as four separate
  items in the requirements doc) is implemented as one reusable, role-filterable
  `Users.jsx` page + `admin-portal/users/` endpoint, rather than four near-identical
  pages — again a legitimate reusable-component choice, not a missing feature.

## Genuine gaps found and fixed in this pass
1. **Payroll / HR (Admin Portal)** — was entirely absent. Added end-to-end:
   - `backend/portal/sql/portal_extension_payroll.sql` — new `portal_payroll_record`
     table (registered in `apply_portal_schema.py`).
   - `PayrollView` in `backend/portal/facilities_views.py` — auto-generates a
     Pending payslip per active employee per month from `portal_employee.monthly_salary`,
     lets Admin adjust allowances/deductions, and mark a payslip Paid. All writes
     go through `log_action()` like every other admin write in the app.
   - New route `admin-portal/payroll/` in `backend/portal/urls.py`.
   - New `frontend/src/portals/admin/pages/Payroll.jsx`, wired into
     `AdminRoutes.jsx`, the admin `Sidebar.jsx`, and the `Layout.jsx` title map.
   - Added `portal_payroll_record` to the existing JSON backup/export table list.

2. **Roles & Permissions (Admin Portal)** — the backend already exposed
   `admin-portal/roles/` (role headcounts) but no page consumed it. Added
   `frontend/src/portals/admin/pages/RolesPermissions.jsx`, a real page (not a
   mock) that reads live role counts from that endpoint and documents exactly
   which modules each role can reach, cross-linking to Users & Roles where
   assignment actually happens. Wired into routes/sidebar/titles.

3. **Admin layout title map was incomplete** — `Layout.jsx`'s `TITLES` object was
   missing entries for `/hostel`, `/inventory`, `/visitors`, `/alumni`,
   `/medical-records`, and `/exam-results`, so those pages silently fell back to
   the generic "Admin Portal" heading instead of a proper page title. Fixed, and
   added the two new pages' titles.

## Known, honestly-scoped remaining gaps
These are real product decisions, not oversights, and would each need new
backend data models — flagging them rather than faking them:
- **Granular per-permission editing** (e.g. checkbox-level "can X role edit Y
  resource") — today, access is enforced by a fixed role→endpoint mapping in
  `portal/roles.py`, which is secure but not admin-editable at runtime. The new
  Roles & Permissions page documents the current mapping; making it
  admin-editable would need a `portal_role_permission` table and a
  policy-check layer.
- **Admin-authored Timetable editor** — students/teachers/parents can all *view*
  timetables, but there's no admin UI to author/edit timetable slots (only
  Classes & Subjects are admin-editable today). Would need a `portal_timetable_slot`
  table + CRUD view + page.

## Packaging notes for this delivery
`node_modules/`, `backend/venv/`, `frontend/dist/`, and `.git/` were excluded
from this zip to keep it small — none of them are source you need to review or
version-control. Restore them locally with `npm install` (in `frontend/`) and
`pip install -r requirements.txt` (in `backend/`, ideally in a fresh venv). See
`SETUP.md` for full setup steps, and run `python manage.py apply_portal_schema`
after pulling to create the new `portal_payroll_record` table.
