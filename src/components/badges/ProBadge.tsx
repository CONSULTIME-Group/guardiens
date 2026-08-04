import { ShieldCheck, BadgeCheck } from "lucide-react";
import { cn } from "@/lib/utils";

interface ProBadgeProps {
  status?: string | null;
  className?: string;
  size?: "sm" | "md";
}

/**
 * Pastille de statut professionnel affichée publiquement.
 * Deux états visibles :
 *  - verified : pièce validée par l'équipe (vert).
 *  - declared : activité renseignée, pièce non fournie (ambre).
 * Les statuts pending et rejected n'affichent rien publiquement.
 */
const ProBadge = ({ status, className, size = "md" }: ProBadgeProps) => {
  if (status !== "verified" && status !== "declared") return null;

  const isVerified = status === "verified";
  const Icon = isVerified ? ShieldCheck : BadgeCheck;

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full font-body font-semibold tracking-wide border",
        isVerified
          ? "bg-success/15 text-success border-success/30"
          : "bg-warning/15 text-warning border-warning/40",
        size === "sm" ? "px-2 py-0.5 text-[10px]" : "px-2.5 py-1 text-xs",
        className,
      )}
      title={
        isVerified
          ? "Professionnel animalier vérifié par Guardiens"
          : "Ce membre exerce à titre professionnel. Son activité n'a pas encore été vérifiée par Guardiens."
      }
    >
      <Icon className={size === "sm" ? "h-3 w-3" : "h-3.5 w-3.5"} aria-hidden />
      {isVerified ? "Pro vérifié" : "Pro déclaré"}
    </span>
  );
};

export default ProBadge;
