import { useState, useMemo, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Sparkles,
  Trophy,
  TrendingUp,
  Award,
  Zap,
  ChevronLeft,
  ChevronRight,
  Copy,
  Check,
  ArrowRight,
} from 'lucide-react';
import { useAcademic } from '../context/AcademicContext';
import { decodeHTNO } from '../utils/htnoProfile';
import { getSemesterSGPA } from '../utils/calculations';
import toast from 'react-hot-toast';

export default function AcademicJourneyWrapped() {
  const { data, getCGPA } = useAcademic();
  const { cgpa, percentage, totalCredits } = getCGPA();
  const [activeMode, setActiveMode] = useState<'journey' | 'wrapped'>('wrapped');
  const [currentSlide, setCurrentSlide] = useState(0);
  const [copied, setCopied] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);

  const profile = useMemo(() => {
    return decodeHTNO(data.hallTicket || '');
  }, [data.hallTicket]);

  // Semester metrics
  const semesterStats = useMemo(() => {
    const list = data.semesters
      .map(sem => {
        const sgpa = getSemesterSGPA(sem, sem.regulation || data.regulation);
        const subjects = sem.subjects || [];
        const earned = subjects
          .filter(s => s.grade !== 'F' && s.grade !== 'Ab')
          .reduce((sum, s) => sum + (s.credits || 0), 0);
        const backlogs = subjects.filter(s => s.grade === 'F' || s.grade === 'Ab').length;
        return {
          sem,
          year: sem.year,
          semNum: sem.sem,
          label: `${sem.year}-${sem.sem}`,
          sgpa: Number(sgpa.toFixed(2)),
          earnedCredits: earned,
          backlogs,
          subjects,
        };
      })
      .filter(s => s.sgpa > 0 || s.earnedCredits > 0);

    return list;
  }, [data.semesters, data.regulation]);

  // Derived Insights
  const insights = useMemo(() => {
    if (semesterStats.length === 0) return null;

    // Highest SGPA
    const sortedBySGPA = [...semesterStats].sort((a, b) => b.sgpa - a.sgpa);
    const apex = sortedBySGPA[0];

    // Toughest term (lowest non-zero SGPA or most backlogs)
    const sortedLowest = [...semesterStats].sort((a, b) => a.sgpa - b.sgpa);
    const crucible = sortedLowest[0];

    // Turning point (greatest jump between consecutive terms)
    let maxJump = { from: '', to: '', delta: 0 };
    for (let i = 1; i < semesterStats.length; i++) {
      const delta = Number((semesterStats[i].sgpa - semesterStats[i - 1].sgpa).toFixed(2));
      if (delta > maxJump.delta) {
        maxJump = {
          from: semesterStats[i - 1].label,
          to: semesterStats[i].label,
          delta,
        };
      }
    }

    // All subjects flat
    const allSubjects = semesterStats.flatMap(s => s.subjects);
    const oCount = allSubjects.filter(s => s.grade === 'O' || s.grade === 'S').length;
    const aPlusCount = allSubjects.filter(s => s.grade === 'A+').length;
    const aCount = allSubjects.filter(s => s.grade === 'A').length;

    // Top subjects
    const eliteSubjects = allSubjects
      .filter(s => ['O', 'S', 'A+'].includes(s.grade))
      .slice(0, 6);

    // Persona logic
    let personaTitle = 'The Focused Engineer';
    let personaDescription = 'Maintains consistent course engagement and steady academic progression across semesters.';

    if (cgpa >= 8.5) {
      if (maxJump.delta > 1.2) {
        personaTitle = 'The High-Velocity Finisher';
        personaDescription = 'Possesses explosive academic momentum, surging through demanding engineering coursework with high distinction.';
      } else {
        personaTitle = 'The Consistent Scholar';
        personaDescription = 'Flawless academic discipline and unflinching course mastery sustained term after term.';
      }
    } else if (maxJump.delta >= 1.0) {
      personaTitle = 'The Clutch Specialist';
      personaDescription = 'Demonstrates remarkable resilience, engineering turnaround comebacks when academic stakes are highest.';
    } else if (oCount + aPlusCount >= 8) {
      personaTitle = 'The Core Domain Virtuoso';
      personaDescription = 'Specializes in profound subject mastery with an exceptional concentration of O and A+ honors grades.';
    } else if (totalCredits >= 140) {
      personaTitle = 'The Steadfast Builder';
      personaDescription = 'Relentless execution, systematically clearing the university degree curriculum toward graduation.';
    }

    return {
      apex,
      crucible,
      maxJump,
      totalSubjectsCount: allSubjects.length,
      oCount,
      aPlusCount,
      aCount,
      eliteSubjects,
      personaTitle,
      personaDescription,
    };
  }, [semesterStats, cgpa, totalCredits]);

  if (semesterStats.length === 0) {
    return (
      <div className="card p-12 text-center max-w-xl mx-auto space-y-4 my-8">
        <div className="w-12 h-12 rounded-full bg-accent/10 border border-accent/25 flex items-center justify-center mx-auto text-accent">
          <Sparkles className="w-6 h-6" />
        </div>
        <h3 className="text-lg font-semibold text-text-primary">No Academic Records Loaded</h3>
        <p className="text-xs text-text-muted leading-relaxed">
          Import your hall ticket or upload memo PDFs to unlock your interactive 4-Year Academic Journey and viral JNTUH Wrapped presentation.
        </p>
        <div className="pt-2">
          <a
            href="#/input"
            className="btn-primary inline-flex items-center gap-2 px-5 py-2.5 text-xs font-semibold rounded-lg shadow-md shadow-blue-500/20"
          >
            <span>Import Results</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </a>
        </div>
      </div>
    );
  }

  const copyWrappedSummary = () => {
    if (!insights) return;
    const text = `🎓 JNTUH ACADEMIC WRAPPED
Institution: ${profile?.collegeName || 'JNTUH Affiliated'} (${profile?.collegeCode || 'COLLEGE'})
Degree: B.Tech ${profile?.branchName || 'Engineering'} · Regulation: ${data.regulation}
Status: Candidate Record

⭐ Overall CGPA: ${cgpa.toFixed(2)} / 10.0 (${percentage.toFixed(1)}%)
⚡ Earned Credits: ${totalCredits}
🏆 Persona: "${insights.personaTitle}"
🏔️ Apex Semester: ${insights.apex.label} (${insights.apex.sgpa.toFixed(2)} SGPA)
${insights.maxJump.delta > 0 ? `🚀 Greatest Comeback: +${insights.maxJump.delta.toFixed(2)} SGPA (${insights.maxJump.from} → ${insights.maxJump.to})\n` : ''}🎖️ Distinction Count: ${insights.oCount} 'O' Grades · ${insights.aPlusCount} 'A+' Grades

Generated via JNTUH Academic Insights Platform`;

    navigator.clipboard.writeText(text);
    setCopied(true);
    toast.success('Wrapped summary copied to clipboard!');
    setTimeout(() => setCopied(false), 2500);
  };

  const slides = [
    // Slide 0: Executive Overview
    {
      badge: 'CAREER MILESTONE',
      title: 'The Big Picture',
      content: (
        <div className="space-y-6">
          <div className="grid grid-cols-2 gap-4">
            <div className="p-4 rounded-xl bg-surface-subtle border border-border">
              <span className="text-[10px] font-mono uppercase text-text-muted">Cumulative CGPA</span>
              <p className="text-3xl font-mono font-bold text-accent mt-1">{cgpa.toFixed(2)}</p>
              <p className="text-[11px] text-text-muted mt-0.5">{percentage.toFixed(1)}% equivalent score</p>
            </div>
            <div className="p-4 rounded-xl bg-surface-subtle border border-border">
              <span className="text-[10px] font-mono uppercase text-text-muted">Total Credits</span>
              <p className="text-3xl font-mono font-bold text-emerald-600 mt-1">{totalCredits}</p>
              <p className="text-[11px] text-text-muted mt-0.5">Degree curriculum cleared</p>
            </div>
          </div>
          <div className="p-4 rounded-xl bg-surface-subtle border border-border flex items-center justify-between">
            <div>
              <span className="text-[10px] font-mono uppercase text-text-muted">Institutional Identity</span>
              <p className="text-sm font-semibold text-text-primary mt-0.5">{profile?.collegeName || 'JNTUH College'}</p>
              <p className="text-xs text-text-muted">{profile?.branchName} · {profile?.batchSpan}</p>
            </div>
            <div className="px-3 py-1.5 rounded-lg bg-surface-card border border-border text-xs font-mono text-accent">
              {data.regulation}
            </div>
          </div>
        </div>
      ),
    },
    // Slide 1: Apex Semester
    {
      badge: 'PEAK PERFORMANCE',
      title: 'The Apex Semester',
      content: insights ? (
        <div className="space-y-6">
          <div className="p-6 rounded-2xl bg-amber-50/60 border border-amber-200 relative overflow-hidden">
            <div className="flex items-center justify-between mb-4">
              <span className="text-xs font-mono font-bold uppercase text-amber-800 flex items-center gap-1.5">
                <Trophy className="w-4 h-4 text-amber-600" /> Best Performing Term
              </span>
              <span className="text-xs font-mono px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-800 border border-amber-200">
                Semester {insights.apex.label}
              </span>
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-4xl font-mono font-extrabold text-text-primary">{insights.apex.sgpa.toFixed(2)}</span>
              <span className="text-sm font-mono text-text-muted">SGPA</span>
            </div>
            <p className="text-xs text-text-muted mt-2">
              Earned {insights.apex.earnedCredits} credits in a single term with zero backlogs.
            </p>
          </div>
          <div className="space-y-2">
            <p className="text-[11px] font-mono uppercase text-text-muted">Standout Courses from this Term</p>
            <div className="space-y-1.5">
              {insights.apex.subjects.slice(0, 3).map((sub, idx) => (
                <div key={idx} className="p-2.5 rounded-lg bg-surface-subtle border border-border flex items-center justify-between text-xs">
                  <span className="font-medium text-text-primary truncate pr-2">{sub.name}</span>
                  <span className="px-2 py-0.5 rounded font-mono font-bold bg-surface-card text-emerald-600 shrink-0 border border-border">
                    {sub.grade}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      ) : null,
    },
    // Slide 2: Crucible & Resilience
    {
      badge: 'OVERCOMING CHALLENGES',
      title: 'The Academic Crucible',
      content: insights ? (
        <div className="space-y-6">
          <div className="p-5 rounded-xl bg-surface-subtle border border-border space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-mono text-text-muted uppercase">Toughest Semester Encountered</span>
              <span className="text-xs font-mono font-bold text-amber-750">Term {insights.crucible.label}</span>
            </div>
            <p className="text-2xl font-mono font-bold text-text-primary">{insights.crucible.sgpa.toFixed(2)} SGPA</p>
            <p className="text-xs text-text-muted leading-relaxed">
              Every rigorous engineering curriculum has an inflection point. You navigated through this demanding semester and continued advancing forward.
            </p>
          </div>

          {insights.maxJump.delta > 0 && (
            <div className="p-5 rounded-xl bg-emerald-50 border border-emerald-200 space-y-2">
              <span className="text-[10px] font-mono uppercase tracking-wider text-emerald-800 font-bold flex items-center gap-1.5">
                <TrendingUp className="w-3.5 h-3.5 text-emerald-600" /> Highest Comeback Velocity
              </span>
              <p className="text-lg font-bold text-text-primary">
                +{insights.maxJump.delta.toFixed(2)} SGPA Surge
              </p>
              <p className="text-xs text-emerald-800/80">
                Direct leap from Semester {insights.maxJump.from} to {insights.maxJump.to}. Demonstrates immense bounce-back drive.
              </p>
            </div>
          )}
        </div>
      ) : null,
    },
    // Slide 3: Subject Mastery
    {
      badge: 'COURSE MASTERY',
      title: 'Hall of Fame',
      content: insights ? (
        <div className="space-y-5">
          <div className="grid grid-cols-3 gap-3 text-center">
            <div className="p-3 rounded-lg bg-surface-subtle border border-border">
              <span className="text-[10px] font-mono uppercase text-emerald-600 font-bold">'O' Outstanding</span>
              <p className="text-2xl font-mono font-bold text-text-primary mt-1">{insights.oCount}</p>
            </div>
            <div className="p-3 rounded-lg bg-surface-subtle border border-border">
              <span className="text-[10px] font-mono uppercase text-accent font-bold">'A+' Excellent</span>
              <p className="text-2xl font-mono font-bold text-text-primary mt-1">{insights.aPlusCount}</p>
            </div>
            <div className="p-3 rounded-lg bg-surface-subtle border border-border">
              <span className="text-[10px] font-mono uppercase text-accent-deep font-bold">'A' Very Good</span>
              <p className="text-2xl font-mono font-bold text-text-primary mt-1">{insights.aCount}</p>
            </div>
          </div>

          <div className="space-y-2">
            <p className="text-[11px] font-mono uppercase text-text-muted">Top Ranked Course Performances</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {insights.eliteSubjects.map((sub, idx) => (
                <div key={idx} className="p-2.5 rounded-lg bg-surface-subtle border border-border flex items-center justify-between text-xs">
                  <span className="truncate pr-2 font-medium text-text-primary">{sub.name}</span>
                  <span className="px-1.5 py-0.5 rounded font-mono font-bold bg-surface-card text-emerald-600 border border-border shrink-0">
                    {sub.grade}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      ) : null,
    },
    // Slide 4: Persona Title
    {
      badge: 'ENGINEERING PERSONA',
      title: 'Your Academic Identity',
      content: insights ? (
        <div className="space-y-6 text-center py-4">
          <div className="w-16 h-16 rounded-2xl bg-accent-subtle border border-accent/20 flex items-center justify-center mx-auto text-accent">
            <Zap className="w-8 h-8" />
          </div>
          <div>
            <span className="text-[11px] font-mono tracking-widest uppercase text-accent font-bold">
              OFFICIAL CLASSIFICATION
            </span>
            <h2 className="text-2xl font-bold text-text-primary mt-1 tracking-tight">
              "{insights.personaTitle}"
            </h2>
            <p className="text-xs text-text-muted mt-2 max-w-sm mx-auto leading-relaxed">
              {insights.personaDescription}
            </p>
          </div>

          <div className="p-4 rounded-xl bg-surface-subtle border border-border max-w-sm mx-auto flex items-center justify-around text-xs font-mono">
            <div>
              <span className="text-text-muted block text-[10px]">CGPA</span>
              <span className="font-bold text-text-primary text-sm">{cgpa.toFixed(2)}</span>
            </div>
            <div className="w-px h-6 bg-border" />
            <div>
              <span className="text-text-muted block text-[10px]">CREDITS</span>
              <span className="font-bold text-emerald-600 text-sm">{totalCredits}</span>
            </div>
            <div className="w-px h-6 bg-border" />
            <div>
              <span className="text-text-muted block text-[10px]">COURSES</span>
              <span className="font-bold text-accent text-sm">{insights.totalSubjectsCount}</span>
            </div>
          </div>
        </div>
      ) : null,
    },
    // Slide 5: Shareable Story Card
    {
      badge: 'SHARE & CELEBRATE',
      title: 'Your Wrapped Card',
      content: insights ? (
        <div className="space-y-6">
          <div
            ref={cardRef}
            className="p-6 rounded-2xl bg-[#111318] border border-[#232733] shadow-2xl relative overflow-hidden space-y-4 text-white"
          >
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <div>
                <p className="text-[10px] font-mono tracking-wider uppercase text-emerald-400 font-bold">JNTUH ACADEMIC INSIGHTS</p>
                <h4 className="text-sm font-bold text-white">{profile?.collegeCode || 'COLLEGE'} · {profile?.branchName || 'ENGINEERING'}</h4>
              </div>
              <div className="px-2 py-0.5 rounded bg-white/5 border border-white/10 text-[10px] font-mono text-slate-300">
                {data.regulation}
              </div>
            </div>

            <div className="text-center py-2">
              <span className="text-[10px] font-mono uppercase text-slate-400 tracking-wider">Candidate Persona</span>
              <h3 className="text-xl font-bold text-white tracking-tight mt-0.5">"{insights.personaTitle}"</h3>
            </div>

            <div className="grid grid-cols-2 gap-3 text-center">
              <div className="p-3 rounded-xl bg-white/[0.04] border border-white/10">
                <span className="text-[10px] font-mono text-slate-400 uppercase">Cumulative CGPA</span>
                <p className="text-2xl font-mono font-bold text-accent mt-0.5">{cgpa.toFixed(2)}</p>
                <span className="text-[10px] text-slate-400">({percentage.toFixed(1)}%)</span>
              </div>
              <div className="p-3 rounded-xl bg-white/[0.04] border border-white/10">
                <span className="text-[10px] font-mono text-slate-400 uppercase">Cleared Credits</span>
                <p className="text-2xl font-mono font-bold text-emerald-400 mt-0.5">{totalCredits}</p>
                <span className="text-[10px] text-slate-400">Zero Stalled Terms</span>
              </div>
            </div>

            <div className="p-3 rounded-xl bg-white/[0.03] border border-white/10 flex items-center justify-between text-xs font-mono">
              <span className="text-slate-400">Peak SGPA:</span>
              <span className="font-bold text-white">{insights.apex.sgpa.toFixed(2)} ({insights.apex.label})</span>
            </div>

            <div className="text-[10px] text-center text-slate-400 font-mono pt-1">
              Verified JNTUH Academic Record · Anonymized Candidate Memo
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={copyWrappedSummary}
              className="btn-primary flex-1 justify-center py-2.5 text-xs font-semibold"
            >
              {copied ? <Check className="w-4 h-4 text-emerald-300" /> : <Copy className="w-4 h-4" />}
              {copied ? 'Copied to Clipboard!' : 'Copy Formatted Text Summary'}
            </button>
          </div>
        </div>
      ) : null,
    },
  ];

  return (
    <div className="space-y-8 select-none">
      {/* Header bar with Mode Selector */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-border">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2 py-0.5 rounded text-[10px] font-mono font-semibold uppercase bg-accent-subtle border border-accent/20 text-accent">
              Official Academic Odyssey
            </span>
            <span className="text-xs text-text-muted font-mono">{profile?.branchName || 'B.Tech'} · {data.regulation}</span>
          </div>
          <h2 className="text-xl font-bold text-text-primary tracking-tight mt-1">
            Academic Journey & Wrapped
          </h2>
        </div>

        {/* Segmented Switcher */}
        <div className="flex items-center p-1 rounded-xl bg-surface-subtle border border-border shrink-0 self-start sm:self-auto">
          <button
            type="button"
            onClick={() => setActiveMode('wrapped')}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
              activeMode === 'wrapped'
                ? 'bg-surface-card text-accent font-semibold shadow-sm border border-border'
                : 'text-text-muted hover:text-text-primary'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5" />
            JNTUH Wrapped
          </button>
          <button
            type="button"
            onClick={() => setActiveMode('journey')}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
              activeMode === 'journey'
                ? 'bg-surface-card text-accent font-semibold shadow-sm border border-border'
                : 'text-text-muted hover:text-text-primary'
            }`}
          >
            <TrendingUp className="w-3.5 h-3.5" />
            4-Year Journey
          </button>
        </div>
      </div>

      {/* MODE 1: JNTUH WRAPPED PRESENTATION */}
      {activeMode === 'wrapped' && (
        <div className="max-w-xl mx-auto space-y-6">
          {/* Slide Box */}
          <div className="card p-7 border border-border shadow-xl relative min-h-[440px] flex flex-col justify-between overflow-hidden">
            <div>
              {/* Progress Bar */}
              <div className="flex items-center gap-1.5 mb-6">
                {slides.map((_, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => setCurrentSlide(idx)}
                    className={`h-1 flex-1 rounded-full transition-all cursor-pointer ${
                      idx === currentSlide
                        ? 'bg-accent'
                        : idx < currentSlide
                        ? 'bg-surface-card border border-border'
                        : 'bg-surface-subtle'
                    }`}
                    title={`Slide ${idx + 1}`}
                  />
                ))}
              </div>

              {/* Slide Header */}
              <div className="mb-6">
                <span className="text-[10px] font-mono tracking-widest uppercase font-bold text-accent">
                  {slides[currentSlide].badge}
                </span>
                <h3 className="text-lg font-bold text-text-primary tracking-tight mt-0.5">
                  {slides[currentSlide].title}
                </h3>
              </div>

              {/* Slide Body */}
              <AnimatePresence mode="wait">
                <motion.div
                  key={currentSlide}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.2 }}
                >
                  {slides[currentSlide].content}
                </motion.div>
              </AnimatePresence>
            </div>

            {/* Carousel Controls */}
            <div className="flex items-center justify-between pt-6 border-t border-border mt-6">
              <button
                type="button"
                onClick={() => setCurrentSlide(prev => Math.max(0, prev - 1))}
                disabled={currentSlide === 0}
                className="btn-secondary py-1.5 px-3 text-xs disabled:opacity-30 disabled:cursor-not-allowed"
              >
                <ChevronLeft className="w-4 h-4 mr-1" /> Previous
              </button>
              <span className="text-xs font-mono text-text-muted">
                {currentSlide + 1} / {slides.length}
              </span>
              <button
                type="button"
                onClick={() => setCurrentSlide(prev => Math.min(slides.length - 1, prev + 1))}
                disabled={currentSlide === slides.length - 1}
                className="btn-secondary py-1.5 px-3 text-xs disabled:opacity-30 disabled:cursor-not-allowed"
              >
                Next <ChevronRight className="w-4 h-4 ml-1" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODE 2: 4-YEAR JOURNEY TIMELINE */}
      {activeMode === 'journey' && (
        <div className="space-y-6">
          {/* Highlights Row */}
          {insights && (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="card p-4 border border-border flex items-start gap-3">
                <div className="w-8 h-8 rounded-lg bg-amber-50 border border-amber-200 text-amber-700 flex items-center justify-center shrink-0">
                  <Trophy className="w-4 h-4" />
                </div>
                <div>
                  <span className="text-[10px] font-mono uppercase text-text-muted">Apex Semester</span>
                  <p className="text-base font-bold text-text-primary mt-0.5">{insights.apex.sgpa.toFixed(2)} SGPA</p>
                  <p className="text-[11px] text-text-muted">Semester {insights.apex.label}</p>
                </div>
              </div>

              <div className="card p-4 border border-border flex items-start gap-3">
                <div className="w-8 h-8 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-700 flex items-center justify-center shrink-0">
                  <TrendingUp className="w-4 h-4" />
                </div>
                <div>
                  <span className="text-[10px] font-mono uppercase text-text-muted">Greatest Surge</span>
                  <p className="text-base font-bold text-text-primary mt-0.5">+{insights.maxJump.delta.toFixed(2)} SGPA</p>
                  <p className="text-[11px] text-text-muted">{insights.maxJump.from} → {insights.maxJump.to}</p>
                </div>
              </div>

              <div className="card p-4 border border-border flex items-start gap-3">
                <div className="w-8 h-8 rounded-lg bg-blue-50 border border-blue-200 text-accent flex items-center justify-center shrink-0">
                  <Award className="w-4 h-4" />
                </div>
                <div>
                  <span className="text-[10px] font-mono uppercase text-text-muted">Distinctions Cleared</span>
                  <p className="text-base font-bold text-text-primary mt-0.5">{insights.oCount + insights.aPlusCount} Honors</p>
                  <p className="text-[11px] text-text-muted">{insights.oCount} 'O' · {insights.aPlusCount} 'A+' grades</p>
                </div>
              </div>
            </div>
          )}

          {/* Chronological Timeline */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-text-primary tracking-tight">Chronological Term Progression</h3>
            <div className="space-y-3">
              {semesterStats.map((item, idx) => {
                const prev = idx > 0 ? semesterStats[idx - 1] : null;
                const delta = prev ? Number((item.sgpa - prev.sgpa).toFixed(2)) : null;

                return (
                  <div
                    key={item.label}
                    className="card p-5 border border-border hover:border-border-strong transition-all flex flex-col md:flex-row md:items-center justify-between gap-4"
                  >
                    <div className="flex items-center gap-4 min-w-0">
                      <div className="w-12 h-12 rounded-xl bg-surface-subtle border border-border flex flex-col items-center justify-center shrink-0">
                        <span className="text-[10px] font-mono text-text-muted uppercase">SEM</span>
                        <span className="text-sm font-bold font-mono text-text-primary">{item.label}</span>
                      </div>

                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <h4 className="text-sm font-semibold text-text-primary">
                            Year {item.year}, Semester {item.semNum}
                          </h4>
                          {item.backlogs === 0 ? (
                            <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-emerald-50 border border-emerald-200 text-emerald-700">
                              Cleared
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-rose-50 border border-rose-200 text-rose-700">
                              {item.backlogs} Backlog(s)
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-text-muted mt-0.5 font-mono">
                          {item.subjects.length} courses registered · {item.earnedCredits} credits earned
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-6 shrink-0 justify-between md:justify-end border-t md:border-t-0 pt-3 md:pt-0 border-border">
                      {delta !== null && (
                        <div className="text-right">
                          <span className="text-[10px] font-mono uppercase text-text-muted block">Trend</span>
                          <span
                            className={`text-xs font-mono font-bold ${
                              delta > 0
                                ? 'text-emerald-700'
                                : delta < 0
                                ? 'text-rose-700'
                                : 'text-text-muted'
                            }`}
                          >
                            {delta > 0 ? `+${delta.toFixed(2)}` : delta.toFixed(2)}
                          </span>
                        </div>
                      )}

                      <div className="text-right">
                        <span className="text-[10px] font-mono uppercase text-text-muted block">SGPA</span>
                        <span className="text-xl font-mono font-bold text-accent">
                          {item.sgpa.toFixed(2)}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
