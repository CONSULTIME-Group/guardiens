/**
 * ProfileRail, colonne droite sticky desktop du profil public gardien (vague 37).
 *
 * Ne rend RIEN si aucun enfant. Sur mobile, la colonne est masquée : le rail se
 * déplie dans le flux via une variante non-sticky (`inline` prop). Le rail
 * accueille au Lot 3 : AffinityTeaserCard / OwnerToSitterAffinity, AlmaWhisperCard,
 * CommunityPulseCard.
 */
import type { ReactNode } from "react";

interface ProfileRailProps {
  children?: ReactNode;
  /** Si true, rend en flux (mobile) sans sticky ni min-width. */
  inline?: boolean;
  /** "card" : seule la carte marquée sticky reste collante (fiche gardien F1). */
  stickyMode?: "rail" | "card";
}

const ProfileRail = ({ children, inline = false, stickyMode = "rail" }: ProfileRailProps) => {
  const hasContent = !!children;
  if (!hasContent) return null;

  if (inline) {
    return (
      <aside aria-label="Contexte et affinité" className="space-y-4">
        {children}
      </aside>
    );
  }

  if (stickyMode === "card") {
    return (
      <aside aria-label="Contexte et affinité" className="hidden lg:block space-y-[34px]">
        {children}
      </aside>
    );
  }

  return (
    <aside
      aria-label="Contexte et affinité"
      className="hidden lg:block sticky top-6 self-start space-y-4"
    >
      {children}
    </aside>
  );
};

export default ProfileRail;
