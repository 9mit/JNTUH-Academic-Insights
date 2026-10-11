import { useState, useEffect, useMemo } from 'react';
import {
  Search,
  ExternalLink,
  Sparkles,
  ChevronDown,
  ChevronRight,
  FileQuestion,
  Loader2,
} from 'lucide-react';

const API_BASE = import.meta.env.VITE_API_URL || '';

interface PYQLink {
  label: string;
  url: string;
  type: string;
}

interface PYQPack {
  subject_keys: string[];
  title: string;
  regulation: string[];
  links: PYQLink[];
  topics: string[];
}

interface UnitInfo {
  unit: number;
  title: string;
  weight_hint: 'high' | 'medium' | 'low';
  topics: string[];
}

// Fallback high-density blueprints for offline resilience
const CURATED_BLUEPRINTS: Record<string, { units: UnitInfo[]; tip: string }> = {
  'COMPILER DESIGN': {
    units: [
      { unit: 1, title: 'Lexical Analysis', weight_hint: 'high', topics: ['Tokens', 'Lexers', 'Regular expressions', 'NFA/DFA'] },
      { unit: 2, title: 'Syntax Analysis', weight_hint: 'high', topics: ['CFG', 'Parsing', 'FIRST/FOLLOW', 'LL/LR'] },
      { unit: 3, title: 'Semantic Analysis & IR', weight_hint: 'medium', topics: ['SDT', 'Type checking', 'Three-address code'] },
      { unit: 4, title: 'Runtime & Code Gen', weight_hint: 'medium', topics: ['Activation records', 'Heap/stack', 'Code generation'] },
      { unit: 5, title: 'Optimization', weight_hint: 'medium', topics: ['Peephole', 'Data-flow basics', 'Optimization techniques'] },
    ],
    tip: 'Prioritize Units 1–2 (lexical + parsing) — highest PYQ density for JNTUH supply papers.',
  },
  'SOFTWARE ENGINEERING': {
    units: [
      { unit: 1, title: 'Process Models', weight_hint: 'high', topics: ['Waterfall', 'Agile', 'Spiral', 'Prototyping'] },
      { unit: 2, title: 'Requirements', weight_hint: 'high', topics: ['SRS', 'Use cases', 'Functional vs non-functional'] },
      { unit: 3, title: 'Design', weight_hint: 'medium', topics: ['Architectural styles', 'Coupling/cohesion', 'UML'] },
      { unit: 4, title: 'Testing', weight_hint: 'high', topics: ['Unit/integration', 'Black/white box', 'Test cases'] },
      { unit: 5, title: 'Metrics & Maintenance', weight_hint: 'medium', topics: ['Quality metrics', 'Risk', 'Maintenance types'] },
    ],
    tip: 'Process models + testing appear in almost every supply paper — clear those first.',
  },
  'COMPUTER NETWORKS': {
    units: [
      { unit: 1, title: 'Intro & Physical', weight_hint: 'medium', topics: ['OSI/TCP-IP', 'Media', 'Switching'] },
      { unit: 2, title: 'Data Link', weight_hint: 'high', topics: ['Framing', 'CRC', 'ARQ', 'MAC'] },
      { unit: 3, title: 'Network Layer', weight_hint: 'high', topics: ['IP', 'Routing', 'Subnetting', 'ICMP'] },
      { unit: 4, title: 'Transport', weight_hint: 'high', topics: ['UDP/TCP', 'Congestion', 'Flow control'] },
      { unit: 5, title: 'Application', weight_hint: 'medium', topics: ['HTTP/DNS/SMTP', 'Sockets'] },
    ],
    tip: 'Units 2–4 (link/network/transport) carry the heaviest exam weight.',
  },
  'WEB TECHNOLOGIES': {
    units: [
      { unit: 1, title: 'HTML/CSS/JS', weight_hint: 'high', topics: ['DOM', 'Forms', 'Events', 'CSS layout'] },
      { unit: 2, title: 'XML & Servlets', weight_hint: 'medium', topics: ['XML/DTD', 'Servlet lifecycle'] },
      { unit: 3, title: 'JSP', weight_hint: 'high', topics: ['JSP tags', 'Sessions', 'Beans'] },
      { unit: 4, title: 'PHP & Databases', weight_hint: 'medium', topics: ['PHP basics', 'MySQL connectivity'] },
      { unit: 5, title: 'Client frameworks', weight_hint: 'medium', topics: ['AJAX', 'JSON', 'Modern JS'] },
    ],
    tip: 'HTML/JS + JSP questions dominate — practice end-to-end form→server flows.',
  },
  'MACHINE LEARNING': {
    units: [
      { unit: 1, title: 'ML Foundations', weight_hint: 'high', topics: ['Supervised vs unsupervised', 'Bias-variance'] },
      { unit: 2, title: 'Regression & Classification', weight_hint: 'high', topics: ['Linear/logistic', 'Decision trees', 'k-NN'] },
      { unit: 3, title: 'Neural Nets', weight_hint: 'medium', topics: ['Perceptron', 'Backprop basics'] },
      { unit: 4, title: 'Clustering & Dimensionality', weight_hint: 'medium', topics: ['k-means', 'PCA'] },
      { unit: 5, title: 'Evaluation', weight_hint: 'high', topics: ['Confusion matrix', 'Precision/recall', 'Cross-validation'] },
    ],
    tip: 'Definitions + algorithm steps + evaluation metrics are frequent supply targets.',
  },
  'FORMAL LANGUAGES & AUTOMATA THEORY': {
    units: [
      { unit: 1, title: 'Finite Automata', weight_hint: 'high', topics: ['DFA/NFA', 'Equivalence', 'Minimization'] },
      { unit: 2, title: 'Regular Expressions & Languages', weight_hint: 'high', topics: ['Pumping lemma', 'Grammars', 'Myhill-Nerode'] },
      { unit: 3, title: 'Context-Free Grammars', weight_hint: 'high', topics: ['Derivations', 'Ambiguity', 'CNF/GNF'] },
      { unit: 4, title: 'Pushdown Automata', weight_hint: 'medium', topics: ['PDA design', 'Equivalence with CFG'] },
      { unit: 5, title: 'Turing Machines', weight_hint: 'medium', topics: ['TM design', 'Decidability', 'Halting problem'] },
    ],
    tip: 'DFA minimization + CFG simplification are guaranteed questions in JNTUH exams.',
  },
};

export default function ExamBlueprintsHub() {
  const [packs, setPacks] = useState<PYQPack[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedRegulation, setSelectedRegulation] = useState<string>('all');
  const [expandedCourse, setExpandedCourse] = useState<string | null>('COMPILER DESIGN');

  useEffect(() => {
    const fetchPacks = async () => {
      try {
        const res = await fetch(`${API_BASE}/api/pyq/packs`);
        if (res.ok) {
          const data = await res.json();
          const packList = data.packs || data.items || [];
          if (Array.isArray(packList) && packList.length > 0) {
            setPacks(packList);
            return;
          }
        }
      } catch {
        // Fallback below
      }

      // Hardcoded fallback packs
      setPacks([
        {
          subject_keys: ['COMPILER DESIGN', '156AH'],
          title: 'Compiler Design — Exam Blueprint & PYQs',
          regulation: ['R18', 'R22'],
          links: [
            { label: 'Compiler Design Previous Papers (PDF)', url: 'https://www.google.com/search?q=JNTUH+Compiler+Design+previous+year+question+papers+PDF', type: 'search' },
            { label: 'JNTUH Question Papers Central Archive', url: 'https://www.google.com/search?q=JNTUH+previous+question+papers+site%3Ajntuh.ac.in+OR+site%3Ajntufastupdates.com', type: 'search' },
          ],
          topics: ['Lexical analysis', 'Parsers', 'SDT', 'Code optimization'],
        },
        {
          subject_keys: ['SOFTWARE ENGINEERING', '155DB'],
          title: 'Software Engineering — Exam Blueprint & PYQs',
          regulation: ['R18', 'R22'],
          links: [
            { label: 'Software Engineering Past Question Papers', url: 'https://www.google.com/search?q=JNTUH+Software+Engineering+previous+year+question+paper+PDF', type: 'search' },
          ],
          topics: ['SDLC', 'SRS', 'Testing', 'Metrics'],
        },
        {
          subject_keys: ['COMPUTER NETWORKS', '155AN'],
          title: 'Computer Networks — Exam Blueprint & PYQs',
          regulation: ['R18', 'R22'],
          links: [
            { label: 'Computer Networks Previous Question Papers', url: 'https://www.google.com/search?q=JNTUH+Computer+Networks+previous+year+question+paper+PDF', type: 'search' },
          ],
          topics: ['OSI Model', 'IP Routing', 'TCP/UDP', 'Congestion Control'],
        },
        {
          subject_keys: ['WEB TECHNOLOGIES', '155DN'],
          title: 'Web Technologies — Exam Blueprint & PYQs',
          regulation: ['R18', 'R22'],
          links: [
            { label: 'Web Technologies Previous Question Papers', url: 'https://www.google.com/search?q=JNTUH+Web+Technologies+previous+year+question+paper+PDF', type: 'search' },
          ],
          topics: ['HTML/CSS/JS', 'Servlets', 'JSP Beans', 'PHP & MySQL'],
        },
        {
          subject_keys: ['MACHINE LEARNING', '156BN'],
          title: 'Machine Learning — Exam Blueprint & PYQs',
          regulation: ['R18', 'R22'],
          links: [
            { label: 'Machine Learning Question Papers Archive', url: 'https://www.google.com/search?q=JNTUH+Machine+Learning+previous+year+question+paper+PDF', type: 'search' },
          ],
          topics: ['Supervised Learning', 'Clustering', 'Neural Nets', 'Evaluation Metrics'],
        },
        {
          subject_keys: ['FORMAL LANGUAGES & AUTOMATA THEORY', '155BK', 'FLAT'],
          title: 'FLAT (Automata Theory) — Exam Blueprint & PYQs',
          regulation: ['R18', 'R22'],
          links: [
            { label: 'FLAT Previous Question Papers', url: 'https://www.google.com/search?q=JNTUH+Formal+Languages+Automata+Theory+previous+year+question+paper+PDF', type: 'search' },
          ],
          topics: ['DFA/NFA', 'CFG Grammars', 'Pushdown Automata', 'Turing Machines'],
        },
      ]);
      setLoading(false);
    };

    fetchPacks().finally(() => setLoading(false));
  }, []);

  const filteredPacks = useMemo(() => {
    return packs.filter((p) => {
      if (selectedRegulation !== 'all' && !p.regulation.includes(selectedRegulation)) {
        return false;
      }
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchTitle = p.title.toLowerCase().includes(q);
        const matchKey = p.subject_keys.some((k) => k.toLowerCase().includes(q));
        const matchTopic = p.topics.some((t) => t.toLowerCase().includes(q));
        return matchTitle || matchKey || matchTopic;
      }
      return true;
    });
  }, [packs, selectedRegulation, searchQuery]);

  return (
    <div className="space-y-6">
      {/* Controls Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        {/* Search */}
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-text-muted absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search course blueprints, subject codes, or topics..."
            className="w-full bg-surface-card border border-border focus:border-border-strong rounded-lg pl-9 pr-3.5 py-2 text-xs text-text-primary placeholder:text-text-muted outline-none"
          />
        </div>

        {/* Regulation Filter */}
        <div className="flex items-center gap-1 p-0.5 bg-surface-card border border-border rounded-lg text-xs self-start sm:self-auto">
          {['all', 'R22', 'R18'].map((r) => (
            <button
              key={r}
              type="button"
              onClick={() => setSelectedRegulation(r)}
              className={`px-3 py-1 rounded text-[11px] font-mono transition-colors cursor-pointer ${
                selectedRegulation === r
                  ? 'bg-surface-subtle text-text-primary font-semibold shadow-xs'
                  : 'text-text-muted hover:text-text-primary'
              }`}
            >
              {r === 'all' ? 'All Schemes' : `${r}`}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="p-12 text-center">
          <Loader2 className="w-6 h-6 animate-spin text-accent mx-auto" />
          <p className="text-xs text-text-muted mt-2">Loading exam blueprints...</p>
        </div>
      ) : filteredPacks.length === 0 ? (
        <div className="p-8 rounded-lg bg-surface-card border border-border text-center space-y-2">
          <p className="text-sm font-semibold text-text-primary">No blueprints match your filter</p>
          <p className="text-xs text-text-secondary">Try searching by subject abbreviation or switch to All Schemes.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredPacks.map((pack) => {
            const canonicalKey = pack.subject_keys[0];
            const blueprint = CURATED_BLUEPRINTS[canonicalKey] || null;
            const isExpanded = expandedCourse === canonicalKey;

            return (
              <div
                key={canonicalKey}
                className="rounded-lg bg-surface-card border border-border overflow-hidden transition-all shadow-xs"
              >
                {/* Header */}
                <div
                  onClick={() => setExpandedCourse(isExpanded ? null : canonicalKey)}
                  className="p-5 flex items-start sm:items-center justify-between gap-4 cursor-pointer hover:bg-surface-subtle/50 transition-colors"
                >
                  <div className="space-y-1.5 flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-accent bg-surface-subtle border border-border px-2 py-0.5 rounded">
                        {pack.subject_keys.slice(0, 2).join(' · ')}
                      </span>
                      {pack.regulation.map((r) => (
                        <span
                          key={r}
                          className="text-[10px] font-mono text-text-muted bg-surface-subtle px-1.5 py-0.2 rounded"
                        >
                          {r}
                        </span>
                      ))}
                    </div>

                    <h3 className="text-base font-semibold text-text-primary truncate">
                      {pack.title}
                    </h3>

                    {/* Topics chips */}
                    <div className="flex items-center gap-1.5 flex-wrap pt-0.5">
                      {pack.topics.map((t) => (
                        <span
                          key={t}
                          className="text-[11px] font-sans text-text-muted bg-surface-subtle px-2 py-0.5 rounded"
                        >
                          {t}
                        </span>
                      ))}
                    </div>
                  </div>

                  <div className="flex items-center gap-3 shrink-0">
                    <span className="text-xs font-mono text-accent hidden sm:inline">
                      {isExpanded ? 'Hide Blueprint' : 'View Blueprint'}
                    </span>
                    {isExpanded ? (
                      <ChevronDown className="w-4 h-4 text-accent" />
                    ) : (
                      <ChevronRight className="w-4 h-4 text-text-muted" />
                    )}
                  </div>
                </div>

                {/* Expanded Details */}
                {isExpanded && (
                  <div className="p-5 pt-0 border-t border-border/60 bg-surface-card/40 space-y-4">
                    {/* Faculty Study Tip */}
                    {blueprint?.tip && (
                      <div className="p-3.5 rounded-lg bg-surface-subtle border border-border text-xs text-text-secondary leading-relaxed flex items-start gap-2.5">
                        <Sparkles className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                        <div>
                          <strong className="text-text-primary font-mono text-[11px] uppercase">
                            JNTUH Examiner Revision Strategy:
                          </strong>
                          <p className="mt-0.5 text-text-secondary">{blueprint.tip}</p>
                        </div>
                      </div>
                    )}

                    {/* Unit Breakdown */}
                    {blueprint?.units && blueprint.units.length > 0 && (
                      <div className="space-y-2">
                        <span className="text-[10px] font-mono uppercase tracking-wider text-text-muted font-bold block">
                          Unit-Wise Weightage & Syllabus Breakdown
                        </span>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
                          {blueprint.units.map((u) => (
                            <div
                              key={u.unit}
                              className="p-3 rounded-lg bg-surface-subtle border border-border/80 space-y-1.5"
                            >
                              <div className="flex items-center justify-between">
                                <span className="text-xs font-semibold text-text-primary">
                                  Unit {u.unit}: {u.title}
                                </span>
                                <span
                                  className={`text-[10px] font-mono px-1.5 py-0.2 rounded font-medium ${
                                    u.weight_hint === 'high'
                                      ? 'bg-rose-50 text-rose-700 border border-rose-200 font-semibold'
                                      : 'bg-surface-card text-text-muted border border-border'
                                  }`}
                                >
                                  {u.weight_hint === 'high' ? 'High Exam Density' : 'Moderate Weight'}
                                </span>
                              </div>
                              <div className="flex flex-wrap gap-1">
                                {u.topics.map((top) => (
                                  <span
                                    key={top}
                                    className="text-[10px] font-mono text-text-muted bg-surface-card px-1.5 py-0.5 rounded"
                                  >
                                    {top}
                                  </span>
                                ))}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* PYQ Action Links */}
                    <div className="space-y-1.5 pt-1">
                      <span className="text-[10px] font-mono uppercase tracking-wider text-text-muted font-bold block">
                        Official Exam Question Paper Archives
                      </span>
                      <div className="flex flex-wrap gap-2">
                        {pack.links.map((link) => (
                          <a
                            key={link.label}
                            href={link.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="btn-secondary text-xs py-1.5 px-3 inline-flex items-center gap-1.5 cursor-pointer hover:border-accent/40"
                          >
                            <FileQuestion className="w-3.5 h-3.5 text-accent" />
                            <span>{link.label}</span>
                            <ExternalLink className="w-3 h-3 text-text-muted" />
                          </a>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
