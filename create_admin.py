from django.contrib.auth.models import User
from django.db import connection

if not User.objects.filter(username="admin@example.com").exists():
    u = User.objects.create_superuser("admin@example.com", "admin@example.com", "admin123")
    print("Superuser created.")
else:
    u = User.objects.get(username="admin@example.com")
    print("Superuser already exists.")

# Ensure portal profile exists
with connection.cursor() as cursor:
    cursor.execute("SELECT user_id FROM portal_user_profile WHERE user_id = %s", [u.id])
    if not cursor.fetchone():
        cursor.execute("INSERT INTO portal_user_profile (user_id, user_type) VALUES (%s, 'Admin')", [u.id])
        print("Portal profile created.")
