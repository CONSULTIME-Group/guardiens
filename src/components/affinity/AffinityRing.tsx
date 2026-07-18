/**
 * Anneau d'affinité premium : SVG pur, dégradé design system → doré.
 * Utilisé pour valoriser une correspondance forte (dashboard gardien).
 */
import { useId } from "react";

interface Props {
  score: number;
  size?: number;
  label?: string;
}

const AffinityRing = ({ score, size = 92, label = "Affinité" }: Props) => {
  const safeScore = Math.max(0, Math.min(100, Math.round(score)));
  const stroke = 7;
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const dash = (safeScore / 100) * circumference;
  const gradId = `affinity-ring-grad-${useId().replace(/:/g, "")}`;

  return (
    <div
      role="img"
      aria-label={`Affinité ${safeScore} pour cent`}
      className="inline-flex flex-col items-center justify-center"
      style={{ width: size, height: size }}
    >
      <div className="relative" style={{ width: size, height: size }}>
        <svg
          width={size}
          height={size}
          viewBox={`0 0 ${size} ${size}`}
          style={{ transform: "rotate(-90deg)" }}
          aria-hidden="true"
        >
          <defs>
            <linearGradient id={gradId} x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="hsl(var(--primary))" />
              <stop offset="100%" stopColor="#E4B45B" />
            </linearGradient>
          </defs>
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke="hsl(var(--border))"
            strokeWidth={stroke}
          />
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke={`url(#${gradId})`}
            strokeWidth={stroke}
            strokeLinecap="round"
            strokeDasharray={`${dash} ${circumference - dash}`}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="font-heading text-primary font-bold leading-none" style={{ fontSize: size * 0.28 }}>
            {safeScore}%
          </span>
          <span
            className="mt-0.5 text-[9px] uppercase tracking-[1.5px] text-muted-foreground font-sans"
          >
            {label}
          </span>
        </div>
      </div>
    </div>
  );
};

export default AffinityRing;
