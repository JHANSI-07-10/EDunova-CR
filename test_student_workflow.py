import os
import django
import json

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from django.test import Client
from django.core.cache import cache
from django.db import connection
from django.contrib.auth.models import User

client = Client(SERVER_NAME="127.0.0.1")

print("--- Starting Student Workflow API Test ---")

# Setup: Ensure a student exists
with connection.cursor() as cursor:
    cursor.execute("SELECT user_id FROM portal_user_profile WHERE user_type='Student' LIMIT 1")
    row = cursor.fetchone()
    if not row:
        u = User.objects.create_user(username="student_workflow", email="student_workflow@example.com", password="student123")
        cursor.execute("INSERT INTO portal_user_profile (user_id, user_type) VALUES (%s, 'Student')", [u.id])
        student_id = u.id
        student_email = "student_workflow@example.com"
    else:
        student_id = row[0]
        u = User.objects.get(id=student_id)
        student_email = u.email

# Setup: Student Login
print(f"\n[Setup] Logging in as Student {student_email}...")
login_data = {"email": student_email, "password": "student123", "role": "student"}
r1 = client.post("/api/auth/login/", data=login_data, content_type="application/json")

if r1.status_code == 401:
    print(f"Login failed: {r1.content.decode()}")
    print("Trying to reset password...")
    u.set_password("student123")
    u.save()
    r1 = client.post("/api/auth/login/", data=login_data, content_type="application/json")

if r1.status_code != 200:
    print(f"Login request failed: {r1.content.decode()}")
    exit(1)

login_resp = json.loads(r1.content)
user_id = login_resp.get("user_id")
otp = cache.get(f"portal_login_otp:{user_id}")
r2 = client.post("/api/auth/verify-otp/", data={"user_id": user_id, "otp": str(otp), "role": "student"}, content_type="application/json")
if r2.status_code != 200:
    print(f"Verify OTP failed: {r2.content.decode()}")
    exit(1)
access_token = json.loads(r2.content).get("access")
headers = {"HTTP_AUTHORIZATION": f"Bearer {access_token}"}
print("Student Token Acquired.")

# Student Workflow Endpoints to test GET requests
endpoints = [
    ("Dashboard", "/api/student/dashboard/"),
    ("Profile Management", "/api/student/profile/"),
    ("Attendance Management", "/api/student/attendance/"),
    ("Homework Management", "/api/student/homework/"),
    ("Assignment Management", "/api/student/assignments/"),
    ("Timetable Management", "/api/student/timetable/"),
    ("Examination - Exams", "/api/student/exams/"),
    ("Examination - Hall Tickets", "/api/student/hall-tickets/"),
    ("Results & Report Cards", "/api/student/results/"),
    ("Report Cards", "/api/student/report-card/?exam_name=Midterm"),
    ("LMS - Dashboard", "/api/student/lms/dashboard/"),
    ("LMS - Courses", "/api/student/courses/"),
    ("Library Management", "/api/student/library/"),
    ("Certificates", "/api/student/certificates/"),
    ("Events & Activities", "/api/student/events/"),
    ("Announcements & Notifications", "/api/student/announcements/"),
    ("Messages", "/api/student/messages/"),
    ("Fee Management", "/api/student/fees/"),
]

for name, endpoint in endpoints:
    print(f"\n[{name}] Testing GET {endpoint}")
    r = client.get(endpoint, **headers)
    print(f"GET Response: {r.status_code}")
    if r.status_code >= 500:
        print("BUG FOUND - 500 Internal Server Error!")
        print(r.content.decode()[:500])
        
print("\n--- Student Workflow Test Complete ---")
