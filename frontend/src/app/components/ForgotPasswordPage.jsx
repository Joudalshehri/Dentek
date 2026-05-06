import { useState } from "react";

import { LoginHeader } from "./LoginHeader";
import { ImageSide } from "./ImageSide";
import { Footer } from "./Footer";
import { useDarkMode } from "../contexts/DarkModeContext";

import imageAsset from "@/assets/559b2b6797b2f31d3e60b52cb3f1f2393cf11a4c.png";
import logo from "@/assets/0b7e942602c249fe1ebd2f413e4a81dfd2bc24e8.png";
import "../../styles/LoginPage.css";

export function ForgotPasswordPage({ onBackToLogin }) {
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  const { isDarkMode, toggleDarkMode } = useDarkMode();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage("");

    try {
      const response = await fetch(
        "http://127.0.0.1:8000/api/auth/password/reset/",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ email }),
        }
      );

      if (response.ok) {
        setMessage("Password reset link has been sent to your email.");
      } else {
        setMessage("Failed to send reset link. Please try again.");
      }
    } catch (error) {
      setMessage("Server error. Please make sure Django is running.");
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
              <div className="input-group">
                <label>Email Address</label>
                <input
                  type="email"
                  className="input-field"
                  placeholder="Enter your email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>

              {message && (
                <p className="reset-message">
                  {message}
                </p>
              )}

              <button
                type="submit"
                disabled={loading}
                className="submit-btn"
              >
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