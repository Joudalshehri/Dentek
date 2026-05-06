import React from "react";
import { ArrowLeft, Phone, Mail, User } from "lucide-react";
import "../../styles/PatientDetailsHeader.css";

/**
 * PatientDetailsHeader Component
 * ------------------------------
 * Displays patient overview with refined gray tones.
 * Fragment shorthand <> used for cleaner JSX structure.
 */
export function PatientDetailsHeader({ isDarkMode, patient, onBack }) {
  
  const theme = isDarkMode ? "dark" : "light";

  const avatarInitials = patient.name
    ? patient.name.split(" ").map((n) => n[0]).join("")
    : "P";

  const formattedId = "P" + (patient.id ? patient.id.toString().padStart(3, "0") : "000");

  return (
    <>
      {/* Navigation section */}
      <button onClick={onBack} className={"back-btn " + theme}>
        <ArrowLeft size={20} />
        <span>Back to Patients</span>
      </button>

      {/* Profile Card */}
      <div className={"patient-card " + theme}>
        <div className="patient-flex-container">
          
          <div className="patient-avatar">
            {avatarInitials}
          </div>

          <div className="patient-info-body">
            
            <h1 className={"patient-title " + theme}>
              {patient.name}
            </h1>
            
            <p className={"patient-id-text " + theme}>
              Patient ID: {formattedId}
            </p>

            <div className={"metadata-grid " + theme}>
              
              <div className={"metadata-item " + theme}>
                <User size={16} />
                <span>{patient.age} years {patient.gender}</span>
              </div>

              <div className={"metadata-item " + theme}>
                <Phone size={16} />
                <span>{patient.phone}</span>
              </div>

              <div className={"metadata-item " + theme}>
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