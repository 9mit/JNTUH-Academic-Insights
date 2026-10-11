import { Award, AlertTriangle, BookOpen, CheckCircle2, Building2, GraduationCap, Calendar, ShieldCheck } from 'lucide-react';
import { useAcademic } from '../context/AcademicContext';
import { getStudentStatus, getStatusLabel, getBacklogs } from '../utils/calculations';
import { parseHtno } from '../utils/htnoProfile';

export default function StudentStatusCard() {
    const { data, getCGPA } = useAcademic();
    const status = getStudentStatus(data.semesters, data.regulation);
    const statusLabel = getStatusLabel(data.semesters, data.regulation);
    const backlogs = getBacklogs(data.semesters);
    const { cgpa } = getCGPA();
    const profile = parseHtno(data.hallTicket);

    const isDegreeReady = status === 'graduated' && backlogs.length === 0 && cgpa >= 5.0;
    const hasBacklogs = backlogs.length > 0;
    const isCompletedCourse = status === 'graduated_with_backlogs' || (status === 'graduated' && hasBacklogs);

    let title = 'Good Academic Standing';
    let subtitle = statusLabel;
    let badgeClass = 'text-emerald-700 bg-emerald-50 border-emerald-200';
    let Icon = CheckCircle2;

    if (isDegreeReady) {
        title = 'Degree Requirements Satisfied';
        subtitle = `All 8 semesters completed under ${data.regulation} regulation with zero pending backlogs.`;
        badgeClass = 'text-emerald-700 bg-emerald-50 border-emerald-200';
        Icon = Award;
    } else if (isCompletedCourse) {
        title = 'Coursework Completed — Backlogs Pending';
        subtitle = `${backlogs.length} subject(s) require supplementary clearance before degree conferment.`;
        badgeClass = 'text-amber-800 bg-amber-50 border-amber-200';
        Icon = AlertTriangle;
    } else if (hasBacklogs) {
        title = 'Active Backlogs Recorded';
        subtitle = `Currently pursuing degree with ${backlogs.length} pending backlog(s) across recorded semesters.`;
        badgeClass = 'text-amber-800 bg-amber-50 border-amber-200';
        Icon = AlertTriangle;
    } else {
        title = 'Good Academic Standing';
        subtitle = `All recorded semesters cleared under ${data.regulation} regulation.`;
        badgeClass = 'text-emerald-700 bg-emerald-50 border-emerald-200';
        Icon = BookOpen;
    }

    return (
        <div className="space-y-3">
            {/* Institutional Identity Banner (when Hall Ticket is resolved) */}
            {profile && (
                <div className="card p-4 border border-border bg-surface-card/60 rounded-lg">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5 text-xs">
                        {/* College */}
                        <div className="flex items-start gap-2.5">
                            <div className="w-7 h-7 rounded bg-surface-subtle border border-border flex items-center justify-center shrink-0 mt-0.5">
                                <Building2 className="w-3.5 h-3.5 text-accent" />
                            </div>
                            <div className="min-w-0">
                                <span className="text-[10px] font-mono uppercase tracking-wider text-text-muted">
                                    College / Institution
                                </span>
                                <p className="font-medium text-text-primary truncate" title={profile.collegeName}>
                                    {profile.collegeName}
                                </p>
                            </div>
                        </div>

                        {/* Branch & Degree */}
                        <div className="flex items-start gap-2.5">
                            <div className="w-7 h-7 rounded bg-surface-subtle border border-border flex items-center justify-center shrink-0 mt-0.5">
                                <GraduationCap className="w-3.5 h-3.5 text-accent" />
                            </div>
                            <div className="min-w-0">
                                <span className="text-[10px] font-mono uppercase tracking-wider text-text-muted">
                                    Program & Specialization
                                </span>
                                <p className="font-medium text-text-primary truncate" title={`${profile.degreeLabel} in ${profile.branchName}`}>
                                    {profile.degreeLabel} · {profile.branchName}
                                </p>
                            </div>
                        </div>

                        {/* Batch & Track */}
                        <div className="flex items-start gap-2.5">
                            <div className="w-7 h-7 rounded bg-surface-subtle border border-border flex items-center justify-center shrink-0 mt-0.5">
                                <Calendar className="w-3.5 h-3.5 text-accent" />
                            </div>
                            <div className="min-w-0">
                                <span className="text-[10px] font-mono uppercase tracking-wider text-text-muted">
                                    Academic Cohort
                                </span>
                                <p className="font-medium text-text-primary">
                                    {profile.batchSpan} · {profile.isLateral ? 'Lateral Entry' : 'Regular'} ({data.regulation})
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Standing Card */}
            <div className="card p-5 border border-border bg-surface-card rounded-lg">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                    <div className="flex items-start gap-3.5">
                        <div className="w-10 h-10 rounded-lg bg-surface-subtle border border-border flex items-center justify-center shrink-0 mt-0.5">
                            <Icon className="w-5 h-5 text-accent" />
                        </div>
                        <div>
                            <div className="flex items-center gap-2 mb-1">
                                <span className="text-[11px] font-mono uppercase tracking-wider text-text-muted flex items-center gap-1">
                                    <ShieldCheck className="w-3 h-3 text-emerald-600" />
                                    Academic Standing
                                </span>
                                <span className={`text-[10px] font-mono px-2 py-0.5 rounded border ${badgeClass}`}>
                                    {data.regulation}
                                </span>
                            </div>
                            <h3 className="text-base font-semibold text-text-primary">
                                {title}
                            </h3>
                            <p className="text-xs text-text-secondary mt-1 max-w-2xl leading-relaxed">
                                {subtitle}
                            </p>
                        </div>
                    </div>

                    <div className="flex items-center gap-4 shrink-0 sm:border-l sm:border-border sm:pl-5 font-mono text-right">
                        <div>
                            <p className="text-xs text-text-muted">Status</p>
                            <p className="text-sm font-semibold text-text-primary">
                                {isDegreeReady ? 'Graduated' : hasBacklogs ? `${backlogs.length} Backlog(s)` : 'Regular'}
                            </p>
                        </div>
                        {hasBacklogs && (
                            <button
                                type="button"
                                onClick={() => { window.location.hash = '#/backlog'; }}
                                className="px-3 py-1.5 rounded-lg bg-amber-50 hover:bg-amber-100 border border-amber-300 text-amber-800 text-xs font-semibold font-sans transition-all cursor-pointer shadow-xs"
                            >
                                Recovery Plan →
                            </button>
                        )}
                        {isDegreeReady && (
                            <button
                                type="button"
                                onClick={() => { window.location.hash = '#/report'; }}
                                className="px-3 py-1.5 rounded-lg bg-emerald-50 hover:bg-emerald-100 border border-emerald-300 text-emerald-800 text-xs font-semibold font-sans transition-all cursor-pointer shadow-xs"
                            >
                                Official Report →
                            </button>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}

