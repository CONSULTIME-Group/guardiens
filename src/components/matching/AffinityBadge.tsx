/**
 * Badge d'affinité propriétaire ↔ gardien.
 * Affiche un pourcentage et la liste des critères matchés en tooltip.
 * Aucune icône Lucide ni emoji.
 *
 * Tracking : si `trackingContext` est fourni, le badge déclenche un event
 * `affinity_badge_seen` UNE seule fois par session (dédup via
 * `useImpressionOnce`) quand il devient visible à l'écran.
 */
import { useCallback, useRef } from "react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import type { AffinityResult } from "@/lib/affinityScore";
import { cn } from "@/lib/utils";
import { trackEvent } from "@/lib/analytics";
import { useImpressionOnce } from "@/hooks/useImpressionOnce";

interface AffinityBadgeProps {
  result: AffinityResult | null;
  size?: "sm" | "md";
  className?: string;
  /** Surface d'origine pour le tracking. Si absent, pas d'event. */
  trackingContext?: string;
  /** Identifiant complémentaire pour la dédup (ex: id de la cible). */
  trackingId?: string;
}

function tone(score: number): string {
  if (score >= 80) return "bg-success/15 text-success border-success/30";
  if (score >= 60) return "bg-primary/10 text-primary border-primary/25";
  if (score >= 40) return "bg-warning/15 text-warning border-warning/30";
  return "bg-muted text-muted-foreground border-border";
}

const AffinityBadge = ({
  result,
  size = "md",
  className,
  trackingContext,
  trackingId,
}: AffinityBadgeProps) => {
  const wrapRef = useRef<HTMLSpanElement>(null);

  const dedupeKey =
    trackingContext && result
      ? `affinity:${trackingContext}:${trackingId ?? "anon"}:${result.score}`
      : null;

  const onSeen = useCallback(() => {
    if (!trackingContext || !result) return;
    void trackEvent("affinity_badge_seen", {
      metadata: {
        context: trackingContext,
        score: result.score,
        total: result.total,
        target_id: trackingId ?? null,
      },
    });
  }, [trackingContext, trackingId, result]);

  useImpressionOnce(wrapRef, dedupeKey, onSeen);

  if (!result) return null;
  const sizing = size === "sm" ? "text-[11px] px-2 py-0.5" : "text-xs px-2.5 py-1";
  return (
    <TooltipProvider delayDuration={150}>
      <Tooltip>
        <TooltipTrigger asChild>
          <span
            ref={wrapRef}
            className={cn(
              "inline-flex items-center gap-1 rounded-full border font-semibold leading-none",
              sizing,
              tone(result.score),
              className,
            )}
            aria-label={`Affinité ${result.score}% sur ${result.total} critères`}
          >
            {result.score}% d'affinité
          </span>
        </TooltipTrigger>
        <TooltipContent side="top" className="max-w-[260px]">
          <p className="text-xs font-semibold mb-1">
            {result.score}% sur {result.total} critères communs
          </p>
          {result.matched.length > 0 ? (
            <ul className="space-y-0.5">
              {result.matched.map((m) => (
                <li key={m} className="text-xs text-muted-foreground">
                  · {m}
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-xs text-muted-foreground">Profils compatibles</p>
          )}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
};

export default AffinityBadge;
