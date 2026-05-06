import { Plus, X } from "lucide-react";
import "../../styles/AddPatientModal.css";

export function AddPatientModal({
  isOpen,
  isDarkMode,
  newPatient,
  setNewPatient,
  onClose,
  onSubmit,
}) {
  if (!isOpen) return null;

  const themeClass = isDarkMode ? "dark" : "light";

  const fields = [
    {
      id: "patient_id",
      label: "Patient ID",
      type: "text",
      placeholder: "Enter patient ID",
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
      placeholder: "",
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
    <div className={`modal-overlay ${themeClass}`} onClick={onClose}>
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

        <form onSubmit={onSubmit}>
          {fields.map((field) => (
            <div key={field.id} className="form-group">
              <label htmlFor={field.id} className={themeClass}>
                {field.label}
              </label>

              <input
                id={field.id}
                type={field.type}
                required
                placeholder={field.placeholder}
                value={newPatient[field.id] || ""}
                pattern={field.id === "phone" ? "05[0-9]{8}" : undefined}
                title={
                  field.id === "phone"
                    ? "Phone number must start with 05 and be 10 digits"
                    : undefined
                }
                onChange={(e) =>
                  setNewPatient({
                    ...newPatient,
                    [field.id]: e.target.value,
                  })
                }
                className={`input-field ${themeClass}`}
              />
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

            <button type="submit" className="btn btn-submit">
              <Plus size={20} />
              Add Patient
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}