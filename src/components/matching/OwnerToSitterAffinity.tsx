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
  /**
   * Libellé de repli affiché quand le score est calculable côté data mais masqué
   * (viewer sans owner profile, seuil non atteint, disqualification, etc.).
   * Utile sur les cartes de liste pour ne jamais laisser un trou visuel.
   */
  fallbackLabel?: string;
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
  fallbackLabel,
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
    if (fallbackLabel) {
      return (
        <span
          className={`inline-flex items-center rounded-full border border-border bg-muted/60 px-2 py-0.5 text-[11px] font-medium text-muted-foreground ${className ?? ""}`}
          title="Complétez votre profil pour révéler le score d'affinité."
        >
          {fallbackLabel}
        </span>
      );
    }
    return null;
  }

  return (
    <div className={`flex items-center gap-2 ${className ?? ""}`}>
      <AffinityBadge
        result={full}
        size={size}
        variant={variant}
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
