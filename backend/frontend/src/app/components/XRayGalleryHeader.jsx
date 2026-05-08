import React from "react";
import { Plus } from "lucide-react";
import "../../styles/XRayGalleryHeader.css"; 

/**
 * XRayGalleryHeader Component
 * * @description Provides a professional header for the X-Ray gallery, 
 * featuring dynamic theme support and a custom-styled file upload trigger.
 * * @param {Object} props
 * @param {boolean} props.isDarkMode - Current theme state for conditional styling.
 * @param {Function} props.onUpload - Callback function to handle the selected file.
 */
export function XRayGalleryHeader({ isDarkMode, onUpload }) {
  
  // Apply theme-specific CSS classes based on current application context
  const themeClass = isDarkMode ? "dark" : "light";

  return (
    <div className="gallery-header">
      <div>
        <h2 className={`gallery-title ${themeClass}`}>
          X-Ray Gallery
        </h2>
      </div>

      <label className={`btn-add-xray ${themeClass}`}>
        {/* Decorative Add Icon */}
        <Plus size={20} />
        
        <span>Add X-Ray</span>

        <input
          type="file"
          accept="image/*"
          className="hidden-file-input"
          onChange={(e) => {
            if (e.target.files && e.target.files[0]) {
              onUpload(e.target.files[0]);
            }
          }}
        />
      </label>
    </div>
  );
}