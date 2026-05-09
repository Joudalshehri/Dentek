from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response
from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from rest_framework.authtoken.models import Token
from django.contrib.auth.models import User
from .models import Patient, XRay
from .services.ai_pipeline import run_full_analysis
from .services.analysis_result_builder import AnalysisResultBuilder

from django.contrib.auth import authenticate
from django.http import JsonResponse

import json
import os
from groq import Groq
from dotenv import load_dotenv


from django.http import JsonResponse
from groq import Groq
import os

load_dotenv()

GROQ_API_KEY = os.getenv("GROQ_API_KEY")

client = Groq(api_key=GROQ_API_KEY)


def test_groq(request):

    if not GROQ_API_KEY:
        return JsonResponse({
            "success": False,
            "error": "GROQ_API_KEY is missing"
        }, status=500)

    try:
        response = client.chat.completions.create(
            messages=[
                {"role": "user", "content": "Say hello"}
            ],
            model="llama-3.3-70b-versatile",
        )

        return JsonResponse({
            "success": True,
            "response": response.choices[0].message.content
        })

    except AttributeError as e:
        return JsonResponse({
            "success": False,
            "error": f"Invalid response structure: {str(e)}"
        }, status=500)

    except Exception as e:
        return JsonResponse({
            "success": False,
            "error": str(e)
        }, status=500)


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


@api_view(["POST"])
def login_view(request):
    """
    Authenticates the user using either username or email.
    Returns a token if the credentials are valid.
    """
    username_or_email = request.data.get("username", "").strip()
    password = request.data.get("password", "")

    if not username_or_email or not password:
        return Response(
            {
                "success": False,
                "error": "Username/email and password are required",
            },
            status=status.HTTP_400_BAD_REQUEST
        )

    # If the input is an email, find the related user first.
    user_obj = User.objects.filter(email__iexact=username_or_email).first()

    if user_obj:
        username = user_obj.username
    else:
        username = username_or_email

    user = authenticate(request, username=username, password=password)

    if user is not None:
        token, created = Token.objects.get_or_create(user=user)

        return Response({
            "success": True,
            "token": token.key,
            "username": user.username,
            "email": user.email,
        })

    return Response(
        {"success": False, "error": "Invalid credentials"},
        status=status.HTTP_401_UNAUTHORIZED
    )

@api_view(["GET"])
@permission_classes([IsAuthenticated])
def profile_view(request):
    user = request.user

    return Response({
        "username": user.username,
        "email": user.email,
    })

@api_view(["PUT"])
@permission_classes([IsAuthenticated])
def update_profile_view(request):
    user = request.user

    user.username = request.data.get("username", user.username)
    user.email = request.data.get("email", user.email)
    user.save()

    return Response({
        "message": "Updated successfully",
        "username": user.username,
        "email": user.email,
    })


@api_view(["POST"])
@permission_classes([IsAuthenticated])
def create_patient(request):
    data = request.data

    birth_date_value = data.get("birthDate") or data.get("birth_date")
    patient_code = data.get("patient_id")

    if not patient_code:
        return Response({"error": "patient_id is required"}, status=400)

    if Patient.objects.filter(patient_id=patient_code).exists():
        return Response({"patient_id": "Patient ID already exists."}, status=400)

    patient = Patient.objects.create(
        user=request.user,
        patient_id=patient_code,
        name=data.get("name"),
        birth_date=birth_date_value,
        phone=data.get("phone"),
        email=data.get("email"),
    )

    return Response(
        {
            "id": patient.id,
            "patient_id": patient.patient_id,
            "name": patient.name,
        },
        status=status.HTTP_201_CREATED,
    )


# GET: Retrieve all patients for the logged-in user
@api_view(["GET"])
@permission_classes([IsAuthenticated])
def list_patients(request):

    patients = Patient.objects.filter(
        user=request.user
    ).order_by("-id")

    data = []

    for p in patients:
        data.append({
            "id": p.id,
            "patient_id": p.patient_id,
            "name": p.name,
            "age": p.age,
            "birth_date": p.birth_date,
            "phone": p.phone,
            "email": p.email,
        })

    return Response(data)



@api_view(["GET"])
@permission_classes([IsAuthenticated])
def get_patient(request, patient_id):
    """
    Get a specific patient that belongs to the authenticated user.
    """

    try:
        # Get patient by ID and make sure it belongs to the current user
        patient = Patient.objects.get(id=patient_id, user=request.user)

    except Patient.DoesNotExist:
        # Return 404 if patient does not exist or does not belong to user
        return Response({"error": "Patient not found"}, status=404)

    # Return patient details to the frontend
    return Response({
        "id": patient.id,
        "patient_id": patient.patient_id,
        "name": patient.name,
        "age": patient.age,
        "birth_date": patient.birth_date,
        "phone": patient.phone,
        "email": patient.email,
    })


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

    try:
        # Make sure the patient exists and belongs to the current user
        patient = Patient.objects.get(id=patient_id, user=request.user)

    except Patient.DoesNotExist:
        return Response({"error": "Patient not found"}, status=404)

    # Create new X-ray record linked to the patient
    xray = XRay.objects.create(
        patient=patient,
        image=image
    )

    # Return uploaded X-ray information
    return Response(
        {
            "id": xray.id,
            "image_url": xray.image.url,
            "created_at": xray.created_at,
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
        patient = Patient.objects.get(id=patient_id, user=request.user)

    except Patient.DoesNotExist:
        return Response({"error": "Patient not found"}, status=404)

    # Get patient's X-rays, newest first
    xrays = XRay.objects.filter(patient=patient).order_by("-created_at")

    data = []

    # Format X-ray data for frontend
    for x in xrays:
        data.append({
            "id": x.id,
            "image_url": x.image.url,
            "created_at": x.created_at,
            "has_analysis": x.analysis_result is not None,
        })

    return Response(data)


@api_view(["POST"])
@permission_classes([IsAuthenticated])
def analyze_xray_view(request, xray_id):
    """
    Run AI analysis on a selected X-ray image.
    """

    try:
        # Get X-ray and its patient, ensuring ownership by current user
        xray = XRay.objects.select_related("patient").get(
            id=xray_id,
            patient__user=request.user
        )

    except XRay.DoesNotExist:
        return Response({"error": "XRay not found"}, status=404)

    # Validate that the X-ray has an image field
    if not xray.image:
        return Response({"error": "No image found for this XRay"}, status=400)

    # Validate that the image file exists on the server
    if not os.path.exists(xray.image.path):
        return Response({"error": "XRay image file does not exist"}, status=404)

    # Run the full AI analysis pipeline
    result = run_full_analysis(xray.image.path)

    # Extract analysis sections safely
    report = result.get("report", {})
    findings = result.get("findings", [])
    impacted_findings = result.get("impacted_findings", [])
    lesion_findings = result.get("lesion_findings", result.get("findings", []))

    # Generate recommendation based on AI findings
    recommendation = generate_dental_recommendation(
        report=report,
        findings=findings,
        impacted_findings=impacted_findings,
        lesion_findings=lesion_findings,
    )

    # Build final structured analysis result
    xray.analysis_result = (
        AnalysisResultBuilder(xray)
        .add_basic_info()
        .add_report(report)
        .add_findings(findings)
        .add_impacted_findings(impacted_findings)
        .add_lesion_findings(lesion_findings)
        .add_recommendation(recommendation)
        .build()
    )

    # Save analysis result in database
    xray.save()

    # Return final analysis result to frontend
    return Response(xray.analysis_result, status=200)


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def get_xray_analysis(request, xray_id):
    try:
        xray = XRay.objects.select_related("patient").get(
            id=xray_id,
            patient__user=request.user
        )
    except XRay.DoesNotExist:
        return Response({"error": "XRay not found"}, status=404)

    if not xray.analysis_result:
        return Response({"error": "No analysis found for this xray"}, status=404)

    data = xray.analysis_result.copy()

    data["doctor_notes"] = xray.doctor_notes
    data["edited_report"] = xray.edited_report

    return Response(data, status=200)

@api_view(["GET"])
@permission_classes([IsAuthenticated])
def list_reports(request):
    xrays = XRay.objects.filter(
        patient__user=request.user,
        analysis_result__isnull=False
    ).select_related("patient").order_by("-created_at")

    data = []
    for xray in xrays:
        report = xray.analysis_result.get("report", {}) if xray.analysis_result else {}
        recommendation = xray.analysis_result.get("recommendation", {}) if xray.analysis_result else {}

        total_lesions = report.get("total_lesions", 0)
        total_impacted = report.get("total_impacted", 0)

        data.append({
            "id": xray.id,
            "patient_id": xray.patient.id,
            "patient_code": xray.patient.patient_id,
            "patient_name": xray.patient.name,
            "patient_age": xray.patient.age,
            "date": xray.created_at.strftime("%Y-%m-%d %H:%M"),
            "status": "Completed",
            "findings": total_lesions + total_impacted,
            "summary": report.get("summary", ""),
            "overall_label": report.get("overall_label", "normal"),
            "total_lesions": total_lesions,
            "total_impacted": total_impacted,
            "recommendation": recommendation,
        })

    return Response(data)

@api_view(["PUT"])
@permission_classes([IsAuthenticated])
def update_report(request, xray_id):

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
            patient__user=request.user
        )

    except XRay.DoesNotExist:
        return Response(
            {"error": "XRay not found."},
            status=404
        )

    # Get doctor notes from request
    doctor_notes = request.data.get("doctor_notes")

    # Validate doctor_notes existence
    if doctor_notes is None:
        return Response(
            {"error": "Doctor notes are required. Please enter notes before saving."},
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

    # Validate empty notes
    if doctor_notes == "":
        return Response(
            {"error": "Doctor notes cannot be empty."},
            status=400
        )

    # Prevent notes that contain only numbers
    if doctor_notes.isdigit():
        return Response(
            {"error": "Doctor notes cannot contain only numbers. Please write a real note."},
            status=400
        )

    # Update doctor notes
    xray.doctor_notes = doctor_notes

    # Save changes
    xray.save()

    # Return success response
    return Response({
        "message": "Notes updated successfully.",
        "doctor_notes": xray.doctor_notes,
    }, status=200)