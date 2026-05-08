import { useState } from "react";
import {
  Users,
  FileText,
  LogOut,
  Stethoscope,
  Moon,
  Sun,
  Camera,
  Save,
  Settings,
} from "lucide-react";

import logo from "@/assets/0b7e942602c249fe1ebd2f413e4a81dfd2bc24e8.png";
import { useDarkMode } from "../contexts/DarkModeContext";
import "../../styles/MainLayout.css";

/**
 * MainLayout
 *
 * Shared layout for authenticated pages.
 * It contains the sidebar, navigation links, user profile area,
 * dark mode toggle, logout button, and edit profile modal.
 */
export function MainLayout({
  children,
  currentPage,
  onNavigate,
  onLogout,
  profile,
  setProfile,
}) {
  const { isDarkMode, toggleDarkMode } = useDarkMode();

  const [isEditProfileOpen, setIsEditProfileOpen] = useState(false);
  const [formProfile, setFormProfile] = useState(profile);
  const [profileError, setProfileError] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  const navItems = [
    { id: "patients", label: "Patients", icon: Users },
    { id: "reports", label: "Reports", icon: FileText },
    { id: "settings", label: "Settings", icon: Settings },
  ];

  // Builds headers needed for authenticated backend requests.
  const getAuthHeaders = () => ({
    "Content-Type": "application/json",
    Authorization: `Token ${localStorage.getItem("token")}`,
  });

  // Opens the edit modal and copies the current profile values into the form.
  const openEditProfile = () => {
    setFormProfile(profile);
    setProfileError("");
    setIsEditProfileOpen(true);
  };

  // Updates the temporary profile form without changing the real profile yet.
  const handleInputChange = (field, value) => {
    setFormProfile((prev) => ({
      ...prev,
      [field]: value,
    }));

    if (profileError) {
      setProfileError("");
    }
  };

  // Validates profile fields before saving changes.
  const validateProfile = () => {
    if (!formProfile.username?.trim()) {
      setProfileError("Full name is required.");
      return false;
    }

    if (!formProfile.email?.trim()) {
      setProfileError("Email address is required.");
      return false;
    }

    if (!/\S+@\S+\.\S+/.test(formProfile.email.trim())) {
      setProfileError("Email must be in this format: example@email.com");
      return false;
    }

    return true;
  };

  // Sends updated profile data to the backend and refreshes the UI profile.
  const handleSaveProfile = async () => {
    if (isSaving) return;
    if (!validateProfile()) return;

    setIsSaving(true);

    try {
      const res = await fetch("http://127.0.0.1:8000/api/profile/update/", {
        method: "PUT",
        headers: getAuthHeaders(),
        body: JSON.stringify({
          username: formProfile.username.trim(),
          email: formProfile.email.trim(),
        }),
      });

      const updated = await res.json();

      if (!res.ok) {
        setProfileError(updated.error || "Failed to update profile.");
        return;
      }

      setProfile({
        username: updated.username,
        email: updated.email,
      });

      localStorage.setItem("username", updated.username);
      localStorage.setItem("email", updated.email);

      setIsEditProfileOpen(false);
    } catch (error) {
      console.error("Profile update error:", error);
      setProfileError("Server connection failed. Please make sure Django is running.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className={`layout ${isDarkMode ? "dark" : ""}`}>
      <aside className="sidebar">
        <div className="logo-section">
          <div className="logo-row">
            <div>
              <img src={logo} className="logo" alt="Dentek logo" />
              <p className="subtitle">AI Dental Diagnostics</p>
            </div>

            <button
              type="button"
              onClick={toggleDarkMode}
              className="theme-btn"
              aria-label="Toggle dark mode"
            >
              {isDarkMode ? <Sun size={16} /> : <Moon size={16} />}
            </button>
          </div>
        </div>

        <nav className="nav" aria-label="Main navigation">
          {navItems.map((item) => {
            const Icon = item.icon;
            const active = currentPage === item.id;

            return (
              <button
                key={item.id}
                type="button"
                onClick={() => onNavigate(item.id)}
                className={`nav-item ${active ? "active" : ""}`}
              >
                <Icon size={20} />
                <span>{item.label}</span>
              </button>
            );
          })}
        </nav>

        <div className="profile-section">
          <button type="button" className="profile-box" onClick={openEditProfile}>
            <div className="avatar">
              <Stethoscope size={20} />
            </div>

            <div className="profile-info">
              <p className="name">{profile.username}</p>
              <p className="email">{profile.email}</p>
            </div>
          </button>

          <button type="button" onClick={onLogout} className="logout-btn">
            <LogOut size={20} />
            <span>Logout</span>
          </button>
        </div>
      </aside>

      <main className="content">{children}</main>

      {isEditProfileOpen && (
        <div className="modal-overlay">
          <div className="modal exact-modal">
            <div className="modal-header center">
              <h2>Edit Profile</h2>
              <p>Update your personal information</p>
            </div>

            <div className="divider" />

            <div className="modal-body center">
              <div className="avatar-large">
                <Stethoscope size={40} />
              </div>

              <button type="button" className="photo-btn">
                <Camera size={16} />
                Change Photo
              </button>

              <div className="form-group full">
                <label>Full Name</label>
                <input
                  value={formProfile.username || ""}
                  onChange={(e) => handleInputChange("username", e.target.value)}
                />
              </div>

              <div className="form-group full">
                <label>Email Address</label>
                <input
                  type="email"
                  value={formProfile.email || ""}
                  onChange={(e) => handleInputChange("email", e.target.value)}
                />
              </div>

              {profileError && (
                <p className="form-error" role="alert">
                  {profileError}
                </p>
              )}

              <div className="actions-row">
                <button
                  type="button"
                  className="save-btn"
                  onClick={handleSaveProfile}
                  disabled={isSaving}
                >
                  <Save size={18} />
                  {isSaving ? "Saving..." : "Save Changes"}
                </button>

                <button
                  type="button"
                  className="cancel-btn"
                  onClick={() => setIsEditProfileOpen(false)}
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}