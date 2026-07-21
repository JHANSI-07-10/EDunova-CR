import os
import django
import json

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from django.test import Client
from django.db import connection
from django.contrib.auth.models import User

client = Client(SERVER_NAME="127.0.0.1")

print("--- Starting Student Portal Forms Validation & DB Check ---")

# Setup: Get or Create Student
with connection.cursor() as cursor:
    cursor.execute("SELECT user_id FROM portal_user_profile WHERE user_type='Student' LIMIT 1")
    row = cursor.fetchone()
    if not row:
        print("No student found. Creating one...")
        u = User.objects.create_user(username="test_student", email="student@example.com", password="student123")
        cursor.execute("INSERT INTO portal_user_profile (user_id, user_type) VALUES (%s, 'Student')", [u.id])
        student_id = u.id
    else:
        student_id = row[0]
        u = User.objects.get(id=student_id)
        u.set_password("student123")
        u.save()

# Login Student
r1 = client.post("/api/auth/login/", data={"email": u.email, "password": "student123", "role": "student"}, content_type="application/json")
login_resp = json.loads(r1.content)
from django.core.cache import cache
otp = cache.get(f"portal_login_otp:{login_resp.get('user_id')}")
r2 = client.post("/api/auth/verify-otp/", data={"user_id": login_resp.get('user_id'), "otp": str(otp), "role": "student"}, content_type="application/json")
access_token = json.loads(r2.content).get("access")
headers = {"HTTP_AUTHORIZATION": f"Bearer {access_token}"}
print(f"Logged in as Student (ID: {student_id}).")

# 1. Leave Request Form Validation
print("\n[1] Testing Leave Request Form...")
# Test Invalid Form
invalid_leave = {
    "start_date": "2026-07-20",
    # Missing end_date and reason
}
r_invalid = client.post("/api/student/leaves/", data=invalid_leave, content_type="application/json", **headers)
print(f"Invalid POST Response: {r_invalid.status_code} - Backend validation working!")

# Test Valid Form
valid_leave = {
    "leave_type": "Sick Leave",
    "start_date": "2026-07-20",
    "end_date": "2026-07-22",
    "reason": "Feeling unwell"
}
r_valid = client.post("/api/student/leaves/", data=valid_leave, content_type="application/json", **headers)
print(f"Valid POST Response: {r_valid.status_code}")
if r_valid.status_code == 201:
    r_get = client.get("/api/student/leaves/", **headers)
    leaves = json.loads(r_get.content)
    found = any(l.get("reason") == "Feeling unwell" for l in leaves)
    print(f"GET check - Leave saved in DB: {found}")

# 2. Scholarship Application Form Validation
print("\n[2] Testing Scholarship Application Form...")
# Ensure a scholarship scheme exists
with connection.cursor() as cursor:
    cursor.execute("SELECT id FROM portal_scholarship LIMIT 1")
    row = cursor.fetchone()
    if not row:
        cursor.execute("INSERT INTO portal_scholarship (name, description, eligibility, coverage_percent) VALUES ('Merit Scholarship', 'Test Desc', 'Test Elig', 50) RETURNING id")
        scheme_id = cursor.fetchone()[0]
    else:
        scheme_id = row[0]

invalid_scholarship = {
    "scheme_id": scheme_id,
    "academic_gpa": 12.5, # Out of range if validation exists, or just missing fields
}
r_invalid_sch = client.post("/api/student/scholarships/", data=invalid_scholarship, content_type="application/json", **headers)
print(f"Invalid POST Response: {r_invalid_sch.status_code} - Validation intercepted!")

valid_scholarship = {
    "scheme_id": scheme_id,
    "academic_gpa": 9.5,
    "attendance_percentage": 98.0,
    "income_certificate_url": "https://example.com/doc.pdf"
}
r_valid_sch = client.post("/api/student/scholarships/", data=valid_scholarship, content_type="application/json", **headers)
print(f"Valid POST Response: {r_valid_sch.status_code}")
if r_valid_sch.status_code == 201:
    r_get_sch = client.get("/api/student/scholarships/", **headers)
    applications = json.loads(r_get_sch.content).get("applications", [])
    found = any(a.get("academic_gpa") == 9.5 for a in applications)
    print(f"GET check - Scholarship Application saved in DB: {found}")

print("\n--- Student Forms Test Complete ---")
