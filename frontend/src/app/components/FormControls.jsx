/**
 * FormControls Component
 * @description Manages auxiliary authentication options, including session persistence 
 * (Remember Me) and account recovery redirection (Forgot Password).
 * * @returns {JSX.Element} A coordinated layout for secondary form actions and user preferences.
 */
export const FormControls = ({ onForgotPassword }) => (
  <div className="form-controls">
    <label className="remember-me">
      <input type="checkbox" />
      <span>Remember me</span>
    </label>

    <button
      type="button"
      className="forgot-password"
      onClick={onForgotPassword}
    >
      Forgot Password?
    </button>
  </div>
);