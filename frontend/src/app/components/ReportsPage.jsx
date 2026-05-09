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
import { ReportsStats } from "./ReportsStats";
import { ReportsTable } from "./ReportsTable";

/**
 * ReportsPage Component
 * 
 * Orchestrates the display of diagnostic reports.
 * Implements a "Group-by-Patient" view to organize multiple reports under their respective owners.
 */
export function ReportsPage({ onViewReport }) {
  // --- State Hooks ---
  const [searchQuery, setSearchQuery] = useState("");
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(false);
  const [expandedPatientId, setExpandedPatientId] = useState(null); // Controls accordions in the table
  const { isDarkMode } = useDarkMode();

  // Initial data fetch on component mount
  useEffect(() => {
    fetchReports();
  }, []);

  /**
   * Fetch all reports from the backend and normalize the data structure.
   */
  const fetchReports = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem("token");

      if (!token) {
        console.error("No authentication token found.");
        return;
      }

      const response = await fetch("http://127.0.0.1:8000/api/reports/", {
          headers: {
          Authorization: `Token ${token}`,
        },
      });

      if (!response.ok) {
        console.error("API Error:", response.status);
        return;
      }

      const data = await response.json();

      /**
       * Data Mapping: Transform backend snake_case or nested fields 
       * into a consistent camelCase object used by the UI components.
       */
      const formatted = data.map((item) => ({
        id: String(item.id ?? ""),
        patientId: String(item.patient_id ?? ""),
        nationalId: String(item.patient_code ?? ""),
        patientName: item.patient_name ?? "",
        date: item.date,
        status: "Completed",
        findings: item.findings || 0,
        age: item.patient_age || 0,
        summary: item.summary || "",
      }));

      setReports(formatted);
    } catch (err) {
      console.error("Network Error fetching reports:", err);
    } finally {
      setLoading(false);
    }
  };

  /**
   * Memoized Grouping Logic
   * Groups individual reports by Patient ID and applies the search filter.
   * Using useMemo prevents expensive re-calculations on every render unless 
   * 'reports' or 'searchQuery' actually change.
   */
  const groupedReports = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    const groups = {};

    // Step 1: Accumulate reports into patient-keyed objects
    reports.forEach((report) => {
      const patientId = report.patientId;

      if (!groups[patientId]) {
        groups[patientId] = {
          patientName: report.patientName,
          patientId: report.patientId,
          nationalId: report.nationalId,
          reports: [],
        };
      }
      groups[patientId].reports.push(report);
    });

    const result = Object.values(groups);

    // Step 2: Apply multi-criteria search filtering (Name, Internal ID, or National ID)
    if (!query) return result;

    return result.filter((group) => {
      const id = String(group.patientId).toLowerCase();
      const nationalId = String(group.nationalId).toLowerCase();
      const name = String(group.patientName).toLowerCase();

      return (
        name.includes(query) ||
        id.includes(query) ||
        nationalId.includes(query)
      );
    });
  }, [reports, searchQuery]);

  return (
    <div className={`page ${isDarkMode ? "dark" : "light"}`}>
      <div className="container">
        {/* Visual Header with Branding/Context */}
        <CustomHeader
          isDarkMode={isDarkMode}
          title="Reports"
          subtitle="View and manage all diagnostic reports (Grouped by Patient)"
        />

        {/* Global Search Input */}
        <PatientsSearchBar
          isDarkMode={isDarkMode}
          searchQuery={searchQuery}
          setSearchQuery={setSearchQuery}
          placeholder="Search by patient name or ID..." 
        />

        {/* Aggregate Statistics View */}
        <ReportsStats reports={reports} />

        {/* Data Table with Expandable Rows for Grouped Content */}
        <ReportsTable 
          loading={loading}
          groupedReports={groupedReports}
          expandedPatientId={expandedPatientId}
          setExpandedPatientId={setExpandedPatientId}
          onViewReport={onViewReport}
        />
      </div>
    </div>
  );
}