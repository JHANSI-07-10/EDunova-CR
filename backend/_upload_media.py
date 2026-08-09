"""One-off utility: upload backend/media/* to the Supabase `lms-resources` bucket.

Reads SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY from backend/.env, lists what is
already in the bucket, and uploads any local file under backend/media that is
missing (upserting to be safe). Run from the backend directory:

    python _upload_media.py

Note: the service role key in .env must belong to the SAME project as
SUPABASE_URL. If auth fails with "signature verification failed", the key is
stale/rotated — regenerate it in the Supabase dashboard (Settings > API >
Service Role Key) and update .env, then rerun.
"""
import json
import mimetypes
import os
import urllib.error
import urllib.request

BUCKET = "lms-resources"
MEDIA_ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), "media")


def load_env():
    env = {}
    path = os.path.join(os.path.dirname(os.path.abspath(__file__)), ".env")
    with open(path, encoding="utf-8", errors="replace") as f:
        for line in f:
            line = line.strip()
            if not line or line.startswith("#") or "=" not in line:
                continue
            k, _, v = line.partition("=")
            env[k.strip()] = v.strip().strip('"').strip("'")
    return env


def list_objects(url, key):
    req = urllib.request.Request(
        f"{url}/storage/v1/object/list/{BUCKET}",
        data=json.dumps({"prefix": "", "limit": 1000, "offset": 0}).encode(),
        headers={"Authorization": f"Bearer {key}", "Content-Type": "application/json"},
        method="POST",
    )
    with urllib.request.urlopen(req, timeout=30) as r:
        return {i["name"] for i in json.loads(r.read())}


def upload(url, key, name, data):
    ctype = mimetypes.guess_type(name)[0] or "application/octet-stream"
    req = urllib.request.Request(
        f"{url}/storage/v1/object/{BUCKET}/{name}",
        data=data,
        headers={
            "Authorization": f"Bearer {key}",
            "Content-Type": ctype,
            "x-upsert": "true",
        },
        method="POST",
    )
    with urllib.request.urlopen(req, timeout=60) as r:
        return r.status


def main():
    env = load_env()
    url = env.get("SUPABASE_URL", "").rstrip("/")
    key = env.get("SUPABASE_SERVICE_ROLE_KEY", "")
    if not url or not key:
        print("SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY missing from .env")
        return 1

    print("Listing existing objects in bucket", BUCKET, "...")
    try:
        existing = list_objects(url, key)
    except urllib.error.HTTPError as e:
        print(f"AUTH FAILED ({e.code}): {e.read().decode()[:200]}")
        print("The service role key is stale — regenerate it in the Supabase dashboard and retry.")
        return 1
    print(f"Bucket has {len(existing)} objects.")

    local = []
    for root, _dirs, files in os.walk(MEDIA_ROOT):
        for fn in files:
            full = os.path.join(root, fn)
            rel = os.path.relpath(full, MEDIA_ROOT).replace("\\", "/")
            local.append((rel, full))
    local.sort()

    missing = [(rel, full) for rel, full in local if rel not in existing]
    print(f"Local files: {len(local)} | already in bucket: {len(local) - len(missing)} | to upload: {len(missing)}")

    for rel, full in missing:
        with open(full, "rb") as f:
            data = f.read()
        try:
            upload(url, key, rel, data)
            print("  uploaded", rel)
        except urllib.error.HTTPError as e:
            print(f"  FAILED {rel}: HTTP {e.code} {e.read().decode()[:150]}")
        except Exception as e:
            print(f"  FAILED {rel}: {e}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
