import { cn } from '@/lib/utils';

/**
 * Lumenfi Logo Mark — Aurum Quietus
 * Gradient gold L with 24 rays radiating outward (light dimming with distance)
 * on deep ink black with a warm radial glow.
 */
export function LogoMark({ size = 40, className }: { size?: number; className?: string }) {
  // Pre-compute the 24 rays using polar coordinates
  const rays = Array.from({ length: 24 }, (_, i) => {
    const ang = (i / 24) * 2 * Math.PI - Math.PI / 2;
    const innerR = 200 * 0.22;
    const outerR = 200 * 0.45;
    const cx = 100;
    const cy = 100;
    return {
      x1: cx + innerR * Math.cos(ang),
      y1: cy + innerR * Math.sin(ang),
      x2: cx + outerR * Math.cos(ang),
      y2: cy + outerR * Math.sin(ang),
    };
  });

  // L geometry — tapered: stem 12% / foot 8% of letter height
  const Lh = 200 * 0.42;
  const stemW = Lh * 0.12;
  const footH = Lh * 0.08;
  const footW = Lh * 0.50;
  const opticalOffset = (footW - stemW) * 0.18;
  const left = 100 - footW / 2 - opticalOffset;
  const top = 100 - Lh / 2;
  const serifW = Math.max(1, Lh * 0.025);
  const serifE = Math.max(1, Lh * 0.04);

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 200 200"
      xmlns="http://www.w3.org/2000/svg"
      className={cn(className)}
    >
      <defs>
        <radialGradient id="lm-bg" cx="50%" cy="40%" r="55%">
          <stop offset="0%" stopColor="#1E170E" />
          <stop offset="100%" stopColor="#0A090C" />
        </radialGradient>
        <linearGradient id="lm-ray" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#E4C789" stopOpacity="0.94" />
          <stop offset="100%" stopColor="#8A6932" stopOpacity="0.24" />
        </linearGradient>
        <radialGradient id="lm-halo" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#E4C789" stopOpacity="0.20" />
          <stop offset="100%" stopColor="#E4C789" stopOpacity="0" />
        </radialGradient>
        <clipPath id="lm-clip">
          <rect x="0" y="0" width="200" height="200" rx="44" ry="44" />
        </clipPath>
      </defs>
      <g clipPath="url(#lm-clip)">
        <rect width="200" height="200" fill="url(#lm-bg)" />
        <circle cx="100" cy="100" r="45" fill="url(#lm-halo)" />
        <g stroke="url(#lm-ray)" strokeWidth="0.8" fill="none" strokeLinecap="round">
          {rays.map((r, i) => (
            <line key={i} x1={r.x1} y1={r.y1} x2={r.x2} y2={r.y2} />
          ))}
        </g>
        {/* L — vertical stem */}
        <rect x={left} y={top} width={stemW} height={Lh} fill="#C9A45A" />
        {/* L — horizontal foot */}
        <rect x={left} y={top + Lh - footH} width={footW} height={footH} fill="#C9A45A" />
        {/* Serifs (only render visibly above ~24px size) */}
        <rect x={left - serifE} y={top} width={stemW + 2 * serifE} height={serifW} fill="#C9A45A" />
        <rect
          x={left + footW - serifW}
          y={top + Lh - footH - serifE}
          width={serifW}
          height={footH + serifE}
          fill="#C9A45A"
        />
        <rect
          x={left}
          y={top + Lh - footH - serifE}
          width={serifW}
          height={serifE}
          fill="#C9A45A"
        />
      </g>
    </svg>
  );
}

/**
 * Lumenfi Wordmark — elegant tracked serif feel.
 * Uses regular tracking for legibility but keeps a distinctive serif-y character
 * by emphasizing the brand color shift on "fi".
 */
export function Wordmark({ className }: { className?: string }) {
  return (
    <span
      className={cn(
        'font-medium tracking-[0.08em]',
        // serif feel via Georgia/Charter as a small upgrade from generic sans
        // (most browsers fall back to a similar quiet serif)
        '[font-family:Georgia,"Times_New_Roman",serif]',
        className
      )}
    >
      Lumen<span className="text-amber-500">fi</span>
    </span>
  );
}
