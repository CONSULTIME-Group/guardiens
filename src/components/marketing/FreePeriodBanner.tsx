import { isInGracePeriod, GRACE_END } from "@/lib/constants";
import { isPricingActive } from "@/lib/pricing";

interface FreePeriodBannerProps {
  className?: string;
}

/**
 * Bandeau d'information sur la période de accès gratuit en cours.
 * Affiché uniquement entre le lancement (14 juin 2026) et le aujourd'hui inclus.
 * Indique les dates exactes pour rassurer les visiteurs.
 */
export const FreePeriodBanner = ({ className = "" }: FreePeriodBannerProps) => {
  // Pivot pricing sans deadline : composant désactivé tant que PRICING_IS_ACTIVE = false.
  if (!isPricingActive()) return null;
  if (!isInGracePeriod()) return null;

  const endLabel = GRACE_END.toLocaleDateString("fr-FR", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
  // GRACE_END est exclusif (1er octobre 00:00) → dernier jour inclus = 30 septembre
  const lastFreeDay = new Date(GRACE_END.getTime() - 24 * 60 * 60 * 1000);
  const lastDayLabel = lastFreeDay.toLocaleDateString("fr-FR", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  return (
    <div
      role="status"
      aria-live="polite"
      className={`w-full border-y border-success/30 bg-success/10 text-success-foreground ${className}`}
    >
      <div className="container mx-auto flex flex-col items-center justify-center gap-1 px-4 py-2.5 text-center text-sm sm:flex-row sm:gap-3">
        <span className="font-semibold">Gratuit pour tous</span>
        <span className="text-foreground/80">
          jusqu'au {lastDayLabel} inclus, abonnement requis à partir du {endLabel}.
        </span>
      </div>
    </div>
  );
};

export default FreePeriodBanner;
