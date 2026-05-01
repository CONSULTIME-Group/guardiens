import { memo } from "react";
import { Link } from "react-router-dom";

interface StatItem {
  value: number | string | null;
  label: string;
  fallback?: string;
  highlight?: boolean;
  to?: string;
}

interface StatsStripProps {
  items: StatItem[];
}

/**
 * Strip horizontal compact de stats — pensé pour s'intégrer sous une carte de pilotage
 * (vs. cards séparées). Chaque item garde son affordance cliquable si `to` est fourni.
 */
const StatsStrip = memo(({ items }: StatsStripProps) => {
  return (
    <section
      aria-label="Vos statistiques propriétaire"
      className="grid grid-cols-2 md:grid-cols-4 divide-y md:divide-y-0 md:divide-x divide-border rounded-2xl border border-border bg-card overflow-hidden"
    >
      {items.map((item, idx) => {
        const isZero = item.value === 0 || item.value === "0";
        const valueColor = item.highlight
          ? "text-primary"
          : isZero
            ? "text-muted-foreground/60"
            : "text-foreground";

        const inner = (
          <div className="px-4 py-3 text-center md:text-left">
            {item.value !== null ? (
              <p className={`text-xl md:text-2xl font-heading font-bold leading-none ${valueColor}`}>
                {item.value}
              </p>
            ) : (
              <p className="text-sm text-muted-foreground leading-none mt-1">{item.fallback}</p>
            )}
            <p className="text-[10px] md:text-[11px] uppercase tracking-wider text-muted-foreground font-sans mt-1.5">
              {item.label}
            </p>
          </div>
        );

        if (item.to) {
          return (
            <Link
              key={idx}
              to={item.to}
              className="block transition-colors hover:bg-muted/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset"
              aria-label={`${item.label}${item.value !== null ? ` : ${item.value}` : ""}`}
            >
              {inner}
            </Link>
          );
        }
        return <div key={idx}>{inner}</div>;
      })}
    </section>
  );
});

StatsStrip.displayName = "StatsStrip";
export default StatsStrip;
