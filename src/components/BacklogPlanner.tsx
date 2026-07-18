import { useCallback, useEffect, useMemo, useState } from 'react';
import { useAcademic } from '../context/AcademicContext';
import { getBacklogs } from '../utils/calculations';
import { resolveCredits } from '../utils/inferCredits';
import {
    Target, Calendar, AlertTriangle, BookOpen, ExternalLink,
    CheckSquare, Square, Map, FileQuestion, Loader2,
} from 'lucide-react';
import SectionHeader from './ui/SectionHeader';

const API_BASE = import.meta.env.VITE_API_URL || '';
const CHECKLIST_KEY = 'jntuh_backlog_checklist';

interface BacklogPlannerProps {
    onOpenStudyLibrary?: () => void;
}

interface CalendarEvent {
    type: string;
    label: string;
    date: string;
}

interface GapUnit {
    unit: number;
    title: string;
    weight_hint?: string;
    topics?: string[];
}

interface GapPayload {
    matched?: string | null;
    focus_units?: GapUnit[];
    study_tip?: string;
}

interface PyqLink {
    label: string;
    url: string;
    type?: string;
}

interface PyqPack {
    title: string;
    matched?: boolean;
    links?: PyqLink[];
    topics?: string[];
}

function loadChecklist(): Set<string> {
    try {
        const raw = localStorage.getItem(CHECKLIST_KEY);
        if (!raw) return new Set();
        return new Set(JSON.parse(raw) as string[]);
    } catch {
        return new Set();
    }
}

function saveChecklist(set: Set<string>) {
    try {
        localStorage.setItem(CHECKLIST_KEY, JSON.stringify([...set]));
    } catch {
        /* ignore */
    }
}

function daysUntil(iso: string): number | null {
    const t = Date.parse(iso);
    if (!Number.isFinite(t)) return null;
    return Math.ceil((t - Date.now()) / (1000 * 60 * 60 * 24));
}

function addDays(iso: string, days: number): string {
    const d = new Date(iso);
    d.setDate(d.getDate() + days);
    return d.toISOString().slice(0, 10);
}

export default function BacklogPlanner({ onOpenStudyLibrary }: BacklogPlannerProps) {
    const { data } = useAcademic();
    const backlogs = getBacklogs(data.semesters);
    const [done, setDone] = useState<Set<string>>(() => loadChecklist());
    const [examDeadline, setExamDeadline] = useState<CalendarEvent | null>(null);
    const [expandedGap, setExpandedGap] = useState<string | null>(null);
    const [gapCache, setGapCache] = useState<Record<string, GapPayload>>({});
    const [pyqCache, setPyqCache] = useState<Record<string, PyqPack>>({});
    const [loadingKey, setLoadingKey] = useState<string | null>(null);

    useEffect(() => {
        const controller = new AbortController();
        (async () => {
            try {
                const res = await fetch(`${API_BASE}/api/calendars`, { signal: controller.signal });
                if (!res.ok) return;
                const json = await res.json();
                const events: CalendarEvent[] = (json.items || []).flatMap((c: { events?: CalendarEvent[] }) => c.events || []);
                const upcoming = events
                    .filter((e) => e.date && (e.type === 'supply_exam' || e.type === 'end_exam' || /supply|exam/i.test(e.label)))
                    .map((e) => ({ ...e, _days: daysUntil(e.date) }))
                    .filter((e) => e._days !== null && (e._days as number) >= -7)
                    .sort((a, b) => (a._days as number) - (b._days as number));
                if (upcoming[0]) setExamDeadline(upcoming[0]);
            } catch {
                /* offline ok */
            }
        })();
        return () => controller.abort();
    }, []);

    const plan = useMemo(() => {
        const deadlineIso = examDeadline?.date;
        const resolved = [...backlogs]
            .map((b) => ({
                ...b,
                credits: resolveCredits(b.credits, b.subjectCode, b.subjectName, b.year, b.sem, data.regulation, b.grade),
                key: `${b.subjectCode}|${b.subjectName}|${b.year}-${b.sem}`,
            }))
            .sort((a, b) => b.credits - a.credits)
            .map((b, i) => {
                const week = Math.ceil((i + 1) / 2);
                let clearBy: string | null = null;
                if (deadlineIso) {
                    // Spread work so later priorities still clear before the exam window
                    const days = daysUntil(deadlineIso) ?? 28;
                    const offset = Math.max(3, Math.floor(days * (week / Math.max(1, Math.ceil(backlogs.length / 2)))));
                    clearBy = addDays(new Date().toISOString().slice(0, 10), offset);
                    if (Date.parse(clearBy) > Date.parse(deadlineIso)) clearBy = deadlineIso;
                }
                return {
                    ...b,
                    priority: i + 1,
                    week,
                    clearBy,
                    focus: b.credits >= 4
                        ? 'High-credit theory — revise syllabus units + PYQs'
                        : 'Revise notes + solve PYQs this week',
                };
            });
        return resolved;
    }, [backlogs, data.regulation, examDeadline]);

    const toggleDone = (key: string) => {
        setDone((prev) => {
            const next = new Set(prev);
            if (next.has(key)) next.delete(key);
            else next.add(key);
            saveChecklist(next);
            return next;
        });
    };

    const loadStudyAids = useCallback(async (name: string, code: string, key: string) => {
        setExpandedGap((cur) => (cur === key ? null : key));
        if (gapCache[key] && pyqCache[key]) return;
        setLoadingKey(key);
        try {
            const params = new URLSearchParams({
                subject_name: name,
                subject_code: code,
                regulation: data.regulation,
            });
            const [gapRes, pyqRes] = await Promise.all([
                fetch(`${API_BASE}/api/syllabus/gap?${params}`),
                fetch(`${API_BASE}/api/pyq/pack?${params}`),
            ]);
            if (gapRes.ok) {
                const gap = await gapRes.json();
                setGapCache((p) => ({ ...p, [key]: gap }));
            }
            if (pyqRes.ok) {
                const pack = await pyqRes.json();
                setPyqCache((p) => ({ ...p, [key]: pack }));
            }
        } catch {
            /* ignore */
        } finally {
            setLoadingKey(null);
        }
    }, [data.regulation, gapCache, pyqCache]);

    const deadlineDays = examDeadline?.date ? daysUntil(examDeadline.date) : null;

    return (
        <div className="space-y-6">
            <SectionHeader
                icon={Target}
                title="Backlog recovery plan"
                subtitle={
                    backlogs.length > 0
                        ? `${backlogs.length} active backlog(s) · 2 subjects / week · exam-aware deadlines`
                        : 'No active backlogs in this session'
                }
            />

            {examDeadline && (
                <div className="card p-4 border border-amber-500/25 bg-amber-500/5 flex gap-3 items-start">
                    <Calendar className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
                    <div>
                        <p className="text-sm font-bold text-amber-300">
                            Next exam window · {examDeadline.label}
                        </p>
                        <p className="text-xs text-text-muted mt-1">
                            Target date {examDeadline.date}
                            {deadlineDays !== null && (
                                <span className="text-amber-400 font-semibold">
                                    {' '}· {deadlineDays >= 0 ? `${deadlineDays} day(s) left` : `${Math.abs(deadlineDays)} day(s) ago`}
                                </span>
                            )}
                        </p>
                        <p className="text-[11px] text-text-muted mt-1">
                            Weekly clear-by dates below are paced toward this window. Verify on jntuh.ac.in.
                        </p>
                    </div>
                </div>
            )}

            {plan.length === 0 ? (
                <div className="card p-8 text-center">
                    <p className="text-emerald-400 font-bold">No active backlogs!</p>
                </div>
            ) : (
                <div className="space-y-3">
                    {plan.map((item) => {
                        const checked = done.has(item.key);
                        const gap = gapCache[item.key];
                        const pack = pyqCache[item.key];
                        const open = expandedGap === item.key;
                        return (
                            <div
                                key={item.key}
                                className={`card p-4 space-y-3 ${checked ? 'opacity-60' : ''}`}
                            >
                                <div className="flex flex-col sm:flex-row gap-4">
                                    <div className="flex gap-4 flex-1 min-w-0">
                                        <button
                                            type="button"
                                            onClick={() => toggleDone(item.key)}
                                            className="w-10 h-10 rounded-xl bg-primary/20 flex items-center justify-center text-primary shrink-0"
                                            aria-label={checked ? 'Mark incomplete' : 'Mark revised'}
                                        >
                                            {checked ? <CheckSquare className="w-5 h-5" /> : <Square className="w-5 h-5 opacity-50" />}
                                        </button>
                                        <div className="flex-1 min-w-0">
                                            <p className={`font-bold text-white truncate ${checked ? 'line-through' : ''}`}>
                                                {item.priority}. {item.subjectName}
                                            </p>
                                            <p className="text-xs text-text-muted">
                                                {item.subjectCode || '—'} · Sem {item.year}-{item.sem} · {item.credits} credits
                                            </p>
                                            <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2 text-xs">
                                                <span className="flex items-center gap-1 text-amber-400">
                                                    <Calendar className="w-3 h-3" /> Week {item.week}
                                                </span>
                                                {item.clearBy && (
                                                    <span className="text-rose-300">Clear by {item.clearBy}</span>
                                                )}
                                                <span className="text-text-secondary">{item.focus}</span>
                                            </div>
                                            <div className="flex flex-wrap gap-2 mt-3">
                                                <button
                                                    type="button"
                                                    onClick={() => loadStudyAids(item.subjectName, item.subjectCode, item.key)}
                                                    className="btn-secondary text-[11px] py-1.5 px-3 inline-flex items-center gap-1.5"
                                                >
                                                    {loadingKey === item.key
                                                        ? <Loader2 className="w-3 h-3 animate-spin" />
                                                        : <Map className="w-3 h-3" />}
                                                    Syllabus gap + PYQs
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={() => {
                                                        try {
                                                            sessionStorage.setItem('notesFocusSubject', item.subjectName);
                                                            sessionStorage.setItem('notesFocusCode', item.subjectCode || '');
                                                        } catch { /* ignore */ }
                                                        onOpenStudyLibrary?.();
                                                    }}
                                                    className="btn-secondary text-[11px] py-1.5 px-3 inline-flex items-center gap-1.5"
                                                >
                                                    <BookOpen className="w-3 h-3" />
                                                    Study Library
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                    <AlertTriangle className="w-5 h-5 text-rose-400 shrink-0 self-start sm:mt-1" />
                                </div>

                                {open && (
                                    <div className="border-t border-white/5 pt-3 space-y-3">
                                        {gap && (
                                            <div className="bg-black/25 rounded-xl p-3 space-y-2">
                                                <p className="text-[10px] font-bold uppercase tracking-wider text-violet-300 flex items-center gap-1.5">
                                                    <Map className="w-3 h-3" /> Syllabus gap map
                                                    {gap.matched ? ` · ${gap.matched}` : ' · generic plan'}
                                                </p>
                                                {gap.study_tip && (
                                                    <p className="text-xs text-text-secondary">{gap.study_tip}</p>
                                                )}
                                                <ul className="space-y-1.5">
                                                    {(gap.focus_units || [])
                                                        .filter((u) => u.weight_hint === 'high')
                                                        .concat((gap.focus_units || []).filter((u) => u.weight_hint !== 'high'))
                                                        .slice(0, 5)
                                                        .map((u) => (
                                                            <li key={u.unit} className="text-xs text-text-muted">
                                                                <span className="text-white font-semibold">Unit {u.unit}: {u.title}</span>
                                                                {u.weight_hint === 'high' && (
                                                                    <span className="ml-2 text-amber-400 text-[10px] font-bold">HIGH WEIGHT</span>
                                                                )}
                                                                {u.topics?.length ? (
                                                                    <span className="block text-[11px] mt-0.5">{u.topics.join(' · ')}</span>
                                                                ) : null}
                                                            </li>
                                                        ))}
                                                </ul>
                                            </div>
                                        )}
                                        {pack && (
                                            <div className="bg-black/25 rounded-xl p-3 space-y-2">
                                                <p className="text-[10px] font-bold uppercase tracking-wider text-emerald-300 flex items-center gap-1.5">
                                                    <FileQuestion className="w-3 h-3" /> {pack.title || 'PYQ pack'}
                                                </p>
                                                {pack.topics?.length ? (
                                                    <p className="text-[11px] text-text-muted">{pack.topics.join(' · ')}</p>
                                                ) : null}
                                                <div className="flex flex-wrap gap-2">
                                                    {(pack.links || []).map((link) => (
                                                        <a
                                                            key={link.url}
                                                            href={link.url}
                                                            target="_blank"
                                                            rel="noopener noreferrer"
                                                            className="btn-secondary text-[11px] py-1.5 px-3 inline-flex items-center gap-1.5"
                                                        >
                                                            <ExternalLink className="w-3 h-3" />
                                                            {link.label}
                                                        </a>
                                                    ))}
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
}
