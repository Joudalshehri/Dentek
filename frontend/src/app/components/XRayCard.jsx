import React from "react";
import { Sparkles, Loader2, CheckCircle2, Eye } from "lucide-react";
import "../../styles/XRayCard.css";
/**
 * XRayCard Component
 * ------------------
 * A specialized UI component designed to display dental X-ray images.
 */
export function XRayCard({
  isDarkMode,
  xray,
  formatDate,
  onAnalyze,
  isAnalyzing = false,
}) {
  return (
    <div className={`xray-card ${isDarkMode ? "dark" : "light"}`}>
      
      {/* Visual Container: Uses standard img tag with the same CSS classes */}
      <div className="xray-image-container">
        <img
          src={xray.thumbnail}
          alt={xray.type}
          className="xray-image"
          // Ensures the image maintains its aspect ratio as defined in your CSS
          loading="lazy" 
        />
      </div>

      <div className="xray-content">
        <div className="xray-header">
          <h3 className="xray-title">{xray.type}</h3>

          {/* Conditional Rendering: Shows status badge */}
          {xray.hasAnalysis && (
            <span className="xray-badge">
              <CheckCircle2 className="icon-small" />
              Analyzed
            </span>
          )}
        </div>

        <p className="xray-date">{formatDate(xray.date)}</p>

        {/* Action Button: Dynamic state handling */}
        <button
          onClick={() => onAnalyze()}
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