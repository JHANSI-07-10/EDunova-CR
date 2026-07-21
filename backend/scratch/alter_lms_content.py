import sys
import os
import django

# Setup django environment
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings")
django.setup()

from django.db import connection

query = "ALTER TABLE public.portal_course_content ADD COLUMN IF NOT EXISTS chapter_id integer REFERENCES public.portal_chapter(id) ON DELETE CASCADE;"

print("Adding chapter_id to portal_course_content...")
with connection.cursor() as cursor:
    try:
        cursor.execute(query)
        print("Successfully added chapter_id column.")
    except Exception as e:
        print(f"Error: {e}")
