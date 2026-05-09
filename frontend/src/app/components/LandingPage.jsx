import React from 'react';
import { useDarkMode } from '../contexts/DarkModeContext';
import '../../styles/LandingPage.css';

import { Header } from "./Header";
import { HeroSection } from "./HeroSection";
import { FeaturesSection } from "./FeaturesSection";
import { Footer } from "./Footer";

/**
 * LandingPage
 *
 * Renders the public landing page.
 * It connects the shared sections together:
 * Header, HeroSection, FeaturesSection, and Footer.
 *
 * Props:
 * - onNavigateToLogin: switches the user to the login page.
 */
export function LandingPage({ onNavigateToLogin }) {
  // Access theme state and toggle functionality from DarkModeContext
  const { isDarkMode, toggleDarkMode } = useDarkMode();

  /**
   * Smoothly scrolls the viewport to the 'Key Features' section.
   */
 // Scrolls smoothly to the features section when the user clicks the CTA button.
const scrollToFeatures = () => {
  const section = document.getElementById("key-features");

  if (section) {
    section.scrollIntoView({ behavior: "smooth", block: "center" });
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