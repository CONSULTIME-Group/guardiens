/**
 * Barre d'action sticky mobile pour la vue gardien d'une annonce.
 * Visible uniquement < md, fixée en bas de l'écran, respecte safe-area iOS.
 * Se masque discrètement au scroll-down et réapparaît au scroll-up (pattern 2026).
 */
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { CheckCircle2 } from "lucide-react";
import FavoriteButton from "@/components/shared/FavoriteButton";
import { trackEvent, trackCtaClick } from "@/lib/analytics";
import { useScrollDirection } from "@/hooks/useScrollDirection";
import { useStarVisibilityGate } from "@/hooks/useStarVisibilityGate";

interface SitMobileStickyApplyProps {
  sitId: string;
  state: "apply" | "applied" | "closed" | "blocked" | "complete_profile";
  onApply: () => void;
  /** Ouvre la complétion de profil en place, sans quitter l'annonce. */
  onCompleteProfile?: () => void;
  /** Mention sous le bouton, adaptée aux critères réellement manquants. */
  completeProfileHint?: string;
  /** Motif court affiché en mobile quand la candidature n'est pas encore ouverte. */
  blockedReason?: string;
  blockedCtaTo?: string;
  blockedCtaLabel?: string;
}

const SitMobileStickyApply = ({
  sitId,
  state,
  onApply,
  onCompleteProfile,
  completeProfileHint = "Quelques informations de profil suffisent pour postuler",
  blockedReason = "Complétez votre profil pour postuler",
  blockedCtaTo,
  blockedCtaLabel,
}: SitMobileStickyApplyProps) => {
  const scrollDir = useScrollDirection(12);
  const applyBarVisible = useStarVisibilityGate("sitter");

  if (applyBarVisible) return null;

  return (
    <div
      className={[
        "md:hidden fixed bottom-16 left-0 right-0 z-40",
        "bg-background border-t border-border px-3 py-2.5",
        "shadow-[0_-4px_12px_-4px_hsl(var(--foreground)/0.08)]",
        "transition-transform duration-300 ease-in-out",
        scrollDir === "down" ? "translate-y-full" : "translate-y-0",
      ].join(" ")}
      role="region"
      aria-label="Actions rapides sur cette garde"
    >
      <div className="flex items-center gap-2">
        <FavoriteButton targetType="sit" targetId={sitId} size="md" className="shrink-0" />
        {state === "applied" ? (
          <Button className="flex-1 h-11 text-sm font-semibold" disabled>
            <CheckCircle2 className="h-4 w-4 mr-2" aria-hidden="true" /> Candidature envoyée
          </Button>
        ) : state === "complete_profile" ? (
          <div className="flex-1 min-w-0">
            <Button
              className="w-full h-11 text-sm font-semibold shadow-sm"
              onClick={() => {
                trackEvent("sit_apply_clicked", {
                  source: "sit_detail_mobile_sticky_gate",
                  metadata: { sit_id: sitId },
                });
                onCompleteProfile?.();
              }}
            >
              Postuler pour cette garde
            </Button>
            <p className="mt-1 text-center text-[11px] text-muted-foreground">
              {completeProfileHint}
            </p>
          </div>
        ) : state === "blocked" ? (
          <div className="flex-1 min-w-0">
            <Button className="w-full h-11 text-sm font-semibold" disabled>
              {blockedReason}
            </Button>
            {blockedCtaTo && blockedCtaLabel && (
              <Link
                to={blockedCtaTo}
                className="block mt-1 text-center text-xs font-medium text-primary underline underline-offset-2"
              >
                {blockedCtaLabel}
              </Link>
            )}
          </div>
        ) : state === "closed" ? (
          <Button className="flex-1 h-11 text-sm font-semibold" disabled>
            Candidatures fermées
          </Button>
        ) : (
          <Button
            className="flex-1 h-11 text-sm font-semibold shadow-sm"
            onClick={() => {
              trackEvent("sit_apply_clicked", {
                source: "sit_detail_mobile_sticky",
                metadata: { sit_id: sitId },
              });
              trackCtaClick("sit_apply", "sit_detail_mobile_sticky", { sit_id: sitId });
              onApply();
            }}
          >
            Postuler pour cette garde
          </Button>
        )}
      </div>
    </div>
  );
};

export default SitMobileStickyApply;
