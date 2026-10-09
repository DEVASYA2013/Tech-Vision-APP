import React, { useState } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { InstituteProvider } from './context/InstituteContext';
import { ToastProvider } from './components/ui/Toast';
import { Header } from './components/layout/Header';
import { Sidebar, NavTab } from './components/layout/Sidebar';
import { Login } from './pages/Login';
import { FirstAdminSetup } from './pages/FirstAdminSetup';
import { Dashboard } from './pages/Dashboard';
import { Enquiries } from './pages/Enquiries';
import { Students } from './pages/Students';
import { Batches } from './pages/Batches';
import { Attendance } from './pages/Attendance';
import { FeeManagement } from './pages/FeeManagement';
import { SeatManagement } from './pages/SeatManagement';
import { Courses } from './pages/Courses';
import { Reports } from './pages/Reports';
import { StaffManagement } from './pages/StaffManagement';
import { AIAssistant } from './pages/AIAssistant';
import { GoogleIntegrations } from './pages/GoogleIntegrations';
import { AuditLogs } from './pages/AuditLogs';
import { InstituteSettings } from './pages/InstituteSettings';
import { HelpBackup } from './pages/HelpBackup';
import { WifiOff, Loader2 } from 'lucide-react';

function useOnlineStatus() {
  const [isOnline, setIsOnline] = useState(
    typeof navigator !== 'undefined' ? navigator.onLine : true
  );

  React.useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  return isOnline;
}

const ADMIN_ONLY_TABS: NavTab[] = ['staff', 'audit', 'settings'];

const MainAppContent: React.FC = () => {
  const { currentUser, userProfile, isAdmin, loading } = useAuth();
  const [currentTab, setCurrentTab] = useState<NavTab>('dashboard');
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const [showFirstAdminView, setShowFirstAdminView] = useState(false);
  const isOnline = useOnlineStatus();

  // Reset tab to dashboard whenever user account changes (e.g. switching from Admin to Staff)
  React.useEffect(() => {
    setCurrentTab('dashboard');
  }, [currentUser?.uid]);

  // Immediately redirect away from admin-only tabs (such as Staff Management) if user role is Staff
  React.useEffect(() => {
    if (!loading && currentUser && (!isAdmin || userProfile?.role === 'staff')) {
      if (ADMIN_ONLY_TABS.includes(currentTab)) {
        setCurrentTab('dashboard');
      }
    }
  }, [loading, currentUser, isAdmin, userProfile?.role, currentTab]);

  const handleSelectTab = (tab: NavTab) => {
    if (ADMIN_ONLY_TABS.includes(tab) && (!isAdmin || userProfile?.role === 'staff')) {
      setCurrentTab('dashboard');
      return;
    }
    setCurrentTab(tab);
  };

  // Loading Screen
  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-slate-950 text-white">
        <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-cyan-600 to-blue-600 flex items-center justify-center mb-4 shadow-xl shadow-cyan-950/40 animate-pulse">
          <Loader2 className="w-6 h-6 animate-spin text-white" />
        </div>
        <div className="text-sm font-bold tracking-tight">TECH VISION COMPUTER CLASS</div>
        <div className="text-xs text-slate-400 mt-1">Connecting to Firestore Database...</div>
      </div>
    );
  }

  // First Admin Setup Screen
  if (showFirstAdminView) {
    return <FirstAdminSetup onBackToLogin={() => setShowFirstAdminView(false)} />;
  }

  // Not authenticated: Login Screen
  if (!currentUser) {
    return <Login onOpenFirstAdmin={() => setShowFirstAdminView(true)} />;
  }

  return (
    <InstituteProvider>
      <div className="min-h-screen bg-slate-100 flex flex-col antialiased font-sans text-slate-900">
        {/* Offline Warning Banner */}
        {!isOnline && (
          <div className="bg-amber-600 text-white text-xs font-bold py-1.5 px-4 text-center flex items-center justify-center gap-2 sticky top-0 z-50">
            <WifiOff className="w-3.5 h-3.5" />
            <span>Working in Offline Mode. Firestore local cache active.</span>
          </div>
        )}

        <div className="flex flex-1">
          {/* Sidebar */}
          <Sidebar
            currentTab={currentTab}
            setCurrentTab={handleSelectTab}
            isMobileOpen={isMobileOpen}
            setIsMobileOpen={setIsMobileOpen}
          />

          {/* Main Area */}
          <div className="flex-1 flex flex-col min-w-0 md:pl-64">
            <Header
              currentTab={currentTab}
              setCurrentTab={handleSelectTab}
              setIsMobileOpen={setIsMobileOpen}
            />

            <main className="flex-1 p-4 sm:p-8 max-w-7xl w-full mx-auto pb-16">
              {currentTab === 'dashboard' && (
                <Dashboard
                  onNavigate={(tab) => handleSelectTab(tab)}
                  onOpenAddStudent={() => handleSelectTab('students')}
                />
              )}
              {currentTab === 'enquiries' && <Enquiries />}
              {currentTab === 'students' && <Students />}
              {currentTab === 'batches' && <Batches />}
              {currentTab === 'attendance' && <Attendance />}
              {currentTab === 'fees' && <FeeManagement />}
              {currentTab === 'seats' && <SeatManagement />}
              {currentTab === 'courses' && <Courses />}
              {currentTab === 'reports' && <Reports />}
              {currentTab === 'staff' && isAdmin && userProfile?.role === 'admin' && <StaffManagement />}
              {currentTab === 'ai' && <AIAssistant />}
              {currentTab === 'google' && <GoogleIntegrations />}
              {currentTab === 'audit' && isAdmin && userProfile?.role === 'admin' && <AuditLogs />}
              {currentTab === 'settings' && isAdmin && userProfile?.role === 'admin' && <InstituteSettings />}
              {currentTab === 'backup' && <HelpBackup />}
            </main>
          </div>
        </div>
      </div>
    </InstituteProvider>
  );
};

export default function App() {
  return (
    <AuthProvider>
      <ToastProvider>
        <MainAppContent />
      </ToastProvider>
    </AuthProvider>
  );
}
