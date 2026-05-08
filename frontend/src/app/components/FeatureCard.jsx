 /**
 * FeatureCard
 *
 * Reusable card component used to display system features
 * with an icon, title, and short description.
 */
export const FeatureCard = ({ icon, title, text, color }) => {
  return (
    <div className="feature-card">
      <div className={`icon-box ${color}`}>
        {icon}
      </div>

      <h3 className="card-title">{title}</h3>

      <p className="card-text">
        {text}
      </p>
    </div>
  );
};