import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import {
    Bell,
    Calendar,
    ExternalLink,
    Loader2,
    AlertCircle,
    RefreshCw,
    BellRing,
    BellOff,
    Search,
    X,
    Filter,
    CheckCircle2,
    CalendarDays,
} from 'lucide-react';
import { useAcademic } from '../context/AcademicContext';
import { parseHtno } from '../utils/htnoProfile';
import { REGULATIONS } from '../constants/grading';
import toast from 'react-hot-toast';
import { FALLBACK_NOTIFICATIONS, FALLBACK_CALENDARS } from '../constants/fallbackUpdates';

const API_BASE = import.meta.env.VITE_API_URL || '';
const FETCH_TIMEOUT_MS = 15000;
const ALERT_PREFS_KEY = 'jntuh_alert_prefs';

interface Notification {
    id: string;
    title: string;
    date: string;
    category: string;
    degree: string[];
    regulation: string[];
    url: string;
    exam_year: string;
    source?: string;
}

interface CalendarItem {
    id: string;
    title: string;
    academic_year: string;
    degree: string;
    date: string;
    url: string;
    events: { type: string; label: string; date: string }[];
}

interface AlertPrefs {
    pushEnabled: boolean;
    personalized: boolean;
    seenIds: string[];
}

function loadAlertPrefs(): AlertPrefs {
    try {
        const raw = localStorage.getItem(ALERT_PREFS_KEY);
        if (raw) return { pushEnabled: false, personalized: true, seenIds: [], ...JSON.parse(raw) };
    } catch { /* ignore */ }
    return { pushEnabled: false, personalized: true, seenIds: [] };
}

function saveAlertPrefs(prefs: AlertPrefs) {
    try {
        localStorage.setItem(ALERT_PREFS_KEY, JSON.stringify(prefs));
    } catch { /* ignore */ }
}

async function fetchJson<T>(url: string, signal: AbortSignal): Promise<T> {
    const response = await fetch(url, { signal });
    if (!response.ok) {
        throw new Error(`Request failed (${response.status})`);
    }
    return response.json() as Promise<T>;
}

function parseTags(val: unknown): string[] {
    if (!val) return [];
    if (Array.isArray(val)) {
        return val.map(String).map(s => s.trim()).filter(Boolean);
    }
    if (typeof val === 'string') {
        const parts = val.split(/[,\s]+/).map(s => s.trim()).filter(Boolean);
        return parts.length > 0 ? parts : [val.trim()];
    }
    return [String(val).trim()];
}

function parseDateBadge(dateStr: string): { day: string; month: string } {
    if (!dateStr) return { day: '—', month: 'CIRC' };
    const dmy = dateStr.match(/^(\d{1,2})[-/](\d{1,2})[-/](\d{4})$/);
    if (dmy) {
        const months = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];
        const mIdx = parseInt(dmy[2], 10) - 1;
        return {
            day: dmy[1].padStart(2, '0'),
            month: months[mIdx] || dmy[2],
        };
    }
    const ymd = dateStr.match(/^(\d{4})[-/](\d{1,2})[-/](\d{1,2})$/);
    if (ymd) {
        const months = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];
        const mIdx = parseInt(ymd[2], 10) - 1;
        return {
            day: ymd[3].padStart(2, '0'),
            month: months[mIdx] || ymd[2],
        };
    }
    return { day: '—', month: 'JNTUH' };
}

function getCategoryBadge(cat: string) {
    const c = (cat || '').toLowerCase();
    if (c === 'results') {
        return {
            label: 'Results Release',
            className: 'bg-emerald-50 text-emerald-700 border border-emerald-200 font-semibold',
        };
    }
    if (c === 'exams' || c.includes('exam')) {
        return {
            label: 'Exam Circular',
            className: 'bg-amber-50 text-amber-800 border border-amber-200 font-semibold',
        };
    }
    if (c === 'timetable' || c.includes('time')) {
        return {
            label: 'Time Table',
            className: 'bg-sky-50 text-sky-700 border border-sky-200 font-semibold',
        };
    }
    return {
        label: 'Academic Notice',
        className: 'bg-accent-subtle text-accent border border-accent/25 font-semibold',
    };
}

export default function NotificationsHub() {
    const { data } = useAcademic();
    const profile = parseHtno(data.hallTicket);

    const [tab, setTab] = useState<'notifications' | 'calendars'>('notifications');
    const [rawNotifications, setRawNotifications] = useState<Notification[]>([]);
    const [calendars, setCalendars] = useState<CalendarItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // Filters
    const [searchQuery, setSearchQuery] = useState('');
    const [categoryFilter, setCategoryFilter] = useState('');
    const [examYear, setExamYear] = useState('');
    const [degree, setDegree] = useState('');
    const [regulation, setRegulation] = useState('');

    const [prefs, setPrefs] = useState<AlertPrefs>(() => loadAlertPrefs());
    const personalizedOnce = useRef(false);

    // Auto-personalize filters from hall ticket / session regulation
    useEffect(() => {
        if (!prefs.personalized || personalizedOnce.current) return;
        if (profile) {
            setDegree(profile.degreeLabel === 'B.Pharmacy' ? 'B.Pharm' : profile.degreeLabel);
            setRegulation(data.regulation || profile.regulationHint);
            personalizedOnce.current = true;
        } else if (data.regulation) {
            setRegulation(data.regulation);
            personalizedOnce.current = true;
        }
    }, [prefs.personalized, profile, data.regulation]);

    const fetchData = useCallback(async () => {
        setLoading(true);
        setError(null);

        const controller = new AbortController();
        const timeoutId = window.setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

        try {
            const [notifResult, calResult] = await Promise.allSettled([
                fetchJson<{ items: unknown[] }>(
                    `${API_BASE}/api/notifications`,
                    controller.signal,
                ),
                fetchJson<{ items: CalendarItem[] }>(
                    `${API_BASE}/api/calendars`,
                    controller.signal,
                ),
            ]);

            let items: Notification[] = [];
            let cals: CalendarItem[] = [];
            let hadFetchFailure = false;

            if (notifResult.status === 'fulfilled' && Array.isArray(notifResult.value?.items)) {
                items = (notifResult.value.items as Record<string, unknown>[]).map((raw) => ({
                    id: String(raw.id || Math.random()),
                    title: String(raw.title || ''),
                    date: String(raw.date || ''),
                    category: String(raw.category || 'general'),
                    degree: parseTags(raw.degree),
                    regulation: parseTags(raw.regulation),
                    url: String(raw.url || 'https://jntuh.ac.in'),
                    exam_year: String(raw.exam_year || '2026'),
                    source: raw.source ? String(raw.source) : 'JNTU Fast Updates',
                }));
            } else {
                hadFetchFailure = true;
            }

            if (calResult.status === 'fulfilled' && Array.isArray(calResult.value?.items)) {
                cals = calResult.value.items;
            } else {
                hadFetchFailure = true;
            }

            if (items.length === 0) {
                items = FALLBACK_NOTIFICATIONS.map(f => ({
                    ...f,
                    degree: parseTags(f.degree),
                    regulation: parseTags(f.regulation),
                }));
                if (hadFetchFailure) {
                    setError('Live feed server unreachable. Displaying official archives.');
                }
            } else {
                setError(null);
            }

            if (cals.length === 0) {
                cals = FALLBACK_CALENDARS;
            }

            setRawNotifications(items);
            setCalendars(cals);

            // Push notifications check
            if (prefs.pushEnabled && 'Notification' in window && Notification.permission === 'granted') {
                const currentPrefs = loadAlertPrefs();
                const fresh = items.filter(
                    (n) => !currentPrefs.seenIds.includes(n.id) && (n.category === 'results' || n.category === 'exams' || n.category === 'timetable')
                );
                fresh.slice(0, 2).forEach((n) => {
                    try {
                        new Notification('JNTUH Academic Notice', {
                            body: n.title.slice(0, 120),
                            tag: n.id,
                        });
                    } catch { /* ignore */ }
                });
                if (fresh.length) {
                    const next = {
                        ...currentPrefs,
                        pushEnabled: true,
                        seenIds: [...new Set([...currentPrefs.seenIds, ...items.map((i) => i.id)])].slice(-80),
                    };
                    setPrefs(next);
                    saveAlertPrefs(next);
                }
            }
        } catch (e) {
            console.error(e);
            setRawNotifications(FALLBACK_NOTIFICATIONS.map(f => ({
                ...f,
                degree: parseTags(f.degree),
                regulation: parseTags(f.regulation),
            })));
            setCalendars(FALLBACK_CALENDARS);
            setError('Could not connect to live notifications. Displaying official notice links.');
        } finally {
            window.clearTimeout(timeoutId);
            setLoading(false);
        }
    }, [prefs.pushEnabled]);

    useEffect(() => {
        void fetchData();
    }, [fetchData]);

    const togglePush = async () => {
        if (prefs.pushEnabled) {
            const next = { ...prefs, pushEnabled: false };
            setPrefs(next);
            saveAlertPrefs(next);
            toast.success('Push alerts turned off');
            return;
        }
        if (!('Notification' in window)) {
            toast.error('Notifications not supported in this browser');
            return;
        }
        const permission = await Notification.requestPermission();
        if (permission !== 'granted') {
            toast.error('Permission denied — allow notifications in browser settings');
            return;
        }
        const next = { ...prefs, pushEnabled: true };
        setPrefs(next);
        saveAlertPrefs(next);
        toast.success('Push alerts enabled for results & exam updates');
        void fetchData();
    };

    const togglePersonalized = () => {
        const next = { ...prefs, personalized: !prefs.personalized };
        setPrefs(next);
        saveAlertPrefs(next);
        if (next.personalized && profile) {
            setDegree(profile.degreeLabel === 'B.Pharmacy' ? 'B.Pharm' : profile.degreeLabel);
            setRegulation(data.regulation || profile.regulationHint);
            personalizedOnce.current = true;
        } else if (!next.personalized) {
            setDegree('');
            setRegulation('');
            personalizedOnce.current = false;
        }
        toast.success(next.personalized ? 'Filtered for your hall ticket' : 'Showing all notices');
    };

    const resetFilters = () => {
        setSearchQuery('');
        setCategoryFilter('');
        setExamYear('');
        setDegree('');
        setRegulation('');
    };

    const hasActiveFilters = Boolean(searchQuery || categoryFilter || examYear || degree || regulation);

    // Client-side filtering of notifications
    const filteredNotifications = useMemo(() => {
        return rawNotifications.filter(n => {
            if (searchQuery.trim()) {
                const q = searchQuery.toLowerCase().trim();
                const titleMatch = n.title.toLowerCase().includes(q);
                const tagMatch = n.regulation.some(r => r.toLowerCase().includes(q)) || n.degree.some(d => d.toLowerCase().includes(q));
                if (!titleMatch && !tagMatch) return false;
            }
            if (categoryFilter && n.category.toLowerCase() !== categoryFilter.toLowerCase()) {
                return false;
            }
            if (regulation) {
                const matchReg = n.regulation.some(r => r.toUpperCase() === regulation.toUpperCase());
                if (!matchReg && n.regulation.length > 0) return false;
            }
            if (degree) {
                const matchDeg = n.degree.some(d => d.toUpperCase() === degree.toUpperCase());
                if (!matchDeg && n.degree.length > 0) return false;
            }
            if (examYear && n.exam_year && n.exam_year !== examYear) {
                return false;
            }
            return true;
        });
    }, [rawNotifications, searchQuery, categoryFilter, regulation, degree, examYear]);

    return (
        <div className="updates-page select-none">
            {/* Top Toolbar: View Switcher, Live Status & Global Actions */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-surface-card border border-border rounded-lg p-3">
                <div className="flex items-center gap-2">
                    <div className="inline-flex rounded-md bg-surface-subtle border border-border p-0.5">
                        <button
                            type="button"
                            onClick={() => setTab('notifications')}
                            className={`flex items-center gap-2 px-3 py-1.5 rounded text-xs font-semibold transition-colors cursor-pointer ${
                                tab === 'notifications'
                                    ? 'bg-accent text-white shadow-xs'
                                    : 'text-text-muted hover:text-text-primary'
                            }`}
                        >
                            <Bell className="w-3.5 h-3.5" />
                            <span>Notifications ({filteredNotifications.length})</span>
                        </button>
                        <button
                            type="button"
                            onClick={() => setTab('calendars')}
                            className={`flex items-center gap-2 px-3 py-1.5 rounded text-xs font-semibold transition-colors cursor-pointer ${
                                tab === 'calendars'
                                    ? 'bg-accent text-white shadow-xs'
                                    : 'text-text-muted hover:text-text-primary'
                            }`}
                        >
                            <Calendar className="w-3.5 h-3.5" />
                            <span>Calendars ({calendars.length})</span>
                        </button>
                    </div>

                    <div className="hidden md:flex items-center gap-1.5 px-2 py-1 rounded bg-surface-subtle border border-border text-[11px] font-mono text-text-muted">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                        <span>Live JNTUH Feed</span>
                    </div>
                </div>

                <div className="flex items-center gap-2 flex-wrap">
                    <button
                        type="button"
                        onClick={togglePersonalized}
                        className={`updates-pref-btn ${prefs.personalized ? 'updates-pref-btn-on' : ''}`}
                    >
                        <span className={`w-1.5 h-1.5 rounded-full ${prefs.personalized ? 'bg-accent' : 'bg-text-muted'}`} />
                        <span>{prefs.personalized ? 'Personalized on' : 'Personalization off'}</span>
                    </button>

                    <button
                        type="button"
                        onClick={() => void togglePush()}
                        className={`updates-pref-btn ${prefs.pushEnabled ? 'updates-pref-btn-on' : ''}`}
                    >
                        {prefs.pushEnabled ? <BellRing className="w-3.5 h-3.5" /> : <BellOff className="w-3.5 h-3.5" />}
                        <span>{prefs.pushEnabled ? 'Push on' : 'Push alerts'}</span>
                    </button>

                    <button
                        type="button"
                        onClick={() => void fetchData()}
                        disabled={loading}
                        className="updates-pref-btn"
                        title="Refresh notifications"
                    >
                        <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
                    </button>
                </div>
            </div>

            {/* Personalized Context Banner */}
            {profile && (
                <div className="flex items-center justify-between gap-3 px-3.5 py-2.5 rounded-lg bg-surface-card border border-border text-xs shadow-xs">
                    <div className="flex items-center gap-2 text-text-secondary">
                        <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                        <span>
                            Active Profile: <strong className="text-text-primary font-mono">{data.hallTicket}</strong>
                            {' · '}
                            <span className="text-text-primary">{profile.degreeLabel}</span>
                            {' · '}
                            <span className="text-accent font-semibold">{data.regulation || profile.regulationHint}</span>
                        </span>
                    </div>
                    {hasActiveFilters && (
                        <button
                            type="button"
                            onClick={resetFilters}
                            className="text-text-muted hover:text-accent underline text-[11px] cursor-pointer"
                        >
                            Reset filters
                        </button>
                    )}
                </div>
            )}

            {/* Offline or Error Banner */}
            {error && (
                <div className="flex items-center justify-between gap-3 p-3 rounded-lg bg-amber-50 border border-amber-200 text-xs">
                    <div className="flex items-center gap-2 text-amber-900">
                        <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
                        <span>{error}</span>
                    </div>
                    <button
                        type="button"
                        onClick={() => void fetchData()}
                        className="px-2.5 py-1 rounded bg-surface-subtle hover:bg-surface-hover border border-border text-text-primary text-[11px] font-medium transition-colors cursor-pointer"
                    >
                        Retry
                    </button>
                </div>
            )}

            {tab === 'notifications' && (
                <>
                    {/* Search & Inline Filter Row */}
                    <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 bg-surface-card border border-border rounded-lg p-2.5">
                        {/* Search Input */}
                        <div className="relative flex-1 min-w-[200px]">
                            <Search className="w-3.5 h-3.5 text-text-muted absolute left-3 top-1/2 -translate-y-1/2" />
                            <input
                                type="text"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                placeholder="Search circulars (e.g. 2-1, Supply, RC/RV, Time Table)..."
                                className="w-full pl-8 pr-7 py-1.5 rounded-md bg-surface-subtle border border-border text-xs text-text-primary placeholder:text-text-muted focus:outline-none focus:border-accent"
                            />
                            {searchQuery && (
                                <button
                                    type="button"
                                    onClick={() => setSearchQuery('')}
                                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-text-muted hover:text-text-primary p-0.5"
                                >
                                    <X className="w-3 h-3" />
                                </button>
                            )}
                        </div>

                        {/* Dropdown Filters */}
                        <div className="flex items-center gap-2 flex-wrap">
                            <select
                                value={categoryFilter}
                                onChange={(e) => setCategoryFilter(e.target.value)}
                                className="updates-select-native"
                                aria-label="Filter by category"
                            >
                                <option value="">All Categories</option>
                                <option value="results">Results</option>
                                <option value="exams">Exams</option>
                                <option value="timetable">Time Tables</option>
                                <option value="general">General</option>
                            </select>

                            <select
                                value={regulation}
                                onChange={(e) => setRegulation(e.target.value)}
                                className="updates-select-native font-mono"
                                aria-label="Filter by regulation"
                            >
                                <option value="">All Regulations</option>
                                {[...REGULATIONS].reverse().map(r => (
                                    <option key={r} value={r}>{r}</option>
                                ))}
                            </select>

                            <select
                                value={degree}
                                onChange={(e) => setDegree(e.target.value)}
                                className="updates-select-native"
                                aria-label="Filter by degree"
                            >
                                <option value="">All Degrees</option>
                                {['B.Tech', 'B.Pharm', 'M.Tech', 'MBA', 'MCA'].map(d => (
                                    <option key={d} value={d}>{d}</option>
                                ))}
                            </select>

                            <select
                                value={examYear}
                                onChange={(e) => setExamYear(e.target.value)}
                                className="updates-select-native font-mono"
                                aria-label="Filter by year"
                            >
                                <option value="">All Years</option>
                                {['2026', '2025', '2024', '2023'].map(y => (
                                    <option key={y} value={y}>{y}</option>
                                ))}
                            </select>

                            {hasActiveFilters && (
                                <button
                                    type="button"
                                    onClick={resetFilters}
                                    className="p-2 text-text-muted hover:text-text-primary text-xs rounded hover:bg-surface-subtle transition-colors"
                                    title="Clear all filters"
                                >
                                    <X className="w-3.5 h-3.5" />
                                </button>
                            )}
                        </div>
                    </div>

                    {/* Notice Cards Feed */}
                    {loading ? (
                        <div className="flex flex-col items-center justify-center py-16 gap-3">
                            <Loader2 className="w-7 h-7 animate-spin text-accent" />
                            <p className="text-xs text-text-muted">Fetching latest JNTUH announcements...</p>
                        </div>
                    ) : filteredNotifications.length === 0 ? (
                        <div className="bg-surface-card border border-border rounded-lg p-10 text-center">
                            <Filter className="w-8 h-8 text-text-muted mx-auto mb-2 opacity-50" />
                            <h4 className="text-sm font-semibold text-text-primary mb-1">No notifications match your active filters</h4>
                            <p className="text-xs text-text-muted max-w-sm mx-auto mb-4">
                                Adjust your regulation, degree, or keyword query to see all available university circulars.
                            </p>
                            <button
                                type="button"
                                onClick={resetFilters}
                                className="btn-secondary text-xs px-3 py-1.5"
                            >
                                Clear All Filters
                            </button>
                        </div>
                    ) : (
                        <div className="space-y-2.5">
                            {filteredNotifications.map((n) => {
                                const dateBadge = parseDateBadge(n.date);
                                const categoryMeta = getCategoryBadge(n.category);

                                return (
                                    <article
                                        key={n.id}
                                        className="bg-surface-card hover:bg-surface-subtle border border-border hover:border-accent/40 rounded-lg p-3.5 sm:p-4 transition-all group flex flex-col sm:flex-row sm:items-center gap-3.5"
                                    >
                                        {/* Date Stamp */}
                                        <div className="flex sm:flex-col items-center justify-center shrink-0 w-12 h-12 rounded-md bg-surface-subtle border border-border text-center">
                                            <span className="text-sm font-bold text-text-primary leading-none font-mono">
                                                {dateBadge.day}
                                            </span>
                                            <span className="text-[9px] font-semibold text-text-muted uppercase tracking-wider mt-0.5 font-mono">
                                                {dateBadge.month}
                                            </span>
                                        </div>

                                        {/* Notice Body */}
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-1.5 flex-wrap mb-1.5">
                                                <span className={`text-[10px] font-semibold px-2 py-0.5 rounded ${categoryMeta.className}`}>
                                                    {categoryMeta.label}
                                                </span>

                                                {n.degree.map((deg) => (
                                                    <span
                                                        key={deg}
                                                        className="text-[10px] font-medium px-1.5 py-0.5 rounded bg-surface-subtle text-text-secondary border border-border"
                                                    >
                                                        {deg}
                                                    </span>
                                                ))}

                                                {n.regulation.map((reg) => (
                                                    <span
                                                        key={reg}
                                                        className="text-[10px] font-mono font-medium px-1.5 py-0.5 rounded bg-accent/10 text-accent border border-accent/25"
                                                    >
                                                        {reg}
                                                    </span>
                                                ))}
                                            </div>

                                            <h3 className="text-sm font-semibold text-text-primary group-hover:text-accent transition-colors line-clamp-2 leading-snug">
                                                {n.title}
                                            </h3>

                                            <div className="flex items-center gap-2 text-[11px] text-text-muted mt-1.5">
                                                {n.date && <span>Date: {n.date}</span>}
                                                <span>·</span>
                                                <span>Source: {n.source || 'JNTU Fast Updates'}</span>
                                            </div>
                                        </div>

                                        {/* Direct Action */}
                                        <div className="shrink-0 sm:self-center">
                                            <a
                                                href={n.url}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-surface-subtle hover:bg-surface-hover border border-border hover:border-accent/40 text-xs font-medium text-text-primary group-hover:text-accent transition-colors"
                                            >
                                                <span>Open Circular</span>
                                                <ExternalLink className="w-3.5 h-3.5" />
                                            </a>
                                        </div>
                                    </article>
                                );
                            })}
                        </div>
                    )}

                    {/* Attribution Disclaimer */}
                    <div className="text-[11px] text-text-muted flex items-center justify-between pt-2 px-1">
                        <span>
                            Aggregated from JNTU Fast Updates & Official Examination Branch.
                        </span>
                        <a
                            href="https://jntuh.ac.in"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-accent hover:underline inline-flex items-center gap-1"
                        >
                            jntuh.ac.in <ExternalLink className="w-2.5 h-2.5" />
                        </a>
                    </div>
                </>
            )}

            {tab === 'calendars' && (
                <div className="space-y-3">
                    {loading ? (
                        <div className="flex flex-col items-center justify-center py-16 gap-3">
                            <Loader2 className="w-7 h-7 animate-spin text-accent" />
                            <p className="text-xs text-text-muted">Loading academic schedules...</p>
                        </div>
                    ) : calendars.length === 0 ? (
                        <div className="bg-surface-card border border-border rounded-lg p-10 text-center">
                            <Calendar className="w-8 h-8 text-text-muted mx-auto mb-2 opacity-50" />
                            <p className="text-sm font-semibold text-text-primary">No academic calendars indexed</p>
                        </div>
                    ) : (
                        calendars.map((cal) => (
                            <div
                                key={cal.id}
                                className="bg-surface-card border border-border rounded-lg p-4 sm:p-5"
                            >
                                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3 mb-4">
                                    <div>
                                        <div className="flex items-center gap-2 mb-1">
                                            <span className="text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded bg-accent/10 text-accent border border-accent/25">
                                                {cal.degree}
                                            </span>
                                            <span className="text-xs font-mono text-text-muted">
                                                Session: {cal.academic_year}
                                            </span>
                                        </div>
                                        <h4 className="text-sm font-semibold text-text-primary">
                                            {cal.title}
                                        </h4>
                                    </div>

                                    <a
                                        href={cal.url}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-surface-subtle hover:bg-surface-hover border border-border text-xs font-medium text-text-primary hover:text-accent transition-colors shrink-0"
                                    >
                                        <span>Official PDF</span>
                                        <ExternalLink className="w-3.5 h-3.5" />
                                    </a>
                                </div>

                                {cal.events && cal.events.length > 0 && (
                                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2 pt-3 border-t border-border">
                                        {cal.events.map((evt, idx) => (
                                            <div
                                                key={idx}
                                                className="p-2.5 rounded-md bg-surface-subtle border border-border flex items-start gap-2.5"
                                            >
                                                <CalendarDays className="w-4 h-4 text-accent shrink-0 mt-0.5" />
                                                <div className="min-w-0">
                                                    <p className="text-[11px] text-text-muted leading-tight truncate">{evt.label}</p>
                                                    <p className="text-xs font-semibold text-text-primary font-mono mt-0.5">{evt.date}</p>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        ))
                    )}
                </div>
            )}
        </div>
    );
}
