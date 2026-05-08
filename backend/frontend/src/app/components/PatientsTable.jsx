import React from "react";
import { Phone, Mail, ChevronRight } from "lucide-react";
import "../../styles/PatientsTable.css";

/**
 * PatientsTable Component
 * Renders a stylized table of patient records with theme support and selection handling.
 * * @param {boolean} isDarkMode - Current theme state to apply dark/light styles.
 * @param {Array} patients - List of patient objects to be displayed.
 * @param {function} onSelectPatient - Callback function triggered when a row is clicked.
 */
export function PatientsTable({
  isDarkMode,
  patients,
  onSelectPatient,
}) {
  return (
    <div className={`patients-table ${isDarkMode ? "dark" : ""}`}>
      <div className="table-wrapper">
        <table>
          <thead>
            <tr>
              <th>Patient ID</th>
              <th>Name</th>
              <th>Age</th>
              <th>Contact</th>
              <th></th>
            </tr>
          </thead>

          <tbody>
            {/* Map through the patients array to generate table rows */}
            {patients.map((patient) => (
              <tr
                key={patient.id}
                onClick={() => onSelectPatient(patient.id)}
                className="row"
              >
                {/* Format ID to always show 3 digits (e.g., P001) */}
                <td className="id">
                  {`P${patient.id.toString().padStart(3, "0")}`}
                </td>

                <td>
                  <div className="name-cell">
                    {/* Generate Avatar initials from the first letter of each name part */}
                    <div className="avatar">
                      {patient.name
                        .split(" ")
                        .map((n) => n[0])
                        .join("")}
                    </div>
                    <span>{patient.name}</span>
                  </div>
                </td>

                <td>{patient.age}</td>

                <td>
                  {/* Contact Info: Displays Phone and Email with corresponding icons */}
                  <div className="contact">
                    <div>
                      <Phone className="icon" />
                      {patient.phone}
                    </div>
                    <div>
                      <Mail className="icon" />
                      {patient.email}
                    </div>
                  </div>
                </td>

                {/* Navigation indicator for row clickability */}
                <td className="arrow">
                  <ChevronRight className="arrow-icon" />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Conditional Rendering: Show message if no data matches the filter */}
      {patients.length === 0 && (
        <div className="empty">
          No patients found matching your search.
        </div>
      )}
    </div>
  );
}