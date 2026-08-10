# NOTIFICATION REPORT

**Project:** EduNova Global Academy — Integrated Backend
**Date:** 2026-08-07
**Scope:** Notification/announcement infrastructure, preferences, and channel abstraction.

---

## 1. Existing notification surface

| Endpoint / feature | What it does |
|---|---|
| **Notice Board** | `GET/POST /api/admin-portal/notices/` — broadcast to admin, class, or teacher scope; in-app notifications created in `portal_notification`. |
| **Student notices** | `GET /api/student/dashboard/` includes recent `notice` entries. |
| **Mark-triggered broadcasts** | On **Create** of weekly marks and **publish** of exam results, the system auto-broadcasts to affected groups and bumps parent/student badge/notification counts. |
| **Leave status** | On leave decisions a notification is pushed. |

## 2. Gap / deflection

The original brief asked for a full notification system with **email / SMS / push** channels plus per-user preference toggles. Per the user's stated priority (code fixes → security → audit first, defer heavy delivery code to reports), the **channel delivery engines are deferred**, but the **preference foundation** was implemented.

## 3. Implemented — notification preferences

### Schema
`portal_extension_improvements.sql` (applied to Supabase):
- `portal_notification_preference` — `user_id` (PK → auth_user, cascade), `email_enabled`, `sms_enabled`, `push_enabled`, `in_app_enabled`, `updated_at`.

### Endpoints
`backend/portal/notification_views.py` (new):
- `GET /api/notifications/preferences/` (IsAuthenticated) — returns current prefs, importing sensible defaults when none exist.
- `PUT /api/notifications/preferences/` (IsAuthenticated) — updates toggles atomically.

### Defaults
| Channel | Default |
|---|---|
| Email | Enabled |
| Push | Enabled |
| In-app | Enabled |
| SMS | Disabled |

Any user may only read/update **their own** preferences (lookup keyed on `request.user`).

Wired in `backend/portal/urls.py`.

## 4. Design for the deferred delivery engine

### Suggested generic `notify(to_user, event, payload)` helper
```
1. Resolve receiver (role or specific user id).
2. Record an in-app row in `portal_notification` (respect `in_app_enabled`).
3. If `email_enabled` → enqueue an email templating job (out-of-band; don't send synchronously).
4. If `push_enabled` → enqueue a push (WebSocket endpoint or FCM/APNs adapter).
5. If `sms_enabled` (opt-in) → enqueue via SMS provider.
```
- Use a queued/async path so the request's DB transaction isn't blocked by downstream channels.
- Keep notification text + link in the in-app row; make the channel adapters thin.

### Triggers to wire
- Admission status changes (advance/reject/credentials issued).
- Leave request + decision.
- Notice broadcasts (already create in-app rows).
- Exam result publish.
- Library issue/return.
- Fee due reminders.

## 5. Files modified
- `backend/portal/notification_views.py` (new preferences endpoint)
- `backend/portal/urls.py` (route)
- `backend/portal/sql/portal_extension_improvements.sql` (new table, applied)

## 6. Remaining work / recommendations
1. **Actual delivery**: email template + SMTP/reusable provider settings; SMS/push adapters. Keep the preference toggles as the single enforcement point.
2. **Unread badge endpoint / read-state**: an `is_read` flag + `GET /api/notifications/` list + `POST …/{id}/read` + "mark all read" would complete the in-app loop.
3. **Pagination & delivery**: page the existing notice/dashboard queries; batch DB writes.
4. **Option for permission** in a future pass: persist each preference's effective default at first write so channel toggles default consistently for every user.