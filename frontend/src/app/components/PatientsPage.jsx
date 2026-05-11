import { useEffect, useState } from "react";
import { useDarkMode } from "../contexts/DarkModeContext";
import { CustomHeader } from "./CustomHeader";
import { PatientsSearchBar } from "./PatientsSearchBar";
import { PatientsStats } from "./PatientsStats";
import { PatientsTable } from "./PatientsTable";
import { AddPatientModal } from "./AddPatientModal";
import "../../styles/PageLayout.css";

/**
 * PatientsPage Component
 * 
 * Manages the core patient logic: fetching from API, searching, 
 * and handling the creation of new patient records with validation feedback.
 */
export function PatientsPage({ onSelectPatient }) {
  // --- State Management ---
  const [searchQuery, setSearchQuery] = useState("");
  const [isAddPatientModalOpen, setIsAddPatientModalOpen] = useState(false);
  const [patients, setPatients] = useState([]);
  const [errors, setErrors] = useState({});

  // Form state for creating a new patient
  const [newPatient, setNewPatient] = useState({
    patient_id: "",
    name: "",
    birthDate: "", // Keep as birthDate for frontend consistency
    phone: "",
    email: "",
  });

  const { isDarkMode } = useDarkMode();

  /**
   * Computed property: Filters the patient list based on search input.
   * Matches against Name, Internal ID, or National ID.
   */
  const filteredPatients = patients.filter(
    (patient) =>
      patient.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      patient.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
      patient.patient_id.toLowerCase().includes(searchQuery.toLowerCase())
  );

  /**
   * Fetches all patient records associated with the authenticated user.
   */
  const fetchPatients = async () => {
    try {
      const token = localStorage.getItem("token");
      if (!token) return;

      const response = await fetch("http://127.0.0.1:8000/api/patients/", {
        headers: {
          // Corrected: Using backticks for template literals
          Authorization: `Token ${token}`,
        },
      });

      if (!response.ok) {
        console.error("Fetch failed with status:", response.status);
        return;
      }

      const data = await response.json();

      // Normalize backend data to match table field requirements
      const formatted = (data || []).map((p) => ({
        id: String(p.id ?? ""),
        patient_id: String(p.patient_id ?? ""),
        name: p.name ?? "",
        age: Number(p.age ?? 0),
        phone: p.phone ?? "",
        email: p.email ?? "",
      }));

      setPatients(formatted);
    } catch (err) {
      console.error("Connection error while fetching patients:", err);
    }
  };

  // Initial data load on component mount
  useEffect(() => {
    fetchPatients();
  }, []);

  /**
   * Handles submission of the new patient form.
   * Sends data to the backend and maps field-specific errors if validation fails.
   */
  const handleAddPatient = async (e) => {
    e.preventDefault();

    try {
      setErrors({}); // Reset error state
      const token = localStorage.getItem("token");

      const response = await fetch("http://127.0.0.1:8000/api/patients/create/", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Token ${token}`, // Fixed template literal
        },
        body: JSON.stringify({
          patient_id: newPatient.patient_id,
          name: newPatient.name.trim(),
          birth_date: newPatient.birthDate, // Map frontend 'birthDate' to backend 'birth_date'
          phone: newPatient.phone,
          email: newPatient.email.trim(),
        }),
      });

      const responseData = await response.json().catch(() => null);

      if (!response.ok) {
        if (responseData) {
          // Flatten backend error arrays into single strings for the UI
          const backendErrors = {};
          Object.keys(responseData).forEach((key) => {
            // Note: if backend sends 'birthDate', map it to frontend state name
            const uiKey = key === 'birth_date' ? 'birthDate' : key;
            backendErrors[uiKey] = Array.isArray(responseData[key])
              ? responseData[key][0]
              : responseData[key];
          });
          setErrors(backendErrors);
        } else {
          setErrors({ form: "An unexpected error occurred." });
        }
        return;
      }

      // Success: Refresh list, clear form, and close modal
      await fetchPatients();
      setNewPatient({
        patient_id: "",
        name: "",
        birthDate: "",
        phone: "",
        email: "",
      });
      setIsAddPatientModalOpen(false);

    } catch (error) {
      console.error("Submission error:", error);
      setErrors({ form: "Server is unreachable. Please check your connection." });
    }
  };

  return (
   <div
  className={`page-layout ${
    isDarkMode ? "dark" : "light"
  }`}
>
  <div className="page-content">
        <CustomHeader
          isDarkMode={isDarkMode}
          onBtnClick={() => setIsAddPatientModalOpen(true)}
          showBtn={true}
          btnText="Add Patient"
          title="Patients"
          subtitle="Manage patient records"
        />

        <PatientsSearchBar
          isDarkMode={isDarkMode}
          searchQuery={searchQuery}
          setSearchQuery={setSearchQuery}
          placeholder="Search by patient name or ID..."
        />

        <PatientsStats isDarkMode={isDarkMode} total={patients.length} />

        <PatientsTable
          isDarkMode={isDarkMode}
          patients={filteredPatients}
          onSelectPatient={onSelectPatient}
        />
      </div>

      <AddPatientModal
        isOpen={isAddPatientModalOpen}
        isDarkMode={isDarkMode}
        newPatient={newPatient}
        setNewPatient={setNewPatient}
        errors={errors}
        onClose={() => {
          setErrors({});
          setIsAddPatientModalOpen(false);
        }}
        onSubmit={handleAddPatient}
      />
    </div>
  );
}