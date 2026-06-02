import { useState, useEffect } from 'react';
import { DarkModeProvider } from '@/app/contexts/DarkModeContext';
import { MainLayout } from './components/MainLayout';
import { PatientsPage } from '@/app/components/PatientsPage';
import { PatientDetailsPage } from '@/app/components/PatientDetailsPage';
import { AIAnalysisPage } from '@/app/components/AIAnalysisPage';
import { ReportsPage } from './components/ReportsPage';
import { SettingsPage } from './components/SettingsPage';
import { LandingPage } from "@/app/components/LandingPage";
import { LoginPage } from '@/app/components/LoginPage';
import { ForgotPasswordPage } from '@/app/components/ForgotPasswordPage';

export default function App() {

  // ================= GLOBAL APP STATE =================

  // Tracks which page is currently displayed
  const [currentPage, setCurrentPage] = useState('landing');

  // Stores selected patient ID
  const [selectedPatientId, setSelectedPatientId] = useState(null);

  // Stores selected X-ray ID
  const [selectedXrayId, setSelectedXrayId] = useState(null);

  // Stores AI analysis result data
  const [analysisData, setAnalysisData] = useState(null);

  // Tracks which page opened the AI analysis page
  const [sourcePage, setSourcePage] = useState('patient-details');

  // Shared profile state across the whole application
  const [profile, setProfile] = useState({
    username: '',
    email: ''
  });

  // ================= FETCH USER PROFILE =================

  // Fetch profile when app loads or page changes
  useEffect(() => {

    const fetchProfile = async () => {

      try {

        // Request profile data from backend
        const res = await fetch(
          'http://127.0.0.1:8000/api/profile/',
          {
            headers: {
              Authorization: `Token ${localStorage.getItem("token")}`,
            },
          }
        );

        // Stop if request failed
        if (!res.ok) return;

        // Convert response to JSON
        const data = await res.json();

        // Update shared profile state
        setProfile({
          username: data.username || '',
          email: data.email || '',
        });

      } catch (err) {

        // Log connection/server errors
        console.error(err);
      }
    };

    // Fetch profile only if token exists
    if (localStorage.getItem("token")) {
      fetchProfile();
    }

  }, [currentPage]);

  // ================= NAVIGATION FUNCTIONS =================

  // Open selected patient details page
  const handleSelectPatient = (patientId) => {

    setSelectedPatientId(patientId);

    // Save selected patient in local storage
    localStorage.setItem('selectedPatientId', patientId);

    // Navigate to patient details page
    setCurrentPage('patient-details');
  };

  // Open AI analysis page for selected X-ray
  const handleAnalyzeXray = (xrayId) => {

    setSelectedXrayId(xrayId);

    // Clear old analysis data
    setAnalysisData(null);

    // Save source page
    setSourcePage('patient-details');

    // Navigate to AI analysis page
    setCurrentPage('ai-analysis');
  };

  // Open report details and AI analysis
  const handleViewReport = async (reportId) => {

    try {

      const token = localStorage.getItem("token");

      // Fetch AI analysis result
      const response = await fetch(
        `http://127.0.0.1:8000/api/xrays/${reportId}/analysis/`,
        {
          headers: {
            Authorization: `Token ${token}`,
          },
        }
      );

      const data = await response.json();

      // Fetch reports list
      const reportsResponse = await fetch(
        "http://127.0.0.1:8000/api/reports/",
        {
          headers: {
            Authorization: `Token ${token}`,
          },
        }
      );

      const reports = await reportsResponse.json();

      // Find selected report
      const selectedReport = reports.find(
        (r) => String(r.id) === String(reportId)
      );

      // Save patient ID related to selected report
      if (selectedReport) {

        setSelectedPatientId(
          String(selectedReport.patient_id)
        );

        localStorage.setItem(
          "selectedPatientId",
          selectedReport.patient_id
        );
      }

      // Save analysis data
      setAnalysisData(data);

      // Save selected X-ray ID
      setSelectedXrayId(reportId);

      // Track source page
      setSourcePage("reports");

      // Navigate to analysis page
      setCurrentPage("ai-analysis");

    } catch (error) {

      // Log unexpected errors
      console.error(error);
    }
  };

  // Return from patient details page to patients page
  const handleBackToPatients = () => {

    setCurrentPage('patients');

    setSelectedPatientId(null);
    setSelectedXrayId(null);
    setAnalysisData(null);
  };

  // Return from AI analysis page
  const handleBackFromAnalysis = () => {

    // Return to reports page if opened from reports
    if (sourcePage === 'reports') {

      setCurrentPage('reports');

    } else {

      // Otherwise return to patient details
      setCurrentPage('patient-details');
    }

    // Clear selected X-ray
    setSelectedXrayId(null);
  };

  // Main sidebar/page navigation
  const handleNavigateMain = (page) => {
    setCurrentPage(page);
  };

  // Logout user and clear all saved state
  const handleLogout = () => {

    // Navigate back to landing page
    setCurrentPage('landing');

    // Clear all selected data
    setSelectedPatientId(null);
    setSelectedXrayId(null);
    setAnalysisData(null);

    // Reset profile state
    setProfile({
      username: '',
      email: ''
    });

    // Remove all saved local storage data
    localStorage.clear();
  };

  // ================= UI RENDERING =================

  return (

    <DarkModeProvider>

      {/* Landing Page */}
      {currentPage === 'landing' && (
        <LandingPage
          onNavigateToLogin={() => setCurrentPage('login')}
        />
      )}

      {/* Login Page */}
      {currentPage === 'login' && (
        <LoginPage
          onNavigateToLanding={() => setCurrentPage('landing')}
          onLoginSuccess={() => setCurrentPage('patients')}
          onNavigateToForgotPassword={() => setCurrentPage('forgot-password')}
        />
      )}

      {/* Forgot Password Page */}
      {currentPage === 'forgot-password' && (
        <ForgotPasswordPage
          onBackToLogin={() => setCurrentPage('login')}
        />
      )}

      {/* Patient Details Page */}
      {currentPage === 'patient-details' && selectedPatientId && (
        <PatientDetailsPage
          patientId={selectedPatientId}
          onBack={handleBackToPatients}
          onAnalyzeXray={handleAnalyzeXray}
        />
      )}

      {/* AI Analysis Page */}
      {currentPage === 'ai-analysis' &&
        selectedXrayId &&
        selectedPatientId && (

        <AIAnalysisPage
          xrayId={selectedXrayId}
          patientId={selectedPatientId}
          onBack={handleBackFromAnalysis}
          analysisData={analysisData}

          backText={
            sourcePage === 'reports'
              ? "Back to Reports Page"
              : "Back to Patient Details"
          }
        />
      )}

      {/* Main Pages Layout */}
      {(currentPage === 'patients' ||
        currentPage === 'reports' ||
        currentPage === 'settings') && (

        <MainLayout
          currentPage={currentPage}
          onNavigate={handleNavigateMain}
          onLogout={handleLogout}
          profile={profile}
          setProfile={setProfile}
        >

          {/* Patients Page */}
          {currentPage === 'patients' && (
            <PatientsPage
              onSelectPatient={handleSelectPatient}
            />
          )}

          {/* Reports Page */}
          {currentPage === 'reports' && (
            <ReportsPage
              onViewReport={handleViewReport}
            />
          )}

          {/* Settings Page */}
          {currentPage === 'settings' && (
            <SettingsPage
              profile={profile}
              setProfile={setProfile}
            />
          )}

        </MainLayout>
      )}

    </DarkModeProvider>
  );
}