/**
 * <AlmaAvatarLottie /> — avatar Alma animé via Lottie (bodymovin JSON).
 *
 * Segments (frames) mappés sur les markers de `/lottie/alma.json` :
 *   - idle     : [0, 60]  (boucle)
 *   - thinking : [60, 120] (boucle)
 *   - success  : [120, 160] (one-shot, retour idle à la fin)
 *
 * Fallback obligatoire vers <AlmaAvatar /> (SVG/PNG existant, 32px) si :
 *   - l'utilisateur préfère `prefers-reduced-motion: reduce`
 *   - le chargement du JSON échoue
 *
 * Décoratif : `aria-hidden="true"`, bounding box carrée de `size`.
 */
import { useEffect, useRef, useState } from "react";
import Lottie, { type LottieRefCurrentProps } from "lottie-react";
import { cn } from "@/lib/utils";
import { AlmaAvatar } from "./AlmaAvatar";

export type AlmaLottieState = "idle" | "thinking" | "success";

interface AlmaAvatarLottieProps {
  state?: AlmaLottieState;
  size?: number;
  src?: string;
  className?: string;
}

const SEGMENTS: Record<AlmaLottieState, [number, number]> = {
  idle: [0, 60],
  thinking: [60, 120],
  success: [120, 160],
};

function usePrefersReducedMotion(): boolean {
  const [reduced, setReduced] = useState<boolean>(() => {
    if (typeof window === "undefined") return false;
    return window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false;
  });
  useEffect(() => {
    if (typeof window === "undefined") return;
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const handler = (e: MediaQueryListEvent) => setReduced(e.matches);
    mq.addEventListener?.("change", handler);
    return () => mq.removeEventListener?.("change", handler);
  }, []);
  return reduced;
}

export function AlmaAvatarLottie({
  state = "idle",
  size = 32,
  src = "/lottie/alma.json",
  className,
}: AlmaAvatarLottieProps) {
  const reduced = usePrefersReducedMotion();
  const [animationData, setAnimationData] = useState<unknown | null>(null);
  const [failed, setFailed] = useState(false);
  const lottieRef = useRef<LottieRefCurrentProps>(null);

  useEffect(() => {
    if (reduced) return;
    let cancelled = false;
    fetch(src)
      .then((r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json();
      })
      .then((data) => {
        if (!cancelled) setAnimationData(data);
      })
      .catch(() => {
        if (!cancelled) setFailed(true);
      });
    return () => {
      cancelled = true;
    };
  }, [src, reduced]);

  // Segment switching
  useEffect(() => {
    const anim = lottieRef.current;
    if (!anim || !animationData) return;
    const [from, to] = SEGMENTS[state];
    const loop = state !== "success";
    anim.setLoop(loop);
    anim.playSegments([from, to], true);
  }, [state, animationData]);

  const handleComplete = () => {
    if (state !== "success") return;
    const anim = lottieRef.current;
    if (!anim) return;
    const [from, to] = SEGMENTS.idle;
    anim.setLoop(true);
    anim.playSegments([from, to], true);
  };

  const shouldFallback = reduced || failed;

  if (shouldFallback) {
    return (
      <span aria-hidden="true" className={cn("inline-block", className)} style={{ width: size, height: size }}>
        <AlmaAvatar size={32} aria-hidden />
      </span>
    );
  }

  return (
    <span
      aria-hidden="true"
      className={cn("inline-block", className)}
      style={{ width: size, height: size }}
    >
      {animationData ? (
        <Lottie
          lottieRef={lottieRef}
          animationData={animationData}
          autoplay
          loop
          onComplete={handleComplete}
          style={{ width: size, height: size }}
        />
      ) : (
        <AlmaAvatar size={32} aria-hidden />
      )}
    </span>
  );
}

export default AlmaAvatarLottie;
