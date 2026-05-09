import { Eye, EyeOff } from "lucide-react";

/**
 * InputField
 *
 * Reusable input component for login forms.
 * Supports normal inputs, password visibility toggle, and validation errors.
 */
export const InputField = ({
  label,
  type,
  value,
  onChange,
  placeholder,
  showPassword,
  togglePassword,
  isPassword = false,
  error = "",
}) => {
  const inputId = label.toLowerCase().replace(/\s+/g, "-");
  const errorId = `${inputId}-error`;

  return (
    <div className="input-group">
      <label htmlFor={inputId} className="input-label">
        {label}
      </label>

      <div className={isPassword ? "input-wrapper" : ""}>
        <input
          id={inputId}
          type={type}
          value={value}
          onChange={onChange}
          placeholder={placeholder}
          className={`login-input ${isPassword ? "password-input" : ""} ${
            error ? "input-error" : ""
          }`}
          aria-invalid={error ? "true" : "false"}
          aria-describedby={error ? errorId : undefined}
        />

        {isPassword && (
          <button
            type="button"
            onClick={togglePassword}
            className="eye-button"
            aria-label={showPassword ? "Hide password" : "Show password"}
          >
            {showPassword ? (
              <EyeOff className="w-5 h-5" />
            ) : (
              <Eye className="w-5 h-5" />
            )}
          </button>
        )}
      </div>

      {error && (
        <p id={errorId} className="input-error-message" role="alert">
          {error}
        </p>
      )}
    </div>
  );
};