import { useState, useCallback } from 'react';
import { useAcademic } from '../context/AcademicContext';
import type { Regulation, Grade, Subject } from '../types';
import { generateId } from '../constants/grading';
import { uploadPDFs, fetchByHallTicket } from '../api/client';
import { normalizeNonCreditSubject } from '../utils/nonCreditSubjects';
import { FileUp, CheckCircle, Loader2, Sparkles, Trophy, PartyPopper, X, Paperclip } from 'lucide-react';
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

// Celebratory Modal Component
function CelebrationModal({ isOpen, onClose, studentName }: { isOpen: boolean; onClose: () => void; studentName?: string }) {
    if (!isOpen) return null;

    return (
        <AnimatePresence>
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 bg-black/85 backdrop-blur-md z-50 flex items-center justify-center p-4"
                onClick={onClose}
            >
                <motion.div
                    initial={false}
                    animate={{ scale: 1, opacity: 1 }}
                    exit={{ scale: 0.95, opacity: 1 }}
                    transition={{ type: "spring", damping: 18 }}
                    className="bg-gradient-to-br from-amber-500/10 via-slate-950 to-emerald-500/10 rounded-[32px] p-10 max-w-lg w-full border border-white/10 relative overflow-hidden shadow-2xl"
                    onClick={(e) => e.stopPropagation()}
                >
                    <div className="absolute -top-10 -left-10 w-40 h-40 bg-amber-400/10 rounded-full blur-3xl" />
                    <div className="absolute -bottom-10 -right-10 w-40 h-40 bg-emerald-400/10 rounded-full blur-3xl" />

                    <button onClick={onClose} className="absolute top-6 right-6 text-text-muted hover:text-white transition-colors cursor-pointer">
                        <X className="w-5 h-5" />
                    </button>

                    <div className="relative text-center">
                        <motion.div
                            initial={{ rotate: -10 }}
                            animate={{ rotate: [0, -10, 10, -10, 10, 0] }}
                            transition={{ duration: 0.6, delay: 0.3 }}
                            className="w-20 h-20 mx-auto rounded-[24px] bg-gradient-to-br from-amber-400 to-yellow-500 flex items-center justify-center shadow-xl shadow-amber-500/25 mb-6"
                        >
                            <Trophy className="w-10 h-10 text-black" />
                        </motion.div>

                        <motion.div initial={false} animate={{ opacity: 1 }}>
                            <div className="flex items-center justify-center gap-2 mb-3">
                                <PartyPopper className="w-5 h-5 text-accent animate-bounce" />
                                <h2 className="text-2xl font-black text-white tracking-tight font-heading">AMAZING WORK!</h2>
                                <PartyPopper className="w-5 h-5 text-accent transform scale-x-[-1] animate-bounce" />
                            </div>

                            {studentName && <p className="text-lg font-bold text-primary mb-4 font-heading">{studentName}</p>}

                            <p className="text-base text-text-secondary mb-2">
                                You have finished all <span className="text-white font-bold">4 academic years</span> with
                            </p>
                            <p className="text-xl font-black text-emerald-400 mb-6 font-heading tracking-wide">
                                ABSOLUTELY ZERO BACKLOGS!
                            </p>

                            <div className="bg-white/[0.02] border border-white/5 rounded-2xl p-5 text-left">
                                <p className="text-text-muted text-xs leading-relaxed">
                                    🌟 <span className="text-white font-semibold">Degree complete!</span> You have joined the prestigious tier of engineering graduates who maintained a clean slate all the way.
                                    <br /><br />
                                    Your efforts are highly impressive. Keep striving for this level of consistency! 🚀
                                </p>
                            </div>

                            <motion.button
                                whileHover={{ scale: 1.03 }}
                                whileTap={{ scale: 0.97 }}
                                onClick={onClose}
                                className="mt-8 px-6 py-3 bg-gradient-to-r from-amber-400 to-yellow-500 text-black font-bold rounded-xl shadow-lg shadow-amber-500/20 cursor-pointer w-full font-heading"
                            >
                                Let's View My Dashboard! ✨
                            </motion.button>
                        </motion.div>
                    </div>
                </motion.div>
            </motion.div>
        </AnimatePresence>
    );
}

export default function PDFUploader({ onImportSuccess }: { onImportSuccess?: () => void }) {
    const { replaceFromImport, data } = useAcademic();
    const [isDragging, setIsDragging] = useState(false);
    const [isProcessing, setIsProcessing] = useState(false);
    const [showCelebration, setShowCelebration] = useState(false);
    const [htnoInput, setHtnoInput] = useState('');

    const processResults = useCallback((
        subjects: BackendSubject[],
        backendSemesters: BackendSemester[],
        htno: string,
        studentName?: string,
        officialCGPA?: number,
        detectedRegulation?: Regulation,
        regulationsSeen?: string[],
        fetchMeta?: { academic_semesters?: number; all_semesters?: number; hard_refresh?: boolean }
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

            const officialCredits =
                typeof backendSem?.credits === 'number' && backendSem.credits > 0
                    ? backendSem.credits
                    : undefined;

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

            replaceFromImport({
                semesters: semestersToImport,
                studentName: studentName || '',
                hallTicket: htno || '',
                regulation,
                officialCGPA,
            });

            const seen = (regulationsSeen || []).filter(Boolean);
            if (seen.length > 1) {
                toast.success(`Multi-regulation career: ${seen.join(' → ')}`, {
                    icon: <Sparkles className="w-4 h-4 text-amber-400" />,
                    duration: 5000,
                });
            } else {
                toast.success(`Active regulation: ${regulation}`, { icon: <Sparkles className="w-4 h-4 text-amber-400" /> });
            }

            if (typeof officialCGPA === 'number' && officialCGPA > 0) {
                toast.success(`Using Official Cumulative GPA: ${officialCGPA}`, { icon: <Sparkles className="w-4 h-4 text-emerald-400" /> });
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
                    { duration: 6000, icon: <Sparkles className="w-4 h-4 text-sky-400" /> }
                );
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

    const handleHtnoFetch = useCallback(async () => {
        if (!htnoInput.trim()) {
            toast.error('Please type a student ID');
            return;
        }

        setIsProcessing(true);
        const toastId = toast.loading(
            `Refreshing & fetching full history for ${htnoInput.trim().toUpperCase()}… (may take up to 2 min)`
        );
        try {
            const response = await fetchByHallTicket(htnoInput.trim(), true);

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
                        | undefined
                );
                toast.dismiss(toastId);
                toast.success(`Welcome, ${response.student_name || response.htno}!`);
            }
        } catch (error) {
            const err = error as Error;
            toast.dismiss(toastId);
            toast.error(err.message || 'We could not fetch results for this student ID');
        } finally {
            setIsProcessing(false);
        }
    }, [htnoInput, processResults]);

    const triggerFileSelect = () => {
        document.getElementById('gemini-pdf-file')?.click();
    };

    return (
        <>
            <CelebrationModal
                isOpen={showCelebration}
                onClose={() => setShowCelebration(false)}
                studentName={data.studentName}
            />

            <div
                className="import-hero select-none"
                onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
                onDragLeave={() => setIsDragging(false)}
                onDrop={(e) => { e.preventDefault(); setIsDragging(false); handleFiles(e.dataTransfer.files); }}
            >
                <div className="import-hero-glow" />

                <div className="max-w-2xl mx-auto space-y-7 relative z-10">
                    <div className="space-y-3">
                        <p className="import-kicker">Results intake</p>
                        <h1 className="import-hero-title">
                            Import your results
                        </h1>
                        <p className="text-sm md:text-[0.95rem] text-text-muted max-w-md mx-auto leading-relaxed">
                            Enter a hall ticket or drop memo PDFs. We parse every semester on that HT — including after detention under a new regulation.
                        </p>
                    </div>

                    <div className={`import-prompt-bar w-full ${isDragging ? 'is-dragging' : ''}`}>
                            <button 
                                onClick={triggerFileSelect}
                                disabled={isProcessing}
                                className="p-2.5 rounded-full bg-white/[0.04] border border-white/10 hover:bg-primary/15 hover:border-primary/35 text-text-muted transition-all mr-2.5 flex-shrink-0 cursor-pointer group disabled:opacity-50"
                                title="Select JNTUH Result PDFs"
                                type="button"
                            >
                                <Paperclip className="w-4 h-4 text-primary group-hover:scale-105 transition-transform duration-300" />
                            </button>

                            <input
                                type="text"
                                value={htnoInput}
                                onChange={(e) => setHtnoInput(e.target.value.toUpperCase())}
                                placeholder="Hall ticket — or drop PDFs"
                                className="flex-1 bg-transparent text-white font-mono font-semibold placeholder:text-text-muted/45 focus:outline-none pr-3 text-[0.95rem] tracking-wide"
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

                            <motion.button
                                whileHover={{ scale: 1.02 }}
                                whileTap={{ scale: 0.98 }}
                                onClick={handleHtnoFetch}
                                disabled={isProcessing}
                                type="button"
                                className="bg-gradient-to-r from-blue-800 to-red-700 text-white font-semibold rounded-full py-3 px-5 flex items-center gap-2 hover:shadow-lg hover:shadow-blue-900/30 transition-all cursor-pointer flex-shrink-0 disabled:opacity-50 disabled:pointer-events-none"
                            >
                                {isProcessing ? (
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                ) : (
                                    <>
                                        <Sparkles className="w-3.5 h-3.5" />
                                        <span className="text-[0.68rem] uppercase tracking-[0.12em] font-heading">Analyse</span>
                                    </>
                                )}
                            </motion.button>
                    </div>

                    <div className="import-meta no-print">
                        <span><i /> Auto-fetch</span>
                        <span><i style={{ background: 'var(--accent-red-bright)' }} /> PDF parse</span>
                        <span><i style={{ background: 'var(--accent-green)' }} /> Session-only</span>
                    </div>
                </div>

                {/* Ambient drag drop overlay */}
                {isDragging && (
                    <div className="absolute inset-0 bg-black/90 backdrop-blur-lg flex items-center justify-center z-20 pointer-events-none border-2 border-dashed border-[var(--accent-red)] rounded-[var(--radius-xl)] animate-pulse">
                        <div className="text-center space-y-4">
                            <div className="w-20 h-20 rounded-[24px] bg-primary/10 border border-primary/20 flex items-center justify-center mx-auto shadow-2xl">
                                <FileUp className="w-10 h-10 text-primary" />
                            </div>
                            <div>
                                <p className="font-heading font-black text-xl text-white">Ready to load grades!</p>
                                <p className="text-xs text-text-muted mt-1">Drop the PDFs to begin extraction</p>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </>
    );
}
