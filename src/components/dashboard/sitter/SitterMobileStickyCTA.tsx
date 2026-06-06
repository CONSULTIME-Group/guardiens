import { memo } from "react";
import { useNavigate } from "react-router-dom";
import { Search, MessageSquare, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";

interface SitterMobileStickyCTAProps {
  pendingAppsCount?: number;
  unreadCount?: number;
}

/**
 * CTA sticky mobile pour le dashboard gardien.
 * Priorise messages > candidatures > recherche selon contexte.
 */
const SitterMobileStickyCTA = memo(({ pendingAppsCount = 0, unreadCount = 0 }: SitterMobileStickyCTAProps) => {
  const navigate = useNavigate();

  // Priorité contextuelle : messages non lus > candidatures.
  // Empty state (aucun message / aucune candidature) : on MASQUE le sticky,
  // car le Hero porte déjà un CTA « Découvrir les gardes », éviter le doublon
  // et récupérer ~72 px d'espace vertical sur mobile.
  let label = "";
  let to = "";
  let badge: number | undefined;
  let Icon = Search;

  if (unreadCount > 0) {
    label = "Voir mes messages";
    to = "/messages";
    badge = unreadCount;
    Icon = MessageSquare;
  } else if (pendingAppsCount > 0) {
    label = "Mes candidatures";
    to = "/sits";
    badge = pendingAppsCount;
    Icon = FileText;
  } else {
    return null;
  }

  return (
    <div
      // Posé EXACTEMENT au-dessus de la BottomNav (h-16 = 64px) pour éviter
      // la superposition sticky CTA / nav mobile.
      className="md:hidden fixed bottom-16 left-0 right-0 z-40 bg-background/95 backdrop-blur-sm border-t border-border px-4 py-3 shadow-[0_-4px_12px_-4px_hsl(var(--foreground)/0.08)]"
      role="region"
      aria-label="Action principale gardien"
    >
      <Button
        size="lg"
        onClick={() => navigate(to)}
        className="w-full rounded-xl relative"
      >
        <Icon className="h-4 w-4 mr-1.5" aria-hidden="true" />
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

SitterMobileStickyCTA.displayName = "SitterMobileStickyCTA";
export default SitterMobileStickyCTA;
