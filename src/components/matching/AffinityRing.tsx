/**
 * Ring d'affinité premium partagé, extrait de SitterMatchSection (vague 2).
 *
 * Utilisé côté gardien (rencontre) ET côté propriétaire (star candidature)
 * pour ne jamais dupliquer le calcul visuel : même dégradé, même piste,
 * même animation, même popover d'explication.
 *
 * Signature : gradient linéaire pin -> olive -> or, piste #EDE7DE.
 * Animation strokeDashoffset au montage (360 ms), respectée si
 * prefers-reduced-motion. Popover d'explication au clic si `result` fourni.
 */
import { useEffect, useState } from "react";
import type { AffinityResult } from "@/lib/affinityScore";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import AffinityDetailsPopoverContent from "@/components/matching/AffinityDetailsPopoverContent";

interface Props {
  score: number;
  result?: AffinityResult | null;
  /** Diamètre du ring (px). Défaut 70. */
  size?: number;
}

const AffinityRing = ({ score, result, size = 70 }: Props) => {
  const stroke = 7;
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const clamped = Math.max(0, Math.min(100, Math.round(score)));
  const finalOffset = c - (clamped / 100) * c;

  const prefersReducedMotion =
    typeof window !== "undefined" &&
    window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
  const [mounted, setMounted] = useState(prefersReducedMotion);
  useEffect(() => {
    if (prefersReducedMotion) return;
    const raf = requestAnimationFrame(() => setMounted(true));
    return () => cancelAnimationFrame(raf);
  }, [prefersReducedMotion]);
  const offset = mounted ? finalOffset : c;

  const gradId = `matchRingGrad-${size}`;
  const centerFontSize = Math.round(size * 0.24);

  const ringSvg = (
    <>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <defs>
          <linearGradient id={gradId} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#2C6D50" />
            <stop offset="55%" stopColor="#7C8A45" />
            <stop offset="100%" stopColor="#C8A24B" />
          </linearGradient>
        </defs>
        <g transform={`rotate(-90 ${size / 2} ${size / 2})`}>
          <circle
            cx={size / 2}
            cy={size / 2}
            r={r}
            fill="none"
            stroke="#EDE7DE"
            strokeWidth={stroke}
          />
          <circle
            cx={size / 2}
            cy={size / 2}
            r={r}
            fill="none"
            stroke={`url(#${gradId})`}
            strokeWidth={stroke}
            strokeLinecap="round"
            strokeDasharray={c}
            strokeDashoffset={offset}
            style={{
              transition: prefersReducedMotion
                ? "none"
                : "stroke-dashoffset 360ms cubic-bezier(0,0,.2,1)",
            }}
          />
        </g>
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
        <span
          className="font-heading text-primary"
          style={{ fontSize: `${centerFontSize}px`, lineHeight: 1, fontWeight: 600 }}
        >
          {clamped}%
        </span>
        <span
          className="text-muted-foreground uppercase"
          style={{ fontSize: "7.5px", letterSpacing: "0.12em", marginTop: "2px" }}
        >
          Affinité
        </span>
      </div>
    </>
  );

  if (!result) {
    return (
      <div
        role="img"
        aria-label={`Affinité ${clamped} pour cent, calculée sur vos préférences communes`}
        className="relative shrink-0"
        style={{ width: size, height: size }}
      >
        {ringSvg}
      </div>
    );
  }

  const blockLink = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  return (
    <Popover>
      <span onClick={blockLink} className="inline-flex shrink-0">
        <PopoverTrigger asChild>
          <button
            type="button"
            aria-label={`Affinité ${clamped} pour cent, voir le détail du score.`}
            className="relative rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 cursor-pointer"
            style={{ width: size, height: size, minWidth: 44, minHeight: 44 }}
          >
            {ringSvg}
          </button>
        </PopoverTrigger>
      </span>
      <PopoverContent
        side="bottom"
        align="start"
        sideOffset={8}
        avoidCollisions
        collisionPadding={12}
        className="w-[300px] p-3 z-50"
        onOpenAutoFocus={(e) => e.preventDefault()}
      >
        <AffinityDetailsPopoverContent result={result} />
      </PopoverContent>
    </Popover>
  );
};

export default AffinityRing;
