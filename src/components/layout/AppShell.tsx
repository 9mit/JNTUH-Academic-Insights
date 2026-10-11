import { useState, useEffect, useRef, type ReactNode } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  LayoutDashboard, FileText, HelpCircle, PenLine,
  Brain, BookOpen, Menu, X, Bell, Coins, Target, ChevronRight, Briefcase,
  Users, CalendarDays, Search, Trophy, Sparkles,
} from 'lucide-react';
import type { TabType } from '../../types';
import AmbientBackground from '../ui/AmbientBackground';
import CommandPalette from '../ui/CommandPalette';

interface NavItem {
  id: TabType;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  badge?: string;
}

const NAV_SECTIONS: { title: string; items: NavItem[] }[] = [
  {
    title: 'Academics',
    items: [
      { id: 'input', label: 'Import Results', icon: PenLine },
      { id: 'dashboard', label: 'Progress', icon: LayoutDashboard },
      { id: 'journey', label: 'Journey & Wrapped', icon: Sparkles },
      { id: 'class', label: 'Class Leaderboard', icon: Trophy },
      { id: 'compare', label: 'Compare Results', icon: Users },
      { id: 'credits', label: 'Credits', icon: Coins },
      { id: 'backlog', label: 'Backlog Plan', icon: Target },
      { id: 'transcript', label: 'Report', icon: FileText },
    ],
  },
  {
    title: 'Plan & Learn',
    items: [
      { id: 'predictions', label: 'Goal Planner', icon: Brain },
      { id: 'notes', label: 'Study Library', icon: BookOpen },
    ],
  },
  {
    title: 'Campus',
    items: [
      { id: 'jobs', label: 'Opportunities', icon: Briefcase, badge: 'Live' },
      { id: 'calendars', label: 'Calendars', icon: CalendarDays },
      { id: 'notifications', label: 'Updates', icon: Bell, badge: 'Live' },
      { id: 'help', label: 'Help', icon: HelpCircle },
    ],
  },
];

const TAB_SUBTITLES: Partial<Record<TabType, string>> = {
  dashboard: 'Trajectory, grades, and semester-level signal',
  input: 'Hall ticket, PDF memos, or manual semester entry',
  journey: 'Four-year degree trajectory, comeback milestones, and year-in-review',
  class: 'Section rank list, class mean CGPA, and branch topper analysis',
  compare: 'Benchmark two student careers subject-by-subject and semester-by-semester',
  predictions: 'Targets, what-if scenarios, and semester goals',
  transcript: 'Printable academic report',
  notes: 'Study materials, syllabus units, and revision packs',
  credits: 'Year-wise progress toward degree requirements',
  calendars: 'Official university schedules, mid exam milestones, and deadlines',
  notifications: 'Results, timetables, and academic notices',
  jobs: 'Fresh verified job openings and campus opportunities',
  backlog: 'Recovery plan and grace marks eligibility',
  help: 'How to use Academic Insights',
};

const ALL_NAV = NAV_SECTIONS.flatMap(s => s.items);

interface AppShellProps {
  activeTab: TabType;
  onTabChange: (tab: TabType) => void;
  cgpa: number;
  percentage: number;
  studentName?: string;
  hallTicket?: string;
  children: ReactNode;
}

export default function AppShell({
  activeTab,
  onTabChange,
  cgpa,
  percentage,
  studentName,
  hallTicket,
  children,
}: AppShellProps) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [navOverflow, setNavOverflow] = useState(false);
  const navRef = useRef<HTMLElement>(null);
  const activeLabel = ALL_NAV.find(i => i.id === activeTab)?.label ?? 'Home';

  useEffect(() => {
    document.title = `${activeLabel} — JNTUH Academic Insights`;
  }, [activeLabel]);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setPaletteOpen((prev: boolean) => !prev);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

  useEffect(() => {
    const nav = navRef.current;
    if (!nav) return;

    const syncOverflow = () => {
      setNavOverflow(nav.scrollHeight > nav.clientHeight + 2);
    };

    syncOverflow();
    const observer = new ResizeObserver(syncOverflow);
    observer.observe(nav);

    return () => observer.disconnect();
  }, [studentName, hallTicket]);

  useEffect(() => {
    const active = navRef.current?.querySelector('.nav-item-active');
    active?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    const content = document.querySelector('.app-content');
    if (content) content.scrollTop = 0;
  }, [activeTab]);

  const selectTab = (id: TabType) => {
    onTabChange(id);
    setMobileOpen(false);
  };

  return (
    <div className="app-shell">
      <AmbientBackground />

      <AnimatePresence>
        {mobileOpen && (
          <motion.button
            type="button"
            aria-label="Close menu"
            className="mobile-scrim no-print"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setMobileOpen(false)}
          />
        )}
      </AnimatePresence>

      <aside className={`app-sidebar no-print ${mobileOpen ? 'sidebar-open' : ''}`}>
        <div className="sidebar-brand">
          <div className="min-w-0 flex-1">
            <span className="brand-eyebrow font-mono text-[10px] text-accent tracking-widest uppercase font-bold block leading-none mb-1">JNTUH</span>
            <h1 className="brand-title text-base font-bold text-text-primary tracking-tight truncate">Academic Insights</h1>
          </div>
          <button type="button" className="sidebar-close lg:hidden" onClick={() => setMobileOpen(false)} aria-label="Close navigation">
            <X className="w-4 h-4" />
          </button>
        </div>

        {(studentName || hallTicket) && (
          <div className="mx-3 mt-3 p-3 rounded-xl bg-surface-subtle border border-border shrink-0 shadow-xs">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-accent/10 border border-accent/25 flex items-center justify-center text-accent text-xs font-bold font-mono shadow-xs shrink-0">
                {(studentName || 'ST').split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase()}
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-xs font-semibold text-text-primary truncate" title={studentName || 'Student Record'}>
                  {studentName || 'Verified Candidate'}
                </p>
                {hallTicket && (
                  <p className="text-[11px] font-mono text-accent font-semibold tracking-wide">
                    {hallTicket}
                  </p>
                )}
              </div>
            </div>
          </div>
        )}

        <nav
          ref={navRef}
          className={`sidebar-nav custom-scrollbar${navOverflow ? ' sidebar-nav--overflow' : ''}`}
          aria-label="Primary"
        >
          {NAV_SECTIONS.map(section => (
            <div key={section.title} className="nav-section">
              <p className="nav-section-label">{section.title}</p>
              <div className="nav-section-items">
                {section.items.map(item => {
                  const Icon = item.icon;
                  const active = activeTab === item.id;
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => selectTab(item.id)}
                      className={`nav-item ${active ? 'nav-item-active' : ''}`}
                      aria-current={active ? 'page' : undefined}
                    >
                      {active && <motion.span layoutId="nav-pill" className="nav-pill" transition={{ type: 'spring', stiffness: 380, damping: 34 }} />}
                      <span className="nav-icon-wrap">
                        <Icon className="w-3.5 h-3.5" />
                      </span>
                      <span className="nav-label">{item.label}</span>
                      {item.badge && (
                        <span className={`nav-badge ${
                          item.badge === 'Viral' ? 'bg-pink-50 text-pink-600 border border-pink-200' :
                          item.badge === 'New' ? 'bg-emerald-50 text-emerald-600 border border-emerald-200' :
                          'bg-blue-50 text-blue-600 border border-blue-200'
                        }`}>
                          {item.badge}
                        </span>
                      )}
                      {active && <ChevronRight className="w-3 h-3 ml-auto opacity-70 relative z-[1]" />}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>

        <div className="sidebar-footer">
          <div className="stats-orb-card bg-surface-card border border-border p-3 rounded-xl shadow-xs">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[10px] font-mono uppercase tracking-wider text-text-muted">Standing</span>
              <span className={`text-[10px] font-mono px-2 py-0.5 rounded-full font-semibold border ${
                cgpa >= 7.5 ? 'text-emerald-700 bg-emerald-50 border-emerald-200' :
                cgpa >= 6.0 ? 'text-blue-700 bg-blue-50 border-blue-200' :
                'text-amber-700 bg-amber-50 border-amber-200'
              }`}>
                {cgpa >= 7.5 ? 'Honors' : cgpa >= 6.0 ? 'Cleared' : 'In Progress'}
              </span>
            </div>
            <div className="grid grid-cols-2 gap-2 text-center">
              <div className="p-2 rounded-lg bg-surface-subtle border border-border">
                <p className="font-mono text-base font-bold text-text-primary leading-none">
                  {cgpa > 0 ? cgpa.toFixed(2) : '—'}
                </p>
                <p className="text-[9px] uppercase tracking-wider text-text-muted mt-1 font-mono font-medium">CGPA</p>
              </div>
              <div className="p-2 rounded-lg bg-surface-subtle border border-border">
                <p className="font-mono text-base font-bold text-accent leading-none">
                  {percentage > 0 ? `${percentage.toFixed(1)}%` : '—'}
                </p>
                <p className="text-[9px] uppercase tracking-wider text-text-muted mt-1 font-mono font-medium">Score</p>
              </div>
            </div>
          </div>
        </div>
      </aside>

      <div className="app-main">
        <header className="app-topbar no-print flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <button type="button" className="mobile-menu-btn lg:hidden" onClick={() => setMobileOpen(true)} aria-label="Open navigation">
              <Menu className="w-5 h-5 text-text-primary" />
            </button>
            <div className="topbar-center min-w-0">
              <div className="flex items-center gap-2 text-[11px] font-mono text-text-muted">
                <span>Academic Insights</span>
                <span>/</span>
                <span className="text-accent font-semibold">{activeLabel}</span>
              </div>
              <h2 className="topbar-title truncate text-lg font-bold text-text-primary">{activeLabel}</h2>
              <p className="topbar-subtitle text-xs text-text-muted truncate hidden sm:block">{TAB_SUBTITLES[activeTab]}</p>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-shrink-0">

            <button
              type="button"
              onClick={() => setPaletteOpen(true)}
              className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-surface-subtle hover:bg-white border border-border text-xs text-text-muted hover:text-text-primary transition-all cursor-pointer active:scale-95 shadow-xs"
              title="Search tools and navigation (Cmd+K)"
            >
              <Search className="w-3.5 h-3.5 text-text-muted" />
              <span className="hidden md:inline font-medium">Search...</span>
              <kbd className="hidden sm:inline px-1.5 py-0.5 rounded bg-white border border-border text-[10px] font-mono text-text-muted shadow-2xs">⌘K</kbd>
            </button>

            {hallTicket && (
              <button
                type="button"
                onClick={() => selectTab('input')}
                className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-lg bg-surface-subtle hover:bg-white border border-border text-xs transition-colors cursor-pointer shadow-xs"
                title="Active Hall Ticket (Click to manage)"
              >
                <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                <span className="font-mono text-text-primary font-bold">{hallTicket}</span>
                {cgpa > 0 && (
                  <span className="font-mono font-bold text-accent pl-1.5 border-l border-border">
                    {cgpa.toFixed(2)}
                  </span>
                )}
              </button>
            )}
          </div>
        </header>

        <main className="app-content pb-20 lg:pb-8">
          {children}
        </main>

        {/* Mobile Quick Navigation Bar (Sticky Bottom Dock for 1-thumb thumb access) */}
        <div className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-xl border-t border-border p-2 flex items-center justify-around no-print shadow-lg">
          <button
            type="button"
            onClick={() => selectTab('input')}
            className={`flex flex-col items-center gap-1 p-1 text-[10px] font-medium ${activeTab === 'input' ? 'text-accent font-bold' : 'text-text-muted'}`}
          >
            <PenLine className="w-4 h-4" />
            <span>Import</span>
          </button>
          <button
            type="button"
            onClick={() => selectTab('dashboard')}
            className={`flex flex-col items-center gap-1 p-1 text-[10px] font-medium ${activeTab === 'dashboard' ? 'text-accent font-bold' : 'text-text-muted'}`}
          >
            <LayoutDashboard className="w-4 h-4" />
            <span>Progress</span>
          </button>
          <button
            type="button"
            onClick={() => selectTab('notes')}
            className={`flex flex-col items-center gap-1 p-1 text-[10px] font-medium ${activeTab === 'notes' ? 'text-accent font-bold' : 'text-text-muted'}`}
          >
            <BookOpen className="w-4 h-4" />
            <span>Study</span>
          </button>
          <button
            type="button"
            onClick={() => selectTab('class')}
            className={`flex flex-col items-center gap-1 p-1 text-[10px] font-medium ${activeTab === 'class' ? 'text-accent font-bold' : 'text-text-muted'}`}
          >
            <Trophy className="w-4 h-4" />
            <span>Leaderboard</span>
          </button>
          <button
            type="button"
            onClick={() => setMobileOpen(true)}
            className="flex flex-col items-center gap-1 p-1 text-[10px] font-medium text-text-muted"
          >
            <Menu className="w-4 h-4" />
            <span>Menu</span>
          </button>
        </div>
      </div>

      <CommandPalette
        isOpen={paletteOpen}
        onClose={() => setPaletteOpen(false)}
        onSelectTab={selectTab}
      />
    </div>
  );
}
