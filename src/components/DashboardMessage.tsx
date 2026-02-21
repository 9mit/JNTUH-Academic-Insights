import { useAcademic } from '../context/AcademicContext';
import { motion } from 'framer-motion';
import { GraduationCap, BookOpen, Quote, Trophy, Sparkles } from 'lucide-react';
import { useMemo } from 'react';

// Icon helper
function BriefcaseIcon(props: any) {
    return (
        <svg
            {...props}
            xmlns="http://www.w3.org/2000/svg"
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
        >
            <rect width="20" height="14" x="2" y="7" rx="2" ry="2" />
            <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16" />
        </svg>
    )
}

// Messages Database
const MESSAGES = {
    graduated: [
        {
            text: "Welcome back, Engineer! Your journey here is done, but the world is waiting.",
            author: "JNTUH Alumni",
            role: "Class of 2023",
            icon: Trophy,
            color: "from-amber-500 to-yellow-500"
        },
        {
            text: "The degree is just a piece of paper. The resilience you built here is what matters.",
            author: "Senior Recruiter",
            role: "Top MNC",
            icon: GraduationCap,
            color: "from-emerald-500 to-teal-500"
        }
    ],
    pursuing: [
        {
            text: "Every semester counts. Keep your SGPA high, and the placements will follow.",
            author: "Placement Coordinator",
            role: "JNTUH",
            icon: BriefcaseIcon,
            color: "from-primary to-cyan-500"
        },
        {
            text: "Consistency beats intensity. Review your subjects daily, not just before exams.",
            author: "University Gold Medalist",
            role: "2022 Batch",
            icon: BookOpen,
            color: "from-violet-500 to-purple-500"
        },
        {
            text: "Don't stress about one bad grade. Focus on the comeback.",
            author: "Final Year Senior",
            role: "CSE Dept",
            icon: Sparkles,
            color: "from-rose-500 to-pink-500"
        }
    ]
};

export default function DashboardMessage() {
    const { data, getCGPA } = useAcademic();
    const { totalCredits } = getCGPA();

    // Determine Status
    const status = useMemo(() => {
        // Simple heuristic: If they have data for Year 4 Sem 2 (id: '4-2') and no active backlogs?
        // Or just check if total credits > 150 (approx for B.Tech)
        // Let's use a simpler check: Do they have any subjects in 4-2?
        const finalSem = data.semesters.find(s => s.id === '4-2');
        const hasFinalYearData = finalSem ? finalSem.subjects.length > 0 : false;

        if (hasFinalYearData && totalCredits >= 160) return 'graduated';
        return 'pursuing';
    }, [data.semesters, totalCredits]);

    // Select random message based on status (stable per session ideally, but random fetch is fine for now)
    const message = useMemo(() => {
        const pool = MESSAGES[status as 'graduated' | 'pursuing'];
        return pool[Math.floor(Math.random() * pool.length)]; // Randomize on mount
    }, [status]);

    return (
        <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-8 relative overflow-hidden rounded-3xl bg-gradient-to-br from-bg-card to-bg-secondary border border-white/5 p-6 md:p-8"
        >
            <div className={`absolute top-0 left-0 w-1 h-full bg-gradient-to-b ${message.color}`} />

            <div className="flex flex-col md:flex-row gap-6 items-start md:items-center">
                <div className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${message.color} flex items-center justify-center shadow-lg shadow-primary/10 flex-shrink-0`}>
                    <message.icon className="w-7 h-7 text-white" />
                </div>

                <div className="flex-1">
                    <div className="flex items-start gap-2">
                        <Quote className="w-4 h-4 text-text-muted transform scale-x-[-1] mt-1" />
                        <h3 className="text-xl md:text-2xl font-bold text-white leading-relaxed">
                            {message.text}
                        </h3>
                    </div>
                    <p className="text-sm font-medium text-text-muted mt-3 ml-6">
                        — {message.author}, <span className="opacity-70">{message.role}</span>
                    </p>
                </div>
            </div>
        </motion.div>
    );
}
