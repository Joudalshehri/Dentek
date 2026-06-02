from django.test import override_settings
from django.contrib.auth.models import User
from django.core.files.uploadedfile import SimpleUploadedFile
from rest_framework.test import APITestCase
from rest_framework import status
from unittest.mock import patch
import tempfile


@override_settings(MEDIA_ROOT=tempfile.mkdtemp())
class DentekIntegrationTests(APITestCase):

    def setUp(self):
        self.doctor1 = User.objects.create_user(
            username="doctor1",
            email="doctor1@test.com",
            password="pass12345"
        )

        self.doctor2 = User.objects.create_user(
            username="doctor2",
            email="doctor2@test.com",
            password="pass12345"
        )

        self.login_url = "/api/login/"
        self.create_patient_url = "/api/patients/create/"
        self.list_patients_url = "/api/patients/"
        self.upload_xray_url = "/api/xrays/upload/"
        self.list_reports_url = "/api/reports/"
        self.profile_url = "/api/profile/"

       # =========================
    # HELPERS
    # =========================

    def authenticate_as_doctor1(self):
        response = self.client.post(self.login_url, {
            "username": "doctor1",
            "password": "pass12345"
        })

        token = response.data["token"]
        self.client.credentials(HTTP_AUTHORIZATION=f"Token {token}")

    def authenticate_as_doctor2(self):
        response = self.client.post(self.login_url, {
            "username": "doctor2",
            "password": "pass12345"
        })

        token = response.data["token"]
        self.client.credentials(HTTP_AUTHORIZATION=f"Token {token}")

    def create_valid_patient(self):
        return self.client.post(self.create_patient_url, {
            "patient_id": "1234567890",
            "name": "Ahmed Ali",
            "birthDate": "2000-01-01",
            "phone": "0512345678",
            "email": "patient@test.com"
        })

    def upload_valid_xray(self, patient_id):
        image = SimpleUploadedFile(
            "xray.png",
            b"\x89PNG\r\n\x1a\n\x00\x00\x00\rIHDR",
            content_type="image/png"
        )

        return self.client.post(
            self.upload_xray_url,
            {
                "patient_id": patient_id,
                "image": image
            },
            format="multipart"
        )

    def mock_analysis_data(self):
        return {
            "report": {
                "summary": "Possible periapical lesion detected.",
                "overall_label": "abnormal",
                "total_lesions": 1,
                "total_impacted": 0
            },
            "findings": [
                {
                    "tooth_index": 1,
                    "pred_label": "lesion",
                    "confidence": 0.91
                }
            ],
            "impacted_findings": [],
            "lesion_findings": [
                {
                    "tooth_index": 1,
                    "pred_label": "lesion",
                    "confidence": 0.91
                }
            ]
        }

    def mock_recommendation_data(self):
        return {
            "summary": "Clinical review recommended.",
            "urgency": "moderate",
            "recommendation_text": "Review the X-ray clinically.",
            "next_steps": [
                "Clinical examination",
                "Further radiographic review"
            ]
        }

    def create_uploaded_xray_for_doctor1(self):
        self.authenticate_as_doctor1()

        patient_response = self.create_valid_patient()
        self.assertEqual(patient_response.status_code, status.HTTP_201_CREATED)

        patient_id = patient_response.data["id"]

        upload_response = self.upload_valid_xray(patient_id)
        self.assertEqual(upload_response.status_code, status.HTTP_201_CREATED)

        xray_id = upload_response.data["id"]

        return patient_id, xray_id

    def create_analyzed_xray_for_doctor1(self):
        patient_id, xray_id = self.create_uploaded_xray_for_doctor1()

        with patch("api.views.run_full_analysis") as mock_run_full_analysis, \
             patch("api.views.generate_dental_recommendation") as mock_generate_recommendation:

            mock_run_full_analysis.return_value = self.mock_analysis_data()
            mock_generate_recommendation.return_value = self.mock_recommendation_data()

            response = self.client.post(f"/api/xrays/{xray_id}/analyze/")

        self.assertEqual(response.status_code, status.HTTP_200_OK)

        return patient_id, xray_id, response
    # =========================
    # LOGIN TESTS
    # =========================

    def test_login_success_with_username(self):
        response = self.client.post(self.login_url, {
            "username": "doctor1",
            "password": "pass12345"
        })

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertTrue(response.data["success"])
        self.assertIn("token", response.data)
        self.assertEqual(response.data["username"], "doctor1")
        self.assertEqual(response.data["email"], "doctor1@test.com")

    def test_login_success_with_email(self):
        response = self.client.post(self.login_url, {
            "username": "doctor1@test.com",
            "password": "pass12345"
        })

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertTrue(response.data["success"])
        self.assertIn("token", response.data)

    def test_login_missing_username(self):
        response = self.client.post(self.login_url, {
            "username": "",
            "password": "pass12345"
        })

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertFalse(response.data["success"])
        self.assertIn("error", response.data)

    def test_login_missing_password(self):
        response = self.client.post(self.login_url, {
            "username": "doctor1",
            "password": ""
        })

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertFalse(response.data["success"])
        self.assertIn("error", response.data)

    def test_login_wrong_password(self):
        response = self.client.post(self.login_url, {
            "username": "doctor1",
            "password": "wrongpass"
        })

        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)
        self.assertFalse(response.data["success"])

    # =========================
    # CREATE PATIENT TESTS
    # =========================

    def test_create_patient_success(self):
        self.authenticate_as_doctor1()

        response = self.create_valid_patient()

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data["patient_id"], "1234567890")
        self.assertEqual(response.data["name"], "Ahmed Ali")
        self.assertIn("message", response.data)


    def test_create_patient_missing_national_id(self):
        self.authenticate_as_doctor1()

        response = self.client.post(self.create_patient_url, {
            "national_id": "",
            "full_name": "Ahmed Ali",
            "birth_date": "2000-01-01",
            "phone_number": "0512345678",
            "email": "patient@test.com"
        })

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("patient_id", response.data)

    def test_create_patient_invalid_national_id(self):
        self.authenticate_as_doctor1()

        response = self.client.post(self.create_patient_url, {
            "national_id": "123",
            "full_name": "Ahmed Ali",
            "birth_date": "2000-01-01",
            "phone_number": "0512345678",
            "email": "patient@test.com"
        })

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("patient_id", response.data)

    def test_create_patient_invalid_name_with_numbers(self):
        self.authenticate_as_doctor1()

        response = self.client.post(self.create_patient_url, {
            "national_id": "1234567890",
            "full_name": "Ahmed123",
            "birth_date": "2000-01-01",
            "phone_number": "0512345678",
            "email": "patient@test.com"
        })

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("name", response.data)

    def test_create_patient_future_birth_date(self):
        self.authenticate_as_doctor1()

        response = self.client.post(self.create_patient_url, {
            "national_id": "1234567890",
            "full_name": "Ahmed Ali",
            "birth_date": "2099-01-01",
            "phone_number": "0512345678",
            "email": "patient@test.com"
        })

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("birthDate", response.data)

    def test_create_patient_invalid_phone(self):
        self.authenticate_as_doctor1()

        response = self.client.post(self.create_patient_url, {
            "national_id": "1234567890",
            "full_name": "Ahmed Ali",
            "birth_date": "2000-01-01",
            "phone_numer": "12345",
            "email": "patient@test.com"
        })

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("phone", response.data)

    def test_create_patient_invalid_email(self):
        self.authenticate_as_doctor1()

        response = self.client.post(self.create_patient_url, {
            "national_id": "1234567890",
            "full_name": "Ahmed Ali",
            "birth_date": "2000-01-01",
            "phone_number": "0512345678",
            "email": "wrong-email"
        })

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("email", response.data)

    def test_create_duplicate_patient_for_same_doctor_rejected(self):
        self.authenticate_as_doctor1()

        first_response = self.create_valid_patient()
        self.assertEqual(first_response.status_code, status.HTTP_201_CREATED)

        second_response = self.create_valid_patient()

        self.assertEqual(second_response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("patient_id", second_response.data)

    # =========================
    # LIST / GET PATIENT TESTS
    # =========================

    def test_list_patients_success(self):
        self.authenticate_as_doctor1()
        self.create_valid_patient()

        response = self.client.get(self.list_patients_url)

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 1)
        self.assertEqual(response.data[0]["patient_id"], "1234567890")

    def test_list_patients_requires_authentication(self):
        response = self.client.get(self.list_patients_url)

        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_get_patient_success(self):
        self.authenticate_as_doctor1()
        patient_response = self.create_valid_patient()
        patient_id = patient_response.data["id"]

        response = self.client.get(f"/api/patients/{patient_id}/")

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["patient_id"], "1234567890")
        self.assertEqual(response.data["name"], "Ahmed Ali")

    def test_get_patient_not_found(self):
        self.authenticate_as_doctor1()

        response = self.client.get("/api/patients/999/")

        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)
        self.assertIn("error", response.data)

    def test_doctor_cannot_get_other_doctor_patient(self):
        self.authenticate_as_doctor1()
        patient_response = self.create_valid_patient()
        patient_id = patient_response.data["id"]

        self.client.credentials()
        self.authenticate_as_doctor2()

        response = self.client.get(f"/api/patients/{patient_id}/")

        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

    # =========================
    # XRAY UPLOAD TESTS
    # =========================

    def test_upload_xray_success(self):
        self.authenticate_as_doctor1()
        patient_response = self.create_valid_patient()
        patient_id = patient_response.data["id"]

        response = self.upload_valid_xray(patient_id)

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertIn("id", response.data)
        self.assertIn("image_url", response.data)
        self.assertFalse(response.data["has_analysis"])


    def test_upload_xray_invalid_extension(self):
        self.authenticate_as_doctor1()
        patient_response = self.create_valid_patient()
        patient_id = patient_response.data["id"]

        file = SimpleUploadedFile(
            "xray.txt",
            b"not image",
            content_type="text/plain"
        )

        response = self.client.post(
            self.upload_xray_url,
            {
                "patient_id": patient_id,
                "image": file
            },
            format="multipart"
        )

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("Invalid file type", response.data["error"])


    def test_doctor_cannot_upload_xray_for_other_doctor_patient(self):
        self.authenticate_as_doctor1()
        patient_response = self.create_valid_patient()
        patient_id = patient_response.data["id"]

        self.client.credentials()
        self.authenticate_as_doctor2()

        response = self.upload_valid_xray(patient_id)

        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)
        self.assertEqual(response.data["error"], "Patient not found")

    # =========================
    # LIST XRAYS TESTS
    # =========================

    def test_list_xrays_success(self):
        self.authenticate_as_doctor1()
        patient_response = self.create_valid_patient()
        patient_id = patient_response.data["id"]
        self.upload_valid_xray(patient_id)

        response = self.client.get(f"/api/xrays/?patient_id={patient_id}")

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 1)
        self.assertIn("image_url", response.data[0])
        self.assertFalse(response.data[0]["has_analysis"])

    def test_list_xrays_missing_patient_id(self):
        self.authenticate_as_doctor1()

        response = self.client.get("/api/xrays/")

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(response.data["error"], "patient_id is required")

    def test_list_xrays_patient_not_found(self):
        self.authenticate_as_doctor1()

        response = self.client.get("/api/xrays/?patient_id=999")

        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)
        self.assertEqual(response.data["error"], "Patient not found")

    def test_doctor_cannot_list_other_doctor_xrays(self):
        self.authenticate_as_doctor1()
        patient_response = self.create_valid_patient()
        patient_id = patient_response.data["id"]
        self.upload_valid_xray(patient_id)

        self.client.credentials()
        self.authenticate_as_doctor2()

        response = self.client.get(f"/api/xrays/?patient_id={patient_id}")

        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

    # =========================
    # ANALYZE XRAY TESTS
    # =========================

    @patch("api.views.generate_dental_recommendation")
    @patch("api.views.run_full_analysis")
    def test_analyze_xray_success(self, mock_run_full_analysis, mock_generate_recommendation):
        patient_id, xray_id = self.create_uploaded_xray_for_doctor1()

        mock_run_full_analysis.return_value = self.mock_analysis_data()
        mock_generate_recommendation.return_value = self.mock_recommendation_data()

        response = self.client.post(f"/api/xrays/{xray_id}/analyze/")

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn("report", response.data)
        self.assertIn("recommendation", response.data)
        self.assertIn("image_url", response.data)
        self.assertEqual(response.data["report"]["overall_label"], "abnormal")


    def test_doctor_cannot_analyze_other_doctor_xray(self):
        patient_id, xray_id = self.create_uploaded_xray_for_doctor1()

        self.client.credentials()
        self.authenticate_as_doctor2()

        response = self.client.post(f"/api/xrays/{xray_id}/analyze/")

        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)
        self.assertEqual(response.data["error"], "XRay not found")

    # =========================
    # GET XRAY ANALYSIS TESTS
    # =========================

    def test_get_xray_analysis_success(self):
        patient_id, xray_id, analyze_response = self.create_analyzed_xray_for_doctor1()

        response = self.client.get(f"/api/xrays/{xray_id}/analysis/")

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn("report", response.data)
        self.assertIn("recommendation", response.data)
        self.assertIn("doctor_notes", response.data)
        self.assertIn("is_confirmed", response.data)

    def test_get_xray_analysis_before_analysis_returns_404(self):
        patient_id, xray_id = self.create_uploaded_xray_for_doctor1()

        response = self.client.get(f"/api/xrays/{xray_id}/analysis/")

        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)
        self.assertEqual(response.data["error"], "No analysis found for this xray")

    def test_get_xray_analysis_xray_not_found(self):
        self.authenticate_as_doctor1()

        response = self.client.get("/api/xrays/999/analysis/")

        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)
        self.assertEqual(response.data["error"], "XRay not found")

    def test_doctor_cannot_get_other_doctor_analysis(self):
        patient_id, xray_id, analyze_response = self.create_analyzed_xray_for_doctor1()

        self.client.credentials()
        self.authenticate_as_doctor2()

        response = self.client.get(f"/api/xrays/{xray_id}/analysis/")

        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

    # =========================
    # UPDATE REPORT TESTS
    # =========================

    def test_update_report_success(self):
        patient_id, xray_id, analyze_response = self.create_analyzed_xray_for_doctor1()

        response = self.client.put(f"/api/xrays/{xray_id}/update-report/", {
            "doctor_notes": "Patient needs clinical examination."
        })

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(
            response.data["doctor_notes"],
            "Patient needs clinical examination."
        )

    def test_update_report_missing_doctor_notes(self):
        patient_id, xray_id, analyze_response = self.create_analyzed_xray_for_doctor1()

        response = self.client.put(f"/api/xrays/{xray_id}/update-report/", {})

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("Doctor notes are required", response.data["error"])

    def test_update_report_empty_doctor_notes(self):
     patient_id, xray_id, analyze_response = self.create_analyzed_xray_for_doctor1()

     response = self.client.put(
        f"/api/xrays/{xray_id}/update-report/",
        {
            "doctor_notes": ""
        }
        )

     self.assertEqual(
        response.status_code,
        status.HTTP_200_OK
       )

     self.assertEqual(
        response.data["message"],
        "Report saved without doctor notes."
       )

     self.assertTrue(response.data["warning"])

     self.assertEqual(
        response.data["doctor_notes"],
        ""
       )

    def test_update_report_numbers_only_rejected(self):
        patient_id, xray_id, analyze_response = self.create_analyzed_xray_for_doctor1()

        response = self.client.put(f"/api/xrays/{xray_id}/update-report/", {
            "doctor_notes": "123456"
        })

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("cannot contain only numbers", response.data["error"])

    def test_update_report_non_string_rejected(self):
        patient_id, xray_id, analyze_response = self.create_analyzed_xray_for_doctor1()

        response = self.client.put(f"/api/xrays/{xray_id}/update-report/", {
            "doctor_notes": 123
        }, format="json")

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("Doctor notes must be text", response.data["error"])

    def test_update_report_before_analysis_returns_404(self):
        patient_id, xray_id = self.create_uploaded_xray_for_doctor1()

        response = self.client.put(f"/api/xrays/{xray_id}/update-report/", {
            "doctor_notes": "Valid clinical note."
        })

        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)
        self.assertIn("No report exists", response.data["error"])


    def test_doctor_cannot_update_other_doctor_report(self):
        patient_id, xray_id, analyze_response = self.create_analyzed_xray_for_doctor1()

        self.client.credentials()
        self.authenticate_as_doctor2()

        response = self.client.put(f"/api/xrays/{xray_id}/update-report/", {
            "doctor_notes": "Trying to update other doctor report."
        })

        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)
        self.assertEqual(response.data["error"], "XRay not found.")

    # =========================
    # LIST REPORTS TESTS
    # =========================

    def test_list_reports_success_after_analysis(self):
        patient_id, xray_id, analyze_response = self.create_analyzed_xray_for_doctor1()

        response = self.client.get(self.list_reports_url)

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 1)
        self.assertEqual(response.data[0]["patient_code"], "1234567890")
        self.assertEqual(response.data[0]["patient_name"], "Ahmed Ali")
        self.assertEqual(response.data[0]["status"], "Pending")
        self.assertEqual(response.data[0]["total_lesions"], 1)
        self.assertEqual(response.data[0]["total_impacted"], 0)

    def test_list_reports_empty_when_no_reports(self):
        self.authenticate_as_doctor1()

        response = self.client.get(self.list_reports_url)

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 0)

    def test_list_reports_status_confirmed_after_update_notes(self):
        patient_id, xray_id, analyze_response = self.create_analyzed_xray_for_doctor1()

        self.client.put(f"/api/xrays/{xray_id}/update-report/", {
            "doctor_notes": "Confirmed by doctor."
        })

        response = self.client.get(self.list_reports_url)

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data[0]["status"], "Confirmed")

    def test_doctor_cannot_list_other_doctor_reports(self):
        patient_id, xray_id, analyze_response = self.create_analyzed_xray_for_doctor1()

        self.client.credentials()
        self.authenticate_as_doctor2()

        response = self.client.get(self.list_reports_url)

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 0)

    # =========================
    # PROFILE TESTS
    # =========================

    def test_profile_success(self):
        self.authenticate_as_doctor1()

        response = self.client.get(self.profile_url)

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["username"], "doctor1")
        self.assertEqual(response.data["email"], "doctor1@test.com")

    def test_profile_requires_authentication(self):
        response = self.client.get(self.profile_url)

        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    # =========================
    # FULL END-TO-END FLOW
    # =========================

    @patch("api.views.generate_dental_recommendation")
    @patch("api.views.run_full_analysis")
    def test_full_integration_flow_from_login_to_confirmed_report(
        self,
        mock_run_full_analysis,
        mock_generate_recommendation
    ):
        mock_run_full_analysis.return_value = self.mock_analysis_data()
        mock_generate_recommendation.return_value = self.mock_recommendation_data()

        # 1. Login
        login_response = self.client.post(self.login_url, {
            "username": "doctor1",
            "password": "pass12345"
        })

        self.assertEqual(login_response.status_code, status.HTTP_200_OK)

        token = login_response.data["token"]
        self.client.credentials(HTTP_AUTHORIZATION=f"Token {token}")

        # 2. Create patient
        patient_response = self.create_valid_patient()

        self.assertEqual(patient_response.status_code, status.HTTP_201_CREATED)
        patient_id = patient_response.data["id"]

        # 3. Upload xray
        upload_response = self.upload_valid_xray(patient_id)

        self.assertEqual(upload_response.status_code, status.HTTP_201_CREATED)
        xray_id = upload_response.data["id"]

        # 4. List xrays
        list_xrays_response = self.client.get(f"/api/xrays/?patient_id={patient_id}")

        self.assertEqual(list_xrays_response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(list_xrays_response.data), 1)

        # 5. Analyze xray
        analyze_response = self.client.post(f"/api/xrays/{xray_id}/analyze/")

        self.assertEqual(analyze_response.status_code, status.HTTP_200_OK)
        self.assertIn("report", analyze_response.data)
        self.assertIn("recommendation", analyze_response.data)

        # 6. Get analysis
        get_analysis_response = self.client.get(f"/api/xrays/{xray_id}/analysis/")

        self.assertEqual(get_analysis_response.status_code, status.HTTP_200_OK)
        self.assertIn("doctor_notes", get_analysis_response.data)

        # 7. Update report notes
        update_response = self.client.put(f"/api/xrays/{xray_id}/update-report/", {
            "doctor_notes": "Reviewed and confirmed by dentist."
        })

        self.assertEqual(update_response.status_code, status.HTTP_200_OK)

        # 8. List reports
        reports_response = self.client.get(self.list_reports_url)

        self.assertEqual(reports_response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(reports_response.data), 1)
        self.assertEqual(reports_response.data[0]["status"], "Confirmed")