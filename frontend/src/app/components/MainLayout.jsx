import { Users, FileText, Settings } from 'lucide-react';
import logo from '@/assets/Logo.png';
import { useDarkMode } from '../contexts/DarkModeContext';
import { Sidebar } from './Sidebar';
import '../../styles/MainLayout.css';

/**
 * MainLayout Component
 * 
 * Provides the core structural shell for the application, including the global 
 * sidebar navigation and a responsive content area. It manages theme state 
 * and handles top-level routing/navigation logic.
 * 
 * @param {Object} props
 * @param {React.ReactNode} props.children - The page content to be rendered within the main area.
 * @param {string} props.currentPage - The ID of the currently active navigation route.
 * @param {Function} props.onNavigate - Callback function to handle route changes.
 * @param {Function} props.onLogout - Callback function for user session termination.
 * @param {Object} props.profile - User profile data for the sidebar display.
 */
export function MainLayout({ children, currentPage, onNavigate, onLogout, profile }) {
  
  // Custom hook to consume the DarkMode context
  const { isDarkMode, toggleDarkMode } = useDarkMode();

  /**
   * Configuration for the primary navigation menu.
   * Each item defines a unique ID, display label, and associated Lucide-icon.
   */
  const navItems = [
    { id: 'patients', label: 'Patients', icon: Users },
    { id: 'reports', label: 'Reports', icon: FileText },
    { id: 'settings', label: 'Settings', icon: Settings },
  ];

  // Dynamic class assignment based on the current theme state
  const themeClass = isDarkMode ? 'dark' : '';

  return (
    <div className={`layout ${themeClass}`}>

      {/* Persistent Navigation Sidebar */}
      <Sidebar
        logo={logo}
        isDarkMode={isDarkMode}
        toggleDarkMode={toggleDarkMode}
        navItems={navItems}
        currentPage={currentPage}
        onNavigate={onNavigate}
        profile={profile}
        onLogout={onLogout}
      />

      {/* Main Content Area: Renders the active child component */}
      <main className="content">
        {children}
      </main>

    </div>
  );
}