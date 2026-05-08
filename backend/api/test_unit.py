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
    test_groq,
)
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

        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)
        self.assertFalse(response.data["success"])

        mock_auth.assert_called_once()

    # -------------------------
    # Missing password
    # -------------------------
    @patch("api.views.authenticate")
    def test_login_missing_password(self, mock_auth):

        mock_auth.return_value = None

        response = self.client.post(self.url, {
            "username": "testuser",
        })

        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)
        self.assertFalse(response.data["success"])

        mock_auth.assert_called_once()

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
#  PROFILE VIEW TESTS
# =========================================================
class ProfileViewTest(APITestCase):

    def setUp(self):
        # The URL endpoint for the profile view
        self.url = "/api/profile/"  
        
        # Mock User object
        self.mock_user = MagicMock(spec=User)
        self.mock_user.username = "testuser"
        self.mock_user.email = "test@test.com"
        self.mock_user.pk = 1  # Assign a mock Primary Key to simulate a saved database record

    # Test Profile Retrieval (GET Success)
    def test_get_profile(self):
        # Force authentication with the mock user to pass @permission_classes([IsAuthenticated])
        self.client.force_authenticate(user=self.mock_user)
        
        response = self.client.get(self.url)

        # Assertions to verify the returned data matches the mock user's attributes
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["username"], "testuser")
        self.assertEqual(response.data["email"], "test@test.com")

    # Test Profile Update (PUT Success)
    def test_update_profile(self):
        self.client.force_authenticate(user=self.mock_user)
        
        updated_data = {
            "username": "new_name",
            "email": "new_email@test.com"
        }

        response = self.client.put("/api/profile/update/", updated_data)
        # Verify the API response message
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["message"], "Updated successfully")

        # Verify that the mock user object's attributes were updated correctly by the view
        self.assertEqual(self.mock_user.username, "new_name")
        self.assertEqual(self.mock_user.email, "new_email@test.com")
        
        # Assert that the .save() method was called exactly once to persist changes
        self.mock_user.save.assert_called_once()

    # Test Unauthorized Access (Missing Authentication)
    def test_profile_unauthorized(self):
        # Send a request without calling force_authenticate or providing credentials
        response = self.client.get(self.url)

        # Expecting a 401 Unauthorized status as the view is protected
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)
# =========================================================
#  CREATE PATIENT TESTS
# =========================================================
class CreatePatientTest(APITestCase):

    def setUp(self):
        self.url = "/api/patients/create/"
        
        # Mock User
        self.mock_user = MagicMock(spec=User)
        self.mock_user.username = "testuser"
        self.mock_user.pk = 1

    #  Test Successful Creation
    @patch("api.views.Patient.objects.create")
    @patch("api.views.Patient.objects.filter")
    def test_create_patient_success(self, mock_filter, mock_create):
        self.client.force_authenticate(user=self.mock_user)

        # Configure mock_filter to return exists() = False (ID is unique)
        mock_filter.return_value.exists.return_value = False
        
        # Configure mock_create to return a mock patient object
        mock_patient = MagicMock()
        mock_patient.id = 10
        mock_patient.patient_id = "P001"
        mock_patient.name = "Ahmed"
        mock_create.return_value = mock_patient

        data = {
            "patient_id": "P001",
            "name": "Ahmed",
            "birthDate": "2000-01-01",
        }

        response = self.client.post(self.url, data)

        # Assertions
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data["patient_id"], "P001")
        self.assertEqual(response.data["name"], "Ahmed")
        mock_create.assert_called_once()

    # Test Missing patient_id
    def test_create_patient_missing_id(self):
        self.client.force_authenticate(user=self.mock_user)

        data = {"name": "Ahmed"} # Missing patient_id

        response = self.client.post(self.url, data)

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(response.data["error"], "patient_id is required")

    # Test Duplicate patient_id
    @patch("api.views.Patient.objects.filter")
    def test_create_patient_duplicate(self, mock_filter):
        self.client.force_authenticate(user=self.mock_user)

        # Configure mock_filter to return exists() = True (ID already taken)
        mock_filter.return_value.exists.return_value = True

        data = {
            "patient_id": "P001",
            "name": "New Name",
        }

        response = self.client.post(self.url, data)

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual( response.data["patient_id"],  "Patient ID already exists.")

    # Test Unauthorized Access
    def test_create_patient_unauthorized(self):
        # No force_authenticate call
        data = {"patient_id": "P002", "name": "Test"}

        response = self.client.post(self.url, data)

        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

# =========================================================
#  LIST PATIENTS TESTS CHECK
# =========================================================
class ListPatientsTest(APITestCase):

    def setUp(self):
        # API Endpoint
        self.url = "/api/patients/"
        
        # Setup Mock User
        self.mock_user = MagicMock(spec=User)
        self.mock_user.username = "testuser"
        self.mock_user.pk = 1

    # Test List Patients (Success with data)
    @patch("api.views.Patient.objects.filter")
    def test_list_patients(self, mock_filter):
        self.client.force_authenticate(user=self.mock_user)

        # Create mock patient objects to be returned by the filter
        mock_p1 = MagicMock()
        mock_p1.id = 1
        mock_p1.patient_id = "P1"
        mock_p1.name = "Patient A"
        mock_p1.age = 25
        mock_p1.birth_date = "2000-01-01"
        mock_p1.phone = "0500000001"
        mock_p1.email = "patient.a@test.com"

        mock_p2 = MagicMock()
        mock_p2.id = 2
        mock_p2.patient_id = "P2"
        mock_p2.name = "Patient B"
        mock_p2.age = 30
        mock_p2.birth_date = "1995-01-01"
        mock_p2.phone = "0500000002"
        mock_p2.email = "patient.b@test.com"

        # Configure the mock filter to return a list (QuerySet simulation)
        # We add .order_by because the view calls .filter().order_by()
        mock_filter.return_value.order_by.return_value = [mock_p1, mock_p2]

        response = self.client.get(self.url)

        # Assertions
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 2)
        self.assertEqual(response.data[0]["patient_id"], "P1")
        self.assertEqual(response.data[1]["name"], "Patient B")
        
        # Ensure filter was called with the authenticated user
        mock_filter.assert_called_once_with(user=self.mock_user)

    # Test List Patients (Empty list)
    @patch("api.views.Patient.objects.filter")
    def test_list_patients_empty(self, mock_filter):
        self.client.force_authenticate(user=self.mock_user)

        # Configure mock to return an empty list
        mock_filter.return_value.order_by.return_value = []

        response = self.client.get(self.url)

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 0)

    # Test Unauthorized Access
    def test_list_patients_unauthorized(self):
        # No authentication provided
        response = self.client.get(self.url)

        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    # Test Privacy (Only User Data)
    @patch("api.views.Patient.objects.filter")
    def test_list_patients_only_user_data(self, mock_filter):
        self.client.force_authenticate(user=self.mock_user)

        # We don't need to create a second user.
        # We just verify that the filter was called specifically for self.mock_user.
        mock_patient = MagicMock()
        mock_patient.id = 1
        mock_patient.patient_id = "P1"
        mock_patient.name = "Patient A"
        mock_patient.age = 25
        mock_patient.birth_date = "2000-01-01"
        mock_patient.phone = "0500000001"
        mock_patient.email = "patient.a@test.com"

        mock_filter.return_value.order_by.return_value = [mock_patient]

        self.client.get(self.url)

        # The core of this test is checking the filter arguments
        mock_filter.assert_called_once_with(user=self.mock_user)

# =========================================================
#  GROQ AND JSON HELPER TESTS
# =========================================================
class TestGroqAndJsonHelpers(TestCase):

    def setUp(self):
        self.factory = RequestFactory()

    def test_make_json_safe_dict_and_list(self):
        data = {
            "name": "Dentek",
            "values": [1, 2, 3],
            "nested": {
                "status": True,
            },
        }

        result = make_json_safe(data)

        self.assertEqual(result["name"], "Dentek")
        self.assertEqual(result["values"], [1, 2, 3])
        self.assertEqual(result["nested"]["status"], True)

    def test_make_json_safe_tuple(self):
        data = ("lesion", "normal")

        result = make_json_safe(data)

        self.assertEqual(result, ["lesion", "normal"])

    def test_make_json_safe_numpy_values(self):
        import numpy as np

        data = {
            "int_value": np.int64(5),
            "float_value": np.float32(0.95),
            "array_value": np.array([1, 2, 3]),
            "bool_value": np.bool_(True),
        }

        result = make_json_safe(data)

        self.assertIsInstance(result["int_value"], int)
        self.assertIsInstance(result["float_value"], float)
        self.assertEqual(result["array_value"], [1, 2, 3])
        self.assertIsInstance(result["bool_value"], bool)

    @patch("api.views.GROQ_API_KEY", None)
    @patch("api.views.client", None)
    def test_groq_missing_api_key(self):
        request = self.factory.get("/api/test-groq/")

        response = test_groq(request)
        data = json.loads(response.content)

        self.assertEqual(response.status_code, 500)
        self.assertFalse(data["success"])
        self.assertIn("GROQ_API_KEY is missing", data["error"])

    @patch("api.views.GROQ_API_KEY", "fake-key")
    @patch("api.views.client")
    def test_groq_success(self, mock_client):
        mock_response = MagicMock()
        mock_response.choices[0].message.content = "Hello"
        mock_client.chat.completions.create.return_value = mock_response

        request = self.factory.get("/api/test-groq/")

        response = test_groq(request)
        data = json.loads(response.content)

        self.assertEqual(response.status_code, 200)
        self.assertTrue(data["success"])
        self.assertEqual(data["response"], "Hello")

    @patch("api.views.GROQ_API_KEY", "fake-key")
    @patch("api.views.client")
    def test_groq_exception(self, mock_client):
        mock_client.chat.completions.create.side_effect = Exception("Groq error")

        request = self.factory.get("/api/test-groq/")

        response = test_groq(request)
        data = json.loads(response.content)

        self.assertEqual(response.status_code, 500)
        self.assertFalse(data["success"])
        self.assertEqual(data["error"], "Groq error")

# =========================================================
#  PATIENT AND XRAY TESTS CHECK
# =========================================================from unittest.mock import patch, MagicMock
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
            name = "Ahmed Test"
            patient_id = "PAT-001"
            age = 30
            birth_date = "1995-01-01"
            phone = "0500000000"
            gender = "male"
            email = "test@test.com"

        return PatientMock()

    def create_xray_mock(self):
        class XRayMock:
            id = 1
            image = type("img", (), {"url": "/media/xrays/test.jpg"})
            created_at = datetime.now()
            analysis_result = None

        return XRayMock()

    @patch("api.views.Patient.objects.get")
    def test_get_patient_success(self, mock_get):
        mock_get.return_value = self.create_patient_mock()

        response = self.client.get(f"/api/patients/{self.patient_id}/")

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["name"], "Ahmed Test")

    @patch("api.views.Patient.objects.get")
    def test_get_patient_not_found(self, mock_get):
        from api.models import Patient

        mock_get.side_effect = Patient.DoesNotExist

        response = self.client.get("/api/patients/9999/")

        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

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

    @patch("api.views.XRay.objects.filter")
    @patch("api.views.Patient.objects.get")
    def test_list_xrays_success(self, mock_get, mock_filter):
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

    def test_list_xrays_missing_patient_id(self):
        response = self.client.get(self.list_url)

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
# =========================================================
#  ANALYZE XRAY VIEW TESTS
# =========================================================
class TestAnalyzeXRayView(APITestCase):

    def setUp(self):
        self.client = APIClient()
        
        # 1. Initialize a Mock User object (No database entry created)
        self.mock_user = MagicMock(spec=User)
        self.mock_user.username = "dr_test"
        self.mock_user.pk = 1
        
        # 2. Force authentication using the mock user
        self.client.force_authenticate(user=self.mock_user)
        
        # URL helper for the analyze endpoint
        self.url = lambda xray_id: f"/api/xrays/{xray_id}/analyze/"

    @patch("api.views.generate_dental_recommendation")
    @patch("api.views.run_full_analysis")
    @patch("os.path.exists")
    @patch("api.views.XRay.objects.select_related")
    def test_success_flow(self, mock_select, mock_exists, mock_run, mock_rec):
        # Setup Mock Patient owned by the mock user
        mock_patient = MagicMock()
        mock_patient.user = self.mock_user

        # Setup Mock Image/File
        mock_image = MagicMock()
        mock_image.path = "/media/xray.png"
        mock_image.url = "http://test/xray.png"

        # Setup Mock XRay object
        mock_xray = MagicMock()
        mock_xray.id = 1
        mock_xray.image = mock_image
        mock_xray.patient = mock_patient
        mock_xray.save = MagicMock()

        # Configure Mock Database Query (select_related().get())
        mock_select.return_value.get.return_value = mock_xray
        
        # Mock File System check
        mock_exists.return_value = True

        # Mock AI Analysis return value
        mock_run.return_value = {
            "report": {"status": "ok"},
            "findings": ["cavity"],
            "impacted_findings": [],
            "lesion_findings": [],
        }

        # Mock Recommendation text
        mock_rec.return_value = "Go to dentist"

        # Execute Request
        response = self.client.post(self.url(1))

        # Assertions
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["xray_id"], 1)
        self.assertIn("recommendation", response.data)
        
        # Verify that the XRay record was updated and saved
        mock_xray.save.assert_called_once()

    @patch("api.views.XRay.objects.select_related")
    def test_xray_not_found(self, mock_select):
        # Simulate XRay record not found in DB
        mock_select.return_value.get.side_effect = XRay.DoesNotExist

        response = self.client.post(self.url(999))

        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

    @patch("api.views.XRay.objects.select_related")
    def test_no_image(self, mock_select):
        # Setup XRay with missing image file relation
        mock_patient = MagicMock()
        mock_patient.user = self.mock_user

        mock_xray = MagicMock()
        mock_xray.image = None
        mock_xray.patient = mock_patient

        mock_select.return_value.get.return_value = mock_xray

        response = self.client.post(self.url(1))

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    @patch("os.path.exists")
    @patch("api.views.XRay.objects.select_related")
    def test_file_not_exists_on_disk(self, mock_select, mock_exists):
        # Setup XRay where DB record exists but physical file is missing
        mock_image = MagicMock()
        mock_image.path = "/fake/path.png"

        mock_patient = MagicMock()
        mock_patient.user = self.mock_user

        mock_xray = MagicMock()
        mock_xray.image = mock_image
        mock_xray.patient = mock_patient

        mock_select.return_value.get.return_value = mock_xray
        
        # Mock File System check to return False
        mock_exists.return_value = False

        response = self.client.post(self.url(1))

        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

# =========================================================
#  GET XRAY ANALYSIS TESTS
# =========================================================
class TestGetXrayAnalysisView(APITestCase):

    def setUp(self):
        self.client = APIClient()
        
        # 1. Initialize a Mock User object (Fast, no database access)
        self.mock_user = MagicMock(spec=User)
        self.mock_user.username = "dr_test2"
        self.mock_user.pk = 1
        
        # 2. Force authentication using the mock user
        self.client.force_authenticate(user=self.mock_user)
        
        # URL helper for the analysis retrieval endpoint
        self.url = lambda xray_id: f"/api/xrays/{xray_id}/analysis/"

    @patch("api.views.XRay.objects.select_related")
    def test_success(self, mock_select):
        # Setup Mock Patient owned by the mock user
        mock_patient = MagicMock()
        mock_patient.user = self.mock_user

        # Setup Mock XRay object with analysis data
        mock_xray = MagicMock()
        mock_xray.patient = mock_patient
        mock_xray.analysis_result = {
            "xray_id": 1,
            "findings": ["cavity"],
        }
        mock_xray.doctor_notes = "note"
        mock_xray.edited_report = "edited"

        # Configure Mock Database Query
        mock_select.return_value.get.return_value = mock_xray

        response = self.client.get(self.url(1))

        # Assertions
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["findings"], ["cavity"])
        self.assertEqual(response.data["doctor_notes"], "note")

    @patch("api.views.XRay.objects.select_related")
    def test_not_found(self, mock_select):
        # Simulate XRay record not found in DB
        mock_select.return_value.get.side_effect = XRay.DoesNotExist

        response = self.client.get(self.url(999))

        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

    @patch("api.views.XRay.objects.select_related")
    def test_missing_analysis(self, mock_select):
        # Case where XRay exists but has not been analyzed yet
        mock_patient = MagicMock()
        mock_patient.user = self.mock_user

        mock_xray = MagicMock()
        mock_xray.patient = mock_patient
        mock_xray.analysis_result = None

        mock_select.return_value.get.return_value = mock_xray

        response = self.client.get(self.url(1))

        # View returns 404 if analysis_result is missing
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

    def test_unauthorized(self):
        # Explicitly remove authentication
        self.client.force_authenticate(user=None)

        response = self.client.get(self.url(1))

        # Expecting 401 Unauthorized
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

# =========================================================
#  LIST REPORTS TESTS
# =========================================================
class TestListReportsView(APITestCase):

    def setUp(self):
        self.client = APIClient()
        
        # Initialize a Mock User object
        self.mock_user = MagicMock(spec=User)
        self.mock_user.username = "doctor1"
        self.mock_user.pk = 1
        
        # Force authentication
        self.client.force_authenticate(user=self.mock_user)
        self.url = "/api/reports/"

    @patch("api.views.XRay.objects.filter")
    def test_list_reports_success(self, mock_filter):
        # Setup Mock Patient
        mock_patient = MagicMock()
        mock_patient.id = 10
        mock_patient.patient_id = "PAT-001"
        mock_patient.name = "Ahmed"
        mock_patient.age = 30

        # Setup Mock XRay
        mock_xray = MagicMock()
        mock_xray.id = 1
        mock_xray.patient = mock_patient
        mock_xray.created_at.strftime.return_value = "2026-05-05 10:00"
        
        # Data matching your view's logic
        mock_xray.analysis_result = {
            "report": {
                "total_lesions": 2,
                "total_impacted": 1,
                "summary": "Test summary",
                "overall_label": "mild",
            },
            "recommendation": "Visit dentist",
        }

        # Mocking the QuerySet chain: filter().select_related().order_by()
        mock_queryset = MagicMock()
        mock_queryset.select_related.return_value.order_by.return_value = [mock_xray]
        mock_filter.return_value = mock_queryset

        response = self.client.get(self.url)

        # Assertions
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 1)

        report = response.data[0]
        self.assertEqual(report["findings"], 3) # 2 + 1
        self.assertEqual(report["patient_name"], "Ahmed")
        
        # FIXED: Match the actual arguments used in your view
        mock_filter.assert_called_once_with(
            patient__user=self.mock_user,
            analysis_result__isnull=False
        )

    @patch("api.views.XRay.objects.filter")
    def test_list_reports_empty(self, mock_filter):
        mock_queryset = MagicMock()
        mock_queryset.select_related.return_value.order_by.return_value = []
        mock_filter.return_value = mock_queryset

        response = self.client.get(self.url)

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data, [])

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
        
        # 1. Initialize a Mock User object (Fast, no DB)
        self.mock_user = MagicMock(spec=User)
        self.mock_user.username = "doctor1"
        self.mock_user.pk = 1
        
        # 2. Force authentication using the mock user
        self.client.force_authenticate(user=self.mock_user)
        
        # URL helper for the update endpoint
        self.url = lambda xray_id: f"/api/xrays/{xray_id}/update-report/"

    @patch("api.views.XRay.objects.select_related")
    def test_update_report_success(self, mock_select):
        # Setup Mock Patient owned by the mock user
        mock_patient = MagicMock()
        mock_patient.user = self.mock_user

        # Setup Mock XRay object
        mock_xray = MagicMock()
        mock_xray.patient = mock_patient
        mock_xray.doctor_notes = "old note"
        mock_xray.edited_report = "old report"
        mock_xray.save = MagicMock()

        # Configure Mock Database Query to return our mock object
        mock_select.return_value.get.return_value = mock_xray

        data = {
            "doctor_notes": "new note",
            "edited_report": "new report",
        }

        response = self.client.put(self.url(1), data, format="json")

        # Assertions
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["doctor_notes"], "new note")
        self.assertEqual(response.data["edited_report"], "new report")
        
        # Verify the database lookup used the correct security filters
        mock_select.return_value.get.assert_called_once_with(
            id=1,
            patient__user=self.mock_user
        )
        # Verify save was called after updating fields
        mock_xray.save.assert_called_once()

    @patch("api.views.XRay.objects.select_related")
    def test_update_report_not_found(self, mock_select):
        # Simulate record not found or not belonging to this user
        mock_select.return_value.get.side_effect = XRay.DoesNotExist

        data = {"doctor_notes": "note"}
        response = self.client.put(self.url(999), data, format="json")

        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)
        self.assertEqual(response.data["error"], "XRay not found")

    @patch("api.views.XRay.objects.select_related")
    def test_update_only_doctor_notes(self, mock_select):
        mock_patient = MagicMock()
        mock_patient.user = self.mock_user

        mock_xray = MagicMock()
        mock_xray.patient = mock_patient
        mock_xray.doctor_notes = "old"
        mock_xray.edited_report = "old_report"
        mock_xray.save = MagicMock()

        mock_select.return_value.get.return_value = mock_xray

        # Only sending doctor_notes
        data = {"doctor_notes": "updated only notes"}

        response = self.client.put(self.url(1), data, format="json")

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["doctor_notes"], "updated only notes")
        # Ensure edited_report remained unchanged
        self.assertEqual(response.data["edited_report"], "old_report")

    @patch("api.views.XRay.objects.select_related")
    def test_update_only_edited_report(self, mock_select):
        mock_patient = MagicMock()
        mock_patient.user = self.mock_user

        mock_xray = MagicMock()
        mock_xray.patient = mock_patient
        mock_xray.doctor_notes = "old_notes"
        mock_xray.edited_report = "old"
        mock_xray.save = MagicMock()

        mock_select.return_value.get.return_value = mock_xray

        # Only sending edited_report
        data = {"edited_report": "updated report only"}

        response = self.client.put(self.url(1), data, format="json")

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["edited_report"], "updated report only")
        # Ensure doctor_notes remained unchanged
        self.assertEqual(response.data["doctor_notes"], "old_notes")

    def test_update_report_unauthorized(self):
        # Explicitly remove authentication
        self.client.force_authenticate(user=None)

        data = {"doctor_notes": "test"}
        response = self.client.put(self.url(1), data, format="json")

        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)