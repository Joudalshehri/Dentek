import React from 'react';
import { Brain, Users, BarChart3 } from 'lucide-react';
import { FeatureCard } from './FeatureCard';

/**
 * FeaturesSection Component
 * * Highlights the core value propositions of the platform.
 * Utilizes a grid layout to display feature cards and includes an ID 
 * for smooth-scroll navigation anchors.
 */
export const FeaturesSection = () => {
  return (
    <section className="features-section" id="key-features">
      
      {/* Section Header: Introduction to core services */}
      <div className="features-header">
        <p className="features-subtitle">What We Offer</p>
        <h2 className="features-title">Key Features</h2>
        <p className="features-description">
          Powerful tools designed to streamline your dental practice and improve patient outcomes
        </p>
      </div>

      {/* Features Grid: Rendering individual FeatureCard components */}
      <div className="features-grid">
        <FeatureCard
          icon={<Brain className="icon-large" />}
          title="AI Analysis"
          text="Automatically detects dental issues like cavities and infections using advanced machine learning algorithms trained on thousands of dental X-rays."
          color="icon-pink"
        />

        <FeatureCard
          icon={<Users className="icon-large" />}
          title="Patient Management"
          text="Store and organize patient records, X-ray images, and treatment history in one secure, easy-to-access platform."
          color="icon-blue"
        />

        <FeatureCard
          icon={<BarChart3 className="icon-large" />}
          title="Smart Reporting"
          text="Generate comprehensive diagnostic reports automatically with detailed findings and treatment recommendations."
          color="icon-green"
        />
      </div>

      {/* Visual Indicator: Pagination dots for layout aesthetics */}
      <div className="pagination-dots">
        <div className="dot dot-active"></div>
        <div className="dot"></div>
        <div className="dot"></div>
      </div>
    </section>
  );
};