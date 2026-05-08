import { useEffect, useState } from "react";
import { useDarkMode } from "../contexts/DarkModeContext";
import { CustomHeader } from "./CustomHeader";
import { PatientsSearchBar } from "./PatientsSearchBar";
import { PatientsStats } from "./PatientsStats";
import { PatientsTable } from "./PatientsTable";
import { AddPatientModal } from "./AddPatientModal";

export function PatientsPage({ onSelectPatient }) {
  const [searchQuery, setSearchQuery] = useState("");
  const [isAddPatientModalOpen, setIsAddPatientModalOpen] = useState(false);
  const [patients, setPatients] = useState([]);
  const [errors, setErrors] = useState({});

  const [newPatient, setNewPatient] = useState({
    patient_id: "",
    name: "",
    birthDate: "",
    phone: "",
    email: "",
  });

  const { isDarkMode } = useDarkMode();

  const filteredPatients = patients.filter((patient) =>
    patient.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    patient.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
    patient.patient_id.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const validatePatient = () => {
    const newErrors = {};

    if (!/^\d{10}$/.test(newPatient.patient_id)) {
      newErrors.patient_id = "National ID must be exactly 10 digits.";
    }

    if (!/^[A-Za-z\u0600-\u06FF\s]+$/.test(newPatient.name.trim())) {
      newErrors.name = "Name must contain letters only.";
    }

    if (!newPatient.birthDate) {
      newErrors.birthDate = "Date of birth is required.";
    } else {
      const birthDate = new Date(newPatient.birthDate);
      const today = new Date();

      if (birthDate > today) {
        newErrors.birthDate = "Birth date cannot be in the future.";
      }
    }

    if (!/^05\d{8}$/.test(newPatient.phone)) {
      newErrors.phone = "Phone number must start with 05 and contain 10 digits.";
    }

    if (!newPatient.email.trim()) {
      newErrors.email = "Email address is required.";
    }

    return newErrors;
  };

  const fetchPatients = async () => {
    try {
      const token = localStorage.getItem("token");

      const response = await fetch("http://127.0.0.1:8000/api/patients/", {
        headers: {
          Authorization: `Token ${token}`,
        },
      });

      if (!response.ok) {
        console.error("Failed to fetch patients:", response.status);
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
      console.error("Error fetching patients:", err);
    }
  };

  useEffect(() => {
    fetchPatients();
  }, []);

  const handleAddPatient = async (e) => {
    e.preventDefault();

    const validationErrors = validatePatient();

    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      return;
    }

    try {
      setErrors({});

      const token = localStorage.getItem("token");

      const response = await fetch("http://127.0.0.1:8000/api/patients/create/", {
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
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => null);
        const backendErrors = {};

        if (errorData?.patient_id) {
          backendErrors.patient_id = Array.isArray(errorData.patient_id)
            ? errorData.patient_id[0]
            : errorData.patient_id;
        }

        if (errorData?.name) {
          backendErrors.name = Array.isArray(errorData.name)
            ? errorData.name[0]
            : errorData.name;
        }

        if (errorData?.birth_date) {
          backendErrors.birthDate = Array.isArray(errorData.birth_date)
            ? errorData.birth_date[0]
            : errorData.birth_date;
        }

        if (errorData?.phone) {
          backendErrors.phone = Array.isArray(errorData.phone)
            ? errorData.phone[0]
            : errorData.phone;
        }

        if (errorData?.email) {
          backendErrors.email = Array.isArray(errorData.email)
            ? errorData.email[0]
            : errorData.email;
        }

        if (Object.keys(backendErrors).length > 0) {
          setErrors(backendErrors);
        } else {
          setErrors({
            form: `Failed to add patient. Status code: ${response.status}`,
          });
        }

        return;
      }

      await fetchPatients();

      setNewPatient({
        patient_id: "",
        name: "",
        birthDate: "",
        phone: "",
        email: "",
      });

      setErrors({});
      setIsAddPatientModalOpen(false);
    } catch (error) {
      console.error("Error adding patient:", error);

      setErrors({
        form: "Server connection failed. Please make sure Django is running.",
      });
    }
  };

  return (
    <div
      className={`min-h-screen p-8 transition-colors duration-300 ${
        isDarkMode ? "bg-[#1a1f2e]" : "bg-[#D5DDDF]"
      }`}
    >
      <div className="max-w-7xl mx-auto space-y-6">
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
        />

        <PatientsStats
          isDarkMode={isDarkMode}
          total={patients.length}
        />

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