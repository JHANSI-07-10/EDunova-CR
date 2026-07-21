import os
import django
from django.core.files.base import ContentFile

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings")
django.setup()

from django.core.files.storage import default_storage

try:
    file_content = b"test file content"
    file = ContentFile(file_content, name="test_file.txt")
    saved_name = default_storage.save("test_file.txt", file)
    print("Saved successfully!")
    print("Saved name:", saved_name)
    url = default_storage.url(saved_name)
    print("URL:", url)
except Exception as e:
    import traceback
    traceback.print_exc()
