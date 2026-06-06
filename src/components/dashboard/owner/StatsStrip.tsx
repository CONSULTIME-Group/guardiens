import { memo } from "react";
import { Link } from "react-router-dom";
import { Info } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface StatItem {
  value: number | string | null;
  label: string;
  fallback?: string;
  highlight?: boolean;
  to?: string;
  /** Si défini et value === 0, affiche un placeholder neutre («, ») au lieu d'un « 0 » grisé. */
  emptyHint?: string;
  /** Texte explicatif affiché au survol/tap d'une petite icône info à côté du label. */
  tooltip?: string;
}

interface StatsStripProps {
  items: StatItem[];
}

/**
 * Strip horizontal compact de stats, pensé pour s'intégrer sous une carte de pilotage
 * (vs. cards séparées). Chaque item garde son affordance cliquable si `to` est fourni.
 */
const StatsStrip = memo(({ items }: StatsStripProps) => {
  // Grille adaptative : 3 items → 3 colonnes (pas d'orphelin), 4 items → 2×2 mobile / 4 desktop.
  const gridCols =
    items.length === 3
      ? "grid-cols-3"
      : "grid-cols-2 md:grid-cols-4";
  return (
    <TooltipProvider delayDuration={150}>
      <section
        aria-label="Vos statistiques propriétaire"
        className={`grid ${gridCols} divide-y md:divide-y-0 md:divide-x divide-border rounded-2xl border border-border bg-card overflow-hidden transition-shadow duration-300 hover:shadow-sm`}
      >
      {items.map((item, idx) => {
        const isZero = item.value === 0 || item.value === "0";
        const showEmptyHint = isZero && !!item.emptyHint;
        const valueColor = item.highlight
          ? "text-primary"
          : isZero
            ? "text-muted-foreground/60"
            : "text-foreground";

        const inner = (clickable: boolean) => (
          <div className="px-4 py-3 text-center md:text-left">
            {item.value !== null && !showEmptyHint ? (
              <p
                className={`text-xl md:text-2xl font-heading font-bold leading-none transition-transform duration-200 ease-out ${valueColor} ${clickable ? "group-hover:-translate-y-0.5" : ""}`}
              >
                {item.value}
              </p>
            ) : showEmptyHint ? (
              <p className="text-xl md:text-2xl font-heading font-bold leading-none text-muted-foreground/40" aria-label={item.emptyHint}>,</p>
            ) : (
              <p className="text-sm text-muted-foreground leading-none mt-1">{item.fallback}</p>
            )}
            <p className={`text-[10px] md:text-[11px] uppercase tracking-wider text-muted-foreground font-sans mt-1.5 transition-colors duration-200 inline-flex items-center gap-1 justify-center md:justify-start ${clickable ? "group-hover:text-foreground/80" : ""}`}>
              <span>{item.label}</span>
              {item.tooltip && (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button
                      type="button"
                      onClick={(e) => { e.preventDefault(); e.stopPropagation(); }}
                      className="inline-flex items-center justify-center rounded-full text-muted-foreground/70 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                      aria-label={`En savoir plus sur ${item.label}`}
                    >
                      <Info className="h-3 w-3" aria-hidden="true" />
                    </button>
                  </TooltipTrigger>
                  <TooltipContent side="top" className="max-w-[240px] text-xs leading-relaxed normal-case tracking-normal">
                    {item.tooltip}
                  </TooltipContent>
                </Tooltip>
              )}
            </p>
          </div>
        );

        if (item.to) {
          return (
            <Link
              key={idx}
              to={item.to}
              className="group block transition-colors duration-200 hover:bg-muted/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset"
              aria-label={`${item.label}${item.value !== null ? ` : ${item.value}` : ""}`}
            >
              {inner(true)}
            </Link>
          );
        }
        return <div key={idx}>{inner(false)}</div>;
      })}
      </section>
    </TooltipProvider>
  );
});

StatsStrip.displayName = "StatsStrip";
export default StatsStrip;
