/**
 * Section d'affinité affichée côté gardien sur une annonce.
 *
 * Encapsule :
 *  - le calcul du score (memoizé),
 *  - le rendu du badge (auto-tracking via IntersectionObserver),
 *  - le CTA contextuel quand le score n'est pas calculable et que le profil
 *    du visiteur peut être complété.
 *
 * Extrait de SitterSitView pour éviter une IIFE + Hooks-in-IIFE.
 */
import { useMemo } from "react";
import AffinityBadge from "./AffinityBadge";
import AffinityMissingCTA from "./AffinityMissingCTA";
import { computeAffinityScore, type AffinitySitterInput, type AffinityOwnerInput } from "@/lib/affinityScore";

interface AffinitySectionProps {
  sitterProfile: AffinitySitterInput | null;
  ownerProfile: AffinityOwnerInput | null;
  pets: AffinityOwnerInput["pets"];
  /** Surface d'affichage pour le tracking (ex: "sit_detail"). */
  context: string;
  /** Id de la cible (annonce / profil) pour la dédup d'impression. */
  targetId?: string;
  /** Le visiteur courant agit-il en tant que gardien ? CTA affiché si oui. */
  showCtaForSitter?: boolean;
}

const AffinitySection = ({
  sitterProfile,
  ownerProfile,
  pets,
  context,
  targetId,
  showCtaForSitter = true,
}: AffinitySectionProps) => {
  const affinity = useMemo(() => {
    if (!sitterProfile || !ownerProfile) return null;
    return computeAffinityScore({ ...ownerProfile, pets: pets || [] }, sitterProfile);
  }, [sitterProfile, ownerProfile, pets]);

  if (!affinity) {
    if (showCtaForSitter && sitterProfile) {
      return (
        <div className="mt-3">
          <AffinityMissingCTA side="sitter" profile={sitterProfile} context={context} />
        </div>
      );
    }
    return null;
  }

  return (
    <div className="mt-3 flex items-center gap-2">
      <AffinityBadge
        result={affinity}
        size="md"
        trackingContext={context}
        trackingId={targetId}
      />
      <span className="text-xs text-muted-foreground">
        Votre affinité avec ce propriétaire
      </span>
    </div>
  );
};

export default AffinitySection;
