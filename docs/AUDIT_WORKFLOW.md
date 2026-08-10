# EduNova Global Academy — Website Audit Workflow Document

**Scope:** Complete audit workflow for the whole EduNova platform — Public Website, Student Portal, Teacher Portal, Parent Portal, Admin Portal, and the Django REST API behind them.

**Audience:** QA / release auditors, developers verifying a deployment, and client-facing reviewers.

**Status legend used throughout this document:**
| Mark | Meaning |
|---|---|
| ✅ PASS | Expected behaviour confirmed |
| ❌ FAIL | Defect found — record it (see §9 reporting template) |
| ⚠️ WARN | Works but risky / needs manual judgement |
| ➖ N/A | Not applicable in this environment |

---

## 1. Purpose

This document is the **step-by-step audit procedure** for verifying that the complete EduNova website works end-to-end before or after a deployment. It covers:

1. Environment readiness (pre-audit checks)
2. The public website (visitor-facing pages & forms)
3. Cross-portal authentication & authorization (the login/OTP/JWT/RBAC flow)
4. Each authenticated portal's modules (Student, Teacher, Parent, Admin)
5. End-to-end business workflows (Admissions pipeline, fees, exams, LMS, leaves)
6. Security & data-integrity checks
7. API contract checks
8. Findings recording and reporting

An audit is **not** "browse the site" — it is a repeatable checklist where every step has an expected result and any deviation is recorded as a finding.

---

## 2. Audit Map — what the system is

```
┌────────────────────────────────────────────────────────────────────┐
│                         PUBLIC WEBSITE (30 routes)                │
│  Home · About · Admissions · Academics(+classes/subjects) ·       │
│  Departments · Faculty · Infrastructure · Facilities · Library ·  │
│  Transport · Hostel · Sports · Gallery · News · Events ·          │
│  Achievements · Careers · Downloads · Student Life · Contact ·    │
│  FAQ · Privacy · Terms · /login role-picker · CMS pages /page/:slug│
└───────────────┬────────────────────────────────────────────────────┘
                │  VITE_API_BASE_URL (default http://localhost:8000)
┌───────────────▼────────────────────────────────────────────────────┐
│              DJANGO REST API ( /api/... )  — JWT + OTP auth        │
│  auth:  POST /auth/login/ → /auth/verify-otp/ → /auth/refresh/     │
│  RBAC:  server-resolved role  Admin|Teacher|Parent|Student|Employee │
└───────┬───────────────────────────────┬────────────────────────────┘
        │                               │
┌───────▼────────┐  ┌────────▼────────┐  ┌────────▼────────┐  ┌───────▼─────────┐
│ STUDENT PORTAL │  │ TEACHER PORTAL  │  │  PARENT PORTAL  │  │  ADMIN PORTAL   │
│ (24 pages)     │  │ (19 pages)      │  │ (18 pages)      │  │ (29 pages)      │
└────────────────┘  └─────────────────┘  └─────────────────┘  └─────────────────┘
```

**Stack (as audited):** React 18 + Vite + Tailwind (frontend) · Django 5 + DRF + SimpleJWT (backend) · PostgreSQL via Supabase transaction-mode pooler (port 6543) · OTP/password emails via the Brevo HTTPS API (`BREVO_API_KEY`), SMTP fallback only when no API key is set.

**Authentication model (important for every portal audit):**
- Step 1: `POST /api/auth/login/` with `{email, password}` → `{user_id, user_type, detail}` (an OTP email is sent).
- Step 2: `POST /api/auth/verify-otp/` with `{user_id, otp}` → `{access, refresh, user}` JWT pair.
- `POST /api/auth/resend-otp/` with `{user_id}` → fresh OTP.
- Every portal stores its own localStorage keys (`edunova_<role>_access` etc.) and guards routes client-side; **the server independently enforces the role on every API call** via `portal.roles.get_role()`.

---

## 3. Pre-Audit Environment Checks

Run these before starting any functional audit. All must be ✅ before continuing, otherwise later findings will be false negatives.

| # | Check | How | Expected |
|---|---|---|---|
| 3.1 | Backend reachable | Open `GET {API}/` (status dashboard) | 200; DB badge "Connected" |
| 3.2 | Database connected | Status dashboard DB badge | Green ● Connected (Supabase pooler) |
| 3.3 | Login endpoint responds | `curl -X POST {API}/api/auth/login/ -d '{"email":"nobody@x.com","password":"x"}'` | 400 "Invalid email/username or password" (not 5xx/502) |
| 3.4 | Email delivery configured | Check server startup log for `[EduNova config warning]` lines | No EMAIL/console warning; OTP emails actually arrive |
| 3.5 | CORS for the audited origin | Browser DevTools → Network on any API call from the deployed frontend origin | No CORS errors; `Access-Control-Allow-Origin` matches |
| 3.6 | Frontend serves | Open the frontend URL | Home page loads with no white screen |
| 3.7 | Test accounts available | See §8 seed data | One account per role (Student/Teacher/Parent/Admin) |
| 3.8 | Version pin | Record frontend commit + backend commit in the audit report | Both noted for traceability |

---

## 4. Public Website Audit

Navigate every public route; verify content, images/videos, links, and forms. Base URL: frontend root.

### 4.1 Home page (sections, top to bottom)
- [ ] Hero renders: background image, badge "INSPIRING MINDS. BUILDING FUTURES.", headline "Where Academic Excellence Meets Digital Innovation", CTA buttons **Start Application** (→ /admissions) and **Learn More**.
- [ ] Admission-open banner: "Admissions open…" + **Apply Now →** link works.
- [ ] Principal message section renders quote + photo (Dr. Meera Sharma).
- [ ] About preview, Why Choose grid, Academic programs, Facilities grid (Smart Classrooms, Science Labs, Computer Labs, Innovation Centers, Robotics Lab, Digital Library, Sports Complex, Medical Center) all render images.
- [ ] "EduNova by the Numbers" stat counters animate to values (6,500+ students, 98% results) — ⚠️ note: this section calls the CMS API; when the backend is down it shows "Loading…" — record as WARN not FAIL if API is up but data absent.
- [ ] Upcoming Events section: shows list when events exist; otherwise empty state "No events scheduled right now" (not an error).
- [ ] Latest News section: same pattern.
- [ ] Campus Gallery, Student Life (Sports & Fitness, Clubs & Events, Innovation Culture, Arts & Creativity), campus video plays, Testimonials, Admission Process (4 steps), Scholarships banner, FAQ accordion toggles.
- [ ] Footer: all 4 columns (EXPLORE / CAMPUS / COMMUNITY / SUPPORT) links resolve to real pages; © year correct.
- [ ] Back-to-top button appears after scrolling and scrolls to top.

### 4.2 Static pages (smoke-check each; verify title/hero/content + a working call-to-action)
`/about` `/departments` `/faculty` `/infrastructure` `/facilities` `/library` `/transport` `/hostel` `/sports` `/gallery` `/achievements` `/careers` `/downloads` `/student-life` `/faq` `/privacy-policy` `/terms` `/news` `/events`

For each:
- [ ] Renders without console errors; no broken images (image count with `naturalWidth === 0` should be 0).
- [ ] Media assets (images/videos) load from `/images`, `/videos` (public assets) or Supabase storage URLs.
- [ ] Internal links navigate correctly; external links open in new tab (`target="_blank" rel="noreferrer"`).

### 4.3 Dynamic content pages
- [ ] `/academics/classes` lists classes; `/academics/classes/:id` shows class detail (404 state if invalid id).
- [ ] `/academics/subjects` + `/academics/subjects/:id` same pattern.
- [ ] `/page/:slug` CMS page view: renders CMS page content; unknown slug → clean 404 (Not Found component).
- [ ] `/news` and `/events` pull from CMS API; empty state is graceful.

### 4.4 Public forms (critical — verify both success AND failure paths)
| Form | Location | Success expected | Failure expected |
|---|---|---|---|
| Admissions application | /admissions | Eligibility → details → document upload → review → Registration Number (Pending) | Validation errors inline; no silent success |
| Contact / enquiry | /contact | 200 with success message | Error surfaced |
| Campus visit booking | CampusVisitModal (on contact/facilities) | Booking accepted | Error surfaced |
| Newsletter / footer forms (if present) | — | Confirm intended behaviour | — |

### 4.5 Navigation & shell
- [ ] Sticky nav shrinks on scroll; hamburger menu opens on mobile; all portal links present.
- [ ] **Login role picker** at `/login` links to all four portals: `/student/login`, `/teacher/login`, `/parent/login`, `/admin/login`.
- [ ] Unknown URL → styled 404 (`NotFound`), not a blank page.

---

## 5. Cross-Portal Authentication & Authorization Audit

This is the most important section — every portal shares this flow. Audit once, apply results to all portals.

### 5.1 OTP login flow (per portal)
Use the role-appropriate account. Expected sequence:

| Step | Action | Expected API result |
|---|---|---|
| 5.1.1 | Submit valid credentials | 200 `{user_id, user_type, detail:"OTP sent successfully."}`; **no OTP in response** |
| 5.1.2 | Receive OTP email | Email arrives ≤ 2 min; sender = DEFAULT_FROM_EMAIL; HTML + plain-text versions |
| 5.1.3 | Enter wrong OTP | 400 "Invalid or expired OTP."; stays on OTP step |
| 5.1.4 | Enter correct OTP | 200 `{access, refresh, user}`; redirected into portal dashboard |
| 5.1.5 | **Resend** | 200 "OTP resent successfully."; old OTP must NOT work afterwards |
| 5.1.6 | Wrong password at step 1 | 400 "Invalid email/username or password." |
| 5.1.7 | Inactive account | 400 "User account is inactive." |
| 5.1.8 | Username (not email) login | Works when username used as identifier |
| 5.1.9 | OTP expiry (>5 min) | 400 "Invalid or expired OTP." → request new one |

### 5.2 Session & token audit
- [ ] Access token stored per-portal (`edunova_<role>_access/refresh/user` in localStorage).
- [ ] Reload of a portal page keeps the session (token valid).
- [ ] Expired access token triggers the 401 → refresh flow (silent re-auth), then the request retries.
- [ ] Expired refresh token → redirected to that portal's `/login`; localStorage cleared.
- [ ] Logout clears tokens and returns to login.
- [ ] **Direct URL access without login** to any protected page (e.g. `/admin/dashboard`) → redirected to that portal's login (ProtectedRoute).
- [ ] **Role guard:** logging in as Student and visiting `/admin/dashboard` → must NOT grant admin data (server 403 on API).

### 5.3 RBAC cross-role checks (must all be 403)
Using valid JWTs for each role, call the other roles' dashboards:

| From \ To | Student API | Teacher API | Parent API | Admin API |
|---|---|---|---|---|
| Student | ✅ | 403 | 403 | 403 |
| Teacher | 403 | ✅ | 403 | 403 |
| Parent | 403 | 403 | ✅ | 403 |
| Admin | ✅(allowed to view) | ✅ | ✅ | ✅ |

- [ ] Role is resolved **server-side** per request (not trusted from the client payload).
- [ ] `portal_user_profile.user_type` / Django groups / superuser produce the correct role (see `portal/roles.py` order: profile → group → superuser → fallback Student).

### 5.4 Brute-force protection
- [ ] Rapid repeated wrong logins for one account → per-account throttle (5/min) blocks with 429.
- [ ] Rapid resends → resend throttle (3/min per account).
- ✅ INFO: throttles & OTP storage use Django's cache. LocMemCache is per-process, so **set `REDIS_URL` in production** (the `CACHES` config switches to Redis automatically) to keep limits + OTPs consistent across the 2 gunicorn workers × 4 threads; without it the effective limit is rate × worker count (see §10 known limits).

---

## 6. Portal Module Audit

Audit each module in its portal. For every module verify: page renders, list loads, empty state OK, create/edit/delete works, validation rejects bad input, and (where relevant) it appears in the Admin Audit Log.

### 6.1 Student Portal (`/student/*`)
| Module | Key checks |
|---|---|
| Dashboard | Stats render; no errors with zero data |
| Attendance | List matches logged-in student only |
| Timetable | Renders weekly grid |
| Homework | List + assignment status |
| Assignments | View, submit file, submission state updates |
| LMS | Courses list; content pages; mark-complete updates progress; live/recorded classes pages |
| Exams | Exam list; **Hall Tickets** downloadable |
| Results | Marks + rank; report card; **must not see other students' data** |
| Fees | Fee breakdown; payment initiation (UPI/Card) — ⚠️ sandbox gateways only |
| Scholarships | Apply/view eligibility |
| Library | Search books; issue history |
| Hostel / Transport / Medical Records | Room allocation, route + GPS, health records (student-scoped) |
| Certificates | Download issued certificates |
| Announcements / Events / Downloads / Profile / Support | Render + functional |

### 6.2 Teacher Portal (`/teacher/*`)
| Module | Key checks |
|---|---|
| Dashboard | Today's classes / stats |
| Classes | My classes; roster view |
| Admissions Review | Pending applicants visible; interview notes saved; recommendation submitted |
| Attendance | Mark per class; sync confirmation |
| Homework / Assignments | Create; **scan PDF**; view submissions; grade; return marks |
| Question Bank | Create/edit/delete questions; JSON conversion integrity |
| Exams + Invigilation | Schedule; invigilation duty list |
| Marks Entry | Enter per student; publication gate (marks not visible to students before publish) |
| Performance | Analytics render |
| Messages | Thread with contacts; send/reply |
| LMS | Course content management; live classes |
| Documents / Timetable / Notices / Leave | CRUD + leave approval chain |

### 6.3 Parent Portal (`/parent/*`)
| Module | Key checks |
|---|---|
| Dashboard | Multi-child switcher rebinds ALL sections to selected child |
| Attendance / Homework / Results | Data matches selected child ONLY |
| Fees | Child's fee ledger + pay |
| Transport / Hostel | Child's route/room |
| Messages / Notifications | Teacher threads + notifications |
| Documents | Child's official documents |
| Leaves | Submit leave request; status tracked |
| PTM Booking | Book/slot validation |
| Feedback | Submit feedback (audit log entry) |
| Profile / Lms (progress) / Scholarships / Timetable | Render + scoped to child |

### 6.4 Admin Portal (`/admin/*`)
| Module | Key checks |
|---|---|
| Dashboard | KPIs; recent activity |
| **Admissions** | Full pipeline (see §7.1) — most important admin workflow |
| Users | List; activate/deactivate; **reset password (email sent)**; role assignment |
| Roles & Permissions | Grant/revoke; verify effect server-side |
| Classes / Timetable / Campuses | CRUD |
| Fees / Scholarships | Structure, ledgers, awards |
| Notices / News & Events | Publish; verify public site reflects them |
| Leaves | Approve/reject (audit logged) |
| Reports | Generate; download |
| **Audit Log** | Every admin write recorded (`portal_audit_log`): actor, action, target, details |
| Settings | Site settings; CMS content |
| Transport / Library / Hostel / Inventory / Visitors / Alumni / Medical Records / Payroll / Examinations / Exam Results / Lms Monitor / Lms Settings / Recruitment | CRUD + scope checks; verify each write appears in audit log |

---

## 7. End-to-End Business Workflows

Audit these as full journeys (frontend → API → database → reflected UI), not page-by-page.

### 7.1 Admissions pipeline (the core flow)
```
Public /admissions  →  Admin Portal Admissions  →  Teacher Admissions Review  →  Admin confirm
   submit application     (Verification → Screening → Fee_Pending)   (interview)    → auto-provision
                                                                        ↑              Student + Parent logins
```
- [ ] Public submission creates a Pending application with a Registration Number.
- [ ] Admin sees it; advances Verification → Screening → Fee Pending.
- [ ] Teacher sees the applicant in Admissions Review; records counselling notes; recommendation reflected.
- [ ] Admin **Confirm & generate logins** → creates Student + Parent accounts (or reuses parent by email), shows temporary passwords once.
- [ ] New Student can log in (`/student/login`) and sees their class/records; new Parent can log in (`/parent/login`) and sees the child in the switcher.
- [ ] Rejected path: Rejected state visible to admin; public form reflects seat availability.

### 7.2 Leave workflow
Student/Parent submit → Teacher/Admin approve or reject → submitter sees status; audit-logged.

### 7.3 Exam & results workflow
Teacher enters marks → publish → Student Results + Rank List + Report Card reflect only published data; `exam_name` uses fixed choices (Unit_Test_1 … Board_Exam) — verify no silent split of cycles (e.g. "Mid Term" vs "Mid-Term").

### 7.4 Fees workflow
Fee structure → student fee ledger → initiate payment (sandbox) → payment recorded in Admin Payments.

### 7.5 LMS workflow
Teacher authors/assigns content → Student completes + marks complete → progress analytics visible to Admin/Teacher (not to other students).

### 7.6 Backup & restore
- [ ] `python manage.py backup_database` requires `BACKUP_ENCRYPTION_KEY` and refuses to run without it.
- [ ] Encrypted JSON written locally + uploaded to Supabase Storage bucket.

---

## 8. Audit Test Data

Seed commands (run on the backend with the DB reachable):

```bash
python manage.py apply_portal_schema --check   # schema state
python manage.py seed_public_data              # CMS demo content (news/events/FAQs)
python manage.py seed_portal_demo              # demo Student/Teacher accounts
python manage.py seed_parent_admin             # demo Parent/Admin accounts
python manage.py createsuperuser               # Admin (superuser → Admin role)
```

Known demo credentials (from seed scripts):
| Role | Login | Password | OTP |
|---|---|---|---|
| Student | student@edunova.edu | EduNova@123 | emailed (static "123456" only when `DEV_STATIC_OTP=True` **and DEBUG, never in prod**) |
| Teacher | teacher@edunova.edu | EduNova@123 | emailed |

⚠️ Never set `DEV_STATIC_OTP=True` on a reachable server — it makes every login OTP "123456".

---

## 9. Recording Findings (reporting template)

For every ❌/⚠️, record:

```markdown
### Finding F-<n> — <short title>
- **Severity:** Critical / Major / Minor / Cosmetic
- **Area:** (Public | Auth | Student | Teacher | Parent | Admin | API | Security)
- **Module / route:** e.g. /admin/fees
- **Steps to reproduce:** 1) … 2) … 3) …
- **Expected:** …
- **Actual:** … (paste response JSON / console error / screenshot ref)
- **Environment:** commit(s), backend URL, browser, date
- **Related check:** §4.4 / §5.3 / §6.4 …
```

Severity guide: **Critical** = data leak, broken login, lost data, 502 outage · **Major** = core workflow broken · **Minor** = degraded but usable · **Cosmetic** = styling/wording.

Close-out: every finding must be either fixed-and-reverified (re-run the same step) or explicitly accepted with a risk note.

---

## 10. Known Limits & Audit Caveats (verify, don't assume)

1. **OTP storage is Django's cache** — LocMemCache is per-process, so with >1 gunicorn worker login can intermittently fail with "Invalid or expired OTP" unless `REDIS_URL` is set (the `CACHES` config now switches to Redis automatically). Audit should record whether `REDIS_URL` is configured.
2. **Email is the only OTP delivery path.** In production the service uses the **Brevo HTTPS API** when `BREVO_API_KEY` is set (required — SMTP port 587 is blocked from Render's network). If `EMAIL_BACKEND` is the console backend AND no `BREVO_API_KEY` is set, login returns 503 ("verification email service is not configured") — that is **by design**, a clear signal to configure delivery, not a UI bug.
3. **Supabase direct DB host is IPv6-only.** The backend must use the **pooler** `DATABASE_URL`. Prefer the **transaction-mode port 6543** — session mode on 5432 caps at 15 persistent connections and exhausts under load (mass 500s); the transaction pooler recycles per connection.
4. **CORS is env-driven** (`CORS_ALLOWED_ORIGINS`). If login fails only in the browser (works via curl), check the origin is in that list.
5. **Frontend/backend parity:** the frontend may reference pages whose endpoints must be confirmed during audit (e.g. any new module page vs `portal/urls.py`). Include an API-parity sweep: for each page, open DevTools → Network and confirm the endpoints it calls return 2xx/expected status.
6. **Pagination:** DRF defaults to 20/page — long lists (users, admissions, reports) must page correctly with no duplicates/missing rows.

---

## 11. Audit Run Sheet (quick daily smoke)

For a fast regression pass after any deploy:

1. Pre-audit §3 (3.1–3.8) — 5 min
2. Public home §4.1 + forms §4.4 — 10 min
3. One full login flow per role §5.1 + one cross-role check §5.3 — 10 min
4. Each portal dashboard + 2 core modules (e.g. Student: Results+Fees; Teacher: Marks Entry+Attendance; Parent: Child switcher+Fees; Admin: Admissions+Audit Log) — 20 min
5. Admissions E2E §7.1 with one applicant — 10 min
6. Record findings §9; update this sheet's date/result header

---

*Document generated for the EduNova Global Academy project (frontend `EDunova-CR/frontend`, backend `EDunova-CR/backend`). Route/page inventories reflect the current source tree; re-verify counts if the frontend is re-synced.*
