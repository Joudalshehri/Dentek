import { useState } from "react";

import { LoginHeader } from "./LoginHeader";
import { InputField } from "./InputField";
import { FormControls } from "./FormControls";
import { ImageSide } from "./ImageSide";
import { Footer } from "./Footer";

import { useDarkMode } from "../contexts/DarkModeContext";

import imageAsset from "@/assets/559b2b6797b2f31d3e60b52cb3f1f2393cf11a4c.png";
import logo from "@/assets/0b7e942602c249fe1ebd2f413e4a81dfd2bc24e8.png";
import "../../styles/LoginPage.css";

/**
 * LoginPage
 *
 * Renders the login form and handles user authentication.
 * The page validates required fields before sending the login request
 * to the Django backend.
 */
export function LoginPage({
  onNavigateToLanding,
  onLoginSuccess,
  onNavigateToForgotPassword,
}) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const [errors, setErrors] = useState({});
  const [serverError, setServerError] = useState("");

  const { isDarkMode, toggleDarkMode } = useDarkMode();

  // Checks whether the username/email and password fields are valid.
  const validateForm = () => {
    const newErrors = {};

    if (!username.trim()) {
      newErrors.username = "Username or email is required.";
    }

    if (!password.trim()) {
      newErrors.password = "Password is required.";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Handles input updates and clears the related validation error.
  const handleUsernameChange = (e) => {
    setUsername(e.target.value);

    if (errors.username) {
      setErrors((prev) => ({ ...prev, username: "" }));
    }

    if (serverError) {
      setServerError("");
    }
  };

  // Handles password updates and clears the related validation error.
  const handlePasswordChange = (e) => {
    setPassword(e.target.value);

    if (errors.password) {
      setErrors((prev) => ({ ...prev, password: "" }));
    }

    if (serverError) {
      setServerError("");
    }
  };

  // Sends login credentials to the backend and stores the returned token.
  const handleSubmit = async (e) => {
    e.preventDefault();

    if (isLoading) return;

    setServerError("");

    if (!validateForm()) return;

    setIsLoading(true);

    try {
      const response = await fetch("http://127.0.0.1:8000/api/login/", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: username.trim(), password }),
      });

      const data = await response.json();

      if (response.ok && data.success) {
        localStorage.setItem("token", data.token);
        localStorage.setItem("username", data.username || username.trim());
        localStorage.setItem("email", data.email || "");

        onLoginSuccess();
        return;
      }

      setServerError(
        data.error || "Invalid username or password. Please try again."
      );
    } catch (error) {
      console.error("Login error:", error);
      setServerError("Server connection failed. Please make sure Django is running.");
    } finally {
      setIsLoading(false);
    }
  };

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
          <div className="form-side">
            <div className="form-header">
              <h1>Welcome back!</h1>
              <p>Please enter your credentials to continue</p>
            </div>

            <form onSubmit={handleSubmit} noValidate>
              <InputField
                label="Username or Email"
                type="text"
                value={username}
                onChange={handleUsernameChange}
                placeholder="Enter your username or email"
                error={errors.username}
              />

              <InputField
                label="Password"
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={handlePasswordChange}
                placeholder="Enter your password"
                isPassword={true}
                showPassword={showPassword}
                togglePassword={() => setShowPassword((prev) => !prev)}
                error={errors.password}
              />

              <FormControls onForgotPassword={onNavigateToForgotPassword} />

              {serverError && (
                <p className="form-error" role="alert">
                  {serverError}
                </p>
              )}

              <button type="submit" disabled={isLoading} className="submit-btn">
                {isLoading ? "Processing..." : "Sign In"}
              </button>

              <div className="form-footer-hint">
                <p>
                  Don&apos;t have an account?{" "}
                  <button type="button" className="contact-link">
                    Contact Administrator
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