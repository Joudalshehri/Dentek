import React from 'react';
import logo from '@/assets/0b7e942602c249fe1ebd2f413e4a81dfd2bc24e8.png';

/**
 * Footer Component
 * * Displays the application's branding, copyright information, 
 * and essential navigation links for legal and support purposes.
 */
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

        {/* Legal & Support Links */}
        <div className="footer-links">
          <button className="footer-link">Privacy Policy</button>
          <button className="footer-link">Terms of Service</button>
          <button className="footer-link">Contact</button>
        </div>

      </div>
    </footer>
  );
};