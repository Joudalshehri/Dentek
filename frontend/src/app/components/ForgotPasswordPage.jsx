import { useState } from "react";

import { LoginHeader } from "./LoginHeader";
import { InputField } from "./InputField";
import { ImageSide } from "./ImageSide";
import { Footer } from "./Footer";
import { useDarkMode } from "../contexts/DarkModeContext";

import imageAsset from "@/assets/559b2b6797b2f31d3e60b52cb3f1f2393cf11a4c.png";
import logo from "@/assets/0b7e942602c249fe1ebd2f413e4a81dfd2bc24e8.png";
import "../../styles/LoginPage.css";

/**
 * ForgotPasswordPage
 *
 * Allows users to request a password reset link by entering their email.
 * The email is validated before sending the request to the backend.
 */
export function ForgotPasswordPage({ onBackToLogin }) {
  const [email, setEmail] = useState("");
  const [emailError, setEmailError] = useState("");
  const [message, setMessage] = useState("");
  const [messageType, setMessageType] = useState("");
  const [loading, setLoading] = useState(false);

  const { isDarkMode, toggleDarkMode } = useDarkMode();

  // Validates that the email is not empty and follows a valid email format.
  const validateEmail = () => {
    const trimmedEmail = email.trim();

    if (!trimmedEmail) {
      setEmailError("Email is required.");
      return false;
    }

    if (!/\S+@\S+\.\S+/.test(trimmedEmail)) {
      setEmailError("Email must be in this format: example@email.com");
      return false;
    }

    setEmailError("");
    return true;
  };

  // Updates email input and clears old validation/server messages.
  const handleEmailChange = (e) => {
    setEmail(e.target.value);

    if (emailError) {
      setEmailError("");
    }

    if (message) {
      setMessage("");
      setMessageType("");
    }
  };

  // Sends a password reset request to the backend.
  const handleSubmit = async (e) => {
    e.preventDefault();

    if (loading) return;

    setMessage("");
    setMessageType("");

    if (!validateEmail()) return;

    setLoading(true);

    try {
      const response = await fetch(
        "http://127.0.0.1:8000/api/auth/password/reset/",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ email: email.trim() }),
        }
      );

      if (response.ok) {
        setMessage("Password reset link has been sent to your email.");
        setMessageType("success");
      } else {
        setMessage("Failed to send reset link. Please check the email and try again.");
        setMessageType("error");
      }
    } catch (error) {
      console.error("Password reset error:", error);
      setMessage("Server error. Please make sure Django is running.");
      setMessageType("error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={`login-container ${isDarkMode ? "dark" : "light"}`}>
      <div className="deco-circle-1"></div>
      <div className="deco-circle-2"></div>

      <LoginHeader
        onBack={onBackToLogin}
        logo={logo}
        isDarkMode={isDarkMode}
        toggleDarkMode={toggleDarkMode}
      />

      <main className="main-wrapper">
        <div className="login-card">
          <div className="form-side">
            <div className="form-header">
              <h1>Forgot Password?</h1>
              <p>Enter your email and we will send you a reset link</p>
            </div>

            <form onSubmit={handleSubmit} noValidate>
              <InputField
                label="Email Address"
                type="email"
                value={email}
                onChange={handleEmailChange}
                placeholder="Enter your email"
                error={emailError}
              />

              {message && (
                <p
                  className={`reset-message ${
                    messageType === "success" ? "success-message" : "error-message"
                  }`}
                  role="alert"
                >
                  {message}
                </p>
              )}

              <button type="submit" disabled={loading} className="submit-btn">
                {loading ? "Sending..." : "Send Reset Link"}
              </button>

              <div className="form-footer-hint">
                <p>
                  Remember your password?{" "}
                  <button
                    type="button"
                    className="contact-link"
                    onClick={onBackToLogin}
                  >
                    Back to Login
                  </button>
                </p>
              </div>
            </form>
          </div>

          <ImageSide asset={imageAsset} />
        </div>
      </main>

      <Footer />
    </div>
  );
}