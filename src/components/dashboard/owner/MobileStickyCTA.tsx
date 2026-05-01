import { memo } from "react";
import { useNavigate } from "react-router-dom";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";

interface MobileStickyCTAProps {
  /** Libellé personnalisé selon contexte (ex: "Voir les candidatures") */
  label?: string;
  /** Route cible (par défaut création d'annonce) */
  to?: string;
  /** Compteur optionnel (ex: nombre de candidatures en attente) */
  badge?: number;
}

/**
 * CTA sticky bas d'écran pour mobile uniquement.
 * Améliore l'ergonomie tactile en gardant l'action principale toujours accessible
 * sans scroll. Caché en md+ (le bouton du hero header prend le relais).
 */
const MobileStickyCTA = memo(({ label = "Publier une annonce", to = "/sits/create", badge }: MobileStickyCTAProps) => {
  const navigate = useNavigate();

  return (
    <div
      className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-background/95 backdrop-blur-sm border-t border-border px-4 py-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))] shadow-[0_-4px_12px_-4px_hsl(var(--foreground)/0.08)]"
      role="region"
      aria-label="Action principale"
    >
      <Button
        size="lg"
        onClick={() => navigate(to)}
        className="w-full rounded-xl relative"
      >
        <Plus className="h-4 w-4 mr-1.5" />
        {label}
        {badge !== undefined && badge > 0 && (
          <span
            className="absolute -top-1.5 -right-1.5 min-w-[20px] h-5 px-1.5 rounded-full bg-destructive text-destructive-foreground text-[11px] font-bold flex items-center justify-center"
            aria-label={`${badge} en attente`}
          >
            {badge > 9 ? "9+" : badge}
          </span>
        )}
      </Button>
    </div>
  );
});

MobileStickyCTA.displayName = "MobileStickyCTA";
export default MobileStickyCTA;
