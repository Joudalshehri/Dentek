import { useState } from "react";
import { Save, AlertCircle, CheckCircle } from "lucide-react";
import { useDarkMode } from "../contexts/DarkModeContext";
import { AvatarSection } from "./AvatarSection";
import { SettingsInput } from "./SettingsInput";
import { CustomHeader } from "./CustomHeader";
import "../../styles/SettingsPage.css";

export function SettingsPage({ profile, setProfile }) {

  // Get dark mode state from context
  const { isDarkMode } = useDarkMode();

  // Apply theme class dynamically
  const themeClass = isDarkMode ? "dark" : "light";

  // Loading state while saving profile
  const [isSaving, setIsSaving] = useState(false);

  // Validation error states
  const [userNameError, setUserNameError] = useState("");
  const [emailError, setEmailError] = useState("");

  // Success message state
  const [successMessage, setSuccessMessage] = useState("");

  /**
   * Generate authentication headers
   * using the stored token
   */
  const getAuthHeaders = () => ({
    "Content-Type": "application/json",
    Authorization: `Token ${localStorage.getItem("token")}`,
  });

  /**
   * Handle input value changes
   */
  const handleInputChange = (field, value) => {
    setProfile((prev) => ({
      ...prev,
      [field]: value,
    }));

    // Remove success message after editing
    setSuccessMessage("");
  };

  /**
   * Validate profile data
   * and send update request
   */
  const handleSaveProfile = async () => {

    // Reset messages before validation
    setUserNameError("");
    setEmailError("");
    setSuccessMessage("");

    let isValid = true;

    /**
     * Username validation
     * Prevent empty usernames
     */
    if (profile.username.trim() === "") {
      setUserNameError("Username is required");
      isValid = false;
    }

    /**
     * Email validation
     */
    const emailValue = profile.email.trim();

    // Empty email validation
    if (emailValue === "") {
      setEmailError("Email address is required");
      isValid = false;
    }

    // Basic email structure validation
    else if (
      emailValue.includes("@") === false ||
      emailValue.includes(".") === false
    ) {
      setEmailError(
        "Please enter a complete email (e.g., example@domain.com)"
      );
      isValid = false;
    }

    // Ensure dot appears after @
    else if (
      emailValue.lastIndexOf(".") < emailValue.indexOf("@")
    ) {
      setEmailError("Invalid email structure");
      isValid = false;
    }

    // Ensure domain extension exists
    else if (
      emailValue.split(".").pop().length < 2
    ) {
      setEmailError("Email domain is incomplete");
      isValid = false;
    }

    /**
     * Proceed only if validation succeeds
     */
    if (isValid === true) {

      // Activate loading state
      setIsSaving(true);

      try {

        // Send update request to backend
        const res = await fetch(
          "http://127.0.0.1:8000/api/profile/update/",
          {
            method: "PUT",
            headers: getAuthHeaders(),
            body: JSON.stringify(profile),
          }
        );

        /**
         * Successful response
         */
        if (res.ok) {

          const updated = await res.json();

          // Update local profile state
          setProfile({
            username: updated.username,
            email: updated.email,
          });

          // Show success message
          setSuccessMessage(
            "Profile updated successfully!"
          );

        } else {

          // Backend request failed
          setEmailError(
            "Failed to update profile. Please try again."
          );
        }

      } catch (error) {

        // Server or network failure
        console.error(
          "Critical: Failed to update profile.",
          error
        );

        setEmailError(
          "Server connection failed. Please try again."
        );

      } finally {

        // Stop loading state
        setIsSaving(false);
      }
    }
  };

  return (

    <div className={`page-layout ${themeClass}`}>

      <div className="page-content">

        {/* Page Header */}
        <CustomHeader
          isDarkMode={isDarkMode}
          title="Settings"
          subtitle="Manage your profile information"
          showBtn={false}
        />

        <div className={`settings-card ${themeClass}`}>

          {/* Profile Avatar */}
          <AvatarSection
            username={profile.username}
            isDarkMode={isDarkMode}
          />

          <div className="inputs-grid">

            {/* Username Field */}
            <div>

              <SettingsInput
                label="Username"
                value={profile.username}
                onChange={(e) =>
                  handleInputChange(
                    "username",
                    e.target.value
                  )
                }
                isDarkMode={isDarkMode}
              />

              {/* Username Validation Error */}
              {userNameError !== "" && (
                <p className="error-message">
                  <AlertCircle size={14} />
                  {userNameError}
                </p>
              )}
            </div>

            {/* Email Field */}
            <div>

              <SettingsInput
                label="Email"
                type="email"
                value={profile.email}
                onChange={(e) =>
                  handleInputChange(
                    "email",
                    e.target.value
                  )
                }
                isDarkMode={isDarkMode}
              />

              {/* Email Validation Error */}
              {emailError !== "" && (
                <p className="error-message">
                  <AlertCircle size={14} />
                  {emailError}
                </p>
              )}
            </div>
          </div>

          {/* Success Message */}
          {successMessage !== "" && (
            <p className="success-message">
              <CheckCircle size={15} />
              {successMessage}
            </p>
          )}

          {/* Save Button */}
          <div className="save-actions-container">

            <button
              onClick={handleSaveProfile}
              disabled={isSaving}
              className="btn-full-save"
            >
              <Save size={20} />

              <span>
                {isSaving ? "Saving..." : "Save Changes"}
              </span>

            </button>
          </div>
        </div>
      </div>
    </div>
  );
}