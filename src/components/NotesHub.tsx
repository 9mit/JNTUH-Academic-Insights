import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { BookOpen, Download, ChevronRight, ChevronDown, Folder, FileText, Loader2, AlertTriangle, Upload, CheckCircle, X, Plus, Users, Search, Layers, Flame } from 'lucide-react';
import toast from 'react-hot-toast';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import SectionHeader from './ui/SectionHeader';
import { FALLBACK_NOTES_CATALOG } from '../constants/fallbackNotes';
import ExamBlueprintsHub from './ExamBlueprintsHub';
import ImportantQuestionsHub from './ImportantQuestionsHub';

const API_BASE_URL = import.meta.env.VITE_API_URL || '';

interface ContributedNote {
    id?: string;
    subject: string;
    regulation: string;
    file_name: string;
    file_url: string;
    file_size: number;
    status?: string;
    created_at?: string;
}

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
    const [searchQuery, setSearchQuery] = useState('');
    const [expandedPaths, setExpandedPaths] = useState<Set<string>>(
        new Set(['R18', '1st year', '1st year/1st sem'])
    );

    // Contribution state
    const [showContribute, setShowContribute] = useState(false);
    const [uploadFile, setUploadFile] = useState<File | null>(null);
    const [uploadRegulation, setUploadRegulation] = useState('R22');
    const [uploadYear, setUploadYear] = useState('');
    const [uploadSemester, setUploadSemester] = useState('');
    const [uploadSubject, setUploadSubject] = useState('');
    const [isUploading, setIsUploading] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const [focusSubject, setFocusSubject] = useState<string | null>(null);
    const [libraryTab, setLibraryTab] = useState<'important_questions' | 'materials' | 'blueprints'>('important_questions');

    const fetchCatalog = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            // 1. Fetch Local Catalog (Backend File System)
            let builtCatalog: NotesCatalog = { regulations: [] };
            try {
                const controller = new AbortController();
                const timeoutId = setTimeout(() => controller.abort(), 2000);
                const localResponse = await fetch(`${API_BASE_URL}/notes/catalog`, { signal: controller.signal });
                clearTimeout(timeoutId);
                if (localResponse.ok) {
                    builtCatalog = await localResponse.json();
                }
            } catch (err) {
                console.warn("Could not fetch local notes catalog, falling back to bundled dataset", err);
            }

            // Fallback to static bundled catalog if local catalog is empty
            if (!builtCatalog.regulations || builtCatalog.regulations.length === 0) {
                builtCatalog = JSON.parse(JSON.stringify(FALLBACK_NOTES_CATALOG)) as NotesCatalog;
            }

            // 2. Fetch approved community notes from Supabase only if configured
            let notes: ContributedNote[] = [];
            if (isSupabaseConfigured) {
                try {
                    const timeoutPromise = new Promise<{ data: null; error: Error }>((_, reject) =>
                        setTimeout(() => reject(new Error('Supabase timeout')), 2500)
                    );
                    const supabasePromise = supabase
                        .from('notes')
                        .select('*')
                        .eq('status', 'approved')
                        .order('created_at', { ascending: false });

                    const result = await Promise.race([supabasePromise, timeoutPromise]);
                    const { data, error: dbError } = (result || {}) as { data: ContributedNote[] | null; error: Error | null };
                    if (dbError) throw dbError;
                    if (data) notes = data as ContributedNote[];
                } catch (err) {
                    console.warn("Supabase fetch failed or timed out", err);
                }
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

                notes.forEach((note: ContributedNote) => {
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
        } catch (e) {
            console.error("Fetch catalog error:", e);
            setCatalog(JSON.parse(JSON.stringify(FALLBACK_NOTES_CATALOG)) as NotesCatalog);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { fetchCatalog(); }, [fetchCatalog]);

    useEffect(() => {
        try {
            const focus = sessionStorage.getItem('notesFocusSubject');
            if (focus) {
                setFocusSubject(focus);
                setSearchQuery(focus);
                sessionStorage.removeItem('notesFocusSubject');
            }
        } catch { /* ignore */ }
    }, []);

    const matchingNotes = useMemo(() => {
        if (!catalog || !searchQuery.trim()) return [];
        const q = searchQuery.toLowerCase().trim();
        const results: { file: NoteFile; breadcrumb: string; subject: string }[] = [];
        catalog.regulations.forEach(reg => {
            if (reg.files) {
                reg.files.forEach(f => {
                    if (f.name.toLowerCase().includes(q) || (f.filename && f.filename.toLowerCase().includes(q))) {
                        results.push({ file: f, breadcrumb: reg.name, subject: reg.name });
                    }
                });
            }
            if (reg.years) {
                reg.years.forEach(yr => {
                    yr.semesters.forEach(sem => {
                        sem.subjects.forEach(sub => {
                            const matchSubject = sub.name.toLowerCase().includes(q);
                            sub.files.forEach(f => {
                                if (matchSubject || f.name.toLowerCase().includes(q)) {
                                    results.push({
                                        file: f,
                                        breadcrumb: `${reg.name} · ${yr.name} · ${sem.name}`,
                                        subject: sub.name,
                                    });
                                }
                            });
                        });
                    });
                });
            }
        });
        return results;
    }, [catalog, searchQuery]);

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
        } catch (e) {
            console.error("Upload error:", e);
            const err = e as { message?: string } | null;
            if (err?.message === 'Failed to fetch' || String(e).includes('fetch')) {
                 toast.error('Database connection failed. Please add a valid VITE_SUPABASE_URL to your .env file.', { duration: 6000 });
            } else {
                 toast.error(err?.message || 'Upload failed');
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
            <div className="bg-bg-card border border-rose-200 bg-rose-50/50 rounded-xl p-6 text-center max-w-lg mx-auto shadow-sm">
                <AlertTriangle className="w-8 h-8 text-rose-600 mx-auto mb-3" />
                <p className="text-text-primary font-semibold mb-1">Failed to Load Notes Catalog</p>
                <p className="text-xs text-text-muted mb-4">{error}</p>
                <button onClick={fetchCatalog} className="btn-primary text-xs">
                    Retry Connection
                </button>
            </div>
        );
    }

    return (
        <div className="space-y-6 select-none">
            {/* Header */}
            <SectionHeader
                icon={BookOpen}
                title="Study Library"
                subtitle="Curated syllabus notes, unit question banks, and verified lecture materials"
            />

            {/* View Switcher Tabs */}
            <div className="flex items-center gap-2 border-b border-border pb-3 overflow-x-auto">
                <button
                    type="button"
                    onClick={() => setLibraryTab('important_questions')}
                    className={`px-3.5 py-1.5 rounded-lg text-xs font-medium transition-colors cursor-pointer inline-flex items-center gap-2 shrink-0 ${
                        libraryTab === 'important_questions'
                            ? 'bg-amber-50 border border-amber-300 text-amber-800 font-bold shadow-xs'
                            : 'text-text-muted hover:text-text-primary'
                    }`}
                >
                    <Flame className="w-3.5 h-3.5 text-amber-600 animate-pulse" />
                    <span>Time-to-Time Imp Questions</span>
                    <span className="px-1.5 py-0.2 rounded text-[10px] bg-amber-100 text-amber-800 font-mono font-bold">Live Drop</span>
                </button>
                <button
                    type="button"
                    onClick={() => setLibraryTab('materials')}
                    className={`px-3.5 py-1.5 rounded-lg text-xs font-medium transition-colors cursor-pointer inline-flex items-center gap-2 shrink-0 ${
                        libraryTab === 'materials'
                            ? 'bg-accent/10 border border-accent/30 text-accent font-semibold'
                            : 'text-text-muted hover:text-text-primary'
                    }`}
                >
                    <BookOpen className="w-3.5 h-3.5" />
                    <span>Lecture Notes & Memos</span>
                    <span className="px-1.5 py-0.2 rounded text-[10px] bg-accent/20 text-accent font-mono">174 Notes</span>
                </button>
                <button
                    type="button"
                    onClick={() => setLibraryTab('blueprints')}
                    className={`px-3.5 py-1.5 rounded-lg text-xs font-medium transition-colors cursor-pointer inline-flex items-center gap-2 shrink-0 ${
                        libraryTab === 'blueprints'
                            ? 'bg-accent/10 border border-accent/30 text-accent font-semibold'
                            : 'text-text-muted hover:text-text-primary'
                    }`}
                >
                    <Layers className="w-3.5 h-3.5" />
                    <span>Exam Blueprints & PYQs</span>
                    <span className="px-1.5 py-0.2 rounded text-[10px] bg-accent/20 text-accent font-mono">12 Packs</span>
                </button>
            </div>

            {libraryTab === 'important_questions' ? (
                <ImportantQuestionsHub onOpenNote={(path, name) => handleDownload(path, name)} />
            ) : libraryTab === 'blueprints' ? (
                <ExamBlueprintsHub />
            ) : (
                <>
                    {/* Instant Search Bar */}
                    <div className="relative">
                <Search className="w-4 h-4 text-text-muted absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search by subject code or unit name (e.g. M1, BEE, DBMS, OS, Data Structures)..."
                    className="w-full pl-10 pr-10 py-2.5 rounded-lg bg-surface-card border border-border text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:border-accent"
                />
                {searchQuery && (
                    <button
                        type="button"
                        onClick={() => setSearchQuery('')}
                        className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-text-muted hover:text-text-primary rounded cursor-pointer"
                        aria-label="Clear search"
                    >
                        <X className="w-4 h-4" />
                    </button>
                )}
            </div>

            {focusSubject && (
                <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center gap-3">
                    <div className="flex-1 min-w-0">
                        <p className="text-xs font-bold text-amber-800 uppercase tracking-wider">Backlog focus</p>
                        <p className="text-sm text-text-primary font-semibold truncate">{focusSubject}</p>
                        <p className="text-xs text-text-muted mt-1">Browse notes below, or search PYQs for this subject.</p>
                    </div>
                    <div className="flex gap-2 shrink-0">
                        <button
                            type="button"
                            className="btn-secondary text-xs py-2 px-3"
                            onClick={() => {
                                const q = encodeURIComponent(`JNTUH ${focusSubject} previous year question paper PYQ PDF`);
                                window.open(`https://www.google.com/search?q=${q}`, '_blank', 'noopener,noreferrer');
                            }}
                        >
                            Find PYQs
                        </button>
                        <button
                            type="button"
                            className="btn-secondary text-xs py-2 px-3"
                            onClick={() => setFocusSubject(null)}
                        >
                            Dismiss
                        </button>
                    </div>
                </div>
            )}

            {/* Contribute Notes Section */}
            <div className="card border border-border overflow-hidden">
                <button
                    onClick={() => setShowContribute(!showContribute)}
                    className="w-full flex items-center gap-3.5 p-4 hover:bg-surface-subtle transition-colors text-left cursor-pointer"
                >
                    <div className="w-8 h-8 rounded-md bg-emerald-50 border border-emerald-200 flex items-center justify-center shrink-0">
                        <Plus className="w-4 h-4 text-emerald-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                        <h3 className="text-sm font-semibold text-text-primary">Contribute Study Material</h3>
                        <p className="text-xs text-text-muted mt-0.5">
                            Upload verified lecture notes, laboratory manuals, or syllabus guides
                        </p>
                    </div>
                    {showContribute
                        ? <ChevronDown className="w-4 h-4 text-text-muted shrink-0" />
                        : <ChevronRight className="w-4 h-4 text-text-muted shrink-0" />
                    }
                </button>

                <AnimatePresence>
                    {showContribute && (
                        <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: 'auto', opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            transition={{ duration: 0.2 }}
                            className="border-t border-border"
                        >
                            <div className="p-6 space-y-5">
                                {/* Row 1: Regulation + Subject */}
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    <div>
                                        <label className="text-[10px] font-bold text-emerald-800 uppercase tracking-[0.15em] mb-2 block">
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
                                            <option value="R25">R25</option>
                                        </select>
                                    </div>
                                    <div>
                                        <label className="text-[10px] font-bold text-emerald-800 uppercase tracking-[0.15em] mb-2 block">
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
                                        <label className="text-[10px] font-bold text-emerald-800 uppercase tracking-[0.15em] mb-2 block">
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
                                        <label className="text-[10px] font-bold text-emerald-800 uppercase tracking-[0.15em] mb-2 block">
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
                                    <label className="text-[10px] font-bold text-emerald-800 uppercase tracking-[0.15em] mb-2 block">
                                        PDF File *
                                    </label>
                                    <div
                                        className={`relative border-2 border-dashed rounded-2xl p-6 text-center transition-all cursor-pointer
                                            ${uploadFile
                                                ? 'border-emerald-500/40 bg-emerald-50'
                                                : 'border-border hover:border-emerald-500/40 hover:bg-surface-subtle'
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
                                                <CheckCircle className="w-5 h-5 text-emerald-600" />
                                                <span className="text-sm font-medium text-text-primary">{uploadFile.name}</span>
                                                <span className="text-xs text-text-muted">({formatFileSize(uploadFile.size)})</span>
                                                <button
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        setUploadFile(null);
                                                        if (fileInputRef.current) fileInputRef.current.value = '';
                                                    }}
                                                    className="p-1 hover:bg-surface-subtle rounded-lg transition-colors cursor-pointer"
                                                >
                                                    <X className="w-4 h-4 text-text-muted hover:text-red-500" />
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

                                <p className="text-xs text-emerald-800 text-center font-medium">
                                    📝 Uploaded notes go to an admin queue and will instantly appear here once approved.
                                </p>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>

            {/* Search Results Mode */}
            {searchQuery.trim() ? (
                <div className="space-y-3">
                    <div className="flex items-center justify-between text-xs text-text-muted px-1">
                        <span>Found {matchingNotes.length} matching unit(s) for &ldquo;{searchQuery}&rdquo;</span>
                        <button
                            type="button"
                            onClick={() => setSearchQuery('')}
                            className="text-accent hover:underline cursor-pointer"
                        >
                            View All Folders
                        </button>
                    </div>
                    {matchingNotes.length === 0 ? (
                        <div className="bg-surface-card border border-border rounded-lg p-8 text-center">
                            <BookOpen className="w-8 h-8 text-text-muted mx-auto mb-2" />
                            <p className="text-text-primary font-medium text-sm">No notes found for &ldquo;{searchQuery}&rdquo;</p>
                            <p className="text-xs text-text-muted mt-1">Try searching by subject acronym (e.g. M1, BEE, CN, DBMS) or clear the search to browse all folders.</p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                            {matchingNotes.map(({ file, breadcrumb, subject }) => (
                                <button
                                    key={file.path}
                                    onClick={() => handleDownload(file.path, file.filename || file.name)}
                                    className="flex items-center gap-3 p-3.5 rounded-lg bg-surface-card hover:bg-surface-subtle border border-border hover:border-accent/40 transition-colors text-left group cursor-pointer"
                                >
                                    <FileText className="w-4 h-4 text-accent shrink-0" />
                                    <div className="flex-1 min-w-0">
                                        <p className="text-xs font-semibold text-text-primary truncate group-hover:text-accent transition-colors">
                                            {file.name}
                                        </p>
                                        <p className="text-[11px] text-text-muted truncate mt-0.5">
                                            {breadcrumb} · <span className="text-accent/80 font-medium">{subject}</span>
                                        </p>
                                        <p className="text-[10px] text-text-muted font-mono mt-0.5">{formatFileSize(file.size)}</p>
                                    </div>
                                    <Download className="w-4 h-4 text-text-muted group-hover:text-accent shrink-0 transition-colors" />
                                </button>
                            ))}
                        </div>
                    )}
                </div>
            ) : (!catalog || catalog.regulations.length === 0) ? (
                <div className="bg-surface-card border border-border rounded-lg p-8 text-center shadow-sm">
                    <BookOpen className="w-8 h-8 text-text-muted mx-auto mb-3" />
                    <p className="text-text-primary font-semibold mb-1">No Study Materials Indexed</p>
                    <p className="text-xs text-text-muted">No syllabus or lecture notes cataloged yet. Submit materials above to seed this repository.</p>
                </div>
            ) : (
                catalog.regulations.map((reg) => (
                    <div
                        key={reg.name}
                        className="bg-bg-card border border-border rounded-xl overflow-hidden shadow-sm"
                    >
                        {/* Regulation Header */}
                        <button
                            onClick={() => toggleExpand(reg.path)}
                            className="w-full flex items-center gap-4 p-5 hover:bg-surface-subtle transition-colors"
                        >
                            <div className="w-10 h-10 flex-shrink-0 rounded-lg bg-surface-subtle border border-border flex items-center justify-center text-text-primary">
                                {reg.name === 'Contributed Notes' ? (
                                    <Users className="w-4 h-4 text-accent" />
                                ) : (
                                    <span className="font-mono font-bold text-xs text-accent">{reg.name}</span>
                                )}
                            </div>
                            <div className="flex-1 min-w-0 text-left">
                                <h2 className="text-base font-semibold text-text-primary truncate">
                                    {reg.name === 'Contributed Notes' ? reg.name : `${reg.name} Academic Materials`}
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
                                                    className="flex items-center gap-3 p-3.5 bg-surface-subtle hover:bg-surface-hover border border-border hover:border-accent/40 rounded-lg transition-colors group cursor-pointer"
                                                >
                                                    <FileText className="w-4 h-4 text-accent flex-shrink-0" />
                                                    <div className="flex-1 text-left min-w-0">
                                                        <p className="text-sm font-medium text-text-primary truncate">{file.name}</p>
                                                        <p className="text-[10px] text-text-muted font-mono">{formatFileSize(file.size)}</p>
                                                    </div>
                                                    <Download className="w-4 h-4 text-text-muted group-hover:text-accent transition-colors flex-shrink-0" />
                                                </button>
                                            ))}
                                        </div>
                                    )}

                                    {/* R18 hierarchical structure */}
                                    {reg.years && reg.years.map((year) => (
                                        <div key={year.path}>
                                            <button
                                                onClick={() => toggleExpand(year.path)}
                                                className="w-full flex items-center gap-3 px-6 py-3 hover:bg-surface-subtle transition-colors border-b border-border text-left cursor-pointer"
                                            >
                                                <Folder className="w-4 h-4 text-amber-500" />
                                                <span className="font-semibold text-text-primary text-sm">{year.name}</span>
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
                                                            className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-surface-subtle transition-colors text-left cursor-pointer"
                                                        >
                                                            <Folder className="w-4 h-4 text-accent" />
                                                            <span className="font-medium text-text-primary text-sm">{sem.name}</span>
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
                                                                            <div className="flex items-center justify-between px-4 py-1.5">
                                                                                <p className="text-xs font-bold text-text-muted uppercase tracking-wider">
                                                                                    {subject.name}
                                                                                </p>
                                                                                <button
                                                                                    type="button"
                                                                                    onClick={() => {
                                                                                        sessionStorage.setItem('notesFocusSubject', subject.name);
                                                                                        setLibraryTab('important_questions');
                                                                                    }}
                                                                                    className="text-[11px] font-mono text-amber-700 hover:text-amber-800 transition-colors inline-flex items-center gap-1 cursor-pointer font-semibold"
                                                                                    title="View time-to-time important questions for this course"
                                                                                >
                                                                                    <Flame className="w-3 h-3 text-amber-600" />
                                                                                    <span>Imp Questions</span>
                                                                                </button>
                                                                            </div>
                                                                            <div className="space-y-1">
                                                                                {subject.files.map((file) => (
                                                                                    <button
                                                                                        key={file.path}
                                                                                        onClick={() => handleDownload(file.path, file.name)}
                                                                                        className="w-full flex items-center gap-3 px-3.5 py-2 hover:bg-surface-subtle rounded-md transition-colors group cursor-pointer"
                                                                                    >
                                                                                        <FileText className="w-4 h-4 text-accent flex-shrink-0" />
                                                                                        <span className="text-sm text-text-primary truncate flex-1 text-left">{file.name}</span>
                                                                                        <span className="text-[10px] text-text-muted font-mono">{formatFileSize(file.size)}</span>
                                                                                        <Download className="w-3.5 h-3.5 text-text-muted group-hover:text-accent transition-colors flex-shrink-0" />
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
                    </div>
                )))}
                </>
            )}

            {/* Privacy Notice */}
            <div className="text-center text-xs text-text-muted py-2">
                📚 All notes are securely hosted in the cloud and vetted by admins.
            </div>
        </div>
    );
}

