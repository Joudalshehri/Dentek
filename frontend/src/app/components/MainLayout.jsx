import { useState, useEffect } from 'react';
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

export function MainLayout({ children, currentPage, onNavigate, onLogout }) {

  const [isEditProfileOpen, setIsEditProfileOpen] = useState(false);
  const [profileSettings, setProfileSettings] = useState({
    username: '',
    email: ''
  });

  const { isDarkMode, toggleDarkMode } = useDarkMode();

  const getAuthHeaders = () => ({
    "Content-Type": "application/json",
    Authorization: `Token ${localStorage.getItem("token")}`,
  });

  const navItems = [
    { id: 'patients', label: 'Patients', icon: Users },
    { id: 'reports', label: 'Reports', icon: FileText },
    { id: 'settings', label: 'Settings', icon: Settings },
  ];

  // ✅ FIXED: add token
  useEffect(() => {
    fetch('http://127.0.0.1:8000/api/profile/', {
      headers: {
        Authorization: `Token ${localStorage.getItem("token")}`,
      },
    })
      .then((r) => r.json())
      .then((data) => setProfileSettings(data))
      .catch(console.error);
  }, []);

  const handleInputChange = (field, value) => {
    setProfileSettings({ ...profileSettings, [field]: value });
  };

  // ✅ FIXED: correct endpoint + token
  const handleSaveProfile = async () => {
    try {
      const res = await fetch('http://127.0.0.1:8000/api/profile/', {
        method: 'PUT',
        headers: getAuthHeaders(),
        body: JSON.stringify(profileSettings),
      });

      if (res.ok) {
        setIsEditProfileOpen(false);
      } else {
        alert('فشل التحديث');
      }
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <div className={`layout ${isDarkMode ? 'dark' : ''}`}>

      {/* Sidebar */}
      <aside className="sidebar">

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
              <p className="name">{profileSettings.username}</p>
              <p className="email">{profileSettings.email}</p>
            </div>

          </div>

          <button onClick={onLogout} className="logout-btn">
            <LogOut size={20}/>
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

              <button className="photo-btn">
                <Camera size={16} />
                Change Photo
              </button>

              <div className="form-group full">
                <label>Full Name</label>
                <input
                  value={profileSettings.username}
                  onChange={(e) =>
                    handleInputChange("username", e.target.value)
                  }
                />
              </div>

              <div className="form-group full">
                <label>Email Address</label>
                <input
                  value={profileSettings.email}
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