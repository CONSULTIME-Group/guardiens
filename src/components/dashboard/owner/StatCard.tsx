import { memo } from "react";

interface StatCardProps {
  value: number | string | null;
  label: string;
  fallback?: string;
}

const StatCard = memo(({ value, label, fallback }: StatCardProps) => (
  <div className="bg-card border border-border rounded-2xl p-4 text-center">
    {value !== null ? (
      <p className="text-3xl font-heading font-bold text-foreground mb-1">{value}</p>
    ) : (
      <p className="text-sm text-muted-foreground mb-1 mt-2">{fallback}</p>
    )}
    <p className="text-xs uppercase tracking-wider text-muted-foreground font-sans">{label}</p>
  </div>
));

StatCard.displayName = "StatCard";
export default StatCard;
