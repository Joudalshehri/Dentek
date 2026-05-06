import React from "react";
import { Camera } from "lucide-react";

/**
 * AvatarSection Component
 * ------------------------
 * Displays the user's profile avatar along with an option to change the profile picture.
 * 
 * Props:
 * - username (string): Used to generate avatar initials if no image is available.
 * - isDarkMode (boolean): Controls theme styling (dark / light mode).
 */
export const AvatarSection = ({ username, isDarkMode }) => {
  // Determine current theme class based on dark mode state
  const themeClass = isDarkMode ? "dark" : "light";

  return (
    <div className="avatar-row">
      
      {/* Avatar Circle:
          - Displays first 2 letters of username (uppercase)
          - Falls back to "??" if username is not available */}
      <div className="avatar-circle">
        {username ? username.substring(0, 2).toUpperCase() : "??"}
      </div>

      <div>
        {/* Section Title */}
        <h3 className={`avatar-title ${themeClass}`}>
          Profile Picture
        </h3>

        {/* Change Photo Button:
            - Includes camera icon for better UX
            - Styled based on theme */}
        <button className={`btn-change-photo ${themeClass}`}>
          <Camera size={14} />
          Change Photo
        </button>
      </div>
    </div>
  );
};