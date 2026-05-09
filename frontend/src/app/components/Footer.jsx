import logo from "@/assets/Logo.png";

/**
 * Footer
 *
 * Displays Dentek branding, copyright information,
 * legal links, and contact details.
 */
export const Footer = () => {
  return (
    <footer className="footer">
      <div className="footer-content">
        <div className="footer-left">
          <img
            src={logo}
            alt="Dentek AI logo"
            className="footer-logo"
          />

          <p className="footer-copy">
            © {new Date().getFullYear()} Dentek. Advanced AI Dental Diagnostics.
          </p>
        </div>

        <div className="footer-links">
          <button type="button" className="footer-link">
            Privacy Policy
          </button>

          <button type="button" className="footer-link">
            Terms of Service
          </button>

          <div className="footer-contact">
            <p className="footer-title">Contact</p>

            <a
              href="mailto:dentek2026@gmail.com"
              className="footer-link"
            >
              dentek2026@gmail.com
            </a>

            <a
              href="https://x.com/Dentek_26"
              target="_blank"
              rel="noopener noreferrer"
              className="footer-link"
            >
              @Dentek_26
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
};