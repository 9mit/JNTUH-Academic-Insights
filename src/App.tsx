import { useState } from 'react';
import { Toaster } from 'react-hot-toast';
import { AcademicProvider, useAcademic } from './context/AcademicContext';
import InputView from './components/InputView';
import Dashboard from './components/Dashboard';
import Predictions from './components/Predictions';
import PrintableTranscript from './components/PrintableTranscript';
import HelpGuide from './components/HelpGuide';
import NotesChatbot from './components/NotesChatbot';
import type { TabType } from './types';
import { GraduationCap, LayoutDashboard, Brain, FileText, PenLine, Zap, ChevronRight, HelpCircle, BookOpen } from 'lucide-react';
import { motion } from 'framer-motion';

// Motion Components
import SmoothScroll from './components/motion/SmoothScroll';
import PageTransition from './components/motion/PageTransition';

const NAV_ITEMS: { id: TabType; label: string; icon: React.ElementType }[] = [
  { id: 'input', label: 'Academic Walkthrough', icon: PenLine },
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { id: 'predictions', label: 'Insights', icon: Brain },
  { id: 'notes', label: 'Notes Hub', icon: BookOpen },
  { id: 'transcript', label: 'Transcript', icon: FileText },
  { id: 'help', label: 'How to Use', icon: HelpCircle },
];

function AppContent() {
  const [activeTab, setActiveTab] = useState<TabType>('input');
  const { getCGPA } = useAcademic();
  const { cgpa, percentage } = getCGPA();

  return (
    <SmoothScroll>
      <div className="min-h-screen flex">
        <aside className="w-72 bg-sidebar border-r border-white/5 flex flex-col fixed h-screen no-print z-50">
          {/* Logo */}
          <div className="p-8 border-b border-white/5 relative overflow-hidden group">
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-primary to-transparent opacity-50" />
            <div className="flex items-center gap-4 relative z-10">
              <div className="relative">
                <div className="absolute inset-0 bg-primary rounded-2xl blur-xl opacity-40 animate-pulse" />
                <div className="relative w-14 h-14 bg-gradient-to-br from-gray-900 to-black rounded-2xl flex items-center justify-center border border-white/10 shadow-2xl group-hover:border-primary/50 transition-colors duration-500">
                  <div className="absolute inset-0 bg-gradient-to-br from-primary/20 to-transparent rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                  <GraduationCap className="w-7 h-7 text-white relative z-10 drop-shadow-[0_0_10px_rgba(56,189,248,0.5)]" />
                </div>
              </div>
              <div>
                <h1 className="text-xl font-black text-white tracking-tight drop-shadow-md">JNTUH</h1>
                <div className="flex items-center gap-1.5">
                  <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  <p className="text-[10px] font-bold text-transparent bg-clip-text bg-gradient-to-r from-primary to-cyan-300 uppercase tracking-[0.2em]">Academic Pro</p>
                </div>
              </div>
            </div>
          </div>

          {/* Navigation */}
          <nav className="flex-1 p-6 space-y-2">
            <p className="text-[10px] font-bold text-text-muted uppercase tracking-[0.2em] mb-4 px-4 flex items-center gap-2">
              <span className="text-primary">◆</span> Navigation
            </p>
            {NAV_ITEMS.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              return (
                <div key={item.id} className="relative group">
                  {isActive && (
                    <motion.div
                      layoutId="activeTab"
                      className="absolute inset-0 bg-gradient-to-r from-primary/10 to-transparent border-l-2 border-primary rounded-r-xl"
                      initial={false}
                      transition={{ type: "spring", stiffness: 300, damping: 30 }}
                    />
                  )}
                  <button
                    onClick={() => setActiveTab(item.id)}
                    className={`w-full flex items-center gap-4 px-4 py-3.5 rounded-xl text-left relative z-10 transition-all duration-300
                        ${isActive
                        ? 'text-white'
                        : 'text-text-muted hover:text-white hover:translate-x-1'
                      }`}
                  >
                    <Icon className={`w-5 h-5 transition-colors duration-300 ${isActive ? 'text-primary drop-shadow-[0_0_8px_rgba(56,189,248,0.5)]' : 'group-hover:text-white'}`} />
                    <span className={`font-semibold text-sm tracking-wide ${isActive ? 'text-shadow-sm' : ''}`}>{item.label}</span>
                    {isActive && (
                      <motion.div
                        initial={{ scale: 0, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        className="ml-auto"
                      >
                        <ChevronRight className="w-4 h-4 text-primary" />
                      </motion.div>
                    )}
                  </button>
                </div>
              );
            })}
          </nav>

          {/* Stats Preview */}
          <div className="p-6 border-t border-white/5">
            <p className="text-[10px] font-bold text-text-muted uppercase tracking-[0.2em] mb-4 flex items-center gap-2">
              <span className="text-emerald-400">◈</span> Quick Stats
            </p>
            <div className="relative overflow-hidden bg-gradient-to-b from-gray-900 to-black rounded-2xl p-5 border border-white/10 group hover:border-primary/30 transition-colors duration-500">
              <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />

              {/* Shimmer Effect */}
              <div className="absolute inset-0 -translate-x-[150%] group-hover:translate-x-[150%] transition-transform duration-1000 bg-gradient-to-r from-transparent via-white/5 to-transparent z-0" />

              <div className="flex items-center gap-2 mb-4 relative z-10">
                <div className="p-1 rounded bg-primary/10">
                  <Zap className="w-3.5 h-3.5 text-primary" />
                </div>
                <span className="text-[10px] font-extrabold text-primary uppercase tracking-widest">Quick Stats</span>
              </div>

              <div className="grid grid-cols-2 gap-4 relative z-10 border-t border-white/5 pt-4">
                <div>
                  <p className="text-2xl font-black text-white group-hover:text-primary transition-colors duration-300">{cgpa > 0 ? cgpa.toFixed(2) : '—'}</p>
                  <p className="text-[9px] text-text-muted font-bold uppercase tracking-wider mt-1">CGPA</p>
                </div>
                <div>
                  <p className="text-2xl font-black text-white group-hover:text-emerald-400 transition-colors duration-300">{percentage > 0 ? percentage.toFixed(1) : '—'}%</p>
                  <p className="text-[9px] text-text-muted font-bold uppercase tracking-wider mt-1">Score</p>
                </div>
              </div>
            </div>
          </div>
        </aside>

        {/* Main Content */}
        <main className="flex-1 ml-72">
          {/* Top Bar - Grand Centered Design */}
          <header className="sticky top-0 z-40 bg-black/90 border-b border-white/5 no-print">
            <div className="px-10 py-8 text-center">
              <h2 className="text-3xl font-black text-white tracking-tight bg-gradient-to-r from-white via-primary to-white bg-clip-text">
                {NAV_ITEMS.find(i => i.id === activeTab)?.label}
              </h2>
              <p className="text-sm text-text-muted mt-2 max-w-md mx-auto">
                {activeTab === 'dashboard' && 'Track your academic performance'}
                {activeTab === 'input' && 'Import and manage your results'}
                {activeTab === 'predictions' && 'AI-powered grade predictions'}
                {activeTab === 'notes' && 'Download R18 & R22 notes'}
                {activeTab === 'transcript' && 'Generate official transcripts'}
                {activeTab === 'help' && 'Complete walkthrough guide'}
              </p>
            </div>
          </header>

          {/* Page Content */}
          <div className="p-10">
            <PageTransition id={activeTab} mode="wait">
              {activeTab === 'input' && <InputView />}
              {activeTab === 'dashboard' && <Dashboard />}
              {activeTab === 'predictions' && <Predictions />}
              {activeTab === 'notes' && <NotesChatbot />}
              {activeTab === 'transcript' && <PrintableTranscript />}
              {activeTab === 'help' && <HelpGuide />}
            </PageTransition>
          </div>
        </main>
      </div>
    </SmoothScroll>
  );
}

function App() {
  return (
    <AcademicProvider>
      <Toaster position="top-right" />
      <AppContent />
    </AcademicProvider>
  );
}

export default App;

