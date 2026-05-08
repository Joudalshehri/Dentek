import { Plus, X } from "lucide-react";

import "../../styles/AddPatientModal.css";

export function AddPatientModal({
  isOpen,
  isDarkMode,
  newPatient,
  setNewPatient,
  errors = {},
  onClose,
  onSubmit,
}) {
  if (!isOpen) return null;

  const themeClass = isDarkMode ? "dark" : "light";

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
      onClick={onClose}
    >
      <div
        className={`modal-content ${themeClass}`}
        onClick={(e) => e.stopPropagation()}
      >
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

        <form onSubmit={onSubmit} noValidate>
          {errors.form && (
            <p className="form-error">
              {errors.form}
            </p>
          )}

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

              {errors[field.id] && (
                <p className="field-error">
                  {errors[field.id]}
                </p>
              )}
            </div>
          ))}

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