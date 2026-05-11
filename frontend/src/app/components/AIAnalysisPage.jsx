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
  const { isDarkMode } = useDarkMode();
  const [data, setData] = useState(analysisData);
  const [dbPatientName, setDbPatientName] = useState("");
  const [doctorNotes, setDoctorNotes] = useState("");
  const [isSavingNotes, setIsSavingNotes] = useState(false);

  const imgRef = useRef(null);
  const [notesMessage, setNotesMessage] = useState("");
  const [notesError, setNotesError] = useState(false);
  const [imageSize, setImageSize] = useState({

    naturalWidth: 1,
    naturalHeight: 1,
    displayWidth: 1,
    displayHeight: 1,
  });

  useEffect(() => {
    if (!analysisData) {
      loadAnalysis();
    }
    if (patientId) {
      fetchPatientData();
    }
  }, [analysisData, xrayId, patientId]);

  useEffect(() => {
    if (analysisData) {
      setData(analysisData);
      setDoctorNotes(analysisData.doctor_notes || "");
    }
  }, [analysisData]);

  const loadAnalysis = async () => {
    try {
      const response = await fetch(
        `http://127.0.0.1:8000/api/xrays/${xrayId}/analysis/`,
        {
          headers: {
            Authorization: `Token ${localStorage.getItem("token")}`,
          },
        }
      );

      if (response.ok) {
        const result = await response.json();
        setData(result);
        setDoctorNotes(result.doctor_notes || "");
      } else {
        console.error("Failed to load analysis:", response.status);
      }
    } catch (err) {
      console.error("Error loading analysis:", err);
    }
  };

  const fetchPatientData = async () => {
    try {
      const response = await fetch(`http://127.0.0.1:8000/api/patients/${patientId}/`, {
        headers: {
          Authorization: `Token ${localStorage.getItem("token")}`,
        },
      })

      if (response.ok) {
        const patientData = await response.json();
        setDbPatientName(patientData.name || patientData.full_name || "");
      }
    } catch (err) {
      console.error("Error fetching patient name:", err);
    }
  };
  
  const handleSaveNotes = async () => {
    setIsSavingNotes(true);

    try {
      const response = await fetch(
        `http://127.0.0.1:8000/api/xrays/${xrayId}/update-report/`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Token ${localStorage.getItem("token")}`,
          },
          body: JSON.stringify({
            doctor_notes: doctorNotes,
          }),
        }
      );

      if (response.ok) {
        setNotesMessage("Doctor notes saved successfully");
        setNotesError(false);
      } else {
        setNotesMessage("Doctor notes must contain text only. Numbers are not allowed.");
        setNotesError(true);
      }

    } catch (err) {
      console.error("Error saving notes:", err);

      setNotesMessage("Server error while saving notes");
      setNotesError(true);

    } finally {
      setIsSavingNotes(false);
    }
  };

  const handleDownloadPDF = async () => {

    document.documentElement.classList.add("pdf-mode");

    const element = document.querySelector(".report-card");

    const options = {
      margin: 0,

      filename: `AI_Report_${Date.now()}.pdf`,

      image: {
        type: "jpeg",
        quality: 1,
      },

      html2canvas: {
        scale: 2,
        useCORS: true,
        scrollY: 0,
        backgroundColor: "#ffffff",
      },

      jsPDF: {
        unit: "px",
        format: [element.scrollWidth, element.scrollHeight],
        orientation: "portrait",
      },

      pagebreak: {
        mode: ["avoid-all"],
      },
    };

    try {
      await html2pdf().set(options).from(element).save();
    } finally {
      document.documentElement.classList.remove("pdf-mode");
    }
  };

  const handleImageLoad = (e) => {
    const img = e.target;
    setImageSize({
      naturalWidth: img.naturalWidth || 1,
      naturalHeight: img.naturalHeight || 1,
      displayWidth: img.clientWidth || 1,
      displayHeight: img.clientHeight || 1,
    });
  };

  const scaleX = imageSize.displayWidth / imageSize.naturalWidth;
  const scaleY = imageSize.displayHeight / imageSize.naturalHeight;

  const scaleBBox = (bbox = [0, 0, 0, 0]) => {
    const [x1, y1, x2, y2] = bbox;
    return [x1 * scaleX, y1 * scaleY, x2 * scaleX, y2 * scaleY];
  };

  const scalePolygon = (polygon = []) => {
    return polygon.map(([x, y]) => [x * scaleX, y * scaleY]);
  };

  const getOverallResultText = (report) => {
    const totalLesions = Number(report?.total_lesions || 0);
    const totalImpacted = Number(report?.total_impacted || 0);

    if (totalImpacted > 0 && totalLesions > 0) return "Impacted + Lesion";
    if (totalImpacted > 0) return "Impacted";
    if (totalLesions > 0) return "Periapical lesion";
    return "Normal";
  };

  const getOverallBadgeClass = (report) => {
    const totalLesions = Number(report?.total_lesions || 0);
    const totalImpacted = Number(report?.total_impacted || 0);

    if (totalImpacted > 0 && totalLesions > 0) return "mixed";
    if (totalImpacted > 0) return "impacted";
    if (totalLesions > 0) return "danger";
    return "normal";
  };

  const formatUrgency = (urgency) => {
    if (!urgency) return "Not available";
    return urgency.charAt(0).toUpperCase() + urgency.slice(1);
  };

  const getUrgencyBadgeClass = (urgency) => {
    if (urgency === "high") return "urgency-high";
    if (urgency === "moderate") return "urgency-moderate";
    if (urgency === "low") return "urgency-low";
    return "urgency-unknown";
  };

  if (!data) {
    return (
      <div className={`analysis-container ${isDarkMode ? "dark" : "light"}`}>
        <div className="analysis-content-wrapper">
          <p
            className="loading-text"
            style={{ color: isDarkMode ? "white" : "#1f2937" }}
          >
            Loading analysis...
          </p>
        </div>
      </div>
    );
  }

  const imageUrl = `http://127.0.0.1:8000${data.image_url}`;
  const report = data.report || {};
  const recommendation = data.recommendation || {};

  const lesionFindings = (data.lesion_findings || data.findings || []).filter(
    (f) => f.pred_label === "lesion" || f.classification?.pred_label === "lesion"
  );

  const impactedFindings = data.impacted_findings || [];

  const displayPatientName =
    dbPatientName || initialPatientName || data?.patient_name || "Loading...";

  return (
    <div className={`analysis-container ${isDarkMode ? "dark" : "light"}`}>
      <div className="analysis-content-wrapper">
        <div className="print-hidden">
          <button
            onClick={onBack}
            className={`back-btn ${isDarkMode ? "dark" : "light"} group`}
          >
            <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
            <span>{backText}</span>
          </button>
        </div>

        <div className="report-card">
          <div className="report-header">
            <div>
              <h1 className="brand-title">DENTEK</h1>
              <p className="brand-subtitle">AI-Powered Dental Diagnostics</p>

              <div className="patient-info-block">
                <p className="patient-info-name">
                  Patient Name: <span>{displayPatientName}</span>
                </p>
                <p className="patient-info-id">Patient ID: {patientId}</p>
                <p className="patient-info-id">X-Ray ID: {xrayId}</p>
              </div>
            </div>
          </div>

          <section>
            <h2 className="image-section-title">Radiographic Image</h2>

            <div className="xray-wrapper">
              <img
                ref={imgRef}
                src={imageUrl}
                alt="X-Ray Analysis"
                className="xray-main-img"
                onLoad={handleImageLoad}
              />

              {lesionFindings.map((f, i) => {
                const [x1, y1, x2, y2] = scaleBBox(f.bbox || [0, 0, 0, 0]);

                return (
                  <div
                    key={`lesion-${i}`}
                    className="lesion-box"
                    style={{
                      left: `${x1}px`,
                      top: `${y1}px`,
                      width: `${x2 - x1}px`,
                      height: `${y2 - y1}px`,
                    }}
                  >
                    <div className="lesion-label">Periapical lesion</div>
                  </div>
                );
              })}

              <svg className="overlay-svg">
                {impactedFindings.map((f, i) => {
                  const scaledPolygon = scalePolygon(f.polygon || []);
                  if (!Array.isArray(scaledPolygon) || scaledPolygon.length < 4) {
                    return null;
                  }

                  const points = scaledPolygon.map(([x, y]) => `${x},${y}`).join(" ");

                  const centerX =
                    scaledPolygon.reduce((sum, p) => sum + p[0], 0) / scaledPolygon.length;
                  const centerY =
                    scaledPolygon.reduce((sum, p) => sum + p[1], 0) / scaledPolygon.length;

                  const offsetY = i * 18;

                  return (
                    <g key={`impacted-${i}`}>
                      <polygon
                        points={points}
                        fill="rgba(37, 99, 235, 0.15)"
                        stroke="#2563eb"
                        strokeWidth="3"
                      />
                      <rect
                        x={centerX - 37}
                        y={centerY - 28 - offsetY}
                        width="74"
                        height="22"
                        rx="6"
                        fill="#2563eb"
                      />
                      <text
                        x={centerX - 25}
                        y={centerY - 14 - offsetY}
                        fill="#ffffff"
                        fontSize="12"
                        fontWeight="600"
                      >
                        Impaction
                      </text>
                    </g>
                  );
                })}
              </svg>
            </div>
          </section>

          <section className="summary-section">
            <h2 className="report-text">Summary</h2>

            <div className="legend">
              <div className="legend-item">
                <span className="dot red"></span>
                <span>Periapical lesion</span>
              </div>

              <div className="legend-item">
                <span className="dot blue"></span>
                <span>Impaction</span>
              </div>

              <div className="legend-item">
                <span className="dot green"></span>
                <span>Normal</span>
              </div>
            </div>

            <div className="summary-card">
              <p className="summary-title">
                {report.summary || "No summary available"}
              </p>

              <div className="summary-grid">
                <div className="summary-item">
                  <p className="item-label">Overall result</p>
                  <span
                    className={`status-badge ${getOverallBadgeClass(report)}`}
                  >
                    {getOverallResultText(report)}
                  </span>
                </div>

                <div className="summary-item">
                  <p className="item-label">Total lesions</p>
                  <p className="item-value">{report.total_lesions ?? 0}</p>
                </div>

                <div className="summary-item">
                  <p className="item-label">Total Impaction</p>
                  <p className="item-value">{report.total_impacted ?? 0}</p>
                </div>
              </div>
            </div>
          </section>

          {recommendation && Object.keys(recommendation).length > 0 && (
            <section className="recommendation-section">
              <h2 className="report-text">Recommendation</h2>

              <div className="recommendation-card">
                <div className="recommendation-header">
                  <div className="recommendation-main">
                    <p className="recommendation-summary">
                      {recommendation.summary || "No recommendation summary available"}
                    </p>
                  </div>
                </div>

                <div className="recommendation-body">
                  <div className="recommendation-block">
                    <p className="recommendation-label">Clinical recommendation</p>
                    <p className="recommendation-text">
                      {recommendation.recommendation_text ||
                        "No recommendation text available"}
                    </p>
                  </div>

                  {recommendation.next_steps &&
                    recommendation.next_steps.length > 0 && (
                      <div className="recommendation-block">
                        <p className="recommendation-label">Suggested next steps</p>
                        <ul className="recommendation-list">
                          {recommendation.next_steps.map((step, index) => (
                            <li key={index}>{step}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                </div>
              </div>
            </section>
          )}
          <section className="doctor-notes-section">
            <h2 className="report-text">Doctor Notes</h2>

            <div className="notes-container">
              <textarea
                value={doctorNotes}
                onChange={(e) => setDoctorNotes(e.target.value)}
                placeholder="Write doctor's notes..."
                className="doctor-notes-textarea"
              />

              {notesMessage && (
                <p className={`notes-message ${notesError ? "error" : "success"}`}>
                  {notesMessage}
                </p>
              )}

              <div className="notes-actions print-hidden">
                <button
                  onClick={handleSaveNotes}
                  disabled={isSavingNotes}
                  className="notes-save-btn"
                >
                  {isSavingNotes ? "Saving..." : "Save Notes"}
                </button>
              </div>
            </div>
          </section>

                   <div
            className="print-hidden"
            style={{
              display: "flex",
              justifyContent: "center",
              marginTop: "1.5rem",
            }}
          >
            <button
              onClick={handleDownloadPDF}
              className={`download-btn ${isDarkMode ? "dark" : "light"}`}
            >
              <Download className="w-4 h-4" />
              <span>Download PDF Report</span>
            </button>
          </div>

        </div>
      </div>
    </div>
  );
}