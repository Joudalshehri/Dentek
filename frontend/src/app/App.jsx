import { useState } from 'react';
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
  const [currentPage, setCurrentPage] = useState('landing');
  const [selectedPatientId, setSelectedPatientId] = useState(null);
  const [selectedXrayId, setSelectedXrayId] = useState(null);
  const [analysisData, setAnalysisData] = useState(null);
  // حالة جديدة لحفظ الصفحة السابقة
  const [sourcePage, setSourcePage] = useState('patient-details');

  const handleSelectPatient = (patientId) => {
    setSelectedPatientId(patientId);
    localStorage.setItem('selectedPatientId', patientId);
    setCurrentPage('patient-details');
  };

  const handleAnalyzeXray = (xrayId) => {
    setSelectedXrayId(xrayId);
    setAnalysisData(null);
    setSourcePage('patient-details'); // المصدر هنا هو صفحة تفاصيل المريض
    setCurrentPage('ai-analysis');
  };

 const handleViewReport = async (reportId) => {
  try {
    const token = localStorage.getItem("token");

    const response = await fetch(
      `http://127.0.0.1:8000/api/xrays/${reportId}/analysis/`,
      {
        headers: {
          Authorization: `Token ${token}`,
        },
      }
    );

    if (!response.ok) {
      console.error("Failed to load report:", response.status);
      alert("Failed to load report");
      return;
    }

    const data = await response.json();

    const reportsResponse = await fetch("http://127.0.0.1:8000/api/reports/", {
      headers: {
        Authorization: `Token ${token}`,
      },
    });

    const reports = await reportsResponse.json();

    const selectedReport = reports.find(
      (r) => String(r.id) === String(reportId)
    );

    if (selectedReport) {
      setSelectedPatientId(String(selectedReport.patient_id));
      localStorage.setItem(
        "selectedPatientId",
        String(selectedReport.patient_id)
      );
      localStorage.setItem("selectedPatientName", selectedReport.patient_name);
      localStorage.setItem(
        "selectedPatientAge",
        String(selectedReport.patient_age)
      );
    }

    setAnalysisData(data);
    setSelectedXrayId(reportId);
    localStorage.setItem("latestAnalysis", JSON.stringify(data));

    setSourcePage("reports");
    setCurrentPage("ai-analysis");
  } catch (error) {
    console.error("Error loading report:", error);
    alert("Error loading report");
  }
};

  const handleBackToPatients = () => {
    setCurrentPage('patients');
    setSelectedPatientId(null);
    setSelectedXrayId(null);
    setAnalysisData(null);
  };

  const handleBackFromAnalysis = () => {
    // العودة بناءً على المصدر
    if (sourcePage === 'reports') {
      setCurrentPage('reports');
    } else {
      setCurrentPage('patient-details');
    }
    setSelectedXrayId(null);
  };

  const handleNavigateMain = (page) => {
    setCurrentPage(page);
  };

  const handleLogout = () => {
    setCurrentPage('landing');
    setSelectedPatientId(null);
    setSelectedXrayId(null);
    setAnalysisData(null);
    localStorage.removeItem('latestAnalysis');
    localStorage.removeItem('selectedPatientId');
    localStorage.removeItem('selectedPatientName');
    localStorage.removeItem('selectedPatientAge');
  };

  return (
    <DarkModeProvider>
      {currentPage === 'landing' && (
        <LandingPage onNavigateToLogin={() => setCurrentPage('login')} />
      )}

      {currentPage === 'login' && (
        <LoginPage
          onNavigateToLanding={() => setCurrentPage('landing')}
          onLoginSuccess={() => setCurrentPage('patients')}
          onNavigateToForgotPassword={() => setCurrentPage('forgot-password')}
        />
      )}

      {currentPage === 'forgot-password' && (
        <ForgotPasswordPage
          onBackToLogin={() => setCurrentPage('login')}
        />
      )}

      {currentPage === 'patient-details' && selectedPatientId && (
        <PatientDetailsPage
          patientId={selectedPatientId}
          onBack={handleBackToPatients}
          onAnalyzeXray={handleAnalyzeXray}
        />
      )}

      {currentPage === 'ai-analysis' && selectedXrayId && selectedPatientId && (
        <AIAnalysisPage
          xrayId={selectedXrayId}
          patientId={selectedPatientId}
          onBack={handleBackFromAnalysis}
          analysisData={analysisData}
          // نمرر النص بناءً على المصدر
          backText={sourcePage === 'reports' ? "Back to Reports Page" : "Back to Patient Details"}
        />
      )}

      {(currentPage === 'patients' ||
        currentPage === 'reports' ||
        currentPage === 'settings') && (
          <MainLayout
            currentPage={currentPage}
            onNavigate={handleNavigateMain}
            onLogout={handleLogout}
          >
            {currentPage === 'patients' && (
              <PatientsPage onSelectPatient={handleSelectPatient} />
            )}

            {currentPage === 'reports' && (
              <ReportsPage onViewReport={handleViewReport} />
            )}

            {currentPage === 'settings' && <SettingsPage />}
          </MainLayout>
        )}
    </DarkModeProvider>
  );
}