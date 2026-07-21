import os
import django
import json

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from django.test import Client
from django.core.cache import cache

client = Client(SERVER_NAME="127.0.0.1")

print("--- Starting Manual DB Check for Remaining Workflows ---")

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

# 1. Timetable Workflow - Academic Calendar
print("\n[1] Testing Timetable Workflow (Academic Calendar)...")
calendar_data = {
    "academic_year": "2024-2025",
    "term_name": "Full Year",
    "start_date": "2024-06-01",
    "end_date": "2025-05-31",
    "is_current": True,
    "description": "Test Calendar"
}
r = client.post("/api/admin-portal/timetable/calendar/", data=calendar_data, content_type="application/json", **headers)
print(f"POST Response: {r.status_code}")
if r.status_code == 201:
    r_get = client.get("/api/admin-portal/timetable/calendar/", **headers)
    calendars = json.loads(r_get.content)
    found = any(c.get("academic_year") == "2024-2025" for c in calendars)
    print(f"GET check - Data reflected in DB: {found}")
else:
    print(f"POST failed: {r.content.decode()}")

# 2. Assignment Workflow - Categories
print("\n[2] Testing Assignment Workflow (Category)...")
cat_data = {
    "name": "Test Category " + os.urandom(4).hex(),
    "description": "Test Description"
}
r = client.post("/api/admin-portal/assignment-workflow/categories/", data=cat_data, content_type="application/json", **headers)
print(f"POST Response: {r.status_code}")
if r.status_code in [201, 200]:
    r_get = client.get("/api/admin-portal/assignment-workflow/categories/", **headers)
    categories = json.loads(r_get.content)
    found = any(c.get("name") == cat_data["name"] for c in categories)
    print(f"GET check - Data reflected in DB: {found}")
else:
    print(f"POST failed: {r.content.decode()}")

# 3. Fee Management - Fee Structure
from django.db import connection

# Setup: Ensure a class exists
with connection.cursor() as cursor:
    cursor.execute("SELECT id FROM portal_class LIMIT 1")
    row = cursor.fetchone()
    if row:
        class_id = row[0]
    else:
        cursor.execute("INSERT INTO portal_class (name, section, room_number) VALUES ('Class X', 'A', '101') RETURNING id")
        class_id = cursor.fetchone()[0]

print("\n[3] Testing Fee Management (Fee Structure)...")
fee_data = {
    "class_id": class_id,
    "term_name": "Term 1 Test",
    "tuition_fee": 1000,
    "transport_fee": 500,
    "hostel_fee": 200
}
r = client.post("/api/admin-portal/fee-structures/", data=fee_data, content_type="application/json", **headers)
print(f"POST Response: {r.status_code}")
if r.status_code in [201, 200]:
    r_get = client.get("/api/admin-portal/fee-structures/", **headers)
    structures = json.loads(r_get.content)
    found = any(s.get("term_name") == "Term 1 Test" for s in structures)
    print(f"GET check - Data reflected in DB: {found}")
else:
    print(f"POST failed: {r.content.decode()}")

print("\n--- Manual DB Testing Complete ---")
