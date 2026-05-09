import { useState } from "react";

import { LoginHeader } from "./LoginHeader";
import { InputField } from "./InputField";
import { FormControls } from "./FormControls";
import { ImageSide } from "./ImageSide";
import { Footer } from "./Footer";

import { useDarkMode } from "../contexts/DarkModeContext";

import imageAsset from "@/assets/Tooth.png";
import logo from "@/assets/Logo.png";
import "../../styles/LoginPage.css";

/**
 * LoginPage
 *
 * Renders the login form and handles user authentication.
 * Validation is handled by the Django backend.
 * Frontend only displays server error messages.
 */
export function LoginPage({
  onNavigateToLanding,
  onLoginSuccess,
  onNavigateToForgotPassword,
}) {

  // =========================
  // State Management
  // =========================

  // Stores username or email input
  const [username, setUsername] = useState("");

  // Stores password input
  const [password, setPassword] = useState("");

  // Controls password visibility
  const [showPassword, setShowPassword] = useState(false);

  // Controls loading state during login request
  const [isLoading, setIsLoading] = useState(false);

  // Stores backend error messages
  const [serverError, setServerError] = useState("");

  // Dark mode context
  const { isDarkMode, toggleDarkMode } = useDarkMode();


  // =========================
  // Input Handlers
  // =========================

  // Updates username/email input
  const handleUsernameChange = (e) => {
    setUsername(e.target.value);

    // Clears old server error when user types again
    if (serverError) {
      setServerError("");
    }
  };

  // Updates password input
  const handlePasswordChange = (e) => {
    setPassword(e.target.value);

    // Clears old server error when user types again
    if (serverError) {
      setServerError("");
    }
  };


  // =========================
  // Login Request
  // =========================

  // Sends login request to Django backend
  const handleSubmit = async (e) => {
    e.preventDefault();

    // Prevents duplicate requests
    if (isLoading) return;

    setServerError("");
    setIsLoading(true);

    try {

      // Sends login request to backend API
      const response = await fetch(
        "http://127.0.0.1:8000/api/login/",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },

          body: JSON.stringify({
            username: username.trim(),
            password: password,
          }),
        }
      );

      // Converts response into JSON
      const data = await response.json();

      // Login success
      if (response.ok && data.success) {

        // Stores authentication token
        localStorage.setItem("token", data.token);

        // Stores username
        localStorage.setItem(
          "username",
          data.username || username.trim()
        );

        // Stores email
        localStorage.setItem(
          "email",
          data.email || ""
        );

        // Redirects user after successful login
        onLoginSuccess();

        return;
      }

      // Displays backend error message
      setServerError(
        data.error ||
        "Invalid username or password. Please try again."
      );

    } catch (error) {

      console.error("Login error:", error);

      // Displays server connection error
      setServerError(
        "Server connection failed. Please make sure Django is running."
      );

    } finally {

      // Stops loading state
      setIsLoading(false);
    }
  };


  // =========================
  // UI Rendering
  // =========================

  return (
    <div className={`login-container ${isDarkMode ? "dark" : "light"}`}>
      <div className="deco-circle-1"></div>
      <div className="deco-circle-2"></div>

      <LoginHeader
        onBack={onNavigateToLanding}
        logo={logo}
        isDarkMode={isDarkMode}
        toggleDarkMode={toggleDarkMode}
      />

      <main className="main-wrapper">
        <div className="login-card">
        {/* Left side - Login form */}
          <div className="form-side">

            <div className="form-header">
              <h1>Welcome back!</h1>
              <p>Please enter your credentials to continue</p>
            </div>

            <form onSubmit={handleSubmit} noValidate>

              {/* Username or Email Field */}
              <InputField
                label="Username or Email"
                type="text"
                value={username}
                onChange={handleUsernameChange}
                placeholder="Enter your username or email"
                error=""
              />

              {/* Password Field */}
              <InputField
                label="Password"
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={handlePasswordChange}
                placeholder="Enter your password"
                isPassword={true}
                showPassword={showPassword}
                togglePassword={() =>
                  setShowPassword((prev) => !prev)
                }
                error=""
              />

              {/* Forgot password section */}
              <FormControls
                onForgotPassword={onNavigateToForgotPassword}
              />

              {/* Backend error message */}
              {serverError && (
                <p className="form-error" role="alert">
                  {serverError}
                </p>
              )}

              {/* Submit button */}
              <button
                type="submit"
                disabled={isLoading}
                className="submit-btn"
              >
                {isLoading ? "Processing..." : "Sign In"}
              </button>

              {/* Footer hint */}
              <div className="form-footer-hint">
                <p>
                  Don&apos;t have an account?{" "}

                  <button
                    type="button"
                    className="contact-link"
                  >
                    Contact Administrator
                  </button>

                </p>
              </div>

            </form>
          </div>

          {/* Right side image */}
          <ImageSide asset={imageAsset} />

        </div>
      </main>

      <Footer />
    </div>
  );
}