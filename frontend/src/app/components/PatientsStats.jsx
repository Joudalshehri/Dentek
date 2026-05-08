import "../../styles/PatientsStats.css";

/**
 * PatientsStats Component
 *
 * Displays a statistics card
 * showing the total number of patients.
 */

export function PatientsStats({
  isDarkMode,
  total,
}) {

  // Apply current theme class
  const theme = isDarkMode ? "dark" : "light";

  return (
    <div className="stats-grid-container">

      {/* Statistics card */}
      <div className={`stat-card ${theme}`}>

        {/* Total patients count */}
        <div className={`stat-number ${theme}`}>
          {total}
        </div>

        {/* Statistics label */}
        <div className={`stat-label ${theme}`}>
          Total Patients
        </div>

      </div>

    </div>
  );
}