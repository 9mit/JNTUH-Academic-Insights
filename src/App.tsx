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
import JobsPortal from './components/jobs/JobsPortal';
import ResultContrast from './components/ResultContrast';
import AcademicCalendarsHub from './components/AcademicCalendarsHub';
import ClassResultExplorer from './components/ClassResultExplorer';
import AcademicJourneyWrapped from './components/AcademicJourneyWrapped';

const TAB_LABELS: Record<TabType, string> = {
  input: 'Import Results',
  dashboard: 'Progress',
  predictions: 'Goal Planner',
  transcript: 'Report',
  notes: 'Study Library',
  credits: 'Credits',
  notifications: 'Updates',
  backlog: 'Backlog Plan',
  jobs: 'Opportunities',
  compare: 'Compare Results',
  calendars: 'Calendars',
  class: 'Class Leaderboard',
  journey: 'Journey & Wrapped',
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
  notices: 'notifications',
  update: 'jobs',
  jobs: 'jobs',
  opportunities: 'jobs',
  careers: 'jobs',
  compare: 'compare',
  contrast: 'compare',
  benchmark: 'compare',
  calendars: 'calendars',
  calendar: 'calendars',
  almanac: 'calendars',
  class: 'class',
  batch: 'class',
  leaderboard: 'class',
  section: 'class',
  journey: 'journey',
  wrapped: 'journey',
  odyssey: 'journey',
  story: 'journey',
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
  jobs: 'update',
  compare: 'compare',
  calendars: 'calendars',
  class: 'class',
  journey: 'journey',
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
      case 'jobs':
        return <JobsPortal />;
      case 'compare':
        return <ResultContrast />;
      case 'calendars':
        return <AcademicCalendarsHub />;
      case 'class':
        return <ClassResultExplorer onSelectStudent={() => setActiveTab('compare')} />;
      case 'journey':
        return <AcademicJourneyWrapped />;
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
  background: '#FFFFFF',
  color: '#111318',
  border: '1px solid #E8EAF0',
  boxShadow: '0 8px 30px rgba(17, 19, 24, 0.12), 0 1px 3px rgba(17, 19, 24, 0.05)',
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
          success: { iconTheme: { primary: '#16a34a', secondary: '#FFFFFF' } },
          error: { iconTheme: { primary: '#dc2626', secondary: '#FFFFFF' } },
        }}
      />
      <AppContent />
    </AcademicProvider>
  );
}
