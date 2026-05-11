from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response
from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from rest_framework.authtoken.models import Token
from django.contrib.auth.models import User
from .models import Patient, XRay, DoctorPatient 
from .services.ai_pipeline import run_full_analysis
from .services.analysis_result_builder import AnalysisResultBuilder
from .models import Patient, XRay, Report
from django.contrib.auth import authenticate
#from django.http import JsonResponse
import os
import re
from datetime import date
from django.utils.dateparse import parse_date

import json
from groq import Groq
from dotenv import load_dotenv



load_dotenv()

GROQ_API_KEY = os.getenv("GROQ_API_KEY")

client = Groq(api_key=GROQ_API_KEY)

# Login Method
@api_view(["POST"])
def login_view(request):
    """
    Authenticates the user using either username or email.
    Returns a token if the credentials are valid.
    """

    username_or_email = request.data.get("username", "").strip()
    password = request.data.get("password", "")

    # Validation: username/email is required
    if not username_or_email:
        return Response(
            {
                "success": False,
                "error": "Please enter your username or email",
            },
            status=status.HTTP_400_BAD_REQUEST
        )

    # Validation: password is required
    if not password:
        return Response(
            {
                "success": False,
                "error": "Please enter your password",
            },
            status=status.HTTP_400_BAD_REQUEST
        )

    # If input is email, get the related username
    user_obj = User.objects.filter(
        email__iexact=username_or_email
    ).first()

    if user_obj:
        username = user_obj.username
    else:
        username = username_or_email
        
    # Django handles authentication automatically
    user = authenticate(
        request,
        username=username,
        password=password
    )

    # Login success
    if user is not None:
        token, created = Token.objects.get_or_create(user=user)

        return Response({
            "success": True,
            "token": token.key,
            "username": user.username,
            "email": user.email,
        })

    # Invalid credentials
    return Response(
        {
            "success": False,
            "error": "Incorrect username/email or password",
        },
        status=status.HTTP_401_UNAUTHORIZED
    )

    
@api_view(["POST"])
@permission_classes([IsAuthenticated])
def create_patient(request):
    """
    Creates a new patient record.
    Performs manual validation and returns field-specific error messages.
    """

    data = request.data
    errors = {}

    # Extract and clean data
    patient_code = (
        data.get("patient_id")
        or data.get("national_id")
        or ""
    ).strip()

    full_name = (
        data.get("name")
        or data.get("full_name")
        or ""
    ).strip()

    birth_date = data.get("birth_date") or data.get("birthDate")

    phone = (
        data.get("phone")
        or data.get("phone_number")
        or ""
    ).strip()

    email = data.get("email", "").strip()

    # 1. National ID Validation
    if not patient_code:
        errors["patient_id"] = "National ID is required."

    elif not re.match(r"^\d{10}$", patient_code):
        errors["patient_id"] = "National ID must be exactly 10 digits."

    elif Patient.objects.filter(
        national_id=patient_code,
        doctors=request.user
    ).exists():
        errors["patient_id"] = "This patient is already in your list."

    # 2. Name Validation
    if not full_name:
        errors["name"] = "Full name is required."

    elif not re.match(r"^[A-Za-z\u0600-\u06FF\s]+$", full_name):
        errors["name"] = "Name must contain letters only."

    # 3. Birth Date Validation
    if not birth_date:
        errors["birthDate"] = "Date of birth is required."

    else:
        parsed_birth_date = parse_date(birth_date)

        if not parsed_birth_date:
            errors["birthDate"] = "Invalid date format."

        elif parsed_birth_date > date.today():
            errors["birthDate"] = "Birth date cannot be in the future."

    # 4. Phone Validation
    if not phone:
        errors["phone"] = "Phone number is required."

    elif not re.match(r"^05\d{8}$", phone):
        errors["phone"] = "Phone must start with 05 and contain 10 digits."

    # 5. Email Validation
    if not email:
        errors["email"] = "Email address is required."

    else:
        email_pattern = r"^[^\s@]+@[^\s@]+\.[^\s@]+$"

        if not re.match(email_pattern, email):
            errors["email"] = "Please enter a valid email address."

    # Return validation errors
    if errors:
        return Response(
            errors,
            status=status.HTTP_400_BAD_REQUEST
        )

    try:
        patient, created = Patient.objects.get_or_create(
            national_id=patient_code,
            defaults={
                "full_name": full_name,
                "phone_number": phone,
                "email": email,
                "birth_date": birth_date,
            }
        )

        DoctorPatient.objects.get_or_create(
            doctor=request.user,
            patient=patient
        )

        return Response(
            {
                "id": patient.id,
                "national_id": patient.national_id,
                "full_name": patient.full_name,
                "patient_id": patient.national_id,
                "name": patient.full_name,
                "message": "Patient registered successfully",
            },
            status=status.HTTP_201_CREATED,
        )

    except Exception as e:
        return Response(
            {"form": f"Internal server error: {str(e)}"},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR,
        )


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def get_patient(request, patient_id):
    """
    Get a specific patient that belongs to the authenticated user.
    """

    try:
        # Get patient by ID and make sure it belongs to the current user
        # Updated: Filter by 'doctors' relationship as defined in the Model
        patient = Patient.objects.get(id=patient_id, doctors=request.user)

    except Patient.DoesNotExist:
        # Return 404 if patient does not exist or does not belong to user
        return Response({"error": "Patient not found"}, status=404)

    # Return patient details to the frontend
    # Updated: Fields matched with Patient Model (national_id, full_name, phone_number)
    return Response({
        "id": patient.id,
        "patient_id": patient.national_id,
        "name": patient.full_name,
        "age": patient.age,
        "birth_date": patient.birth_date,
        "phone": patient.phone_number,
        "email": patient.email,
    })


# GET: Retrieve all patients for the logged-in user
@api_view(["GET"])
@permission_classes([IsAuthenticated])
def list_patients(request):

    patients = Patient.objects.filter(
        doctors=request.user
    ).order_by("-id")
    data = []

    for p in patients:
        # Updated: Fields matched with Patient Model (national_id, full_name, phone_number)
        data.append({
            "id": p.id,
            "patient_id": p.national_id,
            "name": p.full_name,
            "age": p.age,
            "birth_date": p.birth_date,
            "phone": p.phone_number,
            "email": p.email,
        })

    return Response(data)


@api_view(["POST"])
@permission_classes([IsAuthenticated])
def upload_xray(request):
    """
    Upload a new X-ray image for a specific patient.
    """

    # Get patient ID and uploaded image from the request
    patient_id = request.data.get("patient_id")
    image = request.FILES.get("image")

    # Validate that patient_id is provided
    if not patient_id:
        return Response({"error": "patient_id is required"}, status=400)

    # Validate that image file is provided
    if not image:
        return Response({"error": "image is required"}, status=400)

    # --- Start Image Extension Validation ---
    # Define allowed extensions
    allowed_extensions = ['.png', '.jpg', '.jpeg', '.webp']
    extension = os.path.splitext(image.name)[1].lower()

    if extension not in allowed_extensions:
        return Response(
            {"error": "Invalid file type. Only PNG, JPG, and JPEG are allowed."}, 
            status=400
        )
    
    # Extra check for content type to ensure it's actually an image
    if not image.content_type.startswith('image/'):
        return Response({"error": "File must be a valid image."}, status=400)
    # --- End Image Extension Validation ---

    try:
        # Make sure the patient exists and belongs to the current user
        # Updated: Using 'doctors' instead of 'user'
        patient = Patient.objects.get(id=patient_id, doctors=request.user)

    except Patient.DoesNotExist:
        return Response({"error": "Patient not found"}, status=404)

    # Create new X-ray record linked to the patient
    # Updated: Added 'doctor' field to track who uploaded it as per your model
    xray = XRay.objects.create(
        patient=patient,
        doctor=request.user,
        image=image
    )

    # Return uploaded X-ray information
    # Updated: Using 'uploaded_at' to match XRay model
    return Response(
        {
            "id": xray.id,
            "image_url": xray.image.url,
            "created_at": xray.uploaded_at,
            "has_analysis": False,
        },
        status=status.HTTP_201_CREATED,
    )


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def list_xrays(request):
    """
    List all X-rays for a specific patient.
    """

    # Get patient ID from query parameters
    patient_id = request.GET.get("patient_id")

    # Validate that patient_id is provided
    if not patient_id:
        return Response({"error": "patient_id is required"}, status=400)

    try:
        # Make sure the patient belongs to the authenticated user
        # Updated: Using 'doctors' instead of 'user'
        patient = Patient.objects.get(id=patient_id, doctors=request.user)

    except Patient.DoesNotExist:
        return Response({"error": "Patient not found"}, status=404)

    # Get patient's X-rays, newest first
    # Updated: Using 'uploaded_at' to match XRay model
    xrays = XRay.objects.filter(patient=patient).order_by("-uploaded_at")

    data = []

    # Format X-ray data for frontend
    for x in xrays:
        # Updated: Using 'uploaded_at' and checking for 'report' relation
        data.append({
            "id": x.id,
            "image_url": x.image.url,
            "created_at": x.uploaded_at,
            "has_analysis": hasattr(x, 'report'),
        })

    return Response(data)



@api_view(["POST"])
@permission_classes([IsAuthenticated])
def analyze_xray_view(request, xray_id):
    """
    Run AI analysis on a selected X-ray image.
    """

    try:
        xray = XRay.objects.select_related("patient").get(
            id=xray_id,
            patient__doctors=request.user
        )

    except XRay.DoesNotExist:
        return Response({"error": "XRay not found"}, status=404)

    if not xray.image:
        return Response({"error": "No image found for this XRay"}, status=400)

    if not os.path.exists(xray.image.path):
        return Response({"error": "XRay image file does not exist"}, status=404)

    result = run_full_analysis(xray.image.path)

    report_data = result.get("report", {})
    findings = result.get("findings", [])
    impacted_findings = result.get("impacted_findings", [])
    lesion_findings = result.get("lesion_findings", result.get("findings", []))

    recommendation = generate_dental_recommendation(
        report=report_data,
        findings=findings,
        impacted_findings=impacted_findings,
        lesion_findings=lesion_findings,
    )

    # Build final structured analysis result using AnalysisResultBuilder
    full_ai_data = (
        AnalysisResultBuilder(xray)
        .add_basic_info()
        .add_report(report_data)
        .add_findings(findings)
        .add_impacted_findings(impacted_findings)
        .add_lesion_findings(lesion_findings)
        .add_recommendation(recommendation)
        .build()
    )

    # This is needed so frontend can display the X-ray image
    full_ai_data["image_url"] = xray.image.url if xray.image else ""

    # Optional: also save result inside XRay model if you still use analysis_result field
    xray.analysis_result = full_ai_data
    xray.save()

    # Save analysis result in Report model
    report_obj, created = Report.objects.update_or_create(
        xray=xray,
        defaults={
            "ai_result_data": full_ai_data,
            "is_confirmed": False
        }
    )

    return Response(report_obj.ai_result_data, status=status.HTTP_200_OK)

# ------------------------------
@api_view(["GET"])
@permission_classes([IsAuthenticated])
def get_xray_analysis(request, xray_id):
    """
    Retrieve the AI analysis and doctor notes for a specific X-ray.
    """
    try:
        # Securely fetch record ensuring ownership via patient-doctors relationship
        # Updated: Using 'patient__doctors' to match your ManyToMany model
        xray = XRay.objects.select_related("patient").get(
            id=xray_id,
            patient__doctors=request.user
        )
    except XRay.DoesNotExist:
        # Handle record absence or unauthorized access attempts
        return Response({"error": "XRay not found"}, status=404)

    # Verify that the diagnostic analysis data is available via the Report model
    # Updated: Checking for the related 'report' object as defined in your Report model
    if not hasattr(xray, 'report'):
        return Response({"error": "No analysis found for this xray"}, status=404)

    # Access the report object
    report = xray.report

    # Merge automated analysis results with clinical annotations
    # Updated: Using 'ai_result_data' and 'doctor_notes' from the Report model
    data = report.ai_result_data.copy() if report.ai_result_data else {}
    data["doctor_notes"] = report.doctor_notes
    data["is_confirmed"] = report.is_confirmed
    data["updated_at"] = report.updated_at


    return Response(data, status=200)

def make_json_safe(obj):
    try:
       import numpy as np 
    except ImportError:
        np = None

    if isinstance(obj, dict):
        return {str(k): make_json_safe(v) for k, v in obj.items()}

    if isinstance(obj, list):
        return [make_json_safe(v) for v in obj]

    if isinstance(obj, tuple):
        return [make_json_safe(v) for v in obj]

    if np is not None:
        if isinstance(obj, np.integer):
            return int(obj)
        if isinstance(obj, np.floating):
            return float(obj)
        if isinstance(obj, np.ndarray):
            return obj.tolist()
        if isinstance(obj, np.bool_):
            return bool(obj)

    if hasattr(obj, "item") and callable(getattr(obj, "item")):
        try:
            return obj.item()
        except Exception:
            pass

    return obj


def clean_json_text(text):
    if not isinstance(text, str):
        return text

    text = text.strip()

    # إزالة ```json أو ```JSON أو ```json\n
    if text.lower().startswith("```json"):
        text = text[7:].strip()
    elif text.startswith("```"):
        text = text[3:].strip()

    # إزالة أي كلمة json في البداية (حتى لو لحالها أو مع newline)
    if text.lower().startswith("json"):
        text = text[4:].strip()

    # إزالة ``` في النهاية
    if text.endswith("```"):
        text = text[:-3].strip()

    return text

def generate_dental_recommendation(report, findings, impacted_findings, lesion_findings):
    try:
        safe_report = make_json_safe(report)
        safe_findings = make_json_safe(findings)
        safe_impacted_findings = make_json_safe(impacted_findings)
        safe_lesion_findings = make_json_safe(lesion_findings)

        compact_report = {
            "summary": safe_report.get("summary", ""),
            "overall_label": safe_report.get("overall_label", "normal"),
            "total_lesions": safe_report.get("total_lesions", 0),
            "total_impacted": safe_report.get("total_impacted", 0),
        }

        compact_impacted = []
        for item in safe_impacted_findings[:3]:
            compact_impacted.append({
                "label": item.get("label", "impacted"),
                "confidence": item.get("confidence", None),
            })

        compact_lesions = []
        for item in safe_lesion_findings[:3]:
            compact_lesions.append({
                "label": item.get("pred_label") or item.get("label", "lesion"),
                "confidence": item.get("confidence", None),
            })

        compact_findings_count = len(safe_findings)

        prompt = f"""
You are a dental AI assistant.
Always use the term "Impaction" instead of "Impacted".

Based on this panoramic X-ray analysis summary, provide a short and safe recommendation for the dentist.
Do not provide a final diagnosis or a definitive treatment plan.
Keep the answer concise and practical.

Analysis summary:
- Overall label: {compact_report["overall_label"]}
- Report summary: {compact_report["summary"]}
- Total lesions: {compact_report["total_lesions"]}
- Total impacted teeth: {compact_report["total_impacted"]}
- Total findings count: {compact_findings_count}

Top impacted findings:
{json.dumps(compact_impacted, ensure_ascii=False)}

Top lesion findings:
{json.dumps(compact_lesions, ensure_ascii=False)}

Return JSON only in this exact format:
{{
  "summary": "...",
  "urgency": "low/moderate/high",
  "recommendation_text": "...",
  "next_steps": ["...", "..."]
}}
"""

        response = client.chat.completions.create(
            messages=[
                {
                    "role": "system",
                    "content": (
                        "You are a dental AI assistant that provides preliminary "
                        "clinical recommendations based on panoramic X-ray findings."
                    ),
                },
                {"role": "user", "content": prompt},
            ],
            model="llama-3.3-70b-versatile",
            temperature=0.2,
        )

        content = clean_json_text(response.choices[0].message.content)
        print("Groq raw response:", content)

        try:
            parsed = json.loads(content)
            return {
                "summary": parsed.get("summary", "No summary available."),
                "urgency": parsed.get("urgency", "unknown"),
                "recommendation_text": parsed.get("recommendation_text", "No recommendation available."),
                "next_steps": parsed.get("next_steps", []),
            }
        except json.JSONDecodeError:
            return {
                "summary": "AI recommendation generated as plain text.",
                "urgency": "moderate",
                "recommendation_text": content,
                "next_steps": [],
            }

    except Exception as e:
        print("Recommendation generation error:", str(e))
        return {
            "summary": "Recommendation could not be generated.",
            "urgency": "unknown",
            "recommendation_text": "No recommendation available.",
            "next_steps": [],
            "error": str(e),
        }


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def list_reports(request):
    """
    List all reports for a specific patient.
    """
    # Updated: Filter by patient__doctors and check for existing report relationship
    # Using uploaded_at instead of created_at
    xrays = XRay.objects.filter(
        patient__doctors=request.user,
        report__isnull=False
    ).select_related("patient", "report").order_by("-uploaded_at")

    data = []
    for xray in xrays:
        # Access data from the related Report model
        report_obj = xray.report
        ai_data = report_obj.ai_result_data or {}
        
        report_content = ai_data.get("report", {})
        recommendation = ai_data.get("recommendation", {})

        total_lesions = report_content.get("total_lesions", 0)
        total_impacted = report_content.get("total_impacted", 0)

        data.append({
            "id": xray.id,
            "patient_id": xray.patient.id,
            "patient_code": xray.patient.national_id, # Updated field name
            "patient_name": xray.patient.full_name,   # Updated field name
            "patient_age": xray.patient.age,
            "date": xray.uploaded_at.strftime("%Y-%m-%d %H:%M"), # Updated field name
            "status": "Confirmed" if report_obj.is_confirmed else "Pending",
            "findings": total_lesions + total_impacted,
            "summary": report_content.get("summary", ""),
            "overall_label": report_content.get("overall_label", "normal"),
            "total_lesions": total_lesions,
            "total_impacted": total_impacted,
            "recommendation": recommendation,
        })

    return Response(data)

@api_view(["PUT"])
@permission_classes([IsAuthenticated])
def update_report(request, xray_id):
    """
    Update doctor notes for a specific report.
    """

    # Validate xray_id
    if not isinstance(xray_id, int) or xray_id <= 0:
        return Response(
            {"error": "Invalid XRay ID."},
            status=400
        )

    # Get the X-ray and make sure it belongs to the logged-in user
    try:
        xray = XRay.objects.select_related("patient").get(
            id=xray_id,
            patient__doctors=request.user
        )

    except XRay.DoesNotExist:
        return Response(
            {"error": "XRay not found."},
            status=404
        )

    # Check if a report exists for this X-ray
    if not hasattr(xray, "report"):
        return Response(
            {"error": "No report exists for this XRay to update."},
            status=404
        )

    # Get doctor notes from request
    doctor_notes = request.data.get("doctor_notes")

    # Validate doctor_notes existence
    if doctor_notes is None:
        return Response(
            {"error": "Doctor notes are required."},
            status=400
        )

    # Validate doctor_notes type
    if not isinstance(doctor_notes, str):
        return Response(
            {"error": "Doctor notes must be text."},
            status=400
        )

    # Remove spaces from beginning and end
    doctor_notes = doctor_notes.strip()

   # Allow empty notes but show a warning message
    if doctor_notes == "":
    
      report = xray.report
      report.doctor_notes = ""
      report.is_confirmed = True
      report.save()

      return Response({
        "message": "Report saved without doctor notes.",
        "doctor_notes": report.doctor_notes,
        "warning": True
     }, status=200)

    # Validate numeric-only notes
    elif doctor_notes.isdigit():
        return Response(
            {"error": "Doctor notes cannot contain only numbers."},
            status=400
        )

    # Update report
    report = xray.report
    report.doctor_notes = doctor_notes
    report.is_confirmed = True
    report.save()

    # Success response
    return Response({
        "message": "Notes updated successfully.",
        "doctor_notes": report.doctor_notes,
    }, status=200)

@api_view(["GET"])
@permission_classes([IsAuthenticated])
def profile_view(request):
    user = request.user

    """
    Fetch the profile details of the currently logged-in user.
    Access restricted to authenticated users only.
    """

    return Response({
        "username": user.username,
        "email": user.email,
    })

@api_view(["PUT"])
@permission_classes([IsAuthenticated])
def update_profile_view(request):
    """
    Update user profile with manual validation logic.
    Ensures data integrity by checking constraints before persistence.
    """
    user = request.user
    data = request.data
    errors = {}

    # Extract and sanitize input data (Strip whitespace)
    username = data.get("username", user.username).strip()
    email = data.get("email", user.email).strip()

    # --- Username Validation ---
    # Ensure the username is not empty or composed solely of whitespace
    if not username:
        errors["username"] = "Username is required"

    # --- Email Validation (Mirrors Frontend Logic) ---
    if not email:
        errors["email"] = "Email address is required"
    else:
        # Check for basic structure: existence of '@' and '.'
        if "@" not in email or "." not in email:
            errors["email"] = "Please enter a complete email (e.g., example@domain.com)"
        
        # Ensure the last dot occurs after the '@' symbol
        elif email.rfind(".") < email.find("@"):
            errors["email"] = "Invalid email structure"
            
        # Regex check for standard email format validation
        elif not re.match(r"^[^\s@]+@[^\s@]+\.[^\s@]+$", email):
            errors["email"] = "Email domain is incomplete or invalid"

    # --- Response Handling ---
    # If validation dictionary is not empty, return a 400 Bad Request
    if errors:
        return Response(errors, status=status.HTTP_400_BAD_REQUEST)

    try:
        # Update user instance and commit changes to the database
        user.username = username
        user.email = email
        user.save()
        
        return Response({
            "message": "Updated successfully",
            "username": user.username,
            "email": user.email,
        }, status=status.HTTP_200_OK)
        
    except Exception as e:
        # Handle unexpected database or server-side errors
        return Response(
            {"detail": "A server error occurred during update."}, 
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )