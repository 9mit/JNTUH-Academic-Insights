import { useState, useEffect, useCallback, useRef } from 'react';
import { Bell, Calendar, Filter, ExternalLink, Loader2, AlertCircle, RefreshCw, Sparkles, BellRing, BellOff } from 'lucide-react';
import FilterSelect from './ui/FilterSelect';
import SectionHeader from './ui/SectionHeader';
import { useAcademic } from '../context/AcademicContext';
import { parseHtno } from '../utils/htnoProfile';
import { REGULATIONS } from '../constants/grading';
import toast from 'react-hot-toast';

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

export default function NotificationsHub() {
    const { data } = useAcademic();
    const profile = parseHtno(data.hallTicket);
    const [tab, setTab] = useState<'notifications' | 'calendars'>('notifications');
    const [notifications, setNotifications] = useState<Notification[]>([]);
    const [calendars, setCalendars] = useState<CalendarItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [prefs, setPrefs] = useState<AlertPrefs>(() => loadAlertPrefs());
    const [examYear, setExamYear] = useState('');
    const [degree, setDegree] = useState('');
    const [regulation, setRegulation] = useState('');
    const personalizedOnce = useRef(false);

    // Auto-personalize filters from hall ticket / session regulation
    useEffect(() => {
        if (!prefs.personalized || personalizedOnce.current) return;
        if (profile) {
            setDegree(profile.degreeLabel === 'B.Pharmacy' ? 'B.Pharm' : profile.degreeLabel);
            setExamYear(profile.examYearHint);
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
            const params = new URLSearchParams();
            if (examYear) params.set('exam_year', examYear);
            if (degree) params.set('degree', degree);
            if (regulation) params.set('regulation', regulation);

            const calParams = new URLSearchParams();
            if (degree) calParams.set('degree', degree);

            const [notifRes, calRes] = await Promise.all([
                fetchJson<{ items: Notification[] }>(
                    `${API_BASE}/api/notifications?${params}`,
                    controller.signal,
                ),
                fetchJson<{ items: CalendarItem[] }>(
                    `${API_BASE}/api/calendars?${calParams}`,
                    controller.signal,
                ),
            ]);

            const items = notifRes.items || [];
            setNotifications(items);
            setCalendars(calRes.items || []);

            // Browser push for new results / exam notices relevant to this student
            if (prefs.pushEnabled && 'Notification' in window && Notification.permission === 'granted') {
                const currentPrefs = loadAlertPrefs();
                const fresh = items.filter(
                    (n) => !currentPrefs.seenIds.includes(n.id) && (n.category === 'results' || n.category === 'exams' || n.category === 'timetable')
                );
                fresh.slice(0, 2).forEach((n) => {
                    try {
                        new Notification('JNTUH update for you', {
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
            const message = e instanceof DOMException && e.name === 'AbortError'
                ? 'Updates timed out. Check that the backend is running on port 8000.'
                : 'Could not load updates. Start the API server and try again.';
            setError(message);
            setNotifications([]);
        } finally {
            window.clearTimeout(timeoutId);
            setLoading(false);
        }
    }, [examYear, degree, regulation, prefs.pushEnabled]);

    useEffect(() => { fetchData(); }, [fetchData]);

    const togglePush = async () => {
        if (prefs.pushEnabled) {
            const next = { ...prefs, pushEnabled: false };
            setPrefs(next);
            saveAlertPrefs(next);
            toast.success('Push alerts turned off');
            return;
        }
        if (!('Notification' in window)) {
            toast.error('Notifications are not supported in this browser');
            return;
        }
        const permission = await Notification.requestPermission();
        if (permission !== 'granted') {
            toast.error('Permission denied — enable notifications in browser settings');
            return;
        }
        const next = { ...prefs, pushEnabled: true };
        setPrefs(next);
        saveAlertPrefs(next);
        toast.success('Push alerts enabled for results & exam notices');
        void fetchData();
    };

    const togglePersonalized = () => {
        const next = { ...prefs, personalized: !prefs.personalized };
        setPrefs(next);
        saveAlertPrefs(next);
        if (next.personalized && profile) {
            setDegree(profile.degreeLabel === 'B.Pharmacy' ? 'B.Pharm' : profile.degreeLabel);
            setExamYear(profile.examYearHint);
            setRegulation(data.regulation || profile.regulationHint);
            personalizedOnce.current = true;
        } else if (!next.personalized) {
            personalizedOnce.current = false;
        }
        toast.success(next.personalized ? 'Filters follow your hall ticket' : 'Manual filters only');
    };

    const profileLine = profile
        ? `${profile.degreeLabel} · ${data.regulation || profile.regulationHint} · ${data.hallTicket}`
        : null;

    return (
        <div className="updates-page">
            <SectionHeader
                icon={Bell}
                title="Campus updates"
                subtitle="Results notifications, timetables, and academic calendars"
            />

            <div className="updates-personalize card">
                <div className="updates-personalize-copy">
                    <p className="updates-personalize-title">
                        <Sparkles className="w-4 h-4 text-primary shrink-0" aria-hidden />
                        Personalized for you
                    </p>
                    <p className="updates-personalize-sub">
                        {profileLine
                            ? <>Using <span className="text-text-secondary">{profileLine}</span> from your hall ticket</>
                            : 'Import a hall ticket to auto-filter notices for your degree and regulation.'}
                    </p>
                </div>

                <div className="updates-personalize-actions" role="group" aria-label="Alert preferences">
                    <button
                        type="button"
                        role="switch"
                        aria-checked={prefs.personalized}
                        aria-label={prefs.personalized ? 'Turn personalization off' : 'Turn personalization on'}
                        onClick={togglePersonalized}
                        className={`updates-pref-btn ${prefs.personalized ? 'updates-pref-btn-on' : ''}`}
                    >
                        <span className="updates-pref-dot" aria-hidden />
                        {prefs.personalized ? 'Personalization on' : 'Personalization off'}
                    </button>

                    <button
                        type="button"
                        role="switch"
                        aria-checked={prefs.pushEnabled}
                        aria-label={prefs.pushEnabled ? 'Turn push alerts off' : 'Enable push alerts'}
                        onClick={() => void togglePush()}
                        className={`updates-pref-btn updates-pref-btn-push ${prefs.pushEnabled ? 'updates-pref-btn-on' : 'updates-pref-btn-cta'}`}
                    >
                        {prefs.pushEnabled
                            ? <BellRing className="w-3.5 h-3.5 shrink-0" aria-hidden />
                            : <BellOff className="w-3.5 h-3.5 shrink-0" aria-hidden />}
                        {prefs.pushEnabled ? 'Push alerts on' : 'Enable push alerts'}
                    </button>
                </div>
            </div>

            <div className="updates-toolbar">
                <div className="tab-pill-group">
                    <button type="button" onClick={() => setTab('notifications')} className={`tab-pill ${tab === 'notifications' ? 'tab-pill-active' : ''}`}>
                        <Bell className="w-4 h-4" /> Notifications
                    </button>
                    <button type="button" onClick={() => setTab('calendars')} className={`tab-pill ${tab === 'calendars' ? 'tab-pill-active' : ''}`}>
                        <Calendar className="w-4 h-4" /> Calendars
                    </button>
                </div>

                {tab === 'notifications' && (
                    <div className="notifications-filters">
                        <Filter className="w-4 h-4 text-text-muted shrink-0" aria-hidden />
                        <FilterSelect
                            aria-label="Filter by exam year"
                            value={examYear}
                            onChange={setExamYear}
                            options={[
                                { value: '', label: 'All Years' },
                                ...['2026', '2025', '2024', '2023'].map(y => ({ value: y, label: y })),
                            ]}
                        />
                        <FilterSelect
                            aria-label="Filter by degree"
                            value={degree}
                            onChange={setDegree}
                            options={[
                                { value: '', label: 'All Degrees' },
                                ...['B.Tech', 'B.Pharm', 'M.Tech', 'MBA', 'MCA'].map(d => ({ value: d, label: d })),
                            ]}
                        />
                        <FilterSelect
                            aria-label="Filter by regulation"
                            value={regulation}
                            onChange={setRegulation}
                            options={[
                                { value: '', label: 'All Regulations' },
                                ...[...REGULATIONS].reverse().map(r => ({ value: r, label: r })),
                            ]}
                        />
                    </div>
                )}
            </div>

            {tab === 'notifications' && (
                <>
                    <p className="text-xs text-text-muted leading-relaxed">
                        Sourced from{' '}
                        <a
                            href="https://www.jntufastupdates.com/jntu-hyderabad/"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-primary hover:underline"
                        >
                            JNTU Fast Updates
                        </a>
                        . Verify critical dates on{' '}
                        <a href="https://jntuh.ac.in" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
                            jntuh.ac.in
                        </a>
                        .
                    </p>

                    {error && (
                        <div className="glass-panel p-4 flex flex-col sm:flex-row sm:items-center gap-3 border border-red-500/25">
                            <div className="flex items-start gap-3 flex-1 min-w-0">
                                <AlertCircle className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
                                <p className="text-sm text-text-secondary">{error}</p>
                            </div>
                            <button type="button" onClick={fetchData} className="btn-secondary text-sm h-10 px-4 inline-flex items-center justify-center gap-2 shrink-0">
                                <RefreshCw className="w-4 h-4" /> Retry
                            </button>
                        </div>
                    )}

                    {loading ? (
                        <div className="flex justify-center py-12"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>
                    ) : !error && notifications.length === 0 ? (
                        <p className="text-text-muted text-center py-8">No notifications matched your filters.</p>
                    ) : !error ? (
                        <div className="space-y-3">
                            {notifications.map(n => (
                                <a key={n.id} href={n.url} target="_blank" rel="noopener noreferrer"
                                    className="block glass-panel glass-panel-hover p-4 sm:p-5 group">
                                    <div className="flex items-start justify-between gap-3 sm:gap-4">
                                        <div className="min-w-0">
                                            <span className="text-[10px] uppercase tracking-wide font-bold text-primary">{n.category}</span>
                                            <p className="text-white font-semibold mt-1 leading-snug group-hover:text-primary transition-colors">
                                                {n.title}
                                            </p>
                                            <p className="text-xs text-text-muted mt-1.5 leading-relaxed">
                                                {n.date}{n.degree?.length ? ` · ${n.degree.join(', ')}` : ''}
                                                {n.regulation?.length ? ` · ${n.regulation.join(', ')}` : ''}
                                            </p>
                                        </div>
                                        <ExternalLink className="w-4 h-4 text-text-muted shrink-0 mt-1 opacity-70 group-hover:opacity-100" />
                                    </div>
                                </a>
                            ))}
                        </div>
                    ) : null}
                </>
            )}

            {tab === 'calendars' && (
                <div className="space-y-4">
                    {loading ? (
                        <div className="flex justify-center py-12"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>
                    ) : calendars.length === 0 ? (
                        <p className="text-text-muted text-center py-8">No academic calendars available right now.</p>
                    ) : (
                        calendars.map(cal => (
                            <div key={cal.id} className="glass-panel p-4 sm:p-5">
                                <div className="min-w-0">
                                    <h4 className="font-bold text-white leading-snug">{cal.title}</h4>
                                    <p className="text-sm text-text-muted mt-1">{cal.academic_year} · {cal.degree}</p>
                                </div>
                                {cal.events.length > 0 && (
                                    <ul className="mt-3 space-y-2">
                                        {cal.events.map((e, i) => (
                                            <li key={i} className="flex flex-col sm:flex-row sm:justify-between sm:items-baseline gap-0.5 sm:gap-3 text-sm">
                                                <span className="text-text-secondary min-w-0">{e.label}</span>
                                                <span className="text-primary font-mono text-xs sm:text-sm shrink-0">{e.date}</span>
                                            </li>
                                        ))}
                                    </ul>
                                )}
                                <a href={cal.url} target="_blank" rel="noopener noreferrer" className="text-xs text-primary mt-3 inline-flex items-center gap-1 hover:underline">
                                    View official PDF <ExternalLink className="w-3 h-3" />
                                </a>
                            </div>
                        ))
                    )}
                </div>
            )}
        </div>
    );
}
