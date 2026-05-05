import { cn } from '@/lib/utils';

/**
 * Lumenfi Logo Mark — the prism + coin icon
 * Use as: <LogoMark size={48} />
 */
export function LogoMark({ size = 40, className }: { size?: number; className?: string }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 200 200"
      xmlns="http://www.w3.org/2000/svg"
      className={cn('shrink-0', className)}
      aria-label="Lumenfi"
    >
      <defs>
        <linearGradient id="lm-light" x1="20%" y1="20%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#FFFBEB"/><stop offset="55%" stopColor="#FCD34D"/><stop offset="100%" stopColor="#FBBF24"/>
        </linearGradient>
        <linearGradient id="lm-mid" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#FCD34D"/><stop offset="100%" stopColor="#D97706"/>
        </linearGradient>
        <linearGradient id="lm-deep" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#D97706"/><stop offset="100%" stopColor="#7C2D12"/>
        </linearGradient>
        <linearGradient id="lm-shadow" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#B45309"/><stop offset="100%" stopColor="#1C0701"/>
        </linearGradient>
        <radialGradient id="lm-coin" cx="35%" cy="28%" r="80%">
          <stop offset="0%" stopColor="#FFFBEB"/><stop offset="40%" stopColor="#FCD34D"/><stop offset="80%" stopColor="#B45309"/><stop offset="100%" stopColor="#7C2D12"/>
        </radialGradient>        <radialGradient id="lm-aura">
          <stop offset="0%" stopColor="#FCD34D" stopOpacity="0.22"/><stop offset="55%" stopColor="#FCD34D" stopOpacity="0.06"/><stop offset="100%" stopColor="#FCD34D" stopOpacity="0"/>
        </radialGradient>
        <radialGradient id="lm-spark">
          <stop offset="0%" stopColor="#FCD34D" stopOpacity="0.55"/><stop offset="100%" stopColor="#FCD34D" stopOpacity="0"/>
        </radialGradient>      </defs>
      <rect width="200" height="200" rx="44" fill="#000000"/>
      <circle cx="100" cy="100" r="88" fill="url(#lm-aura)"/>
      <g>
        <circle cx="50" cy="50" r="15" fill="url(#lm-spark)"/>
        <path d="M50 36 L52.5 47.5 L64 50 L52.5 52.5 L50 64 L47.5 52.5 L36 50 L47.5 47.5 Z" fill="#FFFBEB"/>
        <circle cx="150" cy="50" r="15" fill="url(#lm-spark)"/>
        <path d="M150 36 L152.5 47.5 L164 50 L152.5 52.5 L150 64 L147.5 52.5 L136 50 L147.5 47.5 Z" fill="#FFFBEB"/>
        <circle cx="50" cy="150" r="15" fill="url(#lm-spark)"/>
        <path d="M50 136 L52.5 147.5 L64 150 L52.5 152.5 L50 164 L47.5 152.5 L36 150 L47.5 147.5 Z" fill="#FFFBEB"/>
        <circle cx="150" cy="150" r="15" fill="url(#lm-spark)"/>
        <path d="M150 136 L152.5 147.5 L164 150 L152.5 152.5 L150 164 L147.5 152.5 L136 150 L147.5 147.5 Z" fill="#FFFBEB"/>
      </g>
      <polygon points="100,28 100,100 34,100" fill="url(#lm-light)"/>
      <polygon points="100,28 166,100 100,100" fill="url(#lm-mid)"/>
      <polygon points="34,100 100,100 100,172" fill="url(#lm-deep)"/>
      <polygon points="100,100 166,100 100,172" fill="url(#lm-shadow)"/>
      <polygon points="100,28 166,100 100,172 34,100" fill="none" stroke="#FCD34D" strokeWidth="0.6" opacity="0.45"/>
      <line x1="100" y1="28" x2="100" y2="172" stroke="#FEF3C7" strokeWidth="0.4" opacity="0.35"/>
      <line x1="34" y1="100" x2="166" y2="100" stroke="#FEF3C7" strokeWidth="0.4" opacity="0.25"/>
      <circle cx="100" cy="100" r="38" fill="url(#lm-coin)"/>
      <circle cx="100" cy="100" r="36" fill="none" stroke="#451A03" strokeWidth="0.8" opacity="0.6"/>
      <circle cx="100" cy="100" r="32.5" fill="none" stroke="#451A03" strokeWidth="0.5" opacity="0.4"/>
      <text x="100" y="119" textAnchor="middle" fontFamily="Georgia, 'Times New Roman', serif" fontSize="46" fontWeight="700" fill="#1C0701">L</text>
      <rect x="3" y="3" width="194" height="194" rx="41" fill="none" stroke="#D97706" strokeWidth="0.7" opacity="0.3"/>
    </svg>
  );
}

/**
 * Wordmark — "Lumen·fi" with gold "fi"
 */
export function Wordmark({ className, light = false }: { className?: string; light?: boolean }) {
  return (
    <span
      className={cn(
        'font-bold tracking-tight',
        light ? 'text-white' : 'text-foreground',
        className
      )}
    >
      Lumen<span className="font-extrabold text-[#F59E0B]">fi</span>
    </span>
  );
}
