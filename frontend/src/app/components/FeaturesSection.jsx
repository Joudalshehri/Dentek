import { Brain, Users, BarChart3 } from "lucide-react";
import { FeatureCard } from "./FeatureCard";

const features = [
  {
    icon: <Brain className="icon-large" />,
    title: "AI Analysis",
    text: "Automatically detects dental issues like cavities and infections using advanced machine learning algorithms trained on thousands of dental X-rays.",
    color: "icon-pink",
  },
  {
    icon: <Users className="icon-large" />,
    title: "Patient Management",
    text: "Store and organize patient records, X-ray images, and treatment history in one secure, easy-to-access platform.",
    color: "icon-blue",
  },
  {
    icon: <BarChart3 className="icon-large" />,
    title: "Smart Reporting",
    text: "Generate comprehensive diagnostic reports automatically with detailed findings and treatment recommendations.",
    color: "icon-green",
  },
];

/**
 * FeaturesSection
 *
 * Displays the main platform features using reusable FeatureCard components.
 * The section ID is used by the landing page smooth-scroll button.
 */
export const FeaturesSection = () => {
  return (
    <section className="features-section" id="key-features">
      <div className="features-header">
        <p className="features-subtitle">What We Offer</p>
        <h2 className="features-title">Key Features</h2>
        <p className="features-description">
          Powerful tools designed to streamline your dental practice and improve
          patient outcomes
        </p>
      </div>

      <div className="features-grid">
        {features.map((feature) => (
          <FeatureCard
            key={feature.title}
            icon={feature.icon}
            title={feature.title}
            text={feature.text}
            color={feature.color}
          />
        ))}
      </div>

      <div className="pagination-dots" aria-hidden="true">
        <div className="dot dot-active"></div>
        <div className="dot"></div>
        <div className="dot"></div>
      </div>
    </section>
  );
};