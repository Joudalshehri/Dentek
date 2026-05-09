import { Moon, Sun } from "lucide-react";
import logo from "@/assets/0b7e942602c249fe1ebd2f413e4a81dfd2bc24e8.png";

/**
 * Header
 *
 * Displays the landing page header with the Dentek logo,
 * theme toggle button, and login navigation button.
 */
export const Header = ({ isDarkMode, toggleDarkMode, onNavigateToLogin }) => {
  return (
    <header className="header-section">
      <div className="logo-container">
        <img src={logo} alt="Dentek AI logo" className="logo-img" />
      </div>

      <div className="header-actions">
        <button
          type="button"
          onClick={toggleDarkMode}
          className="theme-toggle-btn"
          aria-label={isDarkMode ? "Switch to light mode" : "Switch to dark mode"}
        >
          {isDarkMode ? (
            <Sun className="icon-small" />
          ) : (
            <Moon className="icon-small" />
          )}
        </button>

        <button
          type="button"
          onClick={onNavigateToLogin}
          className="login-btn"
        >
          Login
        </button>
      </div>
    </header>
  );
};