import React, { useState, useEffect } from "react";
import { useDarkMode } from "../contexts/DarkModeContext";
import { AvatarSection } from "./AvatarSection";
import { SettingsInput } from "./SettingsInput";
import { CustomHeader } from "./CustomHeader";
import { Save, Pencil } from "lucide-react"; 
import "../../styles/SettingsPage.css";

export function SettingsPage() {
  const { isDarkMode } = useDarkMode();
  const themeClass = isDarkMode ? "dark" : "light";

  const [settings, setSettings] = useState({ username: "", email: "" });
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    const fetchProfileData = async () => {
      try {
        const res = await fetch("http://127.0.0.1:8000/api/profile/", {
  headers: {
    Authorization: `Token ${localStorage.getItem("token")}`,
  },
});
        const data = await res.json();
        setSettings({
          username: data.username || "",
          email: data.email || "",
        });
      } catch (err) {
        console.error("Fetch Error:", err);
      } finally {
        setIsLoading(false);
      }
    };
    fetchProfileData();
  }, []);

  const handleInputChange = (field, value) => {
    setSettings((prev) => ({ ...prev, [field]: value }));
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const res = await fetch("http://127.0.0.1:8000/api/profile/update/", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(settings),
      });
      if (res.ok) alert("Saved successfully");
    } catch (err) {
      alert("Error saving profile");
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) return <div className={`settings-container ${themeClass}`}><p>Loading...</p></div>;

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
          {/**
           * 
           * 
           <button className="card-edit-btn">
            <Pencil size={16} />
            <span>Edit</span>
          </button>
           */}


          <AvatarSection
            username={settings.username}
            isDarkMode={isDarkMode}
          />

          <div className="inputs-grid">
            <SettingsInput
              label="Username"
              value={settings.username}
              onChange={(e) => handleInputChange("username", e.target.value)}
              isDarkMode={isDarkMode}
            />

            <SettingsInput
              label="Email"
              type="email"
              value={settings.email}
              onChange={(e) => handleInputChange("email", e.target.value)}
              isDarkMode={isDarkMode}
            />
          </div>

          <div className="save-actions-container">
            <button
              onClick={handleSave}
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