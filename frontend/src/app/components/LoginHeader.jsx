import { ArrowLeft, Moon, Sun } from 'lucide-react';

/**
 * LoginHeader Component
 * @description Provides the navigation and theme-switching utility for the authentication portal.
 * * @param {Object} props
 * @param {Function} props.onBack - Navigation trigger to return to the landing/hero page.
 * @param {string} props.logo - Source path for the platform's brand identity logo.
 * @param {boolean} props.isDarkMode - Reactive state indicating the current visual theme.
 * @param {Function} props.toggleDarkMode - Controller function to switch between light and dark UI modes.
 * * @returns {JSX.Element} A structured header containing brand assets and accessibility-ready controls.
 */
export const LoginHeader = ({ onBack, logo, isDarkMode, toggleDarkMode }) => (
  <header className="login-header">
    {/* Navigation Controller: Facilitates user exit back to the entry point */}
    <button 
      onClick={onBack} 
      className="back-to-landing" 
      aria-label="Back to landing"
    >
      <ArrowLeft className="w-5 h-5 arrow-icon" />
      <img src={logo} alt="Dentek AI Logo" className="h-12" />
    </button>

    {/* Theme Toggle: Toggles between high-contrast dark and light system modes */}
    <button 
      onClick={toggleDarkMode} 
      className="mode-toggle-btn" 
      aria-label="Toggle Mode"
    >
      {isDarkMode ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
    </button>
  </header>
);