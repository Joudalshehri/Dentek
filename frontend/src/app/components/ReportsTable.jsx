// components/ReportsTable.jsx
import React from "react";
import { Eye, Calendar, ChevronDown, ChevronRight } from "lucide-react";

/**
 * ReportsTable Component
 * 
 * Renders a hierarchical table that groups reports by patient.
 * Supports expanding/collapsing patient rows to reveal nested report details.
 */
export function ReportsTable({ 
  loading, 
  groupedReports, 
  expandedPatientId, 
  setExpandedPatientId, 
  onViewReport 
}) {
  
  // Conditional rendering for the loading state to improve User Experience (UX)
  if (loading) {
    return (
      <div className="table-card">
        <div className="loading">Loading reports...</div>
      </div>
    );
  }

  return (
    <div className="table-card">
      <table className="table">
        <thead>
          <tr>
            <th></th> {/* Indicator column for expansion */}
            <th>Patient</th>
            <th>Patient ID</th>
            <th>Reports Count</th>
            <th>Last Report Date</th>
          </tr>
        </thead>

        <tbody>
          {groupedReports.map((group) => (
            <React.Fragment key={group.patientId}>
              {/* Parent Row: Patient Summary Information */}
              <tr
                className="patient-row"
                onClick={() =>
                  setExpandedPatientId(
                    expandedPatientId === group.patientId ? null : group.patientId
                  )
                }
              >
                <td>
                  {/* Dynamic Icon Switch based on expansion state */}
                  {expandedPatientId === group.patientId ? (
                    <ChevronDown size={16} />
                  ) : (
                    <ChevronRight size={16} />
                  )}
                </td>

                <td>
                  <div className="patient-info">
                    {/* Generates Initials Avatar from the full name */}
                    <div className="avatar">
                      {group.patientName
                        .split(" ")
                        .map((n) => n[0])
                        .join("")}
                    </div>
                    <span>{group.patientName}</span>
                  </div>
                </td>

                <td>P{group.patientId}</td>

                <td>
                  <span className="badge">
                    {group.reports.length} Reports
                  </span>
                </td>

                <td>
                  {/* Formatting the most recent report date */}
                  {new Date(group.reports[0].date).toLocaleDateString()}
                </td>
              </tr>

              {/* Collapsible Sub-Row: Individual Report Details */}
              {expandedPatientId === group.patientId && (
                <tr>
                  <td colSpan={5} className="expanded">
                    <div className="reports-list">
                      {group.reports.map((report) => (
                        <div key={report.id} className="report-item">
                          <div className="report-left">
                            <span className="report-id">R{report.id}</span>
                            <div className="report-date">
                              <Calendar size={14} />
                              {new Date(report.date).toLocaleDateString()}
                            </div>
                            {/* Visual cue for findings status */}
                            <span
                              className={`findings ${
                                report.findings > 0 ? "red" : "green"
                              }`}
                            >
                              {report.findings} findings
                            </span>
                          </div>

                          <div className="actions">
                            <button
                              onClick={(e) => {
                                // Stop propagation to prevent the parent row click event
                                e.stopPropagation();
                                onViewReport(report.id);
                              }}
                              title="View Report"
                            >
                              <Eye size={16} />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </td>
                </tr>
              )}
            </React.Fragment>
          ))}
        </tbody>
      </table>
    </div>
  );
}