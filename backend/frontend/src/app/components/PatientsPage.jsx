import React, { useEffect, useState } from "react";
import { useDarkMode } from "../contexts/DarkModeContext";
import { CustomHeader } from "./CustomHeader";
import { PatientsSearchBar } from "./PatientsSearchBar";
import { PatientsStats } from "./PatientsStats";
import { PatientsTable } from "./PatientsTable";
import { AddPatientModal } from "./AddPatientModal";

import "../../styles/PatientsPage.css";

export function PatientsPage({ onSelectPatient }) {
  const { isDarkMode } = useDarkMode();
  const theme = isDarkMode ? "dark" : "light";

  const [searchQuery, setSearchQuery] = useState("");
  const [isAddPatientModalOpen, setIsAddPatientModalOpen] = useState(false);
  const [patients, setPatients] = useState([]);

  const [newPatient, setNewPatient] = useState({
    patient_id: "",
    name: "",
    birthDate: "",
    phone: "",
    email: "",
  });

  const getAuthHeaders = () => {
    const token = localStorage.getItem("token");

    return {
      "Content-Type": "application/json",
      Authorization: `Token ${token}`,
    };
  };

  const filteredPatients = patients.filter((patient) => {
    const query = searchQuery.toLowerCase();

    return (
      patient.name.toLowerCase().includes(query) ||
      patient.patient_id.toLowerCase().includes(query) ||
      patient.id.toLowerCase().includes(query)
    );
  });

  const fetchPatients = async () => {
    try {
      const token = localStorage.getItem("token");

      if (!token) {
        console.error("No token found. Please login again.");
        return;
      }

      const response = await fetch("http://127.0.0.1:8000/api/patients/", {
        method: "GET",
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
        id: String(p.id),
        patient_id: String(p.patient_id ?? ""),
        name: p.name ?? "",
        age: Number(p.age ?? 0),
        phone: p.phone ?? "",
        email: p.email ?? "",
        birth_date: p.birth_date ?? "",
      }));

      setPatients(formatted);
    } catch (err) {
      console.error("Failed to fetch patients:", err);
    }
  };

  useEffect(() => {
    fetchPatients();
  }, []);

  const handleAddPatient = async (e) => {
    e.preventDefault();

    const token = localStorage.getItem("token");

    if (!token) {
      alert("You are not logged in. Please login again.");
      return;
    }

    try {
      const response = await fetch("http://127.0.0.1:8000/api/patients/create/", {
        method: "POST",
        headers: getAuthHeaders(),
        body: JSON.stringify({
          patient_id: newPatient.patient_id,
          name: newPatient.name,
          birthDate: newPatient.birthDate,
          phone: newPatient.phone,
          email: newPatient.email,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        alert(data.error || "Failed to add patient");
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

      setIsAddPatientModalOpen(false);
    } catch (error) {
      console.error("Error creating patient:", error);
      alert("Server error while adding patient");
    }
  };

  return (
    <div className={"patients-page-container " + theme}>
      <div className="patients-content-wrapper">
        <CustomHeader
          isDarkMode={isDarkMode}
          title="Patients"
          subtitle="Manage and view all patient records"
          showBtn={true}
          btnText="Add Patient"
          onBtnClick={() => setIsAddPatientModalOpen(true)}
        />

        <PatientsSearchBar
          isDarkMode={isDarkMode}
          searchQuery={searchQuery}
          setSearchQuery={setSearchQuery}
          placeholder="Search patients by name or ID..."
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
        onClose={() => setIsAddPatientModalOpen(false)}
        onSubmit={handleAddPatient}
      />
    </div>
  );
}