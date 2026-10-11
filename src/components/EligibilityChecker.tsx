import { useState, useMemo } from 'react';
import { useAcademic } from '../context/AcademicContext';
import { Building2, CheckCircle2, AlertCircle } from 'lucide-react';

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
    { name: 'Zoho', cutoff: 0, tier: 'Product Company' },
    { name: 'Custom Criteria', cutoff: 7.0, tier: 'Custom' },
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

        const cutoff = selectedCompany === 'Custom Criteria' ? customCutoff : company.cutoff;
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
        <div className="card p-5 border border-border space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-border">
                <div className="flex items-center gap-2.5">
                    <div className="w-7 h-7 rounded bg-accent-subtle text-accent flex items-center justify-center">
                        <Building2 className="w-4 h-4" />
                    </div>
                    <div>
                        <h3 className="text-sm font-semibold text-text-primary">Campus Placement Eligibility Audit</h3>
                        <p className="text-xs text-text-muted">Verify academic cutoff compliance across recruitment tiers</p>
                    </div>
                </div>
                <div className="text-right font-mono text-xs">
                    <span className="text-text-muted">Current CGPA: </span>
                    <strong className="text-accent">{cgpa > 0 ? cgpa.toFixed(2) : '—'}</strong>
                </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 items-end">
                <div>
                    <label className="field-label">Target Recruiter / Company</label>
                    <select
                        value={selectedCompany}
                        onChange={(e) => setSelectedCompany(e.target.value)}
                        className="input-field text-xs cursor-pointer"
                    >
                        <option value="">Select company criteria...</option>
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
                        <optgroup label="Custom Benchmark">
                            <option value="Custom Criteria">Enter Custom Cutoff</option>
                        </optgroup>
                    </select>
                </div>

                {selectedCompany === 'Custom Criteria' && (
                    <div>
                        <label className="field-label">Custom CGPA Cutoff</label>
                        <input
                            type="number"
                            step="0.1"
                            min="0"
                            max="10"
                            value={customCutoff}
                            onChange={(e) => {
                                const val = parseFloat(e.target.value) || 0;
                                setCustomCutoff(Math.max(0, Math.min(10, val)));
                            }}
                            className="input-field font-mono text-xs"
                        />
                    </div>
                )}
            </div>

            {eligibilityResult && (
                <div className={`p-4 rounded-lg border font-mono text-xs ${
                    eligibilityResult.noCutoff || eligibilityResult.isEligible
                        ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                        : 'bg-rose-50 border-rose-200 text-rose-800'
                }`}>
                    <div className="flex items-center justify-between mb-1">
                        <div className="flex items-center gap-2">
                            {eligibilityResult.noCutoff || eligibilityResult.isEligible ? (
                                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                            ) : (
                                <AlertCircle className="w-4 h-4 text-rose-600" />
                            )}
                            <strong className="text-sm font-sans font-semibold text-text-primary">
                                {eligibilityResult.noCutoff
                                    ? 'No Minimum CGPA Threshold'
                                    : eligibilityResult.isEligible
                                    ? 'Meets Placement Criteria'
                                    : 'Below Cutoff Threshold'}
                            </strong>
                        </div>
                        <span className="text-text-muted">
                            {eligibilityResult.company} · {eligibilityResult.tier}
                        </span>
                    </div>

                    {!eligibilityResult.noCutoff && (
                        <p className="mt-2 text-text-secondary text-xs font-mono">
                            {eligibilityResult.isEligible
                                ? `Current CGPA exceeds required cutoff (${eligibilityResult.cutoff.toFixed(1)}) by +${eligibilityResult.gap.toFixed(2)} points.`
                                : `Deficit of ${eligibilityResult.gap.toFixed(2)} CGPA points from required benchmark (${eligibilityResult.cutoff.toFixed(1)}).`}
                        </p>
                    )}
                </div>
            )}

            {cgpa === 0 && (
                <div className="p-3 bg-surface-subtle border border-border rounded-lg text-xs font-mono text-text-muted text-center">
                    Import or enter semester results to evaluate placement compliance.
                </div>
            )}
        </div>
    );
}
