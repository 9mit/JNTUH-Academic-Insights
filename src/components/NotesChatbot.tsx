import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Bot, User, Download, FolderOpen, ChevronRight, FileText, Loader2, BookOpen, ExternalLink, Cloud, Upload } from 'lucide-react';
import NotesContributionModal from './NotesContributionModal';

interface NoteFile {
    name: string;
    filename?: string;
    path: string;
    size: number;
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
    files?: NoteFile[];  // For R22 flat structure
}

interface Catalog {
    regulations: Regulation[];
}

interface Message {
    id: string;
    type: 'bot' | 'user';
    content: string;
    options?: { label: string; value: string; icon?: React.ElementType; isExternal?: boolean }[];
}

// Google Drive Links for R18 CSE Notes
const R18_DRIVE_LINKS = {
    syllabus: 'https://drive.google.com/file/d/188F-l8orPcpu6sgHxTyBvypZqhdwrbaL/view?usp=sharing',
    semesters: [
        {
            name: '1-1 Semester',
            subjects: ['M1', 'BEE', 'Chemistry'],
            link: 'https://drive.google.com/drive/folders/1zU9_GWKuQxGQqXp9cqKUegTjiBz2fS64?usp=sharing'
        },
        {
            name: '1-2 Semester',
            subjects: ['M2', 'AP', 'PPS'],
            link: 'https://drive.google.com/drive/folders/1oujlrfTUelrVb4uh7l6k3eVYCPxnMR7t?usp=sharing'
        },
        {
            name: '2-1 Semester',
            subjects: ['ADE', 'DS', 'COSM', 'COA', 'OOP using C++'],
            link: 'https://drive.google.com/drive/folders/1OLf4sTaAhtLTjI1h4KUoBlD7Rhn0Zlcg?usp=sharing'
        },
        {
            name: '2-2 Semester',
            subjects: ['DM', 'BEFA', 'OS', 'DBMS', 'JAVA'],
            link: 'https://drive.google.com/drive/folders/1whrScn72q5u0sY3aYRwlvUZJGYe4olHE?usp=sharing'
        },
        {
            name: '3-1 Semester',
            subjects: ['FLAT', 'SE', 'CN', 'WT', 'DA', 'PPL', 'IRS'],
            link: 'https://drive.google.com/drive/folders/1svi6vsbdO4rfzedTEthr7F1dUI30QhAq?usp=sharing'
        },
        {
            name: '3-2 Semester',
            subjects: ['ML', 'CD', 'DAA', 'SL', 'STM'],
            link: 'https://drive.google.com/drive/folders/1p4DBODHlkx181WWa69spzjRdzQQdjCMj?usp=sharing'
        },
        {
            name: '4-1 Semester',
            subjects: ['CNS', 'DM', 'CC', 'AA', 'UEE', 'SPPM'],
            link: 'https://drive.google.com/drive/folders/1lSQslt4cly-Sk-RqH4qRC0B3qt_lFEpV?usp=sharing'
        },
        {
            name: '4-2 Semester',
            subjects: ['CF', 'MI'],
            link: 'https://drive.google.com/drive/folders/1snNj3WLXKDYeBBeb9LfRA8rRAIqN5Pqu?usp=sharing'
        }
    ]
};

const API_BASE = '';

export default function NotesChatbot() {
    const [catalog, setCatalog] = useState<Catalog | null>(null);
    const [loading, setLoading] = useState(true);
    const [messages, setMessages] = useState<Message[]>([]);
    const [selection, setSelection] = useState<{
        regulation: string | null;
        year: string | null;
        semester: string | null;
        subject: string | null;
    }>({ regulation: null, year: null, semester: null, subject: null });
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const [isContributeOpen, setIsContributeOpen] = useState(false);

    // Scroll to bottom when messages change
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    // Fetch catalog on mount
    useEffect(() => {
        fetchCatalog();
    }, []);

    const fetchCatalog = async () => {
        setLoading(true);
        try {
            const response = await fetch(`${API_BASE}/notes/catalog`);
            const data = await response.json();
            setCatalog(data);

            // Start conversation
            if (data.regulations && data.regulations.length > 0) {
                setMessages([{
                    id: '1',
                    type: 'bot',
                    content: `📚 Welcome to JNTUH Notes Hub! I have notes for ${data.regulations.length} regulation(s). Which one would you like to explore?`,
                    options: data.regulations.map((r: Regulation) => ({
                        label: `${r.name} Regulation`,
                        value: r.name,
                        icon: FolderOpen
                    }))
                }]);
            } else {
                setMessages([{
                    id: '1',
                    type: 'bot',
                    content: '❌ No notes found. Please make sure the notes folders are placed in the project directory.'
                }]);
            }
        } catch {
            setMessages([{
                id: '1',
                type: 'bot',
                content: '❌ Failed to load notes catalog. Please make sure the server is running.'
            }]);
        } finally {
            setLoading(false);
        }
    };

    const addMessage = (message: Omit<Message, 'id'>) => {
        setMessages(prev => [...prev, { ...message, id: Date.now().toString() }]);
    };

    const handleSelection = (value: string, type: 'regulation' | 'year' | 'semester' | 'subject' | 'driveOption') => {
        // Add user response
        addMessage({ type: 'user', content: value });

        if (!catalog) return;

        if (type === 'regulation') {
            setSelection({ regulation: value, year: null, semester: null, subject: null });
            const reg = catalog.regulations.find(r => r.name === value);

            if (reg?.files) {
                // R22 flat structure - show files directly
                setTimeout(() => {
                    addMessage({
                        type: 'bot',
                        content: `📂 ${value} has ${reg.files!.length} subject notes available. Click to download:`,
                        options: reg.files!.map(f => ({
                            label: f.name,
                            value: f.path,
                            icon: FileText
                        }))
                    });
                }, 300);
            } else if (reg?.years) {
                // R18 hierarchical structure - show options for Local or Drive
                setTimeout(() => {
                    addMessage({
                        type: 'bot',
                        content: `📂 Great choice! ${value} notes are available in two ways:`,
                        options: [
                            { label: '📁 Local Files (Downloaded)', value: 'local', icon: FolderOpen },
                            { label: '☁️ Google Drive (Online)', value: 'drive', icon: Cloud, isExternal: true }
                        ]
                    });
                }, 300);
            }
        } else if (type === 'driveOption') {
            if (value === 'local') {
                // Show local years
                const reg = catalog.regulations.find(r => r.name === selection.regulation);
                if (reg?.years) {
                    setTimeout(() => {
                        addMessage({
                            type: 'bot',
                            content: `📂 Select your year:`,
                            options: reg.years!.map(y => ({
                                label: y.name,
                                value: y.name,
                                icon: FolderOpen
                            }))
                        });
                    }, 300);
                }
            } else if (value === 'drive') {
                // Show R18 Drive semester links
                setTimeout(() => {
                    const driveOptions = [
                        { label: '📄 View Syllabus', value: R18_DRIVE_LINKS.syllabus, icon: FileText, isExternal: true },
                        ...R18_DRIVE_LINKS.semesters.map(sem => ({
                            label: `${sem.name} (${sem.subjects.join(', ')})`,
                            value: sem.link,
                            icon: ExternalLink,
                            isExternal: true
                        }))
                    ];
                    addMessage({
                        type: 'bot',
                        content: `☁️ Here are all R18 CSE notes on Google Drive. Click to open:`,
                        options: driveOptions
                    });
                }, 300);
            }
        } else if (type === 'year') {
            setSelection(prev => ({ ...prev, year: value, semester: null, subject: null }));
            const reg = catalog.regulations.find(r => r.name === selection.regulation);
            const year = reg?.years?.find(y => y.name === value);

            if (year?.semesters) {
                setTimeout(() => {
                    addMessage({
                        type: 'bot',
                        content: `📅 ${value} has ${year.semesters.length} semester(s). Choose one:`,
                        options: year.semesters.map(s => ({
                            label: s.name,
                            value: s.name,
                            icon: FolderOpen
                        }))
                    });
                }, 300);
            }
        } else if (type === 'semester') {
            setSelection(prev => ({ ...prev, semester: value, subject: null }));
            const reg = catalog.regulations.find(r => r.name === selection.regulation);
            const year = reg?.years?.find(y => y.name === selection.year);
            const sem = year?.semesters?.find(s => s.name === value);

            if (sem?.subjects) {
                setTimeout(() => {
                    addMessage({
                        type: 'bot',
                        content: `📖 ${value} has ${sem.subjects.length} subjects. Pick one:`,
                        options: sem.subjects.map(s => ({
                            label: s.name,
                            value: s.name,
                            icon: BookOpen
                        }))
                    });
                }, 300);
            }
        } else if (type === 'subject') {
            setSelection(prev => ({ ...prev, subject: value }));
            const reg = catalog.regulations.find(r => r.name === selection.regulation);
            const year = reg?.years?.find(y => y.name === selection.year);
            const sem = year?.semesters?.find(s => s.name === selection.semester);
            const subject = sem?.subjects?.find(s => s.name === value);

            if (subject?.files) {
                setTimeout(() => {
                    addMessage({
                        type: 'bot',
                        content: `📄 ${value} has ${subject.files.length} file(s). Click to download:`,
                        options: subject.files.map(f => ({
                            label: f.name,
                            value: f.path,
                            icon: Download
                        }))
                    });
                }, 300);
            }
        }
    };

    const handleDownload = async (path: string, filename: string) => {
        addMessage({ type: 'user', content: `Download: ${filename}` });

        try {
            const response = await fetch(`${API_BASE}/notes/download?path=${encodeURIComponent(path)}`);
            if (!response.ok) throw new Error('Download failed');

            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = filename;
            document.body.appendChild(a);
            a.click();
            window.URL.revokeObjectURL(url);
            a.remove();

            addMessage({
                type: 'bot',
                content: `✅ Downloaded "${filename}" successfully! Need anything else?`
            });
        } catch {
            addMessage({
                type: 'bot',
                content: `❌ Failed to download "${filename}". Please try again.`
            });
        }
    };

    const handleOptionClick = (option: { label: string; value: string; icon?: React.ElementType; isExternal?: boolean }) => {
        // Check if this is an external link (Google Drive)
        if (option.isExternal || option.value.startsWith('https://')) {
            addMessage({ type: 'user', content: `Open: ${option.label}` });
            window.open(option.value, '_blank', 'noopener,noreferrer');
            setTimeout(() => {
                addMessage({
                    type: 'bot',
                    content: `✅ Opened "${option.label}" in a new tab! Need anything else?`
                });
            }, 300);
            return;
        }

        // Check if this is a local/drive choice
        if (option.value === 'local' || option.value === 'drive') {
            handleSelection(option.value, 'driveOption');
            return;
        }

        // Check if this is a download action (path contains .pdf or starts with R18/R22)
        if (option.value.includes('.pdf') || (option.value.startsWith('R') && option.value.includes('/'))) {
            const filename = option.value.split('/').pop() || option.label + '.pdf';
            handleDownload(option.value, filename);
            return;
        }

        // Detect type based on catalog data, not just current state
        if (!catalog) return;

        // Check if it's a regulation
        const isRegulation = catalog.regulations.some(r => r.name === option.value);
        if (isRegulation) {
            handleSelection(option.value, 'regulation');
            return;
        }

        // Check if it's a year (contains "year" in the name)
        if (option.value.toLowerCase().includes('year')) {
            handleSelection(option.value, 'year');
            return;
        }

        // Check if it's a semester (contains "sem" in the name)
        if (option.value.toLowerCase().includes('sem')) {
            handleSelection(option.value, 'semester');
            return;
        }

        // Otherwise, it's likely a subject
        handleSelection(option.value, 'subject');
    };

    const resetConversation = () => {
        setSelection({ regulation: null, year: null, semester: null, subject: null });
        if (catalog) {
            setMessages([{
                id: '1',
                type: 'bot',
                content: `📚 Let's start fresh! Which regulation would you like to explore?`,
                options: catalog.regulations.map((r: Regulation) => ({
                    label: `${r.name} Regulation`,
                    value: r.name,
                    icon: FolderOpen
                }))
            }]);
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-96">
                <Loader2 className="w-8 h-8 text-primary animate-spin" />
            </div>
        );
    }

    return (
        <div className="flex flex-col h-full relative">
            {/* Header */}
            <div className="p-4 border-b border-white/10 flex items-center justify-between bg-black/20 backdrop-blur-sm">
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-primary/10 rounded-lg">
                        <Bot className="w-5 h-5 text-primary" />
                    </div>
                    <div>
                        <h2 className="font-bold text-white">Notes Hub</h2>
                        <p className="text-xs text-text-muted">JNTUH Academic Resources</p>
                    </div>
                </div>
                <button
                    onClick={resetConversation}
                    className="text-xs px-3 py-1.5 bg-white/5 hover:bg-white/10 text-text-muted hover:text-white rounded-lg transition-colors border border-white/5"
                >
                    Start Over
                </button>
            </div>

            {/* Messages Area */}
            <div className="flex-1 overflow-y-auto p-4 space-y-6 scrollbar-thin scrollbar-thumb-white/10 scrollbar-track-transparent">
                <AnimatePresence mode="popLayout">
                    {messages.map((msg) => (
                        <motion.div
                            key={msg.id}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.95 }}
                            className={`flex gap-3 ${msg.type === 'user' ? 'flex-row-reverse' : ''}`}
                        >
                            <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${msg.type === 'bot' ? 'bg-primary/20 text-primary' : 'bg-white/10 text-white'
                                }`}>
                                {msg.type === 'bot' ? <Bot className="w-4 h-4" /> : <User className="w-4 h-4" />}
                            </div>

                            <div className={`max-w-[80%] space-y-3`}>
                                <div className={`p-3.5 rounded-2xl text-sm leading-relaxed ${msg.type === 'bot'
                                    ? 'bg-white/5 border border-white/10 text-gray-200 rounded-tl-none'
                                    : 'bg-primary/20 text-white border border-primary/20 rounded-tr-none'
                                    }`}>
                                    {msg.content}
                                </div>

                                {msg.options && (
                                    <div className="flex flex-wrap gap-2">
                                        {msg.options.map((opt) => (
                                            <button
                                                key={opt.value}
                                                onClick={() => handleOptionClick(opt)}
                                                className="flex items-center gap-2 px-4 py-2 bg-white/5 hover:bg-white/10 border border-white/5 hover:border-white/20 rounded-xl text-sm text-gray-300 transition-all hover:scale-[1.02] active:scale-[0.98]"
                                            >
                                                {opt.icon && <opt.icon className="w-3.5 h-3.5 opacity-70" />}
                                                {opt.label}
                                                {opt.isExternal && <ExternalLink className="w-3 h-3 opacity-50 ml-1" />}
                                            </button>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </motion.div>
                    ))}
                </AnimatePresence>
                <div ref={messagesEndRef} />
            </div>

            {/* Breadcrumb */}
            {selection.regulation && (
                <div className="mt-4 px-4 py-3 bg-white/5 rounded-xl flex items-center gap-2 text-sm text-text-muted">
                    <span className="text-primary font-medium">{selection.regulation}</span>
                    {selection.year && (
                        <>
                            <ChevronRight className="w-4 h-4" />
                            <span>{selection.year}</span>
                        </>
                    )}
                    {selection.semester && (
                        <>
                            <ChevronRight className="w-4 h-4" />
                            <span>{selection.semester}</span>
                        </>
                    )}
                    {selection.subject && (
                        <>
                            <ChevronRight className="w-4 h-4" />
                            <span className="text-white">{selection.subject}</span>
                        </>
                    )}
                </div>
            )}

            {/* Contribution Message */}
            <div className="mt-6 p-4 bg-gradient-to-r from-emerald-500/10 to-teal-500/10 rounded-2xl border border-emerald-500/20 text-center mx-4 mb-4">
                <p className="text-sm text-emerald-200 mb-3">
                    📢 <strong>Want to help more students?</strong> If you have notes for other regulations or branches,
                    please contribute them!
                </p>
                <button
                    onClick={() => setIsContributeOpen(true)}
                    className="inline-flex items-center gap-2 px-4 py-2.5 bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-500/30 rounded-xl text-emerald-300 text-sm font-medium transition-all hover:scale-105 active:scale-95 cursor-pointer shadow-lg shadow-emerald-900/20"
                >
                    <Upload className="w-4 h-4" />
                    Contribute Notes
                </button>
            </div>

            <NotesContributionModal
                isOpen={isContributeOpen}
                onClose={() => setIsContributeOpen(false)}
            />
        </div>
    );
}
