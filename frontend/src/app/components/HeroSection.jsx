import xrayBg from "@/assets/Background.png";

/**
 * HeroSection
 *
 * Displays the main landing page banner with the project overview
 * and primary call-to-action buttons.
 */
export const HeroSection = ({
  onNavigateToLogin,
  scrollToFeatures,
}) => {
  return (
    <>
      <div className="hero-image-wrapper">
        <div className="image-overlay"></div>

        <img
          src={xrayBg}
          alt="AI dental X-ray analysis"
          className="hero-img"
        />
      </div>

      <div className="hero-content-container">
        <div className="hero-text-block">
          <h1 className="hero-title">
            AI-Powered <br />
            <span className="hero-title-italic">
              Dental Diagnostics
            </span>
          </h1>

          <p className="hero-description">
            Advanced artificial intelligence that helps dentists analyze
            X-rays automatically, detect dental problems, and generate
            professional reports in seconds.
          </p>

          <div className="hero-buttons">
            <button
              type="button"
              onClick={onNavigateToLogin}
              className="get-started-btn"
            >
              Get Started
            </button>

            <button
              type="button"
              onClick={scrollToFeatures}
              className="overview-btn"
            >
              System Overview
            </button>
          </div>
        </div>
      </div>
    </>
  );
};