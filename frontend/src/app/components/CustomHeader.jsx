import React from "react";
import { Plus, Loader2 } from "lucide-react";

import "../../styles/PatientsHeader.css";

/**
 * Reusable page header component
 *
 * Features:
 * - Dynamic title and subtitle
 * - Optional action button
 * - Loading state support
 * - Customizable icon
 */

export function CustomHeader({
  isDarkMode,
  title,
  subtitle,

  // Button settings
  onBtnClick,
  btnText = "",
  showBtn = false,

  // Loading state
  isLoading = false,

  // Default icon
  icon: Icon = Plus,
}) {

  // Apply current theme class
  const themeClass = isDarkMode ? "dark" : "light";

  return (
    <div className="patients-header-container">

      {/* Header text section */}
      <div className={`header-text-group ${themeClass}`}>
        <h1>{title}</h1>
        <p>{subtitle}</p>
      </div>

      {/* Optional action button */}
      {showBtn && (
        <button
          onClick={onBtnClick}
          className={`add-patient-btn ${themeClass}`}
          disabled={isLoading}
          aria-label={btnText}
        >

          {/* Display loading spinner while processing */}
          {isLoading ? (
            <Loader2 className="w-5 h-5 animate-spin" />
          ) : (
            <Icon className="w-5 h-5" />
          )}

          {/* Button label */}
          <span>
            {isLoading ? "Saving..." : btnText}
          </span>

        </button>
      )}
    </div>
  );
}