import { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { BookOpen, Download, ChevronRight, ChevronDown, Folder, FileText, Loader2, AlertTriangle, Upload, CheckCircle, X, Plus, Users } from 'lucide-react';
import toast from 'react-hot-toast';
import { supabase } from '../lib/supabase';

const API_BASE_URL = import.meta.env.VITE_API_URL || '';
interface NoteFile {
    name: string;
    filename?: string;
    path: string;
    size: number;
    url?: string;
}

interface Subject {
    name: string;
    path: string;
    files: NoteFile[];
}

interface Semester {
    name: string;
    path: string;
    subjects: Subject[];
}

interface Year {
    name: string;
    path: string;
    semesters: Semester[];
}

interface Regulation {
    name: string;
    path: string;
    years?: Year[];
    files?: NoteFile[];  // R22 flat structure
}

interface NotesCatalog {
    regulations: Regulation[];
}

function formatFileSize(bytes: number): string {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default function NotesHub() {
    const [catalog, setCatalog] = useState<NotesCatalog | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [expandedPaths, setExpandedPaths] = useState<Set<string>>(new Set());

    // Contribution state
    const [showContribute, setShowContribute] = useState(false);
    const [uploadFile, setUploadFile] = useState<File | null>(null);
    const [uploadRegulation, setUploadRegulation] = useState('R22');
    const [uploadYear, setUploadYear] = useState('');
    const [uploadSemester, setUploadSemester] = useState('');
    const [uploadSubject, setUploadSubject] = useState('');
    const [isUploading, setIsUploading] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const fetchCatalog = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            // 1. Fetch Local Catalog (Backend File System)
            let builtCatalog: NotesCatalog = { regulations: [] };
            try {
                const localResponse = await fetch(`${API_BASE_URL}/notes/catalog`);
                if (localResponse.ok) {
                    builtCatalog = await localResponse.json();
                }
            } catch (err) {
                console.warn("Could not fetch local notes catalog", err);
            }

            // 2. Fetch all approved notes from Supabase
            let notes: any[] = [];
            try {
                const { data, error: dbError } = await supabase
                    .from('notes')
                    .select('*')
                    .eq('status', 'approved')
                    .order('created_at', { ascending: false });

                if (dbError) throw dbError;
                if (data) notes = data;
            } catch (err: any) {
                console.warn("Supabase fetch failed. Please check VITE_SUPABASE_URL in .env.", err);
                // We don't throw here so the local catalog can still display if it existed, and the page doesn't crash.
            }

            // 3. Merge Supabase notes into catalog structure
            if (notes && notes.length > 0) {
                // Get or create the special 'Contributed Notes' category
                let contributedReg = builtCatalog.regulations.find(r => r.name === 'Contributed Notes');
                if (!contributedReg) {
                    contributedReg = { name: 'Contributed Notes', path: 'Contributed Notes', files: [] };
                    builtCatalog.regulations.push(contributedReg);
                }

                if (!contributedReg.files) contributedReg.files = [];

                notes.forEach((note: any) => {
                    // Combine subject and regulation for better context in flat list
                    const displayName = `${note.subject} (${note.regulation})`;

                    const fileObj: NoteFile = {
                        name: displayName,
                        filename: note.file_name,
                        path: note.file_url,
                        size: note.file_size,
                        url: note.file_url
                    };

                    contributedReg.files!.push(fileObj);
                });

                // Sort all contributed files alphabetically by their display name
                contributedReg.files.sort((a, b) => a.name.localeCompare(b.name));
            }

            // Clean up empty arrays
            builtCatalog.regulations.forEach(reg => {
                if (reg.years && reg.years.length === 0) delete reg.years;
                if (reg.files && reg.files.length === 0) delete reg.files;
            });

            // Sort regulations
            builtCatalog.regulations.sort((a, b) => b.name.localeCompare(a.name));

            setCatalog(builtCatalog);
        } catch (e: any) {
            console.error("Fetch catalog error:", e);
            setError(e.message || 'Failed to load notes');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { fetchCatalog(); }, [fetchCatalog]);

    const toggleExpand = (path: string) => {
        setExpandedPaths(prev => {
            const next = new Set(prev);
            if (next.has(path)) next.delete(path);
            else next.add(path);
            return next;
        });
    };

    const handleDownload = (pathOrUrl: string, filename: string) => {
        // If it's a Supabase URL, just open it
        if (pathOrUrl.startsWith('http')) {
            const link = document.createElement('a');
            link.href = pathOrUrl;
            link.download = filename;
            link.target = '_blank';
            link.rel = 'noopener noreferrer';
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            toast.success(`Opening ${filename}`);
            return;
        }

        // Fallback for legacy local paths
        const link = document.createElement('a');
        link.href = `${API_BASE_URL}/notes/download?path=${encodeURIComponent(pathOrUrl)}`;
        link.download = filename;
        link.target = '_blank';
        link.rel = 'noopener noreferrer';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        toast.success(`Downloading ${filename}`);
    };

    const handleUploadSubmit = async () => {
        if (!uploadFile) {
            toast.error('Please select a PDF file');
            return;
        }
        if (!uploadSubject.trim()) {
            toast.error('Please enter a subject name');
            return;
        }

        setIsUploading(true);
        try {
            const timestamp = new Date().getTime();
            const safeFileName = uploadFile.name.replace(/[^a-zA-Z0-9.-]/g, '_');
            const filePath = `${uploadRegulation}/${timestamp}_${safeFileName}`;

            // 1. Upload to Supabase Storage
            const { error: storageError } = await supabase.storage
                .from('notes_files')
                .upload(filePath, uploadFile, {
                    cacheControl: '3600',
                    upsert: false
                });

            if (storageError) throw storageError;

            // 2. Get Public URL
            const { data: { publicUrl } } = supabase.storage
                .from('notes_files')
                .getPublicUrl(filePath);

            // 3. Insert record into Database with status='pending'
            const { error: dbError } = await supabase
                .from('notes')
                .insert([{
                    regulation: uploadRegulation,
                    year: uploadYear || null,
                    semester: uploadSemester || null,
                    subject: uploadSubject.trim(),
                    file_name: safeFileName,
                    file_url: publicUrl,
                    file_size: uploadFile.size,
                    status: 'pending' // Note this needs review by admin before appearing!
                }]);

            if (dbError) throw dbError;

            toast.success('Notes uploaded successfully! They will appear after review. 🎉', { duration: 5000 });

            // Reset form
            setUploadFile(null);
            setUploadSubject('');
            setUploadYear('');
            setUploadSemester('');
            if (fileInputRef.current) fileInputRef.current.value = '';

            // Note: we don't need to rebuild catalog here because we just uploaded a pending document!
        } catch (e: any) {
            console.error("Upload error:", e);
            if (e?.message === 'Failed to fetch' || e?.toString().includes('fetch')) {
                 toast.error('Database connection failed. Please add a valid VITE_SUPABASE_URL to your .env file.', { duration: 6000 });
            } else {
                 toast.error(e.message || 'Upload failed');
            }
        } finally {
            setIsUploading(false);
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center py-20">
                <Loader2 className="w-8 h-8 text-primary animate-spin" />
                <span className="ml-3 text-text-muted">Loading notes catalog...</span>
            </div>
        );
    }

    if (error) {
        return (
            <div className="bg-rose-500/10 border border-rose-500/20 rounded-3xl p-8 text-center">
                <AlertTriangle className="w-10 h-10 text-rose-400 mx-auto mb-3" />
                <p className="text-white font-bold mb-2">Failed to Load Notes</p>
                <p className="text-sm text-text-muted mb-4">{error}</p>
                <button onClick={fetchCatalog} className="btn-primary text-sm">
                    Try Again
                </button>
            </div>
        );
    }

    return (
        <div className="space-y-6 select-none">
            {/* Header */}
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="text-center mb-4"
            >
                <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-violet-500 to-purple-600 mb-4">
                    <BookOpen className="w-8 h-8 text-white" />
                </div>
                <h1 className="text-3xl font-black text-white mb-2">Study Library</h1>
                <p className="text-text-muted max-w-xl mx-auto">
                    Access and download notes organized by your semester needs
                </p>
            </motion.div>

            {/* Contribute Notes Section */}
            <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
                className="bg-gradient-to-br from-emerald-500/10 via-bg-card to-bg-card rounded-3xl border border-emerald-500/20 overflow-hidden"
            >
                <button
                    onClick={() => setShowContribute(!showContribute)}
                    className="w-full flex items-center gap-4 p-6 hover:bg-white/5 transition-colors"
                >
                    <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-emerald-400 to-teal-500 flex items-center justify-center">
                        <Plus className="w-6 h-6 text-white" />
                    </div>
                    <div className="flex-1 text-left">
                        <h2 className="text-xl font-bold text-white">Share Study Materials</h2>
                        <p className="text-xs text-text-muted mt-1">
                            Help other students by uploading your notes
                        </p>
                    </div>
                    {showContribute
                        ? <ChevronDown className="w-5 h-5 text-text-muted" />
                        : <ChevronRight className="w-5 h-5 text-text-muted" />
                    }
                </button>

                <AnimatePresence>
                    {showContribute && (
                        <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: 'auto', opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            transition={{ duration: 0.2 }}
                            className="border-t border-emerald-500/10"
                        >
                            <div className="p-6 space-y-5">
                                {/* Row 1: Regulation + Subject */}
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    <div>
                                        <label className="text-[10px] font-bold text-emerald-400 uppercase tracking-[0.15em] mb-2 block">
                                            Regulation
                                        </label>
                                        <select
                                            value={uploadRegulation}
                                            onChange={(e) => setUploadRegulation(e.target.value)}
                                            className="input-field cursor-pointer"
                                        >
                                            <option value="R13">R13</option>
                                            <option value="R15">R15</option>
                                            <option value="R16">R16</option>
                                            <option value="R18">R18</option>
                                            <option value="R22">R22</option>
                                            <option value="R24">R24</option>
                                        </select>
                                    </div>
                                    <div>
                                        <label className="text-[10px] font-bold text-emerald-400 uppercase tracking-[0.15em] mb-2 block">
                                            Subject Name *
                                        </label>
                                        <input
                                            type="text"
                                            value={uploadSubject}
                                            onChange={(e) => setUploadSubject(e.target.value)}
                                            placeholder="e.g. Data Structures, M1, DBMS"
                                            className="input-field"
                                        />
                                    </div>
                                </div>

                                {/* Row 2: Year + Semester (optional, mainly for R18) */}
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    <div>
                                        <label className="text-[10px] font-bold text-emerald-400 uppercase tracking-[0.15em] mb-2 block">
                                            Year <span className="text-text-muted">(optional)</span>
                                        </label>
                                        <select
                                            value={uploadYear}
                                            onChange={(e) => setUploadYear(e.target.value)}
                                            className="input-field cursor-pointer"
                                        >
                                            <option value="">Select Year</option>
                                            <option value="1st year">1st Year</option>
                                            <option value="2nd year">2nd Year</option>
                                            <option value="3rd year">3rd Year</option>
                                            <option value="4th year">4th Year</option>
                                        </select>
                                    </div>
                                    <div>
                                        <label className="text-[10px] font-bold text-emerald-400 uppercase tracking-[0.15em] mb-2 block">
                                            Semester <span className="text-text-muted">(optional)</span>
                                        </label>
                                        <select
                                            value={uploadSemester}
                                            onChange={(e) => setUploadSemester(e.target.value)}
                                            className="input-field cursor-pointer"
                                        >
                                            <option value="">Select Semester</option>
                                            <option value="1st sem">1st Semester</option>
                                            <option value="2nd sem">2nd Semester</option>
                                        </select>
                                    </div>
                                </div>

                                {/* File Upload */}
                                <div>
                                    <label className="text-[10px] font-bold text-emerald-400 uppercase tracking-[0.15em] mb-2 block">
                                        PDF File *
                                    </label>
                                    <div
                                        className={`relative border-2 border-dashed rounded-2xl p-6 text-center transition-all cursor-pointer
                                            ${uploadFile
                                                ? 'border-emerald-500/40 bg-emerald-500/5'
                                                : 'border-white/10 hover:border-emerald-500/30 hover:bg-white/5'
                                            }`}
                                        onClick={() => fileInputRef.current?.click()}
                                    >
                                        <input
                                            ref={fileInputRef}
                                            type="file"
                                            accept=".pdf"
                                            className="hidden"
                                            onChange={(e) => {
                                                const file = e.target.files?.[0];
                                                if (file) {
                                                    if (file.type !== 'application/pdf') {
                                                        toast.error('Only PDF files are accepted');
                                                        return;
                                                    }
                                                    if (file.size > 15 * 1024 * 1024) {
                                                        toast.error('File size must be under 15MB');
                                                        return;
                                                    }
                                                    setUploadFile(file);
                                                }
                                            }}
                                        />

                                        {uploadFile ? (
                                            <div className="flex items-center justify-center gap-3">
                                                <CheckCircle className="w-5 h-5 text-emerald-400" />
                                                <span className="text-sm font-medium text-white">{uploadFile.name}</span>
                                                <span className="text-xs text-text-muted">({formatFileSize(uploadFile.size)})</span>
                                                <button
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        setUploadFile(null);
                                                        if (fileInputRef.current) fileInputRef.current.value = '';
                                                    }}
                                                    className="p-1 hover:bg-white/10 rounded-lg transition-colors"
                                                >
                                                    <X className="w-4 h-4 text-text-muted hover:text-red-400" />
                                                </button>
                                            </div>
                                        ) : (
                                            <div>
                                                <Upload className="w-8 h-8 text-text-muted mx-auto mb-2" />
                                                <p className="text-sm text-text-muted">
                                                    Click to select or drag & drop a PDF file
                                                </p>
                                                <p className="text-xs text-text-muted mt-1">Max file size: 15MB</p>
                                            </div>
                                        )}
                                    </div>
                                </div>

                                {/* Submit Button */}
                                <div className="flex justify-end">
                                    <motion.button
                                        whileHover={{ scale: 1.02 }}
                                        whileTap={{ scale: 0.98 }}
                                        onClick={handleUploadSubmit}
                                        disabled={isUploading || !uploadFile || !uploadSubject.trim()}
                                        className="btn-primary px-8 flex items-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed"
                                    >
                                        {isUploading ? (
                                            <>
                                                <Loader2 className="w-4 h-4 animate-spin" />
                                                Uploading...
                                            </>
                                        ) : (
                                            <>
                                                <Upload className="w-4 h-4" />
                                                Upload Notes
                                            </>
                                        )}
                                    </motion.button>
                                </div>

                                <p className="text-xs text-emerald-400 text-center font-medium">
                                    📝 Uploaded notes go to an admin queue and will instantly appear here once approved.
                                </p>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </motion.div>

            {/* Regulations */}
            {(!catalog || catalog.regulations.length === 0) ? (
                <div className="bg-bg-card border border-white/5 rounded-3xl p-8 text-center">
                    <BookOpen className="w-10 h-10 text-text-muted mx-auto mb-3" />
                    <p className="text-white font-bold mb-2">No Notes Available Yet</p>
                    <p className="text-sm text-text-muted">Be the first to contribute! Use the form above to upload study materials.</p>
                </div>
            ) : (
                catalog.regulations.map((reg) => (
                    <motion.div
                        key={reg.name}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="bg-bg-card border border-white/5 rounded-3xl overflow-hidden"
                    >
                        {/* Regulation Header */}
                        <button
                            onClick={() => toggleExpand(reg.path)}
                            className="w-full flex items-center gap-4 p-6 hover:bg-white/5 transition-colors"
                        >
                            <div className="w-12 h-12 flex-shrink-0 rounded-2xl bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center">
                                {reg.name === 'Contributed Notes' ? (
                                    <Users className="w-5 h-5 text-white" />
                                ) : (
                                    <span className="text-white font-black text-sm">{reg.name}</span>
                                )}
                            </div>
                            <div className="flex-1 min-w-0 text-left">
                                <h2 className="text-xl font-bold text-white truncate">
                                    {reg.name === 'Contributed Notes' ? reg.name : `${reg.name} Notes`}
                                </h2>
                                <p className="text-xs text-text-muted mt-1">
                                    {reg.years
                                        ? `${reg.years.length} year(s) available`
                                        : reg.files
                                            ? `${reg.files.length} notes available`
                                            : 'No notes'
                                    }
                                </p>
                            </div>
                            {expandedPaths.has(reg.path)
                                ? <ChevronDown className="w-5 h-5 text-text-muted" />
                                : <ChevronRight className="w-5 h-5 text-text-muted" />
                            }
                        </button>

                        {/* Regulation Content */}
                        <AnimatePresence>
                            {expandedPaths.has(reg.path) && (
                                <motion.div
                                    initial={{ height: 0, opacity: 0 }}
                                    animate={{ height: 'auto', opacity: 1 }}
                                    exit={{ height: 0, opacity: 0 }}
                                    transition={{ duration: 0.2 }}
                                    className="border-t border-white/5"
                                >
                                    {/* R22 flat structure */}
                                    {reg.files && (
                                        <div className="p-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                                            {reg.files.map((file) => (
                                                <button
                                                    key={file.path}
                                                    onClick={() => handleDownload(file.path, file.filename || file.name)}
                                                    className="flex items-center gap-3 p-4 bg-white/5 hover:bg-violet-500/10 border border-white/10 hover:border-violet-500/30 rounded-2xl transition-all group"
                                                >
                                                    <FileText className="w-5 h-5 text-violet-400 flex-shrink-0" />
                                                    <div className="flex-1 text-left min-w-0">
                                                        <p className="text-sm font-medium text-white truncate">{file.name}</p>
                                                        <p className="text-[10px] text-text-muted">{formatFileSize(file.size)}</p>
                                                    </div>
                                                    <Download className="w-4 h-4 text-text-muted group-hover:text-violet-400 transition-colors flex-shrink-0" />
                                                </button>
                                            ))}
                                        </div>
                                    )}

                                    {/* R18 hierarchical structure */}
                                    {reg.years && reg.years.map((year) => (
                                        <div key={year.path}>
                                            <button
                                                onClick={() => toggleExpand(year.path)}
                                                className="w-full flex items-center gap-3 px-6 py-3 hover:bg-white/5 transition-colors border-b border-white/5"
                                            >
                                                <Folder className="w-4 h-4 text-amber-400" />
                                                <span className="font-semibold text-white text-sm">{year.name}</span>
                                                <span className="text-xs text-text-muted ml-auto mr-2">
                                                    {year.semesters.length} sem(s)
                                                </span>
                                                {expandedPaths.has(year.path)
                                                    ? <ChevronDown className="w-4 h-4 text-text-muted" />
                                                    : <ChevronRight className="w-4 h-4 text-text-muted" />
                                                }
                                            </button>

                                            <AnimatePresence>
                                                {expandedPaths.has(year.path) && year.semesters.map((sem) => (
                                                    <div key={sem.path} className="pl-6">
                                                        <button
                                                            onClick={() => toggleExpand(sem.path)}
                                                            className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-white/5 transition-colors"
                                                        >
                                                            <Folder className="w-4 h-4 text-cyan-400" />
                                                            <span className="font-medium text-white text-sm">{sem.name}</span>
                                                            <span className="text-xs text-text-muted ml-auto mr-2">
                                                                {sem.subjects.length} subject(s)
                                                            </span>
                                                            {expandedPaths.has(sem.path)
                                                                ? <ChevronDown className="w-4 h-4 text-text-muted" />
                                                                : <ChevronRight className="w-4 h-4 text-text-muted" />
                                                            }
                                                        </button>

                                                        <AnimatePresence>
                                                            {expandedPaths.has(sem.path) && (
                                                                <motion.div
                                                                    initial={{ height: 0, opacity: 0 }}
                                                                    animate={{ height: 'auto', opacity: 1 }}
                                                                    exit={{ height: 0, opacity: 0 }}
                                                                    className="pl-8 pb-2"
                                                                >
                                                                    {sem.subjects.map((subject) => (
                                                                        <div key={subject.path} className="mb-2">
                                                                            <p className="text-xs font-bold text-text-muted uppercase tracking-wider px-4 py-1.5">
                                                                                {subject.name}
                                                                            </p>
                                                                            <div className="space-y-1">
                                                                                {subject.files.map((file) => (
                                                                                    <button
                                                                                        key={file.path}
                                                                                        onClick={() => handleDownload(file.path, file.name)}
                                                                                        className="w-full flex items-center gap-3 px-4 py-2 hover:bg-violet-500/10 rounded-xl transition-colors group"
                                                                                    >
                                                                                        <FileText className="w-4 h-4 text-violet-400 flex-shrink-0" />
                                                                                        <span className="text-sm text-white truncate flex-1 text-left">{file.name}</span>
                                                                                        <span className="text-[10px] text-text-muted">{formatFileSize(file.size)}</span>
                                                                                        <Download className="w-3.5 h-3.5 text-text-muted group-hover:text-violet-400 transition-colors flex-shrink-0" />
                                                                                    </button>
                                                                                ))}
                                                                            </div>
                                                                        </div>
                                                                    ))}
                                                                </motion.div>
                                                            )}
                                                        </AnimatePresence>
                                                    </div>
                                                ))}
                                            </AnimatePresence>
                                        </div>
                                    ))}
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </motion.div>
                )))}

            {/* Privacy Notice */}
            <div className="text-center text-xs text-text-muted py-2">
                📚 All notes are securely hosted in the cloud and vetted by admins.
            </div>
        </div>
    );
}

