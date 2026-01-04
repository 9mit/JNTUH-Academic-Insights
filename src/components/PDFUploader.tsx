import { useState, useCallback } from 'react';
import { useAcademic } from '../context/AcademicContext';
import type { Regulation } from '../types';
import { uploadPDFs, fetchByHallTicket } from '../api/client';
import { FileUp, FileText, CheckCircle, Loader2, Sparkles, Trophy, PartyPopper, X, Search, Zap, ArrowRight } from 'lucide-react';
import toast from 'react-hot-toast';
import { motion, AnimatePresence } from 'framer-motion';

// Celebratory Modal Component
function CelebrationModal({ isOpen, onClose, studentName }: { isOpen: boolean; onClose: () => void; studentName?: string }) {
    if (!isOpen) return null;

    return (
        <AnimatePresence>
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4"
                onClick={onClose}
            >
                <motion.div
                    initial={{ scale: 0.5, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    exit={{ scale: 0.5, opacity: 0 }}
                    transition={{ type: "spring", damping: 15 }}
                    className="bg-gradient-to-br from-amber-500/20 via-bg-card to-emerald-500/20 rounded-3xl p-10 max-w-lg w-full border border-accent/30 relative overflow-hidden"
                    onClick={(e) => e.stopPropagation()}
                >
                    <div className="absolute -top-10 -left-10 w-40 h-40 bg-amber-400/20 rounded-full blur-3xl" />
                    <div className="absolute -bottom-10 -right-10 w-40 h-40 bg-emerald-400/20 rounded-full blur-3xl" />

                    <button onClick={onClose} className="absolute top-4 right-4 text-text-muted hover:text-white transition-colors">
                        <X className="w-6 h-6" />
                    </button>

                    <div className="relative text-center">
                        <motion.div
                            initial={{ rotate: -10 }}
                            animate={{ rotate: [0, -10, 10, -10, 10, 0] }}
                            transition={{ duration: 0.5, delay: 0.3 }}
                            className="w-24 h-24 mx-auto rounded-3xl bg-gradient-to-br from-amber-400 to-yellow-500 flex items-center justify-center shadow-2xl shadow-amber-500/30 mb-6"
                        >
                            <Trophy className="w-12 h-12 text-white" />
                        </motion.div>

                        <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.2 }}>
                            <div className="flex items-center justify-center gap-2 mb-3">
                                <PartyPopper className="w-6 h-6 text-accent" />
                                <h2 className="text-3xl font-black text-white">CONGRATULATIONS!</h2>
                                <PartyPopper className="w-6 h-6 text-accent transform scale-x-[-1]" />
                            </div>

                            {studentName && <p className="text-xl font-bold text-primary mb-4">{studentName}</p>}

                            <p className="text-lg text-text-secondary mb-2">
                                🎉 You've completed all <span className="text-white font-bold">4 years</span> with
                            </p>
                            <p className="text-2xl font-black text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-cyan-400 mb-6">
                                ZERO Backlogs!
                            </p>

                            <div className="bg-white/5 rounded-2xl p-5 border border-white/10">
                                <p className="text-text-muted text-sm leading-relaxed">
                                    🌟 <span className="text-white font-semibold">Welcome to the Elite Club!</span> 🌟
                                    <br /><br />
                                    You've joined the rare species of engineers who never experienced the "thrill" of supplementary exams!
                                    <br /><br />
                                    <span className="text-accent font-semibold">Now go celebrate – you've earned it!</span> 🚀
                                </p>
                            </div>

                            <motion.button
                                whileHover={{ scale: 1.05 }}
                                whileTap={{ scale: 0.95 }}
                                onClick={onClose}
                                className="mt-8 px-8 py-3 bg-gradient-to-r from-amber-400 to-yellow-500 text-black font-bold rounded-xl shadow-lg shadow-amber-500/30"
                            >
                                Thanks, I'm Awesome! ✨
                            </motion.button>
                        </motion.div>
                    </div>
                </motion.div>
            </motion.div>
        </AnimatePresence>
    );
}

type ImportMode = 'pdf' | 'htno';

export default function PDFUploader() {
    const { importSemesters, setStudentInfo, setRegulation, setOfficialCGPA, data } = useAcademic();
    const [mode, setMode] = useState<ImportMode>('pdf');
    const [isDragging, setIsDragging] = useState(false);
    const [isProcessing, setIsProcessing] = useState(false);
    const [showCelebration, setShowCelebration] = useState(false);
    const [htnoInput, setHtnoInput] = useState('');

    const processResults = useCallback((subjects: any[], htno: string, studentName?: string, officialCGPA?: number) => {
        const semesterMap: { [key: string]: any[] } = {};
        let hasAnyFail = false;

        subjects.forEach((subject: any) => {
            const key = `${subject.year}-${subject.sem}`;
            if (!semesterMap[key]) semesterMap[key] = [];

            if (subject.grade === 'F' || subject.grade === 'Ab') {
                hasAnyFail = true;
            }

            semesterMap[key].push({
                code: subject.subject_code,
                name: subject.subject_name,
                grade: subject.grade,
                credits: subject.credits,
                internal: subject.internal,
                external: subject.external,
                total: subject.total,
                official_sem_sgpa: subject.official_sem_sgpa
            });
        });

        const semestersToImport = Object.entries(semesterMap).map(([key, subjects]) => {
            const [year, sem] = key.split('-').map(Number);
            return { id: key, year, sem, subjects, isExpanded: false, mode: 'detailed' as const };
        });

        if (semestersToImport.length > 0) {
            importSemesters(semestersToImport as any);

            if (htno) {
                setStudentInfo(studentName || '', htno);

                // Auto-detect Regulation
                // Logic: 22 series -> R22, 21-18 -> R18, 16-17 -> R16
                // This is a heuristic based on JNTUH batches
                const yearStr = htno.substring(0, 2);
                if (/^\d+$/.test(yearStr)) {
                    const year = parseInt(yearStr);
                    let regulation: Regulation = 'R18'; // Default fallback

                    if (year >= 22) regulation = 'R22';
                    else if (year >= 18) regulation = 'R18';
                    else if (year >= 16) regulation = 'R16';
                    else if (year >= 13) regulation = 'R13';

                    setRegulation(regulation);
                    toast.success(`Detected Regulation: ${regulation}`, { icon: <Sparkles className="w-4 h-4 text-amber-400" /> });
                }
            }

            // Set official CGPA if available
            if (officialCGPA) {
                setOfficialCGPA(officialCGPA);
                toast.success(`Used Official CGPA: ${officialCGPA}`, { icon: <Zap className="w-4 h-4 text-emerald-400" /> });
            }

            toast.success(`Imported ${semestersToImport.length} semesters!`, {
                icon: <CheckCircle className="text-accent" />
            });

            if (semestersToImport.length >= 8 && !hasAnyFail) {
                setTimeout(() => setShowCelebration(true), 1000);
            }
        }
    }, [importSemesters, setStudentInfo, setRegulation, setOfficialCGPA]);

    const handleFiles = useCallback(async (files: FileList | null) => {
        if (!files || files.length === 0) return;

        setIsProcessing(true);
        try {
            const fileArray = Array.from(files);
            const response = await uploadPDFs(fileArray);

            if (response.success && response.subjects) {
                processResults(response.subjects, response.htno, response.student_name, response.official_cgpa);
            }
        } catch (error: any) {
            toast.error(error.message || 'Import failed');
        } finally {
            setIsProcessing(false);
        }
    }, [processResults]);

    const handleHtnoFetch = useCallback(async () => {
        if (!htnoInput.trim()) {
            toast.error('Please enter a hall ticket number');
            return;
        }

        setIsProcessing(true);
        try {
            const response = await fetchByHallTicket(htnoInput.trim());

            if (response.success && response.subjects) {
                processResults(response.subjects, response.htno, response.student_name, response.official_cgpa);
                toast.success(`Found ${response.total_subjects} subjects for ${response.student_name || response.htno}!`);
            }
        } catch (error: any) {
            toast.error(error.message || 'Failed to fetch results');
        } finally {
            setIsProcessing(false);
        }
    }, [htnoInput, processResults]);

    return (
        <>
            <CelebrationModal
                isOpen={showCelebration}
                onClose={() => setShowCelebration(false)}
                studentName={data.studentName}
            />

            <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-primary/10 via-bg-card to-bg-card border border-primary/20 p-8">
                {/* Decorative glow */}
                <div className="absolute -top-20 -right-20 w-60 h-60 bg-primary/20 rounded-full blur-3xl pointer-events-none" />

                {/* Mode Toggle */}
                <div className="relative flex gap-2 mb-8 p-1.5 bg-white/5 rounded-2xl w-fit">
                    <button
                        onClick={() => setMode('pdf')}
                        className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold transition-all
                            ${mode === 'pdf'
                                ? 'bg-gradient-to-r from-primary to-cyan-500 text-white shadow-lg'
                                : 'text-text-muted hover:text-white'}`}
                    >
                        <FileUp className="w-4 h-4" />
                        Upload PDFs
                    </button>
                    <button
                        onClick={() => setMode('htno')}
                        className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold transition-all
                            ${mode === 'htno'
                                ? 'bg-gradient-to-r from-primary to-cyan-500 text-white shadow-lg'
                                : 'text-text-muted hover:text-white'}`}
                    >
                        <Zap className="w-4 h-4" />
                        Auto-Fetch
                    </button>
                </div>

                {/* HTNO Mode */}
                {mode === 'htno' && (
                    <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="relative"
                    >
                        <div className="flex flex-col md:flex-row items-center gap-6">
                            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-primary to-cyan-500 flex items-center justify-center shadow-xl shadow-primary/20">
                                <Search className="w-8 h-8 text-white" />
                            </div>

                            <div className="flex-1">
                                <h2 className="text-2xl font-black text-white flex items-center gap-3 mb-2">
                                    Auto-Fetch Results
                                    <span className="text-xs font-bold px-2 py-1 bg-emerald-500/20 text-emerald-400 rounded-full">NEW</span>
                                </h2>
                                <p className="text-text-muted">
                                    Enter your hall ticket number and we'll automatically fetch all your results.
                                </p>
                            </div>
                        </div>

                        <div className="mt-6 flex flex-col sm:flex-row gap-4">
                            <div className="flex-1 relative">
                                <input
                                    type="text"
                                    value={htnoInput}
                                    onChange={(e) => setHtnoInput(e.target.value.toUpperCase())}
                                    placeholder="Enter Hall Ticket (e.g., 20B91A05XX)"
                                    className="w-full bg-white/5 border border-white/10 rounded-xl px-5 py-4 text-white font-mono font-bold 
                                               placeholder:text-text-muted focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all"
                                    onKeyDown={(e) => e.key === 'Enter' && handleHtnoFetch()}
                                    disabled={isProcessing}
                                />
                            </div>
                            <motion.button
                                whileHover={{ scale: 1.02 }}
                                whileTap={{ scale: 0.98 }}
                                onClick={handleHtnoFetch}
                                disabled={isProcessing}
                                className="btn-primary px-8 flex items-center gap-3"
                            >
                                {isProcessing ? (
                                    <Loader2 className="w-5 h-5 animate-spin" />
                                ) : (
                                    <>
                                        Fetch Results
                                        <ArrowRight className="w-5 h-5" />
                                    </>
                                )}
                            </motion.button>
                        </div>

                        <p className="mt-4 text-xs text-text-muted">
                            Please allow 10-20 seconds for fetching.
                        </p>
                    </motion.div>
                )}

                {/* PDF Mode */}
                {mode === 'pdf' && (
                    <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="relative group"
                    >
                        <input
                            type="file"
                            accept=".pdf"
                            multiple
                            onChange={(e) => handleFiles(e.target.files)}
                            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                            onDragOver={() => setIsDragging(true)}
                            onDragLeave={() => setIsDragging(false)}
                            onDrop={() => setIsDragging(false)}
                        />

                        <div className="flex flex-col md:flex-row items-center gap-8">
                            <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-primary to-cyan-500 flex items-center justify-center shadow-xl shadow-primary/20 group-hover:scale-110 transition-transform duration-300">
                                {isProcessing ? (
                                    <Loader2 className="w-10 h-10 text-white animate-spin" />
                                ) : (
                                    <FileUp className="w-10 h-10 text-white" />
                                )}
                            </div>

                            <div className="flex-1 text-center md:text-left">
                                <h2 className="text-2xl font-black text-white flex items-center justify-center md:justify-start gap-3">
                                    Upload Result PDFs
                                    <Sparkles className="w-5 h-5 text-accent" />
                                </h2>
                                <p className="text-text-muted mt-2 max-w-md">
                                    Drag & drop your JNTUH result PDFs here and we'll extract all grades automatically.
                                </p>
                                <div className="mt-5 flex flex-wrap justify-center md:justify-start gap-3">
                                    <span className="flex items-center gap-2 text-xs font-bold px-4 py-2 rounded-full bg-white/5 border border-white/10 text-text-secondary">
                                        <FileText className="w-4 h-4" />
                                        Drag & Drop
                                    </span>
                                    <span className="flex items-center gap-2 text-xs font-semibold px-3 py-1.5 rounded-full bg-accent/10 text-accent border border-accent/20">
                                        Multi-file support
                                    </span>
                                </div>
                            </div>

                            <div className="hidden lg:block">
                                <button className="btn-primary pointer-events-none">Browse Files</button>
                            </div>
                        </div>

                        {isDragging && (
                            <div className="absolute inset-0 bg-primary/10 backdrop-blur-sm flex items-center justify-center z-20 pointer-events-none border-2 border-primary rounded-3xl">
                                <div className="text-center">
                                    <FileUp className="w-12 h-12 text-primary mx-auto mb-2 animate-bounce" />
                                    <p className="font-bold text-primary">Drop to Import</p>
                                </div>
                            </div>
                        )}
                    </motion.div>
                )}
            </div>
        </>
    );
}
