/**
 * Affinité côté PROPRIÉTAIRE consultant un GARDIEN.
 *
 * Symétrique d'AffinitySection (sitter → owner). Utilisé sur :
 *  - PublicSitterProfile (page profil gardien)
 *  - SearchOwner (cartes gardiens dans la liste)
 *
 * Charge le profil owner du visiteur via cache module-level, calcule le score
 * avec shadow tracking, rend AffinityBadge ou AffinityMissingCTA(side="owner").
 */
import AffinityBadge from "./AffinityBadge";
import AffinityMissingCTA from "./AffinityMissingCTA";
import { useAffinityWithShadow } from "@/hooks/useAffinityWithShadow";
import { useViewerOwnerForAffinity } from "@/hooks/useViewerOwnerForAffinity";
import type { AffinitySitterInput } from "@/lib/affinityScore";

interface Props {
  sitterProfile: AffinitySitterInput | null;
  context: string;
  targetId?: string;
  /** Taille du badge. `sm` pour les cartes de liste, `md` pour le détail. */
  size?: "sm" | "md";
  /** Afficher le CTA "compléter votre profil" si owner incomplet. */
  showCta?: boolean;
  /** "single" (détail) ou "list" (carte de liste) — affecte le wording du CTA. */
  scope?: "single" | "list";
  /** Texte adjacent au badge. */
  caption?: string;
  /** "numeric" (%) ou "semantic" ("Très compatible", etc.). */
  variant?: "numeric" | "semantic";
  className?: string;
}

const OwnerToSitterAffinity = ({
  sitterProfile,
  context,
  targetId,
  size = "md",
  showCta = true,
  scope = "single",
  caption,
  variant = "numeric",
  className,
}: Props) => {
  const { owner, loading } = useViewerOwnerForAffinity();
  const { full, displayed } = useAffinityWithShadow(owner, sitterProfile, {
    context,
    targetId,
    enabled: !loading && !!owner && !!sitterProfile,
  });

  if (loading) return null;

  if (!full || !displayed) {
    if (showCta && owner) {
      return (
        <div className={className}>
          <AffinityMissingCTA
            side="owner"
            profile={owner}
            context={context}
            scope={scope}
          />
        </div>
      );
    }
    return null;
  }

  return (
    <div className={`flex items-center gap-2 ${className ?? ""}`}>
      <AffinityBadge
        result={full}
        size={size}
        trackingContext={context}
        trackingId={targetId}
      />
      {caption && (
        <span className="text-xs text-muted-foreground">{caption}</span>
      )}
    </div>
  );
};

export default OwnerToSitterAffinity;
