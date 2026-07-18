import { useState } from 'react';
import toast from 'react-hot-toast';
import { useAcademic } from '../context/AcademicContext';
import { Scale, Loader2 } from 'lucide-react';
import SectionHeader from './ui/SectionHeader';

const API_BASE = import.meta.env.VITE_API_URL || '';

export default function GraceMarksChecker() {
    const { data } = useAcademic();
    const [result, setResult] = useState<Record<string, unknown> | null>(null);
    const [loading, setLoading] = useState(false);

    const check = async () => {
        setLoading(true);
        setResult(null);
        try {
            const subjects = data.semesters.flatMap(s =>
                s.subjects.map(sub => ({
                    subject_code: sub.code,
                    subject_name: sub.name,
                    grade: sub.grade,
                    credits: sub.credits,
                    external: sub.external,
                    total: sub.total,
                }))
            );
            const res = await fetch(`${API_BASE}/api/grace-marks`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ subjects, regulation: data.regulation }),
            });
            if (!res.ok) {
                const detail = await res.json().catch(() => ({}));
                throw new Error(detail.detail || `Request failed (${res.status})`);
            }
            setResult(await res.json());
        } catch (e) {
            const message = e instanceof Error ? e.message : 'Could not check grace marks eligibility';
            toast.error(message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="space-y-6 max-w-xl">
            <SectionHeader
                icon={Scale}
                title="Grace marks eligibility"
                subtitle="Check R18 grace rules against your session subjects"
            />
            <div className="card p-6">
                <p className="text-sm text-text-muted mb-4">
                    Runs against subjects already loaded in this session.
                </p>
                <p className="text-sm text-text-muted mb-4">Check if JNTUH grace marks scheme may apply to your backlogs ({data.regulation}).</p>
                <button onClick={check} disabled={loading} className="btn-primary flex items-center gap-2">
                    {loading && <Loader2 className="w-4 h-4 animate-spin" />} Check Eligibility
                </button>
            </div>
            {result && (
                <div className="card p-6 space-y-3">
                    <p className={`text-lg font-bold ${result.can_clear_with_grace ? 'text-emerald-400' : 'text-amber-400'}`}>
                        {result.can_clear_with_grace ? 'May qualify for grace marks' : result.scheme_applies ? 'Scheme applies but subjects may not qualify' : 'Scheme may not apply'}
                    </p>
                    <p className="text-sm text-text-muted">Backlogs: {String(result.backlog_count)} · Eligible: {String(result.eligible_count)}</p>
                    <p className="text-xs text-text-muted italic">{String(result.disclaimer)}</p>
                </div>
            )}
        </div>
    );
}
