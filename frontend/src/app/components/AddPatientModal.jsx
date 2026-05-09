import { Plus, X } from "lucide-react";
import "../../styles/AddPatientModal.css";

/**
 * AddPatientModal Component
 * 
 * A reusable modal dialog for registering new patients.
 * Features: Theme-aware styling, dynamic field rendering, and validation error handling.
 */
export function AddPatientModal({
  isOpen,
  isDarkMode,
  newPatient,
  setNewPatient,
  errors = {},
  onClose,
  onSubmit,
}) {
  // Prevent rendering if the modal is not active
  if (!isOpen) return null;

  const themeClass = isDarkMode ? "dark" : "light";

  // Configuration for form fields to maintain a DRY (Don't Repeat Yourself) structure
  const fields = [
    {
      id: "patient_id",
      label: "National ID",
      type: "text",
      placeholder: "10-digit ID",
    },
    {
      id: "name",
      label: "Full Name",
      type: "text",
      placeholder: "Enter patient name",
    },
    {
      id: "birthDate",
      label: "Date of Birth",
      type: "date",
    },
    {
      id: "phone",
      label: "Phone Number",
      type: "tel",
      placeholder: "05xxxxxxxx",
    },
    {
      id: "email",
      label: "Email Address",
      type: "email",
      placeholder: "example@mail.com",
    },
  ];

  return (
    <div
      className={`modal-overlay ${themeClass}`}
      onClick={onClose} // Closes modal when clicking on the backdrop
    >
      <div
        className={`modal-content ${themeClass}`}
        onClick={(e) => e.stopPropagation()} // Prevents closing when clicking inside the content
      >
        {/* Header Section */}
        <div className="modal-header">
          <h2>Add New Patient</h2>
          <button
            type="button"
            onClick={onClose}
            className={`close-btn ${themeClass}`}
            aria-label="Close modal"
          >
            <X size={20} />
          </button>
        </div>

        {/* Form Section */}
        <form onSubmit={onSubmit} noValidate>
          {/* General Form-level Error Message */}
          {errors.form && (
            <p className="form-error">
              {errors.form}
            </p>
          )}

          {/* Dynamic Input Rendering */}
          {fields.map((field) => (
            <div
              key={field.id}
              className="form-group"
            >
              <label
                htmlFor={field.id}
                className={themeClass}
              >
                {field.label}
              </label>

              <input
                id={field.id}
                type={field.type}
                placeholder={field.placeholder || ""}
                value={String(newPatient[field.id] || "")}
                onChange={(e) =>
                  setNewPatient({
                    ...newPatient,
                    [field.id]: e.target.value,
                  })
                }
                className={`input-field ${themeClass} ${
                  errors[field.id] ? "input-error" : ""
                }`}
              />

              {/* Inline Validation Feedback */}
              {errors[field.id] && (
                <p className="field-error">
                  {errors[field.id]}
                </p>
              )}
            </div>
          ))}

          {/* Action Buttons */}
          <div className="modal-actions">
            <button
              type="button"
              onClick={onClose}
              className={`btn btn-cancel ${themeClass}`}
            >
              Cancel
            </button>

            <button
              type="submit"
              className="btn btn-submit"
            >
              <Plus size={20} />
              Add Patient
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}