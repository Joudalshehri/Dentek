import React, { useEffect, useRef, useState } from "react";
import { ArrowLeft, Download } from "lucide-react";
import { useDarkMode } from "../contexts/DarkModeContext";
import "../../styles/AIAnalysisPage.css";
import html2pdf from "html2pdf.js";

export function AIAnalysisPage({
  xrayId,
  patientId,
  patientName: initialPatientName,
  onBack,
  onEdit,
  analysisData,
  backText = "Back to Reports",
}) {

  // =========================
  // Theme Context
  // =========================

  // Detects whether dark mode is enabled
  const { isDarkMode } = useDarkMode();


  // =========================
  // State Management
  // =========================

  // Stores analysis data returned from backend API
  const [data, setData] = useState(analysisData);

  // Stores patient name fetched from database
  const [dbPatientName, setDbPatientName] = useState("");

  // Stores editable doctor notes
  const [doctorNotes, setDoctorNotes] = useState("");

  // Controls loading state while saving notes
  const [isSavingNotes, setIsSavingNotes] = useState(false);


  // =========================
  // Image References
  // =========================

  // Reference to the displayed x-ray image
  const imgRef = useRef(null);


  // =========================
  // Image Scaling State
  // =========================

  // Stores original and displayed image dimensions
  // Used for scaling AI annotations correctly
  const [imageSize, setImageSize] = useState({
    naturalWidth: 1,
    naturalHeight: 1,
    displayWidth: 1,
    displayHeight: 1,
  });


  // =========================
  // Initial Data Loading
  // =========================

  // Loads analysis and patient data when component mounts
  useEffect(() => {
    if (!analysisData && xrayId) {
      loadAnalysis();
    }

    if (patientId) {
      fetchPatientData();
    }
  }, [analysisData, xrayId, patientId]);


  // =========================
  // Sync Incoming Props
  // =========================

  // Updates local state whenever new analysis data is received
  useEffect(() => {
    if (analysisData) {
      setData(analysisData);
      setDoctorNotes(analysisData.doctor_notes || "");
    }
  }, [analysisData]);


  // =========================
  // API Request - Analysis Data
  // =========================

  // Fetches AI analysis report from backend API
  const loadAnalysis = async () => {

    // Validation: ensure xrayId exists
    if (!xrayId) {
      console.error("X-Ray ID is missing");
      return;
    }

    // Validation: ensure token exists
    const token = localStorage.getItem("token");

    if (!token) {
      console.error("Authentication token is missing");
      return;
    }

    try {
      const response = await fetch(
        `http://127.0.0.1:8000/api/xrays/${xrayId}/analysis/`,
        {
          headers: {
            Authorization: `Token ${token}`,
          },
        }
      );

      if (response.ok) {
        const result = await response.json();

        setData(result);

        // Loads saved doctor notes
        setDoctorNotes(result.doctor_notes || "");

      } else {
        console.error("Failed to load analysis:", response.status);
      }

    } catch (err) {
      console.error("Error loading analysis:", err);
    }
  };


  // =========================
  // API Request - Patient Data
  // =========================

  // Fetches patient information from backend API
  const fetchPatientData = async () => {

    // Validation: ensure patientId exists
    if (!patientId) {
      console.error("Patient ID is missing");
      return;
    }

    // Validation: ensure token exists
    const token = localStorage.getItem("token");

    if (!token) {
      console.error("Authentication token is missing");
      return;
    }

    try {
      const response = await fetch(
        `http://127.0.0.1:8000/api/patients/${patientId}/`,
        {
          headers: {
            Authorization: `Token ${token}`,
          },
        }
      );

      if (response.ok) {
        const patientData = await response.json();

        // Stores patient name from database
        setDbPatientName(
          patientData.name || patientData.full_name || ""
        );

      } else {
        console.error("Failed to fetch patient data");
      }

    } catch (err) {
      console.error("Error fetching patient name:", err);
    }
  };


  // =========================
  // Save Doctor Notes
  // =========================

  // Sends updated doctor notes to backend API
  const handleSaveNotes = async () => {

    // Validation: ensure xrayId exists
    if (!xrayId) {
      alert("X-Ray ID is missing");
      return;
    }

    // Validation: ensure user is authenticated
    const token = localStorage.getItem("token");

    if (!token) {
      alert("You must be logged in");
      return;
    }

    // Validation: prevent empty notes
    if (!doctorNotes.trim()) {
      alert("Doctor notes cannot be empty");
      return;
    }

    setIsSavingNotes(true);

    try {
      const response = await fetch(
        `http://127.0.0.1:8000/api/xrays/${xrayId}/update-report/`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Token ${token}`,
          },
          body: JSON.stringify({
            doctor_notes: doctorNotes.trim(),
          }),
        }
      );

      const result = await response.json();

      if (response.ok) {

        // Success message after saving
        alert(
          result.message ||
          "Doctor notes saved successfully"
        );

      } else {

        // Error message from backend
        alert(
          result.error ||
          "Failed to save doctor notes"
        );
      }

    } catch (err) {

      console.error("Error saving notes:", err);

      alert("Server error while saving notes");

    } finally {

      // Stops loading state
      setIsSavingNotes(false);
    }
  };


  // =========================
  // PDF Generation
  // =========================

  // Generates downloadable PDF report
  const handleDownloadPDF = async () => {

    const element = document.querySelector(".report-card");

    // Validation: ensure report exists
    if (!element) {
      alert("Report content not found");
      return;
    }

    // Adds special styling for PDF export
    document.documentElement.classList.add("pdf-mode");

    const options = {
      margin: 0.4,
      filename: `AI_Report_${Date.now()}.pdf`,
      image: { type: "jpeg", quality: 0.98 },

      html2canvas: {
        scale: 2,
        useCORS: true,
        backgroundColor: "#ffffff",
      },

      jsPDF: {
        unit: "in",
        format: "a4",
        orientation: "portrait",
      },
    };

    try {
      await html2pdf().set(options).from(element).save();

    } finally {

      // Removes temporary PDF mode styling
      document.documentElement.classList.remove("pdf-mode");
    }
  };


  // =========================
  // Image Processing
  // =========================

  // Updates image dimensions after image loads
  const handleImageLoad = (e) => {

    const img = e.target;

    setImageSize({
      naturalWidth: img.naturalWidth || 1,
      naturalHeight: img.naturalHeight || 1,
      displayWidth: img.clientWidth || 1,
      displayHeight: img.clientHeight || 1,
    });
  };


  // Scaling factors used for annotations
  const scaleX =
    imageSize.displayWidth / imageSize.naturalWidth;

  const scaleY =
    imageSize.displayHeight / imageSize.naturalHeight;


  // =========================
  // Bounding Box Scaling
  // =========================

  // Scales lesion bounding boxes to match displayed image
  const scaleBBox = (bbox = [0, 0, 0, 0]) => {

    // Validation: ensure bbox format is valid
    if (!Array.isArray(bbox) || bbox.length !== 4) {
      return [0, 0, 0, 0];
    }

    const [x1, y1, x2, y2] = bbox;

    return [
      x1 * scaleX,
      y1 * scaleY,
      x2 * scaleX,
      y2 * scaleY,
    ];
  };


  // =========================
  // Polygon Scaling
  // =========================

  // Scales impacted tooth polygon coordinates
  const scalePolygon = (polygon = []) => {

    // Validation: ensure polygon is an array
    if (!Array.isArray(polygon)) {
      return [];
    }

    return polygon.map(([x, y]) => [
      x * scaleX,
      y * scaleY,
    ]);
  };


  // =========================
  // Report Status Helpers
  // =========================

  // Determines overall diagnostic result
  const getOverallResultText = (report) => {

    const totalLesions =
      Number(report?.total_lesions || 0);

    const totalImpacted =
      Number(report?.total_impacted || 0);

    if (totalImpacted > 0 && totalLesions > 0)
      return "Impacted + Lesion";

    if (totalImpacted > 0)
      return "Impacted";

    if (totalLesions > 0)
      return "Periapical lesion";

    return "Normal";
  };


  // Returns CSS class for result badge styling
  const getOverallBadgeClass = (report) => {

    const totalLesions =
      Number(report?.total_lesions || 0);

    const totalImpacted =
      Number(report?.total_impacted || 0);

    if (totalImpacted > 0 && totalLesions > 0)
      return "mixed";

    if (totalImpacted > 0)
      return "impacted";

    if (totalLesions > 0)
      return "danger";

    return "normal";
  };


  // Formats urgency text for display
  const formatUrgency = (urgency) => {

    if (!urgency)
      return "Not available";

    return (
      urgency.charAt(0).toUpperCase() +
      urgency.slice(1)
    );
  };


  // Returns CSS class for urgency badge styling
  const getUrgencyBadgeClass = (urgency) => {

    if (urgency === "high")
      return "urgency-high";

    if (urgency === "moderate")
      return "urgency-moderate";

    if (urgency === "low")
      return "urgency-low";

    return "urgency-unknown";
  };


  // =========================
  // Loading State
  // =========================

  // Displays loading screen until analysis data is ready
  if (!data) {
    return (
      <div className={`analysis-container ${isDarkMode ? "dark" : "light"}`}>
        <div className="analysis-content-wrapper">
          <p
            className="loading-text"
            style={{
              color: isDarkMode ? "white" : "#1f2937"
            }}
          >
            Loading analysis...
          </p>
        </div>
      </div>
    );
  }


  // =========================
  // Data Preparation
  // =========================

  // Builds full image URL from backend path
  const imageUrl = data.image_url
    ? `http://127.0.0.1:8000${data.image_url}`
    : "";

  // Extracts report data safely
  const report = data.report || {};

  // Extracts recommendation data safely
  const recommendation = data.recommendation || {};

  // Extracts lesion findings only
  const lesionFindings =
    (data.lesion_findings || data.findings || []).filter(
      (f) =>
        f.pred_label === "lesion" ||
        f.classification?.pred_label === "lesion"
    );

  // Extracts impacted tooth findings
  const impactedFindings =
    data.impacted_findings || [];

  // Determines best available patient name
  const displayPatientName =
    dbPatientName ||
    initialPatientName ||
    data?.patient_name ||
    "Loading...";
}