// ReportsPage.jsx
import React, { useEffect, useState, useMemo } from "react";
import {
  Eye,
  Calendar,
  ChevronDown,
  ChevronRight,
} from "lucide-react";
import { useDarkMode } from "../contexts/DarkModeContext";
import { PatientsSearchBar } from "../components/PatientsSearchBar";
import { CustomHeader } from "./CustomHeader";
import "../../styles/ReportsPage.css";

export function ReportsPage({ onViewReport }) {
  const [searchQuery, setSearchQuery] = useState("");
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(false);
  const [expandedPatientId, setExpandedPatientId] = useState(null);
  const { isDarkMode } = useDarkMode();

  useEffect(() => {
    fetchReports();
  }, []);

  const fetchReports = async () => {
  try {
    setLoading(true);

    const token = localStorage.getItem("token");

    if (!token) {
      console.error("No token found. Please login again.");
      return;
    }

    const response = await fetch("http://127.0.0.1:8000/api/reports/", {
      headers: {
        Authorization: `Token ${token}`,
      },
    });

    if (!response.ok) {
      console.error("Failed to fetch reports:", response.status);
      return;
    }

    const data = await response.json();

    const formatted = data.map((item) => ({
      id: item.id.toString(),
      patientId: item.patient_id.toString(),
      patientName: item.patient_name,
      date: item.date,
      status: "Completed",
      findings: item.findings || 0,
      age: item.patient_age || 0,
      summary: item.summary || "",
    }));

    setReports(formatted);
  } catch (err) {
    console.error("Error fetching reports:", err);
  } finally {
    setLoading(false);
  }
};

  const groupedReports = useMemo(() => {
    const groups = {};

    reports.forEach((report) => {
      if (!groups[report.patientId]) {
        groups[report.patientId] = {
          patientName: report.patientName,
          patientId: report.patientId,
          reports: [],
        };
      }
      groups[report.patientId].reports.push(report);
    });

    return Object.values(groups).filter(
      (group) =>
        group.patientName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        group.patientId.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [reports, searchQuery]);

  return (
    <div className={`page ${isDarkMode ? "dark" : "light"}`}>
      <div className="container">
        <CustomHeader
          isDarkMode={isDarkMode}
          title="Reports"
          subtitle="View and manage all diagnostic reports (Grouped by Patient)"
        />

        <PatientsSearchBar
          isDarkMode={isDarkMode}
          searchQuery={searchQuery}
          setSearchQuery={setSearchQuery}
          placeholder="Search reports by patient name or ID..."
        />

        {/* Stats */}
        <div className="stats-grid">
          <div className="stat-card">
            <div className="stat-number">{reports.length}</div>
            <div className="stat-label">Total Reports</div>
          </div>

          <div className="stat-card">
            <div className="stat-number green">
              {reports.filter((r) => r.status === "Completed").length}
            </div>
            <div className="stat-label">Completed</div>
          </div>

          <div className="stat-card">
            <div className="stat-number red">
              {reports.reduce((sum, r) => sum + r.findings, 0)}
            </div>
            <div className="stat-label">Total Findings</div>
          </div>
        </div>

        {/* Table */}
        <div className="table-card">
          {loading ? (
            <div className="loading">Loading reports...</div>
          ) : (
            <table className="table">
              <thead>
                <tr>
                  <th></th>
                  <th>Patient</th>
                  <th>Patient ID</th>
                  <th>Reports Count</th>
                  <th>Last Report Date</th>
                </tr>
              </thead>

              <tbody>
                {groupedReports.map((group) => (
                  <React.Fragment key={group.patientId}>
                    <tr
                      className="patient-row"
                      onClick={() =>
                        setExpandedPatientId(
                          expandedPatientId === group.patientId
                            ? null
                            : group.patientId
                        )
                      }
                    >
                      <td>
                        {expandedPatientId === group.patientId ? (
                          <ChevronDown size={16} />
                        ) : (
                          <ChevronRight size={16} />
                        )}
                      </td>

                      <td>
                        <div className="patient-info">
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
                        {new Date(group.reports[0].date).toLocaleDateString()}
                      </td>
                    </tr>

                    {expandedPatientId === group.patientId && (
                      <tr>
                        <td colSpan={5} className="expanded">
                          <div className="reports-list">
                            {group.reports.map((report) => (
                              <div key={report.id} className="report-item">
                                <div className="report-left">
                                  <span className="report-id">
                                    R{report.id}
                                  </span>

                                  <div className="report-date">
                                    <Calendar size={14} />
                                    {new Date(report.date).toLocaleDateString()}
                                  </div>

                                  <span
                                    className={`findings ${
                                      report.findings > 0 ? "red" : "green"
                                    }`}
                                  >
                                    {report.findings} findings
                                  </span>
                                </div>

                                <div className="actions">
                                  {/* 👁️ عرض التقرير فقط */}
                                  <button
                                    onClick={(e) => {
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
          )}
        </div>
      </div>
    </div>
  );
}