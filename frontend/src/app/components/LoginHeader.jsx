import { ArrowLeft, Moon, Sun } from "lucide-react";

/**
 * LoginHeader
 *
 * Displays the authentication page header with back navigation,
 * branding, and theme toggle.
 */
export const LoginHeader = ({ onBack, logo, isDarkMode, toggleDarkMode }) => {
  return (
    <header className="login-header">
      <button
        type="button"
        onClick={onBack}
        className="back-to-landing"
        aria-label="Back to landing page"
      >
        <ArrowLeft className="w-5 h-5 arrow-icon" />
        <img src={logo} alt="Dentek AI logo" className="h-12" />
      </button>

      <button
        type="button"
        onClick={toggleDarkMode}
        className="mode-toggle-btn"
        aria-label={isDarkMode ? "Switch to light mode" : "Switch to dark mode"}
      >
        {isDarkMode ? (
          <Sun className="w-5 h-5" />
        ) : (
          <Moon className="w-5 h-5" />
        )}
      </button>
    </header>
  );
};