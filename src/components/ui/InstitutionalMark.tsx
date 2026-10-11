interface InstitutionalMarkProps {
  className?: string;
  size?: number;
}

/**
 * Bespoke Institutional Crest for JNTUH Academic Insights.
 * Designed with architectural precision: faceted geometric shield,
 * central technological delta chevron, and precision engineering crosshairs.
 * Avoids cliché graduation mortarboards and generic stock icons.
 */
export default function InstitutionalMark({ className = 'w-5 h-5', size }: InstitutionalMarkProps) {
  return (
    <svg
      viewBox="0 0 32 32"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      width={size}
      height={size}
      aria-hidden="true"
    >
      {/* Outer Faceted Engineering Shield / Octagonal Seal */}
      <path
        d="M16 2L28 7V17C28 23.5 22.8 28.8 16 30C9.2 28.8 4 23.5 4 17V7L16 2Z"
        fill="currentColor"
        fillOpacity="0.12"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />

      {/* Inner Precision Inset Border */}
      <path
        d="M16 5.2L25.2 9V16.8C25.2 21.8 21.2 26 16 27.2C10.8 26 6.8 21.8 6.8 16.8V9L16 5.2Z"
        stroke="currentColor"
        strokeWidth="0.75"
        strokeDasharray="2 1.5"
        strokeOpacity="0.4"
      />

      {/* Central Technological Delta Chevron (Greek Δ for Academic Progress) */}
      <path
        d="M16 8.5L22 19.5H10L16 8.5Z"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />

      {/* Inner Core Diamond / Focus Point */}
      <polygon
        points="16,12.5 18.5,16.5 16,18 13.5,16.5"
        fill="currentColor"
      />

      {/* Central Vertical Baseline Axis */}
      <line
        x1="16"
        y1="19.5"
        x2="16"
        y2="24"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />

      {/* Micro-alignment Crosshairs */}
      <circle cx="16" cy="24.5" r="1" fill="currentColor" />
    </svg>
  );
}
