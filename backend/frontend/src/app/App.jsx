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

  const [currentPage, setCurrentPage] = useState('landing');
  const [selectedPatientId, setSelectedPatientId] = useState(null);
  const [selectedXrayId, setSelectedXrayId] = useState(null);
  const [analysisData, setAnalysisData] = useState(null);
  const [sourcePage, setSourcePage] = useState('patient-details');

  // ✅ أهم شيء: البروفايل العالمي (shared state)
  const [profile, setProfile] = useState({
    username: '',
    email: ''
  });

  // ✅ جلب البروفايل مرة واحدة عند تشغيل التطبيق
  useEffect(() => {
  const fetchProfile = async () => {
    try {
      const res = await fetch('http://127.0.0.1:8000/api/profile/', {
        headers: {
          Authorization: `Token ${localStorage.getItem("token")}`,
        },
      });

      if (!res.ok) return;

      const data = await res.json();

      setProfile({
        username: data.username || '',
        email: data.email || '',
      });

    } catch (err) {
      console.error(err);
    }
  };

  // 🔥 مهم: لا تجيبي profile إلا لو فيه token
  if (localStorage.getItem("token")) {
    fetchProfile();
  }

}, [currentPage]); // أو [] لو تبينه مرة واحدة فقط

  // ================= NAVIGATION =================

  const handleSelectPatient = (patientId) => {
    setSelectedPatientId(patientId);
    localStorage.setItem('selectedPatientId', patientId);
    setCurrentPage('patient-details');
  };

  const handleAnalyzeXray = (xrayId) => {
    setSelectedXrayId(xrayId);
    setAnalysisData(null);
    setSourcePage('patient-details');
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
        localStorage.setItem("selectedPatientId", selectedReport.patient_id);
      }

      setAnalysisData(data);
      setSelectedXrayId(reportId);
      setSourcePage("reports");
      setCurrentPage("ai-analysis");

    } catch (error) {
      console.error(error);
    }
  };

  const handleBackToPatients = () => {
    setCurrentPage('patients');
    setSelectedPatientId(null);
    setSelectedXrayId(null);
    setAnalysisData(null);
  };

  const handleBackFromAnalysis = () => {
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

    setProfile({
      username: '',
      email: ''
    });

    localStorage.clear();
  };

  // ================= RENDER =================

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
          backText={sourcePage === 'reports'
            ? "Back to Reports Page"
            : "Back to Patient Details"
          }
        />
      )}

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
          {currentPage === 'patients' && (
            <PatientsPage onSelectPatient={handleSelectPatient} />
          )}

          {currentPage === 'reports' && (
            <ReportsPage onViewReport={handleViewReport} />
          )}

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