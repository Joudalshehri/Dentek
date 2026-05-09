import { useEffect, useState } from "react";
import { useDarkMode } from "../contexts/DarkModeContext";

import { PatientDetailsHeader } from "./PatientDetailsHeader";
import { XRayGalleryHeader } from "./XRayGalleryHeader";
import { XRayCard } from "./XRayCard";

import "../../styles/PatientDetailsPage.css";

/**
 * PatientDetailsPage Component
 * ----------------------------
 * Manages the display of patient profiles and their associated X-ray records.
 * Features include secure data fetching, file uploads, and AI-driven analysis.
 */
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
  
  /** 
   * Local state to manage inline error messages.
   * This replaces legacy window alerts for a modern UI experience.
   */
  const [errorMessage, setErrorMessage] = useState("");

  // ===== AUTHENTICATION UTILITIES =====
  const getToken = () => localStorage.getItem("token");

  const getAuthHeaders = () => ({
    Authorization: `Token ${getToken()}`,
  });

  // ===== DATA PERSISTENCE: PATIENT DETAILS =====
  const fetchPatient = async () => {
    try {
      setErrorMessage(""); 
      const response = await fetch(
        `http://127.0.0.1:8000/api/patients/${patientId}/`,
        { headers: getAuthHeaders() }
      );

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        setErrorMessage(errorData.error || "Critical error: Unable to retrieve patient profile.");
        return;
      }

      const data = await response.json();

      setPatient({
        id: String(data.id),
        patient_id: data.patient_id,
        name: data.name,
        age: data.age,
        phone: data.phone,
        email: data.email,
      });

      localStorage.setItem("selectedPatientName", data.name);
      localStorage.setItem("selectedPatientAge", String(data.age));

    } catch (err) {
      setErrorMessage("Network anomaly detected. Failed to connect to the server.");
    }
  };

  // ===== DATA PERSISTENCE: X-RAY RECORDS =====
  const fetchXrays = async () => {
    try {
      setLoading(true);
      const response = await fetch(
        `http://127.0.0.1:8000/api/xrays/?patient_id=${patientId}`,
        { headers: getAuthHeaders() }
      );

      if (!response.ok) return;

      const data = await response.json();

      const formatted = data.map((item) => ({
        id: item.id.toString(),
        type: "Panoramic X-Ray",
        date: item.created_at,
        thumbnail: `http://127.0.0.1:8000${item.image_url}`,
        hasAnalysis: item.has_analysis ?? false,
      }));

      setXrays(formatted);

    } catch (err) {
      console.error("X-ray synchronization failed:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPatient();
    fetchXrays();
  }, [patientId]);

  // ===== ACTION HANDLER: FILE UPLOADS =====
  const handleUploadXray = async (file) => {
    setErrorMessage(""); 
    const token = getToken();

    const formData = new FormData();
    formData.append("patient_id", patientId);
    formData.append("image", file);

    try {
      const response = await fetch(
        "http://127.0.0.1:8000/api/xrays/upload/",
        {
          method: "POST",
          headers: { Authorization: `Token ${token}` },
          body: formData,
        }
      );

      const result = await response.json().catch(() => ({}));

      if (!response.ok) {
        setErrorMessage(result.error || "Upload rejected by the server.");
        return;
      }

      await fetchXrays(); 

    } catch (err) {
      setErrorMessage("Communication failure during file transmission.");
    }
  };

  // ===== ACTION HANDLER: AI ANALYSIS =====
  const handleAnalyzeXray = async (xrayId) => {
    try {
      setErrorMessage("");
      setAnalyzingXrayId(xrayId);

      const response = await fetch(
        `http://127.0.0.1:8000/api/xrays/${xrayId}/analyze/`,
        {
          method: "POST",
          headers: getAuthHeaders(),
        }
      );

      const analysisData = await response.json().catch(() => ({}));

      if (!response.ok) {
        setErrorMessage(analysisData.error || "AI Engine failed to process the request.");
        return;
      }

      localStorage.setItem("latestAnalysis", JSON.stringify(analysisData));
      await fetchXrays();
      onAnalyzeXray(xrayId);

    } catch (err) {
      setErrorMessage("Internal error during diagnostic processing.");
    } finally {
      setAnalyzingXrayId(null);
    }
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      month: "long", day: "numeric", year: "numeric",
    });
  };

  if (!patient && !errorMessage) return <div className="loading">Initializing clinical view...</div>;

  return (
    <div className={`page ${isDarkMode ? "dark" : "light"}`}>
      <div className="container">

        {/* Global Patient Overview */}
        <PatientDetailsHeader
          isDarkMode={isDarkMode}
          patient={patient}
          onBack={onBack}
        />

        <div className="card">

          {/* Integrated Gallery Header with Error Passing */}
          <XRayGalleryHeader
            isDarkMode={isDarkMode}
            onUpload={handleUploadXray}
            setErrorMessage={setErrorMessage} 
          />

          {/* INLINE ERROR DISPLAY */}
          {errorMessage && (
            <div style={{
              color: "#ef4444",
              fontSize: "0.85rem",
              marginTop: "-0.75rem",
              marginBottom: "1.25rem",
              fontWeight: "600",
              paddingLeft: "0.5rem"
            }}>
                {errorMessage}
            </div>
          )}

          {/* Dynamic X-Ray Grid Display */}
          {loading ? (
            <div className="loading">Updating diagnostic records...</div>
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