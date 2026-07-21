import os
import django
import json

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from django.test import Client
from django.core.cache import cache

client = Client(SERVER_NAME="127.0.0.1")

print("--- Starting Exam Workflow API Test ---")

# Setup: Admin Login
print("\n[Setup] Logging in as Admin...")
login_data = {"email": "admin@example.com", "password": "admin123", "role": "admin"}
r1 = client.post("/api/auth/login/", data=login_data, content_type="application/json")
login_resp = json.loads(r1.content)
user_id = login_resp.get("user_id")
otp = cache.get(f"portal_login_otp:{user_id}")
r2 = client.post("/api/auth/verify-otp/", data={"user_id": user_id, "otp": str(otp), "role": "admin"}, content_type="application/json")
if r2.status_code != 200:
    print(f"Verify OTP failed: {r2.content.decode()}")
    exit(1)
access_token = json.loads(r2.content).get("access")
headers = {"HTTP_AUTHORIZATION": f"Bearer {access_token}"}
print("Admin Token Acquired.")

from django.db import connection
from django.contrib.auth.models import User

# Setup: Ensure a student exists
with connection.cursor() as cursor:
    cursor.execute("SELECT user_id FROM portal_user_profile WHERE user_type='Student' LIMIT 1")
    row = cursor.fetchone()
    if not row:
        u = User.objects.create_user(username="exam_student", email="exam_student@example.com", password="student123")
        cursor.execute("INSERT INTO portal_user_profile (user_id, user_type) VALUES (%s, 'Student')", [u.id])
        student_id = u.id
    else:
        student_id = row[0]

# Exam Workflow Endpoints to test GET requests
endpoints = [
    ("Types", "/api/admin-portal/exam-workflow/types/"),
    ("Subjects Config", "/api/admin-portal/exam-workflow/subjects/"),
    ("Seating", "/api/admin-portal/exam-workflow/seating/"),
    ("Invigilators", "/api/admin-portal/exam-workflow/invigilators/"),
    ("Verify Marks", "/api/admin-portal/exam-workflow/verify-marks/"),
    ("Grade Config", "/api/admin-portal/exam-workflow/grade-config/"),
    ("Process Results", "/api/admin-portal/exam-workflow/process-results/"),
    ("Notifications", "/api/admin-portal/exam-workflow/notifications/"),
    ("Audit Logs", "/api/admin-portal/exam-workflow/audit-logs/"),
    ("Reports", "/api/admin-portal/exam-workflow/reports/"),
    ("Analytics", "/api/admin-portal/exam-workflow/analytics/"),
    ("Practical", "/api/admin-portal/exam-workflow/practical/"),
    ("Blueprints", "/api/admin-portal/exam-workflow/blueprints/"),
    ("Viva", "/api/admin-portal/exam-workflow/viva/"),
    ("Attendance", "/api/admin-portal/exam-workflow/attendance/"),
    ("Malpractice", "/api/admin-portal/exam-workflow/malpractice/"),
    ("Improvement", "/api/admin-portal/exam-workflow/improvement/"),
    ("CGPA", f"/api/admin-portal/exam-workflow/cgpa/?student_id={student_id}"),
]

for name, endpoint in endpoints:
    print(f"\n[{name}] Testing GET {endpoint}")
    r = client.get(endpoint, **headers)
    print(f"GET Response: {r.status_code}")
    if r.status_code == 500:
        print("BUG FOUND - 500 Internal Server Error!")
        print(r.content.decode()[:500])
        
print("\n--- Exam Workflow Test Complete ---")
