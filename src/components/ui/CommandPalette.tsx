import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Search,
  LayoutDashboard,
  FileText,
  PenLine,
  Brain,
  BookOpen,
  Bell,
  Coins,
  Target,
  Briefcase,
  Users,
  CalendarDays,
  X,
  ArrowRight,
  Trophy,
  Sparkles,
} from 'lucide-react';
import type { TabType } from '../../types';

interface CommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectTab: (tab: TabType) => void;
}

interface PaletteItem {
  id: TabType;
  title: string;
  category: 'Core Tools' | 'Academic Intelligence' | 'Campus Resources';
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  keywords: string[];
}

const PALETTE_ITEMS: PaletteItem[] = [
  {
    id: 'input',
    title: 'Look Up Results / Import Memo',
    category: 'Core Tools',
    description: 'Instant hall ticket query, PDF grade card parsing, or manual input',
    icon: PenLine,
    keywords: ['search', 'hall ticket', 'roll number', 'memo', 'results', 'import', 'htno'],
  },
  {
    id: 'dashboard',
    title: 'Academic Progress & Analytics',
    category: 'Academic Intelligence',
    description: 'Trajectory, SGPA trends, grade distribution, and performance signals',
    icon: LayoutDashboard,
    keywords: ['sgpa', 'cgpa', 'progress', 'grades', 'analytics', 'trend'],
  },
  {
    id: 'class',
    title: 'Class & Section Rank Leaderboard',
    category: 'Academic Intelligence',
    description: 'Inspect full class results, section rank list, pass percentage, and branch topper',
    icon: Trophy,
    keywords: ['class', 'batch', 'leaderboard', 'rank', 'section', 'topper', 'compare'],
  },
  {
    id: 'journey',
    title: '4-Year Journey & JNTUH Wrapped',
    category: 'Academic Intelligence',
    description: 'Degree milestones, inflection comebacks, hall of fame courses, and viral Spotify-style wrapped cards',
    icon: Sparkles,
    keywords: ['journey', 'wrapped', 'odyssey', 'persona', 'comeback', 'apex', 'spotify'],
  },
  {
    id: 'compare',
    title: 'Result Contrast & Peer Benchmark',
    category: 'Academic Intelligence',
    description: 'Contrast two student careers subject-by-subject and semester-by-semester',
    icon: Users,
    keywords: ['compare', 'contrast', 'peer', 'benchmark', 'friend', 'classmate', 'delta'],
  },
  {
    id: 'credits',
    title: 'Credits & Degree Completion Checker',
    category: 'Core Tools',
    description: 'Track year-wise earned credits against official promotion rules',
    icon: Coins,
    keywords: ['credits', 'graduation', 'promotion', 'degree', 'requirements'],
  },
  {
    id: 'backlog',
    title: 'Backlog Plan & Grace Marks Checker',
    category: 'Core Tools',
    description: 'Recovery roadmaps, syllabus gaps, PYQs, and rule-verified grace marks',
    icon: Target,
    keywords: ['backlog', 'grace marks', 'recovery', 'fail', 'supplementary', 'supply'],
  },
  {
    id: 'notes',
    title: 'Study Library, Syllabus & PYQs',
    category: 'Campus Resources',
    description: 'Regulation-mapped notes for R18/R22 and previous examination question papers',
    icon: BookOpen,
    keywords: ['notes', 'syllabus', 'pyq', 'questions', 'study', 'pdf', 'r18', 'r22'],
  },
  {
    id: 'calendars',
    title: 'Academic Calendars & Examination Almanac',
    category: 'Campus Resources',
    description: 'Official university schedules, mid exam milestones, and semester dates',
    icon: CalendarDays,
    keywords: ['calendar', 'dates', 'almanac', 'mid exam', 'schedule', 'deadlines'],
  },
  {
    id: 'jobs',
    title: 'Jobs, Drives & Opportunities (/update)',
    category: 'Campus Resources',
    description: 'Continuous 3-hour synchronized job feeds, internships, and campus drives',
    icon: Briefcase,
    keywords: ['jobs', 'careers', 'opportunities', 'internships', 'fresher', 'drives', 'update'],
  },
  {
    id: 'notifications',
    title: 'Official Updates & Circulars',
    category: 'Campus Resources',
    description: 'Live examination notifications, timetables, and academic circulars',
    icon: Bell,
    keywords: ['notifications', 'updates', 'circulars', 'timetables', 'notices'],
  },
  {
    id: 'predictions',
    title: 'Goal Planner & What-If Simulator',
    category: 'Academic Intelligence',
    description: 'Simulate target CGPA requirements and calculate required semester grades',
    icon: Brain,
    keywords: ['goals', 'what-if', 'target', 'planner', 'calculator'],
  },
  {
    id: 'transcript',
    title: 'Printable Performance Report',
    category: 'Core Tools',
    description: 'Generate clean, confidential academic transcript for printing',
    icon: FileText,
    keywords: ['report', 'transcript', 'print', 'pdf', 'export'],
  },
];

export default function CommandPalette({
  isOpen,
  onClose,
  onSelectTab,
}: CommandPaletteProps) {
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setQuery('');
      setSelectedIndex(0);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [isOpen]);

  const filteredItems = PALETTE_ITEMS.filter(item => {
    if (!query.trim()) return true;
    const q = query.toLowerCase().trim();
    return (
      item.title.toLowerCase().includes(q) ||
      item.description.toLowerCase().includes(q) ||
      item.keywords.some(k => k.toLowerCase().includes(q))
    );
  });

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex(prev => (prev + 1) % Math.max(1, filteredItems.length));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex(prev => (prev - 1 + filteredItems.length) % Math.max(1, filteredItems.length));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (filteredItems[selectedIndex]) {
        onSelectTab(filteredItems[selectedIndex].id);
        onClose();
      }
    } else if (e.key === 'Escape') {
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-start justify-center pt-20 px-4 sm:px-6">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black/75 backdrop-blur-xs"
          onClick={onClose}
        />

        <motion.div
          initial={{ opacity: 0, scale: 0.98, y: -10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.98, y: -10 }}
          transition={{ duration: 0.15 }}
          className="relative w-full max-w-xl bg-surface-card border border-border-strong rounded-xl shadow-2xl overflow-hidden z-10"
        >
          {/* Search Input Bar */}
          <div className="flex items-center gap-3 px-4 py-3.5 border-b border-border bg-surface-subtle">
            <Search className="w-4 h-4 text-text-muted shrink-0" />
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={e => {
                setQuery(e.target.value);
                setSelectedIndex(0);
              }}
              onKeyDown={handleKeyDown}
              placeholder="Search tools, subjects, jobs, calendars, or regulations..."
              className="w-full bg-transparent text-sm text-text-primary placeholder-text-muted outline-none"
            />
            <button
              onClick={onClose}
              className="p-1 text-text-muted hover:text-text-primary rounded-md"
              aria-label="Close command palette"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Results List */}
          <div className="max-h-80 overflow-y-auto p-2 space-y-1">
            {filteredItems.length === 0 ? (
              <div className="p-8 text-center text-xs text-text-muted">
                No matching tools or resources found.
              </div>
            ) : (
              filteredItems.map((item, idx) => {
                const Icon = item.icon;
                const isSelected = idx === selectedIndex;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => {
                      onSelectTab(item.id);
                      onClose();
                    }}
                    onMouseEnter={() => setSelectedIndex(idx)}
                    className={`w-full flex items-center justify-between p-2.5 rounded-lg text-left transition-colors cursor-pointer ${
                      isSelected
                        ? 'bg-surface-subtle text-text-primary border border-border-strong'
                        : 'text-text-secondary hover:bg-surface-subtle/50'
                    }`}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div
                        className={`p-2 rounded-md shrink-0 ${
                          isSelected
                            ? 'bg-surface-card text-accent border border-border'
                            : 'bg-surface-subtle text-text-muted'
                        }`}
                      >
                        <Icon className="w-4 h-4" />
                      </div>
                      <div className="min-w-0">
                        <div className="text-xs font-medium text-text-primary truncate">
                          {item.title}
                        </div>
                        <div className="text-[11px] text-text-muted truncate">
                          {item.description}
                        </div>
                      </div>
                    </div>
                    {isSelected && (
                      <ArrowRight className="w-3.5 h-3.5 text-accent shrink-0 ml-2" />
                    )}
                  </button>
                );
              })
            )}
          </div>

          {/* Footer Shortcuts */}
          <div className="px-4 py-2 bg-surface-subtle border-t border-border flex items-center justify-between text-[11px] text-text-muted font-mono">
            <span>Use ↑ ↓ to navigate</span>
            <span>↵ to select • ESC to close</span>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
