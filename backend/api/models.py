from django.db import models
from django.core.validators import RegexValidator
from django.contrib.auth.models import User
from datetime import date

class Patient(models.Model):
    user = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name="patients",
        null=True,
        blank=True
    )

    patient_id = models.CharField(
    max_length=10,
    unique=True
)

    name = models.CharField(max_length=200)
    birth_date = models.DateField(null=True, blank=True)

    phone_regex = RegexValidator(
        regex=r'^05\d{8}$',
        message="رقم الجوال يجب أن يكون 10 أرقام ويبدأ بـ 05"
    )
    phone = models.CharField(validators=[phone_regex], max_length=15)

    email = models.EmailField()
    created_at = models.DateTimeField(auto_now_add=True)

    @property
    def age(self):
        if self.birth_date:
            today = date.today()
            return today.year - self.birth_date.year - (
                (today.month, today.day) < (self.birth_date.month, self.birth_date.day)
            )
        return 0

    def __str__(self):
        return f"{self.name} ({self.patient_id})"

    @property
    def age(self):
        if self.birth_date:
            today = date.today()
            return today.year - self.birth_date.year - (
                (today.month, today.day) < (self.birth_date.month, self.birth_date.day)
            )
        return 0

    def __str__(self):
        return self.name


class XRay(models.Model):
    patient = models.ForeignKey(
        Patient,
        on_delete=models.CASCADE,
        related_name="xrays"
    )

    image = models.ImageField(upload_to="xrays/")
    analysis_result = models.JSONField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    doctor_notes = models.TextField(null=True, blank=True)
    edited_report = models.JSONField(null=True, blank=True)

    def __str__(self):
        return f"XRay for {self.patient.name}"