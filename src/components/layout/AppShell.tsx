import { useState, useEffect, useRef, type ReactNode } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  LayoutDashboard, GraduationCap, FileText, HelpCircle, PenLine,
  Brain, BookOpen, Menu, X, Bell, Coins, Target, ChevronRight,
} from 'lucide-react';
import type { TabType } from '../../types';
import AmbientBackground from '../ui/AmbientBackground';

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
      { id: 'notifications', label: 'Updates', icon: Bell, badge: 'Live' },
      { id: 'help', label: 'Help', icon: HelpCircle },
    ],
  },
];

const TAB_SUBTITLES: Partial<Record<TabType, string>> = {
  dashboard: 'Trajectory, grades, and semester-level signal',
  input: 'Hall ticket, PDF memos, or manual semester entry',
  predictions: 'Targets, what-if scenarios, and semester goals',
  transcript: 'Printable academic report',
  notes: 'Study materials for your regulation',
  credits: 'Year-wise progress toward degree requirements',
  notifications: 'Results, timetables, and academic notices',
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
  const [navOverflow, setNavOverflow] = useState(false);
  const navRef = useRef<HTMLElement>(null);
  const activeLabel = ALL_NAV.find(i => i.id === activeTab)?.label ?? 'Home';

  useEffect(() => {
    document.title = `${activeLabel} — JNTUH Academic Insights`;
  }, [activeLabel]);

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
          <div className="brand-orb">
            <GraduationCap className="w-5 h-5 text-white" />
            <div className="brand-orb-ring" />
          </div>
          <div className="min-w-0">
            <p className="brand-eyebrow">JNTUH</p>
            <h1 className="brand-title">Academic Insights</h1>
          </div>
          <button type="button" className="sidebar-close lg:hidden" onClick={() => setMobileOpen(false)} aria-label="Close navigation">
            <X className="w-4 h-4" />
          </button>
        </div>

        {(studentName || hallTicket) && (
          <div className="sidebar-profile">
            <p className="sidebar-profile-name">{studentName || 'Student'}</p>
            {hallTicket && <p className="sidebar-profile-ht">{hallTicket}</p>}
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
                      {item.badge && <span className="nav-badge">{item.badge}</span>}
                      {active && <ChevronRight className="w-3 h-3 ml-auto opacity-50 relative z-[1]" />}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>
        {navOverflow && (
          <p className="sidebar-scroll-hint" aria-hidden>
            Scroll sidebar for more
          </p>
        )}

        <div className="sidebar-footer">
          <div className="stats-orb-card">
            <div className="stats-orb-header">
              <span>Session snapshot</span>
            </div>
            <div className="stats-orb-grid">
              <div>
                <p className="stats-orb-value">{cgpa > 0 ? cgpa.toFixed(2) : '—'}</p>
                <p className="stats-orb-label">CGPA</p>
              </div>
              <div>
                <p className="stats-orb-value">{percentage > 0 ? `${percentage.toFixed(1)}%` : '—'}</p>
                <p className="stats-orb-label">Score</p>
              </div>
            </div>
            <div className="stats-orb-bar" aria-hidden>
              <motion.div
                className="stats-orb-bar-fill"
                initial={{ width: 0 }}
                animate={{ width: `${Math.min(100, percentage)}%` }}
                transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1] }}
              />
            </div>
          </div>
        </div>
      </aside>

      <div className="app-main">
        <header className="app-topbar no-print">
          <button type="button" className="mobile-menu-btn lg:hidden" onClick={() => setMobileOpen(true)} aria-label="Open navigation">
            <Menu className="w-5 h-5" />
          </button>
          <div className="topbar-center">
            <h2 className="topbar-title">{activeLabel}</h2>
            <p className="topbar-subtitle text-xs sm:text-sm">{TAB_SUBTITLES[activeTab]}</p>
          </div>
        </header>

        <main className="app-content">
          {children}
        </main>
      </div>
    </div>
  );
}
