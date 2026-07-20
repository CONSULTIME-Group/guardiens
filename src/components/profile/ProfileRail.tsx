/**
 * ProfileRail — colonne droite sticky desktop du profil public gardien (vague 37).
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
}

const ProfileRail = ({ children, inline = false }: ProfileRailProps) => {
  const hasContent = !!children;
  if (!hasContent) return null;

  if (inline) {
    return (
      <aside aria-label="Contexte et affinité" className="space-y-4">
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
