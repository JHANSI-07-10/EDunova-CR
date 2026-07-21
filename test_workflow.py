import urllib.request
import urllib.error
import json
import os

BASE_URL = "http://127.0.0.1:8000/api"

print("Starting Workflow Test...")

# 1. Submit an admission enquiry
enquiry_data = {
    "applicant_name": "Test Student",
    "date_of_birth": "2010-01-01",
    "gender": "Male",
    "target_class": "10",
    "father_name": "Test Father",
    "father_phone": "1234567890",
    "father_email": "parent@example.com",
    "address": "123 Test St",
    "city": "Test City",
    "state": "Test State",
    "pincode": "123456",
}

req = urllib.request.Request(f"{BASE_URL}/admissions/enquiries/", data=json.dumps(enquiry_data).encode(), headers={"Content-Type": "application/json"})
try:
    with urllib.request.urlopen(req) as response:
        print(f"1. Enquiry Submit Response: {response.getcode()} - {response.read().decode()}")
except urllib.error.HTTPError as e:
    print(f"1. Enquiry Submit Failed: {e.code} - {e.read().decode()}")

# 2. Login as Admin
login_data = {
    "email": "admin@example.com",
    "password": "admin123",
    "role": "admin"
}

req = urllib.request.Request(f"{BASE_URL}/auth/login/", data=json.dumps(login_data).encode(), headers={"Content-Type": "application/json"})
try:
    with urllib.request.urlopen(req) as response:
        print(f"2. Login Response: {response.getcode()} - {response.read().decode()}")
except urllib.error.HTTPError as e:
    print(f"2. Login Failed: {e.code} - {e.read().decode()}")
