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
import { Link } from "react-router-dom";
import { Sparkles } from "lucide-react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Alert, AlertDescription } from "@/components/ui/alert";
import type { AffinityResult } from "@/lib/affinityScore";
import { cn } from "@/lib/utils";
import { trackEvent } from "@/lib/analytics";
import { useImpressionOnce } from "@/hooks/useImpressionOnce";
import { useAuth } from "@/contexts/AuthContext";

interface AffinityBadgeProps {
  result: AffinityResult | null;
  size?: "sm" | "md";
  className?: string;
  /** Surface d'origine pour le tracking. Si absent, pas d'event. */
  trackingContext?: string;
  /** Identifiant complémentaire pour la dédup (ex: id de la cible). */
  trackingId?: string;
  /**
   * "numeric" (défaut) : affiche le pourcentage.
   * "semantic" : pill ton-sur-ton avec libellé « Très compatible » / « Compatible »
   * (rien si score < 60). Recommandé sur les cartes de résultats de recherche
   * pour éviter l'effet marketplace algorithmique froid (recherche UX 2026).
   */
  variant?: "numeric" | "semantic";
}

function tone(score: number): string {
  if (score >= 80) return "bg-success/15 text-success border-success/30";
  if (score >= 60) return "bg-primary/10 text-primary border-primary/25";
  // ≥40 (seuil d'affichage) : ton neutre, pas de warning orange qui suggère un problème.
  return "bg-muted text-muted-foreground border-border";
}

function semanticLabel(score: number): string | null {
  if (score >= 80) return "Très compatible";
  if (score >= 60) return "Compatible";
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
  const { activeRole } = useAuth();

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

  // Variante sémantique : rien en-dessous de 60% (silence = pas de bruit visuel).
  const label = variant === "semantic" ? semanticLabel(result.score) : null;
  if (variant === "semantic" && !label) return null;

  const sizing = size === "sm" ? "text-[11px] px-2 py-0.5" : "text-xs px-2.5 py-1";

  // Empêche la navigation du Link parent SANS bloquer l'ouverture du Popover.
  const blockLink = (e: MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const displayText =
    variant === "semantic" ? label : `${result.score}% d'affinité`;
  const ariaLabel =
    variant === "semantic"
      ? `${label} (${result.score}% d'affinité), voir le détail`
      : `Affinité ${result.score}% (${result.total} critères sur 7 comparés), voir le détail`;

  // Fiabilité selon le nombre de critères comparés
  const reliability: "complete" | "partial" | "neutral" =
    result.total >= 6 ? "complete" : result.total <= 3 ? "partial" : "neutral";

  const chipClass = "text-[10px] font-medium px-2 py-0.5 rounded-full leading-none";
  const profilePath = activeRole === "owner" ? "/owner-profile" : "/profile";

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
              tone(result.score),
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
        <p className="text-xs font-semibold mb-1.5 text-foreground">
          {result.score}% de compatibilité{reliability === "partial" ? " (score partiel)" : ""}
        </p>
        {result.matched.length > 0 ? (
          <ul className="space-y-0.5 mb-2">
            {result.matched.map((m) => (
              <li key={m} className="text-xs text-muted-foreground leading-snug">
                · {m}
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-xs text-muted-foreground mb-2">Profils compatibles</p>
        )}
        <p className="text-[11px] text-muted-foreground/80">
          {result.total} critère{result.total > 1 ? "s" : ""} comparé{result.total > 1 ? "s" : ""} sur 7 possibles.
        </p>
        {reliability === "partial" && (
          <>
            <Alert className="mt-2 border-warning/40 bg-warning/5">
              <AlertDescription className="text-[11px] leading-snug text-foreground">
                Score partiel : 4 critères ne sont pas encore mesurables (rythme de vie, langues, intérêts, ambiance foyer). Le score gagne en précision avec chaque champ complété, du vôtre comme du gardien.
              </AlertDescription>
            </Alert>
            <Link
              to={profilePath}
              onClick={(e) => e.stopPropagation()}
              className="mt-2 inline-flex items-center gap-1.5 rounded-md bg-primary px-3 py-1.5 text-[11px] font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
            >
              <Sparkles className="h-3 w-3" aria-hidden />
              Compléter mon profil
            </Link>
          </>
        )}
        {reliability === "complete" && (
          <p className="mt-2 pt-2 border-t border-border text-[11px] font-medium text-success">
            Score complet, très fiable.
          </p>
        )}
      </PopoverContent>
    </Popover>
  );
};

export default AffinityBadge;
