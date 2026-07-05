import { isInGracePeriod, GRACE_END } from "@/lib/constants";
import { isPricingActive } from "@/lib/pricing";

interface FreeTickerChipProps {
  /** Variante d'affichage : sur fond sombre (hero) ou sur fond clair */
  variant?: "onDark" | "onLight";
  className?: string;
  /** Texte affiché hors période de accès gratuit (fallback). Si null, ne rend rien. */
  fallback?: string | null;
}

/**
 * Petit "ticker" discret rappelant la accès gratuit en cours sans engagement.
 * - Pendant la période : pastille pulsée + texte daté.
 * - Hors période : optionnel fallback (ex. "Gratuit pour les propriétaires").
 */
export const FreeTickerChip = ({
  variant = "onDark",
  className = "",
  fallback = "Gratuit pour les propriétaires",
}: FreeTickerChipProps) => {
  // Pivot pricing sans deadline : composant désactivé tant que PRICING_IS_ACTIVE = false.
  if (!isPricingActive()) return null;
  const active = isInGracePeriod();


  // Dernier jour inclus = 30 septembre (GRACE_END exclusif au 1er octobre 00:00)
  const lastFreeDay = new Date(GRACE_END.getTime() - 24 * 60 * 60 * 1000);
  const lastDayLabel = lastFreeDay.toLocaleDateString("fr-FR", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  if (!active && !fallback) return null;

  const base =
    "inline-flex items-center gap-2 rounded-full px-4 py-1.5 backdrop-blur-sm border";
  const palette =
    variant === "onDark"
      ? "bg-white/15 border-white/30 text-white"
      : "bg-success/10 border-success/30 text-foreground";

  if (!active) {
    return (
      <div className={`${base} ${palette} ${className}`}>
        <span className="font-body text-xs tracking-wide">{fallback}</span>
      </div>
    );
  }

  return (
    <div
      className={`${base} ${palette} ${className}`}
      role="status"
      aria-live="polite"
    >
      <span className="relative flex h-2 w-2" aria-hidden="true">
        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-success opacity-75" />
        <span className="relative inline-flex h-2 w-2 rounded-full bg-success" />
      </span>
      <span className="font-body text-xs tracking-wide">
        <span className="font-semibold">Gratuit pour tous</span>
        <span className="opacity-85"> · jusqu'au {lastDayLabel}</span>
      </span>
    </div>
  );
};

export default FreeTickerChip;
