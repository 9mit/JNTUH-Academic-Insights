import { useState, useMemo } from 'react';
import { useAcademic } from '../context/AcademicContext';
import { motion } from 'framer-motion';
import { Building2, CheckCircle2, XCircle, AlertCircle, Search } from 'lucide-react';

// Common company cutoffs (CGPA)
const COMPANY_CUTOFFS = [
    { name: 'TCS', cutoff: 6.0, tier: 'Mass Recruiter' },
    { name: 'Infosys', cutoff: 6.0, tier: 'Mass Recruiter' },
    { name: 'Wipro', cutoff: 6.0, tier: 'Mass Recruiter' },
    { name: 'Accenture', cutoff: 6.5, tier: 'Mass Recruiter' },
    { name: 'Cognizant (CTS)', cutoff: 6.5, tier: 'Mass Recruiter' },
    { name: 'Tech Mahindra', cutoff: 6.0, tier: 'Mass Recruiter' },
    { name: 'Capgemini', cutoff: 6.0, tier: 'Mass Recruiter' },
    { name: 'HCL Technologies', cutoff: 6.0, tier: 'Mass Recruiter' },
    { name: 'Amazon', cutoff: 7.0, tier: 'Product Company' },
    { name: 'Microsoft', cutoff: 7.5, tier: 'Product Company' },
    { name: 'Google', cutoff: 8.0, tier: 'Product Company' },
    { name: 'Deloitte', cutoff: 7.0, tier: 'Consulting' },
    { name: 'KPMG', cutoff: 7.0, tier: 'Consulting' },
    { name: 'EY (Ernst & Young)', cutoff: 7.0, tier: 'Consulting' },
    { name: 'Zoho', cutoff: 0, tier: 'Product Company' }, // No CGPA cutoff
    { name: 'Custom', cutoff: 7.0, tier: 'Custom' },
];

export default function EligibilityChecker() {
    const { getCGPA } = useAcademic();
    const { cgpa } = getCGPA();
    const [selectedCompany, setSelectedCompany] = useState('');
    const [customCutoff, setCustomCutoff] = useState(7.0);

    const eligibilityResult = useMemo(() => {
        if (!selectedCompany) return null;

        const company = COMPANY_CUTOFFS.find(c => c.name === selectedCompany);
        if (!company) return null;

        const cutoff = selectedCompany === 'Custom' ? customCutoff : company.cutoff;
        const isEligible = cgpa >= cutoff;
        const gap = cutoff - cgpa;

        return {
            company: company.name,
            cutoff,
            tier: company.tier,
            isEligible,
            gap: Math.abs(gap),
            noCutoff: cutoff === 0,
        };
    }, [selectedCompany, customCutoff, cgpa]);

    return (
        <div className="bg-gradient-to-br from-blue-500/10 to-bg-card rounded-3xl p-6 border border-blue-500/20">
            {/* Header */}
            <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-500 flex items-center justify-center">
                    <Building2 className="w-5 h-5 text-white" />
                </div>
                <div>
                    <h3 className="text-lg font-bold text-white">Eligibility Checker</h3>
                    <p className="text-xs text-text-muted">Check if you meet company placement cutoffs</p>
                </div>
            </div>

            {/* Current CGPA Display */}
            <div className="bg-black/20 rounded-xl p-4 mb-4 flex items-center justify-between">
                <span className="text-sm text-text-muted">Your Current CGPA</span>
                <span className="text-2xl font-black text-primary">{cgpa > 0 ? cgpa.toFixed(2) : '—'}</span>
            </div>

            {/* Company Selector */}
            <div className="mb-4">
                <label className="block text-[10px] font-bold text-text-muted uppercase tracking-wider mb-2">
                    Select Company
                </label>
                <div className="relative">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted pointer-events-none" />
                    <select
                        value={selectedCompany}
                        onChange={(e) => setSelectedCompany(e.target.value)}
                        className="input-field w-full !pl-14"
                    >
                        <option value="">Choose a company...</option>
                        <optgroup label="Mass Recruiters">
                            {COMPANY_CUTOFFS.filter(c => c.tier === 'Mass Recruiter').map(c => (
                                <option key={c.name} value={c.name}>
                                    {c.name} (≥ {c.cutoff} CGPA)
                                </option>
                            ))}
                        </optgroup>
                        <optgroup label="Product Companies">
                            {COMPANY_CUTOFFS.filter(c => c.tier === 'Product Company').map(c => (
                                <option key={c.name} value={c.name}>
                                    {c.name} {c.cutoff > 0 ? `(≥ ${c.cutoff} CGPA)` : '(No CGPA Cutoff)'}
                                </option>
                            ))}
                        </optgroup>
                        <optgroup label="Consulting">
                            {COMPANY_CUTOFFS.filter(c => c.tier === 'Consulting').map(c => (
                                <option key={c.name} value={c.name}>
                                    {c.name} (≥ {c.cutoff} CGPA)
                                </option>
                            ))}
                        </optgroup>
                        <optgroup label="Custom">
                            <option value="Custom">Enter Custom Cutoff</option>
                        </optgroup>
                    </select>
                </div>
            </div>

            {/* Custom Cutoff Input */}
            {selectedCompany === 'Custom' && (
                <div className="mb-4">
                    <label className="block text-[10px] font-bold text-text-muted uppercase tracking-wider mb-2">
                        Custom CGPA Cutoff
                    </label>
                    <input
                        type="number"
                        step="0.1"
                        min="0"
                        max="10"
                        value={customCutoff}
                        onChange={(e) => setCustomCutoff(parseFloat(e.target.value) || 0)}
                        className="input-field w-full"
                    />
                </div>
            )}

            {/* Result Display */}
            {eligibilityResult && (
                <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className={`mt-4 p-5 rounded-2xl border-2 ${eligibilityResult.noCutoff
                        ? 'bg-emerald-500/10 border-emerald-500/30'
                        : eligibilityResult.isEligible
                            ? 'bg-emerald-500/10 border-emerald-500/30'
                            : 'bg-rose-500/10 border-rose-500/30'
                        }`}
                >
                    <div className="flex items-center gap-3 mb-3">
                        {eligibilityResult.noCutoff ? (
                            <AlertCircle className="w-8 h-8 text-emerald-400" />
                        ) : eligibilityResult.isEligible ? (
                            <CheckCircle2 className="w-8 h-8 text-emerald-400" />
                        ) : (
                            <XCircle className="w-8 h-8 text-rose-400" />
                        )}
                        <div>
                            <p className={`text-xl font-black ${eligibilityResult.noCutoff || eligibilityResult.isEligible
                                ? 'text-emerald-400'
                                : 'text-rose-400'
                                }`}>
                                {eligibilityResult.noCutoff
                                    ? 'No CGPA Requirement!'
                                    : eligibilityResult.isEligible
                                        ? 'You Are Eligible! ✅'
                                        : 'Not Eligible Yet ❌'}
                            </p>
                            <p className="text-sm text-text-muted">
                                {eligibilityResult.company} • {eligibilityResult.tier}
                            </p>
                        </div>
                    </div>

                    {!eligibilityResult.noCutoff && (
                        <div className="bg-black/20 rounded-xl p-3 text-center">
                            {eligibilityResult.isEligible ? (
                                <p className="text-sm text-text-secondary">
                                    You exceed the cutoff by <span className="font-bold text-emerald-400">{eligibilityResult.gap.toFixed(2)}</span> points
                                </p>
                            ) : (
                                <p className="text-sm text-text-secondary">
                                    You need <span className="font-bold text-rose-400">{eligibilityResult.gap.toFixed(2)}</span> more CGPA to become eligible
                                </p>
                            )}
                        </div>
                    )}
                </motion.div>
            )}

            {cgpa === 0 && (
                <div className="mt-4 p-4 bg-amber-500/10 rounded-xl text-center">
                    <p className="text-sm text-amber-300">
                        ⚠️ Add your results first to check eligibility
                    </p>
                </div>
            )}
        </div>
    );
}
