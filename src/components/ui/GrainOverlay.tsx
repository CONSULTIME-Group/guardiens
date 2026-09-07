import { useId } from "react";
import { cn } from "@/lib/utils";

/**
 * GrainOverlay : grain de papier en superposition sur les grandes surfaces
 * unies (fond crème, bloc sombre). Un feTurbulence fractal désaturé rendu
 * en rect plein cadre, opacité très faible (environ 4 %), pour casser la
 * planéité numérique. Couche distincte du grain interne des illustrations
 * peintes. Purement décoratif : aria-hidden et pointer-events none.
 */
export function GrainOverlay({
  opacity = 0.04,
  className,
}: {
  opacity?: number;
  className?: string;
}) {
  const rawId = useId();
  const filterId = `grain-${rawId.replace(/:/g, "")}`;

  return (
    <svg
      aria-hidden="true"
      focusable="false"
      className={cn("pointer-events-none absolute inset-0 h-full w-full", className)}
      style={{ opacity }}
    >
      <defs>
        <filter id={filterId} x="0" y="0" width="100%" height="100%">
          <feTurbulence
            type="fractalNoise"
            baseFrequency="0.9"
            numOctaves="2"
            stitchTiles="stitch"
            result="n"
          />
          {/* Alpha issu du bruit, couleur noire, fond transparent :
              sinon le rect rend un carré gris visible. */}
          <feColorMatrix
            in="n"
            type="matrix"
            values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  1.2 1.2 1.2 0 -1.4"
          />
        </filter>
      </defs>
      <rect width="100%" height="100%" filter={`url(#${filterId})`} />
    </svg>
  );
}
