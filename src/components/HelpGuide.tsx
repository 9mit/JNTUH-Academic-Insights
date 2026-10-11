import { motion } from 'framer-motion';
import {
    HelpCircle,
    Download,
    Upload,
    Search,
    BarChart3,
    Brain,
    Calculator,
    FlaskConical,
    FileSpreadsheet,
    Link as LinkIcon,
    Printer,
    CheckCircle2,
    ArrowRight,
    AlertTriangle,
    Lightbulb,
    ShieldCheck
} from 'lucide-react';

const fadeIn = {
    initial: false as const,
    animate: { y: 0 },
    transition: { duration: 0.2 }
};

const steps = [
    {
        number: '01',
        title: 'Import Your Academic Records',
        icon: Download,
        description: 'Choose one of three ingestion pipelines to populate your academic dataset:',
        options: [
            { icon: Search, text: 'Auto-Fetch: Input your 10-digit Hall Ticket Number to query university servers directly', highlight: true },
            { icon: Upload, text: 'PDF Upload: Upload official JNTUH semester result memo PDFs for automated parsing' },
            { icon: BarChart3, text: 'Manual Entry: Directly input SGPA and credit tallies for any semester' }
        ]
    },
    {
        number: '02',
        title: 'Explore Your Academic Dashboard',
        icon: BarChart3,
        description: 'Comprehensive analysis of academic progression, honors tracking, and standing:',
        options: [
            { icon: CheckCircle2, text: 'Official CGPA & Percentage computed strictly using JNTUH regulation formulas' },
            { icon: CheckCircle2, text: 'Semester-by-semester SGPA trend trajectories and moving averages' },
            { icon: CheckCircle2, text: 'Grade distribution breakdown across O, A+, A, B, C, and passing grades' },
            { icon: CheckCircle2, text: 'Degree Credit Audit tracking earned credits against the 160-credit threshold' },
            { icon: CheckCircle2, text: 'Active backlog registry detailing pending remedial requirements' }
        ]
    },
    {
        number: '03',
        title: 'Analytical Modeling & Planning',
        icon: Brain,
        description: 'Predictive tools and sensitivity simulations for career and degree milestones:',
        options: [
            { icon: Brain, text: 'Weighted SGPA forecasting based on historical progression trends' },
            { icon: Calculator, text: 'Target CGPA Calculator: Model required future semester SGPAs to hit graduation cutoffs' },
            { icon: FlaskConical, text: 'What-If Sensitivity Simulation: Simulate hypothetical grade updates and CGPA net delta' },
            { icon: CheckCircle2, text: 'Placement Compliance Audit: Verify eligibility against corporate recruiting cutoffs' },
            { icon: CheckCircle2, text: 'Semester Target Benchmarks: Set and monitor SGPA targets per academic cycle' }
        ]
    },
    {
        number: '04',
        title: 'Export & Share Records',
        icon: FileSpreadsheet,
        description: 'Generate portable records and university-standard transcript formats:',
        options: [
            { icon: FileSpreadsheet, text: 'Excel Export: Structured .xlsx spreadsheet containing all semester subjects and marks' },
            { icon: LinkIcon, text: 'Encrypted Share Link: Generate a stateless shareable link for peer review' },
            { icon: Printer, text: 'Printable Transcript: Formatted, university-standard hardcopy audit ready for print' }
        ]
    }
];

export default function HelpGuide() {
    return (
        <div className="space-y-6">
            {/* Header */}
            <motion.div {...fadeIn} className="text-center mb-8 pb-4 border-b border-border">
                <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-surface-subtle border border-border mb-3 text-accent">
                    <HelpCircle className="w-6 h-6" />
                </div>
                <h1 className="text-2xl font-bold text-text-primary tracking-tight">System Manual & Operational Guide</h1>
                <p className="text-xs text-text-muted max-w-lg mx-auto mt-1">
                    Complete documentation for ingesting, auditing, and modeling academic results under JNTUH regulations
                </p>
            </motion.div>

            {/* University Affiliation Notice */}
            <motion.div
                {...fadeIn}
                className="bg-amber-50 border border-amber-200 rounded-xl p-5"
            >
                <div className="flex items-start gap-3">
                    <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
                    <div>
                        <h4 className="text-xs font-semibold uppercase tracking-wider text-amber-900 mb-1">
                            Institutional Compatibility Notice: JNTUH Affiliated Colleges
                        </h4>
                        <p className="text-xs text-text-secondary leading-relaxed">
                            The Auto-Fetch pipeline queries official JNTUH exam result servers. Autonomous institutions (e.g., CBT/portal variations) maintain private grade repositories that are not mirrored on the university root server. Students from autonomous colleges should utilize the <strong className="text-text-primary">PDF Upload</strong> or <strong className="text-text-primary">Detailed Course Entry</strong> modes to ensure 100% accurate audits.
                        </p>
                    </div>
                </div>
            </motion.div>

            {/* Steps */}
            <div className="space-y-4">
                {steps.map((step) => (
                    <motion.div
                        key={step.number}
                        initial={false}
                        animate={{ opacity: 1 }}
                        className="bg-bg-card border border-border rounded-xl p-6 shadow-sm relative"
                    >
                        {/* Step Number Badge */}
                        <div className="absolute top-5 right-5 px-2.5 py-1 rounded bg-surface-subtle border border-border">
                            <span className="text-[11px] font-mono font-bold text-text-muted">STAGE {step.number}</span>
                        </div>

                        <div className="flex items-start gap-4">
                            {/* Icon */}
                            <div className="w-9 h-9 rounded-lg bg-surface-subtle border border-border flex items-center justify-center text-text-primary flex-shrink-0">
                                <step.icon className="w-4 h-4 text-accent" />
                            </div>

                            {/* Content */}
                            <div className="flex-1 pr-20">
                                <h3 className="text-base font-semibold text-text-primary mb-1">{step.title}</h3>
                                <p className="text-xs text-text-muted mb-4">{step.description}</p>

                                <div className="space-y-2">
                                    {step.options.map((option, i) => (
                                        <div
                                            key={i}
                                            className={`flex items-center gap-3 p-3 rounded-lg border transition-colors ${
                                                option.highlight
                                                    ? 'bg-accent/[0.05] border-accent/30'
                                                    : 'bg-surface-subtle border-border'
                                            }`}
                                        >
                                            <option.icon className={`w-4 h-4 flex-shrink-0 ${option.highlight ? 'text-accent' : 'text-text-muted'}`} />
                                            <span className="text-xs text-text-primary">{option.text}</span>
                                            {option.highlight && (
                                                <span className="ml-auto text-[10px] font-mono font-bold uppercase tracking-wider text-accent bg-accent/10 px-2 py-0.5 rounded border border-accent/20">
                                                    Recommended
                                                </span>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </motion.div>
                ))}
            </div>

            {/* Operational Best Practices */}
            <motion.div
                {...fadeIn}
                className="bg-bg-card border border-border rounded-xl p-6 shadow-sm"
            >
                <div className="flex items-center gap-2 mb-4 pb-3 border-b border-border">
                    <Lightbulb className="w-4 h-4 text-accent" />
                    <h3 className="text-sm font-semibold text-text-primary">Operational Best Practices</h3>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs text-text-secondary">
                    <div className="p-3 bg-surface-subtle rounded-lg border border-border flex items-start gap-2">
                        <ArrowRight className="w-3.5 h-3.5 text-accent flex-shrink-0 mt-0.5" />
                        <span><strong>Ingest Complete History:</strong> Auto-fetch all completed semesters to enable accurate progression trends and promotion audit.</span>
                    </div>
                    <div className="p-3 bg-surface-subtle rounded-lg border border-border flex items-start gap-2">
                        <ArrowRight className="w-3.5 h-3.5 text-accent flex-shrink-0 mt-0.5" />
                        <span><strong>Pre-Exam What-If Analysis:</strong> Model target SGPA requirements early in the semester to set realistic study allocations.</span>
                    </div>
                    <div className="p-3 bg-surface-subtle rounded-lg border border-border flex items-start gap-2">
                        <ArrowRight className="w-3.5 h-3.5 text-accent flex-shrink-0 mt-0.5" />
                        <span><strong>Verify Official Transcripts:</strong> When official cumulative cards are parsed from PDF memos, verify grade point matches against your hall ticket.</span>
                    </div>
                    <div className="p-3 bg-surface-subtle rounded-lg border border-border flex items-start gap-2">
                        <ArrowRight className="w-3.5 h-3.5 text-accent flex-shrink-0 mt-0.5" />
                        <span><strong>Regular Local Backups:</strong> Export your complete record to Excel or backup to Session Vault for permanent local archival.</span>
                    </div>
                </div>
            </motion.div>

            {/* Privacy Architecture Notice */}
            <motion.div
                {...fadeIn}
                className="bg-surface-subtle border border-border rounded-xl p-4 text-xs text-text-muted flex items-start gap-3"
            >
                <ShieldCheck className="w-4 h-4 text-emerald-600 flex-shrink-0 mt-0.5" />
                <p className="leading-relaxed">
                    <strong className="text-text-primary">Privacy & Storage Policy:</strong> Academic records are processed client-side and remain in your browser session by default. Data is never shared with third parties or advertising brokers. Hall Ticket auto-queries are routed directly through transient API proxies without persistent profile indexing unless explicitly saved into your encrypted Session Vault.
                </p>
            </motion.div>
        </div>
    );
}
