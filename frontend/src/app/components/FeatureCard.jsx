import React from 'react';

/**
 * FeatureCard Component
 * * A reusable UI card designed to showcase specific features.
 * It dynamically renders icons and applies color-specific styling through props.
 * * @param {React.ReactNode} icon - The icon component to be displayed (typically from lucide-react).
 * @param {string} title - The heading text for the feature.
 * @param {string} text - Detailed description of the feature.
 * @param {string} color - CSS class name used to apply specific background/accent colors to the icon box.
 */
export const FeatureCard = ({ icon, title, text, color }) => {
  return (
    <div className="feature-card">
      {/* Icon Container: Dynamically styled using the 'color' prop */}
      <div className={`icon-box ${color}`}>
        {icon}
      </div>
      
      {/* Feature Information */}
      <h3 className="card-title">{title}</h3>
      <p className="card-text">{text}</p>
    </div>
  );
};