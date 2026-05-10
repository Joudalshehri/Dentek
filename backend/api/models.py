from django.db import models
from django.contrib.auth.models import User
from django.core.validators import RegexValidator
from datetime import date

class Patient(models.Model):
    """
    Stores patient information. The national_id is unique across the system,
    allowing a single patient record to be shared among different doctors.
    """
    # National ID: exactly 10 digits, unique system-wide
    national_id_validator = RegexValidator(regex=r'^\d{10}$', message="National ID must be 10 digits.")
    national_id = models.CharField(max_length=10, unique=True, validators=[national_id_validator])
    
    full_name = models.CharField(max_length=255)
    
    # Phone number: starts with 05 and followed by 8 digits (total 10)
    phone_validator = RegexValidator(regex=r'^05\d{8}$', message="Phone number must start with '05' and be 10 digits.")
    phone_number = models.CharField(max_length=10, validators=[phone_validator])
    
    email = models.EmailField()
    birth_date = models.DateField()
    
    # Many-to-Many relationship: One patient can see many doctors, 
    # and one doctor can have many patients.
    doctors = models.ManyToManyField(User, through='DoctorPatient', related_name='patients')

    @property
    def age(self):
        """Calculate age dynamically based on birth_date."""
        today = date.today()
        return today.year - self.birth_date.year - (
            (today.month, today.day) < (self.birth_date.month, self.birth_date.day)
        )

    def str(self):
        return f"{self.full_name} ({self.national_id})"

class DoctorPatient(models.Model):
    """
    Intermediate table to link Doctors and Patients.
    Ensures a patient is not added twice to the same doctor.
    """
    doctor = models.ForeignKey(User, on_delete=models.CASCADE)
    patient = models.ForeignKey(Patient, on_delete=models.CASCADE)
    added_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        # Constraint: Prevents the same doctor from adding the same patient twice.
        unique_together = ('doctor', 'patient')

class XRay(models.Model):
    """
    Stores panoramic X-ray images. 
    Even if a patient changes doctors, all X-rays remain linked to the patient record.
    """
    patient = models.ForeignKey(Patient, on_delete=models.CASCADE, related_name='xrays')
    # Track which doctor uploaded this specific X-ray
    doctor = models.ForeignKey(User, on_delete=models.SET_NULL, null=True)
    image = models.ImageField(upload_to='panoramic_xrays/')
    uploaded_at = models.DateTimeField(auto_now_add=True)

    def str(self):
        return f"X-Ray for {self.patient.full_name} - {self.uploaded_at.date()}"

class Report(models.Model):
    """
    Each report is linked to exactly one X-ray image (One-to-One).
    The doctor can review AI results and add their own clinical notes.
    """
    xray = models.OneToOneField(XRay, on_delete=models.CASCADE, related_name='report')
    # Store AI detection results (e.g., YOLO bounding boxes or findings)
    ai_result_data = models.JSONField(help_text="Results coming from the AI model (YOLO).")
    doctor_notes = models.TextField(blank=True, null=True)
    is_confirmed = models.BooleanField(default=False, help_text="Set to True when the doctor approves the report.")
    updated_at = models.DateTimeField(auto_now=True)

    def str(self):
        return f"Report for X-Ray {self.xray.id}"