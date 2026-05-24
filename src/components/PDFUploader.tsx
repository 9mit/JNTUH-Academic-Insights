import { useState, useCallback } from 'react';
import { useAcademic } from '../context/AcademicContext';
import type { Regulation } from '../types';
import { uploadPDFs, fetchByHallTicket } from '../api/client';
import { FileUp, CheckCircle, Loader2, Sparkles, Trophy, PartyPopper, X, Paperclip } from 'lucide-react';
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
                className="fixed inset-0 bg-black/85 backdrop-blur-md z-50 flex items-center justify-center p-4"
                onClick={onClose}
            >
                <motion.div
                    initial={{ scale: 0.85, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    exit={{ scale: 0.85, opacity: 0 }}
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

                        <motion.div initial={{ y: 15, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.2 }}>
                            <div className="flex items-center justify-center gap-2 mb-3">
                                <PartyPopper className="w-5 h-5 text-accent animate-bounce" />
                                <h2 className="text-2xl font-black text-white tracking-tight font-heading">AMAZING WORK!</h2>
                                <PartyPopper className="w-5 h-5 text-accent transform scale-x-[-1] animate-bounce" />
                            </div>

                            {studentName && <p className="text-lg font-bold text-primary mb-4 font-heading">{studentName}</p>}

                            <p className="text-base text-text-secondary mb-2">
                                You have finished all <span className="text-white font-bold">4 academic years</span> with
                            </p>
                            <p className="text-xl font-black text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-cyan-400 mb-6 font-heading tracking-wide">
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

export default function PDFUploader() {
    const { importSemesters, setStudentInfo, setRegulation, setOfficialCGPA, clearAllData, data } = useAcademic();
    const [isDragging, setIsDragging] = useState(false);
    const [isProcessing, setIsProcessing] = useState(false);
    const [showCelebration, setShowCelebration] = useState(false);
    const [htnoInput, setHtnoInput] = useState('');

    const processResults = useCallback((subjects: any[], backendSemesters: any[], htno: string, studentName?: string, officialCGPA?: number, detectedRegulation?: Regulation) => {
        clearAllData();

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
            const backendSem = backendSemesters?.find((s: any) => s.year === year && s.sem === sem);
            const hasTrustedOfficialSGPA = subjects.some(
                (subject: any) => typeof subject.official_sem_sgpa === 'number' && subject.official_sem_sgpa > 0
            );

            if (!hasTrustedOfficialSGPA && typeof backendSem?.sgpa === 'number' && subjects.length > 0) {
                subjects[0].official_sem_sgpa = backendSem.sgpa;
            }

            return { id: key, year, sem, subjects, isExpanded: false, mode: 'detailed' as const };
        });

        if (semestersToImport.length > 0) {
            importSemesters(semestersToImport as any);

            if (htno) {
                setStudentInfo(studentName || '', htno);

                let regulation: Regulation = detectedRegulation || 'R18';

                const yearStr = htno.substring(0, 2);
                if (/^\d+$/.test(yearStr)) {
                    const year = parseInt(yearStr);
                    if (year >= 24) regulation = 'R24';
                    else if (year >= 22) regulation = 'R22';
                    else if (year >= 18) regulation = 'R18';
                    else if (year >= 16) regulation = 'R16';
                    else if (year === 15) regulation = 'R15';
                    else if (year >= 13) regulation = 'R13';
                }

                setRegulation(regulation);
                toast.success(`Active regulation: ${regulation}`, { icon: <Sparkles className="w-4 h-4 text-amber-400" /> });
            }

            if (typeof officialCGPA === 'number' && officialCGPA > 0) {
                setOfficialCGPA(officialCGPA);
                toast.success(`Using Official Cumulative GPA: ${officialCGPA}`, { icon: <Sparkles className="w-4 h-4 text-emerald-400" /> });
            }

            toast.success(`Imported marks for ${semestersToImport.length} semesters!`, {
                icon: <CheckCircle className="text-accent" />
            });

            if (semestersToImport.length >= 8 && !hasAnyFail) {
                setTimeout(() => setShowCelebration(true), 800);
            }
        }
    }, [clearAllData, importSemesters, setStudentInfo, setRegulation, setOfficialCGPA]);

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
        } catch (error: any) {
            toast.dismiss(toastId);
            toast.error(error.message || 'Failed to read result files');
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
        const toastId = toast.loading(`Fetching grades for ${htnoInput}...`);
        try {
            const response = await fetchByHallTicket(htnoInput.trim());

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
                toast.success(`Welcome, ${response.student_name || response.htno}!`);
            }
        } catch (error: any) {
            toast.dismiss(toastId);
            toast.error(error?.message || 'We could not fetch results for this student ID');
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
                className="relative overflow-hidden rounded-[36px] bg-gradient-to-b from-white/[0.02] to-transparent border border-white/5 p-10 md:p-14 text-center select-none"
                onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
                onDragLeave={() => setIsDragging(false)}
                onDrop={(e) => { e.preventDefault(); setIsDragging(false); handleFiles(e.dataTransfer.files); }}
            >
                {/* Glowing aesthetic orb behind the prompt bar */}
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[350px] h-[350px] bg-primary/5 rounded-full blur-[100px] pointer-events-none" />

                <div className="max-w-2xl mx-auto space-y-8 relative z-10">
                    <div className="space-y-3">
                        <h1 className="text-4xl md:text-5xl font-black tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-primary via-accent to-cyan-300 font-heading">
                            Hello, Student.
                        </h1>
                        <p className="text-sm md:text-base text-text-muted max-w-lg mx-auto font-medium">
                            Let's discover your grades. Type your Hall Ticket ID or drop your JNTUH result PDFs directly below.
                        </p>
                    </div>

                    {/* Unified Gemini Prompt Bar */}
                    <div className="relative w-full group">
                        {/* Shifting Gradient Glow border */}
                        <div className="absolute inset-0 bg-gradient-to-r from-primary via-accent to-cyan-400 rounded-full blur-md opacity-10 group-hover:opacity-20 group-focus-within:opacity-25 transition-opacity duration-500" />
                        
                        <div className="relative flex items-center bg-[#07080b]/90 border border-white/10 rounded-full p-2.5 pl-6 shadow-2xl focus-within:border-primary/40 focus-within:ring-1 focus-within:ring-primary/20 transition-all duration-500">
                            
                            {/* File Upload Paperclip */}
                            <button 
                                onClick={triggerFileSelect}
                                disabled={isProcessing}
                                className="p-2.5 rounded-full bg-white/5 border border-white/10 hover:bg-primary/20 hover:border-primary/40 hover:text-white text-text-muted transition-all mr-3 flex-shrink-0 cursor-pointer group disabled:opacity-50"
                                title="Select JNTUH Result PDFs"
                            >
                                <Paperclip className="w-5 h-5 text-primary group-hover:scale-110 transition-transform duration-300" />
                            </button>

                            {/* Main Input Text Field */}
                            <input
                                type="text"
                                value={htnoInput}
                                onChange={(e) => setHtnoInput(e.target.value.toUpperCase())}
                                placeholder="Type Hall Ticket ID... (or drop PDFs here)"
                                className="flex-1 bg-transparent text-white font-mono font-bold placeholder:text-text-muted/50 focus:outline-none pr-4 text-base tracking-wide"
                                onKeyDown={(e) => e.key === 'Enter' && handleHtnoFetch()}
                                disabled={isProcessing}
                            />

                            {/* Hidden file input */}
                            <input
                                type="file"
                                id="gemini-pdf-file"
                                accept=".pdf"
                                multiple
                                onChange={(e) => handleFiles(e.target.files)}
                                className="hidden"
                            />

                            {/* Go Button */}
                            <motion.button
                                whileHover={{ scale: 1.03 }}
                                whileTap={{ scale: 0.97 }}
                                onClick={handleHtnoFetch}
                                disabled={isProcessing}
                                className="bg-gradient-to-r from-primary to-accent text-white font-bold rounded-full py-3.5 px-6 flex items-center gap-2 hover:shadow-lg hover:shadow-primary/20 transition-all cursor-pointer flex-shrink-0 disabled:opacity-50 disabled:pointer-events-none"
                            >
                                {isProcessing ? (
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                ) : (
                                    <>
                                        <Sparkles className="w-4 h-4" />
                                        <span className="text-xs uppercase tracking-wider font-heading">Analyse</span>
                                    </>
                                )}
                            </motion.button>
                        </div>
                    </div>


                </div>

                {/* Ambient drag drop overlay */}
                {isDragging && (
                    <div className="absolute inset-0 bg-[#07080b]/90 backdrop-blur-lg flex items-center justify-center z-20 pointer-events-none border-2 border-dashed border-primary rounded-[36px] animate-pulse">
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
