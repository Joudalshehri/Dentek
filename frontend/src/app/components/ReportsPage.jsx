// ReportsPage.jsx

// React hooks
import React, { useEffect, useState, useMemo } from "react";

// Icons used inside the reports page
import {
  Eye,
  Calendar,
  ChevronDown,
  ChevronRight,
} from "lucide-react";

// Dark mode context
import { useDarkMode } from "../contexts/DarkModeContext";

// Reusable search bar component
import { PatientsSearchBar } from "../components/PatientsSearchBar";

// Reusable page header component
import { CustomHeader } from "./CustomHeader";

// Reports page styling
import "../../styles/ReportsPage.css";

// Reports statistics cards component
import { ReportsStats } from "./ReportsStats";

// Reports table component
import { ReportsTable } from "./ReportsTable";

/**
 * ReportsPage Component
 * 
 * Responsible for:
 * - Fetching all reports from the backend
 * - Organizing reports by patient
 * - Searching/filtering reports
 * - Displaying grouped reports inside expandable rows
 */
export function ReportsPage({ onViewReport }) {

  // ================= STATE MANAGEMENT =================

  // Stores search input value
  const [searchQuery, setSearchQuery] = useState("");

  // Stores all fetched reports
  const [reports, setReports] = useState([]);

  // Controls loading state while fetching reports
  const [loading, setLoading] = useState(false);

  // Stores expanded patient accordion row
  const [expandedPatientId, setExpandedPatientId] = useState(null);

  // Get dark mode state from context
  const { isDarkMode } = useDarkMode();

  // ================= INITIAL DATA FETCH =================

  // Fetch reports once when component loads
  useEffect(() => {
    fetchReports();
  }, []);

  /**
   * Fetch reports from backend API
   * and convert backend data into UI-friendly format.
   */
  const fetchReports = async () => {

    try {

      // Enable loading state
      setLoading(true);

      // Get saved authentication token
      const token = localStorage.getItem("token");

      // Stop request if token is missing
      if (!token) {
        console.error("No authentication token found.");
        return;
      }

      // Request reports from backend
      const response = await fetch(
        "http://127.0.0.1:8000/api/reports/",
        {
          headers: {
            Authorization: `Token ${token}`,
          },
        }
      );

      // Handle failed API response
      if (!response.ok) {
        console.error("API Error:", response.status);
        return;
      }

      // Convert response to JSON
      const data = await response.json();

      /**
       * Normalize backend response:
       * Convert snake_case fields into camelCase
       * for frontend consistency.
       */
      const formatted = data.map((item) => ({

        // Report ID
        id: String(item.id ?? ""),

        // Patient internal ID
        patientId: String(item.patient_id ?? ""),

        // National ID
        nationalId: String(item.patient_code ?? ""),

        // Patient name
        patientName: item.patient_name ?? "",

        // Report creation date
        date: item.date,

        // Report status
        status: "Completed",

        // Number of findings
        findings: item.findings || 0,

        // Patient age
        age: item.patient_age || 0,

        // AI summary text
        summary: item.summary || "",
      }));

      // Save formatted reports into state
      setReports(formatted);

    } catch (err) {

      // Handle network/server errors
      console.error(
        "Network Error fetching reports:",
        err
      );

    } finally {

      // Disable loading state
      setLoading(false);
    }
  };

  // ================= GROUPING + FILTERING =================

  /**
   * useMemo:
   * Optimizes performance by recalculating grouped reports
   * only when reports or searchQuery change.
   */
  const groupedReports = useMemo(() => {

    // Normalize search query
    const query = searchQuery.trim().toLowerCase();

    // Object used for grouping reports by patient
    const groups = {};

    // ---------- STEP 1: GROUP REPORTS BY PATIENT ----------

    reports.forEach((report) => {

      const patientId = report.patientId;

      // Create patient group if it doesn't exist
      if (!groups[patientId]) {

        groups[patientId] = {
          patientName: report.patientName,
          patientId: report.patientId,
          nationalId: report.nationalId,
          reports: [],
        };
      }

      // Add report to patient's reports array
      groups[patientId].reports.push(report);
    });

    // Convert grouped object into array
    const result = Object.values(groups);

    // ---------- STEP 2: SEARCH FILTERING ----------

    // Return all groups if search is empty
    if (!query) return result;

    // Filter groups using:
    // - Patient name
    // - Internal patient ID
    // - National ID
    return result.filter((group) => {

      const id = String(group.patientId);

      const nationalId = String(
        group.nationalId
      );

      const name = String(
        group.patientName
      ).toLowerCase();

      return (
        name.includes(query) ||
        id.includes(query) ||
        nationalId.includes(query)
      );
    });

  }, [reports, searchQuery]);

  // ================= UI RENDERING =================

  return (

    <div className={`page-layout ${isDarkMode ? "dark" : "light"}`}>

      <div className="page-content">

        {/* Page header */}
        <CustomHeader
          isDarkMode={isDarkMode}
          title="Reports"
          subtitle="View and manage all diagnostic reports (Grouped by Patient)"
        />

        {/* Search bar */}
        <PatientsSearchBar
          isDarkMode={isDarkMode}
          searchQuery={searchQuery}
          setSearchQuery={setSearchQuery}
          placeholder="Search by patient name or ID..."
        />

        {/* Reports statistics cards */}
        <ReportsStats reports={reports} />

        {/* Reports table with expandable grouped rows */}
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