/**
 * ProfileRail, colonne droite sticky desktop du profil public gardien (vague 37).
 *
 * Ne rend RIEN si aucun enfant. Variante `secondary` : zone en fin de flux de
 * la fiche carnet, 2 colonnes desktop, une seule sur petit écran.
 */
import type { ReactNode } from "react";

interface ProfileRailProps {
  children?: ReactNode;
  /** Si true, rend en flux (mobile) sans sticky ni min-width. */
  inline?: boolean;
  /** "card" : seule la carte marquée sticky reste collante (fiche gardien F1). */
  stickyMode?: "rail" | "card";
  /** "secondary" : zone secondaire dans le flux (fiche carnet). */
  variant?: "default" | "secondary";
}

const ProfileRail = ({ children, inline = false, stickyMode = "rail", variant = "default" }: ProfileRailProps) => {
  const hasContent = !!children;
  if (!hasContent) return null;

  if (variant === "secondary") {
    return (
      <aside
        aria-label="Contexte et affinité"
        data-profile-secondary
        className="grid gap-x-[52px] gap-y-8 border-t border-border pt-8 md:grid-cols-2 [&>*]:min-w-0"
      >
        {children}
      </aside>
    );
  }

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
