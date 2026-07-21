import os
import django

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings")
django.setup()

from django.db import connection

def run():
    # Execute the SQL script
    sql_file = "portal/sql/portal_extension_timetable.sql"
    with open(sql_file, "r") as f:
        sql = f.read()
    
    print("Running SQL script to create timetable tables...")
    with connection.cursor() as cursor:
        cursor.execute(sql)
    
    print("Success!")

if __name__ == "__main__":
    run()
