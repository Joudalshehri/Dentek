import "../../styles/PatientsStats.css";
/**
 * PatientsStats Component
 * -----------------------
 * Displays key analytical metrics for the patient management system.
 * Uses a clean, separated CSS architecture for styling.
 */
export function PatientsStats({ isDarkMode, total }) {
  
  // Define the theme string based on the current mode
  const theme = isDarkMode ? "dark" : "light";

  return (
    <div className="stats-grid-container">
      
      {/* Main card container applying dynamic theme classes */}
      <div className={"stat-card " + theme}>
        
        {/* Displays the numerical total of patients */}
        <div className={"stat-number " + theme}>
          {total}
        </div>

        {/* Informative label for the statistic */}
        <div className={"stat-label " + theme}>
          Total Patients
        </div>
      </div>
    </div>
  );
}