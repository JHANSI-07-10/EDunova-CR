"""Probe every portal API endpoint with a role-appropriate token."""
import json
import re
import sys
import urllib.error
import urllib.request
import os

sys.path.insert(0, ".")
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings")
import django

django.setup()

from django.contrib.auth import get_user_model
from rest_framework_simplejwt.tokens import RefreshToken
from portal.urls import urlpatterns

BASE = "http://127.0.0.1:8000/api"


def token_for(role):
    u = (
        get_user_model()
        .objects.filter(groups__name=role, is_active=True)
        .order_by("id")
        .first()
    )
    return str(RefreshToken.for_user(u).access_token) if u else None


tokens = {r: token_for(r) for r in ("Admin", "Student", "Teacher", "Parent")}
print("tokens:", {k: (bool(v),) for k, v in tokens.items()})


def make_url(route):
    route = re.sub(r"<int:[^>]+>", "1", route)
    route = re.sub(r"<str:[^>]+>", "x", route)
    return BASE + "/" + route.lstrip("/")


def probe(url, token):
    req = urllib.request.Request(url, headers={"Authorization": f"Bearer {token}"})
    try:
        with urllib.request.urlopen(req, timeout=45) as r:
            return r.status, r.read(200).decode("utf-8", "replace")
    except urllib.error.HTTPError as e:
        return e.code, e.read(200).decode("utf-8", "replace")
    except Exception as e:
        return "ERR", str(e)[:150]


results = []
for pat in urlpatterns:
    pattern = getattr(pat, "pattern", None)
    if pattern is None:
        continue
    route = getattr(pattern, "_route", None) or str(pattern)
    if route.startswith(("auth/", "upload/")):
        continue
    role = "Admin"
    for prefix, r in (("student/", "Student"), ("teacher/", "Teacher"), ("parent/", "Parent")):
        if route.startswith(prefix):
            role = r
            break
    token = tokens[role]
    if not token:
        results.append(("NO_USER", route, "", f"no {role} user in DB"))
        continue
    url = make_url(route)
    status, body = probe(url, token)
    results.append((status, route, url, body))

from collections import Counter

print("=== STATUS SUMMARY (role-aware) ===")
for k in sorted(Counter(str(r[0]) for r in results), key=lambda x: str(x)):
    print(f"{k}: {Counter(str(r[0]) for r in results)[k]}")

print("\n=== FAILURES (5xx / ERR / NO_USER) ===")
for status, route, url, body in results:
    if status == "ERR" or status == "NO_USER" or (isinstance(status, int) and status >= 500):
        print(f"[{status}] {route}    -> {body[:200]}")

print("\n=== 404s ===")
for status, route, url, body in results:
    if status == 404:
        print(f"[404] {route}    -> {body[:120]}")

print("\n=== 400/405 (informational) ===")
for status, route, url, body in results:
    if status in (400, 405):
        print(f"[{status}] {route}")
