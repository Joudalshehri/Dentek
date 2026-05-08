import React from "react";
import { ArrowLeft, Phone, Mail, User } from "lucide-react";
import "../../styles/PatientDetailsHeader.css";

/**
 * PatientDetailsHeader Component
 * --------------------------------
 * Displays patient profile information:
 * - Patient name
 * - Patient ID
 * - Age
 * - Contact information
 */
export function PatientDetailsHeader({
  isDarkMode,
  patient,
  onBack,
}) {

  /**
   * Prevent component crash while
   * patient data is still loading
   */
  if (!patient) return null;

  // Theme mode (light / dark)
  const theme = isDarkMode ? "dark" : "light";

  /**
   * Generate avatar initials
   * Example:
   * John Doe → JD
   */
  const avatarInitials = patient.name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return (
    <>
      {/* Back Navigation Button */}
      <button
        type="button"
        onClick={onBack}
        className={`back-btn ${theme}`}
      >
        <ArrowLeft size={20} />
        <span>Back to Patients</span>
      </button>

      {/* Patient Profile Card */}
      <div className={`patient-card ${theme}`}>
        <div className="patient-flex-container">

          {/* Avatar Section */}
          <div className="patient-avatar">
            {avatarInitials}
          </div>

          {/* Patient Information */}
          <div className="patient-info-body">

            {/* Patient Name */}
            <h1 className={`patient-title ${theme}`}>
              {patient.name}
            </h1>

            {/* Patient ID */}
            <p className={`patient-id-text ${theme}`}>
              Patient ID: {patient.patient_id}
            </p>

            {/* Patient Metadata */}
            <div className={`metadata-grid ${theme}`}>

              {/* Age */}
              <div className={`metadata-item ${theme}`}>
                <User size={16} />
                <span>
                  {patient.age} years
                </span>
              </div>

              {/* Phone Number */}
              <div className={`metadata-item ${theme}`}>
                <Phone size={16} />
                <span>{patient.phone}</span>
              </div>

              {/* Email Address */}
              <div className={`metadata-item ${theme}`}>
                <Mail size={16} />
                <span>{patient.email}</span>
              </div>

            </div>
          </div>
        </div>
      </div>
    </>
  );
}