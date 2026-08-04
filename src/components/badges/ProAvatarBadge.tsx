import { ShieldCheck, BadgeCheck } from "lucide-react";
import { cn } from "@/lib/utils";

interface ProAvatarBadgeProps {
  status?: string | null;
  /** Taille de la pastille, adaptée au diamètre de l'avatar. */
  size?: "sm" | "md";
  className?: string;
}

/**
 * Pastille de statut professionnel posée en coin bas droit d'un avatar.
 * Verte si la pièce est validée, ambre si l'activité est seulement déclarée,
 * rien dans les autres cas (aucun, en cours, refusé).
 * Le conteneur de l'avatar doit être en position relative.
 */
const ProAvatarBadge = ({ status, size = "md", className }: ProAvatarBadgeProps) => {
  if (status !== "verified" && status !== "declared") return null;

  const isVerified = status === "verified";
  const Icon = isVerified ? ShieldCheck : BadgeCheck;
  const label = isVerified
    ? "Professionnel animalier vérifié par Guardiens"
    : "Ce membre exerce à titre professionnel. Son activité n'a pas encore été vérifiée par Guardiens.";

  return (
    <span
      role="img"
      aria-label={label}
      title={label}
      className={cn(
        "absolute bottom-0 right-0 inline-flex items-center justify-center rounded-full border-2 border-background shadow-sm",
        isVerified ? "bg-success text-success-foreground" : "bg-warning text-warning-foreground",
        size === "sm" ? "h-4 w-4" : "h-5 w-5",
        className,
      )}
    >
      <Icon className={size === "sm" ? "h-2.5 w-2.5" : "h-3 w-3"} aria-hidden />
    </span>
  );
};

export default ProAvatarBadge;
