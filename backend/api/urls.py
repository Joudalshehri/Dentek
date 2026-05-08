from django.urls import path
from .views import (
    create_patient,
    upload_xray,
    list_patients,
    list_xrays,
    get_patient,
    login_view,
    profile_view,
    update_profile_view,
    analyze_xray_view,
    get_xray_analysis,
    list_reports,
    test_groq,
    update_report,
)

urlpatterns = [
    path('test-groq/', test_groq, name="test_groq"),
    path("patients/create/", create_patient, name="create_patient"),
    path("xrays/upload/", upload_xray, name="upload_xray"),
    path("patients/", list_patients, name="list_patients"),
    path("xrays/", list_xrays, name="list_xrays"),
    path("patients/<int:patient_id>/", get_patient, name="get_patient"),
    path("login/", login_view, name="login"),
    path("xrays/<int:xray_id>/analyze/", analyze_xray_view, name="analyze_xray"),
    path("xrays/<int:xray_id>/analysis/", get_xray_analysis, name="get_xray_analysis"),
    path("reports/", list_reports, name="list_reports"),
    path("profile/", profile_view, name="profile"),
path("profile/update/", update_profile_view, name="update_profile"),
    path("xrays/<int:xray_id>/update-report/", update_report, name="update_report"),
]
