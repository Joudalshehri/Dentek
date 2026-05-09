import React from "react";
import { Plus } from "lucide-react";
import "../../styles/XRayGalleryHeader.css";

/**
 * XRayGalleryHeader Component
 * ---------------------------
 * Provides the interactive header for the X-Ray gallery, including
 * the controls for selecting and validating image files before upload.
 * 
 * @param {boolean} isDarkMode - Current theme state.
 * @param {function} onUpload - Callback to initiate the upload process.
 * @param {function} setErrorMessage - State setter for inline UI error reporting.
 */
export function XRayGalleryHeader({
  isDarkMode,
  onUpload,
  setErrorMessage,
}) {

  // Dynamic theme class assignment for consistent UI styling
  const themeClass = isDarkMode ? "dark" : "light";

  /**
   * Orchestrates the file selection and validation logic.
   * Ensures that only valid image formats are passed to the parent handler.
   */
  const handleFileChange = (e) => {
    // Capture the first file from the input stream
    const file = e.target.files?.[0];

    // Early exit if the user cancels the selection
    if (!file) {
      if (setErrorMessage) setErrorMessage("No file was selected. Please try again.");
      return;
    }

    /**
     * MIME Type Validation
     * ---------------------
     * Replaces legacy 'alert' boxes with an inline error state for better UX.
     * Only standard image formats (PNG, JPG, JPEG, WebP) are accepted.
     */
    if (!file.type.startsWith("image/")) {
      if (setErrorMessage) {
        setErrorMessage("Invalid file format. Please upload a standard image file.");
      }
      // Reset input value to allow the user to re-attempt with a valid file
      e.target.value = "";
      return;
    }

    // Clear any previous errors upon successful validation
    if (setErrorMessage) setErrorMessage(""); 

    // Dispatch the file to the parent component for API transmission
    onUpload(file);

    // Flush the input buffer to allow consecutive uploads of the same file if needed
    e.target.value = "";
  };

  return (
    <div className="gallery-header">
      {/* Gallery Branding Section */}
      <div className="header-text-container">
        <h2 className={`gallery-title ${themeClass}`}>
          X-Ray Gallery
        </h2>
      </div>

      {/* Upload Control Section */}
      <label className={`btn-add-xray ${themeClass}`} title="Upload new X-ray">
        <Plus size={20} />
        <span>Add X-Ray</span>
        
        {/* Native file input hidden for custom styling */}
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