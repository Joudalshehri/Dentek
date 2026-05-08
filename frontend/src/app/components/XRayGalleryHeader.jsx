import React from "react";
import { Plus } from "lucide-react";
import "../../styles/XRayGalleryHeader.css";

/**
 * XRayGalleryHeader Component
 * --------------------------------
 * Displays the X-Ray gallery header
 * with upload functionality.
 */
export function XRayGalleryHeader({
  isDarkMode,
  onUpload,
}) {

  // Theme mode (light / dark)
  const themeClass = isDarkMode ? "dark" : "light";

  /**
   * Handle selected X-Ray image
   */
  const handleFileChange = (e) => {

    // Get selected file
    const file = e.target.files?.[0];

    // Prevent errors if no file selected
    if (!file) return;

    /**
     * Validate file type
     * Only image files are allowed
     */
    if (!file.type.startsWith("image/")) {
      alert("Please upload a valid image file.");
      return;
    }

    // Send selected image to parent component
    onUpload(file);

    /**
     * Reset input value
     * Allows uploading the same image again
     */
    e.target.value = "";
  };

  return (
    <div className="gallery-header">

      {/* Header Title */}
      <div>
        <h2 className={`gallery-title ${themeClass}`}>
          X-Ray Gallery
        </h2>
      </div>

      {/* Upload Button */}
      <label className={`btn-add-xray ${themeClass}`}>

        {/* Add Icon */}
        <Plus size={20} />

        <span>Add X-Ray</span>

        {/* Hidden File Input */}
        <input
          type="file"
          accept="image/*"
          className="hidden-file-input"
          onChange={handleFileChange}
        />
      </label>
    </div>
  );
}