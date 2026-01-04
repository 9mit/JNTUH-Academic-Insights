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
    Link,
    Printer,
    CheckCircle2,
    ArrowRight,
    BookOpen,
    Cloud,
    FolderOpen
} from 'lucide-react';

const fadeIn = {
    initial: { opacity: 0, y: 20 },
    animate: { opacity: 1, y: 0 },
    transition: { duration: 0.4 }
};

const steps = [
    {
        number: '01',
        title: 'Import Your Results',
        icon: Download,
        color: 'from-primary to-cyan-500',
        description: 'Choose one of three methods to import your academic data:',
        options: [
            { icon: Search, text: 'Auto-Fetch: Enter your Hall Ticket Number to automatically fetch all results', highlight: true },
            { icon: Upload, text: 'PDF Upload: Upload your JNTUH result memo PDFs for instant parsing' },
            { icon: BarChart3, text: 'Manual Entry: Manually enter SGPA for any semester' }
        ]
    },
    {
        number: '02',
        title: 'Explore Your Dashboard',
        icon: BarChart3,
        color: 'from-purple-500 to-pink-500',
        description: 'View your complete academic performance at a glance:',
        options: [
            { icon: CheckCircle2, text: 'CGPA & Percentage calculated using official JNTUH formula' },
            { icon: CheckCircle2, text: 'SGPA Trend Line showing your progress over semesters' },
            { icon: CheckCircle2, text: 'Grade Distribution pie chart with O/A+/A/B breakdown' },
            { icon: CheckCircle2, text: 'Credits Progress tracking earned vs required credits' },
            { icon: CheckCircle2, text: 'Backlogs List showing subjects with F/Ab grades' }
        ]
    },
    {
        number: '03',
        title: 'Use AI Insights',
        icon: Brain,
        color: 'from-emerald-500 to-teal-500',
        description: 'Get intelligent predictions and analysis:',
        options: [
            { icon: Brain, text: 'Next SGPA Prediction based on your performance trend' },
            { icon: Calculator, text: 'Target CGPA Calculator: Enter your goal → Get required SGPA' },
            { icon: FlaskConical, text: 'What-If Calculator: Simulate grade changes to see CGPA impact' },
            { icon: CheckCircle2, text: 'Eligibility Checker: Check if you meet company placement cutoffs' },
            { icon: CheckCircle2, text: 'Semester Goals: Set and track your SGPA targets per semester' }
        ]
    },
    {
        number: '04',
        title: 'Download Study Notes',
        icon: BookOpen,
        color: 'from-violet-500 to-purple-500',
        description: 'Access JNTUH CSE notes through our Notes Hub:',
        options: [
            { icon: FolderOpen, text: 'R18 & R22 Regulation notes organized by Year → Semester → Subject' },
            { icon: Cloud, text: 'Google Drive Access: View notes online without downloading', highlight: true },
            { icon: Download, text: 'Local Downloads: Download PDFs directly from the chatbot' },
            { icon: Upload, text: 'Contribute Notes: Share your notes to help other students' }
        ]
    },
    {
        number: '05',
        title: 'Export & Share',
        icon: FileSpreadsheet,
        color: 'from-amber-500 to-orange-500',
        description: 'Save and share your academic data:',
        options: [
            { icon: FileSpreadsheet, text: 'Export to Excel: Download a complete .xlsx file with all data' },
            { icon: Link, text: 'Share Link: Generate a URL to share your results with others' },
            { icon: Printer, text: 'Print Transcript: Generate a clean, JNTUH-style printable report' }
        ]
    }
];

export default function HelpGuide() {
    return (
        <div className="space-y-8">
            {/* Header */}
            <motion.div {...fadeIn} className="text-center mb-6">
                <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-primary to-cyan-500 mb-4">
                    <HelpCircle className="w-8 h-8 text-white" />
                </div>
                <h1 className="text-3xl font-black text-white mb-2">How to Use This App</h1>
                <p className="text-text-muted max-w-xl mx-auto">
                    A complete walkthrough to help you get the most out of JNTUH Academic Insights
                </p>
            </motion.div>

            {/* Important Notice */}
            <motion.div
                {...fadeIn}
                className="bg-amber-500/10 border-2 border-amber-500/30 rounded-2xl p-5 mb-4"
            >
                <div className="flex items-start gap-3">
                    <span className="text-2xl">⚠️</span>
                    <div>
                        <h4 className="text-amber-400 font-bold mb-1">Important: JNTUH Affiliated Colleges Only</h4>
                        <p className="text-sm text-amber-200/80">
                            Auto-Fetch and all features work properly <strong className="text-white">only for JNTUH and its affiliated colleges</strong>.
                            Students from <strong className="text-amber-300">autonomous colleges</strong> may not be able to use the Auto-Fetch feature as their results are hosted on different portals.
                            Autonomous college students can still use <strong className="text-white">PDF Upload</strong> or <strong className="text-white">Manual Entry</strong> features.
                        </p>
                    </div>
                </div>
            </motion.div>

            {/* Steps */}
            <div className="space-y-6">
                {steps.map((step, index) => (
                    <motion.div
                        key={step.number}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: index * 0.1 }}
                        className="bg-bg-card border border-white/5 rounded-3xl p-6 relative"
                    >
                        {/* Step Number Badge - Inside box, top right */}
                        <div className="absolute top-4 right-4 px-3 py-1 rounded-full bg-white/5 border border-white/10">
                            <span className="text-xs font-bold text-text-muted">STEP {step.number}</span>
                        </div>

                        <div className="flex items-start gap-4">
                            {/* Icon */}
                            <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${step.color} flex items-center justify-center flex-shrink-0`}>
                                <step.icon className="w-6 h-6 text-white" />
                            </div>

                            {/* Content */}
                            <div className="flex-1">
                                <div className="flex items-center gap-3 mb-2">
                                    <span className="text-xs font-bold text-text-muted uppercase tracking-wider">Step {step.number}</span>
                                </div>
                                <h3 className="text-xl font-bold text-white mb-2">{step.title}</h3>
                                <p className="text-sm text-text-muted mb-4">{step.description}</p>

                                <div className="space-y-2">
                                    {step.options.map((option, i) => (
                                        <div
                                            key={i}
                                            className={`flex items-center gap-3 p-3 rounded-xl ${option.highlight
                                                ? 'bg-primary/10 border border-primary/20'
                                                : 'bg-white/5'
                                                }`}
                                        >
                                            <option.icon className={`w-4 h-4 flex-shrink-0 ${option.highlight ? 'text-primary' : 'text-text-muted'}`} />
                                            <span className="text-sm text-white">{option.text}</span>
                                            {option.highlight && (
                                                <span className="ml-auto text-[10px] font-bold text-primary uppercase">Recommended</span>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </motion.div>
                ))}
            </div>

            {/* Quick Tips */}
            <motion.div
                {...fadeIn}
                transition={{ delay: 0.5 }}
                className="bg-gradient-to-br from-emerald-500/10 to-bg-card border border-emerald-500/20 rounded-3xl p-6"
            >
                <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                    💡 Pro Tips
                </h3>
                <ul className="space-y-2 text-sm text-text-muted">
                    <li className="flex items-center gap-2">
                        <ArrowRight className="w-3 h-3 text-emerald-400" />
                        Use <strong className="text-white">Auto-Fetch</strong> for the most accurate and complete data extraction
                    </li>
                    <li className="flex items-center gap-2">
                        <ArrowRight className="w-3 h-3 text-emerald-400" />
                        Import <strong className="text-white">all semesters</strong> to get better AI predictions
                    </li>
                    <li className="flex items-center gap-2">
                        <ArrowRight className="w-3 h-3 text-emerald-400" />
                        Check the <strong className="text-white">What-If Calculator</strong> before important exams
                    </li>
                    <li className="flex items-center gap-2">
                        <ArrowRight className="w-3 h-3 text-emerald-400" />
                        <strong className="text-white">Export to Excel</strong> regularly as a backup of your records
                    </li>
                    <li className="flex items-center gap-2">
                        <ArrowRight className="w-3 h-3 text-emerald-400" />
                        Visit <strong className="text-white">Notes Hub</strong> for free study materials - contribute your notes to help others!
                    </li>
                </ul>
            </motion.div>

            {/* Privacy Notice */}
            <motion.div
                {...fadeIn}
                transition={{ delay: 0.6 }}
                className="text-center text-xs text-text-muted py-4"
            >
                🔒 <strong>Privacy:</strong> All data is processed locally. Nothing is sent to third-party servers.
            </motion.div>
        </div>
    );
}
