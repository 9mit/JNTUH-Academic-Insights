import { useState } from 'react';
import { useAcademic } from '../context/AcademicContext';
import { exportToExcel, generateShareableUrl, copyToClipboard } from '../utils/exportUtils';
import { downloadCgpaCard, renderCgpaCard, shareCgpaCard } from '../utils/cgpaCard';
import { Download, Check, Link, Image as ImageIcon, Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';

export default function ActionButtons() {
    const { data, getCGPA } = useAcademic();
    const { cgpa, percentage } = getCGPA();
    const [copied, setCopied] = useState(false);
    const [cardBusy, setCardBusy] = useState(false);

    const handleExport = () => {
        try {
            exportToExcel({
                semesters: data.semesters,
                studentName: data.studentName,
                hallTicket: data.hallTicket,
                regulation: data.regulation,
            });
            toast.success('Excel file downloaded!');
        } catch {
            toast.error('Failed to export. Please try again.');
        }
    };

    const handleShare = async () => {
        try {
            const url = await generateShareableUrl({
                semesters: data.semesters,
                studentName: data.studentName,
                hallTicket: data.hallTicket,
                regulation: data.regulation,
            });

            await copyToClipboard(url);
            setCopied(true);
            toast.success('Link copied to clipboard!');

            setTimeout(() => setCopied(false), 3000);
        } catch {
            toast.error('Failed to generate link.');
        }
    };

    const handleCgpaCard = async () => {
        if (cgpa <= 0) {
            toast.error('Import results before sharing a CGPA card');
            return;
        }
        setCardBusy(true);
        try {
            const blob = await renderCgpaCard({
                data,
                cgpa,
                percentage,
                includeName: true,
            });
            const shared = await shareCgpaCard(blob, 'JNTUH CGPA Card');
            if (!shared) {
                await downloadCgpaCard(blob);
                toast.success('CGPA card downloaded — share it on WhatsApp');
            } else {
                toast.success('Shared!');
            }
        } catch {
            toast.error('Could not create CGPA card');
        } finally {
            setCardBusy(false);
        }
    };

    return (
        <div className="flex flex-wrap items-center gap-3">
            <button
                onClick={handleExport}
                className="flex items-center gap-2 px-4 py-2.5 bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/20 rounded-xl text-emerald-400 font-medium text-sm transition-all"
            >
                <Download className="w-4 h-4" />
                Export Excel
            </button>

            <button
                onClick={handleShare}
                className={`flex items-center gap-2 px-4 py-2.5 border rounded-xl font-medium text-sm transition-all ${copied
                    ? 'bg-primary/20 border-primary/30 text-primary'
                    : 'bg-primary/10 hover:bg-primary/20 border-primary/20 text-primary'
                    }`}
            >
                {copied ? (
                    <>
                        <Check className="w-4 h-4" />
                        Copied!
                    </>
                ) : (
                    <>
                        <Link className="w-4 h-4" />
                        Share Link
                    </>
                )}
            </button>

            <button
                onClick={handleCgpaCard}
                disabled={cardBusy}
                className="flex items-center gap-2 px-4 py-2.5 bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/20 rounded-xl text-amber-300 font-medium text-sm transition-all disabled:opacity-50"
            >
                {cardBusy ? <Loader2 className="w-4 h-4 animate-spin" /> : <ImageIcon className="w-4 h-4" />}
                CGPA Card
            </button>
        </div>
    );
}
