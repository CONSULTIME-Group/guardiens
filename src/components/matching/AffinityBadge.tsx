/**
 * Badge d'affinité propriétaire ↔ gardien.
 *
 * DOCTRINE (lot affinité août 2026) : ON TRIE, ON N'ÉLIMINE JAMAIS.
 * Le chip est TOUJOURS rendu dès qu'un résultat existe :
 *  - le chiffre s'affiche si `result.scoreReliable` (assez de critères,
 *    dont au moins un critère dur), sinon le chip invite à compléter ;
 *  - une incompatibilité déclarée (allergie, refus) n'efface pas le score :
 *    le ton devient neutre et le popover liste les freins en clair.
 *
 * Les seuils 60/80 sont des seuils de MISE EN AVANT (highlight), jamais
 * d'affichage : ils choisissent un ton visuel fort ou la variante
 * « semantic », sans masquer quoi que ce soit en dessous.
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
import {
  AFFINITY_HIGHLIGHT_SCORE_PERCENT,
  AFFINITY_HIGHLIGHT_STRONG_SCORE_PERCENT,
  type AffinityResult,
} from "@/lib/affinityScore";
import { cn } from "@/lib/utils";
import { trackEvent } from "@/lib/analytics";
import { useImpressionOnce } from "@/hooks/useImpressionOnce";
import AffinityDetailsPopoverContent from "./AffinityDetailsPopoverContent";

interface AffinityBadgeProps {
  result: AffinityResult | null;
  size?: "sm" | "md";
  className?: string;
  /** Surface d'origine pour le tracking. Si absent, pas d'event. */
  trackingContext?: string;
  /** Identifiant complémentaire pour la dédup (ex: id de la cible). */
  trackingId?: string;
  /**
   * "numeric" (défaut) : affiche le pourcentage (si le score est fiable).
   * "semantic" : pill de MISE EN AVANT avec libellé « Très compatible » /
   * « Compatible ». C'est un choix de recommandation : en dessous du seuil
   * highlight, ou si le score n'est pas fiable, ou en cas d'incompatibilité
   * déclarée, la variante semantic ne se monte pas (le chip numeric reste
   * disponible pour l'affichage).
   */
  variant?: "numeric" | "semantic";
}

function tone(result: AffinityResult): string {
  // Incompatibilité déclarée : ton neutre, le popover explique. Jamais de
  // signal « succès » sur un refus déclaré.
  if (result.hasDeclaredIncompatibility) {
    return "bg-muted text-muted-foreground border-border";
  }
  if (result.score >= AFFINITY_HIGHLIGHT_STRONG_SCORE_PERCENT) {
    return "bg-success/15 text-success border-success/30";
  }
  if (result.score >= AFFINITY_HIGHLIGHT_SCORE_PERCENT) {
    return "bg-primary/10 text-primary border-primary/25";
  }
  // Sous le seuil highlight : ton neutre, pas de warning orange qui suggère un problème.
  return "bg-muted text-muted-foreground border-border";
}

function semanticLabel(result: AffinityResult): string | null {
  if (!result.scoreReliable || result.hasDeclaredIncompatibility) return null;
  if (result.score >= AFFINITY_HIGHLIGHT_STRONG_SCORE_PERCENT) return "Très compatible";
  if (result.score >= AFFINITY_HIGHLIGHT_SCORE_PERCENT) return "Compatible";
  return null;
}

const AffinityBadge = ({
  result,
  size = "md",
  className,
  trackingContext,
  trackingId,
  variant = "numeric",
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

  // Variante « semantic » = pure mise en avant : absente sous le seuil
  // highlight, si le score n'est pas fiable, ou si un refus est déclaré.
  const label = variant === "semantic" ? semanticLabel(result) : null;
  if (variant === "semantic" && !label) return null;

  const sizing = size === "sm" ? "text-[11px] px-2 py-0.5" : "text-xs px-2.5 py-1";

  const blockLink = (e: MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  // Le chiffre ne s'affiche que s'il est fiable ; sinon le chip reste présent
  // et invite à ouvrir le détail (on trie, on n'élimine jamais).
  const numericText = result.scoreReliable
    ? `${result.score}% d'affinité`
    : "Affinité en cours";
  const displayText = variant === "semantic" ? label : numericText;
  const ariaLabel =
    variant === "semantic"
      ? `${label} (${result.score}% d'affinité), voir le détail`
      : result.scoreReliable
        ? `Affinité ${result.score}% (${result.total} critères sur 8 comparés), voir le détail`
        : `Affinité en cours d'estimation (${result.total} critères comparés), voir le détail`;

  // Fiabilité cosmétique : « partiel » si le chiffre n'est pas affichable,
  // « complet » si l'éventail de critères est large.
  const reliability: "complete" | "partial" | "neutral" =
    !result.scoreReliable || result.total <= 3
      ? "partial"
      : result.total >= 6
        ? "complete"
        : "neutral";

  const chipClass = "text-[10px] font-medium px-2 py-0.5 rounded-full leading-none";

  return (
    <Popover>
      <span onClick={blockLink} className="inline-flex items-center gap-1.5">
        <PopoverTrigger asChild>
          <button
            ref={wrapRef}
            type="button"
            className={cn(
              "inline-flex items-center gap-1 rounded-full border font-semibold leading-none cursor-pointer",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1",
              sizing,
              tone(result),
              className,
            )}
            aria-label={ariaLabel}
          >
            {variant === "semantic" && (
              <span aria-hidden className="mr-0.5 opacity-70">✦</span>
            )}
            {displayText}
          </button>
        </PopoverTrigger>
        {variant === "numeric" && reliability === "partial" && (
          <span className={cn(chipClass, "bg-warning/10 text-warning-foreground border border-warning/30")}>
            Score partiel
          </span>
        )}
        {variant === "numeric" && reliability === "complete" && (
          <span className={cn(chipClass, "bg-success/10 text-success border border-success/30")}>
            Score complet
          </span>
        )}
      </span>
      <PopoverContent
        side="bottom"
        align="center"
        sideOffset={6}
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

export default AffinityBadge;
