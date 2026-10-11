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
            toast.success('Official Excel transcript exported');
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
            toast.success('Share link copied to clipboard');

            setTimeout(() => setCopied(false), 3000);
        } catch {
            toast.error('Failed to generate link.');
        }
    };

    const handleCgpaCard = async () => {
        if (cgpa <= 0) {
            toast.error('Import results before generating academic credential card');
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
            const shared = await shareCgpaCard(blob, 'JNTUH Academic Credential');
            if (!shared) {
                await downloadCgpaCard(blob);
                toast.success('Academic credential card generated');
            } else {
                toast.success('Shared successfully');
            }
        } catch {
            toast.error('Could not generate credential card');
        } finally {
            setCardBusy(false);
        }
    };

    return (
        <div className="flex flex-wrap items-center gap-2">
            <button
                onClick={handleExport}
                className="btn-secondary text-xs py-1.5 px-3"
                title="Export semester marks into structured Excel spreadsheet"
            >
                <Download className="w-3.5 h-3.5" />
                Export Excel
            </button>

            <button
                onClick={handleShare}
                className={`btn-secondary text-xs py-1.5 px-3 ${copied ? 'border-accent-blue-border text-accent-blue-bright' : ''}`}
                title="Generate encrypted session share link"
            >
                {copied ? (
                    <>
                        <Check className="w-3.5 h-3.5 text-emerald-600" />
                        Copied
                    </>
                ) : (
                    <>
                        <Link className="w-3.5 h-3.5" />
                        Share Session
                    </>
                )}
            </button>

            <button
                onClick={handleCgpaCard}
                disabled={cardBusy}
                className="btn-secondary text-xs py-1.5 px-3 disabled:opacity-50"
                title="Render official academic standing card graphic"
            >
                {cardBusy ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <ImageIcon className="w-3.5 h-3.5" />}
                Credential Card
            </button>
        </div>
    );
}
