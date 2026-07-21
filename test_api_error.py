import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'edunova.settings')
django.setup()

from django.test import Client
import json

c = Client()
res = c.post('/api/admissions/enquiries/', json.dumps({
    'applicant_name': 'Test',
    'date_of_birth': '2010-01-01',
    'target_class': 'Grade 10',
    'father_name': 'Test Father',
    'mother_name': 'Test Mother',
    'address': '123 Test',
    'pincode': '123456',
    'city': 'Test',
    'gender': 'Male'
}), content_type='application/json')
print(res.status_code)
if res.status_code == 500:
    print(res.content.decode('utf-8'))
else:
    print(res.content.decode('utf-8'))
