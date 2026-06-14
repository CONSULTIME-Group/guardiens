/**
 * Barre d'action sticky mobile pour la vue gardien d'une annonce.
 * Visible uniquement < md, fixée en bas de l'écran, respecte safe-area iOS.
 * Se masque discrètement au scroll-down et réapparaît au scroll-up (pattern 2026).
 */
import { Button } from "@/components/ui/button";
import { CheckCircle2 } from "lucide-react";
import FavoriteButton from "@/components/shared/FavoriteButton";
import { trackEvent, trackCtaClick } from "@/lib/analytics";
import { useScrollDirection } from "@/hooks/useScrollDirection";

interface SitMobileStickyApplyProps {
  sitId: string;
  state: "apply" | "applied" | "closed" | "blocked";
  onApply: () => void;
}

const SitMobileStickyApply = ({ sitId, state, onApply }: SitMobileStickyApplyProps) => {
  const scrollDir = useScrollDirection(12);

  if (state === "blocked") return null;

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
