import React from "react";
import { Plus, Loader2 } from "lucide-react"; 
import "../../styles/PatientsHeader.css"; 

/**
 * CustomHeader Component (Unified & Reusable)
 * Supports dynamic titles, optional action buttons, and loading states.
 */
export function CustomHeader({ 
  isDarkMode, 
  title, 
  subtitle, 
  onBtnClick = () => {}, // Default empty function to satisfy TypeScript
  btnText = "",          // Default empty string to satisfy TypeScript
  showBtn = false, 
  isLoading = false, 
  icon: Icon = Plus      // Default icon is Plus, can be overridden (e.g., Save)
}) {
  const themeClass = isDarkMode ? "dark" : "light";

  return (
    <div className="patients-header-container">
      {/* Text Section */}
      <div className={`header-text-group ${themeClass}`}>
        <h1>{title}</h1>
        <p>{subtitle}</p>
      </div>

      {/* Action Button Section */}
      {showBtn && (
        <button 
          onClick={onBtnClick} 
          className={`add-patient-btn ${themeClass}`} 
          disabled={isLoading}
          aria-label={btnText}
        >
          {isLoading ? (
            <Loader2 className="w-5 h-5 animate-spin" />
          ) : (
            <Icon className="w-5 h-5" />
          )}
          <span>{isLoading ? "Saving..." : btnText}</span>
        </button>
      )}
    </div>
  );
}