import { AlertTriangle } from "lucide-react";
import { Link } from "react-router-dom";
import { cn } from "@/lib/utils";
import { trackEvent } from "@/lib/analytics";
import { useEffect, useRef } from "react";

interface IncompleteProfileBadgeProps {
  /**
   * Score de complétion du profil (0-100). En dessous de 80, on affiche
   * le badge pour inviter l'owner à compléter, sans bloquer la publication.
   */
  profileCompletion: number;
  /**
   * Nombre approximatif de champs restants (facultatif). Si absent, on
   * affiche un texte générique.
   */
  fieldsRemaining?: number;
  /**
   * true si le viewer courant est bien le propriétaire de l'annonce.
   * Le badge n'est jamais visible côté gardiens candidats.
   */
  isOwnerViewer: boolean;
  className?: string;
}

/**
 * Badge discret jaune ambré, visible uniquement par l'owner sur sa propre
 * annonce, si son profil est incomplet (< 80 %). Lien vers /profile.
 * Non bloquant : sert de rappel visuel post-publication.
 */
export function IncompleteProfileBadge({
  profileCompletion,
  fieldsRemaining,
  isOwnerViewer,
  className,
}: IncompleteProfileBadgeProps) {
  const seenRef = useRef(false);
  const shouldShow = isOwnerViewer && profileCompletion < 80;

  useEffect(() => {
    if (!shouldShow || seenRef.current) return;
    seenRef.current = true;
    trackEvent("owner_incomplete_profile_badge_seen", {
      profile_completion: profileCompletion,
      fields_remaining: fieldsRemaining,
    });
  }, [shouldShow, profileCompletion, fieldsRemaining]);

  if (!shouldShow) return null;

  const label =
    typeof fieldsRemaining === "number" && fieldsRemaining > 0
      ? `Profil à compléter, ${fieldsRemaining} champ${fieldsRemaining > 1 ? "s" : ""} restant${fieldsRemaining > 1 ? "s" : ""}`
      : "Profil à compléter";

  return (
    <Link
      to="/profile"
      onClick={() =>
        trackEvent("owner_incomplete_profile_badge_clicked", {
          profile_completion: profileCompletion,
          fields_remaining: fieldsRemaining,
        })
      }
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium",
        "border-amber-300 bg-amber-50 text-amber-900 hover:bg-amber-100 transition-colors",
        "dark:border-amber-700 dark:bg-amber-950/40 dark:text-amber-200 dark:hover:bg-amber-950/60",
        className,
      )}
      aria-label={`${label} (visible uniquement par vous)`}
      data-testid="incomplete-profile-badge"
    >
      <AlertTriangle className="h-3 w-3" aria-hidden />
      <span>{label}</span>
    </Link>
  );
}
