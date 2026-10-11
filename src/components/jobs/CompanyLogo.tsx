import { useState } from 'react';
import { Building2, Sparkles, Cpu, Layers, Shield, Terminal, Zap } from 'lucide-react';

interface CompanyLogoProps {
  company: string;
  logoUrl?: string | null;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

// Curated high-fidelity corporate brand logos (inline clean SVGs for instant, zero-latency, 100% reliable rendering)
const BRAND_LOGOS: Record<string, { svg?: string; bg: string; icon?: React.ComponentType<{ className?: string }> }> = {
  // Tata Consultancy Services
  'tata consultancy services': {
    bg: 'bg-[#00263E]',
    svg: `<svg viewBox="0 0 120 40" fill="none" xmlns="http://www.w3.org/2000/svg">
      <text x="60" y="26" text-anchor="middle" font-family="system-ui, sans-serif" font-weight="900" font-size="24" fill="#FFFFFF" letter-spacing="2">TCS</text>
    </svg>`
  },
  'tcs': {
    bg: 'bg-[#00263E]',
    svg: `<svg viewBox="0 0 120 40" fill="none" xmlns="http://www.w3.org/2000/svg">
      <text x="60" y="26" text-anchor="middle" font-family="system-ui, sans-serif" font-weight="900" font-size="24" fill="#FFFFFF" letter-spacing="2">TCS</text>
    </svg>`
  },
  // Infosys
  'infosys ltd': {
    bg: 'bg-[#007CC3]',
    svg: `<svg viewBox="0 0 120 40" fill="none" xmlns="http://www.w3.org/2000/svg">
      <text x="60" y="27" text-anchor="middle" font-family="system-ui, sans-serif" font-weight="800" font-size="20" fill="#FFFFFF" letter-spacing="0.5">Infosys</text>
    </svg>`
  },
  'infosys': {
    bg: 'bg-[#007CC3]',
    svg: `<svg viewBox="0 0 120 40" fill="none" xmlns="http://www.w3.org/2000/svg">
      <text x="60" y="27" text-anchor="middle" font-family="system-ui, sans-serif" font-weight="800" font-size="20" fill="#FFFFFF" letter-spacing="0.5">Infosys</text>
    </svg>`
  },
  // Cognizant
  'cognizant technology solutions': {
    bg: 'bg-[#0033A0]',
    svg: `<svg viewBox="0 0 120 40" fill="none" xmlns="http://www.w3.org/2000/svg">
      <text x="60" y="26" text-anchor="middle" font-family="system-ui, sans-serif" font-weight="800" font-size="16" fill="#FFFFFF" letter-spacing="0.5">Cognizant</text>
    </svg>`
  },
  'cognizant': {
    bg: 'bg-[#0033A0]',
    svg: `<svg viewBox="0 0 120 40" fill="none" xmlns="http://www.w3.org/2000/svg">
      <text x="60" y="26" text-anchor="middle" font-family="system-ui, sans-serif" font-weight="800" font-size="16" fill="#FFFFFF" letter-spacing="0.5">Cognizant</text>
    </svg>`
  },
  // Wipro
  'wipro': {
    bg: 'bg-[#001D4A]',
    svg: `<svg viewBox="0 0 120 40" fill="none" xmlns="http://www.w3.org/2000/svg">
      <text x="60" y="27" text-anchor="middle" font-family="system-ui, sans-serif" font-weight="800" font-size="20" fill="#FFFFFF" letter-spacing="1">wipro</text>
    </svg>`
  },
  // Accenture
  'accenture': {
    bg: 'bg-[#A100FF]',
    svg: `<svg viewBox="0 0 120 40" fill="none" xmlns="http://www.w3.org/2000/svg">
      <text x="60" y="27" text-anchor="middle" font-family="system-ui, sans-serif" font-weight="800" font-size="16" fill="#FFFFFF" letter-spacing="0.5">&gt;accenture</text>
    </svg>`
  },
  // Hitec City NextGen AI Labs
  'hitec city nextgen ai labs': {
    bg: 'bg-gradient-to-tr from-cyan-600 via-indigo-600 to-blue-700',
    icon: Cpu,
  },
  // Telangana Digital Innovation Centre
  'telangana digital innovation centre': {
    bg: 'bg-gradient-to-tr from-amber-600 via-emerald-600 to-teal-700',
    icon: Sparkles,
  },
  // Credit Wellness
  'credit wellness, llc': {
    bg: 'bg-gradient-to-tr from-emerald-600 to-teal-800',
    icon: Shield,
  },
  // Unio Digital
  'unio digital': {
    bg: 'bg-gradient-to-tr from-indigo-600 to-violet-800',
    icon: Layers,
  },
  // CodeForAI
  'codeforai': {
    bg: 'bg-gradient-to-tr from-blue-600 to-cyan-800',
    icon: Terminal,
  },
  // IAPWE
  'iapwe': {
    bg: 'bg-gradient-to-tr from-purple-600 to-pink-800',
    icon: Zap,
  },
};

// Deterministic vibrant color palettes for company monograms
const GRADIENT_PALETTES = [
  'from-blue-600 to-indigo-700',
  'from-emerald-600 to-teal-700',
  'from-violet-600 to-purple-800',
  'from-cyan-600 to-blue-700',
  'from-amber-600 to-orange-700',
  'from-rose-600 to-pink-700',
  'from-sky-600 to-indigo-800',
  'from-indigo-600 to-fuchsia-700',
];

function getMonogram(name: string): string {
  if (!name) return 'CO';
  const clean = name.replace(/[^a-zA-Z0-9\s]/g, '').trim();
  const words = clean.split(/\s+/).filter(Boolean);
  if (words.length >= 2) {
    return (words[0][0] + words[1][0]).toUpperCase();
  }
  return clean.slice(0, 2).toUpperCase() || 'CO';
}

function getPaletteIndex(name: string): number {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  return Math.abs(hash) % GRADIENT_PALETTES.length;
}

export default function CompanyLogo({
  company,
  logoUrl,
  size = 'md',
  className = '',
}: CompanyLogoProps) {
  const [imgFailed, setImgFailed] = useState(false);

  const cleanName = (company || 'Company').toLowerCase().trim();
  const brand = BRAND_LOGOS[cleanName];

  const sizeClass = {
    sm: 'w-8 h-8 text-xs',
    md: 'w-10 h-10 text-xs',
    lg: 'w-12 h-12 text-sm',
  }[size];

  // 1. If Brand has curated SVG logo
  if (brand?.svg) {
    return (
      <div
        className={`${sizeClass} rounded-lg ${brand.bg} p-1.5 flex items-center justify-center shrink-0 shadow-sm overflow-hidden border border-white/10 ${className}`}
        title={company}
      >
        <div
          className="w-full h-full flex items-center justify-center"
          dangerouslySetInnerHTML={{ __html: brand.svg }}
        />
      </div>
    );
  }

  // 2. If Brand has curated icon
  if (brand?.icon) {
    const Icon = brand.icon;
    const monogram = getMonogram(company);
    return (
      <div
        className={`${sizeClass} rounded-lg ${brand.bg} text-white flex flex-col items-center justify-center shrink-0 shadow-sm border border-white/10 ${className}`}
        title={company}
      >
        <Icon className="w-4 h-4 mb-0.5 opacity-90" />
        <span className="font-mono font-bold tracking-tight text-[9px] leading-none">{monogram}</span>
      </div>
    );
  }

  // 3. If logoUrl exists and hasn't failed yet
  if (logoUrl && !imgFailed) {
    return (
      <div
        className={`${sizeClass} rounded-lg bg-surface-subtle border border-border flex items-center justify-center shrink-0 overflow-hidden ${className}`}
        title={company}
      >
        <img
          src={logoUrl}
          alt={company}
          className="w-full h-full object-contain p-1"
          loading="lazy"
          onError={() => setImgFailed(true)}
        />
      </div>
    );
  }

  // 4. Guaranteed Monogram Badge (Never Empty!)
  const monogram = getMonogram(company);
  const palette = GRADIENT_PALETTES[getPaletteIndex(company)];

  return (
    <div
      className={`${sizeClass} rounded-lg bg-gradient-to-br ${palette} text-white flex flex-col items-center justify-center font-mono font-bold shrink-0 shadow-sm border border-white/10 select-none ${className}`}
      title={company}
    >
      <Building2 className="w-3 h-3 mb-0.5 opacity-75" />
      <span className="text-[10px] tracking-wider leading-none">{monogram}</span>
    </div>
  );
}
