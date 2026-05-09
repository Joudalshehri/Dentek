import { useState } from "react";
import { Save, AlertCircle } from "lucide-react"; // أضفنا AlertCircle للتحذير
import { useDarkMode } from "../contexts/DarkModeContext";
import { AvatarSection } from "./AvatarSection";
import { SettingsInput } from "./SettingsInput";
import { CustomHeader } from "./CustomHeader";
import "../../styles/SettingsPage.css";

/**
 * SettingsPage Component
 * 
 * Manages user profile settings and state persistence.
 * Includes localized validation logic to ensure data quality 
 * before synchronizing with the remote API.
 */
export function SettingsPage({ profile, setProfile }) {
  const { isDarkMode } = useDarkMode();
  const themeClass = isDarkMode ? "dark" : "light";
  const [isSaving, setIsSaving] = useState(false);

  // New state hooks for validation messages
  const [userNameError, setUserNameError] = useState("");
  const [emailError, setEmailError] = useState("");

  const getAuthHeaders = () => ({
    "Content-Type": "application/json",
    Authorization: `Token ${localStorage.getItem("token")}`,
  });

  const handleInputChange = (field, value) => {
    setProfile((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

/**
   * Performs advanced data validation and initiates the persistence sequence.
   * Ensures the email conforms to standard formatting (e.g., user@domain.com)
   * and prevents submission of incomplete profile data.
   */
  const handleSaveProfile = async () => {
    // Reset error states before starting validation logic
    setUserNameError("");
    setEmailError("");

    let isValid = true;

    // 1. Username Validation: Prevent empty or whitespace-only names
    if (profile.username.trim() === "") {
      setUserNameError("Username is required");
      isValid = false;
    }

    // 2. Comprehensive Email Validation
    const emailValue = profile.email.trim();
    
    if (emailValue === "") {
      setEmailError("Email address is required");
      isValid = false;
    } 
    // Check for the presence of '@' and a '.' after it
    else if (emailValue.includes("@") === false || emailValue.includes(".") === false) {
      setEmailError("Please enter a complete email (e.g., example@domain.com)");
      isValid = false;
    } 
    // Ensure the dot comes after the @ symbol
    else if (emailValue.lastIndexOf(".") < emailValue.indexOf("@")) {
      setEmailError("Invalid email structure");
      isValid = false;
    }
    // Ensure there is at least something after the last dot
    else if (emailValue.split(".").pop().length < 2) {
      setEmailError("Email domain is incomplete");
      isValid = false;
    }

    // 3. Execution logic: Only proceed if the form passes all structural checks
    if (isValid === true) {
      setIsSaving(true);
      try {
        const res = await fetch("http://127.0.0.1:8000/api/profile/update/", {
          method: "PUT",
          headers: getAuthHeaders(),
          body: JSON.stringify(profile),
        });

        if (res.ok) {
          const updated = await res.json();
          
          // Immediate state synchronization for UI consistency
          setProfile({
            username: updated.username,
            email: updated.email,
          });
          
          alert("Profile updated successfully!");
        } else {
          console.error("Profile update request failed.");
        }
      } catch (error) {
        console.error("Critical: Failed to update profile.", error);
      } finally {
        setIsSaving(false);
      }
    }
  };
  return (
    <div className={`settings-container ${themeClass}`}>
      <div className="settings-max-width">
        <CustomHeader
          isDarkMode={isDarkMode}
          title="Settings"
          subtitle="Manage your profile information"
          showBtn={false}
        />

        <div className={`settings-card ${themeClass}`}>
          <AvatarSection
            username={profile.username}
            isDarkMode={isDarkMode}
          />

          <div className="inputs-grid">
            {/* Username Input with Validation Feedback */}
            <div>
              <SettingsInput
                label="Username"
                value={profile.username}
                onChange={(e) => handleInputChange("username", e.target.value)}
                isDarkMode={isDarkMode}
              />
              {userNameError !== "" && (
                <p style={{ color: "#ff4d4d", fontSize: "12px", marginTop: "5px", display: "flex", alignItems: "center", gap: "4px" }}>
                  <AlertCircle size={14} /> {userNameError}
                </p>
              )}
            </div>

            {/* Email Input with Validation Feedback */}
            <div>
              <SettingsInput
                label="Email"
                type="email"
                value={profile.email}
                onChange={(e) => handleInputChange("email", e.target.value)}
                isDarkMode={isDarkMode}
              />
              {emailError !== "" && (
                <p style={{ color: "#ff4d4d", fontSize: "12px", marginTop: "5px", display: "flex", alignItems: "center", gap: "4px" }}>
                  <AlertCircle size={14} /> {emailError}
                </p>
              )}
            </div>
          </div>

          <div className="save-actions-container">
            <button
              onClick={handleSaveProfile}
              disabled={isSaving}
              className="btn-full-save"
            >
              <Save size={20} />
              <span>{isSaving ? "Saving..." : "Save Changes"}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}