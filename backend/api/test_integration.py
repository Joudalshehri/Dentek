
from django.urls import reverse
from rest_framework.test import APITestCase
from rest_framework import status
from django.contrib.auth.models import User
from rest_framework.authtoken.models import Token
from django.core.files.uploadedfile import SimpleUploadedFile
from unittest.mock import patch

from api.models import Patient, XRay


class AuthTests(APITestCase):

    def setUp(self):
        self.user = User.objects.create_user(
            username="testuser",
            email="test@example.com",
            password="testpass123"
        )

    def test_login_success(self):
        url = reverse("login")

        response = self.client.post(url, {
            "username": "testuser",
            "password": "testpass123"
        }, format="json")

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertTrue(response.data["success"])
        self.assertIn("token", response.data)

    def test_login_invalid_credentials(self):
        url = reverse("login")

        response = self.client.post(url, {
            "username": "testuser",
            "password": "wrongpassword"
        }, format="json")

        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)
        self.assertFalse(response.data["success"])


class PatientTests(APITestCase):

    def setUp(self):
        self.user = User.objects.create_user(
            username="doctor",
            password="12345678"
        )

        self.token = Token.objects.create(user=self.user)

        self.client.credentials(
            HTTP_AUTHORIZATION=f"Token {self.token.key}"
        )

    def test_create_patient_success(self):
        url = reverse("create_patient")

        data = {
            "patient_id": "P001",
            "name": "Ahmed Ali",
            "birthDate": "2000-01-01",
            "phone": "0555555555",
            "email": "ahmed@test.com"
        }

        response = self.client.post(url, data, format="json")

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data["patient_id"], "P001")
        self.assertEqual(Patient.objects.count(), 1)

    def test_create_patient_duplicate_id(self):
        Patient.objects.create(
            user=self.user,
            patient_id="P001",
            name="Existing Patient"
        )

        url = reverse("create_patient")

        response = self.client.post(url, {
            "patient_id": "P001",
            "name": "Ahmed"
        }, format="json")

        self.assertEqual(response.status_code, 400)
        self.assertIn("error", response.data)

    def test_list_patients(self):
        Patient.objects.create(
            user=self.user,
            patient_id="P001",
            name="Ahmed"
        )

        url = reverse("list_patients")

        response = self.client.get(url)

        self.assertEqual(response.status_code, 200)
        self.assertEqual(len(response.data), 1)


class XRayTests(APITestCase):

    def setUp(self):
        self.user = User.objects.create_user(
            username="doctor",
            password="12345678"
        )

        self.token = Token.objects.create(user=self.user)

        self.client.credentials(
            HTTP_AUTHORIZATION=f"Token {self.token.key}"
        )

        self.patient = Patient.objects.create(
            user=self.user,
            patient_id="P001",
            name="Ahmed"
        )

    def test_upload_xray(self):
        url = reverse("upload_xray")

        image = SimpleUploadedFile(
            "test.jpg",
            b"fake-image-content",
            content_type="image/jpeg"
        )

        response = self.client.post(url, {
            "patient_id": self.patient.id,
            "image": image
        }, format="multipart")

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(XRay.objects.count(), 1)

    @patch("api.views.run_full_analysis")
    @patch("api.views.generate_dental_recommendation")
    def test_analyze_xray(
        self,
        mock_generate_recommendation,
        mock_run_analysis
    ):

        mock_run_analysis.return_value = {
            "report": {
                "summary": "Test summary",
                "overall_label": "abnormal",
                "total_lesions": 1,
                "total_impacted": 1
            },
            "findings": [],
            "impacted_findings": [],
            "lesion_findings": []
        }

        mock_generate_recommendation.return_value = {
            "summary": "AI Summary",
            "urgency": "moderate",
            "recommendation_text": "Visit dentist",
            "next_steps": ["Follow-up"]
        }

        image = SimpleUploadedFile(
            "xray.jpg",
            b"fake-image-content",
            content_type="image/jpeg"
        )

        xray = XRay.objects.create(
            patient=self.patient,
            image=image
        )

        url = reverse("analyze_xray", args=[xray.id])

        response = self.client.post(url)

        self.assertEqual(response.status_code, 200)
        self.assertIn("report", response.data)
        self.assertIn("recommendation", response.data)

    def test_get_xray_analysis_not_found(self):
        url = reverse("get_xray_analysis", args=[999])

        response = self.client.get(url)

        self.assertEqual(response.status_code, 404)


class ReportTests(APITestCase):

    def setUp(self):
        self.user = User.objects.create_user(
            username="doctor",
            password="12345678"
        )

        self.token = Token.objects.create(user=self.user)

        self.client.credentials(
            HTTP_AUTHORIZATION=f"Token {self.token.key}"
        )

        self.patient = Patient.objects.create(
            user=self.user,
            patient_id="P001",
            name="Ahmed"
        )

        image = SimpleUploadedFile(
            "xray.jpg",
            b"fake-image-content",
            content_type="image/jpeg"
        )

        self.xray = XRay.objects.create(
            patient=self.patient,
            image=image,
            analysis_result={
                "report": {
                    "summary": "Test report",
                    "overall_label": "normal",
                    "total_lesions": 0,
                    "total_impacted": 0
                },
                "recommendation": {
                    "summary": "Healthy"
                }
            }
        )

    def test_list_reports(self):
        url = reverse("list_reports")

        response = self.client.get(url)

        self.assertEqual(response.status_code, 200)
        self.assertEqual(len(response.data), 1)

    def test_update_report(self):
        url = reverse("update_report", args=[self.xray.id])

        response = self.client.put(url, {
            "doctor_notes": "Patient needs follow-up",
            "edited_report": "Edited report text"
        }, format="json")

        self.assertEqual(response.status_code, 200)

        self.xray.refresh_from_db()

        self.assertEqual(
            self.xray.doctor_notes,
            "Patient needs follow-up"
        )

        self.assertEqual(
            self.xray.edited_report,
            "Edited report text"
        )


