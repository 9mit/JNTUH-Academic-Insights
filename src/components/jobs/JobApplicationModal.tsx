import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, CheckCircle2, AlertCircle, Loader2, Send, ShieldCheck, Sparkles, User, Mail, Phone, GraduationCap, Link2, FileText } from 'lucide-react';
import type { JobPosting, ApplicationSubmission } from '../../types/jobs';
import { submitJobApplication } from '../../api/jobsApi';
import { useAcademic } from '../../context/AcademicContext';

interface JobApplicationModalProps {
  job: JobPosting | null;
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export default function JobApplicationModal({
  job,
  isOpen,
  onClose,
  onSuccess,
}: JobApplicationModalProps) {
  const { data, getCGPA } = useAcademic();
  const cgpaResult = getCGPA();

  const [formData, setFormData] = useState<ApplicationSubmission>({
    applicant_name: '',
    email: '',
    phone: '',
    hall_ticket: '',
    degree_branch: '',
    graduation_year: new Date().getFullYear(),
    cgpa: undefined,
    resume_url: '',
    portfolio_url: '',
    cover_note: '',
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [submittedSuccess, setSubmittedSuccess] = useState(false);
  const [applicationId, setApplicationId] = useState<string | null>(null);

  // Prefill academic profile details if student has data loaded
  useEffect(() => {
    if (isOpen && job) {
      setErrorMessage(null);
      setSubmittedSuccess(false);
      setApplicationId(null);

      const calculatedCgpa = cgpaResult.cgpa > 0 ? Number(cgpaResult.cgpa.toFixed(2)) : undefined;

      setFormData((prev: ApplicationSubmission) => ({
        ...prev,
        applicant_name: prev.applicant_name || data.studentName || '',
        hall_ticket: prev.hall_ticket || data.hallTicket || '',
        cgpa: prev.cgpa ?? calculatedCgpa,
      }));
    }
  }, [isOpen, job, data.studentName, data.hallTicket, cgpaResult.cgpa]);

  if (!isOpen || !job) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    // Basic client validation
    if (!formData.applicant_name?.trim()) {
      setErrorMessage('Full name is required.');
      return;
    }
    if (!formData.email?.trim() || !formData.email.includes('@')) {
      setErrorMessage('A valid email address is required.');
      return;
    }
    if (!formData.resume_url?.trim()) {
      setErrorMessage('Resume link (Google Drive, Dropbox, or portfolio PDF) is required.');
      return;
    }

    try {
      setIsSubmitting(true);
      const payload = {
        ...formData,
        student_name: formData.applicant_name,
        degree: formData.degree_branch,
      };
      const res = await submitJobApplication(job.id, payload);
      if (res.application_id) {
        setSubmittedSuccess(true);
        setApplicationId(res.application_id);
        onSuccess?.();
      } else {
        setErrorMessage(res.message || 'Failed to submit application. Please verify your details.');
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'An unexpected error occurred during submission.';
      setErrorMessage(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 overflow-y-auto">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black/75 backdrop-blur-sm"
          onClick={() => !isSubmitting && onClose()}
        />

        <motion.div
          initial={{ opacity: 0, scale: 0.98, y: 12 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.98, y: 12 }}
          transition={{ duration: 0.2 }}
          className="relative w-full max-w-2xl bg-surface-card border border-border-strong rounded-xl shadow-2xl overflow-hidden my-8 z-10"
        >
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-border bg-surface-subtle">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[11px] font-mono tracking-wider uppercase text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded font-semibold">
                  Direct Campus Submission
                </span>
                <span className="text-xs text-text-muted">{job.company}</span>
              </div>
              <h2 className="text-lg font-semibold text-text-primary mt-1">
                Apply for {job.title}
              </h2>
            </div>
            <button
              onClick={onClose}
              disabled={isSubmitting}
              className="p-1.5 text-text-muted hover:text-text-primary hover:bg-surface-subtle rounded-lg transition-colors cursor-pointer"
              aria-label="Close"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Success Confirmation View */}
          {submittedSuccess ? (
            <div className="p-8 text-center space-y-4">
              <div className="w-12 h-12 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-600 flex items-center justify-center mx-auto">
                <CheckCircle2 className="w-6 h-6" />
              </div>
              <div className="space-y-1">
                <h3 className="text-lg font-semibold text-text-primary">Application Submitted</h3>
                <p className="text-sm text-text-secondary max-w-md mx-auto">
                  Your application for <span className="text-text-primary font-semibold">{job.title}</span> at <span className="text-text-primary font-semibold">{job.company}</span> has been received and verified.
                </p>
              </div>

              <div className="p-4 bg-surface-subtle border border-border rounded-lg text-left max-w-md mx-auto text-xs space-y-2 font-mono">
                <div className="flex justify-between">
                  <span className="text-text-muted">Reference ID:</span>
                  <span className="text-emerald-700 font-semibold">{applicationId}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-text-muted">Applicant:</span>
                  <span className="text-text-primary font-medium">{formData.applicant_name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-text-muted">Contact Email:</span>
                  <span className="text-text-primary font-medium">{formData.email}</span>
                </div>
                {formData.hall_ticket && (
                  <div className="flex justify-between">
                    <span className="text-text-muted">Hall Ticket:</span>
                    <span className="text-text-primary font-medium">{formData.hall_ticket}</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span className="text-text-muted">Submitted:</span>
                  <span className="text-text-secondary">{new Date().toLocaleString()}</span>
                </div>
              </div>

              <div className="pt-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="btn-primary px-6 py-2.5 text-xs font-semibold cursor-pointer"
                >
                  Done
                </button>
              </div>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              {/* Context prefill hint */}
              {(data.studentName || data.hallTicket) && (
                <div className="flex items-center gap-2 p-2.5 bg-accent-subtle border border-accent/20 rounded-lg text-xs text-accent-blue-deep">
                  <Sparkles className="w-3.5 h-3.5 text-accent shrink-0" />
                  <span>
                    Academic profile detected: Name and Hall Ticket prefilled from your loaded scorecards.
                  </span>
                </div>
              )}

              {/* Error Banner */}
              {errorMessage && (
                <div className="flex items-center gap-2 p-3 bg-rose-50 border border-rose-200 rounded-lg text-xs text-rose-700">
                  <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
                  <span>{errorMessage}</span>
                </div>
              )}

              {/* Form Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Full Name */}
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-text-secondary flex items-center gap-1.5">
                    <User className="w-3.5 h-3.5 text-text-muted" />
                    Full Name <span className="text-rose-600">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.applicant_name}
                    onChange={e => setFormData({ ...formData, applicant_name: e.target.value })}
                    placeholder="e.g. Rahul Sharma"
                    className="w-full bg-surface-subtle border border-border focus:border-accent rounded-lg px-3 py-2 text-sm text-text-primary placeholder:text-text-muted outline-none transition-colors"
                  />
                </div>

                {/* Email Address */}
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-text-secondary flex items-center gap-1.5">
                    <Mail className="w-3.5 h-3.5 text-text-muted" />
                    Email Address <span className="text-rose-600">*</span>
                  </label>
                  <input
                    type="email"
                    required
                    value={formData.email}
                    onChange={e => setFormData({ ...formData, email: e.target.value })}
                    placeholder="student@example.com"
                    className="w-full bg-surface-subtle border border-border focus:border-accent rounded-lg px-3 py-2 text-sm text-text-primary placeholder:text-text-muted outline-none transition-colors"
                  />
                </div>

                {/* Phone */}
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-text-secondary flex items-center gap-1.5">
                    <Phone className="w-3.5 h-3.5 text-text-muted" />
                    Phone Number
                  </label>
                  <input
                    type="tel"
                    value={formData.phone || ''}
                    onChange={e => setFormData({ ...formData, phone: e.target.value })}
                    placeholder="+91 98765 43210"
                    className="w-full bg-surface-subtle border border-border focus:border-accent rounded-lg px-3 py-2 text-sm text-text-primary placeholder:text-text-muted outline-none transition-colors"
                  />
                </div>

                {/* Hall Ticket Number */}
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-text-secondary flex items-center gap-1.5">
                    <GraduationCap className="w-3.5 h-3.5 text-text-muted" />
                    Hall Ticket / Roll No.
                  </label>
                  <input
                    type="text"
                    value={formData.hall_ticket || ''}
                    onChange={e => setFormData({ ...formData, hall_ticket: e.target.value })}
                    placeholder="21XXXXX101"
                    className="w-full bg-surface-subtle border border-border focus:border-accent rounded-lg px-3 py-2 text-sm text-text-primary font-mono placeholder:text-text-muted outline-none transition-colors"
                  />
                </div>

                {/* Degree & Branch */}
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-text-secondary">
                    Branch / Major
                  </label>
                  <input
                    type="text"
                    value={formData.degree_branch || ''}
                    onChange={e => setFormData({ ...formData, degree_branch: e.target.value })}
                    placeholder="e.g. B.Tech Computer Science"
                    className="w-full bg-surface-subtle border border-border focus:border-accent rounded-lg px-3 py-2 text-sm text-text-primary placeholder:text-text-muted outline-none transition-colors"
                  />
                </div>

                {/* CGPA */}
                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-text-secondary">
                      CGPA
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      max="10"
                      value={formData.cgpa !== undefined ? formData.cgpa : ''}
                      onChange={e => setFormData({ ...formData, cgpa: e.target.value ? parseFloat(e.target.value) : undefined })}
                      placeholder="e.g. 8.45"
                      className="w-full bg-surface-subtle border border-border focus:border-accent rounded-lg px-3 py-2 text-sm text-text-primary placeholder:text-text-muted outline-none transition-colors"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-text-secondary">
                      Graduation Year
                    </label>
                    <input
                      type="number"
                      value={formData.graduation_year || new Date().getFullYear()}
                      onChange={e => setFormData({ ...formData, graduation_year: parseInt(e.target.value) || undefined })}
                      placeholder="2025"
                      className="w-full bg-surface-subtle border border-border focus:border-accent rounded-lg px-3 py-2 text-sm text-text-primary placeholder:text-text-muted outline-none transition-colors"
                    />
                  </div>
                </div>
              </div>

              {/* Links */}
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-text-secondary flex items-center gap-1.5">
                  <Link2 className="w-3.5 h-3.5 text-text-muted" />
                  Resume URL <span className="text-rose-600">*</span>
                </label>
                <input
                  type="url"
                  required
                  value={formData.resume_url}
                  onChange={e => setFormData({ ...formData, resume_url: e.target.value })}
                  placeholder="https://drive.google.com/file/d/... or PDF link"
                  className="w-full bg-surface-subtle border border-border focus:border-accent rounded-lg px-3 py-2 text-sm text-text-primary placeholder:text-text-muted outline-none transition-colors"
                />
                <p className="text-[11px] text-text-muted">
                  Ensure the link is publicly accessible for the hiring team.
                </p>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-medium text-text-secondary flex items-center gap-1.5">
                  <Link2 className="w-3.5 h-3.5 text-text-muted" />
                  GitHub / Portfolio / LinkedIn (Optional)
                </label>
                <input
                  type="url"
                  value={formData.portfolio_url || ''}
                  onChange={e => setFormData({ ...formData, portfolio_url: e.target.value })}
                  placeholder="https://github.com/... or LinkedIn"
                  className="w-full bg-surface-subtle border border-border focus:border-accent rounded-lg px-3 py-2 text-sm text-text-primary placeholder:text-text-muted outline-none transition-colors"
                />
              </div>

              {/* Statement */}
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-text-secondary flex items-center gap-1.5">
                  <FileText className="w-3.5 h-3.5 text-text-muted" />
                  Brief Note (Optional)
                </label>
                <textarea
                  rows={2}
                  value={formData.cover_note || ''}
                  onChange={e => setFormData({ ...formData, cover_note: e.target.value })}
                  placeholder="Summarize your key engineering projects, coursework, or why you're interested..."
                  className="w-full bg-surface-subtle border border-border focus:border-accent rounded-lg px-3 py-2 text-sm text-text-primary placeholder:text-text-muted outline-none transition-colors resize-none"
                />
              </div>

              {/* Footer */}
              <div className="pt-3 border-t border-border flex items-center justify-between">
                <div className="flex items-center gap-1.5 text-[11px] text-text-muted">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Secure direct submission</span>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={onClose}
                    disabled={isSubmitting}
                    className="btn-secondary text-xs py-2 px-3.5 cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="btn-primary text-xs py-2 px-4 inline-flex items-center gap-2 cursor-pointer disabled:opacity-50"
                  >
                    {isSubmitting ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        Submitting...
                      </>
                    ) : (
                      <>
                        <Send className="w-3.5 h-3.5" />
                        Submit Application
                      </>
                    )}
                  </button>
                </div>
              </div>
            </form>
          )}
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
