import { isFreeAccessForAll } from "@/lib/pricing";

interface FreePeriodBannerProps {
  className?: string;
}

/**
 * Bandeau d'information sur la période de accès gratuit en cours.
 * Affiché uniquement entre le lancement (14 juin 2026) et le aujourd'hui inclus.
 * Indique les dates exactes pour rassurer les visiteurs.
 */
export const FreePeriodBanner = ({ className = "" }: FreePeriodBannerProps) => {
  // Masqué tant que l'accès est gratuit pour tous. Une fois le payant en
  // vigueur, il n'existe plus de période gratuite à annoncer : le bloc reste
  // masqué. Aucune date codée en dur (ancienne logique GRACE_END retirée).
  if (isFreeAccessForAll()) return null;
  return null;
  const lastDayLabel = "";
  const endLabel = "";

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
