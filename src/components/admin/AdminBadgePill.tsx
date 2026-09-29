import { cn } from "@/lib/utils";

export const BADGE_UNAVAILABLE_TITLE = "Compteur indisponible";

/** Résout le contenu d'une pastille : nombre, « ? » si indisponible, ou rien. */
export function resolveBadge(
  badgeKey: string | undefined,
  badges: Record<string, number | undefined>,
  unavailable: boolean,
  titles: Record<string, string>,
): { show: boolean; text: string; label?: string } {
  if (!badgeKey) return { show: false, text: "" };
  if (unavailable) return { show: true, text: "?", label: BADGE_UNAVAILABLE_TITLE };
  const count = badges[badgeKey] || 0;
  return {
    show: count > 0,
    text: String(count),
    label: `${count} ${titles[badgeKey] ?? "à traiter"}`,
  };
}

export const AdminBadgePill = ({
  text, label, compact = false, className,
}: { text: string; label?: string; compact?: boolean; className?: string }) => {
  const shown = compact && text !== "?" && Number(text) > 99 ? "99+" : text;
  return (
    <span
      className={cn(
        "bg-destructive text-destructive-foreground font-bold rounded-full flex items-center justify-center",
        compact ? "text-[9px] min-w-[14px] h-[14px] px-0.5" : "text-[10px] min-w-[18px] h-[18px] px-1",
        className,
      )}
      title={label}
      aria-label={label}
    >
      {shown}
    </span>
  );
};
