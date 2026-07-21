import os
import django

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings")
django.setup()

from django.db import connection
from django.contrib.auth import get_user_model

User = get_user_model()

def run():
    # Execute the SQL script
    sql_file = "portal/sql/portal_extension_academic_website.sql"
    with open(sql_file, "r") as f:
        sql = f.read()
    
    print("Running SQL script to create tables...")
    with connection.cursor() as cursor:
        cursor.execute(sql)
    
    # Create some dummy users
    users_data = [
        {"username": "faculty1", "first_name": "Dr. Sarah", "last_name": "Jenkins", "email": "sarah.j@edunova.edu"},
        {"username": "faculty2", "first_name": "Prof. Alan", "last_name": "Turing", "email": "alan.t@edunova.edu"},
        {"username": "faculty3", "first_name": "Dr. Emily", "last_name": "Chen", "email": "emily.c@edunova.edu"},
    ]
    
    profiles = [
        {"designation": "Head of Mathematics", "qualification": "Ph.D. in Mathematics", "exp": 15, "photo": "/images/meera.jpeg", "spec": "Algebra, Calculus"},
        {"designation": "Computer Science Teacher", "qualification": "M.Sc. in Computer Science", "exp": 8, "photo": "/images/Man_in_modern_office_202607130959.jpeg", "spec": "Algorithms, Web Dev"},
        {"designation": "Science Department Lead", "qualification": "Ph.D. in Physics", "exp": 12, "photo": "/images/Woman_Principal_in_Office_202607130959.jpeg", "spec": "Quantum Mechanics, Astronomy"}
    ]
    
    for i, data in enumerate(users_data):
        user, created = User.objects.get_or_create(username=data["username"], defaults={
            "first_name": data["first_name"],
            "last_name": data["last_name"],
            "email": data["email"]
        })
        
        prof = profiles[i]
        
        with connection.cursor() as cursor:
            cursor.execute("SELECT id FROM portal_faculty_profile WHERE user_id = %s", [user.id])
            if not cursor.fetchone():
                cursor.execute("""
                    INSERT INTO portal_faculty_profile 
                    (user_id, designation, qualification_detail, experience_years, specializations, photo_url, is_published, bio)
                    VALUES (%s, %s, %s, %s, %s, %s, true, 'Passionate educator committed to student growth.')
                """, [
                    user.id, 
                    prof["designation"], 
                    prof["qualification"], 
                    prof["exp"],
                    prof["spec"], 
                    prof["photo"]
                ])
                print(f"Added faculty profile for {user.first_name}")

if __name__ == "__main__":
    run()
