/**
 * Badge d'affinité propriétaire ↔ gardien.
 * Affiche un pourcentage et la liste des critères matchés.
 * Aucune icône Lucide ni emoji.
 *
 * Interaction : Popover (clic), pour fonctionner aussi bien tactile que
 * desktop. Un Tooltip Radix classique ne s'ouvre pas au tap mobile, ce qui
 * rendait le badge purement décoratif sur petit écran.
 *
 * Tracking : si `trackingContext` est fourni, le badge déclenche un event
 * `affinity_badge_seen` UNE seule fois par session (dédup via
 * `useImpressionOnce`) quand il devient visible à l'écran.
 */
import { useCallback, useRef, type MouseEvent } from "react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
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
  const wrapRef = useRef<HTMLButtonElement>(null);

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
        displayed: true,
      },
    });
  }, [trackingContext, trackingId, result]);

  useImpressionOnce(wrapRef, dedupeKey, onSeen);

  if (!result) return null;
  const sizing = size === "sm" ? "text-[11px] px-2 py-0.5" : "text-xs px-2.5 py-1";

  // Empêche les Link parents de naviguer quand on tape le badge.
  // NB : ne pas appeler preventDefault, sinon Radix annule l'ouverture du Popover.
  const stop = (e: MouseEvent) => {
    e.stopPropagation();
  };

  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          ref={wrapRef}
          type="button"
          onClick={stop}
          className={cn(
            "inline-flex items-center gap-1 rounded-full border font-semibold leading-none cursor-pointer",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1",
            sizing,
            tone(result.score),
            className,
          )}
          aria-label={`Affinité ${result.score}% sur ${result.total} critères, voir le détail`}
        >
          {result.score}% d'affinité
        </button>
      </PopoverTrigger>
      <PopoverContent
        side="bottom"
        align="center"
        sideOffset={6}
        avoidCollisions
        collisionPadding={12}
        className="w-[260px] p-3 z-50"
        onOpenAutoFocus={(e) => e.preventDefault()}
      >
        <p className="text-xs font-semibold mb-1.5 text-foreground">
          {result.score}% sur {result.total} critères communs
        </p>
        {result.matched.length > 0 ? (
          <ul className="space-y-0.5">
            {result.matched.map((m) => (
              <li key={m} className="text-xs text-muted-foreground leading-snug">
                · {m}
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-xs text-muted-foreground">Profils compatibles</p>
        )}
      </PopoverContent>
    </Popover>
  );
};

export default AffinityBadge;
