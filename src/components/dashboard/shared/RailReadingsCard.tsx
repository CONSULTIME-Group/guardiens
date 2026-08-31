/**
 * RailReadingsCard, bloc « À lire » du rail droit (refonte rail,
 * août 2026). Trois liens maximum, titre court et une ligne de contexte.
 * Retourne null si aucune source n'est disponible : jamais de remplissage.
 */
import { Link } from "react-router-dom";
import type { RailReadingItem } from "@/hooks/useRailReadings";

interface RailReadingsCardProps {
  items: RailReadingItem[];
}

const RailReadingsCard = ({ items }: RailReadingsCardProps) => {
  if (items.length === 0) return null;

  return (
    <article
      className="bg-card border border-border"
      style={{
        borderRadius: "20px",
        padding: "22px",
        boxShadow: "0 1px 2px rgba(29,27,22,0.04), 0 8px 24px rgba(29,27,22,0.05)",
      }}
    >
      <p
        style={{
          color: "hsl(var(--secondary))",
          fontSize: "11px",
          fontWeight: 700,
          letterSpacing: "0.16em",
          textTransform: "uppercase",
        }}
      >
        À lire
      </p>

      <ul className="mt-[12px]" style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
        {items.slice(0, 3).map((item) => (
          <li key={item.key}>
            <Link
              to={item.href}
              className="group block rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <p
                className="font-heading text-foreground group-hover:text-primary transition-colors leading-snug line-clamp-2"
                style={{ fontSize: "15px", fontWeight: 600 }}
              >
                {item.title}
              </p>
              <p className="text-muted-foreground mt-[2px]" style={{ fontSize: "12.5px" }}>
                {item.context}
              </p>
            </Link>
          </li>
        ))}
      </ul>
    </article>
  );
};

export default RailReadingsCard;
