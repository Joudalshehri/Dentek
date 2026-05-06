import React from 'react';
import { Moon, Sun } from 'lucide-react';
import logo from '@/assets/0b7e942602c249fe1ebd2f413e4a81dfd2bc24e8.png';

/**
 * Header Component
 * * Provides the main navigation bar, including brand identity, 
 * theme toggling (Light/Dark mode), and authentication entry points.
 * * @param {boolean} isDarkMode - Current theme state.
 * @param {Function} toggleDarkMode - Function to switch between light and dark themes.
 * @param {Function} onNavigateToLogin - Navigation handler for the login route.
 */
export const Header = ({ isDarkMode, toggleDarkMode, onNavigateToLogin }) => {
  return (
    <header className="header-section">
      {/* Brand Identity: Logo Section */}
      <div className="logo-container">
        <img src={logo} alt="Dentek AI Logo" className="logo-img" />
      </div>

      {/* Global Actions: Theme Toggle & Authentication */}
      <div className="header-actions">
        <button
          onClick={toggleDarkMode}
          className="theme-toggle-btn"
          aria-label={isDarkMode ? "Switch to Light Mode" : "Switch to Dark Mode"}
        >
          {/* Conditional rendering of icons based on the active theme */}
          {isDarkMode ? <Sun className="icon-small" /> : <Moon className="icon-small" />}
        </button>

        <button onClick={onNavigateToLogin} className="login-btn">
          Login
        </button>
      </div>
    </header>
  );
};