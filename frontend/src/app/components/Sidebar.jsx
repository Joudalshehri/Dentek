import { Sun, Moon, Stethoscope, LogOut } from 'lucide-react';
/**
 * Sidebar Component
 * 
 * Manages the secondary layout navigation, theme switching, 
 * and user session metadata display.
 */
export function Sidebar({
  logo, 
  isDarkMode, 
  toggleDarkMode, 
  navItems, 
  currentPage, 
  onNavigate, 
  profile, 
  onLogout 
}) {
  return (
    <aside className="sidebar">
      
      {/* Branding Section: Displays logo and global theme toggle */}
      <div className="logo-section">
        <div className="logo-row">
          <div>
            <img src={logo} className="logo" alt="Dentek Logo" />
            <p className="subtitle">AI Dental Diagnostics</p>
          </div>

          {/* Conditional rendering for theme icon based on current state */}
          <button 
            onClick={toggleDarkMode} 
            className="theme-btn" 
            title="Switch appearance"
          >
            {isDarkMode ? <Sun size={16}/> : <Moon size={16}/>}
          </button>
        </div>
      </div>

      {/* Main Navigation: Iterates through navItems config */}
      <nav className="nav">

        {navItems.map((item) => (

          <button
            key={item.id}
            onClick={() => onNavigate(item.id)}
            className={currentPage === item.id ? "nav-item active" : "nav-item"}
          >

            <item.icon size={20} />
            <span>{item.label}</span>

          </button>

        ))}

      </nav>

      {/* Footer Section: User profile summary and session termination */}
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

        <button 
          onClick={onLogout} 
          className="logout-btn"
          aria-label="Log out of account"
        >
          <LogOut size={20}/>
          <span>Logout</span>
        </button>
      </div>
    </aside>
  );
}