import { cn } from "@/lib/utils";
import { computeTrustTier, trustTierLabel, type TrustSignals } from "@/lib/trustTier";

/**
 * Avatar d'un gardien enveloppé d'un anneau de confiance visuel.
 *
 * Pourquoi un wrapper et pas une prop : laisser les surfaces existantes
 * conserver leur logique de chargement / fallback d'avatar. Ce composant
 * dessine uniquement l'anneau et accepte n'importe quel contenu (image,
 * initiales, placeholder) en children.
 *
 * Trois paliers :
 *  - elite   : double anneau doré (token founder)
 *  - trusted : anneau primary simple
 *  - none    : pas d'anneau (rendu transparent, hauteur préservée)
 *
 * Le label texte est volontairement optionnel : sur les cartes denses on
 * affiche juste l'anneau, sur le profil public on peut ajouter le label.
 */

interface TrustHaloAvatarProps extends TrustSignals {
  children: React.ReactNode;
  /** Diamètre Tailwind (h-X w-X). Défaut h-11 w-11. */
  size?: string;
  /** Forme : rond (défaut) ou rounded square. */
  shape?: "round" | "square";
  className?: string;
}

const TrustHaloAvatar = ({
  children,
  verified,
  avgRating,
  sitsCount,
  size = "h-11 w-11",
  shape = "round",
  className,
}: TrustHaloAvatarProps) => {
  const tier = computeTrustTier({ verified, avgRating, sitsCount });
  const radius = shape === "round" ? "rounded-full" : "rounded-xl";

  const ringClasses = (() => {
    if (tier === "elite") {
      // Double anneau : ring extérieur doré + offset blanc pour creuser la profondeur.
      return "ring-2 ring-founder ring-offset-2 ring-offset-card";
    }
    if (tier === "trusted") {
      return "ring-2 ring-primary/40 ring-offset-1 ring-offset-card";
    }
    return "ring-1 ring-border";
  })();

  return (
    <div
      className={cn("relative shrink-0", size, className)}
      aria-label={tier !== "none" ? trustTierLabel(tier) : undefined}
      title={tier !== "none" ? trustTierLabel(tier) : undefined}
    >
      <div className={cn("overflow-hidden", radius, size, ringClasses)}>
        {children}
      </div>
    </div>
  );
};

export default TrustHaloAvatar;
