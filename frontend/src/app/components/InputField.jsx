import { Eye, EyeOff } from 'lucide-react';

/**
 * InputField Component
 * @description A polymorphic input wrapper designed for both standard text and secure password entry.
 * * @param {Object} props
 * @param {string} props.label - Descriptive text for the input's associated label element.
 * @param {string} props.type - The HTML input type (e.g., 'text', 'password').
 * @param {string|number} props.value - The controlled value of the input field.
 * @param {Function} props.onChange - Event handler triggered on input modification.
 * @param {string} props.placeholder - Instructional hint displayed within the field.
 * @param {boolean} [props.isPassword] - Flag to enable password-specific UI enhancements (wrappers & toggles).
 * @param {boolean} [props.showPassword] - Visibility state for sensitive password characters.
 * @param {Function} [props.togglePassword] - Callback to switch between secure and plain-text visibility.
 * * @returns {JSX.Element} An accessible, styled input group with conditional logic for credential handling.
 */
export const InputField = ({ 
  label, 
  type, 
  value, 
  onChange, 
  placeholder, 
  showPassword, 
  togglePassword, 
  isPassword 
}) => (
  <div className="input-group">
    {/* Semantic Label for improved Accessibility and Screen Reader support */}
    <label className="input-label">{label}</label>
    
    {/* Conditional Wrapper: Applied only for password logic to contain secondary actions */}
    <div className={isPassword ? "input-wrapper" : ""}>
      <input
        type={type}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        className={`login-input ${isPassword ? 'password-input' : ''}`}
        required
      />
      
      {/* Visibility Toggle: Interactive utility for masked sensitive data */}
      {isPassword && (
        <button 
          type="button" 
          onClick={togglePassword} 
          className="eye-button" 
          tabIndex="-1" // Excluded from tab flow to prioritize primary input navigation
        >
          {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
        </button>
      )}
    </div>
  </div>
);