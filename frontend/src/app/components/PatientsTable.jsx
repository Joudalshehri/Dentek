import React from "react";
import {
  Phone,
  Mail,
  ChevronRight,
} from "lucide-react";

import "../../styles/PatientsTable.css";

/**
 * PatientsTable Component
 *
 * Displays patient records in a table with:
 * - System ID
 * - National ID
 * - Name
 * - Age
 * - Contact information
 * - Clickable patient rows
 */

export function PatientsTable({
  isDarkMode,
  patients,
  onSelectPatient,
}) {

  // Apply dark mode class
  const theme = isDarkMode ? "dark" : "";

  return (
    <div className={`patients-table ${theme}`}>

      <div className="table-wrapper">

        <table>

          {/* Table header */}
          <thead>
            <tr>
              <th>System ID</th>
              <th>National ID</th>
              <th>Name</th>
              <th>Age</th>
              <th>Contact</th>
              <th></th>
            </tr>
          </thead>

          {/* Table body */}
          <tbody>

            {patients.map((patient) => (

              <tr
                key={patient.id}
                onClick={() =>
                  onSelectPatient(patient.id)
                }
                className="row"
              >

                {/* Internal system ID */}
                <td className="id">
                  {`P${patient.id
                    .toString()
                    .padStart(3, "0")}`}
                </td>

                {/* Patient national ID */}
                <td>
                  {patient.patient_id}
                </td>

                {/* Patient name and avatar */}
                <td>

                  <div className="name-cell">

                    {/* Initials avatar */}
                    <div className="avatar">
                      {patient.name
                        .split(" ")
                        .map((n) => n[0])
                        .join("")}
                    </div>

                    {/* Full patient name */}
                    <span>
                      {patient.name}
                    </span>

                  </div>

                </td>

                {/* Patient age */}
                <td>
                  {patient.age}
                </td>

                {/* Contact information */}
                <td>

                  <div className="contact">

                    {/* Phone number */}
                    <div>
                      <Phone className="icon" />
                      {patient.phone}
                    </div>

                    {/* Email address */}
                    <div>
                      <Mail className="icon" />
                      {patient.email}
                    </div>

                  </div>

                </td>

                {/* Navigation arrow */}
                <td className="arrow">
                  <ChevronRight className="arrow-icon" />
                </td>

              </tr>

            ))}

          </tbody>

        </table>

      </div>

      {/* Empty state message */}
      {patients.length === 0 && (
        <div className="empty">
          No patients found matching your search.
        </div>
      )}

    </div>
  );
}