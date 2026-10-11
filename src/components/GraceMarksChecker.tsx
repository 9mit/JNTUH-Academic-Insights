import { useState, useMemo } from 'react';
import toast from 'react-hot-toast';
import { useAcademic } from '../context/AcademicContext';
import {
  Scale,
  Loader2,
  CheckCircle2,
  AlertCircle,
  FileText,
  Copy,
  Printer,
  Award,
  Sparkles,
  X,
} from 'lucide-react';
import SectionHeader from './ui/SectionHeader';
import { parseHtno } from '../utils/htnoProfile';

const API_BASE = import.meta.env.VITE_API_URL || '';

interface GraceMarksResult {
  scheme_applies?: boolean;
  backlog_count?: number;
  eligible_count?: number;
  can_clear_with_grace?: boolean;
  max_grace_marks_quota?: number;
  eligible_subjects?: {
    subject_code: string;
    subject_name: string;
    marks_short: number;
    credits: number;
    grade: string;
  }[];
  exemption_allowed?: boolean;
  can_clear_with_exemption?: boolean;
  max_exempt_credits?: number;
  exemptible_subjects?: {
    subject_code: string;
    subject_name: string;
    credits: number;
    grade: string;
  }[];
  ordinance_title?: string;
  citation?: string;
  disclaimer?: string;
}

export default function GraceMarksChecker() {
  const { data } = useAcademic();
  const [result, setResult] = useState<GraceMarksResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'grace' | 'exemption'>('grace');
  const [showLetterModal, setShowLetterModal] = useState(false);

  const profile = useMemo(() => parseHtno(data.hallTicket), [data.hallTicket]);

  const allSubjects = useMemo(() => {
    return data.semesters.flatMap(s => s.subjects);
  }, [data.semesters]);

  const backlogs = useMemo(() => {
    return allSubjects.filter(s => s.grade === 'F' || s.grade === 'Ab');
  }, [allSubjects]);

  const checkEligibility = async () => {
    setLoading(true);
    setResult(null);
    try {
      const subjectsPayload = allSubjects.map(sub => ({
        subject_code: sub.code,
        subject_name: sub.name,
        grade: sub.grade,
        credits: sub.credits,
        internal: sub.internal,
        external: sub.external,
        total: sub.total,
      }));

      const res = await fetch(`${API_BASE}/api/grace-marks`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ subjects: subjectsPayload, regulation: data.regulation }),
      });

      if (!res.ok) {
        const detail = await res.json().catch(() => ({}));
        throw new Error(detail.detail || `Evaluation failed (${res.status})`);
      }

      const payload: GraceMarksResult = await res.json();
      setResult(payload);
      toast.success('Degree clearance ordinance evaluation complete!');
    } catch (e) {
      const message = e instanceof Error ? e.message : 'Could not evaluate grace marks eligibility';
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  // Generate formal letter draft
  const letterDraft = useMemo(() => {
    const studentName = data.studentName || 'Candidate';
    const htno = data.hallTicket || '21XXXXXXXX';
    const college = profile?.collegeName || 'JNTUH Affiliated College';
    const regulation = data.regulation || 'R18';
    const dateStr = new Date().toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });

    let subjectListText = '';
    if (activeTab === 'grace' && result?.eligible_subjects?.length) {
      subjectListText = result.eligible_subjects
        .map(
          (s, idx) =>
            `   ${idx + 1}. ${s.subject_code} - ${s.subject_name} (Shortfall: ${s.marks_short} mark(s))`
        )
        .join('\n');
    } else if (activeTab === 'exemption' && result?.exemptible_subjects?.length) {
      subjectListText = result.exemptible_subjects
        .map(
          (s, idx) =>
            `   ${idx + 1}. ${s.subject_code} - ${s.subject_name} (${s.credits} Credits)`
        )
        .join('\n');
    } else {
      subjectListText = backlogs
        .map((s, idx) => `   ${idx + 1}. ${s.code || 'CODE'} - ${s.name} (${s.credits} Credits)`)
        .join('\n');
    }

    const schemeName =
      activeTab === 'grace'
        ? `0.15% Grace Marks Ordinance`
        : `Credit Exemption Ordinance (Max ${result?.max_exempt_credits || 6} Credits)`;

    return `Date: ${dateStr}

To,
The Principal & Controller of Examinations,
${college},
JNTUH Affiliated Institution.

Through: Head of the Department

Subject: Request for Degree Award clearance under JNTUH ${regulation} ${schemeName} - Reg.

Respected Sir/Madam,

I, ${studentName}, bearing Hall Ticket Number ${htno}, was a student of B.Tech in ${profile?.branchName || 'Engineering'} under ${regulation} regulation (Batch: ${profile?.batchSpan || '2021 – 2025'}).

I have completed the coursework of all eight semesters. As per the current academic ledger, the following course(s) remain pending:

${subjectListText}

In accordance with the official JNTUH ${regulation} Academic Ordinances for the award of Degree:
${activeTab === 'grace' ? '- The 0.15% Grace Marks provision enables clearance of shortfall marks for eligibility for Degree Award.' : '- The Credit Exemption provision permits exemption of elective course credits up to the prescribed threshold for degree award.'}

I request you to verify my eligibility under the university guidelines and forward my application to the Director of Evaluation, JNTUH, for the issuance of my Provisional Certificate (PC) and Consolidated Marks Memorandum (CMM).

Enclosures:
1. Attested photocopies of semester marks memos
2. University prescribed undertaking form
3. Student identity card copy
4. Examination branch fee challan

Thanking you,

Yours sincerely,

${studentName}
Hall Ticket No: ${htno}
Contact: ______________________`;
  }, [data.studentName, data.hallTicket, profile, data.regulation, activeTab, result, backlogs]);

  const copyLetter = () => {
    navigator.clipboard.writeText(letterDraft);
    toast.success('Application draft copied to clipboard!');
  };

  const printLetter = () => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;
    printWindow.document.write(`
      <html>
        <head>
          <title>Application for Degree Clearance - ${data.hallTicket || 'JNTUH'}</title>
          <style>
            body { font-family: "Times New Roman", Times, serif; padding: 40px; font-size: 13pt; line-height: 1.6; color: #111; }
            pre { white-space: pre-wrap; font-family: inherit; font-size: inherit; }
          </style>
        </head>
        <body>
          <pre>${letterDraft}</pre>
        </body>
      </html>
    `);
    printWindow.document.close();
    printWindow.focus();
    printWindow.print();
  };

  return (
    <div className="space-y-5 max-w-4xl">
      <SectionHeader
        icon={Scale}
        title="Degree Clearance & University Ordinance Advisor"
        subtitle={`Audit your academic standing against official JNTUH ${data.regulation} Grace Marks (0.15%) and Credit Exemption Ordinances.`}
      />

      {/* Zero backlogs banner */}
      {backlogs.length === 0 && (
        <div className="card p-5 border border-border bg-surface-card rounded-lg flex items-start gap-3.5">
          <div className="w-9 h-9 rounded-lg bg-emerald-50 border border-emerald-200 flex items-center justify-center shrink-0">
            <Award className="w-5 h-5 text-emerald-600" />
          </div>
          <div>
            <h4 className="text-sm font-semibold text-text-primary">
              All Courses Cleared — Zero Backlogs Pending
            </h4>
            <p className="text-xs text-text-secondary mt-1 leading-relaxed">
              Your record indicates all registered semesters are cleared under {data.regulation}. You fulfill degree credit criteria without requiring grace marks or subject exemptions.
            </p>
          </div>
        </div>
      )}

      {/* Active backlogs card */}
      {backlogs.length > 0 && (
        <div className="card p-5 border border-border bg-surface-card rounded-lg space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[11px] font-mono uppercase tracking-wider text-amber-800 font-semibold bg-amber-50 border border-amber-200 px-2 py-0.5 rounded">
                  {backlogs.length} Pending Backlog(s) Detected
                </span>
                <span className="text-xs text-text-muted font-mono">{data.regulation} Scheme</span>
              </div>
              <p className="text-xs text-text-secondary mt-1">
                Evaluate university ordinances to verify if these failed courses qualify for clearance under 0.15% Grace Marks or Credit Exemption rules.
              </p>
            </div>

            <button
              onClick={checkEligibility}
              disabled={loading}
              className="btn-primary py-2 px-4 text-xs inline-flex items-center gap-2 cursor-pointer disabled:opacity-50 shrink-0"
            >
              {loading ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Evaluating Ordinances...</span>
                </>
              ) : (
                <>
                  <Scale className="w-3.5 h-3.5" />
                  <span>Evaluate Ordinances</span>
                </>
              )}
            </button>
          </div>

          {/* Pending Subjects Chips */}
          <div className="flex flex-wrap gap-2 pt-2 border-t border-border/60">
            {backlogs.map((s, idx) => (
              <div
                key={idx}
                className="px-2.5 py-1 rounded bg-surface-subtle border border-border text-[11px] font-mono flex items-center gap-2"
              >
                <span className="text-rose-700 font-bold">{s.code || 'COURSE'}</span>
                <span className="text-text-secondary truncate max-w-[200px]">{s.name}</span>
                <span className="text-text-muted">({s.credits} cr)</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Ordinance Result Breakdown */}
      {result && (
        <div className="card p-6 border border-border bg-surface-card rounded-lg space-y-6">
          {/* Ordinance Tabs */}
          <div className="flex items-center justify-between border-b border-border pb-3">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setActiveTab('grace')}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors cursor-pointer ${
                  activeTab === 'grace'
                    ? 'bg-accent/10 border border-accent/30 text-accent font-semibold'
                    : 'text-text-muted hover:text-text-primary'
                }`}
              >
                0.15% Grace Marks Ordinance
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('exemption')}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors cursor-pointer ${
                  activeTab === 'exemption'
                    ? 'bg-accent/10 border border-accent/30 text-accent font-semibold'
                    : 'text-text-muted hover:text-text-primary'
                }`}
              >
                Credit Exemption Ordinance ({result.max_exempt_credits || 0} Credits)
              </button>
            </div>

            <button
              type="button"
              onClick={() => setShowLetterModal(true)}
              className="btn-secondary text-xs py-1.5 px-3 inline-flex items-center gap-1.5 cursor-pointer"
            >
              <FileText className="w-3.5 h-3.5" />
              <span>Generate College Application</span>
            </button>
          </div>

          {/* Tab 1: Grace Marks */}
          {activeTab === 'grace' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  {result.can_clear_with_grace ? (
                    <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                  ) : (
                    <AlertCircle className="w-5 h-5 text-amber-600 shrink-0" />
                  )}
                  <div>
                    <h4 className="text-sm font-semibold text-text-primary">
                      {result.can_clear_with_grace
                        ? 'Eligible for Clearance via 0.15% Grace Marks'
                        : result.scheme_applies
                        ? 'Scheme Active — Deficit Exceeds Allowable Grace Quota'
                        : 'Grace Scheme Inactive under Current Academic Status'}
                    </h4>
                    <p className="text-xs text-text-secondary mt-0.5">
                      JNTUH allows up to {result.max_grace_marks_quota || 8} grace marks across at most 2 failed subjects for B.Tech degree completion.
                    </p>
                  </div>
                </div>

                <div className="text-right font-mono text-xs">
                  <span className="text-text-muted">Quota Quorum</span>
                  <div className="text-sm font-bold text-accent">
                    {result.max_grace_marks_quota || 8} Marks Max
                  </div>
                </div>
              </div>

              {/* Subject Breakdown Table */}
              {result.eligible_subjects && result.eligible_subjects.length > 0 ? (
                <div className="overflow-x-auto border border-border rounded-lg">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead className="bg-surface-subtle border-b border-border text-[10px] font-mono uppercase tracking-wider text-text-muted">
                      <tr>
                        <th className="py-2.5 px-3">Subject Code</th>
                        <th className="py-2.5 px-3">Subject Name</th>
                        <th className="py-2.5 px-3 text-center">Current Grade</th>
                        <th className="py-2.5 px-3 text-right">Marks Deficit</th>
                        <th className="py-2.5 px-3 text-right">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border/60 font-mono">
                      {result.eligible_subjects.map((s, idx) => (
                        <tr key={idx} className="hover:bg-surface-subtle/40">
                          <td className="py-2.5 px-3 font-bold text-text-primary">{s.subject_code}</td>
                          <td className="py-2.5 px-3 font-sans text-text-secondary">{s.subject_name}</td>
                          <td className="py-2.5 px-3 text-center text-rose-700 font-bold">{s.grade}</td>
                          <td className="py-2.5 px-3 text-right font-bold text-amber-800">
                            Short {s.marks_short} mark(s)
                          </td>
                          <td className="py-2.5 px-3 text-right">
                            <span className="text-emerald-800 text-[11px] font-semibold bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                              Within Quota
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="p-4 rounded-lg bg-surface-subtle border border-border text-xs text-text-secondary leading-relaxed">
                  No individual backlog subjects fit within the standard 1–8 mark deficit threshold, or total failed courses exceed 2 subjects.
                </div>
              )}
            </div>
          )}

          {/* Tab 2: Credit Exemption */}
          {activeTab === 'exemption' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  {result.can_clear_with_exemption ? (
                    <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                  ) : (
                    <AlertCircle className="w-5 h-5 text-amber-600 shrink-0" />
                  )}
                  <div>
                    <h4 className="text-sm font-semibold text-text-primary">
                      {result.can_clear_with_exemption
                        ? 'Eligible for Degree Award via Credit Exemption'
                        : result.exemption_allowed
                        ? 'Exemption Scheme Available — Conditions Apply'
                        : `Credit Exemption Not Permitted Under ${data.regulation}`}
                    </h4>
                    <p className="text-xs text-text-secondary mt-0.5">
                      {result.exemption_allowed
                        ? `R18/R16 ordinances permit exempting up to ${result.max_exempt_credits} credits from failed elective courses provided all core subjects are cleared.`
                        : `Under R22/R24, JNTUH mandates clearing all 160 credits with zero exemptions.`}
                    </p>
                  </div>
                </div>

                <div className="text-right font-mono text-xs">
                  <span className="text-text-muted">Exemption Cap</span>
                  <div className="text-sm font-bold text-accent">
                    {result.max_exempt_credits || 0} Credits
                  </div>
                </div>
              </div>

              {/* Exemptible courses list */}
              {result.exemptible_subjects && result.exemptible_subjects.length > 0 ? (
                <div className="overflow-x-auto border border-border rounded-lg">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead className="bg-surface-subtle border-b border-border text-[10px] font-mono uppercase tracking-wider text-text-muted">
                      <tr>
                        <th className="py-2.5 px-3">Subject Code</th>
                        <th className="py-2.5 px-3">Subject Name</th>
                        <th className="py-2.5 px-3 text-right">Credits</th>
                        <th className="py-2.5 px-3 text-right">Eligible for Exemption</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border/60 font-mono">
                      {result.exemptible_subjects.map((s, idx) => (
                        <tr key={idx} className="hover:bg-surface-subtle/40">
                          <td className="py-2.5 px-3 font-bold text-text-primary">{s.subject_code}</td>
                          <td className="py-2.5 px-3 font-sans text-text-secondary">{s.subject_name}</td>
                          <td className="py-2.5 px-3 text-right text-text-primary font-bold">{s.credits}</td>
                          <td className="py-2.5 px-3 text-right">
                            <span className="text-emerald-800 text-[11px] font-semibold bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                              Exemptible
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="p-4 rounded-lg bg-surface-subtle border border-border text-xs text-text-secondary leading-relaxed">
                  No elective courses found among active backlogs. Core departmental theory or laboratory courses cannot be exempted under JNTUH regulations.
                </div>
              )}
            </div>
          )}

          {/* University Citation Note */}
          <div className="p-3.5 rounded-lg bg-surface-subtle border border-border/60 text-[11px] text-text-muted font-mono leading-relaxed flex items-start gap-2">
            <Sparkles className="w-3.5 h-3.5 text-accent shrink-0 mt-0.5" />
            <div>
              <p className="text-text-secondary font-medium">
                {result.citation || 'JNTUH Academic Regulations Ordinances'}
              </p>
              <p className="mt-0.5">{result.disclaimer}</p>
            </div>
          </div>
        </div>
      )}

      {/* Official College Application Modal */}
      {showLetterModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xs">
          <div className="p-6 rounded-xl bg-surface-card border border-border max-w-2xl w-full space-y-4 shadow-xl">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <div className="flex items-center gap-2">
                <FileText className="w-4 h-4 text-accent" />
                <h3 className="text-sm font-semibold text-text-primary">
                  Official Application Letter Blueprint
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowLetterModal(false)}
                className="text-text-muted hover:text-text-primary cursor-pointer p-1"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-text-secondary">
              Pre-filled formal requisition letter addressed to your college examination branch and principal. Review, copy, or print.
            </p>

            <div className="p-4 rounded-lg bg-surface-subtle border border-border max-h-96 overflow-y-auto text-xs font-mono text-text-primary whitespace-pre-wrap leading-relaxed custom-scrollbar">
              {letterDraft}
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-border">
              <button
                type="button"
                onClick={printLetter}
                className="btn-secondary text-xs py-2 px-3.5 inline-flex items-center gap-1.5 cursor-pointer"
              >
                <Printer className="w-3.5 h-3.5" />
                <span>Print Formal Letter</span>
              </button>

              <button
                type="button"
                onClick={copyLetter}
                className="btn-primary text-xs py-2 px-3.5 inline-flex items-center gap-1.5 cursor-pointer"
              >
                <Copy className="w-3.5 h-3.5" />
                <span>Copy to Clipboard</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
