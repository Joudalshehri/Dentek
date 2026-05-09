// components/ReportsStats.jsx
import React from "react";

/**
 * ReportsStats Component
 * 
 * Provides a high-level statistical overview of the diagnostic reports.
 * Calculates totals, status breakdowns, and cumulative findings from the data set.
 */
export function ReportsStats({ reports }) {
  return (
    <div className="stats-grid">
      {/* Total Reports Counter: Simply reflects the length of the reports array */}
      <div className="stat-card">
        <div className="stat-number">{reports.length}</div>
        <div className="stat-label">Total Reports</div>
      </div>

      {/* 
          Completion Statistics: 
          Filters the reports to count only those marked as "Completed". 
      */}
      <div className="stat-card">
        <div className="stat-number green">
          {reports.filter((r) => r.status === "Completed").length}
        </div>
        <div className="stat-label">Completed</div>
      </div>

      {/* 
          Cumulative Findings: 
          Uses the reduce() method to sum up the numerical 'findings' across all reports.
          The '0' at the end acts as the initial value for the accumulator (sum).
      */}
      <div className="stat-card">
        <div className="stat-number red">
          {reports.reduce((sum, r) => sum + r.findings, 0)}
        </div>
        <div className="stat-label">Total Findings</div>
      </div>
    </div>
  );
}