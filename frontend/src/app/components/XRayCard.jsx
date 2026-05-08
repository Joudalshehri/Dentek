import React from "react";
import { Sparkles, Loader2, CheckCircle2, Eye } from "lucide-react";
import "../../styles/XRayCard.css";

/**
 * XRayCard Component
 * ------------------
 * Displays one dental X-ray image with:
 * - Image preview
 * - X-ray type
 * - Upload date
 * - Analysis status
 * - Analyze / Show Report button
 */
export function XRayCard({
  isDarkMode,
  xray,
  formatDate,
  onAnalyze,
  isAnalyzing = false,
}) {
  // Prevent component crash if xray data is not loaded yet
  if (!xray) return null;

  // Theme mode
  const theme = isDarkMode ? "dark" : "light";

  // Fallback values
  const xrayType = xray.type || "Dental X-Ray";
  const xrayImage = xray.thumbnail || xray.image;
  const xrayDate = xray.date ? formatDate(xray.date) : "No date available";

  return (
    <div className={`xray-card ${theme}`}>
      
      {/* X-Ray Image */}
      <div className="xray-image-container">
        <img
          src={xrayImage}
          alt={xrayType}
          className="xray-image"
          loading="lazy"
        />
      </div>

      <div className="xray-content">
        
        {/* X-Ray Title and Status */}
        <div className="xray-header">
          <h3 className="xray-title">{xrayType}</h3>

          {/* Show badge only if this X-ray has analysis */}
          {xray.hasAnalysis && (
            <span className="xray-badge">
              <CheckCircle2 className="icon-small" />
              Analyzed
            </span>
          )}
        </div>

        {/* X-Ray Date */}
        <p className="xray-date">{xrayDate}</p>

        {/* Action Button */}
        <button
          type="button"
          onClick={onAnalyze}
          disabled={isAnalyzing}
          className={`xray-button ${isAnalyzing ? "disabled" : ""}`}
        >
          {isAnalyzing ? (
            <>
              <Loader2 className="icon spin" />
              <span>Analyzing...</span>
            </>
          ) : xray.hasAnalysis ? (
            <>
              <Eye className="icon" />
              <span>Show Report</span>
            </>
          ) : (
            <>
              <Sparkles className="icon" />
              <span>Analyze with AI</span>
            </>
          )}
        </button>
      </div>
    </div>
  );
}