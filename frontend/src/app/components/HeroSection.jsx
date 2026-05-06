import React from 'react';
import xrayBg from '@/assets/0274894b2227898af4890d0f95b917c90d00b2e4.png';

/**
 * HeroSection Component
 * * The primary visual section of the landing page (above-the-fold).
 * Showcases the value proposition of the AI dental diagnostics and provides 
 * clear Call-to-Action (CTA) buttons.
 * * @param {Function} onNavigateToLogin - Triggered when the "Get Started" button is clicked.
 * @param {Function} scrollToFeatures - Smoothly scrolls the user to the system features section.
 */
export const HeroSection = ({ onNavigateToLogin, scrollToFeatures }) => {
  return (
    <>
      {/* Background Visuals: Overlay and Image */}
      <div className="hero-image-wrapper">
        <div className="image-overlay"></div>
        <img src={xrayBg} alt="Advanced Dental X-ray Visualization" className="hero-img" />
      </div>

      {/* Main Content: Title, Description, and CTAs */}
      <div className="hero-content-container">
        <div className="hero-text-block">
          <h1 className="hero-title">
            AI-Powered <br />
            <span className="hero-title-italic">Dental Diagnostics</span>
          </h1>

          <p className="hero-description">
            Advanced artificial intelligence that helps dentists analyze X-rays automatically, 
            detect dental problems, and generate professional reports in seconds.
          </p>

          <div className="hero-buttons">
            <button onClick={onNavigateToLogin} className="get-started-btn">
              Get Started
            </button>

            <button onClick={scrollToFeatures} className="overview-btn">
              System Overview
            </button>
          </div>
        </div>
      </div>
    </>
  );
};