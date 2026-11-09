import { cn } from "@/lib/utils";

/**
 * Pastille chiffrée du menu admin. Lot ADM14 : une seule pastille, sur la vue
 * d'ensemble (workListBadgeText, src/hooks/useWorkList.ts).
 */
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
      data-testid="admin-badge"
    >
      {shown}
    </span>
  );
};

/**
 * Lot ADM14 : compteur gris des nouveautés (annonces, besoins) depuis la
 * dernière visite de la page. Une information, jamais une tâche : ni rouge, ni
 * compté dans la pastille de la vue d'ensemble.
 */
export const AdminNewsPill = ({
  text, label, compact = false, className,
}: { text: string; label: string; compact?: boolean; className?: string }) => (
  <span
    className={cn(
      "border border-border bg-muted text-foreground font-semibold rounded-full flex items-center justify-center",
      compact ? "text-[9px] min-w-[14px] h-[14px] px-0.5" : "text-[10px] min-w-[18px] h-[18px] px-1",
      className,
    )}
    title={label}
    aria-label={label}
    data-testid="admin-news"
  >
    {text}
  </span>
);
