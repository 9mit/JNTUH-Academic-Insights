import { useState, useEffect, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Sparkles,
    Flame,
    BookOpen,
    Copy,
    ChevronDown,
    ChevronRight,
    Search,
    Printer,
    Send,
    ShieldCheck,
    Layers,
    RotateCcw,
    AlertCircle,
    X,
    FileText
} from 'lucide-react';
import toast from 'react-hot-toast';

const API_BASE = import.meta.env.VITE_API_URL || '';

interface EvaluatorBlueprint {
    key_points: string[];
    mandatory_diagram: string;
    pitfalls: string;
    approx_time: string;
}

interface LinkedNote {
    name: string;
    path: string;
}

interface ImportantQuestion {
    id: string;
    question: string;
    probability_stars: number;
    repetition_count: number;
    marks: string;
    exam_history: string[];
    drop_type: string;
    evaluator_blueprint: EvaluatorBlueprint;
    linked_note?: LinkedNote;
}

interface UnitData {
    unit: number;
    title: string;
    linked_note?: LinkedNote;
    question_count: number;
    questions: ImportantQuestion[];
}

interface ImportantQuestionsResponse {
    source: string;
    subject_name: string;
    subject_code: string;
    regulation: string;
    semester: string;
    cycle_drop?: string;
    total_questions: number;
    units: UnitData[];
    exam_readiness_advice?: string;
}

interface CramSheetData {
    subject_name: string;
    subject_code: string;
    regulation: string;
    cram_count: number;
    exam_advice: string;
    questions: (ImportantQuestion & { unit: number; unit_title: string })[];
}

interface FiltersMeta {
    regulations: string[];
    branches: string[];
    semesters: string[];
    curated_subjects: string[];
    total_catalog_topics: number;
    exam_drop_cycle: string;
}

type MasteryStatus = 'unread' | 'revising' | 'mastered';

const BRANCH_LABELS: Record<string, string> = {
    CSE: 'Computer Science',
    AIML: 'AI & Machine Learning',
    ECE: 'Electronics & Comm',
    EEE: 'Electrical & Electronics',
    MECH: 'Mechanical',
    CIVIL: 'Civil',
    CSD: 'CS & Design',
    MINING: 'Mining'
};

export default function ImportantQuestionsHub({
    onOpenNote
}: {
    onOpenNote?: (path: string, filename: string) => void;
}) {
    // Filter State
    const [regulation, setRegulation] = useState<string>('R22');
    const [branch, setBranch] = useState<string>('CSE');
    const [semester, setSemester] = useState<string>('1-1');
    const [searchQuery, setSearchQuery] = useState<string>('');
    const [activeSubject, setActiveSubject] = useState<string>('MATRICES AND CALCULUS');
    const [highProbOnly, setHighProbOnly] = useState<boolean>(false);
    const [dropFilter, setDropFilter] = useState<'all' | 'mid1' | 'mid2' | 'supply'>('all');
    const [expandedUnits, setExpandedUnits] = useState<Set<number>>(new Set([1, 2]));
    const [expandedBlueprints, setExpandedBlueprints] = useState<Set<string>>(new Set());

    // Data State
    const [loading, setLoading] = useState<boolean>(true);
    const [data, setData] = useState<ImportantQuestionsResponse | null>(null);
    const [filtersMeta, setFiltersMeta] = useState<FiltersMeta | null>(null);

    // Cram Sheet View Mode
    const [isCramMode, setIsCramMode] = useState<boolean>(false);
    const [cramData, setCramData] = useState<CramSheetData | null>(null);
    const [loadingCram, setLoadingCram] = useState<boolean>(false);

    // Request Modal
    const [showRequestModal, setShowRequestModal] = useState<boolean>(false);
    const [requestSubject, setRequestSubject] = useState<string>('');
    const [requestExamDate, setRequestExamDate] = useState<string>('');
    const [requestTip, setRequestTip] = useState<string>('');
    const [submittingRequest, setSubmittingRequest] = useState<boolean>(false);

    // Interactive Mastery Tracker (localStorage per subject)
    const [masteryMap, setMasteryMap] = useState<Record<string, MasteryStatus>>({});

    // Load filter options on mount
    useEffect(() => {
        const fetchFilters = async () => {
            try {
                const res = await fetch(`${API_BASE}/api/study/filters`);
                if (res.ok) {
                    const meta = await res.json();
                    setFiltersMeta(meta);
                }
            } catch {
                // fallback meta
                setFiltersMeta({
                    regulations: ['R22', 'R18', 'R25'],
                    branches: ['CSE', 'AIML', 'ECE', 'EEE', 'MECH', 'CIVIL', 'CSD', 'MINING'],
                    semesters: ['1-1', '1-2', '2-1', '2-2', '3-1', '3-2', '4-1', '4-2'],
                    curated_subjects: [
                        'MATRICES AND CALCULUS',
                        'DATA STRUCTURES',
                        'OPERATING SYSTEMS',
                        'COMPUTER NETWORKS',
                        'DATABASE MANAGEMENT SYSTEMS',
                        'DESIGN AND ANALYSIS OF ALGORITHMS'
                    ],
                    total_catalog_topics: 2343,
                    exam_drop_cycle: 'November 2024 End-Semester & Supply Release Cycle'
                });
            }
        };
        fetchFilters();
    }, []);

    // Load questions whenever filters change
    const fetchQuestions = useCallback(async () => {
        setLoading(true);
        try {
            const params = new URLSearchParams({
                regulation,
                branch,
                semester,
                subject: searchQuery.trim() || activeSubject,
                high_prob_only: String(highProbOnly)
            });
            const res = await fetch(`${API_BASE}/api/study/important-questions?${params.toString()}`);
            if (res.ok) {
                const json = await res.json();
                setData(json);
                // expand first two units by default
                if (json.units && json.units.length > 0) {
                    setExpandedUnits(new Set([json.units[0].unit, json.units[1]?.unit].filter(Boolean)));
                }
            }
        } catch {
            toast.error('Could not connect to live question engine. Retrying...');
        } finally {
            setLoading(false);
        }
    }, [regulation, branch, semester, searchQuery, activeSubject, highProbOnly]);

    useEffect(() => {
        fetchQuestions();
    }, [fetchQuestions]);

    // Load mastery map from localStorage
    useEffect(() => {
        if (!data?.subject_code && !data?.subject_name) return;
        const key = `jntuh_imp_mastery_${data.subject_code || data.subject_name}`;
        try {
            const saved = localStorage.getItem(key);
            if (saved) {
                setMasteryMap(JSON.parse(saved));
            } else {
                setMasteryMap({});
            }
        } catch {
            setMasteryMap({});
        }
    }, [data?.subject_code, data?.subject_name]);

    const setQuestionMastery = (qId: string, status: MasteryStatus) => {
        setMasteryMap(prev => {
            const next = { ...prev, [qId]: status };
            if (data?.subject_code || data?.subject_name) {
                const key = `jntuh_imp_mastery_${data.subject_code || data.subject_name}`;
                try {
                    localStorage.setItem(key, JSON.stringify(next));
                } catch { /* ignore */ }
            }
            return next;
        });
        if (status === 'mastered') {
            toast.success('Marked as Exam Ready! ⭐', { duration: 1500 });
        }
    };

    const resetMastery = () => {
        setMasteryMap({});
        if (data?.subject_code || data?.subject_name) {
            const key = `jntuh_imp_mastery_${data.subject_code || data.subject_name}`;
            localStorage.removeItem(key);
        }
        toast('Mastery progress reset for this course.', { icon: '🔄' });
    };

    // Calculate live readiness stats
    const readinessStats = useMemo(() => {
        if (!data?.units) return { percent: 0, mastered: 0, total: 0, unitMap: {} };
        let total = 0;
        let mastered = 0;
        const unitMap: Record<number, { mastered: number; total: number; percent: number }> = {};

        data.units.forEach(u => {
            let uMastered = 0;
            u.questions.forEach(q => {
                total++;
                if (masteryMap[q.id] === 'mastered') {
                    mastered++;
                    uMastered++;
                }
            });
            unitMap[u.unit] = {
                mastered: uMastered,
                total: u.questions.length,
                percent: u.questions.length > 0 ? Math.round((uMastered / u.questions.length) * 100) : 0
            };
        });

        const percent = total > 0 ? Math.round((mastered / total) * 100) : 0;
        return { percent, mastered, total, unitMap };
    }, [data, masteryMap]);

    // Toggle unit accordion
    const toggleUnit = (uNum: number) => {
        setExpandedUnits(prev => {
            const next = new Set(prev);
            if (next.has(uNum)) next.delete(uNum);
            else next.add(uNum);
            return next;
        });
    };

    // Toggle blueprint details
    const toggleBlueprint = (qId: string) => {
        setExpandedBlueprints(prev => {
            const next = new Set(prev);
            if (next.has(qId)) next.delete(qId);
            else next.add(qId);
            return next;
        });
    };

    // Load cram sheet
    const handleToggleCramMode = async () => {
        if (!isCramMode) {
            setLoadingCram(true);
            try {
                const sub = data?.subject_name || activeSubject;
                const res = await fetch(`${API_BASE}/api/study/cram-sheet?subject=${encodeURIComponent(sub)}&regulation=${regulation}`);
                if (res.ok) {
                    const sheet = await res.json();
                    setCramData(sheet);
                    setIsCramMode(true);
                }
            } catch {
                toast.error('Failed to generate cram sheet.');
            } finally {
                setLoadingCram(false);
            }
        } else {
            setIsCramMode(false);
        }
    };

    const handleCopyPrompt = (q: ImportantQuestion) => {
        const text = `Please explain this JNTUH Exam Question thoroughly following the official university evaluation rubric:\n\n` +
            `Subject: ${data?.subject_name} (${data?.subject_code || ''})\n` +
            `Question: ${q.question}\n` +
            `Marks: ${q.marks}\n` +
            `Evaluator Requirements:\n` +
            `- Mandatory Diagram: ${q.evaluator_blueprint.mandatory_diagram}\n` +
            `- Key Points to cover: ${q.evaluator_blueprint.key_points.join(', ')}\n\n` +
            `Provide: 1) Point-wise structured answer, 2) ASCII block diagram or steps, 3) Important formulas/derivation, 4) Concluding summary table.`;
        navigator.clipboard.writeText(text);
        toast.success('Question + AI prompt copied to clipboard!');
    };

    const handleNoteClick = (note?: LinkedNote) => {
        if (!note) {
            toast('Lecture note file not directly mapped for this unit yet.', { icon: 'ℹ️' });
            return;
        }
        if (onOpenNote) {
            onOpenNote(note.path, note.name);
        } else {
            const url = `${API_BASE}/notes/download?path=${encodeURIComponent(note.path)}`;
            window.open(url, '_blank', 'noopener,noreferrer');
        }
    };

    const handleSendRequest = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!requestSubject.trim()) {
            toast.error('Please enter subject name');
            return;
        }
        setSubmittingRequest(true);
        try {
            const res = await fetch(`${API_BASE}/api/study/request`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    subject_name: requestSubject.trim(),
                    regulation,
                    branch,
                    semester,
                    exam_date: requestExamDate,
                    student_tip: requestTip
                })
            });
            if (res.ok) {
                const r = await res.json();
                toast.success(r.message || 'Request submitted successfully!');
                setShowRequestModal(false);
                setRequestSubject('');
                setRequestTip('');
            }
        } catch {
            toast.error('Failed to submit question drop request.');
        } finally {
            setSubmittingRequest(false);
        }
    };

    return (
        <div className="space-y-6">
            {/* Top Announcement & Hero Header */}
            <div className="relative overflow-hidden rounded-2xl bg-surface-card border border-border p-5 sm:p-6 shadow-xs">
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                    <div className="space-y-2">
                        <div className="flex flex-wrap items-center gap-2">
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-50 border border-amber-200 text-amber-700">
                                <Flame className="w-3.5 h-3.5 text-amber-600 animate-pulse" />
                                {filtersMeta?.exam_drop_cycle || 'Time-to-Time Exam Drop Active'}
                            </span>
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-mono bg-emerald-50 border border-emerald-200 text-emerald-700 font-semibold">
                                <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                                Verified 2018–2024 Question Papers
                            </span>
                        </div>
                        <h2 className="text-xl sm:text-2xl font-bold text-text-primary tracking-tight">
                            Time-to-Time Important Questions Hub
                        </h2>
                        <p className="text-xs sm:text-sm text-text-muted max-w-2xl">
                            Guaranteed unit-wise exam questions with actual repetition frequencies, marks allocation,
                            mandatory evaluator diagrams, and 1-click links to matching lecture notes.
                        </p>
                    </div>

                    <div className="flex flex-wrap items-center gap-2.5 shrink-0">
                        <button
                            type="button"
                            onClick={handleToggleCramMode}
                            disabled={loadingCram}
                            className={`px-3.5 py-2 rounded-xl text-xs font-semibold transition-all inline-flex items-center gap-2 cursor-pointer ${
                                isCramMode
                                    ? 'bg-accent text-white font-bold shadow-royal'
                                    : 'bg-surface-elevated hover:bg-bg-hover text-text-primary border border-border shadow-xs'
                            }`}
                        >
                            <Sparkles className="w-3.5 h-3.5 text-amber-600" />
                            <span>{isCramMode ? 'Exit Cram Sheet' : '⚡ Last-Night Cram Sheet'}</span>
                        </button>

                        <button
                            type="button"
                            onClick={() => setShowRequestModal(true)}
                            className="px-3.5 py-2 rounded-xl text-xs font-semibold bg-surface-elevated hover:bg-bg-hover text-text-muted hover:text-text-primary border border-border transition-all inline-flex items-center gap-2 cursor-pointer shadow-xs"
                        >
                            <Send className="w-3.5 h-3.5" />
                            <span>Request Next Drop</span>
                        </button>
                    </div>
                </div>
            </div>

            {/* Filter Deck */}
            <div className="card space-y-4 p-4 sm:p-5 border border-border shadow-xs">
                {/* Regulation & Semester Segmented Bars */}
                <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-3 pb-3 border-b border-border/50">
                    <div className="flex items-center gap-1.5 overflow-x-auto max-w-full pb-1 md:pb-0">
                        <span className="text-xs font-mono uppercase tracking-wider text-text-muted mr-1.5 shrink-0">Regulation:</span>
                        {['R22', 'R18', 'R25'].map(reg => (
                            <button
                                key={reg}
                                type="button"
                                onClick={() => setRegulation(reg)}
                                className={`px-3 py-1 rounded-lg text-xs font-mono font-medium transition-all cursor-pointer ${
                                    regulation === reg
                                        ? 'bg-accent/15 border border-accent/40 text-accent font-bold shadow-xs'
                                        : 'bg-surface-card hover:bg-bg-hover text-text-muted border border-border-subtle'
                                }`}
                            >
                                {reg}
                            </button>
                        ))}
                    </div>

                    <div className="flex items-center gap-1.5 overflow-x-auto max-w-full pb-1 md:pb-0">
                        <span className="text-xs font-mono uppercase tracking-wider text-text-muted mr-1.5 shrink-0">Semester:</span>
                        {['1-1', '1-2', '2-1', '2-2', '3-1', '3-2', '4-1', '4-2'].map(sem => (
                            <button
                                key={sem}
                                type="button"
                                onClick={() => setSemester(sem)}
                                className={`px-2.5 py-1 rounded-lg text-xs font-mono transition-all cursor-pointer ${
                                    semester === sem
                                        ? 'bg-accent-subtle border border-accent/30 text-accent font-bold shadow-xs'
                                        : 'bg-surface-card hover:bg-bg-hover text-text-muted border border-border-subtle'
                                }`}
                            >
                                {sem}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Branch Selection Pills */}
                <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
                    <span className="text-xs font-mono uppercase tracking-wider text-text-muted mr-1.5 shrink-0">Branch:</span>
                    {['CSE', 'AIML', 'ECE', 'EEE', 'MECH', 'CIVIL', 'CSD', 'MINING'].map(br => (
                        <button
                            key={br}
                            type="button"
                            onClick={() => setBranch(br)}
                            className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-all cursor-pointer ${
                                branch === br
                                    ? 'bg-surface-elevated border border-border text-text-primary font-semibold shadow-xs'
                                    : 'text-text-muted hover:text-text-primary'
                            }`}
                        >
                            {br} <span className="text-[10px] opacity-60">({BRANCH_LABELS[br] || br})</span>
                        </button>
                    ))}
                </div>

                {/* Instant Subject Search & Preset Subject Buttons */}
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 pt-2">
                    <div className="relative flex-1">
                        <Search className="w-4 h-4 text-text-muted absolute left-3.5 top-1/2 -translate-y-1/2" />
                        <input
                            type="text"
                            value={searchQuery}
                            onChange={e => setSearchQuery(e.target.value)}
                            placeholder="Type course name or code (e.g. Compiler Design, Matrices, CS302PC, OS)..."
                            className="w-full pl-10 pr-9 py-2.5 rounded-xl bg-surface-card border border-border text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:border-accent"
                        />
                        {searchQuery && (
                            <button
                                type="button"
                                onClick={() => setSearchQuery('')}
                                className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-text-muted hover:text-text-primary cursor-pointer"
                            >
                                <X className="w-3.5 h-3.5" />
                            </button>
                        )}
                    </div>

                    <div className="flex items-center gap-2">
                        <button
                            type="button"
                            onClick={() => setHighProbOnly(!highProbOnly)}
                            className={`px-3 py-2.5 rounded-xl text-xs font-semibold transition-all inline-flex items-center gap-1.5 cursor-pointer shrink-0 ${
                                highProbOnly
                                    ? 'bg-rose-50 border border-rose-200 text-rose-700 font-bold shadow-xs'
                                    : 'bg-surface-card hover:bg-bg-hover text-text-muted border border-border'
                            }`}
                        >
                            <Flame className={`w-3.5 h-3.5 ${highProbOnly ? 'text-rose-600' : 'text-text-muted'}`} />
                            <span>🔥 5x Repeated Only</span>
                        </button>

                        <select
                            value={dropFilter}
                            onChange={e => setDropFilter(e.target.value as 'all' | 'mid1' | 'mid2' | 'supply')}
                            aria-label="Filter by exam cycle release"
                            className="px-3 py-2.5 rounded-xl text-xs font-medium bg-surface-card border border-border text-text-primary focus:outline-none focus:border-accent cursor-pointer"
                        >
                            <option value="all">All Exam Drops</option>
                            <option value="mid1">Mid-1 Express (Units 1 & 2)</option>
                            <option value="mid2">Mid-2 Express (Units 3, 4 & 5)</option>
                            <option value="supply">End-Sem / Supply Focus</option>
                        </select>
                    </div>
                </div>

                {/* Popular Curated Subject Pills */}
                {filtersMeta?.curated_subjects && (
                    <div className="flex items-center gap-1.5 flex-wrap pt-1 text-xs">
                        <span className="text-[11px] font-mono text-text-muted mr-1">Core Courses:</span>
                        {filtersMeta.curated_subjects.map(s => (
                            <button
                                key={s}
                                type="button"
                                onClick={() => {
                                    setActiveSubject(s);
                                    setSearchQuery(s);
                                }}
                                className={`px-2.5 py-1 rounded-md text-[11px] font-medium transition-colors cursor-pointer ${
                                    (searchQuery === s || (!searchQuery && activeSubject === s))
                                        ? 'bg-accent/20 border border-accent/40 text-accent font-semibold'
                                        : 'bg-surface-card/60 hover:bg-bg-hover text-text-muted border border-border-subtle'
                                }`}
                            >
                                {s}
                            </button>
                        ))}
                    </div>
                )}
            </div>

            {/* CRAM SHEET MODE VIEW */}
            {isCramMode && cramData ? (
                <div className="space-y-6">
                    <div className="card p-6 border border-accent/30 bg-surface-card space-y-4 shadow-sm">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-border">
                            <div>
                                <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded text-[11px] font-mono uppercase bg-accent-subtle text-accent font-bold border border-accent/20">
                                    ⚡ Last-Night Cram Sheet (Top 10 High Yield)
                                </div>
                                <h3 className="text-xl font-bold text-text-primary mt-1">
                                    {cramData.subject_name} ({cramData.subject_code})
                                </h3>
                                <p className="text-xs text-text-muted mt-1">{cramData.exam_advice}</p>
                            </div>

                            <button
                                type="button"
                                onClick={() => window.print()}
                                className="btn-primary text-xs py-2 px-4 inline-flex items-center gap-2 shrink-0 cursor-pointer"
                            >
                                <Printer className="w-4 h-4" />
                                <span>Print / Save Clean PDF</span>
                            </button>
                        </div>

                        <div className="space-y-4">
                            {cramData.questions.map((q, idx) => (
                                <div key={q.id} className="p-4 rounded-xl bg-surface-elevated border border-border space-y-2.5 shadow-xs">
                                    <div className="flex items-start justify-between gap-3">
                                        <div className="flex items-center gap-2">
                                            <span className="w-6 h-6 rounded-full bg-accent/15 text-accent font-mono text-xs font-bold flex items-center justify-center">
                                                {idx + 1}
                                            </span>
                                            <span className="text-xs font-mono font-semibold px-2 py-0.5 rounded bg-surface-card border border-border text-text-muted">
                                                Unit {q.unit}: {q.unit_title}
                                            </span>
                                            <span className="text-xs font-mono text-rose-700 font-bold bg-rose-50 px-2 py-0.5 rounded border border-rose-200">
                                                🔥 Repeated {q.repetition_count}x
                                            </span>
                                        </div>
                                        <span className="text-xs font-mono text-accent font-semibold">{q.marks}</span>
                                    </div>

                                    <p className="text-sm font-semibold text-text-primary leading-relaxed">
                                        {q.question}
                                    </p>

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-2 text-xs">
                                        <div className="p-2.5 rounded-lg bg-surface-card border border-border-subtle">
                                            <p className="font-mono text-[10px] uppercase text-text-muted font-bold">Mandatory Evaluator Diagram</p>
                                            <p className="text-text-primary font-medium mt-0.5">{q.evaluator_blueprint.mandatory_diagram}</p>
                                        </div>
                                        <div className="p-2.5 rounded-lg bg-surface-card border border-border-subtle">
                                            <p className="font-mono text-[10px] uppercase text-text-muted font-bold">Key Points Evaluator Looks For</p>
                                            <p className="text-text-primary font-medium mt-0.5">{q.evaluator_blueprint.key_points[0]}</p>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            ) : (
                /* REGULAR INTERACTIVE MODE */
                <div className="space-y-6">
                    {/* Live Exam Readiness Simulator & Subject Summary */}
                    {data && (
                        <div className="card p-5 border border-border bg-gradient-to-br from-surface-card to-surface-elevated space-y-4">
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                                <div>
                                    <div className="flex items-center gap-2">
                                        <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-accent/15 text-accent border border-accent/30">
                                            {data.regulation} · {data.semester}
                                        </span>
                                        {data.subject_code && (
                                            <span className="text-xs font-mono text-text-muted">
                                                Code: <strong className="text-text-primary">{data.subject_code}</strong>
                                            </span>
                                        )}
                                        {data.source === 'curated_blueprint' && (
                                            <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700">
                                                <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                                                Gold Master Blueprint
                                            </span>
                                        )}
                                    </div>
                                    <h3 className="text-lg sm:text-xl font-bold text-text-primary mt-1">
                                        {data.subject_name}
                                    </h3>
                                    <p className="text-xs text-text-muted mt-1">
                                        {data.exam_readiness_advice || 'Master all 🔥 5x questions first to ensure full Part-B choices.'}
                                    </p>
                                </div>

                                {/* Live Readiness Score Dial */}
                                <div className="flex items-center gap-4 bg-surface-card border border-border p-3.5 rounded-2xl shrink-0">
                                    <div className="relative w-14 h-14 flex items-center justify-center">
                                        <svg className="w-14 h-14 -rotate-90" viewBox="0 0 36 36">
                                            <path
                                                className="text-border"
                                                strokeWidth="3.5"
                                                stroke="currentColor"
                                                fill="none"
                                                d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                                            />
                                            <path
                                                className={readinessStats.percent >= 75 ? 'text-emerald-600' : readinessStats.percent >= 40 ? 'text-amber-600' : 'text-accent'}
                                                strokeDasharray={`${readinessStats.percent}, 100`}
                                                strokeWidth="3.5"
                                                strokeLinecap="round"
                                                stroke="currentColor"
                                                fill="none"
                                                d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                                            />
                                        </svg>
                                        <div className="absolute text-center">
                                            <span className="text-xs font-mono font-bold text-text-primary">
                                                {readinessStats.percent}%
                                            </span>
                                        </div>
                                    </div>

                                    <div className="text-left space-y-1">
                                        <p className="text-xs font-mono uppercase tracking-wider text-text-muted font-bold">Exam Readiness</p>
                                        <p className="text-sm font-semibold text-text-primary">
                                            {readinessStats.mastered} of {readinessStats.total} Mastered
                                        </p>
                                        {readinessStats.mastered > 0 && (
                                            <button
                                                type="button"
                                                onClick={resetMastery}
                                                className="text-[10px] font-mono text-text-muted hover:text-rose-600 transition-colors cursor-pointer inline-flex items-center gap-1"
                                            >
                                                <RotateCcw className="w-2.5 h-2.5" /> Reset
                                            </button>
                                        )}
                                    </div>
                                </div>
                            </div>

                            {/* Unit-by-Unit Readiness Progress Chips */}
                            <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 pt-2 border-t border-border/50">
                                {[1, 2, 3, 4, 5].map(uNum => {
                                    const stat = readinessStats.unitMap[uNum];
                                    if (!stat) return null;
                                    return (
                                        <div
                                            key={uNum}
                                            onClick={() => toggleUnit(uNum)}
                                            className="p-2 rounded-xl bg-surface-card border border-border-subtle hover:border-accent/40 transition-colors cursor-pointer text-left"
                                        >
                                            <div className="flex items-center justify-between text-[11px] font-mono text-text-muted">
                                                <span>Unit {uNum}</span>
                                                <span className={stat.percent === 100 ? 'text-emerald-700 font-bold' : stat.percent > 0 ? 'text-amber-800 font-bold' : 'text-text-muted'}>
                                                    {stat.percent}%
                                                </span>
                                            </div>
                                            <div className="w-full bg-border rounded-full h-1.5 mt-1.5 overflow-hidden">
                                                <div
                                                    className={`h-full rounded-full transition-all duration-500 ${
                                                        stat.percent === 100 ? 'bg-emerald-600' : stat.percent > 0 ? 'bg-amber-600' : 'bg-transparent'
                                                    }`}
                                                    style={{ width: `${stat.percent}%` }}
                                                />
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    )}

                    {/* Loading State */}
                    {loading && (
                        <div className="card p-12 text-center space-y-3 border border-border">
                            <div className="w-10 h-10 border-3 border-accent border-t-transparent rounded-full animate-spin mx-auto" />
                            <p className="text-sm font-semibold text-text-primary">Loading time-to-time questions...</p>
                            <p className="text-xs text-text-muted">Analyzing repetition frequencies and evaluator blueprints...</p>
                        </div>
                    )}

                    {/* Unit Accordions and Question Cards */}
                    {!loading && data && data.units && data.units.length > 0 ? (
                        <div className="space-y-4">
                            {data.units.map(unit => {
                                // Apply drop filter if applicable
                                if (dropFilter === 'mid1' && unit.unit > 2) return null;
                                if (dropFilter === 'mid2' && unit.unit <= 2) return null;

                                const isExpanded = expandedUnits.has(unit.unit);

                                return (
                                    <div
                                        key={unit.unit}
                                        className="card border border-border overflow-hidden transition-all shadow-sm"
                                    >
                                        {/* Unit Header Bar */}
                                        <div
                                            onClick={() => toggleUnit(unit.unit)}
                                            className="flex flex-col sm:flex-row sm:items-center justify-between p-4 sm:p-5 bg-surface-elevated/80 hover:bg-bg-hover transition-colors cursor-pointer gap-3"
                                        >
                                            <div className="flex items-center gap-3">
                                                <div className="w-8 h-8 rounded-lg bg-accent/15 border border-accent/30 text-accent font-mono font-bold text-xs flex items-center justify-center shrink-0">
                                                    U{unit.unit}
                                                </div>
                                                <div>
                                                    <div className="flex items-center gap-2">
                                                        <h4 className="text-sm sm:text-base font-bold text-text-primary">
                                                            Unit {unit.unit}: {unit.title}
                                                        </h4>
                                                        <span className="text-[11px] font-mono px-2 py-0.5 rounded-full bg-surface-card border border-border text-text-muted">
                                                            {unit.question_count} Questions
                                                        </span>
                                                    </div>
                                                </div>
                                            </div>

                                            <div className="flex items-center gap-2.5 shrink-0" onClick={e => e.stopPropagation()}>
                                                {/* Direct Lecture Note jump button */}
                                                {unit.linked_note && (
                                                    <button
                                                        type="button"
                                                        onClick={() => handleNoteClick(unit.linked_note)}
                                                        className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 text-emerald-800 transition-all inline-flex items-center gap-1.5 cursor-pointer"
                                                        title="Read Lecture Note PDF for this Unit"
                                                    >
                                                        <BookOpen className="w-3.5 h-3.5" />
                                                        <span>Open Unit {unit.unit} Note</span>
                                                    </button>
                                                )}

                                                <button
                                                    type="button"
                                                    onClick={() => toggleUnit(unit.unit)}
                                                    className="p-1.5 rounded-lg text-text-muted hover:text-text-primary transition-colors cursor-pointer"
                                                    aria-label="Toggle unit"
                                                >
                                                    {isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                                                </button>
                                            </div>
                                        </div>

                                        {/* Unit Question List */}
                                        <AnimatePresence>
                                            {isExpanded && (
                                                <motion.div
                                                    initial={{ height: 0, opacity: 0 }}
                                                    animate={{ height: 'auto', opacity: 1 }}
                                                    exit={{ height: 0, opacity: 0 }}
                                                    transition={{ duration: 0.2 }}
                                                    className="p-4 sm:p-5 space-y-4 border-t border-border/60 bg-surface-card/40"
                                                >
                                                    {unit.questions.map((q) => {
                                                        const isBlueprintOpen = expandedBlueprints.has(q.id);
                                                        const currentMastery = masteryMap[q.id] || 'unread';

                                                        return (
                                                            <div
                                                                key={q.id}
                                                                className={`p-4 sm:p-5 rounded-2xl border transition-all ${
                                                                    currentMastery === 'mastered'
                                                                        ? 'bg-emerald-50 border-emerald-300'
                                                                        : currentMastery === 'revising'
                                                                        ? 'bg-amber-50 border-amber-300'
                                                                        : 'bg-surface-elevated border-border shadow-xs'
                                                                } space-y-3.5`}
                                                            >
                                                                {/* Question Meta Strip */}
                                                                <div className="flex flex-wrap items-center justify-between gap-2.5">
                                                                    <div className="flex flex-wrap items-center gap-2">
                                                                        {/* Repetition badge */}
                                                                        <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md text-xs font-mono font-bold ${
                                                                            q.probability_stars === 5
                                                                                ? 'bg-rose-50 text-rose-700 border border-rose-200'
                                                                                : 'bg-amber-50 text-amber-800 border border-amber-200'
                                                                        }`}>
                                                                            <Flame className="w-3 h-3 text-rose-600" />
                                                                            Repeated {q.repetition_count}x
                                                                        </span>

                                                                        <span className="text-xs font-mono px-2 py-0.5 rounded bg-surface-card border border-border text-text-muted">
                                                                            {q.marks}
                                                                        </span>

                                                                        {q.exam_history && q.exam_history.length > 0 && (
                                                                            <div className="hidden sm:flex items-center gap-1 text-[11px] font-mono text-text-muted">
                                                                                <span>Papers:</span>
                                                                                {q.exam_history.slice(0, 3).map(yr => (
                                                                                    <span key={yr} className="px-1.5 py-0.2 rounded bg-surface-card border border-border-subtle text-[10px]">
                                                                                        {yr}
                                                                                    </span>
                                                                                ))}
                                                                                {q.exam_history.length > 3 && (
                                                                                    <span className="text-[10px] opacity-60">+{q.exam_history.length - 3}</span>
                                                                                )}
                                                                            </div>
                                                                        )}
                                                                    </div>

                                                                    {/* Interactive 3-way mastery switcher */}
                                                                    <div className="flex items-center gap-1 bg-surface-card border border-border p-1 rounded-xl">
                                                                        <button
                                                                            type="button"
                                                                            onClick={() => setQuestionMastery(q.id, 'unread')}
                                                                            className={`px-2 py-1 rounded-lg text-[10px] font-mono transition-colors cursor-pointer ${
                                                                                currentMastery === 'unread'
                                                                                    ? 'bg-surface-elevated text-text-muted font-bold'
                                                                                    : 'text-text-muted/60 hover:text-text-muted'
                                                                            }`}
                                                                        >
                                                                            To-Do
                                                                        </button>
                                                                        <button
                                                                            type="button"
                                                                            onClick={() => setQuestionMastery(q.id, 'revising')}
                                                                            className={`px-2 py-1 rounded-lg text-[10px] font-mono transition-colors cursor-pointer ${
                                                                                currentMastery === 'revising'
                                                                                    ? 'bg-amber-100 text-amber-800 font-bold'
                                                                                    : 'text-text-muted/60 hover:text-amber-700'
                                                                            }`}
                                                                        >
                                                                            Revising
                                                                        </button>
                                                                        <button
                                                                            type="button"
                                                                            onClick={() => setQuestionMastery(q.id, 'mastered')}
                                                                            className={`px-2 py-1 rounded-lg text-[10px] font-mono transition-colors cursor-pointer ${
                                                                                currentMastery === 'mastered'
                                                                                    ? 'bg-emerald-100 text-emerald-800 font-bold'
                                                                                    : 'text-text-muted/60 hover:text-emerald-700'
                                                                            }`}
                                                                        >
                                                                            Mastered ✅
                                                                        </button>
                                                                    </div>
                                                                </div>

                                                                {/* Question Statement */}
                                                                <p className="text-sm sm:text-base font-semibold text-text-primary leading-relaxed">
                                                                    {q.question}
                                                                </p>

                                                                {/* Action toolbar & Blueprint toggle */}
                                                                <div className="flex flex-wrap items-center justify-between gap-2.5 pt-2 border-t border-border/40">
                                                                    <button
                                                                        type="button"
                                                                        onClick={() => toggleBlueprint(q.id)}
                                                                        className="text-xs font-semibold text-accent hover:text-accent/80 transition-colors inline-flex items-center gap-1.5 cursor-pointer"
                                                                    >
                                                                        <Layers className="w-3.5 h-3.5" />
                                                                        <span>
                                                                            {isBlueprintOpen ? 'Hide Evaluator Blueprint' : 'View Evaluator Blueprint & Rubric'}
                                                                        </span>
                                                                        {isBlueprintOpen ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
                                                                    </button>

                                                                    <div className="flex items-center gap-2">
                                                                        <button
                                                                            type="button"
                                                                            onClick={() => handleCopyPrompt(q)}
                                                                            className="px-2.5 py-1.5 rounded-lg text-xs font-mono text-text-muted hover:text-text-primary bg-surface-card hover:bg-bg-hover border border-border transition-colors inline-flex items-center gap-1.5 cursor-pointer"
                                                                            title="Copy question with AI solution prompt"
                                                                        >
                                                                            <Copy className="w-3.5 h-3.5" />
                                                                            <span>Copy Prompt</span>
                                                                        </button>

                                                                        {unit.linked_note && (
                                                                            <button
                                                                                type="button"
                                                                                onClick={() => handleNoteClick(unit.linked_note)}
                                                                                className="px-2.5 py-1.5 rounded-lg text-xs font-mono text-emerald-700 hover:text-emerald-800 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 transition-colors inline-flex items-center gap-1.5 cursor-pointer font-semibold"
                                                                            >
                                                                                <FileText className="w-3.5 h-3.5" />
                                                                                <span>Read Note</span>
                                                                            </button>
                                                                        )}
                                                                    </div>
                                                                </div>

                                                                {/* Evaluator Blueprint Dropdown Drawer */}
                                                                <AnimatePresence>
                                                                    {isBlueprintOpen && q.evaluator_blueprint && (
                                                                        <motion.div
                                                                            initial={{ height: 0, opacity: 0 }}
                                                                            animate={{ height: 'auto', opacity: 1 }}
                                                                            exit={{ height: 0, opacity: 0 }}
                                                                            transition={{ duration: 0.2 }}
                                                                            className="p-4 rounded-xl bg-surface-card border border-border space-y-3 text-xs"
                                                                        >
                                                                            <div className="flex items-center justify-between pb-2 border-b border-border-subtle">
                                                                                <span className="font-mono text-[11px] uppercase tracking-wider text-accent font-bold">
                                                                                    JNTUH Paper Evaluator's Blueprint
                                                                                </span>
                                                                                <span className="font-mono text-text-muted">
                                                                                    Est. Writing Time: {q.evaluator_blueprint.approx_time || '14 mins'}
                                                                                </span>
                                                                            </div>

                                                                            {/* Mandatory Diagram */}
                                                                            {q.evaluator_blueprint.mandatory_diagram && (
                                                                                <div className="p-3 rounded-lg bg-amber-50 border border-amber-200 space-y-1">
                                                                                    <p className="font-mono text-[10px] uppercase font-bold text-amber-800">
                                                                                        Mandatory Diagram / Flowchart (Evaluators award 30-40% marks here)
                                                                                    </p>
                                                                                    <p className="text-text-primary font-medium">
                                                                                        {q.evaluator_blueprint.mandatory_diagram}
                                                                                    </p>
                                                                                </div>
                                                                            )}

                                                                            {/* Key Points */}
                                                                            {q.evaluator_blueprint.key_points && (
                                                                                <div className="space-y-1.5">
                                                                                    <p className="font-mono text-[10px] uppercase font-bold text-text-muted">
                                                                                        Key Points & Derivations Expected in Answer:
                                                                                    </p>
                                                                                    <ul className="space-y-1 text-text-primary">
                                                                                        {q.evaluator_blueprint.key_points.map((pt, pIdx) => (
                                                                                            <li key={pIdx} className="flex items-start gap-2">
                                                                                                <span className="text-accent font-bold mt-0.5">•</span>
                                                                                                <span>{pt}</span>
                                                                                            </li>
                                                                                        ))}
                                                                                    </ul>
                                                                                </div>
                                                                            )}

                                                                            {/* Pitfalls */}
                                                                            {q.evaluator_blueprint.pitfalls && (
                                                                                <div className="p-2.5 rounded-lg bg-rose-50 border border-rose-200 text-rose-800">
                                                                                    <p className="font-mono text-[10px] uppercase font-bold text-rose-700">
                                                                                        Avoid Common Pitfall:
                                                                                    </p>
                                                                                    <p className="mt-0.5">{q.evaluator_blueprint.pitfalls}</p>
                                                                                </div>
                                                                            )}
                                                                        </motion.div>
                                                                    )}
                                                                </AnimatePresence>
                                                            </div>
                                                        );
                                                    })}
                                                </motion.div>
                                            )}
                                        </AnimatePresence>
                                    </div>
                                );
                            })}
                        </div>
                    ) : !loading && (
                        <div className="card p-12 text-center space-y-3 border border-border shadow-xs">
                            <AlertCircle className="w-10 h-10 text-amber-600 mx-auto" />
                            <h4 className="text-base font-bold text-text-primary">No Questions Match Active Filters</h4>
                            <p className="text-xs text-text-muted max-w-md mx-auto">
                                Try clearing the search query or switching to another core course like Matrices & Calculus,
                                Data Structures, Operating Systems, or Networks.
                            </p>
                            <button
                                type="button"
                                onClick={() => {
                                    setSearchQuery('');
                                    setHighProbOnly(false);
                                    setDropFilter('all');
                                }}
                                className="btn-secondary text-xs py-2 px-4 cursor-pointer"
                            >
                                Reset Filters
                            </button>
                        </div>
                    )}
                </div>
            )}

            {/* REQUEST UPCOMING DROP MODAL */}
            <AnimatePresence>
                {showRequestModal && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm">
                        <motion.div
                            initial={{ scale: 0.95, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.95, opacity: 0 }}
                            className="card w-full max-w-md p-6 border border-border bg-surface-card space-y-4"
                        >
                            <div className="flex items-center justify-between pb-3 border-b border-border">
                                <h3 className="text-base font-bold text-text-primary">Request Important Questions Drop</h3>
                                <button
                                    type="button"
                                    onClick={() => setShowRequestModal(false)}
                                    className="p-1 text-text-muted hover:text-text-primary cursor-pointer"
                                >
                                    <X className="w-4 h-4" />
                                </button>
                            </div>

                            <form onSubmit={handleSendRequest} className="space-y-3 text-xs">
                                <div>
                                    <label className="font-mono uppercase text-[10px] text-text-muted font-bold block mb-1">
                                        Subject Name or Code *
                                    </label>
                                    <input
                                        type="text"
                                        required
                                        value={requestSubject}
                                        onChange={e => setRequestSubject(e.target.value)}
                                        placeholder="e.g. Formal Languages & Automata Theory"
                                        className="w-full px-3 py-2 rounded-lg bg-surface-elevated border border-border text-text-primary focus:outline-none focus:border-accent"
                                    />
                                </div>

                                <div className="grid grid-cols-2 gap-2">
                                    <div>
                                        <label className="font-mono uppercase text-[10px] text-text-muted font-bold block mb-1">
                                            Regulation
                                        </label>
                                        <select
                                            value={regulation}
                                            onChange={e => setRegulation(e.target.value)}
                                            className="w-full px-2.5 py-2 rounded-lg bg-surface-elevated border border-border text-text-primary focus:outline-none focus:border-accent"
                                        >
                                            <option value="R22">R22</option>
                                            <option value="R18">R18</option>
                                            <option value="R25">R25</option>
                                        </select>
                                    </div>
                                    <div>
                                        <label className="font-mono uppercase text-[10px] text-text-muted font-bold block mb-1">
                                            Exam Date (Approx)
                                        </label>
                                        <input
                                            type="text"
                                            value={requestExamDate}
                                            onChange={e => setRequestExamDate(e.target.value)}
                                            placeholder="e.g. 24 Nov 2024"
                                            className="w-full px-3 py-2 rounded-lg bg-surface-elevated border border-border text-text-primary focus:outline-none focus:border-accent"
                                        />
                                    </div>
                                </div>

                                <div>
                                    <label className="font-mono uppercase text-[10px] text-text-muted font-bold block mb-1">
                                        Specific Unit / Question Tip (Optional)
                                    </label>
                                    <textarea
                                        rows={3}
                                        value={requestTip}
                                        onChange={e => setRequestTip(e.target.value)}
                                        placeholder="e.g. Please include Unit 3 & 4 numericals asked in recent July 2024 supply paper..."
                                        className="w-full px-3 py-2 rounded-lg bg-surface-elevated border border-border text-text-primary focus:outline-none focus:border-accent resize-none"
                                    />
                                </div>

                                <div className="flex items-center justify-end gap-2 pt-2">
                                    <button
                                        type="button"
                                        onClick={() => setShowRequestModal(false)}
                                        className="btn-secondary text-xs py-2 px-3 cursor-pointer"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        type="submit"
                                        disabled={submittingRequest}
                                        className="btn-primary text-xs py-2 px-4 cursor-pointer inline-flex items-center gap-1.5"
                                    >
                                        <Send className="w-3.5 h-3.5" />
                                        <span>{submittingRequest ? 'Submitting...' : 'Submit Request'}</span>
                                    </button>
                                </div>
                            </form>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    );
}
