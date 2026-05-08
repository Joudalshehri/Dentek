import { useState } from "react";
import { useDarkMode } from "../contexts/DarkModeContext";
import { AvatarSection } from "./AvatarSection";
import { SettingsInput } from "./SettingsInput";
import { CustomHeader } from "./CustomHeader";
import { Save } from "lucide-react";
import "../../styles/SettingsPage.css";

export function SettingsPage({ profile, setProfile }) {

  const { isDarkMode } = useDarkMode();
  const themeClass = isDarkMode ? "dark" : "light";

  const [isSaving, setIsSaving] = useState(false);

  // ================= INPUT =================
  const handleInputChange = (field, value) => {
    setProfile((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  // ================= SAVE =================
  const handleSave = async () => {
    setIsSaving(true);

    try {
      const res = await fetch("http://127.0.0.1:8000/api/profile/update/", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Token ${localStorage.getItem("token")}`,
        },
        body: JSON.stringify(profile),
      });

      if (res.ok) {
        const updated = await res.json();

        // 🔥 هذا اللي يخلي الـ sidebar يتحدث فورًا
        setProfile({
          username: updated.username,
          email: updated.email,
        });
      }

    } catch (err) {
      console.error(err);
    } finally {
      setIsSaving(false);
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

            <SettingsInput
              label="Username"
              value={profile.username}
              onChange={(e) =>
                handleInputChange("username", e.target.value)
              }
              isDarkMode={isDarkMode}
            />

            <SettingsInput
              label="Email"
              type="email"
              value={profile.email}
              onChange={(e) =>
                handleInputChange("email", e.target.value)
              }
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