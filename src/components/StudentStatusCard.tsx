import { GraduationCap, AlertTriangle, BookOpen } from 'lucide-react';
import { useAcademic } from '../context/AcademicContext';
import { getStudentStatus, getStatusLabel } from '../utils/calculations';
import { motion } from 'framer-motion';

export default function StudentStatusCard() {
    const { data } = useAcademic();
    const status = getStudentStatus(data.semesters, data.regulation);
    const statusLabel = getStatusLabel(data.semesters, data.regulation);

    const statusConfig = {
        graduated: {
            icon: GraduationCap,
            bgColor: 'from-emerald-500/10 to-bg-card',
            borderColor: 'border-emerald-500/20',
            textColor: 'text-emerald-400',
            accentColor: 'bg-emerald-500',
            title: '✓ GRADUATED',
            subtitle: 'Congratulations! You have completed your degree.'
        },
        graduated_with_backlogs: {
            icon: AlertTriangle,
            bgColor: 'from-amber-500/10 to-bg-card',
            borderColor: 'border-amber-500/20',
            textColor: 'text-amber-400',
            accentColor: 'bg-amber-500',
            title: '✓ GRADUATED (With Backlogs)',
            subtitle: 'Degree completed, but backlogs are pending.'
        },
        studying: {
            icon: BookOpen,
            bgColor: 'from-blue-500/10 to-bg-card',
            borderColor: 'border-blue-500/20',
            textColor: 'text-blue-400',
            accentColor: 'bg-blue-500',
            title: '→ CURRENTLY STUDYING',
            subtitle: 'Keep pushing! More semesters to complete.'
        }
    };

    const config = statusConfig[status] || statusConfig.studying;
    const Icon = config.icon;

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className={`bg-gradient-to-br ${config.bgColor} rounded-3xl p-6 border ${config.borderColor} relative overflow-hidden`}
        >
            <div className={`absolute top-0 right-0 w-40 h-40 ${config.accentColor}/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2`} />
            
            <div className="relative flex items-start gap-4">
                <div className={`w-12 h-12 rounded-2xl ${config.accentColor} flex items-center justify-center flex-shrink-0`}>
                    <Icon className="w-6 h-6 text-white" />
                </div>
                
                <div className="flex-1">
                    <p className={`text-xs font-bold ${config.textColor} uppercase tracking-[0.2em] mb-1`}>
                        Academic Status
                    </p>
                    <h3 className="text-2xl font-black text-white mb-1">
                        {config.title}
                    </h3>
                    <p className="text-sm text-text-muted">
                        {statusLabel}
                    </p>
                </div>
            </div>
        </motion.div>
    );
}
