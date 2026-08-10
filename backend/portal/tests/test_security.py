"""
Tests for the security-hardening additions from the QA audit:

  * login rate limiting — max 5 POST /api/auth/login/ attempts/min/IP (429)
  * security headers — CSP, Permissions-Policy, X-Permitted-Cross-Domain-Policies
  * JSON 404/500 envelopes on unmatched /api/* routes
  * the website contact endpoint mounted at /api/website/contact/

Run with:
    python manage.py test portal.tests.test_security
"""
from django.core.cache import cache
from django.test import TestCase

LOGIN_URL = "/api/auth/login/"
CONTACT_URL = "/api/website/contact/"


class LoginRateLimitTests(TestCase):
    """POST /api/auth/login/ is limited to 5 attempts/min/IP.

    The IP throttle (`otp_login_ip` = 5/min) is asserted in isolation by using a
    distinct (invalid) account per request so the per-account throttle — also
    5/min but keyed by email — never fires first.
    """

    def setUp(self):
        cache.clear()

    def tearDown(self):
        cache.clear()

    def test_sixth_attempt_within_minute_is_429(self):
        # POST is rate limited at the DRF level; statuses below are 400
        # (invalid credentials) until the IP window is exhausted.
        responses = []
        for i in range(6):
            resp = self.client.post(
                LOGIN_URL,
                {"email": f"nobody{i}@example.com", "password": "WrongPass@1"},
                content_type="application/json",
            )
            responses.append(resp.status_code)
        self.assertEqual(responses[:5].count(400), 5)
        self.assertEqual(responses[5], 429)


class SecurityHeadersTests(TestCase):
    """CSP + Permissions-Policy + X-Permitted-Cross-Domain-Policies headers."""

    def test_api_response_carries_security_headers(self):
        resp = self.client.get("/api/website/levels/", HTTP_ACCEPT="application/json")
        self.assertEqual(resp.status_code, 200)
        csp = resp.headers.get("Content-Security-Policy", "")
        # Machine-readable responses get the strict policy.
        self.assertIn("default-src 'self'", csp)
        self.assertIn("frame-ancestors 'none'", csp)
        self.assertNotIn("unsafe-inline", csp)
        self.assertEqual(
            resp.headers["Permissions-Policy"],
            "camera=(), geolocation=(), microphone=(), payment=(), usb=(), interest-cohort=()",
        )
        self.assertEqual(resp.headers["X-Permitted-Cross-Domain-Policies"], "none")
        self.assertNotEqual(resp.headers.get("X-Request-ID", ""), "")

    def test_html_page_gets_lenient_csp(self):
        # Swagger UI ships inline scripts/styles, so HTML pages keep unsafe-inline
        # rather than the strict API policy.
        resp = self.client.get("/api/docs/")
        self.assertEqual(resp.status_code, 200)
        csp = resp.headers.get("Content-Security-Policy", "")
        self.assertIn("default-src 'self'", csp)
        self.assertIn("unsafe-inline", csp)

    def test_existing_headers_kept(self):
        resp = self.client.get("/api/website/levels/")
        self.assertEqual(resp.headers["X-Frame-Options"], "DENY")


class ApiJsonErrorTests(TestCase):
    """Unmatched /api/* routes return the JSON error envelope, not HTML."""

    def test_unmatched_api_route_returns_json_404(self):
        resp = self.client.get("/api/definitely-not-a-route/")
        self.assertEqual(resp.status_code, 404)
        self.assertEqual(resp.headers["Content-Type"], "application/json")
        self.assertEqual(resp.json(), {"detail": "The requested resource was not found.", "code": "not_found"})

    def test_non_api_route_returns_html_404(self):
        resp = self.client.get("/definitely-not-a-route/")
        self.assertEqual(resp.status_code, 404)
        self.assertIn("text/html", resp.headers["Content-Type"])


class WebsiteContactEndpointTests(TestCase):
    """The deployed frontend POSTs contact enquiries to /api/website/contact/."""

    def setUp(self):
        cache.clear()

    def tearDown(self):
        cache.clear()

    def test_contact_submission_creates_record(self):
        resp = self.client.post(
            CONTACT_URL,
            {
                "name": "QA Contact",
                "email": "qa-contact@example.com",
                "phone": "9876543210",
                "message": "I would like to know about admissions.",
            },
            content_type="application/json",
        )
        self.assertEqual(resp.status_code, 201)
        data = resp.json()
        self.assertEqual(data["name"], "QA Contact")
        self.assertFalse(data["is_resolved"])

    def test_blank_message_is_rejected(self):
        resp = self.client.post(
            CONTACT_URL,
            {"name": "QA Contact", "email": "qa-contact@example.com", "message": "   "},
            content_type="application/json",
        )
        self.assertEqual(resp.status_code, 400)
        self.assertIn("message", resp.json())

