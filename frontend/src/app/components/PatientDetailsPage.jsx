import { useEffect, useState } from "react";
import { useDarkMode } from "../contexts/DarkModeContext";

import { PatientDetailsHeader } from "./PatientDetailsHeader";
import { XRayGalleryHeader } from "./XRayGalleryHeader";
import { XRayCard } from "./XRayCard";

import "../../styles/PatientDetailsPage.css";

export function PatientDetailsPage({
  patientId,
  onBack,
  onAnalyzeXray,
}) {
  const { isDarkMode } = useDarkMode();

  // ===== STATE MANAGEMENT =====
  const [patient, setPatient] = useState(null);
  const [xrays, setXrays] = useState([]);
  const [loading, setLoading] = useState(false);
  const [analyzingXrayId, setAnalyzingXrayId] = useState(null);

  // ===== AUTH TOKEN =====
  const getToken = () => localStorage.getItem("token");

  const getAuthHeaders = () => ({
    Authorization: `Token ${getToken()}`,
  });

  // ===== FETCH PATIENT DETAILS =====
  const fetchPatient = async () => {
    try {
      const response = await fetch(
        `http://127.0.0.1:8000/api/patients/${patientId}/`,
        {
          headers: getAuthHeaders(),
        }
      );

      if (!response.ok) {
        console.error("Failed to fetch patient:", response.status);
        return;
      }

      const data = await response.json();

      // Normalize patient object
      const formattedPatient = {
        id: String(data.id),
        patient_id: data.patient_id,
        name: data.name,
        age: data.age,
        phone: data.phone,
        email: data.email,
      };

      setPatient(formattedPatient);

      // Store selected patient info locally
      localStorage.setItem("selectedPatientName", data.name);
      localStorage.setItem("selectedPatientAge", String(data.age));

    } catch (err) {
      console.error("Error fetching patient:", err);
    }
  };

  // ===== FETCH XRAYS LIST =====
  const fetchXrays = async () => {
    try {
      setLoading(true);

      const response = await fetch(
        `http://127.0.0.1:8000/api/xrays/?patient_id=${patientId}`,
        {
          headers: getAuthHeaders(),
        }
      );

      if (!response.ok) {
        console.error("Failed to fetch xrays:", response.status);
        return;
      }

      const data = await response.json();

      // Format API response for UI
      const formatted = data.map((item) => ({
        id: item.id.toString(),
        type: "Panoramic X-Ray",
        date: item.created_at,
        thumbnail: `http://127.0.0.1:8000${item.image_url}`,
        hasAnalysis: item.has_analysis ?? false,
      }));

      setXrays(formatted);

    } catch (err) {
      console.error("Error fetching xrays:", err);
    } finally {
      setLoading(false);
    }
  };

  // ===== INITIAL DATA LOAD =====
  useEffect(() => {
    fetchPatient();
    fetchXrays();
  }, [patientId]);

  // ===== UPLOAD XRAY =====
  const handleUploadXray = async (file) => {
    const token = getToken();

    if (!token) {
      console.error("No auth token found");
      return;
    }

    const formData = new FormData();
    formData.append("patient_id", patientId);
    formData.append("image", file);

    try {
      const response = await fetch(
        "http://127.0.0.1:8000/api/xrays/upload/",
        {
          method: "POST",
          headers: {
            Authorization: `Token ${token}`,
          },
          body: formData,
        }
      );

      if (!response.ok) {
        console.error("Failed to upload xray:", response.status);
        return;
      }

      await fetchXrays();

    } catch (err) {
      console.error("Error uploading xray:", err);
    }
  };

  // ===== ANALYZE XRAY =====
  const handleAnalyzeXray = async (xrayId) => {
    try {
      setAnalyzingXrayId(xrayId);

      const response = await fetch(
        `http://127.0.0.1:8000/api/xrays/${xrayId}/analyze/`,
        {
          method: "POST",
          headers: getAuthHeaders(),
        }
      );

      if (!response.ok) {
        console.error("Failed to analyze xray:", response.status);
        alert("Failed to analyze X-ray");
        return;
      }

      const analysisData = await response.json();

      // Save latest analysis for later use
      localStorage.setItem(
        "latestAnalysis",
        JSON.stringify(analysisData)
      );

      await fetchXrays();
      onAnalyzeXray(xrayId);

    } catch (err) {
      console.error("Error analyzing X-ray:", err);
      alert("Error analyzing X-ray");
    } finally {
      setAnalyzingXrayId(null);
    }
  };

  // ===== FORMAT DATE =====
  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      month: "long",
      day: "numeric",
      year: "numeric",
    });
  };

  // ===== LOADING STATE =====
  if (!patient) return <div className="loading">Loading...</div>;

  return (
    <div className={`page ${isDarkMode ? "dark" : "light"}`}>
      <div className="container">

        {/* Patient Header Section */}
        <PatientDetailsHeader
          isDarkMode={isDarkMode}
          patient={patient}
          onBack={onBack}
        />

        <div className="card">

          {/* XRay Upload Header */}
          <XRayGalleryHeader
            isDarkMode={isDarkMode}
            onUpload={handleUploadXray}
          />

          {/* XRay Grid */}
          {loading ? (
            <div className="loading">Loading X-rays...</div>
          ) : (
            <div className="grid">
              {xrays.map((xray) => (
                <XRayCard
                  key={xray.id}
                  isDarkMode={isDarkMode}
                  xray={xray}
                  formatDate={formatDate}
                  onAnalyze={() => handleAnalyzeXray(xray.id)}
                  isAnalyzing={analyzingXrayId === xray.id}
                />
              ))}
            </div>
          )}

        </div>
      </div>
    </div>
  );
}