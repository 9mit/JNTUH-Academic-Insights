import { useState, useCallback } from 'react';
import { useAcademic } from '../context/AcademicContext';
import type { Regulation, Grade, Subject, Semester } from '../types';
import { generateId } from '../constants/grading';
import { uploadPDFs, fetchByHallTicket } from '../api/client';
import { normalizeNonCreditSubject } from '../utils/nonCreditSubjects';
import { FileUp, CheckCircle, Loader2, Info, X, Paperclip, Search, Sparkles, Trophy, ShieldCheck, History, Flame } from 'lucide-react';
import toast from 'react-hot-toast';
import { motion, AnimatePresence } from 'framer-motion';

interface BackendSubject {
    subject_code: string;
    subject_name: string;
    grade: string;
    credits: number;
    year: number;
    sem: number;
    internal?: number;
    external?: number;
    total?: number;
    official_sem_sgpa?: number;
    non_credit?: boolean;
    regulation?: string;
}

interface BackendSemester {
    year: number;
    sem: number;
    sgpa: number;
    credits?: number;
    regulation?: string;
}

// Academic Degree Audit Confirmation Modal
function CelebrationModal({ isOpen, onClose, studentName }: { isOpen: boolean; onClose: () => void; studentName?: string }) {
    if (!isOpen) return null;

    return (
        <AnimatePresence>
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4"
                onClick={onClose}
            >
                <motion.div
                    initial={{ scale: 0.98, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    exit={{ scale: 0.98, opacity: 0 }}
                    transition={{ duration: 0.2 }}
                    className="card p-7 max-w-md w-full border border-border-strong relative shadow-xl space-y-5 bg-white"
                    onClick={(e) => e.stopPropagation()}
                >
                    <div className="flex items-start justify-between">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-lg bg-emerald-50 border border-emerald-200 flex items-center justify-center">
                                <CheckCircle className="w-5 h-5 text-emerald-600" />
                            </div>
                            <div>
                                <span className="text-[10px] font-mono uppercase tracking-wider text-emerald-600 font-bold">
                                    Degree Audit Complete
                                </span>
                                <h3 className="text-base font-bold text-text-primary">
                                    Zero Pending Backlogs
                                </h3>
                            </div>
                        </div>
                        <button onClick={onClose} className="text-text-muted hover:text-text-primary transition-colors cursor-pointer p-1">
                            <X className="w-4 h-4" />
                        </button>
                    </div>

                    {studentName && (
                        <p className="text-sm font-mono text-text-primary">
                            Candidate: <strong className="text-text-primary font-bold">{studentName}</strong>
                        </p>
                    )}

                    <div className="p-3.5 rounded-lg bg-surface-subtle border border-border text-xs text-text-secondary leading-relaxed font-mono">
                        Consolidated academic verification confirms all semesters have been successfully cleared without backlogs. Requirements satisfied for degree award under university regulations.
                    </div>

                    <button
                        onClick={onClose}
                        className="btn-primary w-full justify-center"
                    >
                        View Performance Dashboard
                    </button>
                </motion.div>
            </motion.div>
        </AnimatePresence>
    );
}

export function sanitizeJntuhHtno(raw: string): { clean: string; changed: boolean } {
    const s = (raw || '').trim().toUpperCase();
    if (s.length !== 10) return { clean: s, changed: false };

    const chars = s.split('');
    // Year digits (pos 0, 1)
    if (chars[0] === 'O') chars[0] = '0';
    if (chars[1] === 'O') chars[1] = '0';
    // College code ending in O when degree is digit (e.g. CO1A -> C01A)
    if (chars[3] === 'O' && ['1', '5'].includes(chars[4])) chars[3] = '0';
    // Degree digit (pos 4)
    if (chars[4] === 'O') chars[4] = '1';
    // Branch code pos 6, 7 (MUST be digits, e.g. '05' CSE, '04' ECE, '02' EEE, etc.)
    if (/[A-Z]/.test(chars[5])) {
        if (chars[6] === 'O') chars[6] = '0';
        if (chars[7] === 'O') chars[7] = '0';
    }
    const clean = chars.join('');
    return { clean, changed: clean !== s };
}

export default function PDFUploader({ onImportSuccess }: { onImportSuccess?: () => void }) {
    const { replaceFromImport, data, setRegulation } = useAcademic();
    const [isDragging, setIsDragging] = useState(false);
    const [isProcessing, setIsProcessing] = useState(false);
    const [showCelebration, setShowCelebration] = useState(false);
    const [htnoInput, setHtnoInput] = useState('');
    const [selectedReg, setSelectedReg] = useState<string>(data.regulation || 'R18');
    const [intakeMode, setIntakeMode] = useState<'htno' | 'pdf'>('htno');
    const [recentSearches, setRecentSearches] = useState<{ htno: string; studentName?: string; cgpa?: number }[]>(() => {
        try {
            return JSON.parse(localStorage.getItem('jntuh_recent_htno_v2') || '[]');
        } catch {
            return [];
        }
    });

    const processResults = useCallback((
        subjects: BackendSubject[],
        backendSemesters: BackendSemester[],
        htno: string,
        studentName?: string,
        officialCGPA?: number,
        detectedRegulation?: Regulation,
        regulationsSeen?: string[],
        fetchMeta?: { academic_semesters?: number; all_semesters?: number; hard_refresh?: boolean },
        extraAudit?: {
            resolution_audit?: any[];
            search_path?: string[];
            is_consolidated?: boolean;
            student_status?: 'active' | 'detained' | 'graduated' | 'incomplete';
            all_attempts?: any[];
        }
    ) => {
        const semesterMap: { [key: string]: Subject[] } = {};
        let hasAnyFail = false;

        subjects.forEach((subject) => {
            const key = `${subject.year}-${subject.sem}`;
            if (!semesterMap[key]) semesterMap[key] = [];

            if (subject.grade === 'F' || subject.grade === 'Ab') {
                hasAnyFail = true;
            }

            const rawCredits =
                typeof subject.credits === 'number' && Number.isFinite(subject.credits)
                    ? subject.credits
                    : 0;
            const normalized = normalizeNonCreditSubject({
                internal: subject.internal,
                external: subject.external,
                total: subject.total,
                credits: subject.non_credit ? 0 : rawCredits,
            });

            const subReg = subject.regulation as Regulation | undefined;

            semesterMap[key].push({
                id: generateId(),
                code: subject.subject_code,
                name: subject.subject_name,
                grade: subject.grade as Grade,
                credits: normalized.credits,
                ...(normalized.internal !== undefined ? { internal: normalized.internal } : {}),
                ...(normalized.external !== undefined ? { external: normalized.external } : {}),
                ...(normalized.total !== undefined ? { total: normalized.total } : {}),
                ...(normalized.nonCredit ? { nonCredit: true } : {}),
                official_sem_sgpa: subject.official_sem_sgpa,
                ...(subReg ? { regulation: subReg } : {}),
            });
        });

        const semestersToImport = Object.entries(semesterMap).map(([key, semSubjects]) => {
            const [year, sem] = key.split('-').map(Number);
            const backendMatches = (backendSemesters || []).filter(
                (s) => s.year === year && s.sem === sem
            );
            const backendSem =
                [...backendMatches].reverse().find(
                    (s) => (typeof s.sgpa === 'number' && s.sgpa > 0) || (typeof s.credits === 'number' && s.credits > 0)
                ) || backendMatches[backendMatches.length - 1] || backendMatches[0];
            const hasTrustedOfficialSGPA = semSubjects.some(
                (subject) => typeof subject.official_sem_sgpa === 'number' && subject.official_sem_sgpa > 0
            );

            if (!hasTrustedOfficialSGPA && typeof backendSem?.sgpa === 'number' && semSubjects.length > 0) {
                semSubjects[0].official_sem_sgpa = backendSem.sgpa;
            }

            let officialCredits: number | undefined;
            if (typeof backendSem?.credits === 'number' && backendSem.credits > 0) {
                officialCredits = backendSem.credits;
            } else if (semSubjects.length > 0) {
                officialCredits = semSubjects
                    .filter((s) => !s.nonCredit && s.grade !== 'F' && s.grade !== 'Ab')
                    .reduce((acc, s) => acc + s.credits, 0);
            }

            const regCounts = new Map<string, number>();
            for (const s of semSubjects) {
                if (s.regulation) {
                    regCounts.set(s.regulation, (regCounts.get(s.regulation) || 0) + 1);
                }
            }
            let semesterRegulation: Regulation | undefined =
                (backendSem?.regulation as Regulation | undefined) || undefined;
            if (!semesterRegulation && regCounts.size > 0) {
                semesterRegulation = [...regCounts.entries()].sort((a, b) => b[1] - a[1])[0][0] as Regulation;
            }

            return {
                id: key,
                year,
                sem,
                subjects: semSubjects,
                isExpanded: false,
                mode: 'detailed' as const,
                ...(officialCredits !== undefined ? { officialCredits } : {}),
                ...(semesterRegulation ? { regulation: semesterRegulation } : {}),
            };
        });

        if (semestersToImport.length > 0) {
            let regulation: Regulation = detectedRegulation || 'R18';
            if (!detectedRegulation && htno) {
                const yearStr = htno.substring(0, 2);
                if (/^\d+$/.test(yearStr)) {
                    const year = parseInt(yearStr);
                    if (year >= 25) regulation = 'R25';
                    else if (year >= 24) regulation = 'R24';
                    else if (year >= 22) regulation = 'R22';
                    else if (year >= 18) regulation = 'R18';
                    else if (year >= 16) regulation = 'R16';
                    else if (year === 15) regulation = 'R15';
                    else if (year >= 13) regulation = 'R13';
                }
            }

            const mappedAllAttempts: Subject[] = (extraAudit?.all_attempts || subjects).map((sub: any, sIdx: number) => ({
                id: `attempt-${sub.subject_code || sub.code || 'sub'}-${sIdx}`,
                code: sub.subject_code || sub.code,
                name: sub.subject_name || sub.name || 'Course',
                grade: (sub.grade || 'F') as Grade,
                credits: typeof sub.credits === 'number' ? sub.credits : 0,
                internal: sub.internal,
                external: sub.external,
                total: sub.total,
                examCode: sub.exam_code,
                attemptType: sub.attempt_type || (sub.exam_code ? 'supplementary' : 'regular'),
                regulation: sub.regulation as Regulation | undefined,
            }));

            replaceFromImport({
                semesters: semestersToImport as Semester[],
                studentName: studentName || '',
                hallTicket: htno || '',
                regulation,
                officialCGPA,
                studentStatus: extraAudit?.student_status,
                isConsolidated: extraAudit?.is_consolidated,
                regulationsSeen: regulationsSeen,
                resolutionAudit: extraAudit?.resolution_audit,
                searchPath: extraAudit?.search_path,
                allAttempts: mappedAllAttempts,
            });

            const seen = (regulationsSeen || []).filter(Boolean);
            if (seen.length > 1) {
                toast.success(`Multi-regulation career: ${seen.join(' → ')}`, {
                    icon: <Info className="w-4 h-4 text-amber-600" />,
                    duration: 5000,
                });
            } else {
                toast.success(`Active regulation: ${regulation}`, { icon: <Info className="w-4 h-4 text-accent" /> });
            }

            if (typeof officialCGPA === 'number' && officialCGPA > 0) {
                toast.success(`Using Official Cumulative GPA: ${officialCGPA}`, { icon: <CheckCircle className="w-4 h-4 text-emerald-600" /> });
            }

            const filledSemesters = semestersToImport
                .filter((s) => (s.subjects?.length || 0) > 0)
                .sort((a, b) => a.year - b.year || a.sem - b.sem);
            const filled = filledSemesters.length;
            const latest = filledSemesters[filledSemesters.length - 1];
            const latestLabel = latest ? `${latest.year}-${latest.sem}` : null;

            toast.success(`Imported marks for ${filled} semesters!`, {
                icon: <CheckCircle className="text-accent" />
            });

            if (latestLabel && filled < 8) {
                toast(
                    `Latest semester on record: ${latestLabel} (${filled}/8). Later semis appear when JNTUH/dhethi publish them.`,
                    { duration: 6000, icon: <Info className="w-4 h-4 text-accent" /> }
                );

                const htYear = /^\d{2}/.test(htno || '') ? parseInt(htno.slice(0, 2), 10) : NaN;
                const hasR22SeriesCodes = subjects.some((s) =>
                    /^18\d/.test(String(s.subject_code || '').replace(/\s/g, '').toUpperCase())
                );
                // R18-era HT with incomplete upstream data — possible detention into R22
                if (
                    !Number.isNaN(htYear) &&
                    htYear >= 18 &&
                    htYear <= 21 &&
                    !hasR22SeriesCodes &&
                    (!seen.length || (seen.length === 1 && seen[0] === 'R18'))
                ) {
                    toast(
                        'If you rejoined under R22 after detention, upload memo PDFs (or a new HT if issued) — those results are not in the upstream feed yet.',
                        { duration: 8000, icon: <Info className="w-4 h-4 text-amber-600" /> }
                    );
                }
            }

            if (fetchMeta) {
                const acad = fetchMeta.academic_semesters ?? 0;
                const all = fetchMeta.all_semesters ?? 0;
                if (all > acad) {
                    toast.success(
                        `Loaded full exam history (${all} semis vs ${acad} consolidated)`,
                        { duration: 4500 }
                    );
                } else if (fetchMeta.hard_refresh) {
                    toast.success(
                        `Refreshed upstream cache · ${all || filled} semester(s) on record`,
                        { duration: 4000 }
                    );
                }
            }

            try {
                if (htno) {
                    const next = [{ htno, studentName: studentName || 'Student', cgpa: officialCGPA || 0 }, ...recentSearches.filter(s => s.htno !== htno)].slice(0, 4);
                    setRecentSearches(next);
                    localStorage.setItem('jntuh_recent_htno_v2', JSON.stringify(next));
                }
            } catch {
                /* ignore storage errors */
            }

            onImportSuccess?.();

            if (semestersToImport.length >= 8 && !hasAnyFail) {
                setTimeout(() => setShowCelebration(true), 800);
            }
        }
    }, [replaceFromImport, onImportSuccess]);

    const handleFiles = useCallback(async (files: FileList | null) => {
        if (!files || files.length === 0) return;

        setIsProcessing(true);
        const toastId = toast.loading('Reading marks files...');
        try {
            const fileArray = Array.from(files);
            const response = await uploadPDFs(fileArray);

            if (response.success && response.subjects) {
                processResults(
                    response.subjects,
                    response.semesters,
                    response.htno,
                    response.student_name,
                    response.official_cgpa,
                    response.regulation as Regulation
                );
                toast.dismiss(toastId);
            }
        } catch (error) {
            const err = error as Error;
            toast.dismiss(toastId);
            toast.error(err.message || 'Failed to read result files');
        } finally {
            setIsProcessing(false);
        }
    }, [processResults]);

    const [forceRefresh, setForceRefresh] = useState(false);

    const handleHtnoFetch = useCallback(async (customHtno?: string) => {
        const rawInput = (customHtno || htnoInput).trim().toUpperCase();
        if (!rawInput) {
            toast.error('Please enter a 10-character hall ticket number');
            return;
        }

        const { clean: targetHtno, changed } = sanitizeJntuhHtno(rawInput);
        if (changed) {
            setHtnoInput(targetHtno);
            toast(`Auto-corrected hall ticket to ${targetHtno} (replaced letter 'O' with digit '0')`, {
                icon: '💡',
                duration: 4000
            });
        }

        setIsProcessing(true);
        const toastId = toast.loading(
            forceRefresh
                ? `Initiating deep university re-sync for ${targetHtno}…`
                : `Loading academic records for ${targetHtno}…`
        );
        try {
            const response = await fetchByHallTicket(targetHtno, forceRefresh, selectedReg);

            if (response.success && response.subjects) {
                processResults(
                    response.subjects,
                    response.semesters,
                    response.htno,
                    response.student_name,
                    response.official_cgpa,
                    response.regulation as Regulation,
                    response.regulations_seen as string[] | undefined,
                    response.fetch_meta as
                        | { academic_semesters?: number; all_semesters?: number; hard_refresh?: boolean }
                        | undefined,
                    {
                        resolution_audit: (response as any).resolution_audit,
                        search_path: (response as any).search_path,
                        is_consolidated: (response as any).is_consolidated,
                        student_status: (response as any).student_status,
                        all_attempts: (response as any).all_attempts,
                    }
                );
                toast.dismiss(toastId);
                toast.success(`Academic records verified for ${response.htno}!`);
            }
        } catch (error) {
            const err = error as Error;
            toast.dismiss(toastId);
            toast.error(err.message || 'Could not fetch results. Try toggling deep re-sync.');
        } finally {
            setIsProcessing(false);
        }
    }, [htnoInput, forceRefresh, selectedReg, processResults]);

    const triggerFileSelect = () => {
        document.getElementById('gemini-pdf-file')?.click();
    };

    const handleQuickRoll = (roll: string) => {
        setHtnoInput(roll);
        handleHtnoFetch(roll);
    };

    return (
        <>
            <CelebrationModal
                isOpen={showCelebration}
                onClose={() => setShowCelebration(false)}
                studentName={data.studentName}
            />

            <div
                className="import-hero select-none relative overflow-hidden"
                onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
                onDragLeave={() => setIsDragging(false)}
                onDrop={(e) => { e.preventDefault(); setIsDragging(false); handleFiles(e.dataTransfer.files); }}
            >
                <div className="max-w-3xl mx-auto space-y-6 relative z-10">
                    <div className="space-y-3 text-center">
                        <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-accent-blue-subtle border border-accent-blue-border text-[11px] font-mono text-accent font-semibold">
                            <span className="w-1.5 h-1.5 rounded-full bg-accent animate-pulse" />
                            <span>JNTUH AUTONOMOUS & AFFILIATED ENGINE · 2026 EDITION</span>
                        </div>
                        <h1 className="import-hero-title text-2xl sm:text-3xl md:text-5xl font-extrabold text-text-primary tracking-tight">
                            Academic Results & <span className="text-accent">Degree Intelligence</span>
                        </h1>
                        <p className="text-xs md:text-sm text-text-secondary max-w-xl mx-auto leading-relaxed">
                            Synchronize your complete 4-year university academic records in under 2 seconds. Analyze SGPA trajectories, backlog recovery, class ranking, and exam study resources.
                        </p>
                    </div>

                    {/* Mode Segmented Bar */}
                    <div className="flex items-center justify-center gap-2 max-w-md mx-auto p-1 rounded-xl bg-surface-subtle border border-border shadow-xs">
                        <button
                            type="button"
                            onClick={() => setIntakeMode('htno')}
                            className={`flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                                intakeMode === 'htno'
                                    ? 'bg-accent text-white shadow-royal'
                                    : 'text-text-muted hover:text-text-primary'
                            }`}
                        >
                            <Search className="w-3.5 h-3.5" />
                            <span>Hall Ticket Sync</span>
                        </button>
                        <button
                            type="button"
                            onClick={() => setIntakeMode('pdf')}
                            className={`flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                                intakeMode === 'pdf'
                                    ? 'bg-accent text-white shadow-royal'
                                    : 'text-text-muted hover:text-text-primary'
                            }`}
                        >
                            <FileUp className="w-3.5 h-3.5" />
                            <span>PDF Memo Scanner</span>
                        </button>
                    </div>

                    {/* MODE 1: Hall Ticket Sync */}
                    {intakeMode === 'htno' && (
                        <div className="space-y-4">
                            <div className={`import-prompt-bar w-full ${isDragging ? 'is-dragging' : ''} shadow-md`}>
                                <button 
                                    onClick={triggerFileSelect}
                                    disabled={isProcessing}
                                    className="p-2 rounded-md bg-surface-subtle border border-border hover:border-accent hover:text-accent text-text-muted transition-all mr-2 flex-shrink-0 cursor-pointer disabled:opacity-50"
                                    title="Upload Result Memo PDF"
                                    type="button"
                                >
                                    <Paperclip className="w-4 h-4 text-accent" />
                                </button>

                                <input
                                    type="text"
                                    value={htnoInput}
                                    onChange={(e) => setHtnoInput(e.target.value.toUpperCase())}
                                    placeholder="Enter 10-char hall ticket (e.g. 21071A0501)"
                                    className="flex-1 bg-transparent text-text-primary font-mono font-semibold placeholder:text-text-muted focus:outline-none pr-3 text-sm tracking-wider"
                                    onKeyDown={(e) => e.key === 'Enter' && handleHtnoFetch()}
                                    disabled={isProcessing}
                                    aria-label="Hall ticket number"
                                />

                                <input
                                    type="file"
                                    id="gemini-pdf-file"
                                    accept=".pdf"
                                    multiple
                                    onChange={(e) => handleFiles(e.target.files)}
                                    className="hidden"
                                />

                                <select
                                    value={selectedReg}
                                    onChange={(e) => {
                                        const next = e.target.value;
                                        setSelectedReg(next);
                                        setRegulation(next as Regulation);
                                    }}
                                    disabled={isProcessing}
                                    className="bg-surface-subtle hover:bg-white text-text-primary text-xs font-mono font-semibold px-2.5 py-1.5 rounded-md border border-border focus:outline-none cursor-pointer mr-2 transition-colors disabled:opacity-50"
                                    title="Starting Regulation Scheme"
                                >
                                    {['R22', 'R18', 'R24', 'R25', 'R16', 'R15', 'R13'].map((r) => (
                                        <option key={r} value={r}>
                                            {r} Scheme
                                        </option>
                                    ))}
                                </select>

                                <button
                                    onClick={() => handleHtnoFetch()}
                                    disabled={isProcessing}
                                    type="button"
                                    className="btn-primary py-2 px-5 shrink-0 text-xs font-bold disabled:opacity-50 cursor-pointer shadow-royal active:scale-95 transition-transform"
                                >
                                    {isProcessing ? (
                                        <Loader2 className="w-4 h-4 animate-spin" />
                                    ) : (
                                        <span>Analyze</span>
                                    )}
                                </button>
                            </div>

                            {/* Quick Test Samples */}
                            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 text-xs pt-1">
                                <div className="flex items-center gap-1.5 flex-wrap">
                                    <span className="text-[11px] text-text-muted font-mono font-medium">Quick samples:</span>
                                    {['21071A0501', '20B91A0501', '21241A0501'].map((roll) => (
                                        <button
                                            key={roll}
                                            type="button"
                                            onClick={() => handleQuickRoll(roll)}
                                            disabled={isProcessing}
                                            className="px-2.5 py-1 rounded-lg bg-surface-subtle hover:bg-accent-blue-subtle border border-border text-[11px] font-mono text-text-secondary hover:text-accent transition-all cursor-pointer hover:border-accent-blue-border"
                                            title={`Load ${roll}`}
                                        >
                                            {roll}
                                        </button>
                                    ))}
                                </div>

                                <label className="flex items-center gap-2 text-[11px] font-mono text-text-muted cursor-pointer hover:text-text-primary select-none">
                                    <input
                                        type="checkbox"
                                        checked={forceRefresh}
                                        onChange={(e) => setForceRefresh(e.target.checked)}
                                        className="rounded border-border bg-white text-accent focus:ring-0 cursor-pointer"
                                    />
                                    <span>Force university re-scrape</span>
                                </label>
                            </div>

                            {/* Recent Searches Bar (if any) */}
                            {recentSearches.length > 0 && (
                                <div className="pt-2 border-t border-border flex items-center gap-2 overflow-x-auto text-xs font-mono">
                                    <span className="text-[10px] text-text-muted uppercase tracking-wider flex items-center gap-1 shrink-0 font-semibold">
                                        <History className="w-3 h-3 text-accent" /> Recent:
                                    </span>
                                    {recentSearches.map((rec) => (
                                        <button
                                            key={rec.htno}
                                            type="button"
                                            onClick={() => handleQuickRoll(rec.htno)}
                                            className="px-2.5 py-1 rounded-md bg-surface-subtle hover:bg-accent-blue-subtle border border-border text-[11px] text-text-secondary hover:text-accent transition-colors cursor-pointer shrink-0 flex items-center gap-1.5 hover:border-accent-blue-border"
                                        >
                                            <span className="text-accent font-bold">{rec.htno}</span>
                                            {rec.cgpa && rec.cgpa > 0 && (
                                                <span className="text-emerald-600 font-semibold text-[10px]">({rec.cgpa.toFixed(2)})</span>
                                            )}
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}

                    {/* MODE 2: PDF Memo Scanner */}
                    {intakeMode === 'pdf' && (
                        <div
                            onClick={triggerFileSelect}
                            className="p-8 rounded-2xl border-2 border-dashed border-border-strong hover:border-accent bg-surface-subtle hover:bg-white transition-all cursor-pointer text-center relative overflow-hidden group space-y-4 shadow-xs"
                        >
                            {isProcessing && <div className="scanner-laser" />}
                            <div className="w-14 h-14 rounded-2xl bg-accent-blue-subtle border border-accent-blue-border flex items-center justify-center mx-auto text-accent group-hover:scale-105 transition-transform">
                                <FileUp className="w-7 h-7" />
                            </div>
                            <div className="space-y-1">
                                <h3 className="text-base font-bold text-text-primary">Click or drag & drop result memo PDFs</h3>
                                <p className="text-xs text-text-secondary max-w-md mx-auto">
                                    Upload single semester result cards or consolidated multi-semester grade sheets. Instant client-side parsing without storing documents.
                                </p>
                            </div>
                            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white border border-border text-[11px] font-mono text-text-muted shadow-2xs">
                                <span>PDF Format Supported</span>
                                <span>·</span>
                                <span>Batch Multi-Semester Upload</span>
                            </div>
                        </div>
                    )}

                    <div className="import-meta no-print">
                        <span><i style={{ background: 'var(--color-primary)' }}></i> Instant University Cache</span>
                        <span><i style={{ background: 'var(--color-warning)' }}></i> PDF Memo Parsing</span>
                        <span><i style={{ background: 'var(--color-success)' }}></i> 100% Private Session</span>
                    </div>
                </div>

                {/* Ambient drag drop overlay */}
                {isDragging && (
                    <div className="absolute inset-0 bg-white/95 backdrop-blur-sm flex items-center justify-center z-20 pointer-events-none border-2 border-dashed border-accent rounded-xl">
                        <div className="text-center space-y-3">
                            <div className="w-12 h-12 rounded-lg bg-accent-blue-subtle border border-accent-blue-border flex items-center justify-center mx-auto">
                                <FileUp className="w-6 h-6 text-accent" />
                            </div>
                            <div>
                                <p className="font-semibold text-sm text-text-primary">Release to upload memo PDFs</p>
                                <p className="text-xs text-text-muted mt-0.5">Supports single or multi-semester files</p>
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* Platform Capabilities Bento Grid (Showcases key features below intake) */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 pt-2">
                <div className="glass-card-interactive p-5 rounded-xl space-y-2.5">
                    <div className="w-8 h-8 rounded-lg bg-amber-50 border border-amber-200 flex items-center justify-center text-amber-600">
                        <Trophy className="w-4 h-4" />
                    </div>
                    <h3 className="text-sm font-bold text-text-primary">Class & Batch Leaderboard</h3>
                    <p className="text-xs text-text-secondary leading-relaxed">
                        Benchmark your CGPA against all 60–120 students in your section with instant topper podiums and pass rates.
                    </p>
                </div>

                <div className="glass-card-interactive p-5 rounded-xl space-y-2.5">
                    <div className="w-8 h-8 rounded-lg bg-rose-50 border border-rose-200 flex items-center justify-center text-rose-600">
                        <Flame className="w-4 h-4" />
                    </div>
                    <h3 className="text-sm font-bold text-text-primary">Time-to-Time Imp Questions</h3>
                    <p className="text-xs text-text-secondary leading-relaxed">
                        Curated 10-mark repeated questions, evaluator blueprints, and 1-page printable cram sheets for exams.
                    </p>
                </div>

                <div className="glass-card-interactive p-5 rounded-xl space-y-2.5">
                    <div className="w-8 h-8 rounded-lg bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-600">
                        <ShieldCheck className="w-4 h-4" />
                    </div>
                    <h3 className="text-sm font-bold text-text-primary">Grace Marks & Backlog Plan</h3>
                    <p className="text-xs text-text-secondary leading-relaxed">
                        Simulate official JNTUH 0.15% grace marks rules and subject exemption eligibility for degree conferment.
                    </p>
                </div>

                <div className="glass-card-interactive p-5 rounded-xl space-y-2.5">
                    <div className="w-8 h-8 rounded-lg bg-blue-50 border border-blue-200 flex items-center justify-center text-accent">
                        <Sparkles className="w-4 h-4" />
                    </div>
                    <h3 className="text-sm font-bold text-text-primary">Spotify-Style Journey Wrapped</h3>
                    <p className="text-xs text-text-secondary leading-relaxed">
                        Experience your 4-year engineering comeback arc, toughest semesters, and export shareable visual milestone cards.
                    </p>
                </div>
            </div>
        </>
    );
}
