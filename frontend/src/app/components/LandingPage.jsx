import React from 'react';
import { useDarkMode } from '../contexts/DarkModeContext';
import '../../styles/LandingPage.css';

import { Header } from "./Header";
import { HeroSection } from "./HeroSection";
import { FeaturesSection } from "./FeaturesSection";
import { Footer } from "./Footer";

/**
 * LandingPage Component
 * * The main entry point for the landing page. It manages the theme state 
 * and provides smooth navigation to key sections of the page.
 * * @param {Function} onNavigateToLogin - Callback function to handle navigation to the login screen.
 */
export function LandingPage({ onNavigateToLogin }) {
  // Access theme state and toggle functionality from DarkModeContext
  const { isDarkMode, toggleDarkMode } = useDarkMode();

  /**
   * Smoothly scrolls the viewport to the 'Key Features' section.
   */
  const scrollToFeatures = () => {
    const section = document.getElementById('key-features');
    if (section) {
      section.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  };

  // Determine the CSS class based on the current theme
  const themeClass = isDarkMode ? 'dark-mode' : 'light-mode';

  return (
    <div className={`landing-container ${themeClass}`}>
      <Header
        isDarkMode={isDarkMode}
        toggleDarkMode={toggleDarkMode}
        onNavigateToLogin={onNavigateToLogin}
      />

      <main className="main-content">
        <HeroSection
          onNavigateToLogin={onNavigateToLogin}
          scrollToFeatures={scrollToFeatures}
        />

        <FeaturesSection />
        
        <Footer />
      </main>
    </div>
  );
}