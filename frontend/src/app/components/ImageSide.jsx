/**
 * ImageSide Component
 * @description Serves as the primary visual anchor for the authentication layout.
 * Incorporates aesthetic layering and optimized asset loading to enhance user engagement 
 * without compromising performance.
 * * @param {Object} props
 * @param {string} props.asset - The source URL or imported path for the clinical analysis preview image.
 * * @returns {JSX.Element} A containerized branding side-panel with integrated overlay effects.
 */
export const ImageSide = ({ asset }) => (
  <div className="image-side">
    {/* Visual Filter: An overlay layer to ensure consistency and brand alignment */}
    <div className="image-overlay"></div>
    
    {/* Primary Media: Clinical visualization with lazy-loading enabled for performance optimization */}
    <img 
      src={asset} 
      alt="Clinical AI Analysis Preview" 
      className="main-login-img" 
      loading="lazy" 
    />
  </div>
);