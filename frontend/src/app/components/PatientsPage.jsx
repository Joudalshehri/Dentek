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
 * Fetches patients from the backend,
 * displays them in the table,
 * and sends new patient data to the backend.
 *
 * Validation is handled by the backend.
 * The frontend only displays backend error messages.
 */
export function PatientsPage({ onSelectPatient }) {
  // =========================
  // State Management
  // =========================

  const [searchQuery, setSearchQuery] = useState("");
  const [isAddPatientModalOpen, setIsAddPatientModalOpen] = useState(false);
  const [patients, setPatients] = useState([]);
  const [errors, setErrors] = useState({});

  // Form state for adding a new patient
  const [newPatient, setNewPatient] = useState({
    patient_id: "",
    name: "",
    birthDate: "",
    phone: "",
    email: "",
  });

  const { isDarkMode } = useDarkMode();

  // =========================
  // Filtered Patients
  // =========================

  const filteredPatients = patients.filter((patient) => {
    const name = patient.name || "";
    const id = patient.id || "";
    const patientId = patient.patient_id || "";

    return (
    name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    id.includes(searchQuery) ||
    patientId.includes(searchQuery));
  });

  // =========================
  // Fetch Patients
  // =========================

  const fetchPatients = async () => {
    try {
      const token = localStorage.getItem("token");

      if (!token) return;

      const response = await fetch("http://127.0.0.1:8000/api/patients/", {
        headers: {
          Authorization: `Token ${token}`,
        },
      });

      if (!response.ok) {
        console.error("Fetch failed with status:", response.status);
        return;
      }

      const data = await response.json();

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

  useEffect(() => {
    fetchPatients();
  }, []);

  // =========================
  // Add Patient
  // =========================

  const handleAddPatient = async (e) => {
    e.preventDefault();

    try {
      setErrors({});

      const token = localStorage.getItem("token");

      const response = await fetch(
        "http://127.0.0.1:8000/api/patients/create/",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Token ${token}`,
          },
          body: JSON.stringify({
            patient_id: newPatient.patient_id,
            name: newPatient.name.trim(),
            birth_date: newPatient.birthDate,
            phone: newPatient.phone,
            email: newPatient.email.trim(),
          }),
        }
      );

      const responseData = await response.json().catch(() => null);

      // If backend returns validation errors
      if (!response.ok) {
        if (responseData) {
          const backendErrors = {};

          Object.keys(responseData).forEach((key) => {
            const uiKey = key === "birth_date" ? "birthDate" : key;

            backendErrors[uiKey] = Array.isArray(responseData[key])
              ? responseData[key][0]
              : responseData[key];
          });

          setErrors(backendErrors);
        } else {
          setErrors({
            form: "An unexpected error occurred.",
          });
        }

        return;
      }

      // Success
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

      setErrors({
        form: "Server is unreachable. Please check your connection.",
      });
    }
  };

  // =========================
  // UI Rendering
  // =========================

  return (
    <div className={`page-layout ${isDarkMode ? "dark" : "light"}`}>
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