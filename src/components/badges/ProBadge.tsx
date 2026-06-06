import { ShieldCheck } from "lucide-react";
import { cn } from "@/lib/utils";

interface ProBadgeProps {
  status?: string | null;
  className?: string;
  size?: "sm" | "md";
}

/**
 * Pastille « Pro vérifié » affichée publiquement sur les profils gardiens validés.
 * N'affiche rien si pro_status n'est pas "verified".
 */
const ProBadge = ({ status, className, size = "md" }: ProBadgeProps) => {
  if (status !== "verified") return null;

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full bg-success/15 text-success border border-success/30 font-body font-semibold tracking-wide",
        size === "sm" ? "px-2 py-0.5 text-[10px]" : "px-2.5 py-1 text-xs",
        className,
      )}
      title="Professionnel animalier vérifié par Guardiens"
    >
      <ShieldCheck className={size === "sm" ? "h-3 w-3" : "h-3.5 w-3.5"} aria-hidden />
      Pro vérifié
    </span>
  );
};

export default ProBadge;
