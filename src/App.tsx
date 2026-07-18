import { useState, useEffect, useCallback } from 'react';
import { Toaster } from 'react-hot-toast';
import toast from 'react-hot-toast';
import { AcademicProvider, useAcademic } from './context/AcademicContext';
import InputView from './components/InputView';
import Dashboard from './components/Dashboard';
import HelpGuide from './components/HelpGuide';
import Predictions from './components/Predictions';
import NotesHub from './components/NotesHub';
import NotificationsHub from './components/NotificationsHub';
import BacklogPlanner from './components/BacklogPlanner';
import GraceMarksChecker from './components/GraceMarksChecker';
import TabErrorBoundary from './components/TabErrorBoundary';
import type { TabType, Regulation } from './types';
import { decodeShareableData, decodeShareToken } from './utils/exportUtils';
import PageTransition from './components/motion/PageTransition';
import AppShell from './components/layout/AppShell';
import PrintableTranscript from './components/PrintableTranscript';
import CreditProgressDashboard from './components/CreditProgressDashboard';
import VaultUnlockBanner from './components/VaultUnlockBanner';

const TAB_LABELS: Record<TabType, string> = {
  input: 'Import Results',
  dashboard: 'Progress',
  predictions: 'Goal Planner',
  transcript: 'Report',
  notes: 'Study Library',
  credits: 'Credits',
  notifications: 'Updates',
  backlog: 'Backlog Plan',
  help: 'Help',
};

const HASH_TO_TAB: Record<string, TabType> = {
  import: 'input',
  input: 'input',
  progress: 'dashboard',
  dashboard: 'dashboard',
  credits: 'credits',
  backlog: 'backlog',
  report: 'transcript',
  transcript: 'transcript',
  goals: 'predictions',
  predictions: 'predictions',
  notes: 'notes',
  library: 'notes',
  updates: 'notifications',
  notifications: 'notifications',
  help: 'help',
};

const TAB_TO_HASH: Record<TabType, string> = {
  input: 'import',
  dashboard: 'progress',
  credits: 'credits',
  backlog: 'backlog',
  transcript: 'report',
  predictions: 'goals',
  notes: 'notes',
  notifications: 'updates',
  help: 'help',
};

function tabFromHash(): TabType {
  const raw = window.location.hash.replace(/^#\/?/, '').split('?')[0].toLowerCase();
  return HASH_TO_TAB[raw] || 'input';
}

function AppContent() {
  const [activeTab, setActiveTabState] = useState<TabType>(() =>
    typeof window !== 'undefined' ? tabFromHash() : 'input'
  );
  const { getCGPA, importSemesters, setStudentInfo, setRegulation, data } = useAcademic();
  const { cgpa, percentage } = getCGPA();

  const setActiveTab = useCallback((tab: TabType) => {
    setActiveTabState(tab);
    const hash = TAB_TO_HASH[tab] || 'import';
    const next = `#/${hash}`;
    if (window.location.hash !== next) {
      window.history.replaceState({}, '', `${window.location.pathname}${window.location.search}${next}`);
    }
  }, []);

  useEffect(() => {
    const onHash = () => setActiveTabState(tabFromHash());
    window.addEventListener('hashchange', onHash);
    if (!window.location.hash) {
      window.history.replaceState({}, '', `${window.location.pathname}${window.location.search}#/import`);
    }
    return () => window.removeEventListener('hashchange', onHash);
  }, []);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const shareData = params.get('share');
    const token = params.get('token');

    const loadShared = async () => {
      try {
        let decoded = null;
        if (token) decoded = await decodeShareToken(token);
        else if (shareData) decoded = decodeShareableData(shareData);

        if (decoded && decoded.semesters.length > 0) {
          importSemesters(decoded.semesters);
          if (decoded.studentName || decoded.hallTicket) {
            setStudentInfo(decoded.studentName, decoded.hallTicket);
          }
          if (decoded.regulation) setRegulation(decoded.regulation as Regulation);
          setActiveTab('dashboard');
          toast.success('Shared results loaded successfully!');
          window.history.replaceState({}, '', `${window.location.pathname}#/progress`);
        }
      } catch {
        toast.error('Invalid share link');
      }
    };
    if (shareData || token) loadShared();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const renderTab = () => {
    switch (activeTab) {
      case 'input':
        return <InputView onImportSuccess={() => setActiveTab('dashboard')} />;
      case 'dashboard':
        return <Dashboard />;
      case 'predictions':
        return <Predictions />;
      case 'transcript':
        return <PrintableTranscript />;
      case 'notes':
        return <NotesHub />;
      case 'credits':
        return <CreditProgressDashboard />;
      case 'notifications':
        return <NotificationsHub />;
      case 'backlog':
        return (
          <div className="space-y-8">
            <BacklogPlanner onOpenStudyLibrary={() => setActiveTab('notes')} />
            <GraceMarksChecker />
          </div>
        );
      case 'help':
        return <HelpGuide />;
      default:
        return <InputView />;
    }
  };

  return (
    <AppShell
      activeTab={activeTab}
      onTabChange={setActiveTab}
      cgpa={cgpa}
      percentage={percentage}
      studentName={data.studentName}
      hallTicket={data.hallTicket}
    >
      <PageTransition id={activeTab}>
        <TabErrorBoundary tabLabel={TAB_LABELS[activeTab] ?? 'Page'}>
          <VaultUnlockBanner />
          {renderTab()}
        </TabErrorBoundary>
      </PageTransition>
    </AppShell>
  );
}

const toastStyle = {
  background: 'rgba(0, 0, 0, 0.92)',
  color: '#fafafa',
  border: '1px solid rgba(255,255,255,0.08)',
  backdropFilter: 'blur(16px)',
  borderRadius: '12px',
  fontSize: '0.8125rem',
  fontWeight: 550,
  fontFamily: 'Outfit, sans-serif',
};

export default function App() {
  return (
    <AcademicProvider>
      <Toaster
        position="top-right"
        toastOptions={{
          style: toastStyle,
          success: { iconTheme: { primary: '#22c55e', secondary: '#000000' } },
          error: { iconTheme: { primary: '#c41e3a', secondary: '#000000' } },
        }}
      />
      <AppContent />
    </AcademicProvider>
  );
}
