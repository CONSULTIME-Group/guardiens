/**
 * Barre d'action sticky mobile pour la vue gardien d'une annonce.
 * Visible uniquement < md, fixée en bas de l'écran, respecte safe-area iOS.
 * Combine favori + CTA principal pour maximiser la conversion sur mobile.
 */
import { Button } from "@/components/ui/button";
import { CheckCircle2 } from "lucide-react";
import FavoriteButton from "@/components/shared/FavoriteButton";
import { trackEvent, trackCtaClick } from "@/lib/analytics";

interface SitMobileStickyApplyProps {
  sitId: string;
  /** Statut bouton, derive du même code que l'apply bar du haut */
  state: "apply" | "applied" | "closed" | "blocked";
  onApply: () => void;
}

const SitMobileStickyApply = ({ sitId, state, onApply }: SitMobileStickyApplyProps) => {
  if (state === "blocked") return null;

  return (
    <div
      className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-background border-t border-border px-3 pt-2.5 pb-[calc(0.75rem+env(safe-area-inset-bottom))] shadow-lg"
      role="region"
      aria-label="Actions rapides sur cette garde"
    >
      <div className="flex items-center gap-2">
        <FavoriteButton targetType="sit" targetId={sitId} size="md" className="shrink-0" />
        {state === "applied" ? (
          <Button className="flex-1 h-11 text-sm font-semibold" disabled>
            <CheckCircle2 className="h-4 w-4 mr-2" aria-hidden="true" /> Candidature envoyée
          </Button>
        ) : state === "closed" ? (
          <Button className="flex-1 h-11 text-sm font-semibold" disabled>
            Candidatures en cours d'analyse
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
            Postuler à cette garde
          </Button>
        )}
      </div>
    </div>
  );
};

export default SitMobileStickyApply;
