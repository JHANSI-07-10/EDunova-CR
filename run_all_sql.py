import os
import django
import glob

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings")
django.setup()

from django.db import connection

def run():
    sql_files = glob.glob("portal/sql/*.sql")
    for sql_file in sql_files:
        print(f"Running {sql_file}...")
        with open(sql_file, "r") as f:
            sql = f.read()
            # If there's a unique constraint issue, this script might crash, 
            # so we can try to wrap in a try-except, but it's better to let it run 
            # and fix individual errors if they happen.
            try:
                with connection.cursor() as cursor:
                    cursor.execute(sql)
                print(f"Success: {sql_file}")
            except Exception as e:
                print(f"Failed to run {sql_file}: {e}")

if __name__ == "__main__":
    run()
