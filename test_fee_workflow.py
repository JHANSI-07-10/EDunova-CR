import os
import django
import json

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from django.test import Client
from django.core.cache import cache
from django.db import connection

client = Client(SERVER_NAME="127.0.0.1")

print("--- Starting Fee Workflow API Test ---")

# Setup: Admin Login
login_data = {"email": "admin@example.com", "password": "admin123", "role": "admin"}
r1 = client.post("/api/auth/login/", data=login_data, content_type="application/json")
login_resp = json.loads(r1.content)
user_id = login_resp.get("user_id")
otp = cache.get(f"portal_login_otp:{user_id}")
r2 = client.post("/api/auth/verify-otp/", data={"user_id": user_id, "otp": str(otp), "role": "admin"}, content_type="application/json")
access_token = json.loads(r2.content).get("access")
headers = {"HTTP_AUTHORIZATION": f"Bearer {access_token}"}
print("Admin Token Acquired.")

# Setup: Ensure a class exists
with connection.cursor() as cursor:
    cursor.execute("SELECT id FROM portal_class LIMIT 1")
    row = cursor.fetchone()
    if row:
        class_id = row[0]
    else:
        cursor.execute("INSERT INTO portal_class (name, section, room_number) VALUES ('Class X', 'A', '101') RETURNING id")
        class_id = cursor.fetchone()[0]
print(f"Using class_id: {class_id}")

# 1. Fee Structure
fee_data = {
    "class_id": class_id,
    "term_name": "Term 1 Fee",
    "tuition_fee": 1500,
    "transport_fee": 300,
    "hostel_fee": 0
}
r = client.post("/api/admin-portal/fee-structures/", data=fee_data, content_type="application/json", **headers)
print(f"POST Fee Structure Response: {r.status_code}")
if r.status_code in [201, 200]:
    r_get = client.get("/api/admin-portal/fee-structures/", **headers)
    structures = json.loads(r_get.content)
    print(f"GET Fee Structure count: {len(structures)}")
else:
    print(r.content.decode())

# Test GET on other fee endpoints to ensure no 500 crashes
endpoints = [
    ("Academic Years", "/api/admin-portal/academic-years/"),
    ("Fee Categories", "/api/admin-portal/fee-categories/"),
    ("Fee Assignments", "/api/admin-portal/fee-assignments/"),
    ("Fee Concessions", "/api/admin-portal/fee-concessions/"),
    ("Fee Ledger", "/api/admin-portal/fee-ledger/"),
    ("Fee Reports", "/api/admin-portal/fee-reports/"),
]

for name, endpoint in endpoints:
    r = client.get(endpoint, **headers)
    print(f"GET {name} Response: {r.status_code}")
    if r.status_code == 500:
        print("BUG FOUND - 500 Internal Server Error!")
        print(r.content.decode()[:500])

print("--- Fee Workflow Test Complete ---")
