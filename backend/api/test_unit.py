from unittest.mock import patch, MagicMock, ANY
from django.contrib.auth.models import User
from django.core.files.uploadedfile import SimpleUploadedFile
from django.test import SimpleTestCase, TestCase, RequestFactory
from django.urls import reverse

from rest_framework import status
from rest_framework.test import APITestCase, APIClient
from rest_framework.authtoken.models import Token
import json
from .models import Patient, XRay
from .views import (
    clean_json_text,
    generate_dental_recommendation,
    make_json_safe,
    
)

# =========================================================
#  LOGIN VIEW TESTS
# =========================================================
class LoginViewTest(APITestCase):

    def setUp(self):
        self.url = "/api/login/"

        # reusable user mock (spec=User)
        self.user = MagicMock(spec=User)
        self.user.username = "testuser"
        self.user.email = "test@test.com"

    # -------------------------
    # Login success 
    # -------------------------
    @patch("api.views.authenticate")
    @patch("api.views.Token.objects.get_or_create")
    def test_login_success(self, mock_get_or_create, mock_auth):

        mock_auth.return_value = self.user
        mock_get_or_create.return_value = (MagicMock(key="abc123"), True)

        response = self.client.post(self.url, {
            "username": "testuser",
            "password": "123456",
        })

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertTrue(response.data["success"])
        self.assertEqual(response.data["token"], "abc123")
        self.assertEqual(response.data["username"], "testuser")
        self.assertEqual(response.data["email"], "test@test.com")

        mock_auth.assert_called_once_with(
            ANY,
            username="testuser",
            password="123456"
        )
        mock_get_or_create.assert_called_once_with(user=self.user)

    # -------------------------
    # Invalid credentials
    # -------------------------
    @patch("api.views.authenticate")
    def test_login_invalid_credentials(self, mock_auth):

        mock_auth.return_value = None

        response = self.client.post(self.url, {
            "username": "wrong",
            "password": "wrong",
        })

        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)
        self.assertFalse(response.data["success"])
        self.assertIn("error", response.data)

        mock_auth.assert_called_once()


    # -------------------------
    # Missing username
    # -------------------------
    @patch("api.views.authenticate")
    def test_login_missing_username(self, mock_auth):

        mock_auth.return_value = None

        response = self.client.post(self.url, {
            "password": "123456",
        })

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertFalse(response.data["success"])

       

    # -------------------------
    # Missing password
    # -------------------------
    @patch("api.views.authenticate")
    def test_login_missing_password(self, mock_auth):

        mock_auth.return_value = None

        response = self.client.post(self.url, {
            "username": "testuser",
        })

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST) 
        self.assertFalse(response.data["success"])

       

    # -------------------------
    # Existing token case
    # -------------------------
    @patch("api.views.authenticate")
    @patch("api.views.Token.objects.get_or_create")
    def test_login_existing_token(self, mock_get_or_create, mock_auth):

        mock_auth.return_value = self.user
        mock_get_or_create.return_value = (MagicMock(key="existing-token"), False)

        response = self.client.post(self.url, {
            "username": "testuser",
            "password": "123456",
        })

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["token"], "existing-token")

        mock_get_or_create.assert_called_once_with(user=self.user)

# =========================================================
#  CREATE PATIENT TESTS
# =========================================================
class CreatePatientTest(APITestCase):

    def setUp(self):
        self.url = "/api/patients/create/"

        self.mock_user = User.objects.create_user(
             username="testuser",
             email="test@test.com",
             password="123456"
)

        self.valid_data = {
           "national_id": "1234567890",
           "full_name": "Ahmed Ali",
           "birth_date": "2000-01-01",
           "phone_number": "0501234567",
           "email": "ahmed@test.com",
}

    # Test Successful Creation
    @patch("api.views.DoctorPatient.objects.get_or_create")
    @patch("api.views.Patient.objects.get_or_create")
    @patch("api.views.Patient.objects.filter")
    def test_create_patient_success(self, mock_filter, mock_get_or_create, mock_doctor_patient):
        self.client.force_authenticate(user=self.mock_user)

        # patient is not already in this doctor's list
        mock_filter.return_value.exists.return_value = False

        mock_patient = MagicMock()
        mock_patient.id = 10
        mock_patient.national_id = "1234567890"
        mock_patient.full_name = "Ahmed Ali"

        mock_get_or_create.return_value = (mock_patient, True)
        mock_doctor_patient.return_value = (MagicMock(), True)

        response = self.client.post(self.url, self.valid_data)

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data["id"], 10)
        self.assertEqual(response.data["national_id"], "1234567890")
        self.assertEqual(response.data["full_name"], "Ahmed Ali")
        self.assertEqual(response.data["message"], "Patient registered successfully")

        mock_filter.assert_called_once_with(
            national_id="1234567890",
            doctors=self.mock_user
        )

        mock_get_or_create.assert_called_once_with(
            national_id="1234567890",
            defaults={
                "full_name": "Ahmed Ali",
                "phone_number": "0501234567",
                "email": "ahmed@test.com",
                "birth_date": "2000-01-01",
            }
        )

        mock_doctor_patient.assert_called_once_with(
            doctor=self.mock_user,
            patient=mock_patient
        )

    # Test Missing national_id
    def test_create_patient_missing_id(self):
        self.client.force_authenticate(user=self.mock_user)

        data = self.valid_data.copy()
        data["national_id"] = ""

        response = self.client.post(self.url, data)

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(response.data["patient_id"], "National ID is required.")

    # Test Invalid national_id Format
    def test_create_patient_invalid_id_format(self):
        self.client.force_authenticate(user=self.mock_user)

        data = self.valid_data.copy()
        data["national_id"] = "P001"

        response = self.client.post(self.url, data)

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(response.data["patient_id"], "National ID must be exactly 10 digits.")

    # Test Duplicate national_id for same doctor
    @patch("api.views.Patient.objects.filter")
    def test_create_patient_duplicate(self, mock_filter):
        self.client.force_authenticate(user=self.mock_user)

        mock_filter.return_value.exists.return_value = True

        response = self.client.post(self.url, self.valid_data)

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(response.data["patient_id"], "This patient is already in your list.")

    # Test Missing full_name
    def test_create_patient_missing_full_name(self):
        self.client.force_authenticate(user=self.mock_user)

        data = self.valid_data.copy()
        data["full_name"] = ""

        response = self.client.post(self.url, data)

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(response.data["name"], "Full name is required.")

    # Test Invalid full_name
    def test_create_patient_invalid_full_name(self):
        self.client.force_authenticate(user=self.mock_user)

        data = self.valid_data.copy()
        data["full_name"] = "Ahmed123"

        response = self.client.post(self.url, data)

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(response.data["name"], "Name must contain letters only.")

    # Test Missing Birth Date
    def test_create_patient_missing_birth_date(self):
        self.client.force_authenticate(user=self.mock_user)

        data = self.valid_data.copy()
        data["birth_date"] = ""

        response = self.client.post(self.url, data)

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(response.data["birthDate"], "Date of birth is required.")

    # Test Future Birth Date
    def test_create_patient_future_birth_date(self):
        self.client.force_authenticate(user=self.mock_user)

        data = self.valid_data.copy()
        data["birth_date"] = "2999-01-01"

        response = self.client.post(self.url, data)

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(response.data["birthDate"], "Birth date cannot be in the future.")

    # Test Missing phone_number
    def test_create_patient_missing_phone_number(self):
        self.client.force_authenticate(user=self.mock_user)

        data = self.valid_data.copy()
        data["phone_number"] = ""

        response = self.client.post(self.url, data)

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(response.data["phone"], "Phone number is required.")

    # Test Invalid Phone
    def test_create_patient_invalid_phone_number(self):
        self.client.force_authenticate(user=self.mock_user)

        data = self.valid_data.copy()
        data["phone_number"] = "12345"

        response = self.client.post(self.url, data)

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(response.data["phone"], "Phone must start with 05 and contain 10 digits.")

    # Test Missing Email
    def test_create_patient_missing_email(self):
        self.client.force_authenticate(user=self.mock_user)

        data = self.valid_data.copy()
        data["email"] = ""

        response = self.client.post(self.url, data)

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(response.data["email"], "Email address is required.")

    # Test Invalid Email
    def test_create_patient_invalid_email(self):
        self.client.force_authenticate(user=self.mock_user)

        data = self.valid_data.copy()
        data["email"] = "wrong-email"

        response = self.client.post(self.url, data)

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(response.data["email"], "Please enter a valid email address.")

    # Test Internal Server Error
    @patch("api.views.Patient.objects.get_or_create")
    @patch("api.views.Patient.objects.filter")
    def test_create_patient_server_error(self, mock_filter, mock_get_or_create):
        self.client.force_authenticate(user=self.mock_user)

        mock_filter.return_value.exists.return_value = False
        mock_get_or_create.side_effect = Exception("Database error")

        response = self.client.post(self.url, self.valid_data)
        self.assertEqual(response.status_code, status.HTTP_500_INTERNAL_SERVER_ERROR)
        self.assertIn("form", response.data)
        self.assertIn("Database error", response.data["form"])

    # Test Unauthorized Access
    def test_create_patient_unauthorized(self):
        response = self.client.post(self.url, self.valid_data)

        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)


# =========================================================
#  PATIENT AND XRAY TESTS CHECK
# =========================================================
from unittest.mock import patch, MagicMock
from django.core.files.uploadedfile import SimpleUploadedFile
from rest_framework import status
from rest_framework.test import APITestCase
from datetime import datetime


class PatientXRayUnitTests(APITestCase):

    def setUp(self):
        class UserMock:
            id = 1
            username = "dr_joud"
            is_authenticated = True

        self.user = UserMock()
        self.client.force_authenticate(user=self.user)

        self.patient_id = 1
        self.upload_url = "/api/xrays/upload/"
        self.list_url = "/api/xrays/"

    def create_patient_mock(self):
        class PatientMock:
            id = 1
            full_name = "Ahmed Test"
            national_id = "1234567890"
            age = 30
            birth_date = "1995-01-01"
            phone_number = "0500000000"
            gender = "male"
            email = "test@test.com"

        return PatientMock()

    def create_xray_mock(self):
        class XRayMock:
            id = 1
            image = type("img", (), {"url": "/media/xrays/test.jpg"})
            uploaded_at = datetime.now()
            analysis_result = None

        return XRayMock()

    @patch("api.views.Patient.objects.get")
    def test_get_patient_success(self, mock_get):
        mock_get.return_value = self.create_patient_mock()

        response = self.client.get(f"/api/patients/{self.patient_id}/")

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["name"], "Ahmed Test")
        self.assertEqual(response.data["patient_id"], "1234567890")
        self.assertEqual(response.data["phone"], "0500000000")

    @patch("api.views.Patient.objects.get")
    def test_get_patient_not_found(self, mock_get):
        from api.models import Patient

        mock_get.side_effect = Patient.DoesNotExist

        response = self.client.get("/api/patients/9999/")

        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)
        self.assertEqual(response.data["error"], "Patient not found")

    @patch("api.views.XRay.objects.create")
    @patch("api.views.Patient.objects.get")
    def test_upload_xray_success(self, mock_get, mock_create):
        mock_get.return_value = self.create_patient_mock()
        mock_create.return_value = self.create_xray_mock()

        image = SimpleUploadedFile(
            "xray.jpg",
            b"fake",
            content_type="image/jpeg"
        )

        data = {
            "patient_id": self.patient_id,
            "image": image,
        }

        response = self.client.post(
            self.upload_url,
            data,
            format="multipart"
        )

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertIn("image_url", response.data)
        self.assertIn("created_at", response.data)
        self.assertFalse(response.data["has_analysis"])

    def test_upload_xray_missing_patient_id(self):
        image = SimpleUploadedFile(
            "xray.jpg",
            b"fake",
            content_type="image/jpeg"
        )

        response = self.client.post(
            self.upload_url,
            {
                "image": image,
            },
            format="multipart"
        )

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(response.data["error"], "patient_id is required")

    def test_upload_xray_missing_image(self):
        response = self.client.post(
            self.upload_url,
            {
                "patient_id": self.patient_id,
            },
            format="multipart"
        )

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(response.data["error"], "image is required")

    def test_upload_xray_invalid_extension(self):
        image = SimpleUploadedFile(
            "xray.pdf",
            b"fake pdf content",
            content_type="application/pdf"
        )

        response = self.client.post(
            self.upload_url,
            {
                "patient_id": self.patient_id,
                "image": image,
            },
            format="multipart"
        )

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(
            response.data["error"],
            "Invalid file type. Only PNG, JPG, and JPEG are allowed."
        )

    def test_upload_xray_non_image_content_type(self):
        image = SimpleUploadedFile(
            "xray.jpg",
            b"fake text content",
            content_type="text/plain"
        )

        response = self.client.post(
            self.upload_url,
            {
                "patient_id": self.patient_id,
                "image": image,
            },
            format="multipart"
        )

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(response.data["error"], "File must be a valid image.")

    @patch("api.views.Patient.objects.get")
    def test_upload_xray_invalid_patient(self, mock_get):
        from api.models import Patient

        mock_get.side_effect = Patient.DoesNotExist

        image = SimpleUploadedFile(
            "x.jpg",
            b"data",
            content_type="image/jpeg"
        )

        response = self.client.post(
            self.upload_url,
            {
                "patient_id": 9999,
                "image": image,
            },
            format="multipart"
        )

        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)
        self.assertEqual(response.data["error"], "Patient not found")
    
    @patch("api.views.XRay.objects.filter")
    @patch("api.views.Patient.objects.get")
    def test_list_xrays_success(self, mock_get, mock_filter):
        self.client.force_authenticate(user=self.user)

        mock_get.return_value = self.create_patient_mock()

        mock_queryset = MagicMock()
        mock_queryset.order_by.return_value = [self.create_xray_mock()]
        mock_filter.return_value = mock_queryset

        response = self.client.get(
            self.list_url,
            {"patient_id": self.patient_id}
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertTrue(len(response.data) > 0)
        self.assertIn("image_url", response.data[0])
        self.assertIn("created_at", response.data[0])
        self.assertIn("has_analysis", response.data[0])

        mock_get.assert_called_once_with(
            id=str(self.patient_id),
            doctors=self.user
        )

        mock_filter.assert_called_once_with(
            patient=mock_get.return_value
        )

# =========================================================
#  LIST PATIENTS TESTS CHECK
# =========================================================

# =========================================================
#  LIST PATIENTS TESTS
# =========================================================

class ListPatientsTest(APITestCase):

    def setUp(self):
        self.url = "/api/patients/"

        self.mock_user = MagicMock(spec=User)
        self.mock_user.username = "testuser"
        self.mock_user.pk = 1

    @patch("api.views.Patient.objects.filter")
    def test_list_patients_success(self, mock_filter):
        self.client.force_authenticate(user=self.mock_user)

        mock_p1 = MagicMock()
        mock_p1.id = 1
        mock_p1.national_id = "1234567890"
        mock_p1.full_name = "Patient A"
        mock_p1.age = 25
        mock_p1.birth_date = "2000-01-01"
        mock_p1.phone_number = "0500000001"
        mock_p1.email = "patient.a@test.com"

        mock_p2 = MagicMock()
        mock_p2.id = 2
        mock_p2.national_id = "0987654321"
        mock_p2.full_name = "Patient B"
        mock_p2.age = 30
        mock_p2.birth_date = "1995-01-01"
        mock_p2.phone_number = "0500000002"
        mock_p2.email = "patient.b@test.com"

        mock_filter.return_value.order_by.return_value = [
            mock_p1,
            mock_p2,
        ]

        response = self.client.get(self.url)

        self.assertEqual(
            response.status_code,
            status.HTTP_200_OK
        )

        self.assertEqual(len(response.data), 2)

        self.assertEqual(
            response.data[0]["patient_id"],
            "1234567890"
        )

        self.assertEqual(
            response.data[0]["name"],
            "Patient A"
        )

        self.assertEqual(
            response.data[0]["phone"],
            "0500000001"
        )

        self.assertEqual(
            response.data[1]["patient_id"],
            "0987654321"
        )

        self.assertEqual(
            response.data[1]["name"],
            "Patient B"
        )

        self.assertEqual(
            response.data[1]["phone"],
            "0500000002"
        )

        mock_filter.assert_called_once_with(
            doctors=self.mock_user
        )

    @patch("api.views.Patient.objects.filter")
    def test_list_patients_empty(self, mock_filter):
        self.client.force_authenticate(user=self.mock_user)

        mock_filter.return_value.order_by.return_value = []

        response = self.client.get(self.url)

        self.assertEqual(
            response.status_code,
            status.HTTP_200_OK
        )

        self.assertEqual(len(response.data), 0)

        mock_filter.assert_called_once_with(
            doctors=self.mock_user
        )

    def test_list_patients_unauthorized(self):
        response = self.client.get(self.url)

        self.assertEqual(
            response.status_code,
            status.HTTP_401_UNAUTHORIZED
        )

    @patch("api.views.Patient.objects.filter")
    def test_list_patients_only_user_data(self, mock_filter):
        self.client.force_authenticate(user=self.mock_user)

        mock_patient = MagicMock()
        mock_patient.id = 1
        mock_patient.national_id = "1234567890"
        mock_patient.full_name = "Patient A"
        mock_patient.age = 25
        mock_patient.birth_date = "2000-01-01"
        mock_patient.phone_number = "0500000001"
        mock_patient.email = "patient.a@test.com"

        mock_filter.return_value.order_by.return_value = [
            mock_patient
        ]

        response = self.client.get(self.url)

        self.assertEqual(
            response.status_code,
            status.HTTP_200_OK
        )

        self.assertEqual(len(response.data), 1)

        self.assertEqual(
            response.data[0]["patient_id"],
            "1234567890"
        )

        self.assertEqual(
            response.data[0]["name"],
            "Patient A"
        )

        mock_filter.assert_called_once_with(
            doctors=self.mock_user
        )
        
# =========================================================
#  ANALYZE XRAY VIEW TESTS
# =========================================================
class TestAnalyzeXRayView(APITestCase):

    def setUp(self):
        self.client = APIClient()

        self.mock_user = MagicMock(spec=User)
        self.mock_user.username = "dr_test"
        self.mock_user.pk = 1

        self.client.force_authenticate(user=self.mock_user)

        self.url = lambda xray_id: f"/api/xrays/{xray_id}/analyze/"

    @patch("api.views.Report.objects.update_or_create")
    @patch("api.views.generate_dental_recommendation")
    @patch("api.views.run_full_analysis")
    @patch("api.views.os.path.exists")
    @patch("api.views.XRay.objects.select_related")
    def test_success_flow(
        self,
        mock_select,
        mock_exists,
        mock_run,
        mock_rec,
        mock_update_or_create
    ):
        mock_image = MagicMock()
        mock_image.path = "/media/xray.png"
        mock_image.url = "http://test/xray.png"

        mock_xray = MagicMock()
        mock_xray.id = 1
        mock_xray.image = mock_image
        mock_xray.save = MagicMock()

        mock_select.return_value.get.return_value = mock_xray
        mock_exists.return_value = True

        mock_run.return_value = {
            "report": {
                "summary": "Test summary",
                "overall_label": "abnormal",
                "total_lesions": 1,
                "total_impacted": 0,
            },
            "findings": [{"label": "lesion"}],
            "impacted_findings": [],
            "lesion_findings": [{"label": "lesion"}],
        }

        mock_rec.return_value = {
            "summary": "Recommendation summary",
            "urgency": "moderate",
            "recommendation_text": "Review clinically.",
            "next_steps": ["Clinical examination"],
        }

        mock_report = MagicMock()
        mock_report.ai_result_data = {
            "xray_id": 1,
            "report": mock_run.return_value["report"],
            "findings": mock_run.return_value["findings"],
            "impacted_findings": [],
            "lesion_findings": [{"label": "lesion"}],
            "recommendation": mock_rec.return_value,
            "image_url": "http://test/xray.png",
        }

        mock_update_or_create.return_value = (mock_report, True)

        response = self.client.post(self.url(1))

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["xray_id"], 1)
        self.assertIn("report", response.data)
        self.assertIn("recommendation", response.data)
        self.assertEqual(response.data["image_url"], "http://test/xray.png")

        mock_select.return_value.get.assert_called_once_with(
            id=1,
            patient__doctors=self.mock_user
        )

        mock_run.assert_called_once_with("/media/xray.png")
        mock_rec.assert_called_once()
        mock_xray.save.assert_called_once()

        mock_update_or_create.assert_called_once()
        self.assertEqual(
            mock_update_or_create.call_args.kwargs["xray"],
            mock_xray
        )
        self.assertFalse(
            mock_update_or_create.call_args.kwargs["defaults"]["is_confirmed"]
        )
        self.assertIn(
            "ai_result_data",
            mock_update_or_create.call_args.kwargs["defaults"]
        )

    @patch("api.views.XRay.objects.select_related")
    def test_xray_not_found(self, mock_select):
        mock_select.return_value.get.side_effect = XRay.DoesNotExist

        response = self.client.post(self.url(999))

        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)
        self.assertEqual(response.data["error"], "XRay not found")

        mock_select.return_value.get.assert_called_once_with(
                id=999,
                patient__doctors=self.mock_user
            )

        @patch("api.views.XRay.objects.select_related")
        def test_no_image(self, mock_select):
            mock_xray = MagicMock()
            mock_xray.image = None

            mock_select.return_value.get.return_value = mock_xray

            response = self.client.post(self.url(1))

            self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
            self.assertEqual(response.data["error"], "No image found for this XRay")

        @patch("api.views.os.path.exists")
        @patch("api.views.XRay.objects.select_related")
        def test_file_not_exists_on_disk(self, mock_select, mock_exists):
            mock_image = MagicMock()
            mock_image.path = "/fake/path.png"

            mock_xray = MagicMock()
            mock_xray.image = mock_image

            mock_select.return_value.get.return_value = mock_xray
            mock_exists.return_value = False

            response = self.client.post(self.url(1))

            self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)
            self.assertEqual(response.data["error"], "XRay image file does not exist")

            # AI pipeline exception
    @patch("api.views.run_full_analysis")
    @patch("api.views.os.path.exists")
    @patch("api.views.XRay.objects.select_related")
    def test_ai_pipeline_exception(self, mock_select, mock_exists, mock_run):
        mock_image = MagicMock()
        mock_image.path = "/media/xray.png"

        mock_xray = MagicMock()
        mock_xray.image = mock_image

        mock_select.return_value.get.return_value = mock_xray
        mock_exists.return_value = True
        mock_run.side_effect = Exception("AI pipeline failed")

        with self.assertRaises(Exception):
            self.client.post(self.url(1))

            # Recommendation exception
    @patch("api.views.generate_dental_recommendation")
    @patch("api.views.run_full_analysis")
    @patch("api.views.os.path.exists")
    @patch("api.views.XRay.objects.select_related")
    def test_recommendation_exception(self, mock_select, mock_exists, mock_run, mock_rec):
        mock_image = MagicMock()
        mock_image.path = "/media/xray.png"

        mock_xray = MagicMock()
        mock_xray.image = mock_image

        mock_select.return_value.get.return_value = mock_xray
        mock_exists.return_value = True

        mock_run.return_value = {
            "report": {},
            "findings": [],
            "impacted_findings": [],
            "lesion_findings": [],
        }

        mock_rec.side_effect = Exception("Recommendation failed")

        with self.assertRaises(Exception):
            self.client.post(self.url(1))

            # Report save exception
    @patch("api.views.Report.objects.update_or_create")
    @patch("api.views.generate_dental_recommendation")
    @patch("api.views.run_full_analysis")
    @patch("api.views.os.path.exists")
    @patch("api.views.XRay.objects.select_related")
    def test_report_save_exception(
        self,
        mock_select,
        mock_exists,
        mock_run,
        mock_rec,
        mock_update_or_create
    ):
        mock_image = MagicMock()
        mock_image.path = "/media/xray.png"
        mock_image.url = "http://test/xray.png"

        mock_xray = MagicMock()
        mock_xray.id = 1
        mock_xray.image = mock_image
        mock_xray.save = MagicMock()

        mock_select.return_value.get.return_value = mock_xray
        mock_exists.return_value = True

        mock_run.return_value = {
            "report": {},
            "findings": [],
            "impacted_findings": [],
            "lesion_findings": [],
        }

        mock_rec.return_value = {
            "summary": "ok",
            "urgency": "low",
            "recommendation_text": "ok",
            "next_steps": [],
        }

        mock_update_or_create.side_effect = Exception("Report save failed")

        with self.assertRaises(Exception):
            self.client.post(self.url(1))


# =========================================================
#  GET XRAY ANALYSIS TESTS
# =========================================================
class TestGetXrayAnalysisView(APITestCase):

    def setUp(self):
        self.client = APIClient()

        self.mock_user = MagicMock(spec=User)
        self.mock_user.username = "dr_test2"
        self.mock_user.pk = 1

        self.client.force_authenticate(user=self.mock_user)

        self.url = lambda xray_id: f"/api/xrays/{xray_id}/analysis/"

    @patch("api.views.XRay.objects.select_related")
    def test_success(self, mock_select):
        mock_report = MagicMock()
        mock_report.ai_result_data = {
            "xray_id": 1,
            "findings": ["cavity"],
            "report": {
                "summary": "Test summary",
                "overall_label": "abnormal",
            },
        }
        mock_report.doctor_notes = "note"
        mock_report.is_confirmed = True
        mock_report.updated_at = "2026-05-10"

        mock_xray = MagicMock()
        mock_xray.report = mock_report

        mock_select.return_value.get.return_value = mock_xray

        response = self.client.get(self.url(1))

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["findings"], ["cavity"])
        self.assertEqual(response.data["doctor_notes"], "note")
        self.assertTrue(response.data["is_confirmed"])
        self.assertEqual(response.data["updated_at"], "2026-05-10")

        mock_select.return_value.get.assert_called_once_with(
            id=1,
            patient__doctors=self.mock_user
        )

    @patch("api.views.XRay.objects.select_related")
    def test_not_found(self, mock_select):
        mock_select.return_value.get.side_effect = XRay.DoesNotExist

        response = self.client.get(self.url(999))

        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)
        self.assertEqual(response.data["error"], "XRay not found")

        mock_select.return_value.get.assert_called_once_with(
            id=999,
            patient__doctors=self.mock_user
        )

    def test_unauthorized(self):
        self.client.force_authenticate(user=None)

        response = self.client.get(self.url(1))

        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

# =========================================================
#  CLEAN JSON TEXT TESTS
# =========================================================

class CleanJsonTextTest(SimpleTestCase):

    def test_normal_text(self):
        text = "hello world"
        result = clean_json_text(text)

        self.assertEqual(result, "hello world")

    def test_remove_json_prefix(self):
        text = "```json\n{\"key\": \"value\"}"
        result = clean_json_text(text)

        self.assertEqual(result, "{\"key\": \"value\"}")

    def test_remove_triple_backticks(self):
        text = "```\n{\"key\": \"value\"}"
        result = clean_json_text(text)

        self.assertEqual(result, "{\"key\": \"value\"}")

    def test_remove_both_sides(self):
        text = "```json\n{\"key\": \"value\"}\n```"
        result = clean_json_text(text)

        self.assertEqual(result, "{\"key\": \"value\"}")

    def test_non_string(self):
        result = clean_json_text(123)

        self.assertEqual(result, 123)


# =========================================================
#  GENERATE DENTAL RECOMMENDATION TESTS
# =========================================================

class GenerateDentalRecommendationTest(SimpleTestCase):

    @patch("api.views.client.chat.completions.create")
    def test_generate_recommendation_success_json(self, mock_create):
        mock_response = MagicMock()
        mock_response.choices[0].message.content = """
        {
            "summary": "Possible dental findings detected.",
            "urgency": "moderate",
            "recommendation_text": "Review the X-ray clinically.",
            "next_steps": ["Clinical examination", "Further radiographic review"]
        }
        """
        mock_create.return_value = mock_response

        report = {
            "summary": "Lesion and impaction detected",
            "overall_label": "abnormal",
            "total_lesions": 1,
            "total_impacted": 1,
        }

        result = generate_dental_recommendation(
            report,
            findings=[{"label": "finding"}],
            impacted_findings=[{"label": "impacted", "confidence": 0.9}],
            lesion_findings=[{"pred_label": "lesion", "confidence": 0.8}],
        )

        self.assertEqual(result["summary"], "Possible dental findings detected.")
        self.assertEqual(result["urgency"], "moderate")
        self.assertEqual(result["recommendation_text"], "Review the X-ray clinically.")
        self.assertEqual(len(result["next_steps"]), 2)

    @patch("api.views.client.chat.completions.create")
    def test_generate_recommendation_plain_text_fallback(self, mock_create):
        mock_response = MagicMock()
        mock_response.choices[0].message.content = "Please review the X-ray clinically."
        mock_create.return_value = mock_response

        result = generate_dental_recommendation(
            report={},
            findings=[],
            impacted_findings=[],
            lesion_findings=[],
        )

        self.assertEqual(result["summary"], "AI recommendation generated as plain text.")
        self.assertEqual(result["urgency"], "moderate")
        self.assertEqual(result["recommendation_text"], "Please review the X-ray clinically.")
        self.assertEqual(result["next_steps"], [])

    @patch("api.views.client.chat.completions.create")
    def test_generate_recommendation_error(self, mock_create):
        mock_create.side_effect = Exception("AI service error")

        result = generate_dental_recommendation(
            report={},
            findings=[],
            impacted_findings=[],
            lesion_findings=[],
        )

        self.assertEqual(result["summary"], "Recommendation could not be generated.")
        self.assertEqual(result["urgency"], "unknown")
        self.assertEqual(result["recommendation_text"], "No recommendation available.")
        self.assertIn("error", result)


# =========================================================
#  LIST REPORTS TESTS
# =========================================================

class TestListReportsView(APITestCase):

    def setUp(self):
        self.client = APIClient()

        self.mock_user = MagicMock(spec=User)
        self.mock_user.username = "doctor1"
        self.mock_user.pk = 1

        self.client.force_authenticate(user=self.mock_user)
        self.url = "/api/reports/"

    @patch("api.views.XRay.objects.filter")
    def test_list_reports_success(self, mock_filter):
        mock_patient = MagicMock()
        mock_patient.id = 10
        mock_patient.national_id = "1234567890"
        mock_patient.full_name = "Ahmed"
        mock_patient.age = 30

        mock_report = MagicMock()
        mock_report.is_confirmed = False
        mock_report.ai_result_data = {
            "report": {
                "total_lesions": 2,
                "total_impacted": 1,
                "summary": "Test summary",
                "overall_label": "mild",
            },
            "recommendation": {
                "summary": "Recommendation summary",
                "urgency": "moderate",
                "recommendation_text": "Visit dentist",
                "next_steps": ["Clinical review"],
            },
        }

        mock_xray = MagicMock()
        mock_xray.id = 1
        mock_xray.patient = mock_patient
        mock_xray.report = mock_report
        mock_xray.uploaded_at.strftime.return_value = "2026-05-05 10:00"

        mock_queryset = MagicMock()
        mock_queryset.select_related.return_value.order_by.return_value = [mock_xray]
        mock_filter.return_value = mock_queryset

        response = self.client.get(self.url)

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 1)

        report = response.data[0]
        self.assertEqual(report["id"], 1)
        self.assertEqual(report["patient_id"], 10)
        self.assertEqual(report["patient_code"], "1234567890")
        self.assertEqual(report["patient_name"], "Ahmed")
        self.assertEqual(report["patient_age"], 30)
        self.assertEqual(report["date"], "2026-05-05 10:00")
        self.assertEqual(report["status"], "Pending")
        self.assertEqual(report["findings"], 3)
        self.assertEqual(report["summary"], "Test summary")
        self.assertEqual(report["overall_label"], "mild")
        self.assertEqual(report["total_lesions"], 2)
        self.assertEqual(report["total_impacted"], 1)
        self.assertIn("recommendation", report)

        mock_filter.assert_called_once_with(
            patient__doctors=self.mock_user,
            report__isnull=False
        )

    @patch("api.views.XRay.objects.filter")
    def test_list_reports_confirmed_status(self, mock_filter):
        mock_patient = MagicMock()
        mock_patient.id = 10
        mock_patient.national_id = "1234567890"
        mock_patient.full_name = "Ahmed"
        mock_patient.age = 30

        mock_report = MagicMock()
        mock_report.is_confirmed = True
        mock_report.ai_result_data = {
            "report": {
                "total_lesions": 0,
                "total_impacted": 0,
                "summary": "Normal case",
                "overall_label": "normal",
            },
            "recommendation": {},
        }

        mock_xray = MagicMock()
        mock_xray.id = 2
        mock_xray.patient = mock_patient
        mock_xray.report = mock_report
        mock_xray.uploaded_at.strftime.return_value = "2026-05-05 11:00"

        mock_queryset = MagicMock()
        mock_queryset.select_related.return_value.order_by.return_value = [mock_xray]
        mock_filter.return_value = mock_queryset

        response = self.client.get(self.url)

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data[0]["status"], "Confirmed")
        self.assertEqual(response.data[0]["findings"], 0)

    @patch("api.views.XRay.objects.filter")
    def test_list_reports_empty(self, mock_filter):
        mock_queryset = MagicMock()
        mock_queryset.select_related.return_value.order_by.return_value = []
        mock_filter.return_value = mock_queryset

        response = self.client.get(self.url)

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data, [])

        mock_filter.assert_called_once_with(
            patient__doctors=self.mock_user,
            report__isnull=False
        )

    def test_list_reports_unauthorized(self):
        self.client.force_authenticate(user=None)

        response = self.client.get(self.url)

        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)


# =========================================================
#  UPDATE REPORT TESTS
# =========================================================

class TestUpdateReportView(APITestCase):

    def setUp(self):
        self.client = APIClient()

        self.mock_user = User.objects.create_user(
            username="testuser",
            password="123456"
        )

        self.client.force_authenticate(user=self.mock_user)

        self.url = lambda xray_id: f"/api/xrays/{xray_id}/update-report/"

    @patch("api.views.XRay.objects.select_related")
    def test_update_report_success(self, mock_select):
        mock_report = MagicMock()
        mock_report.doctor_notes = "old note"
        mock_report.is_confirmed = False
        mock_report.save = MagicMock()

        mock_xray = MagicMock()
        mock_xray.report = mock_report

        mock_select.return_value.get.return_value = mock_xray

        data = {
            "doctor_notes": "new note"
        }

        response = self.client.put(self.url(1), data, format="json")

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["message"], "Notes updated successfully.")
        self.assertEqual(response.data["doctor_notes"], "new note")

        self.assertEqual(mock_report.doctor_notes, "new note")
        self.assertTrue(mock_report.is_confirmed)

        mock_select.return_value.get.assert_called_once_with(
            id=1,
            patient__doctors=self.mock_user
        )

        mock_report.save.assert_called_once()

    @patch("api.views.XRay.objects.select_related")
    def test_update_report_not_found(self, mock_select):
        mock_select.return_value.get.side_effect = XRay.DoesNotExist

        data = {
            "doctor_notes": "note"
        }

        response = self.client.put(self.url(999), data, format="json")

        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)
        self.assertEqual(response.data["error"], "XRay not found.")

        mock_select.return_value.get.assert_called_once_with(
            id=999,
            patient__doctors=self.mock_user
        )

    @patch("api.views.XRay.objects.select_related")
    def test_update_report_missing_doctor_notes(self, mock_select):
        mock_report = MagicMock()

        mock_xray = MagicMock()
        mock_xray.report = mock_report

        mock_select.return_value.get.return_value = mock_xray

        response = self.client.put(self.url(1), {}, format="json")

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(response.data["error"], "Doctor notes are required.")

    @patch("api.views.XRay.objects.select_related")
    def test_update_report_non_string_doctor_notes(self, mock_select):
        mock_report = MagicMock()

        mock_xray = MagicMock()
        mock_xray.report = mock_report

        mock_select.return_value.get.return_value = mock_xray

        data = {
            "doctor_notes": 12345
        }

        response = self.client.put(self.url(1), data, format="json")

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(response.data["error"], "Doctor notes must be text.")

    @patch("api.views.XRay.objects.select_related")
    def test_update_report_empty_doctor_notes(self, mock_select):
        mock_report = MagicMock()
        mock_report.doctor_notes = ""
        mock_report.is_confirmed = False
        mock_report.save = MagicMock()

        mock_xray = MagicMock()
        mock_xray.report = mock_report

        mock_select.return_value.get.return_value = mock_xray

        data = {
            "doctor_notes": ""
        }

        response = self.client.put(self.url(1), data, format="json")

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["message"], "Report saved without doctor notes.")
        self.assertEqual(response.data["doctor_notes"], "")
        self.assertTrue(response.data["warning"])

    @patch("api.views.XRay.objects.select_related")
    def test_update_report_digits_only_doctor_notes(self, mock_select):
        mock_report = MagicMock()

        mock_xray = MagicMock()
        mock_xray.report = mock_report

        mock_select.return_value.get.return_value = mock_xray

        data = {
            "doctor_notes": "123456"
        }

        response = self.client.put(self.url(1), data, format="json")

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(
            response.data["error"],
            "Doctor notes cannot contain only numbers."
        )

    def test_update_report_unauthorized(self):
        self.client.force_authenticate(user=None)

        data = {
            "doctor_notes": "test"
        }

        response = self.client.put(self.url(1), data, format="json")

        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)


# =========================================================
#  PROFILE VIEW TESTS
# =========================================================

class ProfileViewTest(APITestCase):

    def setUp(self):
        self.url = "/api/profile/"

        self.mock_user = MagicMock(spec=User)
        self.mock_user.username = "testuser"
        self.mock_user.email = "test@test.com"
        self.mock_user.pk = 1

    def test_get_profile(self):
        self.client.force_authenticate(user=self.mock_user)

        response = self.client.get(self.url)

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["username"], "testuser")
        self.assertEqual(response.data["email"], "test@test.com")

    def test_update_profile(self):
        self.client.force_authenticate(user=self.mock_user)

        updated_data = {
            "username": "new_name",
            "email": "new_email@test.com"
        }

        response = self.client.put("/api/profile/update/", updated_data)

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["message"], "Updated successfully")
        self.assertEqual(self.mock_user.username, "new_name")
        self.assertEqual(self.mock_user.email, "new_email@test.com")
        self.mock_user.save.assert_called_once()

    def test_profile_unauthorized(self):
        response = self.client.get(self.url)

        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_update_profile_invalid_email(self):
        self.client.force_authenticate(user=self.mock_user)

        data = {
            "username": "testuser",
            "email": "invalidemail"
        }

        response = self.client.put("/api/profile/update/", data)

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("email", response.data)

    def test_update_profile_empty_username(self):
        self.client.force_authenticate(user=self.mock_user)

        data = {
            "username": "",
            "email": "test@test.com"
        }

        response = self.client.put("/api/profile/update/", data)

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("username", response.data)