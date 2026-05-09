import React from "react";

/**
 * SettingsInput Component
 * A reusable input field with dynamic theme support (Dark/Light modes).
 * * @param {string} label - The text displayed above the input.
 * @param {boolean} isDarkMode - Flag to toggle between dark and light themes.
 * @param {object} props - Additional HTML input attributes (type, value, onChange, etc.).
 */
export const SettingsInput = ({ label, isDarkMode, ...props }) => {
  // Determine the active theme class based on the mode
  const themeClass = isDarkMode ? "dark" : "light";

  return (
    <div className="input-group">
      {/* Label section with conditional styling */}
      <label className={`input-label ${themeClass}`}>
        {label}
      </label>

      {/* Input field that spreads all passed props (...props) 
          allowing for flexible standard input attributes.
      */}
      <input
        className={`custom-input ${themeClass}`}
        {...props}
      />
    </div>
  );
};