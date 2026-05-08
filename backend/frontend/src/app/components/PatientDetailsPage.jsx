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

  const [patient, setPatient] = useState(null);
  const [xrays, setXrays] = useState([]);
  const [loading, setLoading] = useState(false);
  const [analyzingXrayId, setAnalyzingXrayId] = useState(null);

  const getToken = () => localStorage.getItem("token");

  const getAuthHeaders = () => ({
    Authorization: `Token ${getToken()}`,
  });

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
      console.error("Error fetching patient:", err);
    }
  };

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

  useEffect(() => {
    fetchPatient();
    fetchXrays();
  }, [patientId]);

  const handleUploadXray = async (file) => {
    const formData = new FormData();
    formData.append("patient_id", patientId);
    formData.append("image", file);

    try {
      const response = await fetch("http://127.0.0.1:8000/api/xrays/upload/", {
        method: "POST",
        headers: getAuthHeaders(),
        body: formData,
      });

      if (!response.ok) {
        console.error("Failed to upload xray:", response.status);
        return;
      }

      await fetchXrays();
    } catch (err) {
      console.error("Error uploading xray:", err);
    }
  };

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
      localStorage.setItem("latestAnalysis", JSON.stringify(analysisData));

      await fetchXrays();
      onAnalyzeXray(xrayId);
    } catch (err) {
      console.error("Error analyzing X-ray:", err);
      alert("Error analyzing X-ray");
    } finally {
      setAnalyzingXrayId(null);
    }
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      month: "long",
      day: "numeric",
      year: "numeric",
    });
  };

  if (!patient) return <div className="loading">Loading...</div>;

  return (
    <div className={`page ${isDarkMode ? "dark" : "light"}`}>
      <div className="container">
        <PatientDetailsHeader
          isDarkMode={isDarkMode}
          patient={patient}
          onBack={onBack}
        />

        <div className="card">
          <XRayGalleryHeader
            isDarkMode={isDarkMode}
            onUpload={handleUploadXray}
          />

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