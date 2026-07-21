import os
import django
import json

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from django.test import Client
from django.core.cache import cache
from apps.admissions.models import AdmissionEnquiry
from django.contrib.auth.models import User

client = Client(SERVER_NAME="127.0.0.1")

print("--- Starting Full Admission Workflow API Test ---")

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

# Phase 1: Enquiry
print("\n[Phase 1] Submitting admission enquiry...")
enquiry_data = {
    "applicant_name": "Test Student",
    "date_of_birth": "2010-01-01",
    "gender": "Male",
    "target_class": "10",
    "father_name": "Test",
    "father_phone": "1234567890",
    "father_email": "parent_test@example.com",
    "address": "123 Test St",
    "city": "Test City",
    "state": "Test State",
    "pincode": "123456",
}
r_enquiry = client.post("/api/admissions/enquiries/", data=enquiry_data, content_type="application/json")
print(f"Enquiry Response: {r_enquiry.status_code}")
if r_enquiry.status_code not in (200, 201):
    print(r_enquiry.content.decode())
    exit(1)

enquiry_obj = AdmissionEnquiry.objects.order_by('-id').first()
reg_no = enquiry_obj.registration_number
print(f"Created Enquiry with Reg No: {reg_no}")

# Now test each phase defined in the frontend/backend

# Let's test the endpoint that fetches the admissions
print("\n[Admin] Fetching admissions list...")
r_list = client.get("/api/admin-portal/admissions/", **headers)
print(f"Admissions List Response: {r_list.status_code}")

print("\n[Phase 3: Application] POST to /application/")
app_data = {
    "blood_group": "O+",
    "aadhaar_number": "123456789012",
    "father_name": "Test Father",
    "mother_name": "Test Mother",
    "emergency_contact": "9876543210"
}
r_app = client.post(f"/api/admin-portal/admissions/{reg_no}/application/", data=app_data, content_type="application/json", **headers)
print(f"POST Response: {r_app.status_code}")
if r_app.status_code != 200:
    print(r_app.content.decode())

print("\n[Phase 3: Application] GET to /application/")
r_app_get = client.get(f"/api/admin-portal/admissions/{reg_no}/application/", **headers)
print(f"GET Response: {r_app_get.status_code}")
print(f"Data saved: {json.loads(r_app_get.content).get('application')}")

print("\n[Phase 4: Document Upload] POST to /documents/")
doc_data = {
    "document_type": "birth_certificate",
    "document_name": "Birth Certificate",
    "file_url": "https://example.com/doc.pdf"
}
r_doc = client.post(f"/api/admin-portal/admissions/{reg_no}/documents/", data=doc_data, content_type="application/json", **headers)
print(f"POST Response: {r_doc.status_code}")

print("\n[Phase 4: Document Upload] GET to /documents/")
r_doc_get = client.get(f"/api/admin-portal/admissions/{reg_no}/documents/", **headers)
print(f"GET Response: {r_doc_get.status_code}")
print(f"Docs saved: {json.loads(r_doc_get.content)}")

print("\n--- Workflow Test Complete ---")
