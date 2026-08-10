"""
Tests for the validation & business-rule fixes from the QA audit:

  * admissions enquiry — gender enum, target_class whitelist, URL documents
  * campuses/nearest — invalid coordinates -> 400
  * leave requests — past dates and inverted ranges -> 400
  * centralized exception handler — IntegrityError -> 400 envelope

Run with:
    python manage.py test portal.tests.test_validation_fixes --keepdb --noinput
"""
from datetime import date, timedelta

from django.contrib.auth import get_user_model
from django.test import TestCase, override_settings
from rest_framework.test import APIRequestFactory

from apps.admissions.serializers import AdmissionEnquirySerializer
from apps.cms.models import Campus
from portal.exceptions import edunova_exception_handler
from portal.views import validate_leave_dates

User = get_user_model()


def _enquiry_payload(**overrides):
    payload = {
        "applicant_name": "QA Test Child",
        "date_of_birth": "2015-05-05",
        "gender": "Male",
        "target_class": "Class 4",
        "parent_name": "QA Parent",
        "parent_phone": "9876543210",
        "parent_email": "qa-parent@test.com",
    }
    payload.update(overrides)
    return payload


class AdmissionEnquiryValidationTests(TestCase):
    """S7 — gender enum, target_class whitelist, URL documents."""

    def test_gender_must_be_in_whitelist(self):
        s = AdmissionEnquirySerializer(data=_enquiry_payload(gender="Alien"))
        self.assertFalse(s.is_valid())
        self.assertIn("gender", s.errors)
        self.assertIn("Male, Female, Other", str(s.errors["gender"]))

    def test_gender_case_insensitive(self):
        s = AdmissionEnquirySerializer(data=_enquiry_payload(gender="male"))
        self.assertTrue(s.is_valid(), s.errors)

    def test_target_class_rejects_unknown(self):
        s = AdmissionEnquirySerializer(data=_enquiry_payload(target_class="Grade 99"))
        self.assertFalse(s.is_valid())
        self.assertIn("target_class", s.errors)

    def test_target_class_accepts_standard_class(self):
        s = AdmissionEnquirySerializer(data=_enquiry_payload(target_class="Class 6"))
        self.assertTrue(s.is_valid(), s.errors)

    def test_target_class_accepts_db_class(self):
        s = AdmissionEnquirySerializer(data=_enquiry_payload(target_class="class 6"))
        self.assertTrue(s.is_valid(), s.errors)

    def test_url_id_proof_accepted(self):
        s = AdmissionEnquirySerializer(
            data=_enquiry_payload(id_proof_document="https://cdn.example.com/proof.pdf")
        )
        self.assertTrue(s.is_valid(), s.errors)
        self.assertEqual(
            s.validated_data["id_proof_document"], "https://cdn.example.com/proof.pdf"
        )

    def test_non_url_string_id_proof_rejected(self):
        s = AdmissionEnquirySerializer(data=_enquiry_payload(id_proof_document="not-a-url"))
        self.assertFalse(s.is_valid())
        self.assertIn("id_proof_document", s.errors)


class NearestCampusValidationTests(TestCase):
    """S8 — invalid coordinates -> 400, missing coordinates -> fallback."""

    def setUp(self):
        Campus.objects.create(name="HQ", is_headquarters=True, latitude=17.38, longitude=78.48)

    def test_invalid_lat_returns_400(self):
        resp = self.client.get("/api/campuses/nearest/", {"lat": "abc", "lng": "78"})
        self.assertEqual(resp.status_code, 400)

    def test_out_of_range_lat_returns_400(self):
        resp = self.client.get("/api/campuses/nearest/", {"lat": "95", "lng": "78"})
        self.assertEqual(resp.status_code, 400)

    def test_no_coords_falls_back_to_hq(self):
        resp = self.client.get("/api/campuses/nearest/")
        self.assertEqual(resp.status_code, 200)
        self.assertEqual(resp.json()["name"], "HQ")

    def test_valid_coords_returns_campus(self):
        resp = self.client.get("/api/campuses/nearest/", {"lat": "17.38", "lng": "78.48"})
        self.assertEqual(resp.status_code, 200)
        self.assertEqual(resp.json()["name"], "HQ")


class LeaveDateValidationTests(TestCase):
    """S5 — past dates and inverted ranges -> 400."""

    def test_past_start_date_rejected(self):
        yesterday = (date.today() - timedelta(days=1)).isoformat()
        err, start, end = validate_leave_dates(
            {"start_date": yesterday, "end_date": date.today().isoformat()}
        )
        self.assertIsNotNone(err)
        self.assertEqual(err.status_code, 400)
        self.assertIn("past", err.data["detail"].lower())

    def test_inverted_range_rejected(self):
        today = date.today().isoformat()
        tomorrow = (date.today() + timedelta(days=1)).isoformat()
        err, _, _ = validate_leave_dates({"start_date": tomorrow, "end_date": today})
        self.assertIsNotNone(err)
        self.assertEqual(err.status_code, 400)
        self.assertIn("end_date", err.data["detail"].lower())

    def test_valid_future_range_accepted(self):
        today = date.today()
        err, start, end = validate_leave_dates(
            {
                "start_date": today.isoformat(),
                "end_date": (today + timedelta(days=3)).isoformat(),
            }
        )
        self.assertIsNone(err)
        self.assertEqual(start, today)

    def test_invalid_literal_rejected(self):
        err, _, _ = validate_leave_dates({"start_date": "not-a-date", "end_date": "2026-08-30"})
        self.assertIsNotNone(err)
        self.assertEqual(err.status_code, 400)

    def test_missing_fields_rejected(self):
        err, _, _ = validate_leave_dates({})
        self.assertIsNotNone(err)
        self.assertEqual(err.status_code, 400)

    def test_non_dict_body_rejected(self):
        err, _, _ = validate_leave_dates("not-a-dict")
        self.assertIsNotNone(err)
        self.assertEqual(err.status_code, 400)


class ExceptionHandlerTests(TestCase):
    """S13 — IntegrityError maps to a 400 envelope, never a raw 500."""

    def setUp(self):
        self.factory = APIRequestFactory()
        self.request = self.factory.get("/api/admin-portal/subjects/")

    def test_integrity_error_maps_to_400(self):
        from django.db import IntegrityError

        resp = edunova_exception_handler(IntegrityError("duplicate key"), {"request": self.request})
        self.assertIsNotNone(resp)
        self.assertEqual(resp.status_code, 400)
        self.assertIn("detail", resp.data)
        self.assertEqual(resp.data["code"], "integrity_error")

    def test_does_not_exist_maps_to_404(self):
        from django.core.exceptions import ObjectDoesNotExist

        resp = edunova_exception_handler(
            ObjectDoesNotExist("missing"), {"request": self.request}
        )
        self.assertIsNotNone(resp)
        self.assertEqual(resp.status_code, 404)

    @override_settings(DEBUG=True)
    def test_unexpected_error_is_generic_500(self):
        resp = edunova_exception_handler(RuntimeError("boom"), {"request": self.request})
        self.assertIsNotNone(resp)
        self.assertEqual(resp.status_code, 500)
        self.assertNotIn("boom", resp.data.get("detail", ""))
