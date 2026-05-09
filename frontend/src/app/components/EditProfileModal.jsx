import React from 'react';
import { Camera, Save, Stethoscope } from 'lucide-react';

/**
 * EditProfileModal Component
 * Provides a dedicated interface for updating user profile information.
 * Handles user input for name and email within a focused modal dialog.
 */
export function EditProfileModal({ isOpen, onClose, profile, onInputChange, onSave }) {
  
  // Guard clause: Do not render the modal if it's not active
  if (!isOpen) return null;

  return (
    <div className="modal-overlay">
      <div className="modal exact-modal">
        {/* Modal Header: Displays the primary action context */}
        <div className="modal-header center">
          <h2>Edit Profile</h2>
          <p>Update your personal information</p>
        </div>

        <div className="divider" />

        <div className="modal-body center">
          {/* Profile Picture Placeholder/Preview Section */}
          <div className="avatar-large">
            <Stethoscope size={40} />
          </div>

          <button className="photo-btn">
            <Camera size={16} />
            Change Photo
          </button>

          {/* User Information Form Fields */}
          <div className="form-group full">
            <label>Full Name</label>
            <input
              type="text"
              placeholder="Enter your full name"
              value={profile.username}
              onChange={(e) => onInputChange("username", e.target.value)}
            />
          </div>

          <div className="form-group full">
            <label>Email Address</label>
            <input
              type="email"
              placeholder="Enter your email"
              value={profile.email}
              onChange={(e) => onInputChange("email", e.target.value)}
            />
          </div>

          {/* Modal Action Buttons: Persist or Discard changes */}
          <div className="actions-row">
            <button className="save-btn" onClick={onSave}>
              <Save size={18} />
              Save Changes
            </button>
            <button className="cancel-btn" onClick={onClose}>
              Cancel
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}