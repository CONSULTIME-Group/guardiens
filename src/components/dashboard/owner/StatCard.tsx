import { memo } from "react";
import { Link } from "react-router-dom";

interface StatCardProps {
  value: number | string | null;
  label: string;
  fallback?: string;
  /** Met visuellement en avant (ex: note moyenne) */
  highlight?: boolean;
  /** Rend la carte cliquable */
  to?: string;
}

const StatCard = memo(({ value, label, fallback, highlight = false, to }: StatCardProps) => {
  const baseClasses = `rounded-2xl p-4 text-center transition-all ${
    highlight
      ? "bg-primary/5 border border-primary/20"
      : "bg-card border border-border"
  } ${to ? "hover:border-primary/40 hover:shadow-sm cursor-pointer" : ""}`;

  const inner = (
    <>
      {value !== null ? (
        <p className={`text-3xl font-heading font-bold mb-1 ${highlight ? "text-primary" : "text-foreground"}`}>
          {value}
        </p>
      ) : (
        <p className="text-sm text-muted-foreground mb-1 mt-2">{fallback}</p>
      )}
      <p className="text-xs uppercase tracking-wider text-muted-foreground font-sans">{label}</p>
    </>
  );

  if (to) {
    return (
      <Link to={to} className={baseClasses} aria-label={`${label}${value !== null ? ` : ${value}` : ""}`}>
        {inner}
      </Link>
    );
  }

  return <div className={baseClasses}>{inner}</div>;
});

StatCard.displayName = "StatCard";
export default StatCard;
