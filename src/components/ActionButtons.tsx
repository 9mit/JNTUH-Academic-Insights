import { useState } from 'react';
import { useAcademic } from '../context/AcademicContext';
import { exportToExcel, generateShareableUrl, copyToClipboard } from '../utils/exportUtils';
import { Download, Check, Link } from 'lucide-react';
import toast from 'react-hot-toast';

export default function ActionButtons() {
    const { data } = useAcademic();
    const [copied, setCopied] = useState(false);

    const handleExport = () => {
        try {
            exportToExcel({
                semesters: data.semesters,
                studentName: data.studentName,
                hallTicket: data.hallTicket,
                regulation: data.regulation,
            });
            toast.success('Excel file downloaded!');
        } catch (error) {
            toast.error('Failed to export. Please try again.');
        }
    };

    const handleShare = async () => {
        try {
            const url = generateShareableUrl({
                semesters: data.semesters,
                studentName: data.studentName,
                hallTicket: data.hallTicket,
                regulation: data.regulation,
            });

            await copyToClipboard(url);
            setCopied(true);
            toast.success('Link copied to clipboard!');

            setTimeout(() => setCopied(false), 3000);
        } catch (error) {
            toast.error('Failed to generate link.');
        }
    };

    return (
        <div className="flex items-center gap-3">
            {/* Export Button */}
            <button
                onClick={handleExport}
                className="flex items-center gap-2 px-4 py-2.5 bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/20 rounded-xl text-emerald-400 font-medium text-sm transition-all"
            >
                <Download className="w-4 h-4" />
                Export Excel
            </button>

            {/* Share Button */}
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
        </div>
    );
}
