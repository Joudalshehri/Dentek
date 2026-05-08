import { useState } from 'react';
import {
  Users,
  FileText,
  LogOut,
  Stethoscope,
  Moon,
  Sun,
  Camera,
  Save,
  Settings  
} from 'lucide-react';

import logo from '@/assets/0b7e942602c249fe1ebd2f413e4a81dfd2bc24e8.png';
import { useDarkMode } from '../contexts/DarkModeContext';
import '../../styles/MainLayout.css';

export function MainLayout({
  children,
  currentPage,
  onNavigate,
  onLogout,
  profile,
  setProfile
}) {

  const { isDarkMode, toggleDarkMode } = useDarkMode();

  const [isEditProfileOpen, setIsEditProfileOpen] = useState(false);

  const getAuthHeaders = () => ({
    "Content-Type": "application/json",
    Authorization: `Token ${localStorage.getItem("token")}`,
  });

  const navItems = [
    { id: 'patients', label: 'Patients', icon: Users },
    { id: 'reports', label: 'Reports', icon: FileText },
    { id: 'settings', label: 'Settings', icon: Settings },
  ];

  // ================= UPDATE PROFILE =================

  const handleInputChange = (field, value) => {
    setProfile((prev) => ({
      ...prev,
      [field]: value
    }));
  };

  const handleSaveProfile = async () => {
    try {
      const res = await fetch('http://127.0.0.1:8000/api/profile/update/', {
        method: 'PUT',
        headers: getAuthHeaders(),
        body: JSON.stringify(profile),
      });

      if (res.ok) {
        const updated = await res.json();

        // 🔥 تحديث مباشر لكل التطبيق
        setProfile({
          username: updated.username,
          email: updated.email,
        });

        setIsEditProfileOpen(false);
      }

    } catch (e) {
      console.error(e);
    }
  };

  // ================= UI =================

  return (
    <div className={`layout ${isDarkMode ? 'dark' : ''}`}>

      {/* Sidebar */}
      <aside className="sidebar">

        {/* Logo */}
        <div className="logo-section">
          <div className="logo-row">

            <div>
              <img src={logo} className="logo" />
              <p className="subtitle">AI Dental Diagnostics</p>
            </div>

            <button onClick={toggleDarkMode} className="theme-btn">
              {isDarkMode ? <Sun size={16}/> : <Moon size={16}/>}
            </button>

          </div>
        </div>

        {/* Navigation */}
        <nav className="nav">
          {navItems.map((item) => {
            const Icon = item.icon;
            const active = currentPage === item.id;

            return (
              <button
                key={item.id}
                onClick={() => onNavigate(item.id)}
                className={`nav-item ${active ? 'active' : ''}`}
              >
                <Icon size={20}/>
                <span>{item.label}</span>
              </button>
            );
          })}
        </nav>

        {/* Profile */}
        <div className="profile-section">

          <div className="profile-box">

            <div className="avatar">
              <Stethoscope size={20}/>
            </div>

            <div className="profile-info">
              <p className="name">{profile.username}</p>
              <p className="email">{profile.email}</p>
            </div>

          </div>

          <button onClick={onLogout} className="logout-btn">
            <LogOut size={20}/>
            <span>Logout</span>
          </button>

        </div>

      </aside>

      {/* Content */}
      <main className="content">
        {children}
      </main>

      {/* Edit Profile Modal */}
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

              <button className="photo-btn">
                <Camera size={16} />
                Change Photo
              </button>

              <div className="form-group full">
                <label>Full Name</label>
                <input
                  value={profile.username}
                  onChange={(e) =>
                    handleInputChange("username", e.target.value)
                  }
                />
              </div>

              <div className="form-group full">
                <label>Email Address</label>
                <input
                  value={profile.email}
                  onChange={(e) =>
                    handleInputChange("email", e.target.value)
                  }
                />
              </div>

              <div className="actions-row">

                <button className="save-btn" onClick={handleSaveProfile}>
                  <Save size={18} />
                  Save Changes
                </button>

                <button
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