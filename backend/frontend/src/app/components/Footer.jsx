import React from 'react';
import logo from '@/assets/0b7e942602c249fe1ebd2f413e4a81dfd2bc24e8.png';

export const Footer = () => {
  return (
    <footer className="footer">
      <div className="footer-content">
        
        {/* Branding & Copyright Section */}
        <div className="footer-left">
          <img src={logo} alt="Dentek AI Branding" className="footer-logo" />
          <p className="footer-copy">
            © {new Date().getFullYear()} Dentek. Advanced AI Dental Diagnostics.
          </p>
        </div>

        {/* Links + Contact */}
        <div className="footer-links">

          <button className="footer-link">Privacy Policy</button>
          <button className="footer-link">Terms of Service</button>

          {/* Contact Section */}
          <div className="footer-contact">
            <p className="footer-title">Contact</p>

            <a href="mailto:dentek2026@gmail.com" className="footer-link">
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