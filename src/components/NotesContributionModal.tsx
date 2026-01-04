import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Upload, Check, Loader2 } from 'lucide-react';
import { toast } from 'react-hot-toast';

interface NotesContributionModalProps {
    isOpen: boolean;
    onClose: () => void;
}

const API_BASE = '';

export default function NotesContributionModal({ isOpen, onClose }: NotesContributionModalProps) {
    const [loading, setLoading] = useState(false);
    const [formData, setFormData] = useState<{
        regulation: string;
        year: string;
        semester: string;
        subject: string;
        file: File | null;
    }>({
        regulation: '',
        year: '1st Year',
        semester: '1st Sem',
        subject: '',
        file: null
    });

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!formData.file || !formData.subject || !formData.regulation.trim()) {
            toast.error('Please fill all fields');
            return;
        }

        setLoading(true);
        const data = new FormData();
        data.append('file', formData.file);
        data.append('regulation', formData.regulation.trim().toUpperCase());
        data.append('year', formData.year);
        data.append('semester', formData.semester);
        data.append('subject', formData.subject);

        try {
            const response = await fetch(`${API_BASE}/notes/upload`, {
                method: 'POST',
                body: data
            });

            if (!response.ok) throw new Error('Upload failed');

            toast.success('Notes submitted successfully! Waiting for approval.');
            onClose();
            // Reset form
            setFormData({
                regulation: '',
                year: '1st Year',
                semester: '1st Sem',
                subject: '',
                file: null
            });
        } catch (error) {
            console.error(error);
            toast.error('Failed to upload notes');
        } finally {
            setLoading(false);
        }
    };

    return (
        <AnimatePresence>
            {isOpen && (
                <>
                    {/* Backdrop */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={onClose}
                        className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50"
                    />

                    {/* Modal */}
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95, y: 20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95, y: 20 }}
                        className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none"
                    >
                        <div className="bg-[#111] border border-white/10 rounded-2xl w-full max-w-md pointer-events-auto shadow-2xl overflow-hidden">
                            {/* Header */}
                            <div className="p-4 border-b border-white/5 flex items-center justify-between bg-white/5">
                                <h2 className="text-lg font-bold text-white flex items-center gap-2">
                                    <Upload className="w-5 h-5 text-green-400" />
                                    Contribute Notes
                                </h2>
                                <button
                                    onClick={onClose}
                                    className="p-1 hover:bg-white/10 rounded-lg transition-colors text-text-muted hover:text-white"
                                >
                                    <X className="w-5 h-5" />
                                </button>
                            </div>

                            {/* Form */}
                            <form onSubmit={handleSubmit} className="p-6 space-y-4">
                                {/* Regulation */}
                                <div>
                                    <label className="block text-xs font-medium text-text-muted uppercase tracking-wider mb-1.5">Regulation</label>
                                    <input
                                        type="text"
                                        value={formData.regulation}
                                        onChange={e => setFormData(prev => ({ ...prev, regulation: e.target.value }))}
                                        placeholder="e.g. R18, R22, R23"
                                        className="w-full bg-black/40 border border-white/10 rounded-xl px-3 py-2 text-sm text-white placeholder:text-white/20 focus:border-green-500/50 focus:outline-none transition-colors"
                                    />
                                </div>

                                {/* Year & Semester (Optional) */}
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-xs font-medium text-text-muted uppercase tracking-wider mb-1.5">Year</label>
                                        <select
                                            value={formData.year}
                                            onChange={e => setFormData(prev => ({ ...prev, year: e.target.value }))}
                                            className="w-full bg-black/40 border border-white/10 rounded-xl px-3 py-2 text-sm text-white focus:border-green-500/50 focus:outline-none transition-colors"
                                        >
                                            {['1st Year', '2nd Year', '3rd Year', '4th Year'].map(y => (
                                                <option key={y} value={y}>{y}</option>
                                            ))}
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-xs font-medium text-text-muted uppercase tracking-wider mb-1.5">Semester</label>
                                        <select
                                            value={formData.semester}
                                            onChange={e => setFormData(prev => ({ ...prev, semester: e.target.value }))}
                                            className="w-full bg-black/40 border border-white/10 rounded-xl px-3 py-2 text-sm text-white focus:border-green-500/50 focus:outline-none transition-colors"
                                        >
                                            {['1st Sem', '2nd Sem'].map(s => (
                                                <option key={s} value={s}>{s}</option>
                                            ))}
                                        </select>
                                    </div>
                                </div>

                                {/* Subject Name */}
                                <div>
                                    <label className="block text-xs font-medium text-text-muted uppercase tracking-wider mb-1.5">Subject Name</label>
                                    <input
                                        type="text"
                                        value={formData.subject}
                                        onChange={e => setFormData(prev => ({ ...prev, subject: e.target.value }))}
                                        placeholder="e.g. Data Structures"
                                        className="w-full bg-black/40 border border-white/10 rounded-xl px-3 py-2 text-sm text-white placeholder:text-white/20 focus:border-green-500/50 focus:outline-none transition-colors"
                                    />
                                </div>

                                {/* File Upload */}
                                <div>
                                    <label className="block text-xs font-medium text-text-muted uppercase tracking-wider mb-1.5">PDF File</label>
                                    <div className="relative">
                                        <input
                                            type="file"
                                            accept=".pdf"
                                            onChange={e => setFormData(prev => ({ ...prev, file: e.target.files?.[0] || null }))}
                                            className="hidden"
                                            id="note-upload"
                                        />
                                        <label
                                            htmlFor="note-upload"
                                            className={`w-full flex items-center justify-center gap-2 py-8 border-2 border-dashed rounded-xl cursor-pointer transition-colors ${formData.file
                                                ? 'border-green-500/30 bg-green-500/5'
                                                : 'border-white/10 hover:border-white/20 hover:bg-white/5'
                                                }`}
                                        >
                                            {formData.file ? (
                                                <div className="text-center">
                                                    <Check className="w-8 h-8 text-green-400 mx-auto mb-2" />
                                                    <p className="text-sm font-medium text-green-400">{formData.file.name}</p>
                                                    <p className="text-xs text-text-muted mt-1">{(formData.file.size / 1024 / 1024).toFixed(2)} MB</p>
                                                </div>
                                            ) : (
                                                <div className="text-center text-text-muted">
                                                    <Upload className="w-8 h-8 mx-auto mb-2 opacity-50" />
                                                    <p className="text-sm">Click to browse</p>
                                                    <p className="text-xs opacity-50 mt-1">PDF files only</p>
                                                </div>
                                            )}
                                        </label>
                                    </div>
                                </div>

                                {/* Submit Button */}
                                <button
                                    type="submit"
                                    disabled={loading}
                                    className="w-full mt-4 bg-green-500 hover:bg-green-600 disabled:opacity-50 disabled:cursor-not-allowed text-black font-bold py-3 rounded-xl flex items-center justify-center gap-2 transition-colors"
                                >
                                    {loading ? (
                                        <>
                                            <Loader2 className="w-5 h-5 animate-spin" />
                                            Uploading...
                                        </>
                                    ) : (
                                        <>
                                            <Upload className="w-5 h-5" />
                                            Submit Notes
                                        </>
                                    )}
                                </button>
                            </form>
                        </div>
                    </motion.div>
                </>
            )}
        </AnimatePresence>
    );
}
