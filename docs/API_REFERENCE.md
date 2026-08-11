# EduNova Global Academy API — API Reference

> Version **1.0.0** · Generated from the validated OpenAPI schema.

Integrated API for EduNova Global Academy. Covers the public website (CMS + admissions enquiries), the student, teacher and parent portals, and the admin portal (admissions, academics, library, hostel, transport, timetable, finance, payroll, scholarship, reports and system modules).

Authentication uses the OTP login flow: call `auth/login` with your credentials to receive a one-time password, then `auth/verify-otp` to obtain JWT access and refresh tokens. Click **Authorize** and paste your Bearer access token to call protected endpoints.

## Overview

All live routes live under the `/api/` prefix on the deployed backend. Responses are JSON.

**JSON error envelope** (every non-2xx response):
```json
{"detail": "human readable message", "code": "stable-slug"}
```

**Standard status codes:**
| Code | Meaning |
|---|---|
| 200/201 | Success / created |
| 204 | No content |
| 400 | Validation or business-rule error (`ValidationErrorSerializer`) |
| 401 | Missing/invalid token |
| 403 | Authenticated but lacking permission |
| 404 | Not found |
| 429 | Rate limited |
| 500 | Unexpected server error (`DetailErrorSerializer`) |

## Authentication

- **`jwtAuth`** — HTTP `bearer` (`JWT`)


1. `POST /api/auth/login/` with `email|username` + `password` → returns `user_id`.
2. `POST /api/auth/verify-otp/` with `user_id` + `otp` → returns JWT `access` / `refresh` tokens.
3. Send `Authorization: Bearer <access_token>` on every protected endpoint.

Protected endpoints require a valid access token. Some documented operations accept an
optional token — they are marked *Optional bearer JWT* below.

## Rate limits

Requests are throttled per the following scopes (IP-based unless noted):

- **Public anonymous requests** — 100 requests/minute/IP
- **Authenticated requests** — 1000 requests/minute/user
- **Login (per account)** — 5 attempts/minute/account
- **Login (per IP)** — 5 attempts/minute/IP
- **OTP verify (per IP)** — 40 attempts/minute/IP
- **OTP resend (per IP)** — 20 attempts/minute/IP
- **Contact form** — 10 submissions/minute/IP
- **Admission enquiry submit** — 5/minute/IP
- **Admission status lookup** — 30/minute/IP
- **Uploads** — 30/minute/user

## Academic

### GET `/api/admin-portal/academic/class-details/`

- **Operation ID:** `admin_portal_academic_class_details_list`
- **Summary:** List records
- **Authentication:** Bearer JWT required
- **Tags:** Academic

Returns all records for this academic entity.

**Responses**

- **200** — No response body
- **400**: `ValidationErrorResponse`
- **401**: `DetailErrorResponse`
- **403**: `DetailErrorResponse`
- **404**: `DetailErrorResponse`
- **500**: `DetailErrorResponse`

---

### GET `/api/admin-portal/academic/class-details/{id}/`

- **Operation ID:** `admin_portal_academic_class_details_list_item`
- **Summary:** List records
- **Authentication:** Bearer JWT required
- **Tags:** Academic

Returns all records for this academic entity.

**Parameters**

| Parameter | In | Type | Required | Description |
|---|---|---|---|---|
| `id` | path | integer | yes |  |

**Responses**

- **200** — No response body
- **400**: `ValidationErrorResponse`
- **401**: `DetailErrorResponse`
- **403**: `DetailErrorResponse`
- **404**: `DetailErrorResponse`
- **500**: `DetailErrorResponse`

---

### GET `/api/admin-portal/academic/class-subjects/`

- **Operation ID:** `admin_portal_academic_class_subjects_list`
- **Summary:** List records
- **Authentication:** Bearer JWT required
- **Tags:** Academic

Returns all records for this academic entity.

**Responses**

- **200** — No response body
- **400**: `ValidationErrorResponse`
- **401**: `DetailErrorResponse`
- **403**: `DetailErrorResponse`
- **404**: `DetailErrorResponse`
- **500**: `DetailErrorResponse`

---

### GET `/api/admin-portal/academic/class-subjects/{id}/`

- **Operation ID:** `admin_portal_academic_class_subjects_list_item`
- **Summary:** List records
- **Authentication:** Bearer JWT required
- **Tags:** Academic

Returns all records for this academic entity.

**Parameters**

| Parameter | In | Type | Required | Description |
|---|---|---|---|---|
| `id` | path | integer | yes |  |

**Responses**

- **200** — No response body
- **400**: `ValidationErrorResponse`
- **401**: `DetailErrorResponse`
- **403**: `DetailErrorResponse`
- **404**: `DetailErrorResponse`
- **500**: `DetailErrorResponse`

---

### GET `/api/admin-portal/academic/curriculum/`

- **Operation ID:** `admin_portal_academic_curriculum_list`
- **Summary:** List records
- **Authentication:** Bearer JWT required
- **Tags:** Academic

Returns all records for this academic entity.

**Responses**

- **200** — No response body
- **400**: `ValidationErrorResponse`
- **401**: `DetailErrorResponse`
- **403**: `DetailErrorResponse`
- **404**: `DetailErrorResponse`
- **500**: `DetailErrorResponse`

---

### GET `/api/admin-portal/academic/curriculum/{id}/`

- **Operation ID:** `admin_portal_academic_curriculum_list_item`
- **Summary:** List records
- **Authentication:** Bearer JWT required
- **Tags:** Academic

Returns all records for this academic entity.

**Parameters**

| Parameter | In | Type | Required | Description |
|---|---|---|---|---|
| `id` | path | integer | yes |  |

**Responses**

- **200** — No response body
- **400**: `ValidationErrorResponse`
- **401**: `DetailErrorResponse`
- **403**: `DetailErrorResponse`
- **404**: `DetailErrorResponse`
- **500**: `DetailErrorResponse`

---

### GET `/api/admin-portal/academic/dashboard/`

- **Operation ID:** `AdminAcademicDashboard`
- **Summary:** Academic dashboard stats
- **Authentication:** Bearer JWT required
- **Tags:** Academic

Aggregate counts across all academic content plus recent items.

**Responses**

- **200**: `object`
- **400**: `ValidationErrorResponse`
- **401**: `DetailErrorResponse`
- **403**: `DetailErrorResponse`
- **404**: `DetailErrorResponse`
- **500**: `DetailErrorResponse`

---

### GET `/api/admin-portal/academic/downloads/`

- **Operation ID:** `admin_portal_academic_downloads_list`
- **Summary:** List records
- **Authentication:** Bearer JWT required
- **Tags:** Academic

Returns all records for this academic entity.

**Responses**

- **200** — No response body
- **400**: `ValidationErrorResponse`
- **401**: `DetailErrorResponse`
- **403**: `DetailErrorResponse`
- **404**: `DetailErrorResponse`
- **500**: `DetailErrorResponse`

---

### GET `/api/admin-portal/academic/downloads/{id}/`

- **Operation ID:** `admin_portal_academic_downloads_list_item`
- **Summary:** List records
- **Authentication:** Bearer JWT required
- **Tags:** Academic

Returns all records for this academic entity.

**Parameters**

| Parameter | In | Type | Required | Description |
|---|---|---|---|---|
| `id` | path | integer | yes |  |

**Responses**

- **200** — No response body
- **400**: `ValidationErrorResponse`
- **401**: `DetailErrorResponse`
- **403**: `DetailErrorResponse`
- **404**: `DetailErrorResponse`
- **500**: `DetailErrorResponse`

---

### GET `/api/admin-portal/academic/faculty-subjects/`

- **Operation ID:** `admin_portal_academic_faculty_subjects_list`
- **Summary:** List records
- **Authentication:** Bearer JWT required
- **Tags:** Academic

Returns all records for this academic entity.

**Responses**

- **200** — No response body
- **400**: `ValidationErrorResponse`
- **401**: `DetailErrorResponse`
- **403**: `DetailErrorResponse`
- **404**: `DetailErrorResponse`
- **500**: `DetailErrorResponse`

---

### GET `/api/admin-portal/academic/faculty-subjects/{id}/`

- **Operation ID:** `admin_portal_academic_faculty_subjects_list_item`
- **Summary:** List records
- **Authentication:** Bearer JWT required
- **Tags:** Academic

Returns all records for this academic entity.

**Parameters**

| Parameter | In | Type | Required | Description |
|---|---|---|---|---|
| `id` | path | integer | yes |  |

**Responses**

- **200** — No response body
- **400**: `ValidationErrorResponse`
- **401**: `DetailErrorResponse`
- **403**: `DetailErrorResponse`
- **404**: `DetailErrorResponse`
- **500**: `DetailErrorResponse`

---

### GET `/api/admin-portal/academic/faculty/`

- **Operation ID:** `admin_portal_academic_faculty_list`
- **Summary:** List records
- **Authentication:** Bearer JWT required
- **Tags:** Academic

Returns all records for this academic entity.

**Responses**

- **200** — No response body
- **400**: `ValidationErrorResponse`
- **401**: `DetailErrorResponse`
- **403**: `DetailErrorResponse`
- **404**: `DetailErrorResponse`
- **500**: `DetailErrorResponse`

---

### GET `/api/admin-portal/academic/faculty/{id}/`

- **Operation ID:** `admin_portal_academic_faculty_list_item`
- **Summary:** List records
- **Authentication:** Bearer JWT required
- **Tags:** Academic

Returns all records for this academic entity.

**Parameters**

| Parameter | In | Type | Required | Description |
|---|---|---|---|---|
| `id` | path | integer | yes |  |

**Responses**

- **200** — No response body
- **400**: `ValidationErrorResponse`
- **401**: `DetailErrorResponse`
- **403**: `DetailErrorResponse`
- **404**: `DetailErrorResponse`
- **500**: `DetailErrorResponse`

---

### GET `/api/admin-portal/academic/levels/`

- **Operation ID:** `admin_portal_academic_levels_list`
- **Summary:** List records
- **Authentication:** Bearer JWT required
- **Tags:** Academic

Returns all records for this academic entity.

**Responses**

- **200** — No response body
- **400**: `ValidationErrorResponse`
- **401**: `DetailErrorResponse`
- **403**: `DetailErrorResponse`
- **404**: `DetailErrorResponse`
- **500**: `DetailErrorResponse`

---

### GET `/api/admin-portal/academic/levels/{id}/`

- **Operation ID:** `admin_portal_academic_levels_list_item`
- **Summary:** List records
- **Authentication:** Bearer JWT required
- **Tags:** Academic

Returns all records for this academic entity.

**Parameters**

| Parameter | In | Type | Required | Description |
|---|---|---|---|---|
| `id` | path | integer | yes |  |

**Responses**

- **200** — No response body
- **400**: `ValidationErrorResponse`
- **401**: `DetailErrorResponse`
- **403**: `DetailErrorResponse`
- **404**: `DetailErrorResponse`
- **500**: `DetailErrorResponse`

---

### GET `/api/admin-portal/academic/subject-details/`

- **Operation ID:** `admin_portal_academic_subject_details_list`
- **Summary:** List records
- **Authentication:** Bearer JWT required
- **Tags:** Academic

Returns all records for this academic entity.

**Responses**

- **200** — No response body
- **400**: `ValidationErrorResponse`
- **401**: `DetailErrorResponse`
- **403**: `DetailErrorResponse`
- **404**: `DetailErrorResponse`
- **500**: `DetailErrorResponse`

---

### GET `/api/admin-portal/academic/subject-details/{id}/`

- **Operation ID:** `admin_portal_academic_subject_details_list_item`
- **Summary:** List records
- **Authentication:** Bearer JWT required
- **Tags:** Academic

Returns all records for this academic entity.

**Parameters**

| Parameter | In | Type | Required | Description |
|---|---|---|---|---|
| `id` | path | integer | yes |  |

**Responses**

- **200** — No response body
- **400**: `ValidationErrorResponse`
- **401**: `DetailErrorResponse`
- **403**: `DetailErrorResponse`
- **404**: `DetailErrorResponse`
- **500**: `DetailErrorResponse`

---

### GET `/api/admin-portal/class-teachers/`

- **Operation ID:** `AdminClassTeacherAssign`
- **Summary:** List class-teacher assignments
- **Authentication:** Bearer JWT required
- **Tags:** Academic

Returns class-to-teacher assignments including each teacher's assigned subjects.

**Responses**

- **200**: `array<AdminClassTeacherListItem>`
- **400**: `ValidationErrorResponse`
- **401**: `DetailErrorResponse`
- **403**: `DetailErrorResponse`
- **404**: `DetailErrorResponse`
- **500**: `DetailErrorResponse`

---

### GET `/api/admin-portal/classes/`

- **Operation ID:** `AdminClassList`
- **Summary:** List classes
- **Authentication:** Bearer JWT required
- **Tags:** Academic

Returns all class (grade/section) records from the portal.

**Responses**

- **200**: `array<AdminClassItem>`
- **400**: `ValidationErrorResponse`
- **401**: `DetailErrorResponse`
- **403**: `DetailErrorResponse`
- **404**: `DetailErrorResponse`
- **500**: `DetailErrorResponse`

---

### GET `/api/admin-portal/enrollments/`

- **Operation ID:** `AdminClassEnrollment`
- **Summary:** List student enrollments
- **Authentication:** Bearer JWT required
- **Tags:** Academic

Returns student-class enrollment records joined with student and class names.

**Responses**

- **200**: `array<AdminEnrollmentListItem>`
- **400**: `ValidationErrorResponse`
- **401**: `DetailErrorResponse`
- **403**: `DetailErrorResponse`
- **404**: `DetailErrorResponse`
- **500**: `DetailErrorResponse`

---

### GET `/api/admin-portal/subjects/`

- **Operation ID:** `AdminSubjectList`
- **Summary:** List subjects
- **Authentication:** Bearer JWT required
- **Tags:** Academic

Returns all subject records from the portal.

**Responses**

- **200**: `array<AdminSubjectItem>`
- **400**: `ValidationErrorResponse`
- **401**: `DetailErrorResponse`
- **403**: `DetailErrorResponse`
- **404**: `DetailErrorResponse`
- **500**: `DetailErrorResponse`

---

### GET `/api/parent/attendance/`

- **Operation ID:** `ParentChildAttendance`
- **Summary:** Get child attendance
- **Authentication:** Bearer JWT required
- **Tags:** Academic

Returns attendance records for one of the parent's children, optionally filtered by month, along with a computed summary.

**Parameters**

| Parameter | In | Type | Required | Description |
|---|---|---|---|---|
| `child_id` | query | integer | no | Student (auth user) id of one of the parent's children. |
| `month` | query | string | no | Attendance month filter in 'YYYY-MM' format, e.g. 2025-01. |

**Responses**

- **200**: `ParentChildAttendanceResponse`
- **400**: `ValidationErrorResponse`
- **401**: `DetailErrorResponse`
- **403**: `DetailErrorResponse`
- **404**: `DetailErrorResponse`
- **500**: `DetailErrorResponse`

---

### GET `/api/parent/homework/`

- **Operation ID:** `ParentChildHomework`
- **Summary:** Get child homework
- **Authentication:** Bearer JWT required
- **Tags:** Academic

Returns homework assigned to one of the parent's children, with subject, teacher and overdue flag.

**Parameters**

| Parameter | In | Type | Required | Description |
|---|---|---|---|---|
| `child_id` | query | integer | no | Student (auth user) id of one of the parent's children. |

**Responses**

- **200**: `array<ParentChildHomeworkItem>`
- **400**: `ValidationErrorResponse`
- **401**: `DetailErrorResponse`
- **403**: `DetailErrorResponse`
- **404**: `DetailErrorResponse`
- **500**: `DetailErrorResponse`

---

### GET `/api/parent/lms/progress/`

- **Operation ID:** `ParentLmsProgress`
- **Summary:** Get child LMS learning progress
- **Authentication:** Bearer JWT required
- **Tags:** Academic

Returns per-course LMS progress for one of the parent's children: progress percent, resources, chapters, attendance, assignments, quizzes, upcoming tests, weak-subject flag and teacher remarks.

**Parameters**

| Parameter | In | Type | Required | Description |
|---|---|---|---|---|
| `child_id` | query | integer | yes | Student (auth user) id of one of the parent's children. |

**Responses**

- **200**: `ParentLmsProgressResponse`
- **400**: `ValidationErrorResponse`
- **401**: `DetailErrorResponse`
- **403**: `DetailErrorResponse`
- **404**: `DetailErrorResponse`
- **500**: `DetailErrorResponse`

---

### GET `/api/parent/results/`

- **Operation ID:** `ParentChildResults`
- **Summary:** Get child exam results
- **Authentication:** Bearer JWT required
- **Tags:** Academic

Returns exam results for one of the parent's children, including marks, percentage and the linked exam details.

**Parameters**

| Parameter | In | Type | Required | Description |
|---|---|---|---|---|
| `child_id` | query | integer | no | Student (auth user) id of one of the parent's children. |

**Responses**

- **200**: `array<ParentChildResultItem>`
- **400**: `ValidationErrorResponse`
- **401**: `DetailErrorResponse`
- **403**: `DetailErrorResponse`
- **404**: `DetailErrorResponse`
- **500**: `DetailErrorResponse`

---

### GET `/api/teacher/assignments/`

- **Operation ID:** `TeacherAssignmentList`
- **Summary:** List assignments
- **Authentication:** Bearer JWT required
- **Tags:** Academic

Returns every assignment created by the teacher with submission and grading counts.

**Responses**

- **200**: `array<TeacherAssignmentItem>`
- **400**: `ValidationErrorResponse`
- **401**: `DetailErrorResponse`
- **403**: `DetailErrorResponse`
- **404**: `DetailErrorResponse`
- **500**: `DetailErrorResponse`

---

### GET `/api/teacher/assignments/{assignment_id}/submissions/`

- **Operation ID:** `TeacherAssignmentSubmissions_item`
- **Summary:** List assignment submissions
- **Authentication:** Bearer JWT required
- **Tags:** Academic

Returns all submissions for an assignment (optionally addressed via the submission detail route).

**Parameters**

| Parameter | In | Type | Required | Description |
|---|---|---|---|---|
| `assignment_id` | path | integer | yes |  |

**Responses**

- **200**: `array<TeacherSubmissionItem>`
- **400**: `ValidationErrorResponse`
- **401**: `DetailErrorResponse`
- **403**: `DetailErrorResponse`
- **404**: `DetailErrorResponse`
- **500**: `DetailErrorResponse`

---

### GET `/api/teacher/assignments/{assignment_id}/submissions/{submission_id}/`

- **Operation ID:** `TeacherAssignmentSubmissionView_item`
- **Summary:** List assignment submissions
- **Authentication:** Bearer JWT required
- **Tags:** Academic

Returns all submissions for an assignment (optionally addressed via the submission detail route).

**Parameters**

| Parameter | In | Type | Required | Description |
|---|---|---|---|---|
| `assignment_id` | path | integer | yes |  |
| `submission_id` | path | integer | yes |  |

**Responses**

- **200**: `array<TeacherSubmissionItem>`
- **400**: `ValidationErrorResponse`
- **401**: `DetailErrorResponse`
- **403**: `DetailErrorResponse`
- **404**: `DetailErrorResponse`
- **500**: `DetailErrorResponse`

---

### GET `/api/teacher/attendance/`

- **Operation ID:** `TeacherAttendance`
- **Summary:** Today's attendance for a class
- **Authentication:** Bearer JWT required
- **Tags:** Academic

Returns the attendance status of every student in the class for the current date. Falls back to the first allocated class when class_id is omitted.

**Parameters**

| Parameter | In | Type | Required | Description |
|---|---|---|---|---|
| `class_id` | query | integer | no | Class id. Defaults to the teacher's first allocated class. |

**Responses**

- **200**: `TeacherAttendanceRecordsResponse`
- **400**: `ValidationErrorResponse`
- **401**: `DetailErrorResponse`
- **403**: `DetailErrorResponse`
- **404**: `DetailErrorResponse`
- **500**: `DetailErrorResponse`

---

### GET `/api/teacher/homework/`

- **Operation ID:** `TeacherHomework`
- **Summary:** List homework
- **Authentication:** Bearer JWT required
- **Tags:** Academic

Returns all homework assigned by the teacher, newest due date first.

**Responses**

- **200**: `array<TeacherHomeworkItem>`
- **400**: `ValidationErrorResponse`
- **401**: `DetailErrorResponse`
- **403**: `DetailErrorResponse`
- **404**: `DetailErrorResponse`
- **500**: `DetailErrorResponse`

---

### POST `/api/admin-portal/academic/class-details/`

- **Operation ID:** `admin_portal_academic_class_details_create`
- **Summary:** Create record
- **Authentication:** Bearer JWT required
- **Tags:** Academic

Creates a new record.

**Request body**

**Content-Type:** `application/json` · **Required:** no

`object`

**Responses**

- **200**: `object`
- **400**: `ValidationErrorResponse`
- **401**: `DetailErrorResponse`
- **403**: `DetailErrorResponse`
- **404**: `DetailErrorResponse`
- **500**: `DetailErrorResponse`

---

### POST `/api/admin-portal/academic/class-details/{id}/`

- **Operation ID:** `admin_portal_academic_class_details_create_item`
- **Summary:** Create record
- **Authentication:** Bearer JWT required
- **Tags:** Academic

Creates a new record.

**Parameters**

| Parameter | In | Type | Required | Description |
|---|---|---|---|---|
| `id` | path | integer | yes |  |

**Request body**

**Content-Type:** `application/json` · **Required:** no

`object`

**Responses**

- **200**: `object`
- **400**: `ValidationErrorResponse`
- **401**: `DetailErrorResponse`
- **403**: `DetailErrorResponse`
- **404**: `DetailErrorResponse`
- **500**: `DetailErrorResponse`

---

### POST `/api/admin-portal/academic/class-subjects/`

- **Operation ID:** `admin_portal_academic_class_subjects_create`
- **Summary:** Create record
- **Authentication:** Bearer JWT required
- **Tags:** Academic

Creates a new record.

**Request body**

**Content-Type:** `application/json` · **Required:** no

`object`

**Responses**

- **200**: `object`
- **400**: `ValidationErrorResponse`
- **401**: `DetailErrorResponse`
- **403**: `DetailErrorResponse`
- **404**: `DetailErrorResponse`
- **500**: `DetailErrorResponse`

---

### POST `/api/admin-portal/academic/class-subjects/{id}/`

- **Operation ID:** `admin_portal_academic_class_subjects_create_item`
- **Summary:** Create record
- **Authentication:** Bearer JWT required
- **Tags:** Academic

Creates a new record.

**Parameters**

| Parameter | In | Type | Required | Description |
|---|---|---|---|---|
| `id` | path | integer | yes |  |

**Request body**

**Content-Type:** `application/json` · **Required:** no

`object`

**Responses**

- **200**: `object`
- **400**: `ValidationErrorResponse`
- **401**: `DetailErrorResponse`
- **403**: `DetailErrorResponse`
- **404**: `DetailErrorResponse`
- **500**: `DetailErrorResponse`

---

### POST `/api/admin-portal/academic/curriculum/`

- **Operation ID:** `admin_portal_academic_curriculum_create`
- **Summary:** Create record
- **Authentication:** Bearer JWT required
- **Tags:** Academic

Creates a new record.

**Request body**

**Content-Type:** `application/json` · **Required:** no

`object`

**Responses**

- **200**: `object`
- **400**: `ValidationErrorResponse`
- **401**: `DetailErrorResponse`
- **403**: `DetailErrorResponse`
- **404**: `DetailErrorResponse`
- **500**: `DetailErrorResponse`

---

### POST `/api/admin-portal/academic/curriculum/{id}/`

- **Operation ID:** `admin_portal_academic_curriculum_create_item`
- **Summary:** Create record
- **Authentication:** Bearer JWT required
- **Tags:** Academic

Creates a new record.

**Parameters**

| Parameter | In | Type | Required | Description |
|---|---|---|---|---|
| `id` | path | integer | yes |  |

**Request body**

**Content-Type:** `application/json` · **Required:** no

`object`

**Responses**

- **200**: `object`
- **400**: `ValidationErrorResponse`
- **401**: `DetailErrorResponse`
- **403**: `DetailErrorResponse`
- **404**: `DetailErrorResponse`
- **500**: `DetailErrorResponse`

---

### POST `/api/admin-portal/academic/downloads/`

- **Operation ID:** `admin_portal_academic_downloads_create`
- **Summary:** Create record
- **Authentication:** Bearer JWT required
- **Tags:** Academic

Creates a new record.

**Request body**

**Content-Type:** `application/json` · **Required:** no

`object`

**Responses**

- **200**: `object`
- **400**: `ValidationErrorResponse`
- **401**: `DetailErrorResponse`
- **403**: `DetailErrorResponse`
- **404**: `DetailErrorResponse`
- **500**: `DetailErrorResponse`

---

### POST `/api/admin-portal/academic/downloads/{id}/`

- **Operation ID:** `admin_portal_academic_downloads_create_item`
- **Summary:** Create record
- **Authentication:** Bearer JWT required
- **Tags:** Academic

Creates a new record.

**Parameters**

| Parameter | In | Type | Required | Description |
|---|---|---|---|---|
| `id` | path | integer | yes |  |

**Request body**

**Content-Type:** `application/json` · **Required:** no

`object`

**Responses**

- **200**: `object`
- **400**: `ValidationErrorResponse`
- **401**: `DetailErrorResponse`
- **403**: `DetailErrorResponse`
- **404**: `DetailErrorResponse`
- **500**: `DetailErrorResponse`

---

### POST `/api/admin-portal/academic/faculty-subjects/`

- **Operation ID:** `admin_portal_academic_faculty_subjects_create`
- **Summary:** Create record
- **Authentication:** Bearer JWT required
- **Tags:** Academic

Creates a new record.

**Request body**

**Content-Type:** `application/json` · **Required:** no

`object`

**Responses**

- **200**: `object`
- **400**: `ValidationErrorResponse`
- **401**: `DetailErrorResponse`
- **403**: `DetailErrorResponse`
- **404**: `DetailErrorResponse`
- **500**: `DetailErrorResponse`

---

### POST `/api/admin-portal/academic/faculty-subjects/{id}/`

- **Operation ID:** `admin_portal_academic_faculty_subjects_create_item`
- **Summary:** Create record
- **Authentication:** Bearer JWT required
- **Tags:** Academic

Creates a new record.

**Parameters**

| Parameter | In | Type | Required | Description |
|---|---|---|---|---|
| `id` | path | integer | yes |  |

**Request body**

**Content-Type:** `application/json` · **Required:** no

`object`

**Responses**

- **200**: `object`
- **400**: `ValidationErrorResponse`
- **401**: `DetailErrorResponse`
- **403**: `DetailErrorResponse`
- **404**: `DetailErrorResponse`
- **500**: `DetailErrorResponse`

---

### POST `/api/admin-portal/academic/faculty/`

- **Operation ID:** `admin_portal_academic_faculty_create`
- **Summary:** Create record
- **Authentication:** Bearer JWT required
- **Tags:** Academic

Creates a new record.

**Request body**

**Content-Type:** `application/json` · **Required:** no

`object`

**Responses**

- **200**: `object`
- **400**: `ValidationErrorResponse`
- **401**: `DetailErrorResponse`
- **403**: `DetailErrorResponse`
- **404**: `DetailErrorResponse`
- **500**: `DetailErrorResponse`

---

### POST `/api/admin-portal/academic/faculty/{id}/`

- **Operation ID:** `admin_portal_academic_faculty_create_item`
- **Summary:** Create record
- **Authentication:** Bearer JWT required
- **Tags:** Academic

Creates a new record.

**Parameters**

| Parameter | In | Type | Required | Description |
|---|---|---|---|---|
| `id` | path | integer | yes |  |

**Request body**

**Content-Type:** `application/json` · **Required:** no

`object`

**Responses**

- **200**: `object`
- **400**: `ValidationErrorResponse`
- **401**: `DetailErrorResponse`
- **403**: `DetailErrorResponse`
- **404**: `DetailErrorResponse`
- **500**: `DetailErrorResponse`

---

### POST `/api/admin-portal/academic/levels/`

- **Operation ID:** `admin_portal_academic_levels_create`
- **Summary:** Create record
- **Authentication:** Bearer JWT required
- **Tags:** Academic

Creates a new record.

**Request body**

**Content-Type:** `application/json` · **Required:** no

`object`

**Responses**

- **200**: `object`
- **400**: `ValidationErrorResponse`
- **401**: `DetailErrorResponse`
- **403**: `DetailErrorResponse`
- **404**: `DetailErrorResponse`
- **500**: `DetailErrorResponse`

---

### POST `/api/admin-portal/academic/levels/{id}/`

- **Operation ID:** `admin_portal_academic_levels_create_item`
- **Summary:** Create record
- **Authentication:** Bearer JWT required
- **Tags:** Academic

Creates a new record.

**Parameters**

| Parameter | In | Type | Required | Description |
|---|---|---|---|---|
| `id` | path | integer | yes |  |

**Request body**

**Content-Type:** `application/json` · **Required:** no

`object`

**Responses**

- **200**: `object`
- **400**: `ValidationErrorResponse`
- **401**: `DetailErrorResponse`
- **403**: `DetailErrorResponse`
- **404**: `DetailErrorResponse`
- **500**: `DetailErrorResponse`

---

### POST `/api/admin-portal/academic/subject-details/`

- **Operation ID:** `admin_portal_academic_subject_details_create`
- **Summary:** Create record
- **Authentication:** Bearer JWT required
- **Tags:** Academic

Creates a new record.

**Request body**

**Content-Type:** `application/json` · **Required:** no

`object`

**Responses**

- **200**: `object`
- **400**: `ValidationErrorResponse`
- **401**: `DetailErrorResponse`
- **403**: `DetailErrorResponse`
- **404**: `DetailErrorResponse`
- **500**: `DetailErrorResponse`

---

### POST `/api/admin-portal/academic/subject-details/{id}/`

- **Operation ID:** `admin_portal_academic_subject_details_create_item`
- **Summary:** Create record
- **Authentication:** Bearer JWT required
- **Tags:** Academic

Creates a new record.

**Parameters**

| Parameter | In | Type | Required | Description |
|---|---|---|---|---|
| `id` | path | integer | yes |  |

**Request body**

**Content-Type:** `application/json` · **Required:** no

`object`

**Responses**

- **200**: `object`
- **400**: `ValidationErrorResponse`
- **401**: `DetailErrorResponse`
- **403**: `DetailErrorResponse`
- **404**: `DetailErrorResponse`
- **500**: `DetailErrorResponse`

---

### POST `/api/admin-portal/class-teachers/`

- **Operation ID:** `AdminClassTeacherAssignCreate`
- **Summary:** Assign a class teacher
- **Authentication:** Bearer JWT required
- **Tags:** Academic

Assigns a teacher to a class (upserting the class teacher) and optionally allocates a subject to that teacher for the class.

**Request body**

**Content-Type:** `application/json` · **Required:** yes

`AdminClassTeacherAssignRequestRequest`

| Field | Type | Required | Description |
|---|---|---|---|
| `class_id` | integer | yes |  |
| `subject_id` | integer | no |  |
| `teacher_id` | integer | yes |  |

**Responses**

- **200**: `AdminClassTeacherAssignResponse`
- **400**: `ValidationErrorResponse`
- **401**: `DetailErrorResponse`
- **403**: `DetailErrorResponse`
- **404**: `DetailErrorResponse`
- **500**: `DetailErrorResponse`

---

### POST `/api/admin-portal/classes/`

- **Operation ID:** `AdminClassCreate`
- **Summary:** Create a class
- **Authentication:** Bearer JWT required
- **Tags:** Academic

Creates a new class/grade record with an optional section, curriculum and room number.

**Request body**

**Content-Type:** `application/json` · **Required:** yes

`AdminClassCreateRequestRequest`

| Field | Type | Required | Description |
|---|---|---|---|
| `curriculum` | string | min 1 | no |  |
| `name` | string | min 1 | yes |  |
| `room_number` | string | min 1 | no |  |
| `section` | string | min 1 | yes |  |

**Responses**

- **200**: `IdDetailResponse`
- **400**: `ValidationErrorResponse`
- **401**: `DetailErrorResponse`
- **403**: `DetailErrorResponse`
- **404**: `DetailErrorResponse`
- **500**: `DetailErrorResponse`

---

### POST `/api/admin-portal/enrollments/`

- **Operation ID:** `AdminClassEnrollmentCreate`
- **Summary:** Enroll a student in a class
- **Authentication:** Bearer JWT required
- **Tags:** Academic

Enrolls a student in a class for an academic year, preventing duplicate enrollments.

**Request body**

**Content-Type:** `application/json` · **Required:** yes

`AdminEnrollmentCreateRequestRequest`

| Field | Type | Required | Description |
|---|---|---|---|
| `academic_year` | string | min 1, default '2025-26' | no |  |
| `class_id` | integer | yes |  |
| `roll_number` | integer | no |  |
| `student_id` | integer | yes |  |

**Responses**

- **201**: `AdminEnrollmentCreateResponse`
- **400**: `ValidationErrorResponse`
- **401**: `DetailErrorResponse`
- **403**: `DetailErrorResponse`
- **404**: `DetailErrorResponse`
- **500**: `DetailErrorResponse`

---

### POST `/api/admin-portal/subjects/`

- **Operation ID:** `AdminSubjectCreate`
- **Summary:** Create a subject
- **Authentication:** Bearer JWT required
- **Tags:** Academic

Creates a new subject record.

**Request body**

**Content-Type:** `application/json` · **Required:** yes

`AdminSubjectCreateRequestRequest`

| Field | Type | Required | Description |
|---|---|---|---|
| `name` | string | min 1 | yes |  |
| `subject_code` | string | min 1 | no |  |
| `type` | string | min 1 | no |  |

**Responses**

- **200**: `IdDetailResponse`
- **400**: `ValidationErrorResponse`
- **401**: `DetailErrorResponse`
- **403**: `DetailErrorResponse`
- **404**: `DetailErrorResponse`
- **500**: `DetailErrorResponse`

---

### POST `/api/teacher/assignments/`

- **Operation ID:** `TeacherAssignmentCreate`
- **Summary:** Create assignment
- **Authentication:** Bearer JWT required
- **Tags:** Academic

Creates a new assignment (file or MCQ based) for a class and subject.

**Request body**

**Content-Type:** `application/json` · **Required:** yes

`TeacherAssignmentCreateRequestRequest`

| Field | Type | Required | Description |
|---|---|---|---|
| `assignment_type` | any | default 'File' | no |  |
| `class_id` | integer | yes |  |
| `description` | string | no |  |
| `due_date` | string (date) | nullable | no |  |
| `file_url` | any | no |  |
| `max_marks` | number | default 100.0 | no |  |
| `quiz_questions` | array<TeacherQuizQuestionItemRequest> | default [] | no |  |
| `subject_id` | integer | yes |  |
| `title` | string | min 1 | yes |  |

**Responses**

- **200**: `IdDetailResponse`
- **400**: `ValidationErrorResponse`
- **401**: `DetailErrorResponse`
- **403**: `DetailErrorResponse`
- **404**: `DetailErrorResponse`
- **500**: `DetailErrorResponse`

---

### POST `/api/teacher/assignments/scan-pdf/`

- **Operation ID:** `TeacherAssignmentScanPdf`
- **Summary:** Scan PDF for questions
- **Authentication:** Bearer JWT required
- **Tags:** Academic

Uploads a PDF, extracts multiple-choice questions and returns them for use in an MCQ assignment.

**Request body**

**Content-Type:** `application/json` · **Required:** yes

`TeacherPdfScanRequestRequest`

| Field | Type | Required | Description |
|---|---|---|---|
| `file` | string (binary) | yes | PDF file to extract questions from. |

**Responses**

- **200**: `TeacherPdfScanResponse`
- **400**: `ValidationErrorResponse`
- **401**: `DetailErrorResponse`
- **403**: `DetailErrorResponse`
- **404**: `DetailErrorResponse`
- **500**: `DetailErrorResponse`

---

### POST `/api/teacher/attendance/`

- **Operation ID:** `TeacherAttendanceSubmit`
- **Summary:** Mark attendance
- **Authentication:** Bearer JWT required
- **Tags:** Academic

Inserts or upserts attendance records for a class and date in a single call.

**Request body**

**Content-Type:** `application/json` · **Required:** yes

`TeacherAttendanceMarkRequestRequest`

| Field | Type | Required | Description |
|---|---|---|---|
| `class_id` | integer | yes |  |
| `date` | string (date) | no | Defaults to the current date. |
| `records` | array<TeacherAttendanceMarkItemRequest> | yes |  |

**Responses**

- **200**: `SuccessDetailResponse`
- **400**: `ValidationErrorResponse`
- **401**: `DetailErrorResponse`
- **403**: `DetailErrorResponse`
- **404**: `DetailErrorResponse`
- **500**: `DetailErrorResponse`

---

### POST `/api/teacher/homework/`

- **Operation ID:** `TeacherHomeworkCreate`
- **Summary:** Assign homework
- **Authentication:** Bearer JWT required
- **Tags:** Academic

Creates a new homework entry for a class and subject.

**Request body**

**Content-Type:** `application/json` · **Required:** yes

`TeacherHomeworkCreateRequestRequest`

| Field | Type | Required | Description |
|---|---|---|---|
| `assigned_date` | string (date) | no |  |
| `class_id` | integer | yes |  |
| `description` | string | no |  |
| `due_date` | string (date) | nullable | no |  |
| `subject_id` | integer | nullable | no | Pass 0 or omit for Class Administration. |
| `title` | string | min 1 | yes |  |

**Responses**

- **200**: `IdDetailResponse`
- **400**: `ValidationErrorResponse`
- **401**: `DetailErrorResponse`
- **403**: `DetailErrorResponse`
- **404**: `DetailErrorResponse`
- **500**: `DetailErrorResponse`

---

### PATCH `/api/admin-portal/academic/class-details/`

- **Operation ID:** `admin_portal_academic_class_details_partial_update`
- **Summary:** Update record
- **Authentication:** Bearer JWT required
- **Tags:** Academic

Partially updates a record by id.

**Request body**

**Content-Type:** `application/json` · **Required:** no

`object`

**Responses**

- **200**: `object`
- **400**: `ValidationErrorResponse`
- **401**: `DetailErrorResponse`
- **403**: `DetailErrorResponse`
- **404**: `DetailErrorResponse`
- **500**: `DetailErrorResponse`

---

### PATCH `/api/admin-portal/academic/class-details/{id}/`

- **Operation ID:** `admin_portal_academic_class_details_partial_update_item`
- **Summary:** Update record
- **Authentication:** Bearer JWT required
- **Tags:** Academic

Partially updates a record by id.

**Parameters**

| Parameter | In | Type | Required | Description |
|---|---|---|---|---|
| `id` | path | integer | yes |  |

**Request body**

**Content-Type:** `application/json` · **Required:** no

`object`

**Responses**

- **200**: `object`
- **400**: `ValidationErrorResponse`
- **401**: `DetailErrorResponse`
- **403**: `DetailErrorResponse`
- **404**: `DetailErrorResponse`
- **500**: `DetailErrorResponse`

---

### PATCH `/api/admin-portal/academic/class-subjects/`

- **Operation ID:** `admin_portal_academic_class_subjects_partial_update`
- **Summary:** Update record
- **Authentication:** Bearer JWT required
- **Tags:** Academic

Partially updates a record by id.

**Request body**

**Content-Type:** `application/json` · **Required:** no

`object`

**Responses**

- **200**: `object`
- **400**: `ValidationErrorResponse`
- **401**: `DetailErrorResponse`
- **403**: `DetailErrorResponse`
- **404**: `DetailErrorResponse`
- **500**: `DetailErrorResponse`

---

### PATCH `/api/admin-portal/academic/class-subjects/{id}/`

- **Operation ID:** `admin_portal_academic_class_subjects_partial_update_item`
- **Summary:** Update record
- **Authentication:** Bearer JWT required
- **Tags:** Academic

Partially updates a record by id.

**Parameters**

| Parameter | In | Type | Required | Description |
|---|---|---|---|---|
| `id` | path | integer | yes |  |

**Request body**

**Content-Type:** `application/json` · **Required:** no

`object`

**Responses**

- **200**: `object`
- **400**: `ValidationErrorResponse`
- **401**: `DetailErrorResponse`
- **403**: `DetailErrorResponse`
- **404**: `DetailErrorResponse`
- **500**: `DetailErrorResponse`

---

### PATCH `/api/admin-portal/academic/curriculum/`

- **Operation ID:** `admin_portal_academic_curriculum_partial_update`
- **Summary:** Update record
- **Authentication:** Bearer JWT required
- **Tags:** Academic

Partially updates a record by id.

**Request body**

**Content-Type:** `application/json` · **Required:** no

`object`

**Responses**

- **200**: `object`
- **400**: `ValidationErrorResponse`
- **401**: `DetailErrorResponse`
- **403**: `DetailErrorResponse`
- **404**: `DetailErrorResponse`
- **500**: `DetailErrorResponse`

---

### PATCH `/api/admin-portal/academic/curriculum/{id}/`

- **Operation ID:** `admin_portal_academic_curriculum_partial_update_item`
- **Summary:** Update record
- **Authentication:** Bearer JWT required
- **Tags:** Academic

Partially updates a record by id.

**Parameters**

| Parameter | In | Type | Required | Description |
|---|---|---|---|---|
| `id` | path | integer | yes |  |

**Request body**

**Content-Type:** `application/json` · **Required:** no

`object`

**Responses**

- **200**: `object`
- **400**: `ValidationErrorResponse`
- **401**: `DetailErrorResponse`
- **403**: `DetailErrorResponse`
- **404**: `DetailErrorResponse`
- **500**: `DetailErrorResponse`

---

### PATCH `/api/admin-portal/academic/downloads/`

- **Operation ID:** `admin_portal_academic_downloads_partial_update`
- **Summary:** Update record
- **Authentication:** Bearer JWT required
- **Tags:** Academic

Partially updates a record by id.

**Request body**

**Content-Type:** `application/json` · **Required:** no

`object`

**Responses**

- **200**: `object`
- **400**: `ValidationErrorResponse`
- **401**: `DetailErrorResponse`
- **403**: `DetailErrorResponse`
- **404**: `DetailErrorResponse`
- **500**: `DetailErrorResponse`

---

### PATCH `/api/admin-portal/academic/downloads/{id}/`

- **Operation ID:** `admin_portal_academic_downloads_partial_update_item`
- **Summary:** Update record
- **Authentication:** Bearer JWT required
- **Tags:** Academic

Partially updates a record by id.

**Parameters**

| Parameter | In | Type | Required | Description |
|---|---|---|---|---|
| `id` | path | integer | yes |  |

**Request body**

**Content-Type:** `application/json` · **Required:** no

`object`

**Responses**

- **200**: `object`
- **400**: `ValidationErrorResponse`
- **401**: `DetailErrorResponse`
- **403**: `DetailErrorResponse`
- **404**: `DetailErrorResponse`
- **500**: `DetailErrorResponse`

---

### PATCH `/api/admin-portal/academic/faculty-subjects/`

- **Operation ID:** `admin_portal_academic_faculty_subjects_partial_update`
- **Summary:** Update record
- **Authentication:** Bearer JWT required
- **Tags:** Academic

Partially updates a record by id.

**Request body**

**Content-Type:** `application/json` · **Required:** no

`object`

**Responses**

- **200**: `object`
- **400**: `ValidationErrorResponse`
- **401**: `DetailErrorResponse`
- **403**: `DetailErrorResponse`
- **404**: `DetailErrorResponse`
- **500**: `DetailErrorResponse`

---

### PATCH `/api/admin-portal/academic/faculty-subjects/{id}/`

- **Operation ID:** `admin_portal_academic_faculty_subjects_partial_update_item`
- **Summary:** Update record
- **Authentication:** Bearer JWT required
- **Tags:** Academic

Partially updates a record by id.

**Parameters**

| Parameter | In | Type | Required | Description |
|---|---|---|---|---|
| `id` | path | integer | yes |  |

**Request body**

**Content-Type:** `application/json` · **Required:** no

`object`

**Responses**

- **200**: `object`
- **400**: `ValidationErrorResponse`
- **401**: `DetailErrorResponse`
- **403**: `DetailErrorResponse`
- **404**: `DetailErrorResponse`
- **500**: `DetailErrorResponse`

---

### PATCH `/api/admin-portal/academic/faculty/`

- **Operation ID:** `admin_portal_academic_faculty_partial_update`
- **Summary:** Update record
- **Authentication:** Bearer JWT required
- **Tags:** Academic

Partially updates a record by id.

**Request body**

**Content-Type:** `application/json` · **Required:** no

`object`

**Responses**

- **200**: `object`
- **400**: `ValidationErrorResponse`
- **401**: `DetailErrorResponse`
- **403**: `DetailErrorResponse`
- **404**: `DetailErrorResponse`
- **500**: `DetailErrorResponse`

---

### PATCH `/api/admin-portal/academic/faculty/{id}/`

- **Operation ID:** `admin_portal_academic_faculty_partial_update_item`
- **Summary:** Update record
- **Authentication:** Bearer JWT required
- **Tags:** Academic

Partially updates a record by id.

**Parameters**

| Parameter | In | Type | Required | Description |
|---|---|---|---|---|
| `id` | path | integer | yes |  |

**Request body**

**Content-Type:** `application/json` · **Required:** no

`object`

**Responses**

- **200**: `object`
- **400**: `ValidationErrorResponse`
- **401**: `DetailErrorResponse`
- **403**: `DetailErrorResponse`
- **404**: `DetailErrorResponse`
- **500**: `DetailErrorResponse`

---

### PATCH `/api/admin-portal/academic/levels/`

- **Operation ID:** `admin_portal_academic_levels_partial_update`
- **Summary:** Update record
- **Authentication:** Bearer JWT required
- **Tags:** Academic

Partially updates a record by id.

**Request body**

**Content-Type:** `application/json` · **Required:** no

`object`

**Responses**

- **200**: `object`
- **400**: `ValidationErrorResponse`
- **401**: `DetailErrorResponse`
- **403**: `DetailErrorResponse`
- **404**: `DetailErrorResponse`
- **500**: `DetailErrorResponse`

---

### PATCH `/api/admin-portal/academic/levels/{id}/`

- **Operation ID:** `admin_portal_academic_levels_partial_update_item`
- **Summary:** Update record
- **Authentication:** Bearer JWT required
- **Tags:** Academic

Partially updates a record by id.

**Parameters**

| Parameter | In | Type | Required | Description |
|---|---|---|---|---|
| `id` | path | integer | yes |  |

**Request body**

**Content-Type:** `application/json` · **Required:** no

`object`

**Responses**

- **200**: `object`
- **400**: `ValidationErrorResponse`
- **401**: `DetailErrorResponse`
- **403**: `DetailErrorResponse`
- **404**: `DetailErrorResponse`
- **500**: `DetailErrorResponse`

---

### PATCH `/api/admin-portal/academic/subject-details/`

- **Operation ID:** `admin_portal_academic_subject_details_partial_update`
- **Summary:** Update record
- **Authentication:** Bearer JWT required
- **Tags:** Academic

Partially updates a record by id.

**Request body**

**Content-Type:** `application/json` · **Required:** no

`object`

**Responses**

- **200**: `object`
- **400**: `ValidationErrorResponse`
- **401**: `DetailErrorResponse`
- **403**: `DetailErrorResponse`
- **404**: `DetailErrorResponse`
- **500**: `DetailErrorResponse`

---

### PATCH `/api/admin-portal/academic/subject-details/{id}/`

- **Operation ID:** `admin_portal_academic_subject_details_partial_update_item`
- **Summary:** Update record
- **Authentication:** Bearer JWT required
- **Tags:** Academic

Partially updates a record by id.

**Parameters**

| Parameter | In | Type | Required | Description |
|---|---|---|---|---|
| `id` | path | integer | yes |  |

**Request body**

**Content-Type:** `application/json` · **Required:** no

`object`

**Responses**

- **200**: `object`
- **400**: `ValidationErrorResponse`
- **401**: `DetailErrorResponse`
- **403**: `DetailErrorResponse`
- **404**: `DetailErrorResponse`
- **500**: `DetailErrorResponse`

---

### PATCH `/api/teacher/assignments/{assignment_id}/`

- **Operation ID:** `TeacherAssignmentDetailUpdate`
- **Summary:** Update assignment
- **Authentication:** Bearer JWT required
- **Tags:** Academic

Partially updates the fields of an existing assignment.

**Parameters**

| Parameter | In | Type | Required | Description |
|---|---|---|---|---|
| `assignment_id` | path | integer | yes |  |

**Request body**

**Content-Type:** `application/json` · **Required:** no

`PatchedTeacherAssignmentPatchRequestRequest`

| Field | Type | Required | Description |
|---|---|---|---|
| `assignment_type` | TeacherAssignmentPatchRequestAssignmentTypeEnum | no |  |
| `description` | string | no |  |
| `due_date` | string (date) | nullable | no |  |
| `file_url` | any | no |  |
| `max_marks` | number | no |  |
| `quiz_questions` | array<TeacherQuizQuestionItemRequest> | no |  |
| `title` | string | no |  |

**Responses**

- **200**: `SuccessDetailResponse`
- **400**: `ValidationErrorResponse`
- **401**: `DetailErrorResponse`
- **403**: `DetailErrorResponse`
- **404**: `DetailErrorResponse`
- **500**: `DetailErrorResponse`

---

### PATCH `/api/teacher/assignments/{assignment_id}/submissions/`

- **Operation ID:** `TeacherAssignmentSubmissionBulk_item`
- **Summary:** Grade a submission
- **Authentication:** Bearer JWT required
- **Tags:** Academic

Records marks and feedback for a single student submission and derives a letter grade.

**Parameters**

| Parameter | In | Type | Required | Description |
|---|---|---|---|---|
| `assignment_id` | path | integer | yes |  |

**Request body**

**Content-Type:** `application/json` · **Required:** no

`PatchedTeacherSubmissionGradeRequestRequest`

| Field | Type | Required | Description |
|---|---|---|---|
| `marks_obtained` | number | nullable | no |  |
| `teacher_feedback` | string | no |  |

**Responses**

- **200**: `SuccessDetailResponse`
- **400**: `ValidationErrorResponse`
- **401**: `DetailErrorResponse`
- **403**: `DetailErrorResponse`
- **404**: `DetailErrorResponse`
- **500**: `DetailErrorResponse`

---

### PATCH `/api/teacher/assignments/{assignment_id}/submissions/{submission_id}/`

- **Operation ID:** `TeacherAssignmentSubmissionDetail_item`
- **Summary:** Grade a submission
- **Authentication:** Bearer JWT required
- **Tags:** Academic

Records marks and feedback for a single student submission and derives a letter grade.

**Parameters**

| Parameter | In | Type | Required | Description |
|---|---|---|---|---|
| `assignment_id` | path | integer | yes |  |
| `submission_id` | path | integer | yes |  |

**Request body**

**Content-Type:** `application/json` · **Required:** no

`PatchedTeacherSubmissionGradeRequestRequest`

| Field | Type | Required | Description |
|---|---|---|---|
| `marks_obtained` | number | nullable | no |  |
| `teacher_feedback` | string | no |  |

**Responses**

- **200**: `SuccessDetailResponse`
- **400**: `ValidationErrorResponse`
- **401**: `DetailErrorResponse`
- **403**: `DetailErrorResponse`
- **404**: `DetailErrorResponse`
- **500**: `DetailErrorResponse`

---

### DELETE `/api/admin-portal/academic/class-details/`

- **Operation ID:** `admin_portal_academic_class_details_destroy`
- **Summary:** Delete record
- **Authentication:** Bearer JWT required
- **Tags:** Academic

Deletes a record by id.

**Responses**

- **200**: `object`
- **400**: `ValidationErrorResponse`
- **401**: `DetailErrorResponse`
- **403**: `DetailErrorResponse`
- **404**: `DetailErrorResponse`
- **500**: `DetailErrorResponse`

---

### DELETE `/api/admin-portal/academic/class-details/{id}/`

- **Operation ID:** `admin_portal_academic_class_details_destroy_item`
- **Summary:** Delete record
- **Authentication:** Bearer JWT required
- **Tags:** Academic

Deletes a record by id.

**Parameters**

| Parameter | In | Type | Required | Description |
|---|---|---|---|---|
| `id` | path | integer | yes |  |

**Responses**

- **200**: `object`
- **400**: `ValidationErrorResponse`
- **401**: `DetailErrorResponse`
- **403**: `DetailErrorResponse`
- **404**: `DetailErrorResponse`
- **500**: `DetailErrorResponse`

---

### DELETE `/api/admin-portal/academic/class-subjects/`

- **Operation ID:** `admin_portal_academic_class_subjects_destroy`
- **Summary:** Delete record
- **Authentication:** Bearer JWT required
- **Tags:** Academic

Deletes a record by id.

**Responses**

- **200**: `object`
- **400**: `ValidationErrorResponse`
- **401**: `DetailErrorResponse`
- **403**: `DetailErrorResponse`
- **404**: `DetailErrorResponse`
- **500**: `DetailErrorResponse`

---

### DELETE `/api/admin-portal/academic/class-subjects/{id}/`

- **Operation ID:** `admin_portal_academic_class_subjects_destroy_item`
- **Summary:** Delete record
- **Authentication:** Bearer JWT required
- **Tags:** Academic

Deletes a record by id.

**Parameters**

| Parameter | In | Type | Required | Description |
|---|---|---|---|---|
| `id` | path | integer | yes |  |

**Responses**

- **200**: `object`
- **400**: `ValidationErrorResponse`
- **401**: `DetailErrorResponse`
- **403**: `DetailErrorResponse`
- **404**: `DetailErrorResponse`
- **500**: `DetailErrorResponse`

---

### DELETE `/api/admin-portal/academic/curriculum/`

- **Operation ID:** `admin_portal_academic_curriculum_destroy`
- **Summary:** Delete record
- **Authentication:** Bearer JWT required
- **Tags:** Academic

Deletes a record by id.

**Responses**

- **200**: `object`
- **400**: `ValidationErrorResponse`
- **401**: `DetailErrorResponse`
- **403**: `DetailErrorResponse`
- **404**: `DetailErrorResponse`
- **500**: `DetailErrorResponse`

---

### DELETE `/api/admin-portal/academic/curriculum/{id}/`

- **Operation ID:** `admin_portal_academic_curriculum_destroy_item`
- **Summary:** Delete record
- **Authentication:** Bearer JWT required
- **Tags:** Academic

Deletes a record by id.

**Parameters**

| Parameter | In | Type | Required | Description |
|---|---|---|---|---|
| `id` | path | integer | yes |  |

**Responses**

- **200**: `object`
- **400**: `ValidationErrorResponse`
- **401**: `DetailErrorResponse`
- **403**: `DetailErrorResponse`
- **404**: `DetailErrorResponse`
- **500**: `DetailErrorResponse`

---

### DELETE `/api/admin-portal/academic/downloads/`

- **Operation ID:** `admin_portal_academic_downloads_destroy`
- **Summary:** Delete record
- **Authentication:** Bearer JWT required
- **Tags:** Academic

Deletes a record by id.

**Responses**

- **200**: `object`
- **400**: `ValidationErrorResponse`
- **401**: `DetailErrorResponse`
- **403**: `DetailErrorResponse`
- **404**: `DetailErrorResponse`
- **500**: `DetailErrorResponse`

---

### DELETE `/api/admin-portal/academic/downloads/{id}/`

- **Operation ID:** `admin_portal_academic_downloads_destroy_item`
- **Summary:** Delete record
- **Authentication:** Bearer JWT required
- **Tags:** Academic

Deletes a record by id.

**Parameters**

| Parameter | In | Type | Required | Description |
|---|---|---|---|---|
| `id` | path | integer | yes |  |

**Responses**

- **200**: `object`
- **400**: `ValidationErrorResponse`
- **401**: `DetailErrorResponse`
- **403**: `DetailErrorResponse`
- **404**: `DetailErrorResponse`
- **500**: `DetailErrorResponse`

---

### DELETE `/api/admin-portal/academic/faculty-subjects/`

- **Operation ID:** `admin_portal_academic_faculty_subjects_destroy`
- **Summary:** Delete record
- **Authentication:** Bearer JWT required
- **Tags:** Academic

Deletes a record by id.

**Responses**

- **200**: `object`
- **400**: `ValidationErrorResponse`
- **401**: `DetailErrorResponse`
- **403**: `DetailErrorResponse`
- **404**: `DetailErrorResponse`
- **500**: `DetailErrorResponse`

---

### DELETE `/api/admin-portal/academic/faculty-subjects/{id}/`

- **Operation ID:** `admin_portal_academic_faculty_subjects_destroy_item`
- **Summary:** Delete record
- **Authentication:** Bearer JWT required
- **Tags:** Academic

Deletes a record by id.

**Parameters**

| Parameter | In | Type | Required | Description |
|---|---|---|---|---|
| `id` | path | integer | yes |  |

**Responses**

- **200**: `object`
- **400**: `ValidationErrorResponse`
- **401**: `DetailErrorResponse`
- **403**: `DetailErrorResponse`
- **404**: `DetailErrorResponse`
- **500**: `DetailErrorResponse`

---

### DELETE `/api/admin-portal/academic/faculty/`

- **Operation ID:** `admin_portal_academic_faculty_destroy`
- **Summary:** Delete record
- **Authentication:** Bearer JWT required
- **Tags:** Academic

Deletes a record by id.

**Responses**

- **200**: `object`
- **400**: `ValidationErrorResponse`
- **401**: `DetailErrorResponse`
- **403**: `DetailErrorResponse`
- **404**: `DetailErrorResponse`
- **500**: `DetailErrorResponse`

---

### DELETE `/api/admin-portal/academic/faculty/{id}/`

- **Operation ID:** `admin_portal_academic_faculty_destroy_item`
- **Summary:** Delete record
- **Authentication:** Bearer JWT required
- **Tags:** Academic

Deletes a record by id.

**Parameters**

| Parameter | In | Type | Required | Description |
|---|---|---|---|---|
| `id` | path | integer | yes |  |

**Responses**

- **200**: `object`
- **400**: `ValidationErrorResponse`
- **401**: `DetailErrorResponse`
- **403**: `DetailErrorResponse`
- **404**: `DetailErrorResponse`
- **500**: `DetailErrorResponse`

---

### DELETE `/api/admin-portal/academic/levels/`

- **Operation ID:** `admin_portal_academic_levels_destroy`
- **Summary:** Delete record
- **Authentication:** Bearer JWT required
- **Tags:** Academic

Deletes a record by id.

**Responses**

- **200**: `object`
- **400**: `ValidationErrorResponse`
- **401**: `DetailErrorResponse`
- **403**: `DetailErrorResponse`
- **404**: `DetailErrorResponse`
- **500**: `DetailErrorResponse`

---

### DELETE `/api/admin-portal/academic/levels/{id}/`

- **Operation ID:** `admin_portal_academic_levels_destroy_item`
- **Summary:** Delete record
- **Authentication:** Bearer JWT required
- **Tags:** Academic

Deletes a record by id.

**Parameters**

| Parameter | In | Type | Required | Description |
|---|---|---|---|---|
| `id` | path | integer | yes |  |

**Responses**

- **200**: `object`
- **400**: `ValidationErrorResponse`
- **401**: `DetailErrorResponse`
- **403**: `DetailErrorResponse`
- **404**: `DetailErrorResponse`
- **500**: `DetailErrorResponse`

---

### DELETE `/api/admin-portal/academic/subject-details/`

- **Operation ID:** `admin_portal_academic_subject_details_destroy`
- **Summary:** Delete record
- **Authentication:** Bearer JWT required
- **Tags:** Academic

Deletes a record by id.

**Responses**

- **200**: `object`
- **400**: `ValidationErrorResponse`
- **401**: `DetailErrorResponse`
- **403**: `DetailErrorResponse`
- **404**: `DetailErrorResponse`
- **500**: `DetailErrorResponse`

---

### DELETE `/api/admin-portal/academic/subject-details/{id}/`

- **Operation ID:** `admin_portal_academic_subject_details_destroy_item`
- **Summary:** Delete record
- **Authentication:** Bearer JWT required
- **Tags:** Academic

Deletes a record by id.

**Parameters**

| Parameter | In | Type | Required | Description |
|---|---|---|---|---|
| `id` | path | integer | yes |  |

**Responses**

- **200**: `object`
- **400**: `ValidationErrorResponse`
- **401**: `DetailErrorResponse`
- **403**: `DetailErrorResponse`
- **404**: `DetailErrorResponse`
- **500**: `DetailErrorResponse`

---

### DELETE `/api/teacher/assignments/{assignment_id}/`

- **Operation ID:** `TeacherAssignmentDetailDelete`
- **Summary:** Delete assignment
- **Authentication:** Bearer JWT required
- **Tags:** Academic

Deletes an existing assignment.

**Parameters**

| Parameter | In | Type | Required | Description |
|---|---|---|---|---|
| `assignment_id` | path | integer | yes |  |

**Responses**

- **200**: `SuccessDetailResponse`
- **400**: `ValidationErrorResponse`
- **401**: `DetailErrorResponse`
- **403**: `DetailErrorResponse`
- **404**: `DetailErrorResponse`
- **500**: `DetailErrorResponse`

---

## Admin Portal

### GET `/api/admin-portal/alumni/`

- **Operation ID:** `AlumniList`
- **Summary:** List alumni
- **Authentication:** Bearer JWT required
- **Tags:** Admin Portal

Return alumni records, optionally filtered by graduation year.

**Parameters**

| Parameter | In | Type | Required | Description |
|---|---|---|---|---|
| `graduation_year` | query | integer | no | Filter alumni by graduation year. |

**Responses**

- **200**: `array<AlumniItem>`
- **400**: `ValidationErrorResponse`
- **401**: `DetailErrorResponse`
- **403**: `DetailErrorResponse`
- **404**: `DetailErrorResponse`
- **500**: `DetailErrorResponse`

---

### GET `/api/admin-portal/dashboard/`

- **Operation ID:** `AdminDashboard`
- **Summary:** Admin portal dashboard
- **Authentication:** Bearer JWT required
- **Tags:** Admin Portal

Returns aggregate counts across admissions, students, teachers, parents, employees, leaves, fees and library, plus the most recent admissions.

**Responses**

- **200**: `AdminDashboardResponse`
- **400**: `ValidationErrorResponse`
- **401**: `DetailErrorResponse`
- **403**: `DetailErrorResponse`
- **404**: `DetailErrorResponse`
- **500**: `DetailErrorResponse`

---

### GET `/api/admin-portal/leaves/`

- **Operation ID:** `AdminLeaveApprovalList`
- **Summary:** List leave requests
- **Authentication:** Bearer JWT required
- **Tags:** Admin Portal

Returns pending (or status-filtered) leave requests from staff and students.

**Parameters**

| Parameter | In | Type | Required | Description |
|---|---|---|---|---|
| `status` | query | string | no | Leave status filter (default 'Pending'). |

**Responses**

- **200**: `array<AdminLeaveItem>`
- **400**: `ValidationErrorResponse`
- **401**: `DetailErrorResponse`
- **403**: `DetailErrorResponse`
- **404**: `DetailErrorResponse`
- **500**: `DetailErrorResponse`

---

### GET `/api/admin-portal/leaves/{leave_id}/decide/`

- **Operation ID:** `AdminLeaveDecideRoute_item`
- **Summary:** List leave requests
- **Authentication:** Bearer JWT required
- **Tags:** Admin Portal

Returns pending (or status-filtered) leave requests from staff and students.

**Parameters**

| Parameter | In | Type | Required | Description |
|---|---|---|---|---|
| `leave_id` | path | integer | yes |  |
| `status` | query | string | no | Leave status filter (default 'Pending'). |

**Responses**

- **200**: `array<AdminLeaveItem>`
- **400**: `ValidationErrorResponse`
- **401**: `DetailErrorResponse`
- **403**: `DetailErrorResponse`
- **404**: `DetailErrorResponse`
- **500**: `DetailErrorResponse`

---

### GET `/api/admin-portal/medical-logs/`

- **Operation ID:** `MedicalLogList`
- **Summary:** List medical logs
- **Authentication:** Bearer JWT required
- **Tags:** Admin Portal

Return medical visit logs, optionally filtered by student.

**Parameters**

| Parameter | In | Type | Required | Description |
|---|---|---|---|---|
| `student_id` | query | integer | no | Student (auth user) id. |

**Responses**

- **200**: `array<MedicalLogItem>`
- **400**: `ValidationErrorResponse`
- **401**: `DetailErrorResponse`
- **403**: `DetailErrorResponse`
- **404**: `DetailErrorResponse`
- **500**: `DetailErrorResponse`

---

### GET `/api/admin-portal/roles/`

- **Operation ID:** `AdminRoles`
- **Summary:** Role member counts
- **Authentication:** Bearer JWT required
- **Tags:** Admin Portal

Returns the number of users in each supported role (Student, Teacher, Parent, Admin, Employee).

**Responses**

- **200**: `AdminRolesResponse`
- **400**: `ValidationErrorResponse`
- **401**: `DetailErrorResponse`
- **403**: `DetailErrorResponse`
- **404**: `DetailErrorResponse`
- **500**: `DetailErrorResponse`

---

### GET `/api/admin-portal/users/`

- **Operation ID:** `AdminUserList`
- **Summary:** List portal users
- **Authentication:** Bearer JWT required
- **Tags:** Admin Portal

Returns all auth users with their resolved role, optionally filtered by role.

**Parameters**

| Parameter | In | Type | Required | Description |
|---|---|---|---|---|
| `role` | query | string | no | Filter by role (Student, Teacher, Parent, Admin, Employee). |

**Responses**

- **200**: `array<AdminUserItem>`
- **400**: `ValidationErrorResponse`
- **401**: `DetailErrorResponse`
- **403**: `DetailErrorResponse`
- **404**: `DetailErrorResponse`
- **500**: `DetailErrorResponse`

---

### POST `/api/admin-portal/alumni/`

- **Operation ID:** `AlumniUpsert`
- **Summary:** Create or update an alumni record
- **Authentication:** Bearer JWT required
- **Tags:** Admin Portal

Upsert an alumni record keyed by student_id.

**Request body**

**Content-Type:** `application/json` · **Required:** yes

`AlumniUpsertRequestRequest`

| Field | Type | Required | Description |
|---|---|---|---|
| `current_occupation` | string | min 1 | no |  |
| `graduation_year` | integer | yes |  |
| `higher_studies_details` | string | min 1 | no |  |
| `student_id` | integer | yes |  |

**Responses**

- **200**: `IdDetailResponse`
- **400**: `ValidationErrorResponse`
- **401**: `DetailErrorResponse`
- **403**: `DetailErrorResponse`
- **404**: `DetailErrorResponse`
- **500**: `DetailErrorResponse`

---

### POST `/api/admin-portal/leaves/`

- **Operation ID:** `AdminLeaveDecideCreate`
- **Summary:** Approve or reject a leave request
- **Authentication:** Bearer JWT required
- **Tags:** Admin Portal

Applies an Approved/Rejected decision to a specified leave request.

**Parameters**

| Parameter | In | Type | Required | Description |
|---|---|---|---|---|
| `leave_id` | path | integer | yes | Leave request id to decide on. |

**Request body**

**Content-Type:** `application/json` · **Required:** yes

`AdminLeaveDecideRequestRequest`

| Field | Type | Required | Description |
|---|---|---|---|
| `decision` | any | yes | Decision to apply to the leave request.  * `Approved` - Approved * `Rejected` - Rejected |

**Responses**

- **200**: `AdminLeaveDecideResponse`
- **400**: `ValidationErrorResponse`
- **401**: `DetailErrorResponse`
- **403**: `DetailErrorResponse`
- **404**: `DetailErrorResponse`
- **500**: `DetailErrorResponse`

---

### POST `/api/admin-portal/leaves/{leave_id}/decide/`

- **Operation ID:** `AdminLeaveDecide_item`
- **Summary:** Approve or reject a leave request
- **Authentication:** Bearer JWT required
- **Tags:** Admin Portal

Applies an Approved/Rejected decision to a specified leave request.

**Parameters**

| Parameter | In | Type | Required | Description |
|---|---|---|---|---|
| `leave_id` | path | integer | yes | Leave request id to decide on. |

**Request body**

**Content-Type:** `application/json` · **Required:** yes

`AdminLeaveDecideRequestRequest`

| Field | Type | Required | Description |
|---|---|---|---|
| `decision` | any | yes | Decision to apply to the leave request.  * `Approved` - Approved * `Rejected` - Rejected |

**Responses**

- **200**: `AdminLeaveDecideResponse`
- **400**: `ValidationErrorResponse`
- **401**: `DetailErrorResponse`
- **403**: `DetailErrorResponse`
- **404**: `DetailErrorResponse`
- **500**: `DetailErrorResponse`

---

### POST `/api/admin-portal/medical-logs/`

- **Operation ID:** `MedicalLogCreate`
- **Summary:** Create a medical log
- **Authentication:** Bearer JWT required
- **Tags:** Admin Portal

Record a medical visit for a student.

**Request body**

**Content-Type:** `application/json` · **Required:** yes

`MedicalLogCreateRequestRequest`

| Field | Type | Required | Description |
|---|---|---|---|
| `doctor_notes` | string | min 1 | no |  |
| `student_id` | integer | yes |  |
| `symptoms` | string | min 1 | no |  |
| `treatment_given` | string | min 1 | no |  |

**Responses**

- **200**: `IdDetailResponse`
- **400**: `ValidationErrorResponse`
- **401**: `DetailErrorResponse`
- **403**: `DetailErrorResponse`
- **404**: `DetailErrorResponse`
- **500**: `DetailErrorResponse`

---

### POST `/api/admin-portal/users/`

- **Operation ID:** `AdminUserCreate`
- **Summary:** Create a portal user
- **Authentication:** Bearer JWT required
- **Tags:** Admin Portal

Creates a user of any role with a temporary password. For Student roles an optional linked parent account can be created, and class enrollment can be added.

**Request body**

**Content-Type:** `application/json` · **Required:** yes

`AdminUserCreateRequestRequest`

| Field | Type | Required | Description |
|---|---|---|---|
| `class_id` | integer | no |  |
| `email` | string (email) | min 1 | no |  |
| `first_name` | string | min 1 | no |  |
| `last_name` | string | min 1 | no |  |
| `parent_email` | string (email) | min 1 | no | Only for creating a Student's parent account. |
| `parent_name` | string | min 1 | no | Only for creating a Student's parent account. |
| `parent_phone` | string | min 1 | no |  |
| `phone_number` | string | min 1 | no |  |
| `role` | any | yes | Role to assign.  * `Student` - Student * `Teacher` - Teacher * `Parent` - Parent * `Admin` - Admin * `Employee` - Employee |
| `roll_number` | integer | no |  |
| `username` | string | min 1 | no |  |

**Responses**

- **201**: `AdminUserCreateResponse`
- **400**: `ValidationErrorResponse`
- **401**: `DetailErrorResponse`
- **403**: `DetailErrorResponse`
- **404**: `DetailErrorResponse`
- **500**: `DetailErrorResponse`

---

### POST `/api/admin-portal/users/{user_id}/`

- **Operation ID:** `AdminUserDetailAction_item`
- **Summary:** Reset a user's password
- **Authentication:** Bearer JWT required
- **Tags:** Admin Portal

Generates a temporary password for the user, updates it, and emails it via the reset-password service.

**Parameters**

| Parameter | In | Type | Required | Description |
|---|---|---|---|---|
| `user_id` | path | integer | yes | Django auth user id. |

**Responses**

- **200**: `AdminUserResetPasswordResponse`
- **400**: `ValidationErrorResponse`
- **401**: `DetailErrorResponse`
- **403**: `DetailErrorResponse`
- **404**: `DetailErrorResponse`
- **500**: `DetailErrorResponse`

---

### POST `/api/admin-portal/users/{user_id}/reset-password/`

- **Operation ID:** `AdminUserResetPassword_item`
- **Summary:** Reset a user's password
- **Authentication:** Bearer JWT required
- **Tags:** Admin Portal

Generates a temporary password for the user, updates it, and emails it via the reset-password service.

**Parameters**

| Parameter | In | Type | Required | Description |
|---|---|---|---|---|
| `user_id` | path | integer | yes | Django auth user id. |

**Responses**

- **200**: `AdminUserResetPasswordResponse`
- **400**: `ValidationErrorResponse`
- **401**: `DetailErrorResponse`
- **403**: `DetailErrorResponse`
- **404**: `DetailErrorResponse`
- **500**: `DetailErrorResponse`

---

### PATCH `/api/admin-portal/users/{user_id}/`

- **Operation ID:** `AdminUserDetail_item`
- **Summary:** Update a user's status or role
- **Authentication:** Bearer JWT required
- **Tags:** Admin Portal

Toggles the account's active status and/or reassigns its role/group.

**Parameters**

| Parameter | In | Type | Required | Description |
|---|---|---|---|---|
| `user_id` | path | integer | yes | Django auth user id. |

**Request body**

**Content-Type:** `application/json` · **Required:** no

`PatchedAdminUserDetailPatchRequestRequest`

| Field | Type | Required | Description |
|---|---|---|---|
| `is_active` | boolean | no | Toggle account active status. |
| `role` | any | no | Reassign the user's role/group.  * `Student` - Student * `Teacher` - Teacher * `Parent` - Parent * `Admin` - Admin * `Employee` - Employee |

**Responses**

- **200**: `DetailErrorResponse`
- **400**: `ValidationErrorResponse`
- **401**: `DetailErrorResponse`
- **403**: `DetailErrorResponse`
- **404**: `DetailErrorResponse`
- **500**: `DetailErrorResponse`

---

### PATCH `/api/admin-portal/users/{user_id}/reset-password/`

- **Operation ID:** `AdminUserDetailViaResetPassword_item`
- **Summary:** Update a user's status or role
- **Authentication:** Bearer JWT required
- **Tags:** Admin Portal

Toggles the account's active status and/or reassigns its role/group.

**Parameters**

| Parameter | In | Type | Required | Description |
|---|---|---|---|---|
| `user_id` | path | integer | yes | Django auth user id. |

**Request body**

**Content-Type:** `application/json` · **Required:** no

`PatchedAdminUserDetailPatchRequestRequest`

| Field | Type | Required | Description |
|---|---|---|---|
| `is_active` | boolean | no | Toggle account active status. |
| `role` | any | no | Reassign the user's role/group.  * `Student` - Student * `Teacher` - Teacher * `Parent` - Parent * `Admin` - Admin * `Employee` - Employee |

**Responses**

- **200**: `DetailErrorResponse`
- **400**: `ValidationErrorResponse`
- **401**: `DetailErrorResponse`
- **403**: `DetailErrorResponse`
- **404**: `DetailErrorResponse`
- **500**: `DetailErrorResponse`

---

## Admissions

### GET `/api/admin-portal/admissions/`

- **Operation ID:** `AdminAdmissionList`
- **Summary:** List admission applications
- **Authentication:** Bearer JWT required
- **Tags:** Admissions

Returns admission applications, optionally filtered by status. Ordered by most recent submission.

**Parameters**

| Parameter | In | Type | Required | Description |
|---|---|---|---|---|
| `status` | query | string | no | Filter by application status (e.g. Registered, Verification, Screening, Fee_Pending, Confirmed, Rejected). |

**Responses**

- **200**: `array<AdminAdmissionListItem>`
- **400**: `ValidationErrorResponse`
- **401**: `DetailErrorResponse`
- **403**: `DetailErrorResponse`
- **404**: `DetailErrorResponse`
- **500**: `DetailErrorResponse`

---

### GET `/api/admin-portal/admissions/enquiries/`

- **Operation ID:** `AdminAdmissionEnquiriesList`
- **Summary:** List admission enquiries
- **Authentication:** Bearer JWT required
- **Tags:** Admissions

Returns admission applications with optional status and search (name/email/reg no) filters.

**Parameters**

| Parameter | In | Type | Required | Description |
|---|---|---|---|---|
| `search` | query | string | no |  |
| `status` | query | string | no |  |

**Responses**

- **200** — No response body
- **400**: `ValidationErrorResponse`
- **401**: `DetailErrorResponse`
- **403**: `DetailErrorResponse`
- **404**: `DetailErrorResponse`
- **500**: `DetailErrorResponse`

---

### GET `/api/admin-portal/admissions/report/`

- **Operation ID:** `AdminAdmissionReportExport`
- **Summary:** Export admissions report (CSV)
- **Authentication:** Bearer JWT required
- **Tags:** Admissions

Downloads all admission applications as a CSV file.

**Responses**

- **200**: `string (binary)`
- **400**: `ValidationErrorResponse`
- **401**: `DetailErrorResponse`
- **403**: `DetailErrorResponse`
- **404**: `DetailErrorResponse`
- **500**: `DetailErrorResponse`

---

### GET `/api/admin-portal/admissions/reports/`

- **Operation ID:** `AdminAdmissionReports`
- **Summary:** Admission reports overview
- **Authentication:** Bearer JWT required
- **Tags:** Admissions

Aggregate admission analytics: totals, status/source/gender/curriculum breakdowns and fee collected.

**Responses**

- **200**: `object`
- **400**: `ValidationErrorResponse`
- **401**: `DetailErrorResponse`
- **403**: `DetailErrorResponse`
- **404**: `DetailErrorResponse`
- **500**: `DetailErrorResponse`

---

### GET `/api/admin-portal/admissions/{registration_number}/application/`

- **Operation ID:** `AdminAdmissionApplicationDetail`
- **Summary:** Admission application detail
- **Authentication:** Bearer JWT required
- **Tags:** Admissions

Full application record with workflow state, documents, fee and allocation.

**Parameters**

| Parameter | In | Type | Required | Description |
|---|---|---|---|---|
| `registration_number` | path | string | yes |  |

**Responses**

- **200**: `object`
- **400**: `ValidationErrorResponse`
- **401**: `DetailErrorResponse`
- **403**: `DetailErrorResponse`
- **404**: `DetailErrorResponse`
- **500**: `DetailErrorResponse`

---

### GET `/api/admin-portal/admissions/{registration_number}/notifications/`

- **Operation ID:** `AdminAdmissionNotifications`
- **Summary:** Admission workflow notifications
- **Authentication:** Bearer JWT required
- **Tags:** Admissions

Lists workflow notifications for an application.

**Parameters**

| Parameter | In | Type | Required | Description |
|---|---|---|---|---|
| `registration_number` | path | string | yes |  |

**Responses**

- **200** — No response body
- **400**: `ValidationErrorResponse`
- **401**: `DetailErrorResponse`
- **403**: `DetailErrorResponse`
- **404**: `DetailErrorResponse`
- **500**: `DetailErrorResponse`

---

### GET `/api/admissions/enquiries/{registration_number}/`

- **Operation ID:** `AdmissionEnquiryStatus`
- **Summary:** Check admission application status
- **Authentication:** Optional bearer JWT (public without it)
- **Tags:** Admissions

Public endpoint for an applicant to check their application status using its registration number.

**Parameters**

| Parameter | In | Type | Required | Description |
|---|---|---|---|---|
| `registration_number` | path | string | yes | Registration number returned when the enquiry was submitted. |

**Responses**

- **200**: `AdmissionStatus`
- **404** — No response body

---

### GET `/api/teacher/admissions-review/`

- **Operation ID:** `TeacherAdmissionsReview`
- **Summary:** Admission enquiries for review
- **Authentication:** Bearer JWT required
- **Tags:** Admissions

Returns admission enquiries in Verification or Screening stage awaiting a teacher interview recommendation.

**Responses**

- **200**: `array<TeacherAdmissionEnquiryItem>`
- **400**: `ValidationErrorResponse`
- **401**: `DetailErrorResponse`
- **403**: `DetailErrorResponse`
- **404**: `DetailErrorResponse`
- **500**: `DetailErrorResponse`

---

### POST `/api/admin-portal/admissions/`

- **Operation ID:** `AdminAdmissionCreate`
- **Summary:** Register a manual admission application
- **Authentication:** Bearer JWT required
- **Tags:** Admissions

Creates a new admission application in the 'Registered' status with an auto-generated registration number.

**Request body**

**Content-Type:** `application/json` · **Required:** yes

`AdminAdmissionCreateRequestRequest`

| Field | Type | Required | Description |
|---|---|---|---|
| `address` | string | min 1 | no |  |
| `applicant_name` | string | min 1 | yes | Full name of the applicant. |
| `date_of_birth` | string (date) | no |  |
| `gender` | any | default 'Male' | no |  |
| `parent_email` | string (email) | min 1 | no |  |
| `parent_name` | string | min 1 | no |  |
| `parent_phone` | string | min 1 | no |  |
| `scholarship_applied` | boolean | default False | no |  |
| `target_class` | string | min 1 | yes |  |

**Responses**

- **201**: `AdminAdmissionCreateResponse`
- **400**: `ValidationErrorResponse`
- **401**: `DetailErrorResponse`
- **403**: `DetailErrorResponse`
- **404**: `DetailErrorResponse`
- **500**: `DetailErrorResponse`

---

### POST `/api/admin-portal/admissions/enquiries/`

- **Operation ID:** `AdminAdmissionEnquiryCreate`
- **Summary:** Register a manual admission enquiry
- **Authentication:** Bearer JWT required
- **Tags:** Admissions

Creates an admission enquiry from the admin 'Register Admission' form (father_* fields are mapped to parent_*).

**Request body**

**Content-Type:** `application/json` · **Required:** no

`object`

**Responses**

- **201**: `object`
- **400**: `ValidationErrorResponse`
- **401**: `DetailErrorResponse`
- **403**: `DetailErrorResponse`
- **404**: `DetailErrorResponse`
- **500**: `DetailErrorResponse`

---

### POST `/api/admin-portal/admissions/{registration_number}/action/`

- **Operation ID:** `AdminAdmissionAction`
- **Summary:** Advance or reject an admission application
- **Authentication:** Bearer JWT required
- **Tags:** Admissions

Moves an application through the verification workflow ('advance') or rejects it ('reject'). Advancing a Fee_Pending application to Confirmed also generates student and parent login credentials.

**Parameters**

| Parameter | In | Type | Required | Description |
|---|---|---|---|---|
| `registration_number` | path | string | yes | Admission registration number. |

**Request body**

**Content-Type:** `application/json` · **Required:** yes

`AdminAdmissionActionRequestRequest`

| Field | Type | Required | Description |
|---|---|---|---|
| `action` | any | yes | 'advance' moves the application forward; 'reject' refuses it.  * `advance` - advance * `reject` - reject |
| `reason` | string | min 1 | no | Rejection reason (required when action='reject'). |

**Responses**

- **200**: `AdminAdmissionActionResponse`
- **400**: `ValidationErrorResponse`
- **401**: `DetailErrorResponse`
- **403**: `DetailErrorResponse`
- **404**: `DetailErrorResponse`
- **500**: `DetailErrorResponse`

---

### POST `/api/admin-portal/admissions/{registration_number}/eligibility/`

- **Operation ID:** `AdminAdmissionEligibilityCheck`
- **Summary:** Run admission eligibility check
- **Authentication:** Bearer JWT required
- **Tags:** Admissions

Evaluates age, academics and documents against the target class and flags duplicates.

**Parameters**

| Parameter | In | Type | Required | Description |
|---|---|---|---|---|
| `registration_number` | path | string | yes |  |

**Responses**

- **200**: `object`
- **400**: `ValidationErrorResponse`
- **401**: `DetailErrorResponse`
- **403**: `DetailErrorResponse`
- **404**: `DetailErrorResponse`
- **500**: `DetailErrorResponse`

---

### POST `/api/admin-portal/admissions/{registration_number}/{panel}/`

- **Operation ID:** `AdminAdmissionPanelAction`
- **Summary:** Admission workflow panel action
- **Authentication:** Bearer JWT required
- **Tags:** Admissions

Executes a workflow action for a panel (counselling, interview, seat, decision, fee, confirm, allocation, modules).

**Parameters**

| Parameter | In | Type | Required | Description |
|---|---|---|---|---|
| `panel` | path | string | yes |  |
| `registration_number` | path | string | yes |  |

**Request body**

**Content-Type:** `application/json` · **Required:** no

`object`

**Responses**

- **200**: `object`
- **400**: `ValidationErrorResponse`
- **401**: `DetailErrorResponse`
- **403**: `DetailErrorResponse`
- **404**: `DetailErrorResponse`
- **500**: `DetailErrorResponse`

---

### POST `/api/admissions/enquiries/`

- **Operation ID:** `AdmissionEnquiryCreate`
- **Summary:** Submit an admission enquiry
- **Authentication:** Optional bearer JWT (public without it)
- **Tags:** Admissions

Public endpoint to submit a new admission application. Returns the generated registration number which can be used to check application status.

**Request body**

**Content-Type:** `application/json` · **Required:** yes

`AdmissionEnquiryRequest`

| Field | Type | Required | Description |
|---|---|---|---|
| `aadhaar_number` | string | max 20 | no |  |
| `address` | string | no |  |
| `allergies` | string | no |  |
| `applicant_name` | string | max 150, min 1 | yes |  |
| `blood_group` | string | max 10 | no |  |
| `board` | string | max 50 | no |  |
| `category` | string | max 50 | no |  |
| `city` | string | max 100 | no |  |
| `communication_address` | string | no |  |
| `country` | string | max 100 | no |  |
| `curriculum` | string | max 50 | no |  |
| `date_of_birth` | string (date) | yes |  |
| `doc_aadhaar_card` | string (binary) | nullable | no |  |
| `doc_address_proof` | string (binary) | nullable | no |  |
| `doc_birth_certificate` | string (binary) | nullable | no |  |
| `doc_parent_id` | string (binary) | nullable | no |  |
| `doc_passport_photo` | string (binary) | nullable | no |  |
| `doc_previous_marks` | string (binary) | nullable | no |  |
| `doc_transfer_certificate` | string (binary) | nullable | no |  |
| `emergency_contact_name` | string | max 150 | no |  |
| `emergency_contact_phone` | string | max 20 | no |  |
| `emergency_contact_relation` | string | max 50 | no |  |
| `father_company` | string | max 150 | no |  |
| `father_email` | string | max 150 | no |  |
| `father_income` | string (decimal) | nullable | no |  |
| `father_name` | string | max 150 | no |  |
| `father_occupation` | string | max 100 | no |  |
| `father_phone` | string | max 20 | no |  |
| `gender` | string | max 20 | no |  |
| `guardian_address` | string | no |  |
| `guardian_name` | string | max 150 | no |  |
| `guardian_phone` | string | max 20 | no |  |
| `guardian_relationship` | string | max 50 | no |  |
| `has_medical_conditions` | boolean | no |  |
| `id_proof_document` | string (binary) | nullable | no |  |
| `medical_details` | string | no |  |
| `mother_company` | string | max 150 | no |  |
| `mother_email` | string | max 150 | no |  |
| `mother_name` | string | max 150 | no |  |
| `mother_occupation` | string | max 100 | no |  |
| `mother_phone` | string | max 20 | no |  |
| `nationality` | string | max 50 | no |  |
| `parent_email` | string (email) | max 254, min 1 | yes |  |
| `parent_name` | string | max 150, min 1 | yes |  |
| `parent_phone` | string | max 20, min 1 | yes |  |
| `percentage` | string | max 20 | no |  |
| `permanent_address` | string | no |  |
| `pincode` | string | max 10 | no |  |
| `preferred_branch` | string | max 100 | no |  |
| `prev_school_grade` | string | max 20 | no |  |
| `prev_school_name` | string | max 200 | no |  |
| `reason_for_leaving` | string | no |  |
| `religion` | string | max 50 | no |  |
| `scholarship_applied` | boolean | no |  |
| `source_of_enquiry` | string | max 100 | no |  |
| `state` | string | max 100 | no |  |
| `target_class` | string | max 50, min 1 | yes | Class applied for, e.g. 'Grade 6' |

**Responses**

- **201**: `AdmissionEnquiry`

---

### POST `/api/teacher/admissions-review/`

- **Operation ID:** `TeacherAdmissionsReviewSubmit`
- **Summary:** Submit interview recommendation
- **Authentication:** Bearer JWT required
- **Tags:** Admissions

Records interview feedback and advances or rejects an admission enquiry based on the teacher's recommendation.

**Request body**

**Content-Type:** `application/json` · **Required:** yes

`TeacherAdmissionReviewRequestRequest`

| Field | Type | Required | Description |
|---|---|---|---|
| `action` | any | yes | Interview recommendation to submit.  * `recommend_advance` - recommend_advance * `recommend_reject` - recommend_reject |
| `registration_number` | string | min 1 | yes |  |
| `remarks` | string | no |  |

**Responses**

- **200**: `TeacherAdmissionReviewResponse`
- **400**: `ValidationErrorResponse`
- **401**: `DetailErrorResponse`
- **403**: `DetailErrorResponse`
- **404**: `DetailErrorResponse`
- **500**: `DetailErrorResponse`

---

## Authentication

### POST `/api/auth/login/`

- **Operation ID:** `AuthLoginStep1`
- **Summary:** Login Step 1 - Request OTP
- **Authentication:** Optional bearer JWT (public without it)
- **Tags:** Authentication

Authenticate with email/username and password. If valid, a 6-digit one-time password (OTP) is sent to the account email and a `user_id` is returned. Use that `user_id` with `auth/verify-otp` to complete sign-in and receive JWT tokens.

**Request body**

**Content-Type:** `application/json` · **Required:** yes

`LoginStep1RequestRequest`

| Field | Type | Required | Description |
|---|---|---|---|
| `email` | string | min 1 | no | Registered email address (alternative to username). |
| `password` | string | min 1 | yes | Account password. |
| `username` | string | min 1 | no | Registered username (alternative to email). |

**Responses**

- **200**: `LoginStep1Response`
- **400**: `ValidationErrorResponse`
- **500**: `DetailErrorResponse`

---

### POST `/api/auth/logout/`

- **Operation ID:** `AuthLogout`
- **Summary:** Logout
- **Authentication:** Bearer JWT required
- **Tags:** Authentication

Invalidates the caller's session from the perspective of the audit trail. The JWT access token simply expires; clients should clear their stored tokens. Requires a valid Bearer token so the user identity is recorded.

**Responses**

- **200**: `DetailErrorResponse`
- **401**: `DetailErrorResponse`

---

### POST `/api/auth/refresh/`

- **Operation ID:** `AuthTokenRefresh`
- **Summary:** Refresh JWT Access Token
- **Authentication:** No auth required (public)
- **Tags:** Authentication

Exchange a valid refresh token for a freshly signed access token.

**Request body**

**Content-Type:** `application/json` · **Required:** yes

`TokenRefreshRequestRequest`

| Field | Type | Required | Description |
|---|---|---|---|
| `refresh` | string | min 1 | yes | JWT refresh token. |

**Responses**

- **200**: `TokenRefreshResponse`
- **401**: `DetailErrorResponse`

---

### POST `/api/auth/resend-otp/`

- **Operation ID:** `AuthResendOtp`
- **Summary:** Resend OTP
- **Authentication:** Optional bearer JWT (public without it)
- **Tags:** Authentication

Re-send a fresh one-time password to the account email for the given `user_id`.

**Request body**

**Content-Type:** `application/json` · **Required:** yes

`ResendOtpRequestRequest`

| Field | Type | Required | Description |
|---|---|---|---|
| `user_id` | integer | yes | User id returned by auth/login to resend OTP for. |

**Responses**

- **200**: `DetailErrorResponse`
- **404**: `DetailErrorResponse`
- **500**: `DetailErrorResponse`

---

### POST `/api/auth/verify-otp/`

- **Operation ID:** `AuthVerifyOtp`
- **Summary:** Verify OTP and Obtain JWT Tokens
- **Authentication:** Optional bearer JWT (public without it)
- **Tags:** Authentication

Verify the one-time password from `auth/login` and return JWT access and refresh tokens plus the logged-in user payload. Send the access token via the **Authorize** button for all protected endpoints.

**Request body**

**Content-Type:** `application/json` · **Required:** yes

`VerifyOtpRequestRequest`

| Field | Type | Required | Description |
|---|---|---|---|
| `otp` | string | min 1 | yes | 6-digit one-time password received by email. |
| `user_id` | integer | yes | User id returned by auth/login. |

**Responses**

- **200**: `VerifyOtpResponse`
- **400**: `ValidationErrorResponse`
- **404**: `DetailErrorResponse`

---

## CMS

### GET `/api/admin-portal/notices/`

- **Operation ID:** `AdminNoticeBroadcast`
- **Summary:** List or broadcast notices
- **Authentication:** Bearer JWT required
- **Tags:** CMS

GET returns the 100 most recent portal notifications; POST broadcasts a new notice to a recipient audience.

**Responses**

- **200**: `array<AdminNoticeItem>`
- **400**: `ValidationErrorResponse`
- **401**: `DetailErrorResponse`
- **403**: `DetailErrorResponse`
- **404**: `DetailErrorResponse`
- **500**: `DetailErrorResponse`

---

### POST `/api/admin-portal/notices/`

- **Operation ID:** `AdminNoticeBroadcastCreate`
- **Summary:** Broadcast a notice
- **Authentication:** Bearer JWT required
- **Tags:** CMS

Sends a notification/notice to all users or a specific class audience.

**Request body**

**Content-Type:** `application/json` · **Required:** yes

`AdminNoticeCreateRequestRequest`

| Field | Type | Required | Description |
|---|---|---|---|
| `message` | string | min 1 | yes |  |
| `recipient_type` | string | min 1, default 'All' | no |  |
| `target_class_id` | integer | no |  |
| `title` | string | min 1 | yes |  |

**Responses**

- **201**: `AdminNoticeCreateResponse`
- **400**: `ValidationErrorResponse`
- **401**: `DetailErrorResponse`
- **403**: `DetailErrorResponse`
- **404**: `DetailErrorResponse`
- **500**: `DetailErrorResponse`

---

## Contact

### GET `/api/admin-portal/contact-messages/`

- **Operation ID:** `admin_portal_contact_messages_list`
- **Summary:** List contact form submissions
- **Authentication:** Bearer JWT required
- **Tags:** Contact

Returns all public contact-page submissions, newest first.

**Responses**

- **200**: `array<AdminContactMessageItem>`
- **400**: `ValidationErrorResponse`
- **401**: `DetailErrorResponse`
- **403**: `DetailErrorResponse`
- **404**: `DetailErrorResponse`
- **500**: `DetailErrorResponse`

---

### GET `/api/admin-portal/contact-messages/{message_id}/`

- **Operation ID:** `admin_portal_contact_messages_list_item`
- **Summary:** List contact form submissions
- **Authentication:** Bearer JWT required
- **Tags:** Contact

Returns all public contact-page submissions, newest first.

**Parameters**

| Parameter | In | Type | Required | Description |
|---|---|---|---|---|
| `message_id` | path | integer | yes |  |

**Responses**

- **200**: `array<AdminContactMessageItem>`
- **400**: `ValidationErrorResponse`
- **401**: `DetailErrorResponse`
- **403**: `DetailErrorResponse`
- **404**: `DetailErrorResponse`
- **500**: `DetailErrorResponse`

---

### PATCH `/api/admin-portal/contact-messages/`

- **Operation ID:** `admin_portal_contact_messages_partial_update`
- **Summary:** Mark a contact submission resolved / unresolved
- **Authentication:** Bearer JWT required
- **Tags:** Contact

Toggles is_resolved on a single contact submission.

**Responses**

- **200**: `DetailErrorResponse`
- **400**: `ValidationErrorResponse`
- **401**: `DetailErrorResponse`
- **403**: `DetailErrorResponse`
- **404**: `DetailErrorResponse`
- **500**: `DetailErrorResponse`

---

### PATCH `/api/admin-portal/contact-messages/{message_id}/`

- **Operation ID:** `admin_portal_contact_messages_partial_update_item`
- **Summary:** Mark a contact submission resolved / unresolved
- **Authentication:** Bearer JWT required
- **Tags:** Contact

Toggles is_resolved on a single contact submission.

**Parameters**

| Parameter | In | Type | Required | Description |
|---|---|---|---|---|
| `message_id` | path | integer | yes |  |

**Responses**

- **200**: `DetailErrorResponse`
- **400**: `ValidationErrorResponse`
- **401**: `DetailErrorResponse`
- **403**: `DetailErrorResponse`
- **404**: `DetailErrorResponse`
- **500**: `DetailErrorResponse`

---

## Examination

### GET `/api/admin-portal/rank-list/`

- **Operation ID:** `ExamRankList`
- **Summary:** List a subject's rank list
- **Authentication:** Bearer JWT required
- **Tags:** Examination

Returns the per-subject rank list for an exam schedule, including each student's marks and rank position.

**Parameters**

| Parameter | In | Type | Required | Description |
|---|---|---|---|---|
| `exam_schedule_id` | query | integer | yes | Exam schedule id to rank / fetch results for. |

**Responses**

- **200**: `array<ExamRankListItem>`
- **400**: `ValidationErrorResponse`

---

### GET `/api/admin-portal/rank-list/overall/`

- **Operation ID:** `ExamOverallRankList`
- **Summary:** List the overall class rank list
- **Authentication:** Bearer JWT required
- **Tags:** Examination

Aggregates ranks across every subject for a class and exam round to produce the overall class ranking.

**Parameters**

| Parameter | In | Type | Required | Description |
|---|---|---|---|---|
| `class_id` | query | integer | no | Class (grade + section) id. |
| `exam_name` | query | string | no | Exam cycle name. One of: Unit_Test_1, Unit_Test_2, Unit_Test_3, Unit_Test_4, Mid_Term, Final_Term, Pre_Board, Board_Exam. |

**Responses**

- **200**: `array<ExamOverallRankItem>`
- **400**: `ValidationErrorResponse`

---

### GET `/api/admin-portal/report-card/`

- **Operation ID:** `ExamAdminReportCard`
- **Summary:** Generate an admin report card
- **Authentication:** Bearer JWT required
- **Tags:** Examination

Generates a report card for any student for a given exam round (admin-facing).

**Parameters**

| Parameter | In | Type | Required | Description |
|---|---|---|---|---|
| `exam_name` | query | string | no | Exam cycle name. One of: Unit_Test_1, Unit_Test_2, Unit_Test_3, Unit_Test_4, Mid_Term, Final_Term, Pre_Board, Board_Exam. |
| `student_id` | query | integer | no | Student (auth user) id. |

**Responses**

- **200**: `ExamReportCard`
- **400**: `ValidationErrorResponse`
- **404**: `DetailErrorResponse`

---

### GET `/api/student/report-card/`

- **Operation ID:** `ExamStudentReportCard`
- **Summary:** Get the student's own report card
- **Authentication:** Bearer JWT required
- **Tags:** Examination

Returns the authenticated student's own report card for a given exam round.

**Parameters**

| Parameter | In | Type | Required | Description |
|---|---|---|---|---|
| `exam_name` | query | string | no | Exam cycle name. One of: Unit_Test_1, Unit_Test_2, Unit_Test_3, Unit_Test_4, Mid_Term, Final_Term, Pre_Board, Board_Exam. |

**Responses**

- **200**: `ExamReportCard`
- **400**: `ValidationErrorResponse`

---

### GET `/api/teacher/exams/`

- **Operation ID:** `TeacherExamList`
- **Summary:** List exams
- **Authentication:** Bearer JWT required
- **Tags:** Examination

Returns the exam schedule entries for the teacher, newest first.

**Responses**

- **200**: `array<TeacherExamScheduleItem>`
- **400**: `ValidationErrorResponse`
- **401**: `DetailErrorResponse`
- **403**: `DetailErrorResponse`
- **404**: `DetailErrorResponse`
- **500**: `DetailErrorResponse`

---

### GET `/api/teacher/marks-entry/`

- **Operation ID:** `TeacherMarksEntry`
- **Summary:** Marks entry sheet
- **Authentication:** Bearer JWT required
- **Tags:** Examination

Returns the student roster with existing marks for an exam schedule, ready for grading.

**Parameters**

| Parameter | In | Type | Required | Description |
|---|---|---|---|---|
| `exam_schedule_id` | query | integer | yes |  |

**Responses**

- **200**: `TeacherMarksEntryResponse`
- **400**: `ValidationErrorResponse`
- **401**: `DetailErrorResponse`
- **403**: `DetailErrorResponse`
- **404**: `DetailErrorResponse`
- **500**: `DetailErrorResponse`

---

### GET `/api/teacher/performance/`

- **Operation ID:** `TeacherPerformanceAnalytics`
- **Summary:** Performance analytics
- **Authentication:** Bearer JWT required
- **Tags:** Examination

Returns per-student average marks, exams taken and attendance percentage for a class, plus the class average.

**Parameters**

| Parameter | In | Type | Required | Description |
|---|---|---|---|---|
| `class_id` | query | integer | yes |  |
| `subject_id` | query | integer | no |  |

**Responses**

- **200**: `TeacherPerformanceResponse`
- **400**: `ValidationErrorResponse`
- **401**: `DetailErrorResponse`
- **403**: `DetailErrorResponse`
- **404**: `DetailErrorResponse`
- **500**: `DetailErrorResponse`

---

### GET `/api/teacher/question-bank/`

- **Operation ID:** `TeacherQuestionBankList`
- **Summary:** List question bank
- **Authentication:** Bearer JWT required
- **Tags:** Examination

Returns every question the teacher authored, or a single question via the detail route.

**Responses**

- **200**: `array<TeacherQuestionBankItem>`
- **400**: `ValidationErrorResponse`
- **401**: `DetailErrorResponse`
- **403**: `DetailErrorResponse`
- **404**: `DetailErrorResponse`
- **500**: `DetailErrorResponse`

---

### GET `/api/teacher/question-bank/{question_id}/`

- **Operation ID:** `TeacherQuestionBankDetail_item`
- **Summary:** List question bank
- **Authentication:** Bearer JWT required
- **Tags:** Examination

Returns every question the teacher authored, or a single question via the detail route.

**Parameters**

| Parameter | In | Type | Required | Description |
|---|---|---|---|---|
| `question_id` | path | integer | yes |  |

**Responses**

- **200**: `array<TeacherQuestionBankItem>`
- **400**: `ValidationErrorResponse`
- **401**: `DetailErrorResponse`
- **403**: `DetailErrorResponse`
- **404**: `DetailErrorResponse`
- **500**: `DetailErrorResponse`

---

### POST `/api/admin-portal/rank-list/`

- **Operation ID:** `ExamRankListGenerate`
- **Summary:** Generate and persist a subject rank list
- **Authentication:** Bearer JWT required
- **Tags:** Examination

Computes and saves per-subject ranks for an exam schedule (standard competition ranking).

**Request body**

**Content-Type:** `application/json` · **Required:** yes

`ExamRankGenerateRequestRequest`

| Field | Type | Required | Description |
|---|---|---|---|
| `exam_schedule_id` | integer | yes |  |

**Responses**

- **200**: `DetailErrorResponse`
- **400**: `ValidationErrorResponse`
- **404**: `DetailErrorResponse`

---

### POST `/api/teacher/exams/`

- **Operation ID:** `TeacherExamCreate`
- **Summary:** Schedule exam
- **Authentication:** Bearer JWT required
- **Tags:** Examination

Schedules an exam for a class and subject. exam_name must be one of the configured exam cycle names.

**Request body**

**Content-Type:** `application/json` · **Required:** yes

`TeacherExamCreateRequestRequest`

| Field | Type | Required | Description |
|---|---|---|---|
| `class_id` | integer | yes |  |
| `duration_minutes` | integer | default 60 | no |  |
| `exam_date` | string (date) | no |  |
| `exam_name` | string | min 1 | yes | Must be from the allowed exam cycle names. |
| `exam_type` | any | default 'Unit_Test' | no |  |
| `max_marks` | number | default 100.0 | no |  |
| `start_time` | string (time) | default '09:00' | no |  |
| `subject_id` | integer | yes |  |

**Responses**

- **200**: `IdDetailResponse`
- **400**: `ValidationErrorResponse`
- **401**: `DetailErrorResponse`
- **403**: `DetailErrorResponse`
- **404**: `DetailErrorResponse`
- **500**: `DetailErrorResponse`

---

### POST `/api/teacher/marks-entry/`

- **Operation ID:** `TeacherMarksEntrySubmit`
- **Summary:** Submit marks
- **Authentication:** Bearer JWT required
- **Tags:** Examination

Upserts marks (and grades) for all students of an exam schedule, then publishes or saves as draft.

**Request body**

**Content-Type:** `application/json` · **Required:** yes

`TeacherMarksEntrySubmitRequestRequest`

| Field | Type | Required | Description |
|---|---|---|---|
| `entries` | array<TeacherMarksEntryRowRequest> | no | Marks rows (modern key). |
| `exam_schedule_id` | integer | yes |  |
| `rows` | array<TeacherMarksEntryRowRequest> | no | Marks rows (legacy key). |
| `submit` | boolean | default True | no |  |

**Responses**

- **200**: `SuccessDetailResponse`
- **400**: `ValidationErrorResponse`
- **401**: `DetailErrorResponse`
- **403**: `DetailErrorResponse`
- **404**: `DetailErrorResponse`
- **500**: `DetailErrorResponse`

---

### POST `/api/teacher/question-bank/`

- **Operation ID:** `TeacherQuestionBankCreate`
- **Summary:** Add a question
- **Authentication:** Bearer JWT required
- **Tags:** Examination

Inserts a new question into the question bank.

**Request body**

**Content-Type:** `application/json` · **Required:** yes

`TeacherQuestionCreateRequestRequest`

| Field | Type | Required | Description |
|---|---|---|---|
| `answer_schema` | any | default {} | no |  |
| `difficulty_level` | string | min 1, default 'Medium' | no |  |
| `question_text` | string | min 1 | yes |  |
| `subject_id` | integer | yes |  |

**Responses**

- **200**: `IdDetailResponse`
- **400**: `ValidationErrorResponse`
- **401**: `DetailErrorResponse`
- **403**: `DetailErrorResponse`
- **404**: `DetailErrorResponse`
- **500**: `DetailErrorResponse`

---

### POST `/api/teacher/question-bank/{question_id}/`

- **Operation ID:** `TeacherQuestionBankDetailCreate_item`
- **Summary:** Add a question
- **Authentication:** Bearer JWT required
- **Tags:** Examination

Inserts a new question into the question bank.

**Parameters**

| Parameter | In | Type | Required | Description |
|---|---|---|---|---|
| `question_id` | path | integer | yes |  |

**Request body**

**Content-Type:** `application/json` · **Required:** yes

`TeacherQuestionCreateRequestRequest`

| Field | Type | Required | Description |
|---|---|---|---|
| `answer_schema` | any | default {} | no |  |
| `difficulty_level` | string | min 1, default 'Medium' | no |  |
| `question_text` | string | min 1 | yes |  |
| `subject_id` | integer | yes |  |

**Responses**

- **200**: `IdDetailResponse`
- **400**: `ValidationErrorResponse`
- **401**: `DetailErrorResponse`
- **403**: `DetailErrorResponse`
- **404**: `DetailErrorResponse`
- **500**: `DetailErrorResponse`

---

### DELETE `/api/teacher/question-bank/`

- **Operation ID:** `TeacherQuestionBankRemoveAll`
- **Summary:** Remove a question
- **Authentication:** Bearer JWT required
- **Tags:** Examination

Deletes a question the teacher authored by id.

**Responses**

- **200**: `SuccessDetailResponse`
- **400**: `ValidationErrorResponse`
- **401**: `DetailErrorResponse`
- **403**: `DetailErrorResponse`
- **404**: `DetailErrorResponse`
- **500**: `DetailErrorResponse`

---

### DELETE `/api/teacher/question-bank/{question_id}/`

- **Operation ID:** `TeacherQuestionBankDelete_item`
- **Summary:** Remove a question
- **Authentication:** Bearer JWT required
- **Tags:** Examination

Deletes a question the teacher authored by id.

**Parameters**

| Parameter | In | Type | Required | Description |
|---|---|---|---|---|
| `question_id` | path | integer | yes |  |

**Responses**

- **200**: `SuccessDetailResponse`
- **400**: `ValidationErrorResponse`
- **401**: `DetailErrorResponse`
- **403**: `DetailErrorResponse`
- **404**: `DetailErrorResponse`
- **500**: `DetailErrorResponse`

---

## Finance

### GET `/api/admin-portal/fee-structures/`

- **Operation ID:** `AdminFeeStructure`
- **Summary:** List fee structures
- **Authentication:** Bearer JWT required
- **Tags:** Finance

Returns all fee structure records (per class and term) from the portal.

**Responses**

- **200**: `array<AdminFeeStructureItem>`
- **400**: `ValidationErrorResponse`
- **401**: `DetailErrorResponse`
- **403**: `DetailErrorResponse`
- **404**: `DetailErrorResponse`
- **500**: `DetailErrorResponse`

---

### GET `/api/admin-portal/payments/`

- **Operation ID:** `AdminPaymentList`
- **Summary:** List payments
- **Authentication:** Bearer JWT required
- **Tags:** Finance

Returns up to the 200 most recent successful payment records joined with student and fee-term info.

**Responses**

- **200**: `array<AdminPaymentItem>`
- **400**: `ValidationErrorResponse`
- **401**: `DetailErrorResponse`
- **403**: `DetailErrorResponse`
- **404**: `DetailErrorResponse`
- **500**: `DetailErrorResponse`

---

### GET `/api/parent/fees/`

- **Operation ID:** `ParentChildFees`
- **Summary:** Get child fees
- **Authentication:** Bearer JWT required
- **Tags:** Finance

Returns pending fee structures and the payment history for one of the parent's children.

**Parameters**

| Parameter | In | Type | Required | Description |
|---|---|---|---|---|
| `child_id` | query | integer | no | Student (auth user) id of one of the parent's children. |

**Responses**

- **200**: `ParentChildFeesResponse`
- **400**: `ValidationErrorResponse`
- **401**: `DetailErrorResponse`
- **403**: `DetailErrorResponse`
- **404**: `DetailErrorResponse`
- **500**: `DetailErrorResponse`

---

### POST `/api/admin-portal/fee-structures/`

- **Operation ID:** `AdminFeeStructureCreate`
- **Summary:** Create a fee structure
- **Authentication:** Bearer JWT required
- **Tags:** Finance

Creates a fee structure for a class and term.

**Request body**

**Content-Type:** `application/json` · **Required:** yes

`AdminFeeStructureCreateRequestRequest`

| Field | Type | Required | Description |
|---|---|---|---|
| `class_id` | integer | yes |  |
| `hostel_fee` | number | no |  |
| `term_name` | string | min 1 | yes |  |
| `total_amount` | number | no |  |
| `transport_fee` | number | no |  |
| `tuition_fee` | number | no |  |

**Responses**

- **200**: `IdDetailResponse`
- **400**: `ValidationErrorResponse`
- **401**: `DetailErrorResponse`
- **403**: `DetailErrorResponse`
- **404**: `DetailErrorResponse`
- **500**: `DetailErrorResponse`

---

### POST `/api/parent/fees/pay/`

- **Operation ID:** `ParentChildFeesPay`
- **Summary:** Pay a child's fee
- **Authentication:** Bearer JWT required
- **Tags:** Finance

Records a successful payment against a fee structure for one of the parent's children and returns the generated transaction id.

**Request body**

**Content-Type:** `application/json` · **Required:** yes

`ParentChildFeesPayRequestRequest`

| Field | Type | Required | Description |
|---|---|---|---|
| `child_id` | integer | yes | Child to debit the payment to. |
| `fee_structure_id` | integer | yes | Fee structure being paid. |
| `payment_method` | string | min 1, default 'Online' | no |  |

**Responses**

- **200**: `ParentChildFeesPayResponse`
- **400**: `ValidationErrorResponse`
- **401**: `DetailErrorResponse`
- **403**: `DetailErrorResponse`
- **404**: `DetailErrorResponse`
- **500**: `DetailErrorResponse`

---

## Hostel

### GET `/api/admin-portal/hostel-allocations/`

- **Operation ID:** `HostelAllocationList`
- **Summary:** List current hostel allocations
- **Authentication:** Bearer JWT required
- **Tags:** Hostel

Return all active (non-vacated) hostel allocations.

**Responses**

- **200**: `array<HostelAllocationItem>`
- **400**: `ValidationErrorResponse`
- **401**: `DetailErrorResponse`
- **403**: `DetailErrorResponse`
- **404**: `DetailErrorResponse`
- **500**: `DetailErrorResponse`

---

### GET `/api/admin-portal/hostels/`

- **Operation ID:** `HostelList`
- **Summary:** List hostels
- **Authentication:** Bearer JWT required
- **Tags:** Hostel

Return all hostels.

**Responses**

- **200**: `array<HostelItem>`
- **400**: `ValidationErrorResponse`
- **401**: `DetailErrorResponse`
- **403**: `DetailErrorResponse`
- **404**: `DetailErrorResponse`
- **500**: `DetailErrorResponse`

---

### GET `/api/admin-portal/rooms/`

- **Operation ID:** `RoomList`
- **Summary:** List rooms
- **Authentication:** Bearer JWT required
- **Tags:** Hostel

Return rooms, optionally filtered to one hostel.

**Parameters**

| Parameter | In | Type | Required | Description |
|---|---|---|---|---|
| `hostel_id` | query | integer | no | Filter rooms belonging to this hostel. |

**Responses**

- **200**: `array<RoomItem>`
- **400**: `ValidationErrorResponse`
- **401**: `DetailErrorResponse`
- **403**: `DetailErrorResponse`
- **404**: `DetailErrorResponse`
- **500**: `DetailErrorResponse`

---

### GET `/api/parent/hostel/`

- **Operation ID:** `ChildHostelView`
- **Summary:** Parent's view of a child's hostel room
- **Authentication:** Bearer JWT required
- **Tags:** Hostel

Return a parent's child's current hostel room, if any.

**Parameters**

| Parameter | In | Type | Required | Description |
|---|---|---|---|---|
| `child_id` | query | integer | yes | The parent's child (student) to look up. |

**Responses**

- **200**: `StudentHostelItem`
- **400**: `ValidationErrorResponse`
- **401**: `DetailErrorResponse`
- **403**: `DetailErrorResponse`
- **404**: `DetailErrorResponse`
- **500**: `DetailErrorResponse`

---

### GET `/api/student/hostel/`

- **Operation ID:** `StudentHostelView`
- **Summary:** Student's current hostel room
- **Authentication:** Bearer JWT required
- **Tags:** Hostel

Return the current student's hostel room allocation, if any.

**Responses**

- **200**: `StudentHostelItem`
- **400**: `ValidationErrorResponse`
- **401**: `DetailErrorResponse`
- **403**: `DetailErrorResponse`
- **404**: `DetailErrorResponse`
- **500**: `DetailErrorResponse`

---

### POST `/api/admin-portal/hostel-allocations/`

- **Operation ID:** `HostelAllocationCreate`
- **Summary:** Allocate a student to a room
- **Authentication:** Bearer JWT required
- **Tags:** Hostel

Allocate a student to a room. Rejects if the room is already full.

**Request body**

**Content-Type:** `application/json` · **Required:** yes

`HostelAllocationCreateRequestRequest`

| Field | Type | Required | Description |
|---|---|---|---|
| `room_id` | integer | yes |  |
| `student_id` | integer | yes |  |

**Responses**

- **200**: `IdDetailResponse`
- **400**: `ValidationErrorResponse`
- **401**: `DetailErrorResponse`
- **403**: `DetailErrorResponse`
- **404**: `DetailErrorResponse`
- **500**: `DetailErrorResponse`

---

### POST `/api/admin-portal/hostel-allocations/{allocation_id}/vacate/`

- **Operation ID:** `HostelVacate`
- **Summary:** Vacate a hostel allocation
- **Authentication:** Bearer JWT required
- **Tags:** Hostel

Mark a hostel allocation as vacated today and free the room's occupied bed.

**Parameters**

| Parameter | In | Type | Required | Description |
|---|---|---|---|---|
| `allocation_id` | path | integer | yes | Hostel allocation id to vacate. |

**Responses**

- **200**: `DetailErrorResponse`
- **400**: `ValidationErrorResponse`
- **401**: `DetailErrorResponse`
- **403**: `DetailErrorResponse`
- **404**: `DetailErrorResponse`
- **500**: `DetailErrorResponse`

---

### POST `/api/admin-portal/hostels/`

- **Operation ID:** `HostelCreate`
- **Summary:** Create a hostel
- **Authentication:** Bearer JWT required
- **Tags:** Hostel

Create a new hostel.

**Request body**

**Content-Type:** `application/json` · **Required:** yes

`HostelCreateRequestRequest`

| Field | Type | Required | Description |
|---|---|---|---|
| `name` | string | min 1 | yes |  |
| `type` | string | min 1 | no |  |
| `warden_id` | integer | no |  |

**Responses**

- **200**: `IdDetailResponse`
- **400**: `ValidationErrorResponse`
- **401**: `DetailErrorResponse`
- **403**: `DetailErrorResponse`
- **404**: `DetailErrorResponse`
- **500**: `DetailErrorResponse`

---

### POST `/api/admin-portal/rooms/`

- **Operation ID:** `RoomCreate`
- **Summary:** Add a room
- **Authentication:** Bearer JWT required
- **Tags:** Hostel

Create a new room in a hostel.

**Request body**

**Content-Type:** `application/json` · **Required:** yes

`RoomCreateRequestRequest`

| Field | Type | Required | Description |
|---|---|---|---|
| `capacity` | integer | no |  |
| `hostel_id` | integer | yes |  |
| `room_number` | string | min 1 | yes |  |

**Responses**

- **200**: `IdDetailResponse`
- **400**: `ValidationErrorResponse`
- **401**: `DetailErrorResponse`
- **403**: `DetailErrorResponse`
- **404**: `DetailErrorResponse`
- **500**: `DetailErrorResponse`

---

## LMS

### GET `/api/admin-portal/lms/analytics/`

- **Operation ID:** `AdminLmsAnalytics`
- **Summary:** LMS usage analytics
- **Authentication:** Bearer JWT required
- **Tags:** LMS

Returns recent course-content uploads and aggregate LMS statistics (courses, chapters, lessons, resources and estimated storage).

**Responses**

- **200**: `AdminLmsAnalyticsResponse`
- **400**: `ValidationErrorResponse`
- **401**: `DetailErrorResponse`
- **403**: `DetailErrorResponse`
- **404**: `DetailErrorResponse`
- **500**: `DetailErrorResponse`

---

### GET `/api/lms/analytics/`

- **Operation ID:** `LmsCourseAnalytics`
- **Summary:** Get course completion analytics
- **Authentication:** Bearer JWT required
- **Tags:** LMS

Returns each enrolled student's completion percentage for a course (Admin/Teacher only).

**Parameters**

| Parameter | In | Type | Required | Description |
|---|---|---|---|---|
| `course_id` | query | integer | yes | LMS course id. |
| `student_id` | query | integer | no | Student (auth user) id. |

**Responses**

- **200**: `array<LmsCourseAnalyticsItem>`
- **400**: `ValidationErrorResponse`
- **401**: `DetailErrorResponse`
- **403**: `DetailErrorResponse`
- **404**: `DetailErrorResponse`
- **500**: `DetailErrorResponse`

---

### GET `/api/lms/forum-topics/`

- **Operation ID:** `LmsForumTopicList`
- **Summary:** List forum topics for a course
- **Authentication:** Bearer JWT required
- **Tags:** LMS

Returns the forum topics for the given course, each with its reply count.

**Parameters**

| Parameter | In | Type | Required | Description |
|---|---|---|---|---|
| `course_id` | query | integer | yes | LMS course id. |

**Responses**

- **200**: `array<LmsForumTopicItem>`
- **400**: `ValidationErrorResponse`
- **401**: `DetailErrorResponse`
- **403**: `DetailErrorResponse`
- **404**: `DetailErrorResponse`
- **500**: `DetailErrorResponse`

---

### GET `/api/lms/forum-topics/{topic_id}/`

- **Operation ID:** `LmsForumTopicDetail`
- **Summary:** Get a forum topic with its replies
- **Authentication:** Bearer JWT required
- **Tags:** LMS

Returns a single forum topic along with all of its replies.

**Parameters**

| Parameter | In | Type | Required | Description |
|---|---|---|---|---|
| `topic_id` | path | integer | yes | Forum topic id. |

**Responses**

- **200**: `LmsForumTopicDetail`
- **400**: `ValidationErrorResponse`
- **401**: `DetailErrorResponse`
- **403**: `DetailErrorResponse`
- **404**: `DetailErrorResponse`
- **500**: `DetailErrorResponse`

---

### GET `/api/lms/notes/`

- **Operation ID:** `LmsDigitalNoteList`
- **Summary:** List digital notes for a course
- **Authentication:** Bearer JWT required
- **Tags:** LMS

Returns the shared digital notes for the given course (e.g. teacher-shared study material).

**Parameters**

| Parameter | In | Type | Required | Description |
|---|---|---|---|---|
| `course_id` | query | integer | yes | LMS course id. |

**Responses**

- **200**: `array<LmsDigitalNoteItem>`
- **400**: `ValidationErrorResponse`
- **401**: `DetailErrorResponse`
- **403**: `DetailErrorResponse`
- **404**: `DetailErrorResponse`
- **500**: `DetailErrorResponse`

---

### GET `/api/teacher/lms/chapters/`

- **Operation ID:** `TeacherLmsChapters`
- **Summary:** List chapters
- **Authentication:** Bearer JWT required
- **Tags:** LMS

Returns the chapters of an LMS course.

**Parameters**

| Parameter | In | Type | Required | Description |
|---|---|---|---|---|
| `course_id` | query | integer | yes |  |

**Responses**

- **200**: `array<TeacherLmsChapterItem>`
- **400**: `ValidationErrorResponse`
- **401**: `DetailErrorResponse`
- **403**: `DetailErrorResponse`
- **404**: `DetailErrorResponse`
- **500**: `DetailErrorResponse`

---

### GET `/api/teacher/lms/courses/`

- **Operation ID:** `TeacherLmsCourses`
- **Summary:** LMS courses
- **Authentication:** Bearer JWT required
- **Tags:** LMS

Returns the courses for the teacher's allocated subjects, creating them on demand if missing.

**Responses**

- **200**: `array<TeacherLmsCourseItem>`
- **400**: `ValidationErrorResponse`
- **401**: `DetailErrorResponse`
- **403**: `DetailErrorResponse`
- **404**: `DetailErrorResponse`
- **500**: `DetailErrorResponse`

---

### GET `/api/teacher/lms/lessons/`

- **Operation ID:** `TeacherLmsLessons`
- **Summary:** List lessons
- **Authentication:** Bearer JWT required
- **Tags:** LMS

Returns the lessons of a chapter.

**Parameters**

| Parameter | In | Type | Required | Description |
|---|---|---|---|---|
| `chapter_id` | query | integer | yes |  |

**Responses**

- **200**: `array<TeacherLmsLessonItem>`
- **400**: `ValidationErrorResponse`
- **401**: `DetailErrorResponse`
- **403**: `DetailErrorResponse`
- **404**: `DetailErrorResponse`
- **500**: `DetailErrorResponse`

---

### GET `/api/teacher/lms/resources/`

- **Operation ID:** `TeacherLmsResources`
- **Summary:** List lesson resources
- **Authentication:** Bearer JWT required
- **Tags:** LMS

Returns the course content resources attached to a lesson.

**Parameters**

| Parameter | In | Type | Required | Description |
|---|---|---|---|---|
| `lesson_id` | query | integer | yes |  |

**Responses**

- **200**: `array<TeacherLmsResourceItem>`
- **400**: `ValidationErrorResponse`
- **401**: `DetailErrorResponse`
- **403**: `DetailErrorResponse`
- **404**: `DetailErrorResponse`
- **500**: `DetailErrorResponse`

---

### POST `/api/lms/forum-topics/`

- **Operation ID:** `LmsForumTopicCreate`
- **Summary:** Create a forum topic
- **Authentication:** Bearer JWT required
- **Tags:** LMS

Posts a new discussion topic to the given course.

**Request body**

**Content-Type:** `application/json` · **Required:** yes

`ForumTopicCreateRequestRequest`

| Field | Type | Required | Description |
|---|---|---|---|
| `content` | string | min 1 | yes | Topic body (markdown supported). |
| `course_id` | integer | yes | Course the topic belongs to. |
| `title` | string | min 1 | yes | Topic title. |

**Responses**

- **200**: `IdDetailResponse`
- **400**: `ValidationErrorResponse`
- **401**: `DetailErrorResponse`
- **403**: `DetailErrorResponse`
- **404**: `DetailErrorResponse`
- **500**: `DetailErrorResponse`

---

### POST `/api/lms/forum-topics/{topic_id}/reply/`

- **Operation ID:** `LmsForumPostCreate`
- **Summary:** Reply to a forum topic
- **Authentication:** Bearer JWT required
- **Tags:** LMS

Posts a reply to the given forum topic.

**Parameters**

| Parameter | In | Type | Required | Description |
|---|---|---|---|---|
| `topic_id` | path | integer | yes | Forum topic id to reply to. |

**Request body**

**Content-Type:** `application/json` · **Required:** yes

`ForumPostCreateRequestRequest`

| Field | Type | Required | Description |
|---|---|---|---|
| `post_text` | string | min 1 | yes | Reply body. |

**Responses**

- **200**: `IdDetailResponse`
- **400**: `ValidationErrorResponse`
- **401**: `DetailErrorResponse`
- **403**: `DetailErrorResponse`
- **404**: `DetailErrorResponse`
- **500**: `DetailErrorResponse`

---

### POST `/api/lms/mark-complete/`

- **Operation ID:** `LmsMarkContentComplete`
- **Summary:** Mark course content as complete
- **Authentication:** Bearer JWT required
- **Tags:** LMS

Marks a piece of course content as done for the authenticated student, feeding learning analytics.

**Request body**

**Content-Type:** `application/json` · **Required:** yes

`MarkCompleteRequestRequest`

| Field | Type | Required | Description |
|---|---|---|---|
| `content_id` | integer | yes | Course content id to mark complete. |

**Responses**

- **200**: `DetailErrorResponse`
- **400**: `ValidationErrorResponse`
- **401**: `DetailErrorResponse`
- **403**: `DetailErrorResponse`
- **404**: `DetailErrorResponse`
- **500**: `DetailErrorResponse`

---

### POST `/api/lms/notes/`

- **Operation ID:** `LmsDigitalNoteCreate`
- **Summary:** Create a digital note
- **Authentication:** Bearer JWT required
- **Tags:** LMS

Adds a new digital note to the given course.

**Request body**

**Content-Type:** `application/json` · **Required:** yes

`DigitalNoteCreateRequestRequest`

| Field | Type | Required | Description |
|---|---|---|---|
| `body_markdown` | string | min 1 | yes | Note body in markdown. |
| `course_id` | integer | yes |  |
| `title` | string | min 1 | yes | Note title. |

**Responses**

- **200**: `IdDetailResponse`
- **400**: `ValidationErrorResponse`
- **401**: `DetailErrorResponse`
- **403**: `DetailErrorResponse`
- **404**: `DetailErrorResponse`
- **500**: `DetailErrorResponse`

---

### POST `/api/teacher/lms/chapters/`

- **Operation ID:** `TeacherLmsChaptersCreate`
- **Summary:** Create chapter
- **Authentication:** Bearer JWT required
- **Tags:** LMS

Creates a chapter in a course (optionally resolving or creating the course from class + subject).

**Request body**

**Content-Type:** `application/json` · **Required:** yes

`TeacherLmsChapterCreateRequestRequest`

| Field | Type | Required | Description |
|---|---|---|---|
| `class_id` | integer | nullable | no |  |
| `course_id` | integer | nullable | no |  |
| `description` | string | min 1 | no |  |
| `pdf_url` | string (uri) | min 1, nullable | no |  |
| `sort_order` | integer | default 0 | no |  |
| `subject_id` | integer | nullable | no |  |
| `title` | string | min 1 | yes |  |

**Responses**

- **200**: `IdDetailResponse`
- **400**: `ValidationErrorResponse`
- **401**: `DetailErrorResponse`
- **403**: `DetailErrorResponse`
- **404**: `DetailErrorResponse`
- **500**: `DetailErrorResponse`

---

### POST `/api/teacher/lms/lessons/`

- **Operation ID:** `TeacherLmsLessonsCreate`
- **Summary:** Create lesson
- **Authentication:** Bearer JWT required
- **Tags:** LMS

Creates a lesson inside a chapter.

**Request body**

**Content-Type:** `application/json` · **Required:** yes

`TeacherLmsLessonCreateRequestRequest`

| Field | Type | Required | Description |
|---|---|---|---|
| `chapter_id` | integer | yes |  |
| `description` | string | min 1 | no |  |
| `sort_order` | integer | default 0 | no |  |
| `title` | string | min 1 | yes |  |

**Responses**

- **200**: `IdDetailResponse`
- **400**: `ValidationErrorResponse`
- **401**: `DetailErrorResponse`
- **403**: `DetailErrorResponse`
- **404**: `DetailErrorResponse`
- **500**: `DetailErrorResponse`

---

### POST `/api/teacher/lms/resources/`

- **Operation ID:** `TeacherLmsResourcesCreate`
- **Summary:** Upload lesson resource
- **Authentication:** Bearer JWT required
- **Tags:** LMS

Uploads a resource (PDF, Quiz, Assignment, Video or Link) to a lesson, creating linked quiz/assignment records as needed.

**Request body**

**Content-Type:** `application/json` · **Required:** yes

`TeacherLmsResourceCreateRequestRequest`

| Field | Type | Required | Description |
|---|---|---|---|
| `content_type` | any | default 'PDF' | no |  |
| `course_id` | integer | yes |  |
| `description` | string | min 1 | no |  |
| `due_date` | string | min 1, nullable | no |  |
| `lesson_id` | integer | yes |  |
| `max_marks` | number | nullable | no |  |
| `questions` | array<TeacherQuizQuestionItemRequest> | no |  |
| `resource_url` | any | no |  |
| `title` | string | min 1 | yes |  |
| `visible_from` | string | min 1 | no |  |

**Responses**

- **200**: `IdDetailResponse`
- **400**: `ValidationErrorResponse`
- **401**: `DetailErrorResponse`
- **403**: `DetailErrorResponse`
- **404**: `DetailErrorResponse`
- **500**: `DetailErrorResponse`

---

### PUT `/api/teacher/lms/chapters/`

- **Operation ID:** `TeacherLmsChaptersUpdate`
- **Summary:** Update chapter
- **Authentication:** Bearer JWT required
- **Tags:** LMS

Updates a chapter's title, description and optional PDF link.

**Request body**

**Content-Type:** `application/json` · **Required:** yes

`TeacherLmsChapterUpdateRequestRequest`

| Field | Type | Required | Description |
|---|---|---|---|
| `description` | string | min 1 | no |  |
| `id` | integer | yes |  |
| `pdf_url` | any | no |  |
| `title` | string | min 1 | no |  |

**Responses**

- **200**: `SuccessDetailResponse`
- **400**: `ValidationErrorResponse`
- **401**: `DetailErrorResponse`
- **403**: `DetailErrorResponse`
- **404**: `DetailErrorResponse`
- **500**: `DetailErrorResponse`

---

### PUT `/api/teacher/lms/lessons/`

- **Operation ID:** `TeacherLmsLessonsUpdate`
- **Summary:** Update lesson
- **Authentication:** Bearer JWT required
- **Tags:** LMS

Updates a lesson's title and description.

**Request body**

**Content-Type:** `application/json` · **Required:** yes

`TeacherLmsLessonUpdateRequestRequest`

| Field | Type | Required | Description |
|---|---|---|---|
| `description` | string | min 1 | no |  |
| `id` | integer | yes |  |
| `title` | string | min 1 | no |  |

**Responses**

- **200**: `SuccessDetailResponse`
- **400**: `ValidationErrorResponse`
- **401**: `DetailErrorResponse`
- **403**: `DetailErrorResponse`
- **404**: `DetailErrorResponse`
- **500**: `DetailErrorResponse`

---

### PUT `/api/teacher/lms/resources/`

- **Operation ID:** `TeacherLmsResourcesUpdate`
- **Summary:** Update lesson resource
- **Authentication:** Bearer JWT required
- **Tags:** LMS

Updates a resource's title, url, description, due date and max marks, keeping linked assignments/quizzes in sync.

**Request body**

**Content-Type:** `application/json` · **Required:** yes

`TeacherLmsResourceUpdateRequestRequest`

| Field | Type | Required | Description |
|---|---|---|---|
| `description` | string | min 1 | no |  |
| `due_date` | string | min 1, nullable | no |  |
| `id` | integer | yes |  |
| `max_marks` | number | nullable | no |  |
| `resource_url` | any | no |  |
| `title` | string | no |  |

**Responses**

- **200**: `SuccessDetailResponse`
- **400**: `ValidationErrorResponse`
- **401**: `DetailErrorResponse`
- **403**: `DetailErrorResponse`
- **404**: `DetailErrorResponse`
- **500**: `DetailErrorResponse`

---

### DELETE `/api/admin-portal/lms/analytics/`

- **Operation ID:** `AdminLmsDeleteResource`
- **Summary:** Delete an LMS resource
- **Authentication:** Bearer JWT required
- **Tags:** LMS

Deletes a course content resource by id, cleaning up any referenced quiz or assignment, and logs the action.

**Parameters**

| Parameter | In | Type | Required | Description |
|---|---|---|---|---|
| `id` | query | integer | yes | ID of the course content resource to delete. |

**Responses**

- **200**: `DetailErrorResponse`
- **400**: `ValidationErrorResponse`
- **401**: `DetailErrorResponse`
- **403**: `DetailErrorResponse`
- **404**: `DetailErrorResponse`
- **500**: `DetailErrorResponse`

---

### DELETE `/api/teacher/lms/chapters/`

- **Operation ID:** `TeacherLmsChaptersDelete`
- **Summary:** Delete chapter
- **Authentication:** Bearer JWT required
- **Tags:** LMS

Deletes a chapter by its id (passed as a query parameter).

**Parameters**

| Parameter | In | Type | Required | Description |
|---|---|---|---|---|
| `id` | query | integer | yes |  |

**Responses**

- **200**: `SuccessDetailResponse`
- **400**: `ValidationErrorResponse`
- **401**: `DetailErrorResponse`
- **403**: `DetailErrorResponse`
- **404**: `DetailErrorResponse`
- **500**: `DetailErrorResponse`

---

### DELETE `/api/teacher/lms/lessons/`

- **Operation ID:** `TeacherLmsLessonsDelete`
- **Summary:** Delete lesson
- **Authentication:** Bearer JWT required
- **Tags:** LMS

Deletes a lesson by its id (passed as a query parameter).

**Parameters**

| Parameter | In | Type | Required | Description |
|---|---|---|---|---|
| `id` | query | integer | yes |  |

**Responses**

- **200**: `SuccessDetailResponse`
- **400**: `ValidationErrorResponse`
- **401**: `DetailErrorResponse`
- **403**: `DetailErrorResponse`
- **404**: `DetailErrorResponse`
- **500**: `DetailErrorResponse`

---

### DELETE `/api/teacher/lms/resources/`

- **Operation ID:** `TeacherLmsResourcesDelete`
- **Summary:** Delete lesson resource
- **Authentication:** Bearer JWT required
- **Tags:** LMS

Deletes a resource by its id (passed as a query parameter), cleaning up any linked quiz or assignment.

**Parameters**

| Parameter | In | Type | Required | Description |
|---|---|---|---|---|
| `id` | query | integer | yes |  |

**Responses**

- **200**: `SuccessDetailResponse`
- **400**: `ValidationErrorResponse`
- **401**: `DetailErrorResponse`
- **403**: `DetailErrorResponse`
- **404**: `DetailErrorResponse`
- **500**: `DetailErrorResponse`

---

## Library

### GET `/api/admin-portal/library/books/`

- **Operation ID:** `AdminLibraryBookList`
- **Summary:** List or look up library books
- **Authentication:** Bearer JWT required
- **Tags:** Library

Lists all books, or returns a single book when a barcode/isbn query parameter is supplied. A lookup that finds no match returns null; without the barcode parameter a list is returned.

**Parameters**

| Parameter | In | Type | Required | Description |
|---|---|---|---|---|
| `barcode` | query | string | no | Barcode ID or ISBN to look up a single book. |

**Responses**

- **200**: `array<AdminBookItem>`
- **400**: `ValidationErrorResponse`
- **401**: `DetailErrorResponse`
- **403**: `DetailErrorResponse`
- **404**: `DetailErrorResponse`
- **500**: `DetailErrorResponse`

---

### POST `/api/admin-portal/library/books/`

- **Operation ID:** `AdminLibraryBookCreate`
- **Summary:** Create a library book
- **Authentication:** Bearer JWT required
- **Tags:** Library

Adds a new book record with title, author, ISBN, barcode and inventory quantities.

**Request body**

**Content-Type:** `application/json` · **Required:** yes

`AdminBookCreateRequestRequest`

| Field | Type | Required | Description |
|---|---|---|---|
| `author` | string | min 1 | no |  |
| `available_quantity` | integer | no |  |
| `barcode_id` | string | min 1 | no |  |
| `book_type` | string | min 1 | no |  |
| `digital_file_url` | string (uri) | min 1 | no |  |
| `isbn` | string | min 1 | no |  |
| `quantity` | integer | no |  |
| `title` | string | min 1 | yes |  |

**Responses**

- **200**: `IdDetailResponse`
- **400**: `ValidationErrorResponse`
- **401**: `DetailErrorResponse`
- **403**: `DetailErrorResponse`
- **404**: `DetailErrorResponse`
- **500**: `DetailErrorResponse`

---

### POST `/api/admin-portal/library/issue/`

- **Operation ID:** `AdminLibraryIssue`
- **Summary:** Issue a book
- **Authentication:** Bearer JWT required
- **Tags:** Library

Issues an available book to a borrower and decrements its available quantity, computing the due date from the loan period.

**Request body**

**Content-Type:** `application/json` · **Required:** yes

`AdminLibraryIssueRequestRequest`

| Field | Type | Required | Description |
|---|---|---|---|
| `book_id` | integer | yes |  |
| `borrower_id` | integer | yes |  |
| `loan_days` | integer | default 14 | no |  |

**Responses**

- **201**: `AdminLibraryIssueResponse`
- **400**: `ValidationErrorResponse`
- **401**: `DetailErrorResponse`
- **403**: `DetailErrorResponse`
- **404**: `DetailErrorResponse`
- **500**: `DetailErrorResponse`

---

### POST `/api/admin-portal/library/return/{transaction_id}/`

- **Operation ID:** `AdminLibraryReturn`
- **Summary:** Return a book
- **Authentication:** Bearer JWT required
- **Tags:** Library

Processes the return of an issued book, automatically calculating any late fine and incrementing the book's available quantity.

**Parameters**

| Parameter | In | Type | Required | Description |
|---|---|---|---|---|
| `transaction_id` | path | integer | yes | Library transaction id to return. |

**Responses**

- **200**: `AdminLibraryReturnResponse`
- **400**: `ValidationErrorResponse`
- **401**: `DetailErrorResponse`
- **403**: `DetailErrorResponse`
- **404**: `DetailErrorResponse`
- **500**: `DetailErrorResponse`

---

## Notifications

### GET `/api/notifications/preferences/`

- **Operation ID:** `NotificationPreferencesGet`
- **Summary:** Get my notification preferences
- **Authentication:** Bearer JWT required
- **Tags:** Notifications

Returns the caller's Email/SMS/Push/In-app notification preferences.

**Responses**

- **200**: `NotificationPreferencesResponse`

---

### PUT `/api/notifications/preferences/`

- **Operation ID:** `NotificationPreferencesUpdate`
- **Summary:** Update my notification preferences
- **Authentication:** Bearer JWT required
- **Tags:** Notifications

Enable or disable any subset of the email, SMS, push and in-app channels.

**Request body**

**Content-Type:** `application/json` · **Required:** no

`NotificationPreferencesUpdateRequestRequest`

| Field | Type | Required | Description |
|---|---|---|---|
| `email_enabled` | boolean | no |  |
| `in_app_enabled` | boolean | no |  |
| `push_enabled` | boolean | no |  |
| `sms_enabled` | boolean | no |  |

**Responses**

- **200**: `NotificationPreferencesResponse`

---

## Parent

### GET `/api/parent/children/`

- **Operation ID:** `ParentChildrenList`
- **Summary:** List parent's children
- **Authentication:** Bearer JWT required
- **Tags:** Parent

Returns the list of students linked to the logged-in parent.

**Responses**

- **200**: `array<ParentChildItem>`
- **400**: `ValidationErrorResponse`
- **401**: `DetailErrorResponse`
- **403**: `DetailErrorResponse`
- **404**: `DetailErrorResponse`
- **500**: `DetailErrorResponse`

---

### GET `/api/parent/dashboard/`

- **Operation ID:** `ParentDashboard`
- **Summary:** Get parent dashboard summary
- **Authentication:** Bearer JWT required
- **Tags:** Parent

Returns a per-child summary (class, attendance percentage, pending fee item count) plus the parent's unread message count.

**Responses**

- **200**: `ParentDashboardResponse`
- **400**: `ValidationErrorResponse`
- **401**: `DetailErrorResponse`
- **403**: `DetailErrorResponse`
- **404**: `DetailErrorResponse`
- **500**: `DetailErrorResponse`

---

### GET `/api/parent/documents/`

- **Operation ID:** `ParentChildDocuments`
- **Summary:** Get child certificates
- **Authentication:** Bearer JWT required
- **Tags:** Parent

Returns certificates/documents issued for one of the parent's children.

**Parameters**

| Parameter | In | Type | Required | Description |
|---|---|---|---|---|
| `child_id` | query | integer | no | Student (auth user) id of one of the parent's children. |

**Responses**

- **200**: `array<ParentChildDocumentItem>`
- **400**: `ValidationErrorResponse`
- **401**: `DetailErrorResponse`
- **403**: `DetailErrorResponse`
- **404**: `DetailErrorResponse`
- **500**: `DetailErrorResponse`

---

### GET `/api/parent/exams/certificates/`

- **Operation ID:** `ParentCertificateList`
- **Summary:** List child certificates
- **Authentication:** Bearer JWT required
- **Tags:** Parent

Returns certificate requests/issued certificates for one of the parent's children.

**Parameters**

| Parameter | In | Type | Required | Description |
|---|---|---|---|---|
| `child_id` | query | integer | no | Student (auth user) id of one of the parent's children. |

**Responses**

- **200** — No response body
- **400**: `ValidationErrorResponse`
- **401**: `DetailErrorResponse`
- **403**: `DetailErrorResponse`
- **404**: `DetailErrorResponse`
- **500**: `DetailErrorResponse`

---

### GET `/api/parent/exams/revaluation/`

- **Operation ID:** `ParentRevaluationList`
- **Summary:** List child revaluation requests
- **Authentication:** Bearer JWT required
- **Tags:** Parent

Returns revaluation requests for one of the parent's children.

**Parameters**

| Parameter | In | Type | Required | Description |
|---|---|---|---|---|
| `child_id` | query | integer | no | Student (auth user) id of one of the parent's children. |

**Responses**

- **200** — No response body
- **400**: `ValidationErrorResponse`
- **401**: `DetailErrorResponse`
- **403**: `DetailErrorResponse`
- **404**: `DetailErrorResponse`
- **500**: `DetailErrorResponse`

---

### GET `/api/parent/feedback/`

- **Operation ID:** `ParentFeedback`
- **Summary:** Get parent feedback submissions
- **Authentication:** Bearer JWT required
- **Tags:** Parent

Returns the list of feedback submissions made by the logged-in parent.

**Responses**

- **200**: `array<ParentFeedbackItem>`
- **400**: `ValidationErrorResponse`
- **401**: `DetailErrorResponse`
- **403**: `DetailErrorResponse`
- **404**: `DetailErrorResponse`
- **500**: `DetailErrorResponse`

---

### GET `/api/parent/leaves/`

- **Operation ID:** `ParentLeaveRequest`
- **Summary:** Get child leave requests
- **Authentication:** Bearer JWT required
- **Tags:** Parent

Returns leave requests submitted for one of the parent's children.

**Parameters**

| Parameter | In | Type | Required | Description |
|---|---|---|---|---|
| `child_id` | query | integer | no | Student (auth user) id of one of the parent's children. |

**Responses**

- **200**: `array<ParentLeaveItem>`
- **400**: `ValidationErrorResponse`
- **401**: `DetailErrorResponse`
- **403**: `DetailErrorResponse`
- **404**: `DetailErrorResponse`
- **500**: `DetailErrorResponse`

---

### GET `/api/parent/messages/`

- **Operation ID:** `ParentMessageThread`
- **Summary:** Get message thread / conversation list
- **Authentication:** Bearer JWT required
- **Tags:** Parent

Returns the parent's latest messages, or a full conversation with a single user when the 'with' parameter is provided.

**Parameters**

| Parameter | In | Type | Required | Description |
|---|---|---|---|---|
| `with` | query | integer | no | Other user id to filter the conversation thread by. |

**Responses**

- **200**: `array<ParentMessageItem>`
- **400**: `ValidationErrorResponse`
- **401**: `DetailErrorResponse`
- **403**: `DetailErrorResponse`
- **404**: `DetailErrorResponse`
- **500**: `DetailErrorResponse`

---

### GET `/api/parent/notifications/`

- **Operation ID:** `ParentNotificationList`
- **Summary:** Get notifications
- **Authentication:** Bearer JWT required
- **Tags:** Parent

Returns the 50 most recent notifications targeted at parents (all parents or the classes of the parent's children).

**Responses**

- **200**: `array<ParentNotificationItem>`
- **400**: `ValidationErrorResponse`
- **401**: `DetailErrorResponse`
- **403**: `DetailErrorResponse`
- **404**: `DetailErrorResponse`
- **500**: `DetailErrorResponse`

---

### GET `/api/parent/profile/`

- **Operation ID:** `ParentProfile`
- **Summary:** Get parent profile
- **Authentication:** Bearer JWT required
- **Tags:** Parent

Returns the logged-in parent's profile information along with a list of their linked children.

**Responses**

- **200**: `ParentProfileResponse`
- **400**: `ValidationErrorResponse`
- **401**: `DetailErrorResponse`
- **403**: `DetailErrorResponse`
- **404**: `DetailErrorResponse`
- **500**: `DetailErrorResponse`

---

### GET `/api/parent/ptm/`

- **Operation ID:** `ParentPtmBooking`
- **Summary:** Get PTM bookings
- **Authentication:** Bearer JWT required
- **Tags:** Parent

Returns the parent's parent-teacher meeting bookings with teacher and student names.

**Responses**

- **200**: `array<ParentPtmBookingItem>`
- **400**: `ValidationErrorResponse`
- **401**: `DetailErrorResponse`
- **403**: `DetailErrorResponse`
- **404**: `DetailErrorResponse`
- **500**: `DetailErrorResponse`

---

### GET `/api/parent/report-card/`

- **Operation ID:** `ParentChildReportCard`
- **Summary:** Get child report card
- **Authentication:** Bearer JWT required
- **Tags:** Parent

Returns a report card for one of the parent's children for a given exam round.

**Parameters**

| Parameter | In | Type | Required | Description |
|---|---|---|---|---|
| `child_id` | query | integer | no | Student (auth user) id of one of the parent's children. |
| `exam_name` | query | string | no | Exam cycle name. One of: Unit_Test_1, Unit_Test_2, Unit_Test_3, Unit_Test_4, Mid_Term, Final_Term, Pre_Board, Board_Exam. |

**Responses**

- **200**: `object`
- **400**: `ValidationErrorResponse`
- **403**: `DetailErrorResponse`

---

### GET `/api/parent/teachers/`

- **Operation ID:** `ParentTeacherContacts`
- **Summary:** Get teacher contacts
- **Authentication:** Bearer JWT required
- **Tags:** Parent

Returns the distinct teachers currently teaching any of this parent's children, with subject and class names.

**Responses**

- **200**: `array<ParentTeacherContactItem>`
- **400**: `ValidationErrorResponse`
- **401**: `DetailErrorResponse`
- **403**: `DetailErrorResponse`
- **404**: `DetailErrorResponse`
- **500**: `DetailErrorResponse`

---

### POST `/api/parent/exams/certificates/`

- **Operation ID:** `ParentCertificateCreate`
- **Summary:** Request a certificate
- **Authentication:** Bearer JWT required
- **Tags:** Parent

Files a certificate request for one of the parent's children.

**Request body**

**Content-Type:** `application/json` · **Required:** no

`object`

**Responses**

- **201**: `object`
- **400**: `ValidationErrorResponse`
- **401**: `DetailErrorResponse`
- **403**: `DetailErrorResponse`
- **404**: `DetailErrorResponse`
- **500**: `DetailErrorResponse`

---

### POST `/api/parent/exams/revaluation/`

- **Operation ID:** `ParentRevaluationCreate`
- **Summary:** Request revaluation
- **Authentication:** Bearer JWT required
- **Tags:** Parent

Files a revaluation request for one of the parent's children.

**Request body**

**Content-Type:** `application/json` · **Required:** no

`object`

**Responses**

- **201**: `object`
- **400**: `ValidationErrorResponse`
- **401**: `DetailErrorResponse`
- **403**: `DetailErrorResponse`
- **404**: `DetailErrorResponse`
- **500**: `DetailErrorResponse`

---

### POST `/api/parent/feedback/`

- **Operation ID:** `ParentFeedbackCreate`
- **Summary:** Submit parent feedback
- **Authentication:** Bearer JWT required
- **Tags:** Parent

Submits feedback from the logged-in parent and returns the new feedback id.

**Request body**

**Content-Type:** `application/json` · **Required:** yes

`ParentFeedbackRequestRequest`

| Field | Type | Required | Description |
|---|---|---|---|
| `category` | string | min 1, default 'General' | no |  |
| `feedback_text` | string | min 1 | yes | Feedback body. |

**Responses**

- **200**: `IdDetailResponse`
- **400**: `ValidationErrorResponse`
- **401**: `DetailErrorResponse`
- **403**: `DetailErrorResponse`
- **404**: `DetailErrorResponse`
- **500**: `DetailErrorResponse`

---

### POST `/api/parent/leaves/`

- **Operation ID:** `ParentLeaveRequestSubmit`
- **Summary:** Submit a leave request
- **Authentication:** Bearer JWT required
- **Tags:** Parent

Submits a leave request on behalf of one of the parent's children and returns the new leave request id.

**Request body**

**Content-Type:** `application/json` · **Required:** yes

`ParentLeaveSubmitRequestRequest`

| Field | Type | Required | Description |
|---|---|---|---|
| `child_id` | integer | yes | Child (student user id) the leave is for. |
| `end_date` | string (date) | yes | Leave end date (YYYY-MM-DD). |
| `leave_type` | any | yes | Type of leave.  * `Sick` - Sick * `Casual` - Casual * `Earned` - Earned * `Medical` - Medical * `Other` - Other |
| `reason` | string | min 1 | yes | Reason for leave. |
| `start_date` | string (date) | yes | Leave start date (YYYY-MM-DD). |

**Responses**

- **200**: `LeaveSubmitResponse`
- **400**: `ValidationErrorResponse`
- **401**: `DetailErrorResponse`
- **403**: `DetailErrorResponse`
- **404**: `DetailErrorResponse`
- **500**: `DetailErrorResponse`

---

### POST `/api/parent/messages/`

- **Operation ID:** `ParentMessageSend`
- **Summary:** Send a message
- **Authentication:** Bearer JWT required
- **Tags:** Parent

Sends a message from the logged-in parent to the given receiver and returns the new message id.

**Request body**

**Content-Type:** `application/json` · **Required:** yes

`ParentMessageSendRequestRequest`

| Field | Type | Required | Description |
|---|---|---|---|
| `message_text` | string | min 1 | yes | Message body. |
| `receiver` | integer | yes | Recipient user id (e.g. a teacher). |

**Responses**

- **200**: `IdDetailResponse`
- **400**: `ValidationErrorResponse`
- **401**: `DetailErrorResponse`
- **403**: `DetailErrorResponse`
- **404**: `DetailErrorResponse`
- **500**: `DetailErrorResponse`

---

### POST `/api/parent/ptm/`

- **Operation ID:** `ParentPtmBookingCreate`
- **Summary:** Request a PTM booking
- **Authentication:** Bearer JWT required
- **Tags:** Parent

Creates a parent-teacher meeting booking request and returns the new booking id.

**Request body**

**Content-Type:** `application/json` · **Required:** yes

`ParentPtmBookingRequestRequest`

| Field | Type | Required | Description |
|---|---|---|---|
| `meeting_date` | string (date) | yes | Desired meeting date (YYYY-MM-DD). |
| `parent_notes` | string | min 1 | no |  |
| `student_id` | integer | yes | Student user id. |
| `teacher_id` | integer | yes | Teacher user id. |
| `time_slot` | string | min 1 | yes | Requested meeting time slot. |

**Responses**

- **200**: `IdDetailResponse`
- **400**: `ValidationErrorResponse`
- **401**: `DetailErrorResponse`
- **403**: `DetailErrorResponse`
- **404**: `DetailErrorResponse`
- **500**: `DetailErrorResponse`

---

### GET `/api/admin-portal/academic-years/`

- **Operation ID:** `AdminAcademicYearList`
- **Summary:** List academic years
- **Authentication:** Bearer JWT required
- **Tags:** Finance

Returns all academic years, newest first.

**Responses**

- **200**: `array<AdminAcademicYearItem>`
- **400**: `ValidationErrorResponse`
- **401**: `DetailErrorResponse`
- **403**: `DetailErrorResponse`
- **404**: `DetailErrorResponse`
- **500**: `DetailErrorResponse`

---

### POST `/api/admin-portal/academic-years/`

- **Operation ID:** `AdminAcademicYearCreate`
- **Summary:** Create an academic year
- **Authentication:** Bearer JWT required
- **Tags:** Finance

Creates an academic year; when is_active is set the other years are deactivated.

**Request body**

**Content-Type:** `application/json` · **Required:** yes

`AdminAcademicYearCreateRequestRequest`

| Field | Type | Required | Description |
|---|---|---|---|
| `name` | string | yes |  |
| `start_date` | string | yes |  |
| `end_date` | string | yes |  |
| `is_active` | boolean | no |  |

**Responses**

- **200**: `IdDetailResponse`
- **400**: `ValidationErrorResponse`
- **401**: `DetailErrorResponse`
- **403**: `DetailErrorResponse`
- **404**: `DetailErrorResponse`
- **500**: `DetailErrorResponse`

---

### GET `/api/admin-portal/fee-assignments/`

- **Operation ID:** `AdminFeeAssignmentList`
- **Summary:** List fee structure assignments
- **Authentication:** Bearer JWT required
- **Tags:** Finance

Returns the students assigned to a fee structure (required query param fee_structure_id).

**Parameters**

| Parameter | In | Type | Required | Description |
|---|---|---|---|---|
| `fee_structure_id` | query | integer | yes |  |

**Responses**

- **200**: `array<AdminFeeAssignmentItem>`
- **400**: `ValidationErrorResponse`
- **401**: `DetailErrorResponse`
- **403**: `DetailErrorResponse`
- **404**: `DetailErrorResponse`
- **500**: `DetailErrorResponse`

---

### POST `/api/admin-portal/fee-assignments/`

- **Operation ID:** `AdminFeeAssignmentCreate`
- **Summary:** Assign a fee structure to students
- **Authentication:** Bearer JWT required
- **Tags:** Finance

Assigns a fee structure to one student (student_id) or to the whole class (assign_class=true).

**Request body**

**Content-Type:** `application/json` · **Required:** yes

`AdminFeeAssignmentCreateRequestRequest`

| Field | Type | Required | Description |
|---|---|---|---|
| `fee_structure_id` | integer | yes |  |
| `student_id` | integer | no |  |
| `assign_class` | boolean | no | Bulk-assign every student enrolled in the structure's class. |

**Responses**

- **200**: `AdminDetailResponse`
- **400**: `ValidationErrorResponse`
- **401**: `DetailErrorResponse`
- **403**: `DetailErrorResponse`
- **404**: `DetailErrorResponse`
- **500**: `DetailErrorResponse`

---

### DELETE `/api/admin-portal/fee-assignments/`

- **Operation ID:** `AdminFeeAssignmentDelete`
- **Summary:** Remove a fee structure assignment
- **Authentication:** Bearer JWT required
- **Tags:** Finance

Assigns fee structures to individual students or to every student
enrolled in the structure's class (bulk).

**Parameters**

| Parameter | In | Type | Required | Description |
|---|---|---|---|---|
| `id` | query | integer | yes |  |

**Responses**

- **200**: `DetailErrorResponse`
- **400**: `ValidationErrorResponse`
- **401**: `DetailErrorResponse`
- **403**: `DetailErrorResponse`
- **404**: `DetailErrorResponse`
- **500**: `DetailErrorResponse`

---

### GET `/api/admin-portal/fee-categories/`

- **Operation ID:** `AdminFeeCategoryList`
- **Summary:** List fee categories
- **Authentication:** Bearer JWT required
- **Tags:** Finance

Returns all fee categories ordered by sort_order.

**Responses**

- **200**: `array<AdminFeeCategoryItem>`
- **400**: `ValidationErrorResponse`
- **401**: `DetailErrorResponse`
- **403**: `DetailErrorResponse`
- **404**: `DetailErrorResponse`
- **500**: `DetailErrorResponse`

---

### POST `/api/admin-portal/fee-categories/`

- **Operation ID:** `AdminFeeCategoryCreate`
- **Summary:** Create a fee category
- **Authentication:** Bearer JWT required
- **Tags:** Finance

Creates a fee category with an optional sort order.

**Request body**

**Content-Type:** `application/json` · **Required:** yes

`AdminFeeCategoryCreateRequestRequest`

| Field | Type | Required | Description |
|---|---|---|---|
| `name` | string | yes |  |
| `description` | string | no |  |
| `sort_order` | integer | no |  |
| `is_active` | boolean | no |  |

**Responses**

- **200**: `IdDetailResponse`
- **400**: `ValidationErrorResponse`
- **401**: `DetailErrorResponse`
- **403**: `DetailErrorResponse`
- **404**: `DetailErrorResponse`
- **500**: `DetailErrorResponse`

---

### GET `/api/admin-portal/fee-concessions/`

- **Operation ID:** `AdminFeeConcessionList`
- **Summary:** List fee concessions
- **Authentication:** Bearer JWT required
- **Tags:** Finance

Returns all concessions joined with the student and fee term.

**Responses**

- **200**: `array<AdminFeeConcessionItem>`
- **400**: `ValidationErrorResponse`
- **401**: `DetailErrorResponse`
- **403**: `DetailErrorResponse`
- **404**: `DetailErrorResponse`
- **500**: `DetailErrorResponse`

---

### POST `/api/admin-portal/fee-concessions/`

- **Operation ID:** `AdminFeeConcessionCreate`
- **Summary:** Apply a concession
- **Authentication:** Bearer JWT required
- **Tags:** Finance

Applies a flat or percentage discount to a student for a fee structure.

**Request body**

**Content-Type:** `application/json` · **Required:** yes

`AdminFeeConcessionCreateRequestRequest`

| Field | Type | Required | Description |
|---|---|---|---|
| `student_id` | integer | yes |  |
| `fee_structure_id` | integer | yes |  |
| `concession_type` | ConcessionTypeEnum | no |  |
| `discount_amount` | number | no |  |
| `discount_percent` | number | no |  |
| `reason` | string | no |  |

**Responses**

- **200**: `IdDetailResponse`
- **400**: `ValidationErrorResponse`
- **401**: `DetailErrorResponse`
- **403**: `DetailErrorResponse`
- **404**: `DetailErrorResponse`
- **500**: `DetailErrorResponse`

---

### DELETE `/api/admin-portal/fee-concessions/`

- **Operation ID:** `AdminFeeConcessionDelete`
- **Summary:** Remove a concession
- **Authentication:** Bearer JWT required
- **Tags:** Finance

-

**Parameters**

| Parameter | In | Type | Required | Description |
|---|---|---|---|---|
| `id` | query | integer | yes |  |

**Responses**

- **200**: `DetailErrorResponse`
- **400**: `ValidationErrorResponse`
- **401**: `DetailErrorResponse`
- **403**: `DetailErrorResponse`
- **404**: `DetailErrorResponse`
- **500**: `DetailErrorResponse`

---

### GET `/api/admin-portal/fee-ledger/`

- **Operation ID:** `AdminFeeLedgerList`
- **Summary:** View the student ledger
- **Authentication:** Bearer JWT required
- **Tags:** Finance

Returns the computed ledger for a fee structure (query param fee_structure_id).

**Parameters**

| Parameter | In | Type | Required | Description |
|---|---|---|---|---|
| `fee_structure_id` | query | integer | yes |  |

**Responses**

- **200**: `array<AdminFeeLedgerItem>`
- **400**: `ValidationErrorResponse`
- **401**: `DetailErrorResponse`
- **403**: `DetailErrorResponse`
- **404**: `DetailErrorResponse`
- **500**: `DetailErrorResponse`

---

### POST `/api/admin-portal/fee-ledger/`

- **Operation ID:** `AdminFeeLedgerGenerate`
- **Summary:** Generate the student ledger
- **Authentication:** Bearer JWT required
- **Tags:** Finance

Validates the fee structure and refreshes the computed ledger.

**Request body**

**Content-Type:** `application/json` · **Required:** yes

`AdminFeeLedgerGenerateRequestRequest`

| Field | Type | Required | Description |
|---|---|---|---|
| `fee_structure_id` | integer | yes |  |

**Responses**

- **200**: `AdminDetailResponse`
- **400**: `ValidationErrorResponse`
- **401**: `DetailErrorResponse`
- **403**: `DetailErrorResponse`
- **404**: `DetailErrorResponse`
- **500**: `DetailErrorResponse`

---

### GET `/api/admin-portal/fee-reports/`

- **Operation ID:** `AdminFeeReports`
- **Summary:** Fee collection reports
- **Authentication:** Bearer JWT required
- **Tags:** Finance

Returns collection summary, per-structure, monthly (last 12 months) and outstanding stats.

**Parameters**

| Parameter | In | Type | Required | Description |
|---|---|---|---|---|
| `academic_year_id` | query | integer | no | Restrict structures and payments to an academic year. |

**Responses**

- **200**: `AdminFeeReportsResponse`
- **400**: `ValidationErrorResponse`
- **401**: `DetailErrorResponse`
- **403**: `DetailErrorResponse`
- **404**: `DetailErrorResponse`
- **500**: `DetailErrorResponse`

---

## Payroll

### GET `/api/admin-portal/payroll/`

- **Operation ID:** `PayrollList`
- **Summary:** List payroll records
- **Authentication:** Bearer JWT required
- **Tags:** Payroll

List a pay period's payslips (auto-generates one Pending payslip per active employee for the month on first request).

**Parameters**

| Parameter | In | Type | Required | Description |
|---|---|---|---|---|
| `month` | query | string | no | Pay period as 'YYYY-MM-01'. Defaults to the current month. |

**Responses**

- **200**: `array<PayrollItem>`
- **400**: `ValidationErrorResponse`
- **401**: `DetailErrorResponse`
- **403**: `DetailErrorResponse`
- **404**: `DetailErrorResponse`
- **500**: `DetailErrorResponse`

---

### PATCH `/api/admin-portal/payroll/`

- **Operation ID:** `PayrollUpdate`
- **Summary:** Adjust or pay a payslip
- **Authentication:** Bearer JWT required
- **Tags:** Payroll

Body: {id, allowances?, deductions?, status?} — recomputes net_pay and, when status is set to Paid, stamps paid_on.

**Request body**

**Content-Type:** `application/json` · **Required:** no

`PatchedPayrollUpdateRequestRequest`

| Field | Type | Required | Description |
|---|---|---|---|
| `allowances` | string (decimal) | no |  |
| `deductions` | string (decimal) | no |  |
| `id` | integer | no |  |
| `status` | string | min 1 | no |  |

**Responses**

- **200**: `DetailErrorResponse`
- **400**: `ValidationErrorResponse`
- **401**: `DetailErrorResponse`
- **403**: `DetailErrorResponse`
- **404**: `DetailErrorResponse`
- **500**: `DetailErrorResponse`

---

## Recruitment

### GET `/api/admin-portal/interviews/`

- **Operation ID:** `AdminInterviewList`
- **Summary:** List interviews
- **Authentication:** Bearer JWT required
- **Tags:** Recruitment

Returns applications that have been scheduled for interview.

**Responses**

- **200** — No response body
- **400**: `ValidationErrorResponse`
- **401**: `DetailErrorResponse`
- **403**: `DetailErrorResponse`
- **404**: `DetailErrorResponse`
- **500**: `DetailErrorResponse`

---

### GET `/api/admin-portal/recruitment/`

- **Operation ID:** `AdminRecruitmentList`
- **Summary:** List job applications
- **Authentication:** Bearer JWT required
- **Tags:** Recruitment

Returns all candidate applications, newest first, with the job title resolved.

**Responses**

- **200** — No response body
- **400**: `ValidationErrorResponse`
- **401**: `DetailErrorResponse`
- **403**: `DetailErrorResponse`
- **404**: `DetailErrorResponse`
- **500**: `DetailErrorResponse`

---

### POST `/api/admin-portal/interviews/`

- **Operation ID:** `AdminInterviewSchedule`
- **Summary:** Schedule an interview
- **Authentication:** Bearer JWT required
- **Tags:** Recruitment

Sets interview date, interviewer and location/link for an application and marks it Scheduled.

**Request body**

**Content-Type:** `application/json` · **Required:** no

`object`

**Responses**

- **200**: `object`
- **400**: `ValidationErrorResponse`
- **401**: `DetailErrorResponse`
- **403**: `DetailErrorResponse`
- **404**: `DetailErrorResponse`
- **500**: `DetailErrorResponse`

---

### PATCH `/api/admin-portal/interviews/`

- **Operation ID:** `AdminInterviewUpdate`
- **Summary:** Update interview
- **Authentication:** Bearer JWT required
- **Tags:** Recruitment

Mark an interview Completed or Cancelled, with optional feedback.

**Request body**

**Content-Type:** `application/json` · **Required:** no

`object`

**Responses**

- **200**: `object`
- **400**: `ValidationErrorResponse`
- **401**: `DetailErrorResponse`
- **403**: `DetailErrorResponse`
- **404**: `DetailErrorResponse`
- **500**: `DetailErrorResponse`

---

### PATCH `/api/admin-portal/recruitment/`

- **Operation ID:** `AdminRecruitmentUpdateStatus`
- **Summary:** Update application status
- **Authentication:** Bearer JWT required
- **Tags:** Recruitment

Update the review status (Pending / Interview / Hired / Rejected) of an application.

**Request body**

**Content-Type:** `application/json` · **Required:** no

`object`

**Responses**

- **200**: `object`
- **400**: `ValidationErrorResponse`
- **401**: `DetailErrorResponse`
- **403**: `DetailErrorResponse`
- **404**: `DetailErrorResponse`
- **500**: `DetailErrorResponse`

---

## Reports

### GET `/api/admin-portal/reports/`

- **Operation ID:** `AdminReports`
- **Summary:** School performance reports
- **Authentication:** Bearer JWT required
- **Tags:** Reports

Returns aggregate attendance by class, monthly fee collection and average subject marks.

**Responses**

- **200**: `AdminReportsResponse`
- **400**: `ValidationErrorResponse`
- **401**: `DetailErrorResponse`
- **403**: `DetailErrorResponse`
- **404**: `DetailErrorResponse`
- **500**: `DetailErrorResponse`

---

## Student

### GET `/api/student/academic-certificates/`

- **Operation ID:** `StudentAcademicCertificatesList`
- **Summary:** List certificates
- **Authentication:** Bearer JWT required
- **Tags:** Student

Returns the student's certificate requests.

**Responses**

- **200** — No response body
- **400**: `ValidationErrorResponse`
- **401**: `DetailErrorResponse`
- **403**: `DetailErrorResponse`
- **404**: `DetailErrorResponse`
- **500**: `DetailErrorResponse`

---

### GET `/api/student/announcements/`

- **Operation ID:** `StudentAnnouncementList`
- **Summary:** Get announcements
- **Authentication:** Bearer JWT required
- **Tags:** Student

Returns announcements and news targeted at students, or an empty list when none exist.

**Responses**

- **200**: `array<AnnouncementItem>`
- **400**: `ValidationErrorResponse`
- **401**: `DetailErrorResponse`
- **403**: `DetailErrorResponse`
- **404**: `DetailErrorResponse`
- **500**: `DetailErrorResponse`

---

### GET `/api/student/assignments/`

- **Operation ID:** `StudentAssignmentList`
- **Summary:** Get assignments list
- **Authentication:** Bearer JWT required
- **Tags:** Student

Returns the assignments for the student's class including the student's own submission if any. Quiz correct answers are hidden until submitted.

**Responses**

- **200**: `array<AssignmentItem>`
- **400**: `ValidationErrorResponse`
- **401**: `DetailErrorResponse`
- **403**: `DetailErrorResponse`
- **404**: `DetailErrorResponse`
- **500**: `DetailErrorResponse`

---

### GET `/api/student/attendance/`

- **Operation ID:** `StudentAttendanceList`
- **Summary:** Get attendance records
- **Authentication:** Bearer JWT required
- **Tags:** Student

Returns the student's attendance records (optionally filtered by an YYYY-MM month) plus a summary count and percentage.

**Parameters**

| Parameter | In | Type | Required | Description |
|---|---|---|---|---|
| `month` | query | string | no | Attendance month filter in 'YYYY-MM' format, e.g. 2025-01. |

**Responses**

- **200**: `AttendanceListResponse`
- **400**: `ValidationErrorResponse`
- **401**: `DetailErrorResponse`
- **403**: `DetailErrorResponse`
- **404**: `DetailErrorResponse`
- **500**: `DetailErrorResponse`

---

### GET `/api/student/certificates/`

- **Operation ID:** `StudentCertificateList`
- **Summary:** Get certificates
- **Authentication:** Bearer JWT required
- **Tags:** Student

Returns the certificates issued to the student, or an empty list when none exist.

**Responses**

- **200**: `array<CertificateItem>`
- **400**: `ValidationErrorResponse`
- **401**: `DetailErrorResponse`
- **403**: `DetailErrorResponse`
- **404**: `DetailErrorResponse`
- **500**: `DetailErrorResponse`

---

### GET `/api/student/courses/`

- **Operation ID:** `StudentCourseList`
- **Summary:** Get LMS courses
- **Authentication:** Bearer JWT required
- **Tags:** Student

Returns the learning management courses for the student's class including chapters, lessons, resources, quizzes, and progress flags.

**Responses**

- **200**: `array<CourseItem>`
- **400**: `ValidationErrorResponse`
- **401**: `DetailErrorResponse`
- **403**: `DetailErrorResponse`
- **404**: `DetailErrorResponse`
- **500**: `DetailErrorResponse`

---

### GET `/api/student/dashboard/`

- **Operation ID:** `StudentDashboard`
- **Summary:** Get student dashboard summary
- **Authentication:** Bearer JWT required
- **Tags:** Student

Returns a summary of the student's attendance, upcoming exams, recent results, homework and assignments due, pending fees, and announcements.

**Responses**

- **200**: `StudentDashboardResponse`
- **400**: `ValidationErrorResponse`
- **401**: `DetailErrorResponse`
- **403**: `DetailErrorResponse`
- **404**: `DetailErrorResponse`
- **500**: `DetailErrorResponse`

---

### GET `/api/student/events/`

- **Operation ID:** `StudentEventList`
- **Summary:** Get events
- **Authentication:** Bearer JWT required
- **Tags:** Student

Returns school events with dates and venues, or an empty list when none exist.

**Responses**

- **200**: `array<EventItem>`
- **400**: `ValidationErrorResponse`
- **401**: `DetailErrorResponse`
- **403**: `DetailErrorResponse`
- **404**: `DetailErrorResponse`
- **500**: `DetailErrorResponse`

---

### GET `/api/student/exams/`

- **Operation ID:** `StudentExamList`
- **Summary:** Get exam schedule
- **Authentication:** Bearer JWT required
- **Tags:** Student

Returns the exam schedule for the student's class, or an empty list when not enrolled.

**Responses**

- **200**: `array<ExamItem>`
- **400**: `ValidationErrorResponse`
- **401**: `DetailErrorResponse`
- **403**: `DetailErrorResponse`
- **404**: `DetailErrorResponse`
- **500**: `DetailErrorResponse`

---

### GET `/api/student/exams/revaluation/`

- **Operation ID:** `StudentRevaluationList`
- **Summary:** List revaluation requests
- **Authentication:** Bearer JWT required
- **Tags:** Student

Returns the student's revaluation requests.

**Responses**

- **200** — No response body
- **400**: `ValidationErrorResponse`
- **401**: `DetailErrorResponse`
- **403**: `DetailErrorResponse`
- **404**: `DetailErrorResponse`
- **500**: `DetailErrorResponse`

---

### GET `/api/student/fees/`

- **Operation ID:** `StudentFees`
- **Summary:** Get fees and payment history
- **Authentication:** Bearer JWT required
- **Tags:** Student

Returns pending fee structures for the student's class and the student's payment history.

**Responses**

- **200**: `FeesResponse`
- **400**: `ValidationErrorResponse`
- **401**: `DetailErrorResponse`
- **403**: `DetailErrorResponse`
- **404**: `DetailErrorResponse`
- **500**: `DetailErrorResponse`

---

### GET `/api/student/hall-tickets/`

- **Operation ID:** `StudentHallTicketList`
- **Summary:** Get hall tickets
- **Authentication:** Bearer JWT required
- **Tags:** Student

Returns the student's generated exam hall tickets with exam details.

**Responses**

- **200**: `array<HallTicketItem>`
- **400**: `ValidationErrorResponse`
- **401**: `DetailErrorResponse`
- **403**: `DetailErrorResponse`
- **404**: `DetailErrorResponse`
- **500**: `DetailErrorResponse`

---

### GET `/api/student/homework/`

- **Operation ID:** `StudentHomeworkList`
- **Summary:** Get homework list
- **Authentication:** Bearer JWT required
- **Tags:** Student

Returns the homework assigned to the student's class, or an empty list when not enrolled.

**Responses**

- **200**: `array<HomeworkItem>`
- **400**: `ValidationErrorResponse`
- **401**: `DetailErrorResponse`
- **403**: `DetailErrorResponse`
- **404**: `DetailErrorResponse`
- **500**: `DetailErrorResponse`

---

### GET `/api/student/leaves/`

- **Operation ID:** `StudentLeaveList`
- **Summary:** Get leave applications
- **Authentication:** Bearer JWT required
- **Tags:** Student

Returns the leave applications submitted by the student.

**Responses**

- **200**: `array<LeaveItem>`
- **400**: `ValidationErrorResponse`
- **401**: `DetailErrorResponse`
- **403**: `DetailErrorResponse`
- **404**: `DetailErrorResponse`
- **500**: `DetailErrorResponse`

---

### GET `/api/student/library/`

- **Operation ID:** `StudentLibraryList`
- **Summary:** Get library transactions
- **Authentication:** Bearer JWT required
- **Tags:** Student

Returns the student's library borrowing history with book details.

**Responses**

- **200**: `array<LibraryItem>`
- **400**: `ValidationErrorResponse`
- **401**: `DetailErrorResponse`
- **403**: `DetailErrorResponse`
- **404**: `DetailErrorResponse`
- **500**: `DetailErrorResponse`

---

### GET `/api/student/library/search/`

- **Operation ID:** `StudentBookSearch`
- **Summary:** Search library books
- **Authentication:** Bearer JWT required
- **Tags:** Student

Searches books by title or author keyword and returns up to 20 matches.

**Parameters**

| Parameter | In | Type | Required | Description |
|---|---|---|---|---|
| `q` | query | string | yes | Search keyword. |

**Responses**

- **200**: `array<BookItem>`
- **400**: `ValidationErrorResponse`
- **401**: `DetailErrorResponse`
- **403**: `DetailErrorResponse`
- **404**: `DetailErrorResponse`
- **500**: `DetailErrorResponse`

---

### GET `/api/student/medical-records/`

- **Operation ID:** `StudentMedicalView`
- **Summary:** Student's own medical history
- **Authentication:** Bearer JWT required
- **Tags:** Student

Return the current student's medical visit history.

**Responses**

- **200**: `array<StudentMedicalItem>`
- **400**: `ValidationErrorResponse`
- **401**: `DetailErrorResponse`
- **403**: `DetailErrorResponse`
- **404**: `DetailErrorResponse`
- **500**: `DetailErrorResponse`

---

### GET `/api/student/profile/`

- **Operation ID:** `StudentProfile`
- **Summary:** Get student profile
- **Authentication:** Bearer JWT required
- **Tags:** Student

Returns the logged-in student's profile information (contact details, admission, class, and academic year).

**Responses**

- **200**: `StudentProfileResponse`
- **400**: `ValidationErrorResponse`
- **401**: `DetailErrorResponse`
- **403**: `DetailErrorResponse`
- **404**: `DetailErrorResponse`
- **500**: `DetailErrorResponse`

---

### GET `/api/student/quizzes/{quiz_id}/`

- **Operation ID:** `StudentQuizDetail`
- **Summary:** Get quiz detail
- **Authentication:** Bearer JWT required
- **Tags:** Student

Returns a quiz and its questions with answer options for the student.

**Parameters**

| Parameter | In | Type | Required | Description |
|---|---|---|---|---|
| `quiz_id` | path | integer | yes | Quiz id. |

**Responses**

- **200**: `QuizDetailResponse`
- **400**: `ValidationErrorResponse`
- **401**: `DetailErrorResponse`
- **403**: `DetailErrorResponse`
- **404**: `DetailErrorResponse`
- **500**: `DetailErrorResponse`

---

### GET `/api/student/results/`

- **Operation ID:** `StudentResultList`
- **Summary:** Get exam results
- **Authentication:** Bearer JWT required
- **Tags:** Student

Returns the student's exam results with percentage and exam details, or an empty list when no results exist.

**Responses**

- **200**: `array<ResultItem>`
- **400**: `ValidationErrorResponse`
- **401**: `DetailErrorResponse`
- **403**: `DetailErrorResponse`
- **404**: `DetailErrorResponse`
- **500**: `DetailErrorResponse`

---

### GET `/api/student/supplementary/`

- **Operation ID:** `StudentSupplementaryList`
- **Summary:** List supplementary registrations
- **Authentication:** Bearer JWT required
- **Tags:** Student

Returns the student's supplementary exam registrations.

**Responses**

- **200** — No response body
- **400**: `ValidationErrorResponse`
- **401**: `DetailErrorResponse`
- **403**: `DetailErrorResponse`
- **404**: `DetailErrorResponse`
- **500**: `DetailErrorResponse`

---

### GET `/api/student/timetable/`

- **Operation ID:** `StudentTimetable`
- **Summary:** Get class timetable
- **Authentication:** Bearer JWT required
- **Tags:** Student

Returns the weekly timetable entries for the student's enrolled class, or an empty list when not enrolled.

**Responses**

- **200**: `array<TimetableItem>`
- **400**: `ValidationErrorResponse`
- **401**: `DetailErrorResponse`
- **403**: `DetailErrorResponse`
- **404**: `DetailErrorResponse`
- **500**: `DetailErrorResponse`

---

### POST `/api/student/academic-certificates/`

- **Operation ID:** `StudentAcademicCertificatesCreate`
- **Summary:** Request a certificate
- **Authentication:** Bearer JWT required
- **Tags:** Student

Files a certificate request for the student.

**Request body**

**Content-Type:** `application/json` · **Required:** no

`object`

**Responses**

- **201**: `object`
- **400**: `ValidationErrorResponse`
- **401**: `DetailErrorResponse`
- **403**: `DetailErrorResponse`
- **404**: `DetailErrorResponse`
- **500**: `DetailErrorResponse`

---

### POST `/api/student/ai-chat/`

- **Operation ID:** `StudentAIChat`
- **Summary:** Chat with the AI study assistant
- **Authentication:** Bearer JWT required
- **Tags:** Student

Sends a natural-language message to the AI assistant and receives a helpful reply about assignments, timetable, or grades.

**Request body**

**Content-Type:** `application/json` · **Required:** yes

`ChatRequestRequest`

| Field | Type | Required | Description |
|---|---|---|---|
| `message` | string | min 1 | yes | User's message to the assistant. |

**Responses**

- **200**: `ChatResponse`
- **400**: `ValidationErrorResponse`
- **401**: `DetailErrorResponse`
- **403**: `DetailErrorResponse`
- **404**: `DetailErrorResponse`
- **500**: `DetailErrorResponse`

---

### POST `/api/student/assignments/{assignment_id}/submit/`

- **Operation ID:** `StudentAssignmentSubmit`
- **Summary:** Submit an assignment
- **Authentication:** Bearer JWT required
- **Tags:** Student

Records a submission for a given assignment. Quiz assignments are auto-graded; other assignments store the URL.

**Parameters**

| Parameter | In | Type | Required | Description |
|---|---|---|---|---|
| `assignment_id` | path | integer | yes | Assignment id. |

**Request body**

**Content-Type:** `application/json` · **Required:** yes

`AssignmentSubmitRequestRequest`

| Field | Type | Required | Description |
|---|---|---|---|
| `submission_url` | string | min 1 | yes | Submission URL or file URL. |

**Responses**

- **200**: `AssignmentSubmitResponse`
- **400**: `ValidationErrorResponse`
- **401**: `DetailErrorResponse`
- **403**: `DetailErrorResponse`
- **404**: `DetailErrorResponse`
- **500**: `DetailErrorResponse`

---

### POST `/api/student/exams/revaluation/`

- **Operation ID:** `StudentRevaluationCreate`
- **Summary:** Request revaluation
- **Authentication:** Bearer JWT required
- **Tags:** Student

Files a revaluation request for one of the student's results.

**Request body**

**Content-Type:** `application/json` · **Required:** no

`object`

**Responses**

- **201**: `object`
- **400**: `ValidationErrorResponse`
- **401**: `DetailErrorResponse`
- **403**: `DetailErrorResponse`
- **404**: `DetailErrorResponse`
- **500**: `DetailErrorResponse`

---

### POST `/api/student/fees/pay/`

- **Operation ID:** `StudentInitiatePayment`
- **Summary:** Initiate a fee payment
- **Authentication:** Bearer JWT required
- **Tags:** Student

Records a successful payment against a fee structure and returns the generated transaction id.

**Request body**

**Content-Type:** `application/json` · **Required:** yes

`InitiatePaymentRequestRequest`

| Field | Type | Required | Description |
|---|---|---|---|
| `fee_structure_id` | integer | yes | Fee structure id to pay for. |
| `payment_method` | string | min 1, default 'Online' | no | Online/Offline payment method. |

**Responses**

- **200**: `InitiatePaymentResponse`
- **400**: `ValidationErrorResponse`
- **401**: `DetailErrorResponse`
- **403**: `DetailErrorResponse`
- **404**: `DetailErrorResponse`
- **500**: `DetailErrorResponse`

---

### POST `/api/student/leaves/`

- **Operation ID:** `StudentLeaveCreate`
- **Summary:** Submit a leave application
- **Authentication:** Bearer JWT required
- **Tags:** Student

Creates a new leave application for the student and returns the new leave request id.

**Request body**

**Content-Type:** `application/json` · **Required:** yes

`LeaveRequestRequest`

| Field | Type | Required | Description |
|---|---|---|---|
| `end_date` | string (date) | yes | Leave end date (YYYY-MM-DD). |
| `leave_type` | any | yes | Type of leave.  * `Sick` - Sick * `Casual` - Casual * `Earned` - Earned * `Medical` - Medical * `Other` - Other |
| `reason` | string | min 1 | yes | Reason for leave. |
| `start_date` | string (date) | yes | Leave start date (YYYY-MM-DD). |

**Responses**

- **200**: `LeaveSubmitResponse`
- **400**: `ValidationErrorResponse`
- **401**: `DetailErrorResponse`
- **403**: `DetailErrorResponse`
- **404**: `DetailErrorResponse`
- **500**: `DetailErrorResponse`

---

### POST `/api/student/quizzes/{quiz_id}/`

- **Operation ID:** `StudentQuizSubmit`
- **Summary:** Submit a quiz response
- **Authentication:** Bearer JWT required
- **Tags:** Student

Accepts the student's answers (a map of question_id to selected option) and returns a percentage score computed against the quiz's stored correct answers.

**Parameters**

| Parameter | In | Type | Required | Description |
|---|---|---|---|---|
| `quiz_id` | path | integer | yes | Quiz id. |

**Request body**

**Content-Type:** `application/json` · **Required:** no

`QuizSubmitRequestRequest`

| Field | Type | Required | Description |
|---|---|---|---|
| `answers` | object<string, any> | nullable | no |  |

**Responses**

- **200**: `QuizSubmitResponse`
- **400**: `ValidationErrorResponse`
- **401**: `DetailErrorResponse`
- **403**: `DetailErrorResponse`
- **404**: `DetailErrorResponse`
- **500**: `DetailErrorResponse`

---

### POST `/api/student/supplementary/`

- **Operation ID:** `StudentSupplementaryCreate`
- **Summary:** Register for a supplementary exam
- **Authentication:** Bearer JWT required
- **Tags:** Student

Registers the student for a supplementary exam in a failed subject.

**Request body**

**Content-Type:** `application/json` · **Required:** no

`object`

**Responses**

- **201**: `object`
- **400**: `ValidationErrorResponse`
- **401**: `DetailErrorResponse`
- **403**: `DetailErrorResponse`
- **404**: `DetailErrorResponse`
- **500**: `DetailErrorResponse`

---

## System

### GET `/api/admin-portal/audit-log/`

- **Operation ID:** `AdminAuditLogList`
- **Summary:** List audit log entries
- **Authentication:** Bearer JWT required
- **Tags:** System

Returns the 300 most recent admin audit-log entries with actor names.

**Responses**

- **200**: `array<AdminAuditLogItem>`
- **400**: `ValidationErrorResponse`
- **401**: `DetailErrorResponse`
- **403**: `DetailErrorResponse`
- **404**: `DetailErrorResponse`
- **500**: `DetailErrorResponse`

---

### GET `/api/admin-portal/backup/export/`

- **Operation ID:** `AdminBackupExport`
- **Summary:** Export operational backup snapshot
- **Authentication:** Bearer JWT required
- **Tags:** System

Returns a JSON snapshot of all existing portal tables plus the generated-at date.

**Responses**

- **200**: `AdminBackupExportResponse`
- **400**: `ValidationErrorResponse`
- **401**: `DetailErrorResponse`
- **403**: `DetailErrorResponse`
- **404**: `DetailErrorResponse`
- **500**: `DetailErrorResponse`

---

### GET `/api/admin-portal/inventory/`

- **Operation ID:** `InventoryList`
- **Summary:** List inventory items
- **Authentication:** Bearer JWT required
- **Tags:** System

Return inventory items, optionally filtered by department.

**Parameters**

| Parameter | In | Type | Required | Description |
|---|---|---|---|---|
| `department` | query | string | no | Filter inventory items by department. |

**Responses**

- **200**: `array<InventoryItem>`
- **400**: `ValidationErrorResponse`
- **401**: `DetailErrorResponse`
- **403**: `DetailErrorResponse`
- **404**: `DetailErrorResponse`
- **500**: `DetailErrorResponse`

---

### GET `/api/admin-portal/visitors/`

- **Operation ID:** `VisitorLogList`
- **Summary:** List visitor logs
- **Authentication:** Bearer JWT required
- **Tags:** System

Return recent visitor check-in logs, optionally only those still checked in.

**Parameters**

| Parameter | In | Type | Required | Description |
|---|---|---|---|---|
| `open` | query | boolean | no | Pass open=true to list only visitors still checked in. |

**Responses**

- **200**: `array<VisitorLogItem>`
- **400**: `ValidationErrorResponse`
- **401**: `DetailErrorResponse`
- **403**: `DetailErrorResponse`
- **404**: `DetailErrorResponse`
- **500**: `DetailErrorResponse`

---

### POST `/api/admin-portal/inventory/`

- **Operation ID:** `InventoryCreate`
- **Summary:** Add an inventory item
- **Authentication:** Bearer JWT required
- **Tags:** System

Create a new inventory line item.

**Request body**

**Content-Type:** `application/json` · **Required:** yes

`InventoryCreateRequestRequest`

| Field | Type | Required | Description |
|---|---|---|---|
| `category` | string | min 1 | no |  |
| `department` | string | min 1 | no |  |
| `item_name` | string | min 1 | yes |  |
| `quantity` | integer | no |  |

**Responses**

- **200**: `IdDetailResponse`
- **400**: `ValidationErrorResponse`
- **401**: `DetailErrorResponse`
- **403**: `DetailErrorResponse`
- **404**: `DetailErrorResponse`
- **500**: `DetailErrorResponse`

---

### POST `/api/admin-portal/visitors/`

- **Operation ID:** `VisitorLogCheckIn`
- **Summary:** Check in a visitor
- **Authentication:** Bearer JWT required
- **Tags:** System

Create a visitor log entry with a check-in time.

**Request body**

**Content-Type:** `application/json` · **Required:** yes

`VisitorLogCreateRequestRequest`

| Field | Type | Required | Description |
|---|---|---|---|
| `host_user_id` | integer | no |  |
| `id_proof_type` | string | min 1 | no |  |
| `purpose` | string | min 1 | yes |  |
| `visitor_name` | string | min 1 | yes |  |

**Responses**

- **200**: `VisitorCheckInResponse`
- **400**: `ValidationErrorResponse`
- **401**: `DetailErrorResponse`
- **403**: `DetailErrorResponse`
- **404**: `DetailErrorResponse`
- **500**: `DetailErrorResponse`

---

### POST `/api/admin-portal/visitors/{visitor_id}/checkout/`

- **Operation ID:** `VisitorCheckout`
- **Summary:** Check out a visitor
- **Authentication:** Bearer JWT required
- **Tags:** System

Stamp a check-out time on an open visitor log.

**Parameters**

| Parameter | In | Type | Required | Description |
|---|---|---|---|---|
| `visitor_id` | path | integer | yes | Visitor log id to check out. |

**Responses**

- **200**: `DetailErrorResponse`
- **400**: `ValidationErrorResponse`
- **401**: `DetailErrorResponse`
- **403**: `DetailErrorResponse`
- **404**: `DetailErrorResponse`
- **500**: `DetailErrorResponse`

---

### POST `/api/upload/`

- **Operation ID:** `FileUpload`
- **Summary:** Upload a file
- **Authentication:** Bearer JWT required
- **Tags:** System

Uploads a file to Supabase storage (or falls back to local storage) and returns the public URL. Requires authentication and a file type/size within the allowed bounds.

**Request body**

**Content-Type:** `application/json` · **Required:** yes

`FileUploadRequestRequest`

| Field | Type | Required | Description |
|---|---|---|---|
| `bucket` | any | default 'lms-resources' | no | Supabase storage bucket to upload into.  * `lms-resources` - lms-resources * `assignmentsubmissions` - assignmentsubmissions * `officialdocuments` - officialdocuments * `studentavatars` - studentavatars |
| `file` | string (binary) | yes | The file to upload (any type). |

**Responses**

- **200**: `FileUploadResponse`
- **400**: `ValidationErrorResponse`
- **401**: `DetailErrorResponse`
- **403**: `DetailErrorResponse`
- **404**: `DetailErrorResponse`
- **500**: `DetailErrorResponse`

---

### PATCH `/api/admin-portal/inventory/`

- **Operation ID:** `InventoryAdjust`
- **Summary:** Adjust stock quantity
- **Authentication:** Bearer JWT required
- **Tags:** System

Body: {id, quantity_delta} — adjusts stock up or down (never below zero).

**Request body**

**Content-Type:** `application/json` · **Required:** no

`PatchedInventoryAdjustRequestRequest`

| Field | Type | Required | Description |
|---|---|---|---|
| `id` | integer | no |  |
| `quantity_delta` | integer | no |  |

**Responses**

- **200**: `QuantityDetailResponse`
- **400**: `ValidationErrorResponse`
- **401**: `DetailErrorResponse`
- **403**: `DetailErrorResponse`
- **404**: `DetailErrorResponse`
- **500**: `DetailErrorResponse`

---

## Teacher

### GET `/api/teacher/classes/`

- **Operation ID:** `TeacherMyClasses`
- **Summary:** My classes
- **Authentication:** Bearer JWT required
- **Tags:** Teacher

Lists every class the teacher is allocated to, together with the taught subject and enrolment count.

**Responses**

- **200**: `array<TeacherClassItem>`
- **400**: `ValidationErrorResponse`
- **401**: `DetailErrorResponse`
- **403**: `DetailErrorResponse`
- **404**: `DetailErrorResponse`
- **500**: `DetailErrorResponse`

---

### GET `/api/teacher/classes/{class_id}/roster/`

- **Operation ID:** `TeacherClassRoster`
- **Summary:** Class roster
- **Authentication:** Bearer JWT required
- **Tags:** Teacher

Returns the enrolled students of a class with admission and roll numbers.

**Parameters**

| Parameter | In | Type | Required | Description |
|---|---|---|---|---|
| `class_id` | path | integer | yes |  |

**Responses**

- **200**: `array<TeacherStudentRosterItem>`
- **400**: `ValidationErrorResponse`
- **401**: `DetailErrorResponse`
- **403**: `DetailErrorResponse`
- **404**: `DetailErrorResponse`
- **500**: `DetailErrorResponse`

---

### GET `/api/teacher/contacts/`

- **Operation ID:** `TeacherMyContacts`
- **Summary:** My contacts
- **Authentication:** Bearer JWT required
- **Tags:** Teacher

Returns up to 50 portal users the teacher can message, excluding the teacher themself.

**Responses**

- **200**: `array<TeacherContactItem>`
- **400**: `ValidationErrorResponse`
- **401**: `DetailErrorResponse`
- **403**: `DetailErrorResponse`
- **404**: `DetailErrorResponse`
- **500**: `DetailErrorResponse`

---

### GET `/api/teacher/dashboard/`

- **Operation ID:** `TeacherDashboard`
- **Summary:** Teacher dashboard overview
- **Authentication:** Bearer JWT required
- **Tags:** Teacher

Returns teaching summary: class count, pending grading, upcoming exams, unread messages, today's timetable and attendance flags.

**Responses**

- **200**: `TeacherDashboard`
- **400**: `ValidationErrorResponse`
- **401**: `DetailErrorResponse`
- **403**: `DetailErrorResponse`
- **404**: `DetailErrorResponse`
- **500**: `DetailErrorResponse`

---

### GET `/api/teacher/documents/`

- **Operation ID:** `TeacherDocuments`
- **Summary:** My documents
- **Authentication:** Bearer JWT required
- **Tags:** Teacher

Returns the teaching documents uploaded by the teacher.

**Responses**

- **200**: `array<TeacherDocumentItem>`
- **400**: `ValidationErrorResponse`
- **401**: `DetailErrorResponse`
- **403**: `DetailErrorResponse`
- **404**: `DetailErrorResponse`
- **500**: `DetailErrorResponse`

---

### GET `/api/teacher/leaves/`

- **Operation ID:** `TeacherLeaveList`
- **Summary:** My leave requests
- **Authentication:** Bearer JWT required
- **Tags:** Teacher

Returns the leave requests submitted by the teacher, newest first.

**Responses**

- **200**: `array<TeacherLeaveItem>`
- **400**: `ValidationErrorResponse`
- **401**: `DetailErrorResponse`
- **403**: `DetailErrorResponse`
- **404**: `DetailErrorResponse`
- **500**: `DetailErrorResponse`

---

### GET `/api/teacher/messages/`

- **Operation ID:** `TeacherMessageThread`
- **Summary:** Message threads
- **Authentication:** Bearer JWT required
- **Tags:** Teacher

Returns the latest message with each contact, or the full thread with a specific user when `with` is supplied.

**Parameters**

| Parameter | In | Type | Required | Description |
|---|---|---|---|---|
| `with` | query | integer | no | Other user id to load the full conversation with. |

**Responses**

- **200**: `array<TeacherMessageItem>`
- **400**: `ValidationErrorResponse`
- **401**: `DetailErrorResponse`
- **403**: `DetailErrorResponse`
- **404**: `DetailErrorResponse`
- **500**: `DetailErrorResponse`

---

### GET `/api/teacher/notices/`

- **Operation ID:** `TeacherNoticeList`
- **Summary:** Published notices
- **Authentication:** Bearer JWT required
- **Tags:** Teacher

Returns published public notices from the CMS.

**Responses**

- **200**: `array<TeacherNoticeItem>`
- **400**: `ValidationErrorResponse`
- **401**: `DetailErrorResponse`
- **403**: `DetailErrorResponse`
- **404**: `DetailErrorResponse`
- **500**: `DetailErrorResponse`

---

### GET `/api/teacher/profile/`

- **Operation ID:** `TeacherProfile`
- **Summary:** Teacher profile
- **Authentication:** Bearer JWT required
- **Tags:** Teacher

Returns the authenticated teacher's profile including contact, employee and academic details.

**Responses**

- **200**: `TeacherProfile`
- **400**: `ValidationErrorResponse`
- **401**: `DetailErrorResponse`
- **403**: `DetailErrorResponse`
- **404**: `DetailErrorResponse`
- **500**: `DetailErrorResponse`

---

### POST `/api/teacher/documents/`

- **Operation ID:** `TeacherDocumentsCreate`
- **Summary:** Upload document
- **Authentication:** Bearer JWT required
- **Tags:** Teacher

Registers a teaching document (PDF, worksheet, etc.) for a class and subject.

**Request body**

**Content-Type:** `application/json` · **Required:** yes

`TeacherDocumentCreateRequestRequest`

| Field | Type | Required | Description |
|---|---|---|---|
| `class_id` | integer | nullable | no |  |
| `content_type` | string | min 1 | yes |  |
| `resource_url` | any | no |  |
| `subject_id` | integer | nullable | no |  |
| `title` | string | min 1 | yes |  |

**Responses**

- **200**: `IdDetailResponse`
- **400**: `ValidationErrorResponse`
- **401**: `DetailErrorResponse`
- **403**: `DetailErrorResponse`
- **404**: `DetailErrorResponse`
- **500**: `DetailErrorResponse`

---

### POST `/api/teacher/leaves/`

- **Operation ID:** `TeacherLeaveCreate`
- **Summary:** Submit a leave request
- **Authentication:** Bearer JWT required
- **Tags:** Teacher

Submits a new leave request on behalf of the teacher.

**Request body**

**Content-Type:** `application/json` · **Required:** yes

`LeaveRequestRequest`

| Field | Type | Required | Description |
|---|---|---|---|
| `end_date` | string (date) | yes | Leave end date (YYYY-MM-DD). |
| `leave_type` | any | yes | Type of leave.  * `Sick` - Sick * `Casual` - Casual * `Earned` - Earned * `Medical` - Medical * `Other` - Other |
| `reason` | string | min 1 | yes | Reason for leave. |
| `start_date` | string (date) | yes | Leave start date (YYYY-MM-DD). |

**Responses**

- **200**: `LeaveSubmitResponse`
- **400**: `ValidationErrorResponse`
- **401**: `DetailErrorResponse`
- **403**: `DetailErrorResponse`
- **404**: `DetailErrorResponse`
- **500**: `DetailErrorResponse`

---

### POST `/api/teacher/messages/`

- **Operation ID:** `TeacherMessageThreadSend`
- **Summary:** Send message
- **Authentication:** Bearer JWT required
- **Tags:** Teacher

Sends a message to another portal user.

**Request body**

**Content-Type:** `application/json` · **Required:** yes

`TeacherMessageSendRequestRequest`

| Field | Type | Required | Description |
|---|---|---|---|
| `message_text` | string | min 1 | yes |  |
| `receiver` | integer | yes | Recipient (auth user) id. |

**Responses**

- **200**: `IdDetailResponse`
- **400**: `ValidationErrorResponse`
- **401**: `DetailErrorResponse`
- **403**: `DetailErrorResponse`
- **404**: `DetailErrorResponse`
- **500**: `DetailErrorResponse`

---

## Timetable

### GET `/api/teacher/timetable/`

- **Operation ID:** `TeacherTimetable`
- **Summary:** My timetable
- **Authentication:** Bearer JWT required
- **Tags:** Timetable

Returns the full weekly timetable for the teacher.

**Responses**

- **200**: `array<TeacherTimetableItem>`
- **400**: `ValidationErrorResponse`
- **401**: `DetailErrorResponse`
- **403**: `DetailErrorResponse`
- **404**: `DetailErrorResponse`
- **500**: `DetailErrorResponse`

---

## Transport

### GET `/api/admin-portal/routes/`

- **Operation ID:** `AdminRouteList`
- **Summary:** List transport routes
- **Authentication:** Bearer JWT required
- **Tags:** Transport

Returns all transport route records from the portal.

**Responses**

- **200**: `array<AdminRouteItem>`
- **400**: `ValidationErrorResponse`
- **401**: `DetailErrorResponse`
- **403**: `DetailErrorResponse`
- **404**: `DetailErrorResponse`
- **500**: `DetailErrorResponse`

---

### GET `/api/admin-portal/transport-allocations/`

- **Operation ID:** `AdminTransportAllocation`
- **Summary:** List transport allocations
- **Authentication:** Bearer JWT required
- **Tags:** Transport

Returns all student-to-vehicle/route allocations from the portal.

**Responses**

- **200**: `array<AdminTransportAllocationItem>`
- **400**: `ValidationErrorResponse`
- **401**: `DetailErrorResponse`
- **403**: `DetailErrorResponse`
- **404**: `DetailErrorResponse`
- **500**: `DetailErrorResponse`

---

### GET `/api/admin-portal/vehicles/`

- **Operation ID:** `AdminVehicleList`
- **Summary:** List vehicles
- **Authentication:** Bearer JWT required
- **Tags:** Transport

Returns all transport vehicle records from the portal.

**Responses**

- **200**: `array<AdminVehicleItem>`
- **400**: `ValidationErrorResponse`
- **401**: `DetailErrorResponse`
- **403**: `DetailErrorResponse`
- **404**: `DetailErrorResponse`
- **500**: `DetailErrorResponse`

---

### GET `/api/parent/transport/`

- **Operation ID:** `ParentChildTransport`
- **Summary:** Get child transport info
- **Authentication:** Bearer JWT required
- **Tags:** Transport

Returns bus route/pickup allocation and the most recent known GPS ping for one of the parent's children.

**Parameters**

| Parameter | In | Type | Required | Description |
|---|---|---|---|---|
| `child_id` | query | integer | no | Student (auth user) id of one of the parent's children. |

**Responses**

- **200**: `ParentChildTransportResponse`
- **400**: `ValidationErrorResponse`
- **401**: `DetailErrorResponse`
- **403**: `DetailErrorResponse`
- **404**: `DetailErrorResponse`
- **500**: `DetailErrorResponse`

---

### GET `/api/student/transport/`

- **Operation ID:** `StudentTransportView`
- **Summary:** Student's current transport allocation
- **Authentication:** Bearer JWT required
- **Tags:** Transport

Return the current student's transport allocation, if any.

**Responses**

- **200**: `StudentTransportItem`
- **400**: `ValidationErrorResponse`
- **401**: `DetailErrorResponse`
- **403**: `DetailErrorResponse`
- **404**: `DetailErrorResponse`
- **500**: `DetailErrorResponse`

---

### POST `/api/admin-portal/routes/`

- **Operation ID:** `AdminRouteCreate`
- **Summary:** Create a route
- **Authentication:** Bearer JWT required
- **Tags:** Transport

Creates a new transport route record.

**Request body**

**Content-Type:** `application/json` · **Required:** yes

`AdminRouteCreateRequestRequest`

| Field | Type | Required | Description |
|---|---|---|---|
| `end_point` | string | min 1 | no |  |
| `route_name` | string | min 1 | yes |  |
| `start_point` | string | min 1 | no |  |

**Responses**

- **200**: `IdDetailResponse`
- **400**: `ValidationErrorResponse`
- **401**: `DetailErrorResponse`
- **403**: `DetailErrorResponse`
- **404**: `DetailErrorResponse`
- **500**: `DetailErrorResponse`

---

### POST `/api/admin-portal/transport-allocations/`

- **Operation ID:** `AdminTransportAllocationCreate`
- **Summary:** Create a transport allocation
- **Authentication:** Bearer JWT required
- **Tags:** Transport

Assigns a student to a vehicle and route with an optional pickup point.

**Request body**

**Content-Type:** `application/json` · **Required:** yes

`AdminTransportAllocationCreateRequestRequest`

| Field | Type | Required | Description |
|---|---|---|---|
| `pickup_point` | string | min 1 | no |  |
| `route_id` | integer | no |  |
| `student_id` | integer | yes |  |
| `vehicle_id` | integer | no |  |

**Responses**

- **200**: `IdDetailResponse`
- **400**: `ValidationErrorResponse`
- **401**: `DetailErrorResponse`
- **403**: `DetailErrorResponse`
- **404**: `DetailErrorResponse`
- **500**: `DetailErrorResponse`

---

### POST `/api/admin-portal/vehicles/`

- **Operation ID:** `AdminVehicleCreate`
- **Summary:** Create a vehicle
- **Authentication:** Bearer JWT required
- **Tags:** Transport

Creates a new transport vehicle record.

**Request body**

**Content-Type:** `application/json` · **Required:** yes

`AdminVehicleCreateRequestRequest`

| Field | Type | Required | Description |
|---|---|---|---|
| `capacity` | integer | no |  |
| `driver_id` | integer | no |  |
| `gps_device_id` | string | min 1 | no |  |
| `maintenance_status` | string | min 1 | no |  |
| `vehicle_number` | string | min 1 | yes |  |

**Responses**

- **200**: `IdDetailResponse`
- **400**: `ValidationErrorResponse`
- **401**: `DetailErrorResponse`
- **403**: `DetailErrorResponse`
- **404**: `DetailErrorResponse`
- **500**: `DetailErrorResponse`

---

### GET `/api/admin-portal/transport/attendants/`

- **Operation ID:** `AdminTransportAttendantList`
- **Summary:** List transport attendants
- **Authentication:** Bearer JWT required
- **Tags:** Transport

Returns all attendants joined with their user name and assigned route.

**Responses**

- **200**: `array<AdminTransportAttendantItem>`
- **400**: `ValidationErrorResponse`
- **401**: `DetailErrorResponse`
- **403**: `DetailErrorResponse`
- **404**: `DetailErrorResponse`
- **500**: `DetailErrorResponse`

---

### POST `/api/admin-portal/transport/attendants/`

- **Operation ID:** `AdminTransportAttendantCreate`
- **Summary:** Register an attendant
- **Authentication:** Bearer JWT required
- **Tags:** Transport

Registers an attendant (auth user id) with phone and an optional route.

**Request body**

**Content-Type:** `application/json` · **Required:** yes

`AdminTransportAttendantCreateRequestRequest`

| Field | Type | Required | Description |
|---|---|---|---|
| `user_id` | integer | yes |  |
| `phone` | string | no |  |
| `assigned_route_id` | integer | no |  |

**Responses**

- **200**: `IdDetailResponse`
- **400**: `ValidationErrorResponse`
- **401**: `DetailErrorResponse`
- **403**: `DetailErrorResponse`
- **404**: `DetailErrorResponse`
- **500**: `DetailErrorResponse`

---

### GET `/api/admin-portal/transport/drivers/`

- **Operation ID:** `AdminTransportDriverList`
- **Summary:** List transport drivers
- **Authentication:** Bearer JWT required
- **Tags:** Transport

Returns all drivers joined with their user name and assigned vehicle.

**Responses**

- **200**: `array<AdminTransportDriverItem>`
- **400**: `ValidationErrorResponse`
- **401**: `DetailErrorResponse`
- **403**: `DetailErrorResponse`
- **404**: `DetailErrorResponse`
- **500**: `DetailErrorResponse`

---

### POST `/api/admin-portal/transport/drivers/`

- **Operation ID:** `AdminTransportDriverCreate`
- **Summary:** Register a driver
- **Authentication:** Bearer JWT required
- **Tags:** Transport

Registers a driver (auth user id) with license and phone details.

**Request body**

**Content-Type:** `application/json` · **Required:** yes

`AdminTransportDriverCreateRequestRequest`

| Field | Type | Required | Description |
|---|---|---|---|
| `user_id` | integer | yes |  |
| `license_number` | string | no |  |
| `phone` | string | no |  |
| `vehicle_id` | integer | no |  |

**Responses**

- **200**: `IdDetailResponse`
- **400**: `ValidationErrorResponse`
- **401**: `DetailErrorResponse`
- **403**: `DetailErrorResponse`
- **404**: `DetailErrorResponse`
- **500**: `DetailErrorResponse`

---

### GET `/api/admin-portal/transport/live-map/`

- **Operation ID:** `AdminTransportLiveMap`
- **Summary:** Live fleet map
- **Authentication:** Bearer JWT required
- **Tags:** Transport

Returns the current vehicle fleet for the live map overlay.

**Responses**

- **200**: `array<AdminTransportLiveMapItem>`
- **400**: `ValidationErrorResponse`
- **401**: `DetailErrorResponse`
- **403**: `DetailErrorResponse`
- **404**: `DetailErrorResponse`
- **500**: `DetailErrorResponse`

---

### GET `/api/admin-portal/transport/notifications/`

- **Operation ID:** `AdminTransportAlertList`
- **Summary:** List transport alerts
- **Authentication:** Bearer JWT required
- **Tags:** Transport

Returns recent broadcast alerts, newest first.

**Responses**

- **200**: `array<AdminTransportAlertItem>`
- **400**: `ValidationErrorResponse`
- **401**: `DetailErrorResponse`
- **403**: `DetailErrorResponse`
- **404**: `DetailErrorResponse`
- **500**: `DetailErrorResponse`

---

### POST `/api/admin-portal/transport/notifications/`

- **Operation ID:** `AdminTransportAlertCreate`
- **Summary:** Broadcast a transport alert
- **Authentication:** Bearer JWT required
- **Tags:** Transport

Broadcasts an alert to students and parents on a route/vehicle (optional).

**Request body**

**Content-Type:** `application/json` · **Required:** yes

`AdminTransportAlertCreateRequestRequest`

| Field | Type | Required | Description |
|---|---|---|---|
| `type` | TypeEnum | no |  |
| `message` | string | yes |  |
| `vehicle_id` | integer | no |  |
| `route_id` | integer | no |  |

**Responses**

- **200**: `IdDetailResponse`
- **400**: `ValidationErrorResponse`
- **401**: `DetailErrorResponse`
- **403**: `DetailErrorResponse`
- **404**: `DetailErrorResponse`
- **500**: `DetailErrorResponse`

---

### GET `/api/admin-portal/transport/passes/`

- **Operation ID:** `AdminTransportPassList`
- **Summary:** List transport passes
- **Authentication:** Bearer JWT required
- **Tags:** Transport

Returns all issued passes joined with the student and allocation.

**Responses**

- **200**: `array<AdminTransportPassItem>`
- **400**: `ValidationErrorResponse`
- **401**: `DetailErrorResponse`
- **403**: `DetailErrorResponse`
- **404**: `DetailErrorResponse`
- **500**: `DetailErrorResponse`

---

### POST `/api/admin-portal/transport/passes/`

- **Operation ID:** `AdminTransportPassGenerate`
- **Summary:** Generate a transport pass
- **Authentication:** Bearer JWT required
- **Tags:** Transport

Issues a pass for a student; existing passes are returned unchanged.

**Request body**

**Content-Type:** `application/json` · **Required:** yes

`AdminTransportPassGenerateRequestRequest`

| Field | Type | Required | Description |
|---|---|---|---|
| `student_id` | integer | yes |  |

**Responses**

- **200**: `AdminTransportPassItem`
- **400**: `ValidationErrorResponse`
- **401**: `DetailErrorResponse`
- **403**: `DetailErrorResponse`
- **404**: `DetailErrorResponse`
- **500**: `DetailErrorResponse`

---

### GET `/api/admin-portal/transport/pickup-points/`

- **Operation ID:** `AdminTransportPickupPointList`
- **Summary:** List pickup points
- **Authentication:** Bearer JWT required
- **Tags:** Transport

Returns pickup/drop stops, optionally filtered by route_id, ordered by sequence.

**Parameters**

| Parameter | In | Type | Required | Description |
|---|---|---|---|---|
| `route_id` | query | integer | no |  |

**Responses**

- **200**: `array<AdminTransportPickupPointItem>`
- **400**: `ValidationErrorResponse`
- **401**: `DetailErrorResponse`
- **403**: `DetailErrorResponse`
- **404**: `DetailErrorResponse`
- **500**: `DetailErrorResponse`

---

### POST `/api/admin-portal/transport/pickup-points/`

- **Operation ID:** `AdminTransportPickupPointCreate`
- **Summary:** Add a pickup point
- **Authentication:** Bearer JWT required
- **Tags:** Transport

Adds a stop to a route with sequence order and optional times.

**Request body**

**Content-Type:** `application/json` · **Required:** yes

`AdminTransportPickupPointCreateRequestRequest`

| Field | Type | Required | Description |
|---|---|---|---|
| `route_id` | integer | yes |  |
| `name` | string | yes |  |
| `sequence_order` | integer | no |  |
| `pickup_time` | string | no |  |
| `drop_time` | string | no |  |

**Responses**

- **200**: `IdDetailResponse`
- **400**: `ValidationErrorResponse`
- **401**: `DetailErrorResponse`
- **403**: `DetailErrorResponse`
- **404**: `DetailErrorResponse`
- **500**: `DetailErrorResponse`

---

### GET `/api/admin-portal/transport/reports/`

- **Operation ID:** `AdminTransportReports`
- **Summary:** Transport overview reports
- **Authentication:** Bearer JWT required
- **Tags:** Transport

Returns vehicle/route/student counts, route utilisation and recent trips.

**Responses**

- **200**: `AdminTransportReportsResponse`
- **400**: `ValidationErrorResponse`
- **401**: `DetailErrorResponse`
- **403**: `DetailErrorResponse`
- **404**: `DetailErrorResponse`
- **500**: `DetailErrorResponse`

---

### GET `/api/admin-portal/transport/settings/`

- **Operation ID:** `AdminTransportSettingsGet`
- **Summary:** Get transport settings
- **Authentication:** Bearer JWT required
- **Tags:** Transport

Returns the transport configuration row (or defaults).

**Responses**

- **200**: `AdminTransportSettingsItem`
- **400**: `ValidationErrorResponse`
- **401**: `DetailErrorResponse`
- **403**: `DetailErrorResponse`
- **404**: `DetailErrorResponse`
- **500**: `DetailErrorResponse`

---

### POST `/api/admin-portal/transport/settings/`

- **Operation ID:** `AdminTransportSettingsSave`
- **Summary:** Save transport settings
- **Authentication:** Bearer JWT required
- **Tags:** Transport

Upserts the single transport configuration row.

**Request body**

**Content-Type:** `application/json` · **Required:** yes

`AdminTransportSettingsItemRequest`

| Field | Type | Required | Description |
|---|---|---|---|
| `contact_number` | string | no |  |
| `annual_transport_fee` | number | no |  |
| `fee_due_date` | string | no |  |
| `gps_update_interval_sec` | integer | no |  |

**Responses**

- **200**: `AdminTransportSettingsItem`
- **400**: `ValidationErrorResponse`
- **401**: `DetailErrorResponse`
- **403**: `DetailErrorResponse`
- **404**: `DetailErrorResponse`
- **500**: `DetailErrorResponse`

---

### GET `/api/admin-portal/transport/trips/`

- **Operation ID:** `AdminTransportTripList`
- **Summary:** List trips for a date
- **Authentication:** Bearer JWT required
- **Tags:** Transport

Returns the trips logged for a date (default: today).

**Parameters**

| Parameter | In | Type | Required | Description |
|---|---|---|---|---|
| `date` | query | string | no | Trip date (YYYY-MM-DD); defaults to today. |

**Responses**

- **200**: `array<AdminTransportTripItem>`
- **400**: `ValidationErrorResponse`
- **401**: `DetailErrorResponse`
- **403**: `DetailErrorResponse`
- **404**: `DetailErrorResponse`
- **500**: `DetailErrorResponse`

---

### POST `/api/admin-portal/transport/trips/`

- **Operation ID:** `AdminTransportTripCreate`
- **Summary:** Schedule a trip
- **Authentication:** Bearer JWT required
- **Tags:** Transport

Creates a scheduled trip for a vehicle (and optionally a route).

**Request body**

**Content-Type:** `application/json` · **Required:** yes

`AdminTransportTripCreateRequestRequest`

| Field | Type | Required | Description |
|---|---|---|---|
| `vehicle_id` | integer | yes |  |
| `route_id` | integer | no |  |

**Responses**

- **200**: `IdDetailResponse`
- **400**: `ValidationErrorResponse`
- **401**: `DetailErrorResponse`
- **403**: `DetailErrorResponse`
- **404**: `DetailErrorResponse`
- **500**: `DetailErrorResponse`

---

### PATCH `/api/admin-portal/transport/trips/`

- **Operation ID:** `AdminTransportTripUpdate`
- **Summary:** Update a trip status
- **Authentication:** Bearer JWT required
- **Tags:** Transport

Moves a trip through Scheduled -> In Progress -> Completed (or Cancelled).

**Request body**

**Content-Type:** `application/json` · **Required:** yes

`PatchedAdminTransportTripPatchRequestRequest`

| Field | Type | Required | Description |
|---|---|---|---|
| `id` | integer | no |  |
| `status` | string | no | Scheduled -> In Progress -> Completed (or Cancelled).

* `Scheduled` - Scheduled
* `In Progress` - In Progress
* `Completed` - Completed
* `Cancelled` - Cancelled |

**Responses**

- **200**: `IdDetailResponse`
- **400**: `ValidationErrorResponse`
- **401**: `DetailErrorResponse`
- **403**: `DetailErrorResponse`
- **404**: `DetailErrorResponse`
- **500**: `DetailErrorResponse`

---

## Website

### GET `/api/campuses/`

- **Operation ID:** `campuses_list`
- **Summary:** List campuses
- **Authentication:** Optional bearer JWT (public without it)
- **Tags:** Website

Public list of school campuses.

**Responses**

- **200**: `array<Campus>`

---

### GET `/api/campuses/nearest/`

- **Operation ID:** `campuses_nearest_retrieve`
- **Summary:** Find nearest campus
- **Authentication:** Optional bearer JWT (public without it)
- **Tags:** Website

Return the campus closest to the supplied latitude/longitude (haversine over campus coordinates). Falls back to the head office (or first campus) when coordinates are missing.

**Responses**

- **200**: `Campus`

---

### GET `/api/campuses/{id}/`

- **Operation ID:** `campuses_retrieve_item`
- **Summary:** Get a campus
- **Authentication:** Optional bearer JWT (public without it)
- **Tags:** Website

Retrieve a single campus by id.

**Parameters**

| Parameter | In | Type | Required | Description |
|---|---|---|---|---|
| `id` | path | integer | yes | A unique integer value identifying this campus. |

**Responses**

- **200**: `Campus`

---

### GET `/api/cms/academic-programs/`

- **Operation ID:** `WebsiteAcademicProgramList`
- **Summary:** List academic programs
- **Authentication:** Optional bearer JWT (public without it)
- **Tags:** Website

Public list of academic programs offered by the school.

**Parameters**

| Parameter | In | Type | Required | Description |
|---|---|---|---|---|
| `page` | query | integer | no | A page number within the paginated result set. |

**Responses**

- **200**: `PaginatedAcademicProgramList`

---

### GET `/api/cms/academic-programs/{id}/`

- **Operation ID:** `WebsiteAcademicProgramRetrieve`
- **Summary:** Get an academic program
- **Authentication:** Optional bearer JWT (public without it)
- **Tags:** Website

Retrieve a single academic program by id.

**Parameters**

| Parameter | In | Type | Required | Description |
|---|---|---|---|---|
| `id` | path | integer | yes | A unique integer value identifying this academic program. |

**Responses**

- **200**: `AcademicProgram`

---

### GET `/api/cms/achievements/`

- **Operation ID:** `WebsiteAchievementList`
- **Summary:** List achievements
- **Authentication:** Optional bearer JWT (public without it)
- **Tags:** Website

Public list of school achievements.

**Parameters**

| Parameter | In | Type | Required | Description |
|---|---|---|---|---|
| `page` | query | integer | no | A page number within the paginated result set. |

**Responses**

- **200**: `PaginatedAchievementList`

---

### GET `/api/cms/achievements/{id}/`

- **Operation ID:** `WebsiteAchievementRetrieve`
- **Summary:** Get an achievement
- **Authentication:** Optional bearer JWT (public without it)
- **Tags:** Website

Retrieve a single achievement by id.

**Parameters**

| Parameter | In | Type | Required | Description |
|---|---|---|---|---|
| `id` | path | integer | yes | A unique integer value identifying this achievement. |

**Responses**

- **200**: `Achievement`

---

### GET `/api/cms/campuses/`

- **Operation ID:** `cms_campuses_list`
- **Summary:** List campuses
- **Authentication:** Optional bearer JWT (public without it)
- **Tags:** Website

Public list of school campuses.

**Responses**

- **200**: `array<Campus>`

---

### GET `/api/cms/campuses/nearest/`

- **Operation ID:** `cms_campuses_nearest_retrieve`
- **Summary:** Find nearest campus
- **Authentication:** Optional bearer JWT (public without it)
- **Tags:** Website

Return the campus closest to the supplied latitude/longitude (haversine over campus coordinates). Falls back to the head office (or first campus) when coordinates are missing.

**Responses**

- **200**: `Campus`

---

### GET `/api/cms/campuses/{id}/`

- **Operation ID:** `cms_campuses_retrieve_item`
- **Summary:** Get a campus
- **Authentication:** Optional bearer JWT (public without it)
- **Tags:** Website

Retrieve a single campus by id.

**Parameters**

| Parameter | In | Type | Required | Description |
|---|---|---|---|---|
| `id` | path | integer | yes | A unique integer value identifying this campus. |

**Responses**

- **200**: `Campus`

---

### GET `/api/cms/departments/`

- **Operation ID:** `WebsiteDepartmentList`
- **Summary:** List departments
- **Authentication:** Optional bearer JWT (public without it)
- **Tags:** Website

Public list of school departments.

**Parameters**

| Parameter | In | Type | Required | Description |
|---|---|---|---|---|
| `page` | query | integer | no | A page number within the paginated result set. |

**Responses**

- **200**: `PaginatedDepartmentList`

---

### GET `/api/cms/departments/{id}/`

- **Operation ID:** `WebsiteDepartmentRetrieve`
- **Summary:** Get a department
- **Authentication:** Optional bearer JWT (public without it)
- **Tags:** Website

Retrieve a single department by id.

**Parameters**

| Parameter | In | Type | Required | Description |
|---|---|---|---|---|
| `id` | path | integer | yes | A unique integer value identifying this department. |

**Responses**

- **200**: `Department`

---

### GET `/api/cms/documents/`

- **Operation ID:** `WebsiteDocumentList`
- **Summary:** List documents
- **Authentication:** Optional bearer JWT (public without it)
- **Tags:** Website

Public list of downloadable documents, optionally filtered by audience.

**Parameters**

| Parameter | In | Type | Required | Description |
|---|---|---|---|---|
| `audience` | query | string | no | Filter documents by audience (e.g. students, teachers, parents). |
| `page` | query | integer | no | A page number within the paginated result set. |

**Responses**

- **200**: `PaginatedDocumentList`

---

### GET `/api/cms/documents/{id}/`

- **Operation ID:** `WebsiteDocumentRetrieve`
- **Summary:** Get a document
- **Authentication:** Optional bearer JWT (public without it)
- **Tags:** Website

Retrieve a single document by id.

**Parameters**

| Parameter | In | Type | Required | Description |
|---|---|---|---|---|
| `id` | path | integer | yes | A unique integer value identifying this document. |

**Responses**

- **200**: `Document`

---

### GET `/api/cms/events/`

- **Operation ID:** `WebsiteEventList`
- **Summary:** List events
- **Authentication:** Optional bearer JWT (public without it)
- **Tags:** Website

Public list of school events.

**Parameters**

| Parameter | In | Type | Required | Description |
|---|---|---|---|---|
| `page` | query | integer | no | A page number within the paginated result set. |

**Responses**

- **200**: `PaginatedEventList`

---

### GET `/api/cms/events/{id}/`

- **Operation ID:** `WebsiteEventRetrieve`
- **Summary:** Get an event
- **Authentication:** Optional bearer JWT (public without it)
- **Tags:** Website

Retrieve a single event by id.

**Parameters**

| Parameter | In | Type | Required | Description |
|---|---|---|---|---|
| `id` | path | integer | yes | A unique integer value identifying this event. |

**Responses**

- **200**: `Event`

---

### GET `/api/cms/faculty/`

- **Operation ID:** `cms_faculty_list`
- **Summary:** List faculty members
- **Authentication:** Optional bearer JWT (public without it)
- **Tags:** Website

Public list of active faculty members for the website faculty directory.

**Parameters**

| Parameter | In | Type | Required | Description |
|---|---|---|---|---|
| `page` | query | integer | no | A page number within the paginated result set. |

**Responses**

- **200**: `PaginatedFacultyMemberList`

---

### GET `/api/cms/faculty/{id}/`

- **Operation ID:** `cms_faculty_retrieve_item`
- **Summary:** Get a faculty member
- **Authentication:** Optional bearer JWT (public without it)
- **Tags:** Website

Retrieve a single faculty member by id.

**Parameters**

| Parameter | In | Type | Required | Description |
|---|---|---|---|---|
| `id` | path | integer | yes | A unique integer value identifying this faculty member. |

**Responses**

- **200**: `FacultyMember`

---

### GET `/api/cms/faqs/`

- **Operation ID:** `WebsiteFaqList`
- **Summary:** List FAQs
- **Authentication:** Optional bearer JWT (public without it)
- **Tags:** Website

Public list of frequently asked questions.

**Parameters**

| Parameter | In | Type | Required | Description |
|---|---|---|---|---|
| `page` | query | integer | no | A page number within the paginated result set. |

**Responses**

- **200**: `PaginatedFAQList`

---

### GET `/api/cms/faqs/{id}/`

- **Operation ID:** `WebsiteFaqRetrieve`
- **Summary:** Get an FAQ
- **Authentication:** Optional bearer JWT (public without it)
- **Tags:** Website

Retrieve a single FAQ by id.

**Parameters**

| Parameter | In | Type | Required | Description |
|---|---|---|---|---|
| `id` | path | integer | yes | A unique integer value identifying this FAQ. |

**Responses**

- **200**: `FAQ`

---

### GET `/api/cms/gallery-albums/`

- **Operation ID:** `WebsiteGalleryAlbumList`
- **Summary:** List gallery albums
- **Authentication:** Optional bearer JWT (public without it)
- **Tags:** Website

Public list of photo gallery albums.

**Parameters**

| Parameter | In | Type | Required | Description |
|---|---|---|---|---|
| `page` | query | integer | no | A page number within the paginated result set. |

**Responses**

- **200**: `PaginatedGalleryAlbumList`

---

### GET `/api/cms/gallery-albums/{id}/`

- **Operation ID:** `WebsiteGalleryAlbumRetrieve`
- **Summary:** Get a gallery album
- **Authentication:** Optional bearer JWT (public without it)
- **Tags:** Website

Retrieve a single gallery album by id.

**Parameters**

| Parameter | In | Type | Required | Description |
|---|---|---|---|---|
| `id` | path | integer | yes | A unique integer value identifying this gallery album. |

**Responses**

- **200**: `GalleryAlbum`

---

### GET `/api/cms/gallery-images/`

- **Operation ID:** `WebsiteGalleryImageList`
- **Summary:** List gallery images
- **Authentication:** Optional bearer JWT (public without it)
- **Tags:** Website

Public list of gallery images.

**Parameters**

| Parameter | In | Type | Required | Description |
|---|---|---|---|---|
| `page` | query | integer | no | A page number within the paginated result set. |

**Responses**

- **200**: `PaginatedGalleryImageList`

---

### GET `/api/cms/gallery-images/{id}/`

- **Operation ID:** `WebsiteGalleryImageRetrieve`
- **Summary:** Get a gallery image
- **Authentication:** Optional bearer JWT (public without it)
- **Tags:** Website

Retrieve a single gallery image by id.

**Parameters**

| Parameter | In | Type | Required | Description |
|---|---|---|---|---|
| `id` | path | integer | yes | A unique integer value identifying this gallery image. |

**Responses**

- **200**: `GalleryImage`

---

### GET `/api/cms/jobs/`

- **Operation ID:** `WebsiteJobList`
- **Summary:** List open jobs
- **Authentication:** Optional bearer JWT (public without it)
- **Tags:** Website

Public list of currently open job postings.

**Parameters**

| Parameter | In | Type | Required | Description |
|---|---|---|---|---|
| `page` | query | integer | no | A page number within the paginated result set. |

**Responses**

- **200**: `PaginatedJobPostingList`

---

### GET `/api/cms/jobs/{id}/`

- **Operation ID:** `WebsiteJobRetrieve`
- **Summary:** Get a job posting
- **Authentication:** Optional bearer JWT (public without it)
- **Tags:** Website

Retrieve a single open job posting by id.

**Parameters**

| Parameter | In | Type | Required | Description |
|---|---|---|---|---|
| `id` | path | integer | yes | A unique integer value identifying this job posting. |

**Responses**

- **200**: `JobPosting`

---

### GET `/api/cms/leadership/`

- **Operation ID:** `WebsiteLeadershipList`
- **Summary:** List leadership members
- **Authentication:** Optional bearer JWT (public without it)
- **Tags:** Website

Public list of school leadership team members.

**Parameters**

| Parameter | In | Type | Required | Description |
|---|---|---|---|---|
| `page` | query | integer | no | A page number within the paginated result set. |

**Responses**

- **200**: `PaginatedLeadershipMemberList`

---

### GET `/api/cms/leadership/{id}/`

- **Operation ID:** `WebsiteLeadershipRetrieve`
- **Summary:** Get a leadership member
- **Authentication:** Optional bearer JWT (public without it)
- **Tags:** Website

Retrieve a single leadership member by id.

**Parameters**

| Parameter | In | Type | Required | Description |
|---|---|---|---|---|
| `id` | path | integer | yes | A unique integer value identifying this leadership member. |

**Responses**

- **200**: `LeadershipMember`

---

### GET `/api/cms/news/`

- **Operation ID:** `WebsiteNewsList`
- **Summary:** List published news
- **Authentication:** Optional bearer JWT (public without it)
- **Tags:** Website

Public list of published news posts (lookup by slug).

**Parameters**

| Parameter | In | Type | Required | Description |
|---|---|---|---|---|
| `page` | query | integer | no | A page number within the paginated result set. |

**Responses**

- **200**: `PaginatedNewsPostList`

---

### GET `/api/cms/news/{slug}/`

- **Operation ID:** `WebsiteNewsRetrieve`
- **Summary:** Get a news post
- **Authentication:** Optional bearer JWT (public without it)
- **Tags:** Website

Retrieve a single published news post by its slug.

**Parameters**

| Parameter | In | Type | Required | Description |
|---|---|---|---|---|
| `slug` | path | string | yes |  |

**Responses**

- **200**: `NewsPost`

---

### GET `/api/cms/pages/`

- **Operation ID:** `WebsitePageList`
- **Summary:** List CMS pages
- **Authentication:** Optional bearer JWT (public without it)
- **Tags:** Website

Public list of CMS pages (lookup by slug).

**Parameters**

| Parameter | In | Type | Required | Description |
|---|---|---|---|---|
| `page` | query | integer | no | A page number within the paginated result set. |

**Responses**

- **200**: `PaginatedCMSPageList`

---

### GET `/api/cms/pages/{slug}/`

- **Operation ID:** `WebsitePageRetrieve`
- **Summary:** Get a CMS page
- **Authentication:** Optional bearer JWT (public without it)
- **Tags:** Website

Retrieve a single CMS page by its slug.

**Parameters**

| Parameter | In | Type | Required | Description |
|---|---|---|---|---|
| `slug` | path | string | yes |  |

**Responses**

- **200**: `CMSPage`

---

### GET `/api/cms/scholarships/`

- **Operation ID:** `WebsiteScholarshipList`
- **Summary:** List scholarships
- **Authentication:** Optional bearer JWT (public without it)
- **Tags:** Website

Public list of available scholarships.

**Parameters**

| Parameter | In | Type | Required | Description |
|---|---|---|---|---|
| `page` | query | integer | no | A page number within the paginated result set. |

**Responses**

- **200**: `PaginatedScholarshipInfoList`

---

### GET `/api/cms/scholarships/{id}/`

- **Operation ID:** `WebsiteScholarshipRetrieve`
- **Summary:** Get a scholarship
- **Authentication:** Optional bearer JWT (public without it)
- **Tags:** Website

Retrieve a single scholarship by id.

**Parameters**

| Parameter | In | Type | Required | Description |
|---|---|---|---|---|
| `id` | path | integer | yes | A unique integer value identifying this scholarship info. |

**Responses**

- **200**: `ScholarshipInfo`

---

### GET `/api/cms/settings/`

- **Operation ID:** `WebsiteSchoolSettingsList`
- **Summary:** List school settings
- **Authentication:** Optional bearer JWT (public without it)
- **Tags:** Website

Public school-wide settings (name, contact, social links, etc.).

**Parameters**

| Parameter | In | Type | Required | Description |
|---|---|---|---|---|
| `page` | query | integer | no | A page number within the paginated result set. |

**Responses**

- **200**: `PaginatedSchoolSettingsList`

---

### GET `/api/cms/settings/{id}/`

- **Operation ID:** `WebsiteSchoolSettingsRetrieve`
- **Summary:** Get school settings
- **Authentication:** Optional bearer JWT (public without it)
- **Tags:** Website

Retrieve a single school settings record by id.

**Parameters**

| Parameter | In | Type | Required | Description |
|---|---|---|---|---|
| `id` | path | integer | yes | A unique integer value identifying this school settings. |

**Responses**

- **200**: `SchoolSettings`

---

### GET `/api/cms/stats/`

- **Operation ID:** `WebsiteStatList`
- **Summary:** List school stats
- **Authentication:** Optional bearer JWT (public without it)
- **Tags:** Website

Public list of headline school statistics (e.g. students, teachers).

**Parameters**

| Parameter | In | Type | Required | Description |
|---|---|---|---|---|
| `page` | query | integer | no | A page number within the paginated result set. |

**Responses**

- **200**: `PaginatedSchoolStatList`

---

### GET `/api/cms/stats/{id}/`

- **Operation ID:** `WebsiteStatRetrieve`
- **Summary:** Get a school stat
- **Authentication:** Optional bearer JWT (public without it)
- **Tags:** Website

Retrieve a single school statistic by id.

**Parameters**

| Parameter | In | Type | Required | Description |
|---|---|---|---|---|
| `id` | path | integer | yes | A unique integer value identifying this school stat. |

**Responses**

- **200**: `SchoolStat`

---

### GET `/api/cms/tech-partners/`

- **Operation ID:** `WebsiteTechPartnerList`
- **Summary:** List technology partners
- **Authentication:** Optional bearer JWT (public without it)
- **Tags:** Website

Public list of the school's technology partners.

**Parameters**

| Parameter | In | Type | Required | Description |
|---|---|---|---|---|
| `page` | query | integer | no | A page number within the paginated result set. |

**Responses**

- **200**: `PaginatedTechnologyPartnerList`

---

### GET `/api/cms/tech-partners/{id}/`

- **Operation ID:** `WebsiteTechPartnerRetrieve`
- **Summary:** Get a technology partner
- **Authentication:** Optional bearer JWT (public without it)
- **Tags:** Website

Retrieve a single technology partner by id.

**Parameters**

| Parameter | In | Type | Required | Description |
|---|---|---|---|---|
| `id` | path | integer | yes | A unique integer value identifying this technology partner. |

**Responses**

- **200**: `TechnologyPartner`

---

### GET `/api/cms/testimonials/`

- **Operation ID:** `WebsiteTestimonialList`
- **Summary:** List featured testimonials
- **Authentication:** Optional bearer JWT (public without it)
- **Tags:** Website

Public list of featured testimonials.

**Parameters**

| Parameter | In | Type | Required | Description |
|---|---|---|---|---|
| `page` | query | integer | no | A page number within the paginated result set. |

**Responses**

- **200**: `PaginatedTestimonialList`

---

### GET `/api/cms/testimonials/{id}/`

- **Operation ID:** `WebsiteTestimonialRetrieve`
- **Summary:** Get a testimonial
- **Authentication:** Optional bearer JWT (public without it)
- **Tags:** Website

Retrieve a single testimonial by id.

**Parameters**

| Parameter | In | Type | Required | Description |
|---|---|---|---|---|
| `id` | path | integer | yes | A unique integer value identifying this testimonial. |

**Responses**

- **200**: `Testimonial`

---

### GET `/api/cms/why-choose/`

- **Operation ID:** `WebsiteWhyChooseList`
- **Summary:** List 'Why choose us' items
- **Authentication:** Optional bearer JWT (public without it)
- **Tags:** Website

Public list of the reasons to choose the school.

**Parameters**

| Parameter | In | Type | Required | Description |
|---|---|---|---|---|
| `page` | query | integer | no | A page number within the paginated result set. |

**Responses**

- **200**: `PaginatedWhyChooseItemList`

---

### GET `/api/cms/why-choose/{id}/`

- **Operation ID:** `WebsiteWhyChooseRetrieve`
- **Summary:** Get a 'Why choose us' item
- **Authentication:** Optional bearer JWT (public without it)
- **Tags:** Website

Retrieve a single 'Why choose us' item by id.

**Parameters**

| Parameter | In | Type | Required | Description |
|---|---|---|---|---|
| `id` | path | integer | yes | A unique integer value identifying this why choose item. |

**Responses**

- **200**: `WhyChooseItem`

---

### GET `/api/website/classes/`

- **Operation ID:** `WebsiteClassesList`
- **Summary:** List classes
- **Authentication:** Optional bearer JWT (public without it)
- **Tags:** Website

Classes offered by the school, with section, curriculum and subject count.

**Responses**

- **200** — No response body

---

### GET `/api/website/classes/{id}/`

- **Operation ID:** `WebsiteClassRetrieve`
- **Summary:** Get class details
- **Authentication:** Optional bearer JWT (public without it)
- **Tags:** Website

One class including its mapped subjects.

**Parameters**

| Parameter | In | Type | Required | Description |
|---|---|---|---|---|
| `id` | path | integer | yes |  |

**Responses**

- **200** — No response body

---

### GET `/api/website/faculty/`

- **Operation ID:** `website_faculty_list`
- **Summary:** List faculty members
- **Authentication:** Optional bearer JWT (public without it)
- **Tags:** Website

Public list of active faculty members for the website faculty directory.

**Parameters**

| Parameter | In | Type | Required | Description |
|---|---|---|---|---|
| `page` | query | integer | no | A page number within the paginated result set. |

**Responses**

- **200**: `PaginatedFacultyMemberList`

---

### GET `/api/website/faculty/{id}/`

- **Operation ID:** `website_faculty_retrieve_item`
- **Summary:** Get a faculty member
- **Authentication:** Optional bearer JWT (public without it)
- **Tags:** Website

Retrieve a single faculty member by id.

**Parameters**

| Parameter | In | Type | Required | Description |
|---|---|---|---|---|
| `id` | path | integer | yes | A unique integer value identifying this faculty member. |

**Responses**

- **200**: `FacultyMember`

---

### GET `/api/website/levels/`

- **Operation ID:** `WebsiteLevelsList`
- **Summary:** List academic levels
- **Authentication:** Optional bearer JWT (public without it)
- **Tags:** Website

Academic levels (Pre-Primary, Primary, Middle, Secondary, Senior Secondary) for the Classes filter.

**Responses**

- **200** — No response body

---

### GET `/api/website/stats/`

- **Operation ID:** `WebsiteStatsGet`
- **Summary:** Get website headline stats
- **Authentication:** Optional bearer JWT (public without it)
- **Tags:** Website

Aggregate counts used by the public website: active faculty, classes, subjects and students.

**Responses**

- **200** — No response body

---

### GET `/api/website/subjects/`

- **Operation ID:** `WebsiteSubjectsList`
- **Summary:** List subjects
- **Authentication:** Optional bearer JWT (public without it)
- **Tags:** Website

Subjects taught at the school with their type (Theory/Practical/Language/Elective).

**Responses**

- **200** — No response body

---

### GET `/api/website/subjects/{id}/`

- **Operation ID:** `WebsiteSubjectRetrieve`
- **Summary:** Get subject details
- **Authentication:** Optional bearer JWT (public without it)
- **Tags:** Website

One subject including the classes it is taught in.

**Parameters**

| Parameter | In | Type | Required | Description |
|---|---|---|---|---|
| `id` | path | integer | yes |  |

**Responses**

- **200** — No response body

---

### POST `/api/campuses/visit/`

- **Operation ID:** `WebsiteCampusVisitCreate`
- **Summary:** Schedule a campus visit
- **Authentication:** Optional bearer JWT (public without it)
- **Tags:** Website

Public endpoint: the Contact page's 'Schedule Campus Visit' modal posts a booking request here.

**Request body**

**Content-Type:** `application/json` · **Required:** yes

`CampusVisitBookingRequest`

| Field | Type | Required | Description |
|---|---|---|---|
| `campus_id` | string | max 50 | no |  |
| `purpose` | string | no |  |
| `visit_date` | string (date) | nullable | no |  |
| `visit_time` | string | max 30 | no |  |
| `visitor_email` | string (email) | max 254, min 1 | yes |  |
| `visitor_name` | string | max 150, min 1 | yes |  |
| `visitor_phone` | string | max 20, min 1 | yes |  |

**Responses**

- **201** — No response body

---

### POST `/api/cms/contact/`

- **Operation ID:** `WebsiteContactCreate`
- **Summary:** Submit a contact enquiry
- **Authentication:** Optional bearer JWT (public without it)
- **Tags:** Website

Public write-only endpoint: the contact page posts an enquiry here.

**Request body**

**Content-Type:** `application/json` · **Required:** yes

`ContactSubmissionRequest`

| Field | Type | Required | Description |
|---|---|---|---|
| `email` | string (email) | max 254, min 1 | yes |  |
| `message` | string | max 5000, min 1 | yes |  |
| `name` | string | max 150, min 1 | yes |  |
| `phone` | string | max 20 | no |  |

**Responses**

- **201**: `ContactSubmission`

---

### POST `/api/cms/jobs/apply/`

- **Operation ID:** `WebsiteJobApplyByPosting`
- **Summary:** Apply to a job posting (by id in body)
- **Authentication:** Optional bearer JWT (public without it)
- **Tags:** Website

Submit a job application where the job_posting id is sent in the request body.

**Request body**

**Content-Type:** `application/json` · **Required:** yes

`JobApplicationRequest`

| Field | Type | Required | Description |
|---|---|---|---|
| `applicant_name` | string | max 150, min 1 | yes |  |
| `cover_letter` | string | no |  |
| `email` | string (email) | max 254, min 1 | yes |  |
| `job_posting` | integer | yes |  |
| `phone` | string | max 20, min 1 | yes |  |
| `resume_file` | string (binary) | nullable | no |  |

**Responses**

- **201** — No response body

---

### POST `/api/cms/jobs/{id}/apply/`

- **Operation ID:** `WebsiteJobApply`
- **Summary:** Apply to a job posting
- **Authentication:** Optional bearer JWT (public without it)
- **Tags:** Website

Public endpoint: submit a job application (name, email, phone, cover letter, resume file) for a specific open job posting.

**Parameters**

| Parameter | In | Type | Required | Description |
|---|---|---|---|---|
| `id` | path | integer | yes | A unique integer value identifying this job posting. |

**Request body**

**Content-Type:** `application/json` · **Required:** yes

`JobApplicationRequest`

| Field | Type | Required | Description |
|---|---|---|---|
| `applicant_name` | string | max 150, min 1 | yes |  |
| `cover_letter` | string | no |  |
| `email` | string (email) | max 254, min 1 | yes |  |
| `job_posting` | integer | yes |  |
| `phone` | string | max 20, min 1 | yes |  |
| `resume_file` | string (binary) | nullable | no |  |

**Responses**

- **201** — No response body

---

### POST `/api/website/contact/`

- **Operation ID:** `WebsiteContactCreateV2`
- **Summary:** Submit a contact enquiry (website namespace)
- **Authentication:** Optional bearer JWT (public without it)
- **Tags:** Website

Public write-only endpoint: the website contact form POSTs here.

**Request body**

**Content-Type:** `application/json` · **Required:** yes

`ContactSubmissionRequest`

| Field | Type | Required | Description |
|---|---|---|---|
| `email` | string (email) | max 254, min 1 | yes |  |
| `message` | string | max 5000, min 1 | yes |  |
| `name` | string | max 150, min 1 | yes |  |
| `phone` | string | max 20 | no |  |

**Responses**

- **201**: `ContactSubmission`

---

## Schemas (components)

### `AcademicProgram`

| Field | Type | Required | Description |
|---|---|---|---|
| `description` | string | no |  |
| `id` | integer | read-only | yes |  |
| `name` | string | max 150 | yes |  |
| `sort_order` | integer (int64) | min 0, max 9223372036854775807 | no |  |

### `Achievement`

| Field | Type | Required | Description |
|---|---|---|---|
| `achievement_date` | string (date) | yes |  |
| `cover_image` | string (uri) | nullable | no |  |
| `description` | string | no |  |
| `id` | integer | read-only | yes |  |
| `title` | string | max 255 | yes |  |

### `AdminAdmissionActionRequestActionEnum`

*No properties.*

### `AdminAdmissionActionRequestRequest`

| Field | Type | Required | Description |
|---|---|---|---|
| `action` | any | yes | 'advance' moves the application forward; 'reject' refuses it.  * `advance` - advance * `reject` - reject |
| `reason` | string | min 1 | no | Rejection reason (required when action='reject'). |

### `AdminAdmissionActionResponse`

| Field | Type | Required | Description |
|---|---|---|---|
| `credentials` | AdminCredentialsPayload | yes |  |
| `status` | string | yes |  |

### `AdminAdmissionCreateRequestRequest`

| Field | Type | Required | Description |
|---|---|---|---|
| `address` | string | min 1 | no |  |
| `applicant_name` | string | min 1 | yes | Full name of the applicant. |
| `date_of_birth` | string (date) | no |  |
| `gender` | any | default 'Male' | no |  |
| `parent_email` | string (email) | min 1 | no |  |
| `parent_name` | string | min 1 | no |  |
| `parent_phone` | string | min 1 | no |  |
| `scholarship_applied` | boolean | default False | no |  |
| `target_class` | string | min 1 | yes |  |

### `AdminAdmissionCreateResponse`

| Field | Type | Required | Description |
|---|---|---|---|
| `detail` | string | yes |  |
| `registration_number` | string | yes |  |

### `AdminAdmissionListItem`

| Field | Type | Required | Description |
|---|---|---|---|
| `applicant_name` | string | no |  |
| `date_of_birth` | string (date) | no |  |
| `gender` | string | no |  |
| `parent_email` | string (email) | no |  |
| `parent_name` | string | no |  |
| `parent_phone` | string | no |  |
| `registration_number` | string | no |  |
| `rejection_reason` | string | no |  |
| `scholarship_applied` | boolean | no |  |
| `status` | string | no |  |
| `submitted_at` | string (date-time) | no |  |
| `target_class` | string | no |  |

### `AdminAssignedSubject`

| Field | Type | Required | Description |
|---|---|---|---|
| `id` | integer | no |  |
| `name` | string | no |  |

### `AdminAuditLogItem`

| Field | Type | Required | Description |
|---|---|---|---|
| `action` | string | no |  |
| `actor_name` | string | no |  |
| `created_at` | string (date-time) | no |  |
| `details` | any | no |  |
| `id` | integer | no |  |
| `target_id` | string | no |  |
| `target_type` | string | no |  |

### `AdminBackupExportResponse`

| Field | Type | Required | Description |
|---|---|---|---|
| `generated_at` | string (date) | no |  |
| `tables` | object | no |  |

### `AdminBookCreateRequestRequest`

| Field | Type | Required | Description |
|---|---|---|---|
| `author` | string | min 1 | no |  |
| `available_quantity` | integer | no |  |
| `barcode_id` | string | min 1 | no |  |
| `book_type` | string | min 1 | no |  |
| `digital_file_url` | string (uri) | min 1 | no |  |
| `isbn` | string | min 1 | no |  |
| `quantity` | integer | no |  |
| `title` | string | min 1 | yes |  |

### `AdminBookItem`

| Field | Type | Required | Description |
|---|---|---|---|
| `author` | string | no |  |
| `available_quantity` | integer | no |  |
| `barcode_id` | string | no |  |
| `book_type` | string | no |  |
| `digital_file_url` | string (uri) | no |  |
| `id` | integer | no |  |
| `isbn` | string | no |  |
| `quantity` | integer | no |  |
| `title` | string | no |  |

### `AdminClassCreateRequestRequest`

| Field | Type | Required | Description |
|---|---|---|---|
| `curriculum` | string | min 1 | no |  |
| `name` | string | min 1 | yes |  |
| `room_number` | string | min 1 | no |  |
| `section` | string | min 1 | yes |  |

### `AdminClassItem`

| Field | Type | Required | Description |
|---|---|---|---|
| `curriculum` | string | no |  |
| `id` | integer | no |  |
| `name` | string | no |  |
| `room_number` | string | no |  |
| `section` | string | no |  |

### `AdminClassTeacherAssignRequestRequest`

| Field | Type | Required | Description |
|---|---|---|---|
| `class_id` | integer | yes |  |
| `subject_id` | integer | no |  |
| `teacher_id` | integer | yes |  |

### `AdminClassTeacherAssignResponse`

| Field | Type | Required | Description |
|---|---|---|---|
| `detail` | string | yes |  |

### `AdminClassTeacherListItem`

| Field | Type | Required | Description |
|---|---|---|---|
| `assigned_subjects` | array<AdminAssignedSubject> | no |  |
| `class_id` | integer | no |  |
| `class_name` | string | no |  |
| `teacher_id` | integer | no |  |
| `teacher_name` | string | no |  |

### `AdminContactMessageItem`

| Field | Type | Required | Description |
|---|---|---|---|
| `email` | string | no |  |
| `id` | integer | no |  |
| `is_resolved` | boolean | no |  |
| `message` | string | no |  |
| `name` | string | no |  |
| `phone` | string | no |  |
| `submitted_at` | string | no |  |

### `AdminCredentialsPayload`

| Field | Type | Required | Description |
|---|---|---|---|
| `parent_account_reused` | boolean | no |  |
| `parent_temp_password` | string | no |  |
| `parent_username` | string | yes |  |
| `student_temp_password` | string | yes |  |
| `student_username` | string | yes |  |

### `AdminDashboardResponse`

| Field | Type | Required | Description |
|---|---|---|---|
| `fee_collected_this_month` | number | no |  |
| `library_books_out` | integer | no |  |
| `open_leaves` | integer | no |  |
| `pending_admissions` | integer | no |  |
| `recent_admissions` | array<AdminRecentAdmissionItem> | no |  |
| `total_employees` | integer | no |  |
| `total_parents` | integer | no |  |
| `total_students` | integer | no |  |
| `total_teachers` | integer | no |  |

### `AdminEnrollmentCreateRequestRequest`

| Field | Type | Required | Description |
|---|---|---|---|
| `academic_year` | string | min 1, default '2025-26' | no |  |
| `class_id` | integer | yes |  |
| `roll_number` | integer | no |  |
| `student_id` | integer | yes |  |

### `AdminEnrollmentCreateResponse`

| Field | Type | Required | Description |
|---|---|---|---|
| `detail` | string | yes |  |
| `id` | integer | yes |  |

### `AdminEnrollmentListItem`

| Field | Type | Required | Description |
|---|---|---|---|
| `academic_year` | string | no |  |
| `class_id` | integer | no |  |
| `class_name` | string | no |  |
| `id` | integer | no |  |
| `roll_number` | integer | no |  |
| `student_id` | integer | no |  |
| `student_name` | string | no |  |
| `student_username` | string | no |  |

### `AdminFeeStructureCreateRequestRequest`

| Field | Type | Required | Description |
|---|---|---|---|
| `class_id` | integer | yes |  |
| `hostel_fee` | number | no |  |
| `term_name` | string | min 1 | yes |  |
| `total_amount` | number | no |  |
| `transport_fee` | number | no |  |
| `tuition_fee` | number | no |  |

### `AdminFeeStructureItem`

| Field | Type | Required | Description |
|---|---|---|---|
| `class_id` | integer | no |  |
| `hostel_fee` | number | no |  |
| `id` | integer | no |  |
| `term_name` | string | no |  |
| `total_amount` | number | no |  |
| `transport_fee` | number | no |  |
| `tuition_fee` | number | no |  |

### `AdminLeaveDecideRequestRequest`

| Field | Type | Required | Description |
|---|---|---|---|
| `decision` | any | yes | Decision to apply to the leave request.  * `Approved` - Approved * `Rejected` - Rejected |

### `AdminLeaveDecideResponse`

| Field | Type | Required | Description |
|---|---|---|---|
| `detail` | string | yes |  |

### `AdminLeaveItem`

| Field | Type | Required | Description |
|---|---|---|---|
| `applicant_name` | string | no |  |
| `end_date` | string (date) | no |  |
| `id` | integer | no |  |
| `leave_type` | string | no |  |
| `reason` | string | no |  |
| `start_date` | string (date) | no |  |
| `status` | string | no |  |

### `AdminLibraryIssueRequestRequest`

| Field | Type | Required | Description |
|---|---|---|---|
| `book_id` | integer | yes |  |
| `borrower_id` | integer | yes |  |
| `loan_days` | integer | default 14 | no |  |

### `AdminLibraryIssueResponse`

| Field | Type | Required | Description |
|---|---|---|---|
| `detail` | string | yes |  |
| `due_date` | string (date) | yes |  |
| `id` | integer | yes |  |

### `AdminLibraryReturnResponse`

| Field | Type | Required | Description |
|---|---|---|---|
| `detail` | string | yes |  |
| `fine_amount` | integer | yes |  |
| `late_days` | integer | yes |  |

### `AdminLmsAnalyticsResponse`

| Field | Type | Required | Description |
|---|---|---|---|
| `stats` | AdminLmsAnalyticsStats | yes |  |
| `uploads` | array<AdminLmsUploadItem> | no |  |

### `AdminLmsAnalyticsStats`

| Field | Type | Required | Description |
|---|---|---|---|
| `estimated_storage_mb` | number | no |  |
| `resources_by_type` | object<string, any> | no |  |
| `total_chapters` | integer | no |  |
| `total_courses` | integer | no |  |
| `total_lessons` | integer | no |  |
| `total_resources` | integer | no |  |

### `AdminLmsUploadItem`

| Field | Type | Required | Description |
|---|---|---|---|
| `class_name` | string | no |  |
| `content_type` | string | no |  |
| `course_title` | string | no |  |
| `id` | integer | no |  |
| `subject_name` | string | no |  |
| `teacher_name` | string | no |  |
| `title` | string | no |  |
| `uploaded_at` | string (date-time) | no |  |

### `AdminNoticeCreateRequestRequest`

| Field | Type | Required | Description |
|---|---|---|---|
| `message` | string | min 1 | yes |  |
| `recipient_type` | string | min 1, default 'All' | no |  |
| `target_class_id` | integer | no |  |
| `title` | string | min 1 | yes |  |

### `AdminNoticeCreateResponse`

| Field | Type | Required | Description |
|---|---|---|---|
| `detail` | string | yes |  |
| `id` | integer | yes |  |

### `AdminNoticeItem`

| Field | Type | Required | Description |
|---|---|---|---|
| `created_at` | string (date-time) | no |  |
| `id` | integer | no |  |
| `message` | string | no |  |
| `recipient_type` | string | no |  |
| `sender_id` | integer | no |  |
| `target_class_id` | integer | no |  |
| `title` | string | no |  |

### `AdminPaymentItem`

| Field | Type | Required | Description |
|---|---|---|---|
| `amount_paid` | number | no |  |
| `id` | integer | no |  |
| `paid_at` | string (date-time) | no |  |
| `status` | string | no |  |
| `student_name` | string | no |  |
| `term_name` | string | no |  |
| `transaction_id` | string | no |  |

### `AdminRecentAdmissionItem`

| Field | Type | Required | Description |
|---|---|---|---|
| `applicant_name` | string | no |  |
| `registration_number` | string | no |  |
| `status` | string | no |  |
| `submitted_at` | string (date-time) | no |  |
| `target_class` | string | no |  |

### `AdminReportAttendanceByClass`

| Field | Type | Required | Description |
|---|---|---|---|
| `attendance_pct` | number | no |  |
| `class_name` | string | no |  |

### `AdminReportAverageMarks`

| Field | Type | Required | Description |
|---|---|---|---|
| `average_marks` | number | no |  |
| `subject_name` | string | no |  |

### `AdminReportFeeByMonth`

| Field | Type | Required | Description |
|---|---|---|---|
| `month` | string | no |  |
| `total` | number | no |  |

### `AdminReportsResponse`

| Field | Type | Required | Description |
|---|---|---|---|
| `attendance_by_class` | array<AdminReportAttendanceByClass> | no |  |
| `average_marks_by_subject` | array<AdminReportAverageMarks> | no |  |
| `fee_collection_by_month` | array<AdminReportFeeByMonth> | no |  |

### `AdminRolesResponse`

| Field | Type | Required | Description |
|---|---|---|---|
| `Admin` | integer | no |  |
| `Employee` | integer | no |  |
| `Parent` | integer | no |  |
| `Student` | integer | no |  |
| `Teacher` | integer | no |  |

### `AdminRouteCreateRequestRequest`

| Field | Type | Required | Description |
|---|---|---|---|
| `end_point` | string | min 1 | no |  |
| `route_name` | string | min 1 | yes |  |
| `start_point` | string | min 1 | no |  |

### `AdminRouteItem`

| Field | Type | Required | Description |
|---|---|---|---|
| `end_point` | string | no |  |
| `id` | integer | no |  |
| `route_name` | string | no |  |
| `start_point` | string | no |  |

### `AdminSubjectCreateRequestRequest`

| Field | Type | Required | Description |
|---|---|---|---|
| `name` | string | min 1 | yes |  |
| `subject_code` | string | min 1 | no |  |
| `type` | string | min 1 | no |  |

### `AdminSubjectItem`

| Field | Type | Required | Description |
|---|---|---|---|
| `id` | integer | no |  |
| `name` | string | no |  |
| `subject_code` | string | no |  |
| `type` | string | no |  |

### `AdminTransportAllocationCreateRequestRequest`

| Field | Type | Required | Description |
|---|---|---|---|
| `pickup_point` | string | min 1 | no |  |
| `route_id` | integer | no |  |
| `student_id` | integer | yes |  |
| `vehicle_id` | integer | no |  |

### `AdminTransportAllocationItem`

| Field | Type | Required | Description |
|---|---|---|---|
| `id` | integer | no |  |
| `pickup_point` | string | no |  |
| `route_id` | integer | no |  |
| `student_id` | integer | no |  |
| `vehicle_id` | integer | no |  |

### `AdminUserCreateRequestRequest`

| Field | Type | Required | Description |
|---|---|---|---|
| `class_id` | integer | no |  |
| `email` | string (email) | min 1 | no |  |
| `first_name` | string | min 1 | no |  |
| `last_name` | string | min 1 | no |  |
| `parent_email` | string (email) | min 1 | no | Only for creating a Student's parent account. |
| `parent_name` | string | min 1 | no | Only for creating a Student's parent account. |
| `parent_phone` | string | min 1 | no |  |
| `phone_number` | string | min 1 | no |  |
| `role` | any | yes | Role to assign.  * `Student` - Student * `Teacher` - Teacher * `Parent` - Parent * `Admin` - Admin * `Employee` - Employee |
| `roll_number` | integer | no |  |
| `username` | string | min 1 | no |  |

### `AdminUserCreateResponse`

| Field | Type | Required | Description |
|---|---|---|---|
| `id` | integer | yes |  |
| `role` | string | yes |  |
| `temp_password` | string | yes |  |
| `username` | string | yes |  |

### `AdminUserItem`

| Field | Type | Required | Description |
|---|---|---|---|
| `date_joined` | string (date-time) | yes |  |
| `email` | string (email) | no |  |
| `id` | integer | yes |  |
| `is_active` | boolean | yes |  |
| `name` | string | yes |  |
| `role` | string | yes |  |
| `username` | string | yes |  |

### `AdminUserResetPasswordResponse`

| Field | Type | Required | Description |
|---|---|---|---|
| `detail` | string | yes |  |
| `email_error` | boolean | no |  |
| `temp_password` | string | no |  |

### `AdminVehicleCreateRequestRequest`

| Field | Type | Required | Description |
|---|---|---|---|
| `capacity` | integer | no |  |
| `driver_id` | integer | no |  |
| `gps_device_id` | string | min 1 | no |  |
| `maintenance_status` | string | min 1 | no |  |
| `vehicle_number` | string | min 1 | yes |  |

### `AdminVehicleItem`

| Field | Type | Required | Description |
|---|---|---|---|
| `capacity` | integer | no |  |
| `driver_id` | integer | no |  |
| `gps_device_id` | string | no |  |
| `id` | integer | no |  |
| `maintenance_status` | string | no |  |
| `vehicle_number` | string | no |  |

### `AdmissionEnquiry`

| Field | Type | Required | Description |
|---|---|---|---|
| `aadhaar_number` | string | max 20 | no |  |
| `address` | string | no |  |
| `allergies` | string | no |  |
| `allocated_class` | string | read-only | yes |  |
| `allocated_section` | string | read-only | yes |  |
| `applicant_name` | string | max 150 | yes |  |
| `blood_group` | string | max 10 | no |  |
| `board` | string | max 50 | no |  |
| `category` | string | max 50 | no |  |
| `city` | string | max 100 | no |  |
| `communication_address` | string | no |  |
| `counselling_date` | string (date-time) | read-only, nullable | yes |  |
| `counselling_notes` | string | read-only | yes |  |
| `counselling_status` | string | read-only | yes |  |
| `counsellor_id` | integer | read-only, nullable | yes |  |
| `country` | string | max 100 | no |  |
| `curriculum` | string | max 50 | no |  |
| `date_of_birth` | string (date) | yes |  |
| `doc_aadhaar_card` | string (uri) | nullable | no |  |
| `doc_address_proof` | string (uri) | nullable | no |  |
| `doc_birth_certificate` | string (uri) | nullable | no |  |
| `doc_parent_id` | string (uri) | nullable | no |  |
| `doc_passport_photo` | string (uri) | nullable | no |  |
| `doc_previous_marks` | string (uri) | nullable | no |  |
| `doc_transfer_certificate` | string (uri) | nullable | no |  |
| `eligibility_notes` | string | read-only | yes |  |
| `emergency_contact_name` | string | max 150 | no |  |
| `emergency_contact_phone` | string | max 20 | no |  |
| `emergency_contact_relation` | string | max 50 | no |  |
| `father_company` | string | max 150 | no |  |
| `father_email` | string | max 150 | no |  |
| `father_income` | string (decimal) | nullable | no |  |
| `father_name` | string | max 150 | no |  |
| `father_occupation` | string | max 100 | no |  |
| `father_phone` | string | max 20 | no |  |
| `fee_amount` | string (decimal) | read-only | yes |  |
| `fee_paid` | boolean | read-only | yes |  |
| `fee_transaction_id` | string | read-only | yes |  |
| `gender` | string | max 20 | no |  |
| `guardian_address` | string | no |  |
| `guardian_name` | string | max 150 | no |  |
| `guardian_phone` | string | max 20 | no |  |
| `guardian_relationship` | string | max 50 | no |  |
| `has_medical_conditions` | boolean | no |  |
| `id` | integer | read-only | yes |  |
| `id_proof_document` | string (uri) | nullable | no |  |
| `interview_date` | string (date-time) | read-only, nullable | yes |  |
| `interview_required` | boolean | read-only | yes |  |
| `interview_result` | string | read-only | yes |  |
| `interview_scheduled` | boolean | read-only | yes |  |
| `is_eligible` | boolean | read-only | yes |  |
| `is_waitlisted` | boolean | read-only | yes |  |
| `medical_details` | string | no |  |
| `mother_company` | string | max 150 | no |  |
| `mother_email` | string | max 150 | no |  |
| `mother_name` | string | max 150 | no |  |
| `mother_occupation` | string | max 100 | no |  |
| `mother_phone` | string | max 20 | no |  |
| `nationality` | string | max 50 | no |  |
| `net_fee` | string (decimal) | read-only | yes |  |
| `parent_email` | string (email) | max 254 | yes |  |
| `parent_name` | string | max 150 | yes |  |
| `parent_phone` | string | max 20 | yes |  |
| `parent_user_id` | integer | read-only, nullable | yes |  |
| `percentage` | string | max 20 | no |  |
| `permanent_address` | string | no |  |
| `pincode` | string | max 10 | no |  |
| `preferred_branch` | string | max 100 | no |  |
| `prev_school_grade` | string | max 20 | no |  |
| `prev_school_name` | string | max 200 | no |  |
| `reason_for_leaving` | string | no |  |
| `registration_number` | string | read-only | yes |  |
| `rejection_reason` | string | read-only | yes |  |
| `religion` | string | max 50 | no |  |
| `reviewed_by` | string | read-only | yes | Admin username/name |
| `scholarship_applied` | boolean | no |  |
| `scholarship_discount` | string (decimal) | read-only | yes |  |
| `seat_allocated` | boolean | read-only | yes |  |
| `source_of_enquiry` | string | max 100 | no |  |
| `state` | string | max 100 | no |  |
| `status` | any | read-only | yes |  |
| `student_admission_number` | string | read-only | yes |  |
| `student_roll_number` | string | read-only | yes |  |
| `student_user_id` | integer | read-only, nullable | yes |  |
| `submitted_at` | string (date-time) | read-only | yes |  |
| `target_class` | string | max 50 | yes | Class applied for, e.g. 'Grade 6' |
| `updated_at` | string (date-time) | read-only | yes |  |
| `waitlist_position` | integer | read-only, nullable | yes |  |

### `AdmissionEnquiryRequest`

| Field | Type | Required | Description |
|---|---|---|---|
| `aadhaar_number` | string | max 20 | no |  |
| `address` | string | no |  |
| `allergies` | string | no |  |
| `applicant_name` | string | max 150, min 1 | yes |  |
| `blood_group` | string | max 10 | no |  |
| `board` | string | max 50 | no |  |
| `category` | string | max 50 | no |  |
| `city` | string | max 100 | no |  |
| `communication_address` | string | no |  |
| `country` | string | max 100 | no |  |
| `curriculum` | string | max 50 | no |  |
| `date_of_birth` | string (date) | yes |  |
| `doc_aadhaar_card` | string (binary) | nullable | no |  |
| `doc_address_proof` | string (binary) | nullable | no |  |
| `doc_birth_certificate` | string (binary) | nullable | no |  |
| `doc_parent_id` | string (binary) | nullable | no |  |
| `doc_passport_photo` | string (binary) | nullable | no |  |
| `doc_previous_marks` | string (binary) | nullable | no |  |
| `doc_transfer_certificate` | string (binary) | nullable | no |  |
| `emergency_contact_name` | string | max 150 | no |  |
| `emergency_contact_phone` | string | max 20 | no |  |
| `emergency_contact_relation` | string | max 50 | no |  |
| `father_company` | string | max 150 | no |  |
| `father_email` | string | max 150 | no |  |
| `father_income` | string (decimal) | nullable | no |  |
| `father_name` | string | max 150 | no |  |
| `father_occupation` | string | max 100 | no |  |
| `father_phone` | string | max 20 | no |  |
| `gender` | string | max 20 | no |  |
| `guardian_address` | string | no |  |
| `guardian_name` | string | max 150 | no |  |
| `guardian_phone` | string | max 20 | no |  |
| `guardian_relationship` | string | max 50 | no |  |
| `has_medical_conditions` | boolean | no |  |
| `id_proof_document` | string (binary) | nullable | no |  |
| `medical_details` | string | no |  |
| `mother_company` | string | max 150 | no |  |
| `mother_email` | string | max 150 | no |  |
| `mother_name` | string | max 150 | no |  |
| `mother_occupation` | string | max 100 | no |  |
| `mother_phone` | string | max 20 | no |  |
| `nationality` | string | max 50 | no |  |
| `parent_email` | string (email) | max 254, min 1 | yes |  |
| `parent_name` | string | max 150, min 1 | yes |  |
| `parent_phone` | string | max 20, min 1 | yes |  |
| `percentage` | string | max 20 | no |  |
| `permanent_address` | string | no |  |
| `pincode` | string | max 10 | no |  |
| `preferred_branch` | string | max 100 | no |  |
| `prev_school_grade` | string | max 20 | no |  |
| `prev_school_name` | string | max 200 | no |  |
| `reason_for_leaving` | string | no |  |
| `religion` | string | max 50 | no |  |
| `scholarship_applied` | boolean | no |  |
| `source_of_enquiry` | string | max 100 | no |  |
| `state` | string | max 100 | no |  |
| `target_class` | string | max 50, min 1 | yes | Class applied for, e.g. 'Grade 6' |

### `AdmissionStatus`

| Field | Type | Required | Description |
|---|---|---|---|
| `applicant_name` | string | read-only | yes |  |
| `date_of_birth` | string (date) | read-only | yes |  |
| `gender` | string | read-only | yes |  |
| `id` | integer | read-only | yes |  |
| `parent_name` | string | read-only | yes |  |
| `registration_number` | string | read-only | yes |  |
| `status` | any | read-only | yes |  |
| `submitted_at` | string (date-time) | read-only | yes |  |
| `target_class` | string | read-only | yes | Class applied for, e.g. 'Grade 6' |

### `AlumniItem`

| Field | Type | Required | Description |
|---|---|---|---|
| `current_occupation` | string | no |  |
| `email` | string (email) | no |  |
| `graduation_year` | integer | yes |  |
| `higher_studies_details` | string | no |  |
| `id` | integer | yes |  |
| `student_id` | integer | yes |  |
| `student_name` | string | yes |  |

### `AlumniUpsertRequestRequest`

| Field | Type | Required | Description |
|---|---|---|---|
| `current_occupation` | string | min 1 | no |  |
| `graduation_year` | integer | yes |  |
| `higher_studies_details` | string | min 1 | no |  |
| `student_id` | integer | yes |  |

### `AnnouncementItem`

| Field | Type | Required | Description |
|---|---|---|---|
| `created_at` | string (date-time) | nullable | no |  |
| `id` | integer | yes |  |
| `message` | string | yes |  |
| `sender_name` | string | yes |  |
| `title` | string | yes |  |

### `AssignmentItem`

| Field | Type | Required | Description |
|---|---|---|---|
| `assignment_type` | string | yes |  |
| `description` | string | nullable | no |  |
| `due_date` | string (date-time) | nullable | no |  |
| `file_url` | string | nullable | no |  |
| `id` | integer | yes |  |
| `max_marks` | number | yes |  |
| `my_submission` | AssignmentSubmissionItem | yes |  |
| `quiz_questions` | array | yes |  |
| `subject_name` | string | yes |  |
| `title` | string | yes |  |

### `AssignmentSubmissionItem`

| Field | Type | Required | Description |
|---|---|---|---|
| `grade` | string | yes |  |
| `id` | integer | yes |  |
| `marks_obtained` | number | nullable | no |  |
| `submission_url` | string | yes |  |
| `submitted_at` | string (date-time) | nullable | no |  |
| `teacher_feedback` | string | yes |  |

### `AssignmentSubmitRequestRequest`

| Field | Type | Required | Description |
|---|---|---|---|
| `submission_url` | string | min 1 | yes | Submission URL or file URL. |

### `AssignmentSubmitResponse`

| Field | Type | Required | Description |
|---|---|---|---|
| `detail` | string | yes |  |
| `grade` | string | nullable | no |  |
| `id` | integer | yes |  |
| `marks_obtained` | number | nullable | no |  |

### `AttendanceListResponse`

| Field | Type | Required | Description |
|---|---|---|---|
| `records` | array<AttendanceRecordItem> | yes |  |
| `summary` | AttendanceSummaryResponse | yes |  |

### `AttendanceRecordItem`

| Field | Type | Required | Description |
|---|---|---|---|
| `date` | string (date) | yes |  |
| `id` | integer | yes |  |
| `remarks` | string | yes |  |
| `status` | string | yes | e.g. Present, Absent, Late, Medical. |

### `AttendanceSummaryResponse`

| Field | Type | Required | Description |
|---|---|---|---|
| `absent` | integer | yes |  |
| `late` | integer | yes |  |
| `medical_leave` | integer | yes |  |
| `percentage` | number | nullable | no |  |
| `present` | integer | yes |  |

### `AudienceEnum`

*No properties.*

### `BookDetailItem`

| Field | Type | Required | Description |
|---|---|---|---|
| `author` | string | yes |  |
| `id` | integer | yes |  |
| `title` | string | yes |  |

### `BookItem`

| Field | Type | Required | Description |
|---|---|---|---|
| `author` | string | yes |  |
| `available_quantity` | integer | yes |  |
| `id` | integer | yes |  |
| `title` | string | yes |  |

### `BucketEnum`

*No properties.*

### `CMSPage`

| Field | Type | Required | Description |
|---|---|---|---|
| `content_html` | string | yes | Rich text / HTML content |
| `id` | integer | read-only | yes |  |
| `meta_description` | string | max 300 | no |  |
| `slug` | string | max 50 | yes |  |
| `title` | string | max 255 | yes |  |
| `updated_at` | string (date-time) | read-only | yes |  |

### `Campus`

| Field | Type | Required | Description |
|---|---|---|---|
| `address` | string | no |  |
| `city` | string | max 100 | no |  |
| `country` | string | max 100 | no |  |
| `email` | any | no |  |
| `id` | integer | read-only | yes |  |
| `is_headquarters` | boolean | no |  |
| `latitude` | number | nullable | no |  |
| `longitude` | number | nullable | no |  |
| `name` | string | max 255 | yes |  |
| `office_hours` | string | max 100 | no |  |
| `phone` | string | max 50 | no |  |
| `postal_code` | string | max 20 | no |  |
| `state` | string | max 100 | no |  |
| `status` | string | max 50 | no |  |
| `website` | string | max 200 | no |  |

### `CampusVisitBookingRequest`

| Field | Type | Required | Description |
|---|---|---|---|
| `campus_id` | string | max 50 | no |  |
| `purpose` | string | no |  |
| `visit_date` | string (date) | nullable | no |  |
| `visit_time` | string | max 30 | no |  |
| `visitor_email` | string (email) | max 254, min 1 | yes |  |
| `visitor_name` | string | max 150, min 1 | yes |  |
| `visitor_phone` | string | max 20, min 1 | yes |  |

### `CertificateItem`

| Field | Type | Required | Description |
|---|---|---|---|
| `certificate_type` | string | yes |  |
| `file_url` | string | yes |  |
| `id` | integer | yes |  |
| `issued_date` | string (date) | nullable | no |  |

### `ChatRequestRequest`

| Field | Type | Required | Description |
|---|---|---|---|
| `message` | string | min 1 | yes | User's message to the assistant. |

### `ChatResponse`

| Field | Type | Required | Description |
|---|---|---|---|
| `reply` | string | yes | Assistant's reply text. |

### `ContactSubmission`

| Field | Type | Required | Description |
|---|---|---|---|
| `email` | string (email) | max 254 | yes |  |
| `id` | integer | read-only | yes |  |
| `is_resolved` | boolean | read-only | yes |  |
| `message` | string | max 5000 | yes |  |
| `name` | string | max 150 | yes |  |
| `phone` | string | max 20 | no |  |
| `submitted_at` | string (date-time) | read-only | yes |  |

### `ContactSubmissionRequest`

| Field | Type | Required | Description |
|---|---|---|---|
| `email` | string (email) | max 254, min 1 | yes |  |
| `message` | string | max 5000, min 1 | yes |  |
| `name` | string | max 150, min 1 | yes |  |
| `phone` | string | max 20 | no |  |

### `ContentTypeEnum`

*No properties.*

### `CourseChapterItem`

| Field | Type | Required | Description |
|---|---|---|---|
| `description` | string | yes |  |
| `id` | integer | yes |  |
| `lessons` | array<CourseLessonItem> | yes |  |
| `resources` | array<CourseChapterResourceItem> | yes |  |
| `sort_order` | integer | yes |  |
| `title` | string | yes |  |

### `CourseChapterResourceItem`

| Field | Type | Required | Description |
|---|---|---|---|
| `content_type` | string | yes |  |
| `description` | string | yes |  |
| `download_count` | integer | yes |  |
| `id` | integer | yes |  |
| `is_completed` | boolean | yes |  |
| `resource_url` | any | yes |  |
| `sort_order` | integer | yes |  |
| `title` | string | yes |  |
| `uploaded_at` | string (date-time) | yes |  |
| `visible_from` | string (date-time) | nullable | no |  |

### `CourseItem`

| Field | Type | Required | Description |
|---|---|---|---|
| `chapters` | array<CourseChapterItem> | yes |  |
| `description` | string | yes |  |
| `id` | integer | yes |  |
| `legacy_content` | array<CourseLegacyContentItem> | yes |  |
| `quizzes` | array<CourseQuizItem> | yes |  |
| `subject_name` | string | yes |  |
| `title` | string | yes |  |

### `CourseLegacyContentItem`

| Field | Type | Required | Description |
|---|---|---|---|
| `content_type` | string | yes |  |
| `id` | integer | yes |  |
| `is_completed` | boolean | yes |  |
| `resource_url` | any | yes |  |
| `sort_order` | integer | yes |  |
| `title` | string | yes |  |

### `CourseLessonItem`

| Field | Type | Required | Description |
|---|---|---|---|
| `description` | string | yes |  |
| `id` | integer | yes |  |
| `resources` | array<CourseResourceItem> | yes |  |
| `sort_order` | integer | yes |  |
| `title` | string | yes |  |

### `CourseQuizItem`

| Field | Type | Required | Description |
|---|---|---|---|
| `duration_minutes` | integer | yes |  |
| `id` | integer | yes |  |
| `passing_score` | number | yes |  |
| `title` | string | yes |  |

### `CourseResourceItem`

| Field | Type | Required | Description |
|---|---|---|---|
| `assignment_id` | integer | nullable | no |  |
| `content_type` | string | yes |  |
| `description` | string | yes |  |
| `download_count` | integer | yes |  |
| `due_date` | string (date) | nullable | no |  |
| `id` | integer | yes |  |
| `is_completed` | boolean | yes |  |
| `max_marks` | number | nullable | no |  |
| `quiz_id` | integer | nullable | no |  |
| `resource_url` | any | yes |  |
| `sort_order` | integer | yes |  |
| `submission` | AssignmentSubmissionItem | yes |  |
| `title` | string | yes |  |
| `uploaded_at` | string (date-time) | yes |  |
| `visible_from` | string (date-time) | nullable | no |  |

### `DashboardAnnouncementItem`

| Field | Type | Required | Description |
|---|---|---|---|
| `created_at` | string (date-time) | yes |  |
| `id` | integer | yes |  |
| `message` | string | yes |  |
| `sender_name` | string | yes |  |
| `title` | string | yes |  |

### `DashboardAssignmentItem`

| Field | Type | Required | Description |
|---|---|---|---|
| `description` | string | nullable | no |  |
| `due_date` | string (date-time) | nullable | no |  |
| `id` | integer | yes |  |
| `max_marks` | number | yes |  |
| `subject_name` | string | yes |  |
| `title` | string | yes |  |

### `DashboardExamRefItem`

| Field | Type | Required | Description |
|---|---|---|---|
| `exam_name` | string | yes |  |
| `id` | integer | yes |  |
| `max_marks` | number | yes |  |
| `subject_name` | string | yes |  |

### `DashboardHomeworkItem`

| Field | Type | Required | Description |
|---|---|---|---|
| `assigned_date` | string (date) | nullable | no |  |
| `description` | string | nullable | no |  |
| `due_date` | string (date) | nullable | no |  |
| `id` | integer | yes |  |
| `is_overdue` | boolean | yes |  |
| `subject_name` | string | yes |  |
| `title` | string | yes |  |

### `DashboardPendingFeeItem`

| Field | Type | Required | Description |
|---|---|---|---|
| `hostel_fee` | number | yes |  |
| `id` | integer | yes |  |
| `term_name` | string | yes |  |
| `total_amount` | number | yes |  |
| `transport_fee` | number | yes |  |
| `tuition_fee` | number | yes |  |

### `DashboardResultItem`

| Field | Type | Required | Description |
|---|---|---|---|
| `exam` | DashboardExamRefItem | yes |  |
| `grade_letter` | string | yes |  |
| `id` | integer | yes |  |
| `marks_obtained` | number | yes |  |
| `percentage` | number | yes |  |
| `rank_position` | integer | nullable | no |  |
| `remarks` | string | yes |  |

### `DashboardUpcomingExamItem`

| Field | Type | Required | Description |
|---|---|---|---|
| `duration_minutes` | integer | yes |  |
| `exam_date` | string (date) | yes |  |
| `exam_name` | string | yes |  |
| `exam_type` | string | yes |  |
| `id` | integer | yes |  |
| `max_marks` | number | yes |  |
| `subject_name` | string | yes |  |

### `DecisionEnum`

*No properties.*

### `Department`

| Field | Type | Required | Description |
|---|---|---|---|
| `description` | string | no |  |
| `id` | integer | read-only | yes |  |
| `name` | string | max 150 | yes |  |

### `DetailErrorResponse`

| Field | Type | Required | Description |
|---|---|---|---|
| `detail` | string | yes | Human readable error message. |

### `DigitalNoteCreateRequestRequest`

| Field | Type | Required | Description |
|---|---|---|---|
| `body_markdown` | string | min 1 | yes | Note body in markdown. |
| `course_id` | integer | yes |  |
| `title` | string | min 1 | yes | Note title. |

### `Document`

| Field | Type | Required | Description |
|---|---|---|---|
| `audience` | AudienceEnum | no |  |
| `file` | string (uri) | yes |  |
| `id` | integer | read-only | yes |  |
| `title` | string | max 255 | yes |  |
| `uploaded_at` | string (date-time) | read-only | yes |  |

### `Event`

| Field | Type | Required | Description |
|---|---|---|---|
| `cover_image` | string (uri) | nullable | no |  |
| `description` | string | yes |  |
| `event_date` | string (date) | yes |  |
| `id` | integer | read-only | yes |  |
| `title` | string | max 255 | yes |  |
| `venue` | string | max 255 | no |  |

### `EventItem`

| Field | Type | Required | Description |
|---|---|---|---|
| `description` | string | yes |  |
| `event_date` | string (date) | nullable | no |  |
| `id` | integer | yes |  |
| `title` | string | yes |  |
| `venue` | string | yes |  |

### `ExamItem`

| Field | Type | Required | Description |
|---|---|---|---|
| `duration_minutes` | integer | yes |  |
| `exam_date` | string (date) | yes |  |
| `exam_name` | string | yes |  |
| `exam_type` | string | yes |  |
| `id` | integer | yes |  |
| `max_marks` | number | yes |  |
| `start_time` | string (time) | nullable | no |  |
| `subject_name` | string | yes |  |

### `ExamOverallRankItem`

| Field | Type | Required | Description |
|---|---|---|---|
| `max_total` | number | yes | Summed maximum marks across subjects. |
| `overall_rank` | integer | yes | Class-wide rank by total marks. |
| `roll_number` | string | nullable | no | Student roll number. |
| `student_id` | integer | yes | Student (auth user) id. |
| `student_name` | string | yes | Full name of the student. |
| `total_marks` | number | yes | Summed marks across subjects. |

### `ExamRankGenerateRequestRequest`

| Field | Type | Required | Description |
|---|---|---|---|
| `exam_schedule_id` | integer | yes |  |

### `ExamRankListItem`

| Field | Type | Required | Description |
|---|---|---|---|
| `grade_letter` | string | nullable | no | Letter grade for the marks. |
| `id` | integer | yes | Portal result record id. |
| `marks_obtained` | number | yes | Marks scored in this subject. |
| `rank_position` | integer | nullable | no | Per-subject rank for this exam. |
| `roll_number` | string | nullable | no | Student roll number. |
| `student_id` | integer | yes | Student (auth user) id. |
| `student_name` | string | yes | Full name of the student. |

### `ExamReportCard`

| Field | Type | Required | Description |
|---|---|---|---|
| `exam_name` | string | yes | Exam cycle name. |
| `expected_subject_count` | integer | nullable | no | Subjects taught in the student's class. |
| `is_complete` | boolean | yes | Whether all subjects are graded. |
| `max_total` | number | yes | Sum of maximum marks. |
| `overall_grade` | string | nullable | no | Overall letter grade. |
| `percentage` | number | yes | Overall percentage (0-100). |
| `student_name` | string | nullable | no | Full name of the student. |
| `subjects` | array<ExamReportCardSubject> | yes | Per-subject results. |
| `total_marks` | number | yes | Sum of marks obtained. |

### `ExamReportCardSubject`

| Field | Type | Required | Description |
|---|---|---|---|
| `grade_letter` | string | yes | Letter grade for the subject. |
| `marks_obtained` | number | yes | Marks scored in the subject. |
| `max_marks` | number | yes | Maximum marks for the subject. |
| `rank_position` | integer | nullable | no | Per-subject rank for the exam. |
| `subject_name` | string | yes | Subject name. |

### `ExamTypeEnum`

*No properties.*

### `FAQ`

| Field | Type | Required | Description |
|---|---|---|---|
| `answer` | string | yes |  |
| `category` | string | max 100 | no |  |
| `id` | integer | read-only | yes |  |
| `question` | string | max 255 | yes |  |
| `sort_order` | integer (int64) | min 0, max 9223372036854775807 | no |  |

### `FacultyMember`

| Field | Type | Required | Description |
|---|---|---|---|
| `achievements` | string | no |  |
| `bio` | string | no |  |
| `designation` | string | max 150 | yes |  |
| `email` | any | no |  |
| `experience_years` | integer (int64) | min 0, max 9223372036854775807, nullable | no |  |
| `first_name` | string | max 100 | yes |  |
| `id` | integer | read-only | yes |  |
| `last_name` | string | max 100 | no |  |
| `photo_url` | string (uri) | read-only, nullable | yes |  |
| `qualification_detail` | string | max 300 | no |  |
| `specializations` | string | max 500 | no | Comma-separated list, e.g. Physics, Robotics, AI |

### `FeesPendingFeeItem`

| Field | Type | Required | Description |
|---|---|---|---|
| `hostel_fee` | number | yes |  |
| `id` | integer | yes |  |
| `term_name` | string | yes |  |
| `total_amount` | number | yes |  |
| `transport_fee` | number | yes |  |
| `tuition_fee` | number | yes |  |

### `FeesResponse`

| Field | Type | Required | Description |
|---|---|---|---|
| `payment_history` | array<PaymentHistoryItem> | yes |  |
| `pending` | array<FeesPendingFeeItem> | yes |  |

### `FileUploadRequestRequest`

| Field | Type | Required | Description |
|---|---|---|---|
| `bucket` | any | default 'lms-resources' | no | Supabase storage bucket to upload into.  * `lms-resources` - lms-resources * `assignmentsubmissions` - assignmentsubmissions * `officialdocuments` - officialdocuments * `studentavatars` - studentavatars |
| `file` | string (binary) | yes | The file to upload (any type). |

### `FileUploadResponse`

| Field | Type | Required | Description |
|---|---|---|---|
| `url` | string (uri) | yes | Public URL of the uploaded file. |

### `ForumPostCreateRequestRequest`

| Field | Type | Required | Description |
|---|---|---|---|
| `post_text` | string | min 1 | yes | Reply body. |

### `ForumTopicCreateRequestRequest`

| Field | Type | Required | Description |
|---|---|---|---|
| `content` | string | min 1 | yes | Topic body (markdown supported). |
| `course_id` | integer | yes | Course the topic belongs to. |
| `title` | string | min 1 | yes | Topic title. |

### `GalleryAlbum`

| Field | Type | Required | Description |
|---|---|---|---|
| `id` | integer | read-only | yes |  |
| `images` | array<GalleryImage> | read-only | yes |  |
| `name` | string | max 150 | yes |  |

### `GalleryImage`

| Field | Type | Required | Description |
|---|---|---|---|
| `album` | integer | yes |  |
| `album_name` | string | read-only | yes |  |
| `caption` | string | max 255 | no |  |
| `id` | integer | read-only | yes |  |
| `image` | string (uri) | yes |  |
| `uploaded_at` | string (date-time) | read-only | yes |  |

### `GenderEnum`

*No properties.*

### `HallTicketExamItem`

| Field | Type | Required | Description |
|---|---|---|---|
| `exam_date` | string (date) | nullable | no |  |
| `exam_name` | string | yes |  |
| `id` | integer | yes |  |
| `subject_name` | string | yes |  |

### `HallTicketItem`

| Field | Type | Required | Description |
|---|---|---|---|
| `exam` | HallTicketExamItem | yes |  |
| `id` | integer | yes |  |
| `is_verified` | boolean | yes |  |
| `ticket_number` | string | yes |  |

### `HomeworkItem`

| Field | Type | Required | Description |
|---|---|---|---|
| `assigned_date` | string (date) | nullable | no |  |
| `description` | string | nullable | no |  |
| `due_date` | string (date) | nullable | no |  |
| `id` | integer | yes |  |
| `is_overdue` | boolean | yes |  |
| `subject_name` | string | yes |  |
| `teacher_name` | string | yes |  |
| `title` | string | yes |  |

### `HostelAllocationCreateRequestRequest`

| Field | Type | Required | Description |
|---|---|---|---|
| `room_id` | integer | yes |  |
| `student_id` | integer | yes |  |

### `HostelAllocationItem`

| Field | Type | Required | Description |
|---|---|---|---|
| `allocated_date` | string (date) | yes |  |
| `hostel_name` | string | yes |  |
| `id` | integer | yes |  |
| `room_number` | string | yes |  |
| `student_name` | string | yes |  |
| `vacated_date` | string (date) | no |  |

### `HostelCreateRequestRequest`

| Field | Type | Required | Description |
|---|---|---|---|
| `name` | string | min 1 | yes |  |
| `type` | string | min 1 | no |  |
| `warden_id` | integer | no |  |

### `HostelItem`

| Field | Type | Required | Description |
|---|---|---|---|
| `id` | integer | yes |  |
| `name` | string | yes |  |
| `type` | string | no |  |
| `warden_id` | integer | no |  |

### `IdDetailResponse`

| Field | Type | Required | Description |
|---|---|---|---|
| `detail` | string | yes |  |
| `id` | integer | no | Created/updated record id. |

### `InitiatePaymentRequestRequest`

| Field | Type | Required | Description |
|---|---|---|---|
| `fee_structure_id` | integer | yes | Fee structure id to pay for. |
| `payment_method` | string | min 1, default 'Online' | no | Online/Offline payment method. |

### `InitiatePaymentResponse`

| Field | Type | Required | Description |
|---|---|---|---|
| `detail` | string | yes |  |
| `id` | integer | yes |  |
| `transaction_id` | string | yes |  |

### `InventoryCreateRequestRequest`

| Field | Type | Required | Description |
|---|---|---|---|
| `category` | string | min 1 | no |  |
| `department` | string | min 1 | no |  |
| `item_name` | string | min 1 | yes |  |
| `quantity` | integer | no |  |

### `InventoryItem`

| Field | Type | Required | Description |
|---|---|---|---|
| `category` | string | yes |  |
| `department` | string | yes |  |
| `id` | integer | yes |  |
| `item_name` | string | yes |  |
| `quantity` | integer | yes |  |

### `JobApplicationRequest`

| Field | Type | Required | Description |
|---|---|---|---|
| `applicant_name` | string | max 150, min 1 | yes |  |
| `cover_letter` | string | no |  |
| `email` | string (email) | max 254, min 1 | yes |  |
| `job_posting` | integer | yes |  |
| `phone` | string | max 20, min 1 | yes |  |
| `resume_file` | string (binary) | nullable | no |  |

### `JobPosting`

| Field | Type | Required | Description |
|---|---|---|---|
| `department` | integer | nullable | no |  |
| `description` | string | yes |  |
| `id` | integer | read-only | yes |  |
| `is_open` | boolean | no |  |
| `posted_at` | string (date-time) | read-only | yes |  |
| `title` | string | max 255 | yes |  |

### `LeadershipMember`

| Field | Type | Required | Description |
|---|---|---|---|
| `bio` | string | no |  |
| `designation` | string | max 150 | yes |  |
| `id` | integer | read-only | yes |  |
| `name` | string | max 150 | yes |  |
| `photo` | string (uri) | nullable | no |  |
| `sort_order` | integer (int64) | min 0, max 9223372036854775807 | no |  |

### `LeaveItem`

| Field | Type | Required | Description |
|---|---|---|---|
| `end_date` | string (date) | nullable | no |  |
| `id` | integer | yes |  |
| `leave_type` | string | yes |  |
| `reason` | string | yes |  |
| `start_date` | string (date) | nullable | no |  |
| `status` | string | yes |  |

### `LeaveRequestRequest`

| Field | Type | Required | Description |
|---|---|---|---|
| `end_date` | string (date) | yes | Leave end date (YYYY-MM-DD). |
| `leave_type` | any | yes | Type of leave.  * `Sick` - Sick * `Casual` - Casual * `Earned` - Earned * `Medical` - Medical * `Other` - Other |
| `reason` | string | min 1 | yes | Reason for leave. |
| `start_date` | string (date) | yes | Leave start date (YYYY-MM-DD). |

### `LeaveSubmitResponse`

| Field | Type | Required | Description |
|---|---|---|---|
| `detail` | string | yes |  |
| `id` | integer | yes | New leave request id. |

### `LeaveTypeEnum`

*No properties.*

### `LibraryItem`

| Field | Type | Required | Description |
|---|---|---|---|
| `book_detail` | BookDetailItem | yes |  |
| `due_date` | string (date) | nullable | no |  |
| `fine_amount` | number | yes |  |
| `id` | integer | yes |  |
| `issue_date` | string (date) | nullable | no |  |
| `return_date` | string (date) | nullable | no |  |

### `LmsCourseAnalyticsItem`

| Field | Type | Required | Description |
|---|---|---|---|
| `completed_count` | integer | yes | Content items marked complete. |
| `completion_percent` | number | yes | Completion percentage (0-100). |
| `student_id` | integer | yes | Student (auth user) id. |
| `student_name` | string | yes | Full name of the student. |
| `total_content` | integer | yes | Total content items in the course. |

### `LmsDigitalNoteItem`

| Field | Type | Required | Description |
|---|---|---|---|
| `author_name` | string | yes | Display name of the note author. |
| `body_markdown` | string | yes | Note body in markdown. |
| `created_at` | string (date-time) | yes | When the note was created. |
| `id` | integer | yes | Note id. |
| `title` | string | yes | Note title. |

### `LmsForumPostItem`

| Field | Type | Required | Description |
|---|---|---|---|
| `author_name` | string | yes | Display name of the reply author. |
| `created_at` | string (date-time) | yes | When the reply was posted. |
| `id` | integer | yes | Post id. |
| `post_text` | string | yes | Reply body. |

### `LmsForumTopicDetail`

| Field | Type | Required | Description |
|---|---|---|---|
| `content` | string | yes | Topic body (markdown supported). |
| `created_at` | string (date-time) | yes | When the topic was created. |
| `creator_name` | string | yes | Display name of the topic creator. |
| `id` | integer | yes | Topic id. |
| `posts` | array<LmsForumPostItem> | yes | Replies on this topic. |
| `title` | string | yes | Topic title. |

### `LmsForumTopicItem`

| Field | Type | Required | Description |
|---|---|---|---|
| `content` | string | yes | Topic body (markdown supported). |
| `created_at` | string (date-time) | yes | When the topic was created. |
| `creator_name` | string | yes | Display name of the topic creator. |
| `id` | integer | yes | Topic id. |
| `reply_count` | integer | yes | Number of replies on the topic. |
| `title` | string | yes | Topic title. |

### `LoginStep1RequestRequest`

| Field | Type | Required | Description |
|---|---|---|---|
| `email` | string | min 1 | no | Registered email address (alternative to username). |
| `password` | string | min 1 | yes | Account password. |
| `username` | string | min 1 | no | Registered username (alternative to email). |

### `LoginStep1Response`

| Field | Type | Required | Description |
|---|---|---|---|
| `detail` | string | yes | Status message, e.g. 'OTP sent successfully.' |
| `user_id` | integer | yes | ID to pass to verify-otp. |
| `user_type` | string | yes |  |

### `MarkCompleteRequestRequest`

| Field | Type | Required | Description |
|---|---|---|---|
| `content_id` | integer | yes | Course content id to mark complete. |

### `MedicalLogCreateRequestRequest`

| Field | Type | Required | Description |
|---|---|---|---|
| `doctor_notes` | string | min 1 | no |  |
| `student_id` | integer | yes |  |
| `symptoms` | string | min 1 | no |  |
| `treatment_given` | string | min 1 | no |  |

### `MedicalLogItem`

| Field | Type | Required | Description |
|---|---|---|---|
| `doctor_notes` | string | no |  |
| `id` | integer | yes |  |
| `recorded_by` | integer | yes |  |
| `student_id` | integer | yes |  |
| `student_name` | string | yes |  |
| `symptoms` | string | no |  |
| `treatment_given` | string | no |  |
| `visit_date` | string (date) | yes |  |

### `NewsPost`

| Field | Type | Required | Description |
|---|---|---|---|
| `content` | string | yes |  |
| `cover_image` | string (uri) | nullable | no |  |
| `id` | integer | read-only | yes |  |
| `is_published` | boolean | no |  |
| `published_date` | string (date) | yes |  |
| `slug` | string | max 50 | yes |  |
| `title` | string | max 255 | yes |  |

### `NotificationPreferencesResponse`

| Field | Type | Required | Description |
|---|---|---|---|
| `email_enabled` | boolean | yes |  |
| `in_app_enabled` | boolean | yes |  |
| `push_enabled` | boolean | yes |  |
| `sms_enabled` | boolean | yes |  |

### `NotificationPreferencesUpdateRequestRequest`

| Field | Type | Required | Description |
|---|---|---|---|
| `email_enabled` | boolean | no |  |
| `in_app_enabled` | boolean | no |  |
| `push_enabled` | boolean | no |  |
| `sms_enabled` | boolean | no |  |

### `PaginatedAcademicProgramList`

| Field | Type | Required | Description |
|---|---|---|---|
| `count` | integer | yes |  |
| `next` | string (uri) | nullable | no |  |
| `previous` | string (uri) | nullable | no |  |
| `results` | array<AcademicProgram> | yes |  |

### `PaginatedAchievementList`

| Field | Type | Required | Description |
|---|---|---|---|
| `count` | integer | yes |  |
| `next` | string (uri) | nullable | no |  |
| `previous` | string (uri) | nullable | no |  |
| `results` | array<Achievement> | yes |  |

### `PaginatedCMSPageList`

| Field | Type | Required | Description |
|---|---|---|---|
| `count` | integer | yes |  |
| `next` | string (uri) | nullable | no |  |
| `previous` | string (uri) | nullable | no |  |
| `results` | array<CMSPage> | yes |  |

### `PaginatedDepartmentList`

| Field | Type | Required | Description |
|---|---|---|---|
| `count` | integer | yes |  |
| `next` | string (uri) | nullable | no |  |
| `previous` | string (uri) | nullable | no |  |
| `results` | array<Department> | yes |  |

### `PaginatedDocumentList`

| Field | Type | Required | Description |
|---|---|---|---|
| `count` | integer | yes |  |
| `next` | string (uri) | nullable | no |  |
| `previous` | string (uri) | nullable | no |  |
| `results` | array<Document> | yes |  |

### `PaginatedEventList`

| Field | Type | Required | Description |
|---|---|---|---|
| `count` | integer | yes |  |
| `next` | string (uri) | nullable | no |  |
| `previous` | string (uri) | nullable | no |  |
| `results` | array<Event> | yes |  |

### `PaginatedFAQList`

| Field | Type | Required | Description |
|---|---|---|---|
| `count` | integer | yes |  |
| `next` | string (uri) | nullable | no |  |
| `previous` | string (uri) | nullable | no |  |
| `results` | array<FAQ> | yes |  |

### `PaginatedFacultyMemberList`

| Field | Type | Required | Description |
|---|---|---|---|
| `count` | integer | yes |  |
| `next` | string (uri) | nullable | no |  |
| `previous` | string (uri) | nullable | no |  |
| `results` | array<FacultyMember> | yes |  |

### `PaginatedGalleryAlbumList`

| Field | Type | Required | Description |
|---|---|---|---|
| `count` | integer | yes |  |
| `next` | string (uri) | nullable | no |  |
| `previous` | string (uri) | nullable | no |  |
| `results` | array<GalleryAlbum> | yes |  |

### `PaginatedGalleryImageList`

| Field | Type | Required | Description |
|---|---|---|---|
| `count` | integer | yes |  |
| `next` | string (uri) | nullable | no |  |
| `previous` | string (uri) | nullable | no |  |
| `results` | array<GalleryImage> | yes |  |

### `PaginatedJobPostingList`

| Field | Type | Required | Description |
|---|---|---|---|
| `count` | integer | yes |  |
| `next` | string (uri) | nullable | no |  |
| `previous` | string (uri) | nullable | no |  |
| `results` | array<JobPosting> | yes |  |

### `PaginatedLeadershipMemberList`

| Field | Type | Required | Description |
|---|---|---|---|
| `count` | integer | yes |  |
| `next` | string (uri) | nullable | no |  |
| `previous` | string (uri) | nullable | no |  |
| `results` | array<LeadershipMember> | yes |  |

### `PaginatedNewsPostList`

| Field | Type | Required | Description |
|---|---|---|---|
| `count` | integer | yes |  |
| `next` | string (uri) | nullable | no |  |
| `previous` | string (uri) | nullable | no |  |
| `results` | array<NewsPost> | yes |  |

### `PaginatedScholarshipInfoList`

| Field | Type | Required | Description |
|---|---|---|---|
| `count` | integer | yes |  |
| `next` | string (uri) | nullable | no |  |
| `previous` | string (uri) | nullable | no |  |
| `results` | array<ScholarshipInfo> | yes |  |

### `PaginatedSchoolSettingsList`

| Field | Type | Required | Description |
|---|---|---|---|
| `count` | integer | yes |  |
| `next` | string (uri) | nullable | no |  |
| `previous` | string (uri) | nullable | no |  |
| `results` | array<SchoolSettings> | yes |  |

### `PaginatedSchoolStatList`

| Field | Type | Required | Description |
|---|---|---|---|
| `count` | integer | yes |  |
| `next` | string (uri) | nullable | no |  |
| `previous` | string (uri) | nullable | no |  |
| `results` | array<SchoolStat> | yes |  |

### `PaginatedTechnologyPartnerList`

| Field | Type | Required | Description |
|---|---|---|---|
| `count` | integer | yes |  |
| `next` | string (uri) | nullable | no |  |
| `previous` | string (uri) | nullable | no |  |
| `results` | array<TechnologyPartner> | yes |  |

### `PaginatedTestimonialList`

| Field | Type | Required | Description |
|---|---|---|---|
| `count` | integer | yes |  |
| `next` | string (uri) | nullable | no |  |
| `previous` | string (uri) | nullable | no |  |
| `results` | array<Testimonial> | yes |  |

### `PaginatedWhyChooseItemList`

| Field | Type | Required | Description |
|---|---|---|---|
| `count` | integer | yes |  |
| `next` | string (uri) | nullable | no |  |
| `previous` | string (uri) | nullable | no |  |
| `results` | array<WhyChooseItem> | yes |  |

### `ParentAttendanceRecordItem`

| Field | Type | Required | Description |
|---|---|---|---|
| `date` | string (date) | yes |  |
| `id` | integer | yes |  |
| `remarks` | string | nullable | no |  |
| `status` | string | yes |  |

### `ParentAttendanceSummary`

| Field | Type | Required | Description |
|---|---|---|---|
| `absent` | integer | yes |  |
| `late` | integer | yes |  |
| `medical_leave` | integer | yes |  |
| `percentage` | number | nullable | no |  |
| `present` | integer | yes |  |

### `ParentChildAttendanceResponse`

| Field | Type | Required | Description |
|---|---|---|---|
| `records` | array<ParentAttendanceRecordItem> | yes |  |
| `summary` | ParentAttendanceSummary | yes |  |

### `ParentChildDocumentItem`

| Field | Type | Required | Description |
|---|---|---|---|
| `certificate_type` | string | yes |  |
| `file_url` | string | nullable | no |  |
| `id` | integer | yes |  |
| `issued_date` | string (date) | nullable | no |  |

### `ParentChildFeesPayRequestRequest`

| Field | Type | Required | Description |
|---|---|---|---|
| `child_id` | integer | yes | Child to debit the payment to. |
| `fee_structure_id` | integer | yes | Fee structure being paid. |
| `payment_method` | string | min 1, default 'Online' | no |  |

### `ParentChildFeesPayResponse`

| Field | Type | Required | Description |
|---|---|---|---|
| `detail` | string | yes |  |
| `id` | integer | yes |  |
| `transaction_id` | string | yes |  |

### `ParentChildFeesResponse`

| Field | Type | Required | Description |
|---|---|---|---|
| `payment_history` | array<ParentPaymentHistoryItem> | yes |  |
| `pending` | array<ParentPendingFeeItem> | yes |  |

### `ParentChildHomeworkItem`

| Field | Type | Required | Description |
|---|---|---|---|
| `assigned_date` | string (date) | nullable | no |  |
| `description` | string | nullable | no |  |
| `due_date` | string (date) | nullable | no |  |
| `id` | integer | yes |  |
| `is_overdue` | boolean | no |  |
| `subject_name` | string | yes |  |
| `teacher_name` | string | nullable | no |  |
| `title` | string | yes |  |

### `ParentChildItem`

| Field | Type | Required | Description |
|---|---|---|---|
| `admission_number` | string | nullable | no |  |
| `date_of_birth` | string (date) | nullable | no |  |
| `gender` | string | nullable | no |  |
| `id` | integer | yes | Student (auth user) id. |
| `name` | string | yes | Student display name. |
| `qr_id_code` | string | nullable | no |  |
| `status` | string | nullable | no |  |

### `ParentChildResultItem`

| Field | Type | Required | Description |
|---|---|---|---|
| `exam` | ParentResultExamItem | yes |  |
| `grade_letter` | string | nullable | no |  |
| `id` | integer | yes |  |
| `marks_obtained` | number | yes |  |
| `percentage` | number | yes | Marks as a percentage of max marks. |
| `rank_position` | integer | nullable | no |  |
| `remarks` | string | nullable | no |  |

### `ParentChildSummaryItem`

| Field | Type | Required | Description |
|---|---|---|---|
| `admission_number` | string | nullable | no |  |
| `attendance_percentage` | number | nullable | no |  |
| `class_name` | string | nullable | no |  |
| `date_of_birth` | string (date) | nullable | no |  |
| `gender` | string | nullable | no |  |
| `id` | integer | yes |  |
| `name` | string | yes |  |
| `pending_fee_items` | integer | no |  |
| `qr_id_code` | string | nullable | no |  |
| `status` | string | nullable | no |  |

### `ParentChildTransportResponse`

| Field | Type | Required | Description |
|---|---|---|---|
| `allocation` | ParentTransportAllocationItem | yes |  |
| `last_location` | ParentTransportLocationItem | yes |  |

### `ParentDashboardResponse`

| Field | Type | Required | Description |
|---|---|---|---|
| `children` | array<ParentChildSummaryItem> | yes |  |
| `unread_messages` | integer | yes |  |

### `ParentFeeStructureRefItem`

| Field | Type | Required | Description |
|---|---|---|---|
| `id` | integer | yes |  |
| `term_name` | string | yes |  |
| `total_amount` | number | yes |  |

### `ParentFeedbackItem`

| Field | Type | Required | Description |
|---|---|---|---|
| `category` | string | yes |  |
| `created_at` | string (date-time) | nullable | no |  |
| `feedback_text` | string | nullable | no |  |
| `id` | integer | yes |  |
| `status` | string | nullable | no |  |

### `ParentFeedbackRequestRequest`

| Field | Type | Required | Description |
|---|---|---|---|
| `category` | string | min 1, default 'General' | no |  |
| `feedback_text` | string | min 1 | yes | Feedback body. |

### `ParentLeaveItem`

| Field | Type | Required | Description |
|---|---|---|---|
| `end_date` | string (date) | nullable | no |  |
| `id` | integer | yes |  |
| `leave_type` | string | yes |  |
| `reason` | string | nullable | no |  |
| `start_date` | string (date) | nullable | no |  |
| `status` | string | nullable | no |  |

### `ParentLeaveSubmitRequestRequest`

| Field | Type | Required | Description |
|---|---|---|---|
| `child_id` | integer | yes | Child (student user id) the leave is for. |
| `end_date` | string (date) | yes | Leave end date (YYYY-MM-DD). |
| `leave_type` | any | yes | Type of leave.  * `Sick` - Sick * `Casual` - Casual * `Earned` - Earned * `Medical` - Medical * `Other` - Other |
| `reason` | string | min 1 | yes | Reason for leave. |
| `start_date` | string (date) | yes | Leave start date (YYYY-MM-DD). |

### `ParentLmsCourseProgressItem`

| Field | Type | Required | Description |
|---|---|---|---|
| `assignments_completed` | integer | yes |  |
| `assignments_total` | integer | yes |  |
| `attendance_percent` | number | yes |  |
| `average_score_percent` | number | nullable | no |  |
| `chapters_completed` | integer | yes |  |
| `chapters_total` | integer | yes |  |
| `completed_resources` | integer | yes |  |
| `course_title` | string | yes |  |
| `id` | integer | yes |  |
| `is_weak` | boolean | yes |  |
| `progress_percent` | number | yes |  |
| `quizzes_total` | integer | yes |  |
| `recent_remark` | string | yes |  |
| `subject_name` | string | yes |  |
| `total_resources` | integer | yes |  |
| `upcoming_tests` | array<ParentLmsUpcomingTestItem> | yes |  |

### `ParentLmsProgressResponse`

| Field | Type | Required | Description |
|---|---|---|---|
| `courses` | array<ParentLmsCourseProgressItem> | yes |  |
| `detail` | string | no |  |

### `ParentLmsUpcomingTestItem`

| Field | Type | Required | Description |
|---|---|---|---|
| `exam_date` | string (date) | nullable | no |  |
| `exam_name` | string | yes |  |
| `max_marks` | number | nullable | no |  |
| `start_time` | string | nullable | no |  |

### `ParentMessageItem`

| Field | Type | Required | Description |
|---|---|---|---|
| `created_at` | string (date-time) | nullable | no |  |
| `id` | integer | yes |  |
| `message_text` | string | yes |  |
| `receiver` | integer | yes |  |
| `sender` | integer | yes |  |

### `ParentMessageSendRequestRequest`

| Field | Type | Required | Description |
|---|---|---|---|
| `message_text` | string | min 1 | yes | Message body. |
| `receiver` | integer | yes | Recipient user id (e.g. a teacher). |

### `ParentNotificationItem`

| Field | Type | Required | Description |
|---|---|---|---|
| `created_at` | string (date-time) | nullable | no |  |
| `id` | integer | yes |  |
| `message` | string | nullable | no |  |
| `title` | string | yes |  |

### `ParentPaymentHistoryItem`

| Field | Type | Required | Description |
|---|---|---|---|
| `amount_paid` | number | yes |  |
| `fee_structure_detail` | ParentFeeStructureRefItem | yes |  |
| `id` | integer | yes |  |
| `paid_at` | string (date-time) | nullable | no |  |
| `status` | string | yes |  |
| `transaction_id` | string | yes |  |

### `ParentPendingFeeItem`

| Field | Type | Required | Description |
|---|---|---|---|
| `hostel_fee` | number | yes |  |
| `id` | integer | yes |  |
| `term_name` | string | yes |  |
| `total_amount` | number | yes |  |
| `transport_fee` | number | yes |  |
| `tuition_fee` | number | yes |  |

### `ParentProfileChildItem`

| Field | Type | Required | Description |
|---|---|---|---|
| `admission_number` | string | nullable | no |  |
| `date_of_birth` | string (date) | nullable | no |  |
| `gender` | string | nullable | no |  |
| `id` | integer | yes | Student (auth user) id. |
| `name` | string | yes | Student display name. |
| `qr_id_code` | string | nullable | no |  |
| `status` | string | nullable | no |  |

### `ParentProfileResponse`

| Field | Type | Required | Description |
|---|---|---|---|
| `address` | string | no |  |
| `children` | array<ParentProfileChildItem> | yes |  |
| `email` | any | yes |  |
| `emergency_contact` | string | no |  |
| `father_name` | string | no |  |
| `id` | integer | yes | Auth user id. |
| `is_verified` | boolean | no |  |
| `mother_name` | string | no |  |
| `name` | string | yes |  |
| `phone_number` | string | no |  |
| `user_type` | string | yes | Always 'Parent'. |

### `ParentPtmBookingItem`

| Field | Type | Required | Description |
|---|---|---|---|
| `id` | integer | yes |  |
| `meeting_date` | string (date) | nullable | no |  |
| `parent_notes` | string | nullable | no |  |
| `status` | string | nullable | no |  |
| `student_name` | string | nullable | no |  |
| `teacher_name` | string | nullable | no |  |
| `time_slot` | string | nullable | no |  |

### `ParentPtmBookingRequestRequest`

| Field | Type | Required | Description |
|---|---|---|---|
| `meeting_date` | string (date) | yes | Desired meeting date (YYYY-MM-DD). |
| `parent_notes` | string | min 1 | no |  |
| `student_id` | integer | yes | Student user id. |
| `teacher_id` | integer | yes | Teacher user id. |
| `time_slot` | string | min 1 | yes | Requested meeting time slot. |

### `ParentResultExamItem`

| Field | Type | Required | Description |
|---|---|---|---|
| `exam_name` | string | yes |  |
| `id` | integer | yes |  |
| `max_marks` | number | yes |  |
| `subject_name` | string | yes |  |

### `ParentTeacherContactItem`

| Field | Type | Required | Description |
|---|---|---|---|
| `class_name` | string | yes |  |
| `id` | integer | yes |  |
| `name` | string | yes |  |
| `subject_name` | string | yes |  |

### `ParentTransportAllocationItem`

| Field | Type | Required | Description |
|---|---|---|---|
| `driver_name` | string | nullable | no |  |
| `end_point` | string | nullable | no |  |
| `maintenance_status` | string | nullable | no |  |
| `pickup_point` | string | nullable | no |  |
| `route_name` | string | nullable | no |  |
| `start_point` | string | nullable | no |  |
| `vehicle_id` | integer | yes |  |
| `vehicle_number` | string | yes |  |

### `ParentTransportLocationItem`

| Field | Type | Required | Description |
|---|---|---|---|
| `latitude` | number | nullable | no |  |
| `longitude` | number | nullable | no |  |
| `updated_at` | string (date-time) | nullable | no |  |

### `PatchedAdminUserDetailPatchRequestRequest`

| Field | Type | Required | Description |
|---|---|---|---|
| `is_active` | boolean | no | Toggle account active status. |
| `role` | any | no | Reassign the user's role/group.  * `Student` - Student * `Teacher` - Teacher * `Parent` - Parent * `Admin` - Admin * `Employee` - Employee |

### `PatchedInventoryAdjustRequestRequest`

| Field | Type | Required | Description |
|---|---|---|---|
| `id` | integer | no |  |
| `quantity_delta` | integer | no |  |

### `PatchedPayrollUpdateRequestRequest`

| Field | Type | Required | Description |
|---|---|---|---|
| `allowances` | string (decimal) | no |  |
| `deductions` | string (decimal) | no |  |
| `id` | integer | no |  |
| `status` | string | min 1 | no |  |

### `PatchedTeacherAssignmentPatchRequestRequest`

| Field | Type | Required | Description |
|---|---|---|---|
| `assignment_type` | TeacherAssignmentPatchRequestAssignmentTypeEnum | no |  |
| `description` | string | no |  |
| `due_date` | string (date) | nullable | no |  |
| `file_url` | any | no |  |
| `max_marks` | number | no |  |
| `quiz_questions` | array<TeacherQuizQuestionItemRequest> | no |  |
| `title` | string | no |  |

### `PatchedTeacherSubmissionGradeRequestRequest`

| Field | Type | Required | Description |
|---|---|---|---|
| `marks_obtained` | number | nullable | no |  |
| `teacher_feedback` | string | no |  |

### `PaymentFeeStructureItem`

| Field | Type | Required | Description |
|---|---|---|---|
| `id` | integer | yes |  |
| `term_name` | string | yes |  |
| `total_amount` | number | yes |  |

### `PaymentHistoryItem`

| Field | Type | Required | Description |
|---|---|---|---|
| `amount_paid` | number | yes |  |
| `fee_structure_detail` | PaymentFeeStructureItem | yes |  |
| `id` | integer | yes |  |
| `paid_at` | string (date-time) | nullable | no |  |
| `status` | string | yes |  |
| `transaction_id` | string | yes |  |

### `PayrollItem`

| Field | Type | Required | Description |
|---|---|---|---|
| `allowances` | string (decimal) | yes |  |
| `basic_salary` | string (decimal) | yes |  |
| `deductions` | string (decimal) | yes |  |
| `department` | string | no |  |
| `designation` | string | no |  |
| `employee_code` | string | no |  |
| `employee_id` | integer | yes |  |
| `employee_name` | string | yes |  |
| `generated_by` | integer | no |  |
| `id` | integer | yes |  |
| `net_pay` | string (decimal) | yes |  |
| `paid_on` | string (date-time) | no |  |
| `pay_month` | string | yes |  |
| `status` | string | yes |  |

### `QuantityDetailResponse`

| Field | Type | Required | Description |
|---|---|---|---|
| `detail` | string | yes |  |
| `quantity` | integer | yes |  |

### `QuizDetailResponse`

| Field | Type | Required | Description |
|---|---|---|---|
| `duration_minutes` | integer | nullable | no |  |
| `id` | integer | yes |  |
| `passing_score` | number | nullable | no |  |
| `questions` | array<QuizQuestionItem> | yes |  |
| `title` | string | yes |  |

### `QuizQuestionItem`

| Field | Type | Required | Description |
|---|---|---|---|
| `id` | integer | yes |  |
| `options` | array | yes |  |
| `question_text` | string | yes |  |

### `QuizSubmitRequestRequest`

| Field | Type | Required | Description |
|---|---|---|---|
| `answers` | object<string, any> | nullable | no |  |

### `QuizSubmitResponse`

| Field | Type | Required | Description |
|---|---|---|---|
| `detail` | string | yes |  |
| `score` | integer | yes |  |

### `ResendOtpRequestRequest`

| Field | Type | Required | Description |
|---|---|---|---|
| `user_id` | integer | yes | User id returned by auth/login to resend OTP for. |

### `ResultExamItem`

| Field | Type | Required | Description |
|---|---|---|---|
| `exam_name` | string | yes |  |
| `id` | integer | yes |  |
| `max_marks` | number | yes |  |
| `subject_name` | string | yes |  |

### `ResultItem`

| Field | Type | Required | Description |
|---|---|---|---|
| `exam` | ResultExamItem | yes |  |
| `grade_letter` | string | yes |  |
| `id` | integer | yes |  |
| `marks_obtained` | number | yes |  |
| `percentage` | number | yes |  |
| `rank_position` | integer | nullable | no |  |
| `remarks` | string | yes |  |

### `RoleEnum`

*No properties.*

### `RoomCreateRequestRequest`

| Field | Type | Required | Description |
|---|---|---|---|
| `capacity` | integer | no |  |
| `hostel_id` | integer | yes |  |
| `room_number` | string | min 1 | yes |  |

### `RoomItem`

| Field | Type | Required | Description |
|---|---|---|---|
| `capacity` | integer | yes |  |
| `hostel_id` | integer | yes |  |
| `hostel_name` | string | yes |  |
| `id` | integer | yes |  |
| `occupied_beds` | integer | no |  |
| `room_number` | string | yes |  |

### `ScholarshipInfo`

| Field | Type | Required | Description |
|---|---|---|---|
| `coverage_percent` | integer (int64) | min 0, max 9223372036854775807, nullable | no |  |
| `description` | string | yes |  |
| `eligibility` | string | no |  |
| `id` | integer | read-only | yes |  |
| `name` | string | max 200 | yes |  |
| `sort_order` | integer (int64) | min 0, max 9223372036854775807 | no |  |

### `SchoolSettings`

| Field | Type | Required | Description |
|---|---|---|---|
| `admissions_academic_year` | string | max 50 | no |  |
| `admissions_close_date` | string (date) | nullable | no |  |
| `admissions_open` | boolean | no |  |
| `admissions_start_date` | string (date) | nullable | no |  |
| `brand_name` | string | max 100 | no |  |
| `company_type` | string | max 255 | no |  |
| `established_year` | integer (int64) | min 0, max 9223372036854775807 | no |  |
| `headquarters_address` | string | no |  |
| `id` | integer | read-only | yes |  |
| `legal_name` | string | max 255 | no |  |
| `tagline` | string | max 255 | no |  |
| `website_domain` | string | max 255 | no |  |

### `SchoolStat`

| Field | Type | Required | Description |
|---|---|---|---|
| `icon` | string | max 50 | no | icon name/key for frontend |
| `id` | integer | read-only | yes |  |
| `label` | string | max 150 | yes |  |
| `sort_order` | integer (int64) | min 0, max 9223372036854775807 | no |  |
| `value` | string | max 50 | yes |  |

### `StatusEnum`

*No properties.*

### `StudentDashboardResponse`

| Field | Type | Required | Description |
|---|---|---|---|
| `announcements` | array<DashboardAnnouncementItem> | yes |  |
| `assignments_due` | array<DashboardAssignmentItem> | yes |  |
| `attendance_percentage` | number | nullable | no |  |
| `homework_due` | array<DashboardHomeworkItem> | yes |  |
| `pending_fees` | array<DashboardPendingFeeItem> | yes |  |
| `recent_results` | array<DashboardResultItem> | yes |  |
| `upcoming_exams` | array<DashboardUpcomingExamItem> | yes |  |

### `StudentHostelItem`

| Field | Type | Required | Description |
|---|---|---|---|
| `allocated_date` | string (date) | yes |  |
| `hostel_name` | string | yes |  |
| `room_number` | string | yes |  |
| `type` | string | no |  |

### `StudentMedicalItem`

| Field | Type | Required | Description |
|---|---|---|---|
| `doctor_notes` | string | no |  |
| `id` | integer | yes |  |
| `symptoms` | string | no |  |
| `treatment_given` | string | no |  |
| `visit_date` | string (date) | yes |  |

### `StudentProfileResponse`

| Field | Type | Required | Description |
|---|---|---|---|
| `academic_year` | string | nullable | no |  |
| `admission_number` | string | yes |  |
| `blood_group` | string | yes |  |
| `class_name` | string | yes | Class grade-section, or 'Not assigned'. |
| `date_of_birth` | string (date) | nullable | no |  |
| `email` | any | yes |  |
| `gender` | string | yes |  |
| `id` | integer | yes | Django auth user id. |
| `name` | string | yes | Full name of the student. |
| `phone_number` | string | yes |  |
| `roll_number` | string | nullable | no |  |
| `status` | string | yes |  |

### `StudentTransportItem`

| Field | Type | Required | Description |
|---|---|---|---|
| `driver_name` | string | no |  |
| `end_point` | string | yes |  |
| `maintenance_status` | string | no |  |
| `pickup_point` | string | yes |  |
| `route_name` | string | yes |  |
| `start_point` | string | yes |  |
| `vehicle_id` | integer | yes |  |
| `vehicle_number` | string | yes |  |

### `SuccessDetailResponse`

| Field | Type | Required | Description |
|---|---|---|---|
| `detail` | string | yes | Human readable result message. |

### `TeacherAdmissionEnquiryItem`

| Field | Type | Required | Description |
|---|---|---|---|
| `applicant_name` | string | nullable | no |  |
| `date_of_birth` | string (date) | nullable | no |  |
| `gender` | string | nullable | no |  |
| `parent_email` | string (email) | nullable | no |  |
| `parent_name` | string | nullable | no |  |
| `parent_phone` | string | nullable | no |  |
| `registration_number` | string | yes |  |
| `rejection_reason` | string | nullable | no |  |
| `scholarship_applied` | boolean | no |  |
| `status` | string | yes |  |
| `submitted_at` | string (date-time) | nullable | no |  |
| `target_class` | string | nullable | no |  |

### `TeacherAdmissionReviewRequestActionEnum`

*No properties.*

### `TeacherAdmissionReviewRequestRequest`

| Field | Type | Required | Description |
|---|---|---|---|
| `action` | any | yes | Interview recommendation to submit.  * `recommend_advance` - recommend_advance * `recommend_reject` - recommend_reject |
| `registration_number` | string | min 1 | yes |  |
| `remarks` | string | no |  |

### `TeacherAdmissionReviewResponse`

| Field | Type | Required | Description |
|---|---|---|---|
| `detail` | string | yes |  |
| `status` | string | no |  |

### `TeacherAssignmentCreateRequestAssignmentTypeEnum`

*No properties.*

### `TeacherAssignmentCreateRequestRequest`

| Field | Type | Required | Description |
|---|---|---|---|
| `assignment_type` | any | default 'File' | no |  |
| `class_id` | integer | yes |  |
| `description` | string | no |  |
| `due_date` | string (date) | nullable | no |  |
| `file_url` | any | no |  |
| `max_marks` | number | default 100.0 | no |  |
| `quiz_questions` | array<TeacherQuizQuestionItemRequest> | default [] | no |  |
| `subject_id` | integer | yes |  |
| `title` | string | min 1 | yes |  |

### `TeacherAssignmentItem`

| Field | Type | Required | Description |
|---|---|---|---|
| `assignment_type` | string | yes |  |
| `class_name` | string | yes |  |
| `description` | string | nullable | no |  |
| `due_date` | string (date) | nullable | no |  |
| `file_url` | string (uri) | nullable | no |  |
| `graded_count` | integer | yes |  |
| `id` | integer | yes |  |
| `max_marks` | number | nullable | no |  |
| `quiz_questions` | any | nullable | no |  |
| `subject_name` | string | yes |  |
| `submission_count` | integer | yes |  |
| `title` | string | yes |  |

### `TeacherAssignmentPatchRequestAssignmentTypeEnum`

*No properties.*

### `TeacherAttendanceFlagItem`

| Field | Type | Required | Description |
|---|---|---|---|
| `class_name` | string | yes |  |
| `complete` | boolean | yes | Attendance fully marked for today. |
| `marked_count` | integer | yes |  |
| `roster_count` | integer | yes |  |
| `subject_name` | string | yes |  |

### `TeacherAttendanceMarkItemRequest`

| Field | Type | Required | Description |
|---|---|---|---|
| `remarks` | string | no |  |
| `status` | string | min 1, default 'Present' | no | Present/Absent/Late/Leaver/Leave. |
| `student` | integer | yes | Student (auth user) id. |

### `TeacherAttendanceMarkRequestRequest`

| Field | Type | Required | Description |
|---|---|---|---|
| `class_id` | integer | yes |  |
| `date` | string (date) | no | Defaults to the current date. |
| `records` | array<TeacherAttendanceMarkItemRequest> | yes |  |

### `TeacherAttendanceRecord`

| Field | Type | Required | Description |
|---|---|---|---|
| `admission_number` | string | nullable | no |  |
| `remarks` | string | no |  |
| `status` | string | yes | Present / Absent / Late / etc. |
| `student` | integer | yes | Student (auth user) id. |
| `student_name` | string | yes |  |

### `TeacherAttendanceRecordsResponse`

| Field | Type | Required | Description |
|---|---|---|---|
| `records` | array<TeacherAttendanceRecord> | yes |  |

### `TeacherClassItem`

| Field | Type | Required | Description |
|---|---|---|---|
| `class_id` | integer | yes |  |
| `class_name` | string | yes |  |
| `id` | string | yes | Allocation id; 'ct-<class_id>' for class-teacher rows. |
| `student_count` | integer | yes |  |
| `subject_id` | integer | yes |  |
| `subject_name` | string | yes |  |

### `TeacherContactItem`

| Field | Type | Required | Description |
|---|---|---|---|
| `id` | integer | yes |  |
| `name` | string | yes |  |
| `role` | string | yes |  |

### `TeacherDashboard`

| Field | Type | Required | Description |
|---|---|---|---|
| `attendance_flags` | array<TeacherAttendanceFlagItem> | yes |  |
| `pending_grading` | integer | yes |  |
| `today` | string (date) | yes |  |
| `todays_timetable` | array<TeacherTodaysTimetableItem> | no |  |
| `total_classes` | integer | yes |  |
| `unread_messages` | integer | yes |  |
| `upcoming_exams` | array<TeacherUpcomingExamItem> | yes |  |

### `TeacherDocumentCreateRequestRequest`

| Field | Type | Required | Description |
|---|---|---|---|
| `class_id` | integer | nullable | no |  |
| `content_type` | string | min 1 | yes |  |
| `resource_url` | any | no |  |
| `subject_id` | integer | nullable | no |  |
| `title` | string | min 1 | yes |  |

### `TeacherDocumentItem`

| Field | Type | Required | Description |
|---|---|---|---|
| `content_type` | string | yes |  |
| `id` | integer | yes |  |
| `resource_url` | string (uri) | nullable | no |  |
| `title` | string | yes |  |

### `TeacherExamCreateRequestRequest`

| Field | Type | Required | Description |
|---|---|---|---|
| `class_id` | integer | yes |  |
| `duration_minutes` | integer | default 60 | no |  |
| `exam_date` | string (date) | no |  |
| `exam_name` | string | min 1 | yes | Must be from the allowed exam cycle names. |
| `exam_type` | any | default 'Unit_Test' | no |  |
| `max_marks` | number | default 100.0 | no |  |
| `start_time` | string (time) | default '09:00' | no |  |
| `subject_id` | integer | yes |  |

### `TeacherExamScheduleItem`

| Field | Type | Required | Description |
|---|---|---|---|
| `class_name` | string | yes |  |
| `duration_minutes` | integer | yes |  |
| `exam_date` | string (date) | yes |  |
| `exam_name` | string | yes |  |
| `exam_type` | string | yes |  |
| `id` | integer | yes |  |
| `max_marks` | number | yes |  |
| `start_time` | string (time) | yes |  |
| `subject_name` | string | yes |  |

### `TeacherHomeworkCreateRequestRequest`

| Field | Type | Required | Description |
|---|---|---|---|
| `assigned_date` | string (date) | no |  |
| `class_id` | integer | yes |  |
| `description` | string | no |  |
| `due_date` | string (date) | nullable | no |  |
| `subject_id` | integer | nullable | no | Pass 0 or omit for Class Administration. |
| `title` | string | min 1 | yes |  |

### `TeacherHomeworkItem`

| Field | Type | Required | Description |
|---|---|---|---|
| `assigned_date` | string (date) | yes |  |
| `class_name` | string | yes |  |
| `description` | string | nullable | no |  |
| `due_date` | string (date) | nullable | no |  |
| `id` | integer | yes |  |
| `subject_name` | string | yes |  |
| `title` | string | yes |  |

### `TeacherLeaveItem`

| Field | Type | Required | Description |
|---|---|---|---|
| `end_date` | string (date) | yes |  |
| `id` | integer | yes |  |
| `leave_type` | string | yes |  |
| `reason` | string | no |  |
| `start_date` | string (date) | yes |  |
| `status` | string | yes |  |

### `TeacherLmsChapterCreateRequestRequest`

| Field | Type | Required | Description |
|---|---|---|---|
| `class_id` | integer | nullable | no |  |
| `course_id` | integer | nullable | no |  |
| `description` | string | min 1 | no |  |
| `pdf_url` | string (uri) | min 1, nullable | no |  |
| `sort_order` | integer | default 0 | no |  |
| `subject_id` | integer | nullable | no |  |
| `title` | string | min 1 | yes |  |

### `TeacherLmsChapterItem`

| Field | Type | Required | Description |
|---|---|---|---|
| `description` | string | no |  |
| `id` | integer | yes |  |
| `sort_order` | integer | yes |  |
| `title` | string | yes |  |

### `TeacherLmsChapterUpdateRequestRequest`

| Field | Type | Required | Description |
|---|---|---|---|
| `description` | string | min 1 | no |  |
| `id` | integer | yes |  |
| `pdf_url` | any | no |  |
| `title` | string | min 1 | no |  |

### `TeacherLmsCourseItem`

| Field | Type | Required | Description |
|---|---|---|---|
| `class_id` | integer | yes |  |
| `class_name` | string | yes |  |
| `description` | string | nullable | no |  |
| `id` | integer | yes |  |
| `subject_id` | integer | yes |  |
| `subject_name` | string | yes |  |
| `title` | string | yes |  |

### `TeacherLmsLessonCreateRequestRequest`

| Field | Type | Required | Description |
|---|---|---|---|
| `chapter_id` | integer | yes |  |
| `description` | string | min 1 | no |  |
| `sort_order` | integer | default 0 | no |  |
| `title` | string | min 1 | yes |  |

### `TeacherLmsLessonItem`

| Field | Type | Required | Description |
|---|---|---|---|
| `description` | string | no |  |
| `id` | integer | yes |  |
| `sort_order` | integer | yes |  |
| `title` | string | yes |  |

### `TeacherLmsLessonUpdateRequestRequest`

| Field | Type | Required | Description |
|---|---|---|---|
| `description` | string | min 1 | no |  |
| `id` | integer | yes |  |
| `title` | string | min 1 | no |  |

### `TeacherLmsResourceCreateRequestRequest`

| Field | Type | Required | Description |
|---|---|---|---|
| `content_type` | any | default 'PDF' | no |  |
| `course_id` | integer | yes |  |
| `description` | string | min 1 | no |  |
| `due_date` | string | min 1, nullable | no |  |
| `lesson_id` | integer | yes |  |
| `max_marks` | number | nullable | no |  |
| `questions` | array<TeacherQuizQuestionItemRequest> | no |  |
| `resource_url` | any | no |  |
| `title` | string | min 1 | yes |  |
| `visible_from` | string | min 1 | no |  |

### `TeacherLmsResourceItem`

| Field | Type | Required | Description |
|---|---|---|---|
| `assignment_id` | integer | nullable | no |  |
| `content_type` | string | yes |  |
| `description` | string | no |  |
| `due_date` | string | nullable | no |  |
| `id` | integer | yes |  |
| `max_marks` | number | nullable | no |  |
| `quiz_id` | integer | nullable | no |  |
| `resource_url` | string (uri) | nullable | no |  |
| `title` | string | yes |  |
| `visible_from` | string | nullable | no |  |

### `TeacherLmsResourceUpdateRequestRequest`

| Field | Type | Required | Description |
|---|---|---|---|
| `description` | string | min 1 | no |  |
| `due_date` | string | min 1, nullable | no |  |
| `id` | integer | yes |  |
| `max_marks` | number | nullable | no |  |
| `resource_url` | any | no |  |
| `title` | string | no |  |

### `TeacherMarksEntryExamItem`

| Field | Type | Required | Description |
|---|---|---|---|
| `class_name` | string | no |  |
| `exam_name` | string | no |  |
| `id` | integer | nullable | no |  |
| `max_marks` | number | no |  |
| `subject_name` | string | no |  |

### `TeacherMarksEntryResponse`

| Field | Type | Required | Description |
|---|---|---|---|
| `exam` | TeacherMarksEntryExamItem | yes |  |
| `rows` | array<TeacherMarksEntryRowItem> | yes |  |

### `TeacherMarksEntryRowItem`

| Field | Type | Required | Description |
|---|---|---|---|
| `admission_number` | string | nullable | no |  |
| `grade_letter` | string | nullable | no |  |
| `marks_obtained` | number | nullable | no |  |
| `published` | boolean | yes |  |
| `remarks` | string | no |  |
| `student` | integer | yes | Student (auth user) id. |
| `student_name` | string | yes |  |

### `TeacherMarksEntryRowRequest`

| Field | Type | Required | Description |
|---|---|---|---|
| `grade_letter` | string | no |  |
| `id` | string | min 1 | yes | Student (auth user) id. |
| `marks_obtained` | number | nullable | no |  |
| `remarks` | string | no |  |
| `student` | integer | nullable | no | Student (auth user) id. |

### `TeacherMarksEntrySubmitRequestRequest`

| Field | Type | Required | Description |
|---|---|---|---|
| `entries` | array<TeacherMarksEntryRowRequest> | no | Marks rows (modern key). |
| `exam_schedule_id` | integer | yes |  |
| `rows` | array<TeacherMarksEntryRowRequest> | no | Marks rows (legacy key). |
| `submit` | boolean | default True | no |  |

### `TeacherMessageItem`

| Field | Type | Required | Description |
|---|---|---|---|
| `created_at` | string (date-time) | yes |  |
| `id` | integer | yes |  |
| `message_text` | string | yes |  |
| `receiver` | integer | yes |  |
| `receiver_name` | string | no |  |
| `sender` | integer | yes |  |
| `sender_name` | string | no |  |

### `TeacherMessageSendRequestRequest`

| Field | Type | Required | Description |
|---|---|---|---|
| `message_text` | string | min 1 | yes |  |
| `receiver` | integer | yes | Recipient (auth user) id. |

### `TeacherNoticeItem`

| Field | Type | Required | Description |
|---|---|---|---|
| `content` | string | nullable | no |  |
| `created_at` | string (date-time) | nullable | no |  |
| `file_attachment_url` | string (uri) | nullable | no |  |
| `id` | integer | yes |  |
| `is_pinned` | boolean | yes |  |
| `title` | string | yes |  |

### `TeacherPdfScanRequestRequest`

| Field | Type | Required | Description |
|---|---|---|---|
| `file` | string (binary) | yes | PDF file to extract questions from. |

### `TeacherPdfScanResponse`

| Field | Type | Required | Description |
|---|---|---|---|
| `questions` | array<TeacherScanQuestion> | no |  |

### `TeacherPerformanceResponse`

| Field | Type | Required | Description |
|---|---|---|---|
| `class_average` | number | yes |  |
| `students` | array<TeacherPerformanceStudentItem> | yes |  |

### `TeacherPerformanceStudentItem`

| Field | Type | Required | Description |
|---|---|---|---|
| `attendance_percentage` | number | yes |  |
| `average_marks` | number | yes |  |
| `exams_taken` | integer | yes |  |
| `name` | string | yes |  |
| `student_id` | integer | yes |  |

### `TeacherProfile`

| Field | Type | Required | Description |
|---|---|---|---|
| `date_of_joining` | string (date) | nullable | no | Date the teacher joined. |
| `email` | any | yes |  |
| `employee_code` | string | no |  |
| `id` | integer | yes | Django auth user id. |
| `name` | string | yes | Full name of the teacher. |
| `phone_number` | string | no |  |
| `qualification` | string | no |  |
| `specialization` | string | no |  |
| `user_type` | string | yes | Always 'Teacher'. |

### `TeacherQuestionBankItem`

| Field | Type | Required | Description |
|---|---|---|---|
| `answer_schema` | any | nullable | no |  |
| `difficulty_level` | string | yes |  |
| `id` | integer | yes |  |
| `question_text` | string | yes |  |
| `subject_id` | integer | yes |  |
| `subject_name` | string | yes |  |

### `TeacherQuestionCreateRequestRequest`

| Field | Type | Required | Description |
|---|---|---|---|
| `answer_schema` | any | default {} | no |  |
| `difficulty_level` | string | min 1, default 'Medium' | no |  |
| `question_text` | string | min 1 | yes |  |
| `subject_id` | integer | yes |  |

### `TeacherQuizQuestionItemRequest`

| Field | Type | Required | Description |
|---|---|---|---|
| `correct_answer` | string | no |  |
| `options` | array<string | min 1> | yes |  |
| `question_text` | string | min 1 | yes |  |

### `TeacherScanQuestion`

| Field | Type | Required | Description |
|---|---|---|---|
| `correct_answer` | string | no |  |
| `options` | array<string> | yes |  |
| `question_text` | string | yes |  |

### `TeacherStudentRosterItem`

| Field | Type | Required | Description |
|---|---|---|---|
| `admission_number` | string | nullable | no |  |
| `roll_number` | string | nullable | no |  |
| `student` | integer | yes | Student (auth user) id. |
| `student_name` | string | yes |  |

### `TeacherSubmissionItem`

| Field | Type | Required | Description |
|---|---|---|---|
| `admission_number` | string | nullable | no |  |
| `grade` | string | nullable | no |  |
| `id` | integer | yes |  |
| `marks_obtained` | number | nullable | no |  |
| `student` | integer | yes |  |
| `student_name` | string | yes |  |
| `submission_url` | string (uri) | nullable | no |  |
| `submitted_at` | string (date-time) | yes |  |
| `teacher_feedback` | string | no |  |

### `TeacherTimetableItem`

| Field | Type | Required | Description |
|---|---|---|---|
| `class_name` | string | yes |  |
| `day_of_week` | string | yes |  |
| `end_time` | string (time) | yes |  |
| `id` | integer | yes |  |
| `start_time` | string (time) | yes |  |
| `subject_name` | string | yes |  |

### `TeacherTodaysTimetableItem`

| Field | Type | Required | Description |
|---|---|---|---|
| `class_name` | string | yes |  |
| `end_time` | string (time) | yes |  |
| `id` | integer | yes |  |
| `start_time` | string (time) | yes |  |
| `subject_name` | string | yes |  |

### `TeacherUpcomingExamItem`

| Field | Type | Required | Description |
|---|---|---|---|
| `class_name` | string | yes |  |
| `exam_date` | string (date) | yes |  |
| `exam_name` | string | yes |  |
| `id` | integer | yes |  |
| `subject_name` | string | yes |  |

### `TechnologyPartner`

| Field | Type | Required | Description |
|---|---|---|---|
| `id` | integer | read-only | yes |  |
| `logo` | string (uri) | nullable | no |  |
| `name` | string | max 100 | yes |  |
| `sort_order` | integer (int64) | min 0, max 9223372036854775807 | no |  |
| `website_url` | any | no |  |

### `Testimonial`

| Field | Type | Required | Description |
|---|---|---|---|
| `author_name` | string | max 150 | yes |  |
| `id` | integer | read-only | yes |  |
| `is_featured` | boolean | no |  |
| `message` | string | yes |  |
| `photo` | string (uri) | nullable | no |  |
| `role` | string | max 100 | yes | e.g. Parent, Alumnus, Student |
| `sort_order` | integer (int64) | min 0, max 9223372036854775807 | no |  |

### `TimetableItem`

| Field | Type | Required | Description |
|---|---|---|---|
| `day_of_week` | string | yes |  |
| `end_time` | string (time) | yes |  |
| `id` | integer | yes |  |
| `start_time` | string (time) | yes |  |
| `subject_name` | string | yes |  |
| `teacher_name` | string | yes |  |

### `TokenRefreshRequestRequest`

| Field | Type | Required | Description |
|---|---|---|---|
| `refresh` | string | min 1 | yes | JWT refresh token. |

### `TokenRefreshResponse`

| Field | Type | Required | Description |
|---|---|---|---|
| `access` | string | yes | New JWT access token. |

### `UserPayload`

| Field | Type | Required | Description |
|---|---|---|---|
| `email` | any | yes |  |
| `first_name` | string | yes |  |
| `id` | integer | yes | Django auth user id. |
| `last_name` | string | yes |  |
| `name` | string | yes | Full name of the user. |
| `user_type` | string | yes | Resolved portal role: Admin, Teacher, Parent, Student or Employee. |
| `username` | string | yes |  |

### `ValidationErrorResponse`

| Field | Type | Required | Description |
|---|---|---|---|
| `detail` | string | no | Human readable error message. |
| `field_errors` | object<string, any> | no | Map of field name to list of validation errors. |

### `VerifyOtpRequestRequest`

| Field | Type | Required | Description |
|---|---|---|---|
| `otp` | string | min 1 | yes | 6-digit one-time password received by email. |
| `user_id` | integer | yes | User id returned by auth/login. |

### `VerifyOtpResponse`

| Field | Type | Required | Description |
|---|---|---|---|
| `access` | string | yes | JWT access token (Bearer). |
| `refresh` | string | yes | JWT refresh token. |
| `user` | UserPayload | yes |  |

### `VisitorCheckInResponse`

| Field | Type | Required | Description |
|---|---|---|---|
| `check_in_time` | string (date-time) | yes |  |
| `detail` | string | yes |  |
| `id` | integer | yes |  |

### `VisitorLogCreateRequestRequest`

| Field | Type | Required | Description |
|---|---|---|---|
| `host_user_id` | integer | no |  |
| `id_proof_type` | string | min 1 | no |  |
| `purpose` | string | min 1 | yes |  |
| `visitor_name` | string | min 1 | yes |  |

### `VisitorLogItem`

| Field | Type | Required | Description |
|---|---|---|---|
| `check_in_time` | string (date-time) | no |  |
| `check_out_time` | string (date-time) | no |  |
| `host_name` | string | no |  |
| `host_user_id` | integer | no |  |
| `id` | integer | yes |  |
| `id_proof_type` | string | yes |  |
| `purpose` | string | yes |  |
| `visitor_name` | string | yes |  |

### `WhyChooseItem`

| Field | Type | Required | Description |
|---|---|---|---|
| `description` | string | no |  |
| `icon` | string | max 50 | no |  |
| `id` | integer | read-only | yes |  |
| `sort_order` | integer (int64) | min 0, max 9223372036854775807 | no |  |
| `title` | string | max 150 | yes |  |
