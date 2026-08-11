# EduNova — Production Readiness Checklist

Go-live gate for the EduNova Global Academy platform (public website + 4
portals + Django API). Every box must be ticked before real student/parent
data goes in. Items marked **(env)** are configuration on your hosting
accounts and cannot be fixed from the codebase alone.

Status legend: `[ ]` pending · `[x]` done · `[!]` blocked

---

## 0. Blocker — the deployed backend must actually run

- [x] **(env)** `DATABASE_URL` uses the **transaction-mode pooler**
      (`aws-1-ap-southeast-2.pooler.supabase.com:6543`, user `postgres.<REF>`)
      — port 5432 (session mode) caps at 15 persistent connections and
      exhausts under load (mass 500s); port 6543 recycles per transaction.
- [ ] **(env)** `ALLOWED_HOSTS` on the host includes the backend domain
      (e.g. `edunova-cr-ax7h.onrender.com`) — otherwise every request 400s.
- [x] **(env)** `BREVO_API_KEY` set (an `xkeysib-…` key from Brevo → SMTP &
      API) — OTP emails go out via the Brevo **HTTPS API** (`api.brevo.com`),
      which works from Render's network; SMTP port 587 is blocked there.
      If SMTP fallback is used instead, `EMAIL_HOST_USER` must be the relay
      login (`b157b5001@smtp-brevo.com`), not the Brevo dashboard login.
- [ ] **(env)** `CORS_ALLOWED_ORIGINS` (and `CSRF_TRUSTED_ORIGINS`) list every
      deployed frontend origin.
- [ ] Deploy and confirm `GET {API}/api/auth/login/` returns 400 for bad
      credentials (not 502/500).
- [ ] Startup log shows **no** `[EduNova config warning]` lines.

## 1. Security hardening

- [x] Status dashboard at `/` is now **staff-only** outside DEBUG (route map +
      DB errors no longer public).
- [x] Startup warnings added for `DEBUG` on a non-local host, `DEV_STATIC_OTP`,
      local-only `ALLOWED_HOSTS`, console email backend, and the IPv6
      Supabase direct host.
- [x] File storage backend (`config/storage.py`) restored — uploads no longer
      crash; Supabase Storage in prod, local `MEDIA_ROOT` fallback in dev.
- [ ] **(env)** Rotate the Supabase DB password + regenerate the service-role
      key if any past delivery shipped them (SETUP.md §0).
- [x] Demo accounts use the owner's real gmail addresses (admin
      `jhansilakshmi1004@gmail.com`, teacher `sameerbasha.0809@gmail.com`,
      student `tarannumarshiya489@gmail.com`, parent `veereshgollapu@gmail.com`;
      password `Edunova@123`) — the seed scripts (`seed_portal_demo`,
      `seed_parent_admin`) are fixed to never overwrite them back to
      `@edunova.edu`; never enable `DEV_STATIC_OTP`.
- [ ] `DJANGO_SECRET_KEY` set to a long random value on the host.
- [ ] `BACKUP_ENCRYPTION_KEY` set (backup command refuses to run without it).

## 2. Operational reliability

- [ ] Backend serves behind HTTPS with a real domain (Render/Cloudflare).
- [x] **Multi-worker cache:** gunicorn runs **2 workers × 4 threads** (8
      concurrent requests; per-thread pooled DB connections stay under
      Supabase's 15-session cap). `CACHES` is LocMemCache by default and
      switches to **Redis automatically when `REDIS_URL` is set** — do set it
      so OTPs + rate limits + the 60s response cache are shared across
      workers.
- [ ] Scheduled `python manage.py backup_database` (cron) with the encrypted
      output landing in Supabase Storage.
- [ ] Monitoring/alerting: at minimum a UptimeRobot/Healthchecks ping on
      `/api/auth/login/` so a 502 (like the one found on launch day) is
      noticed automatically.
- [ ] Automated regression gate in CI (see `.github/workflows/ci.yml`): backend
      tests + `manage.py check` + frontend build run on every push.

## 3. Data & schema integrity

- [x] `apps/cms` migrations are complete (`0001_initial` … `0007`); a fresh
      environment reproduces the CMS schema with a plain `manage.py migrate`.
- [ ] `portal_*` tables are hand-applied SQL — record the applied state with
      `python manage.py apply_portal_schema --check` and keep the SQL files
      versioned with any changes.
- [ ] Verify `python manage.py migrate` runs cleanly against the pooler DB.

## 4. Content & accounts (site owner)

- [ ] Real CMS content seeded (news, events, FAQs, faculty, gallery) via
      `seed_public_data` or admin UI.
- [ ] Superuser/admin accounts created; staff roles assigned deliberately
      (`is_staff` ≠ Admin Portal access — use the Admin group or
      `portal_user_profile.user_type`).
- [ ] Payment gateway configured for real transactions (currently sandbox).

## 5. Final acceptance

- [ ] Run the full audit per `AUDIT_WORKFLOW.md` (§11 smoke + full pass) and
      close every Critical/Major finding.
- [ ] Record the deployed frontend + backend commit SHAs.
- [ ] Confirm privacy/terms pages reflect the real operator and contact info.

---

*See `AUDIT_WORKFLOW.md` for how to verify each item. Items marked **(env)**
need action in the Render / Supabase / Vercel dashboards.*
