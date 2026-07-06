/**
 * Section d'affinité affichée côté gardien sur une annonce.
 *
 * Encapsule :
 *  - le calcul du score (via `useAffinityWithShadow`, qui gère aussi le
 *    tracking « shadow » des impressions masquées),
 *  - le rendu du badge (auto-tracking « displayed » via IntersectionObserver),
 *  - le CTA contextuel quand le score n'est pas calculable et que le profil
 *    du visiteur peut être complété,
 *  - le CTA Alma « Comprendre mon score » (Chantier 5) qui déplie une bulle
 *    narrative reformulant chaque critère.
 */
import AffinityBadge from "./AffinityBadge";
import AffinityMissingCTA from "./AffinityMissingCTA";
import { useAffinityWithShadow } from "@/hooks/useAffinityWithShadow";
import AlmaAffinityExplain from "@/components/ai/alma/AlmaAffinityExplain";
import type {
  AffinitySitterInput,
  AffinityOwnerInput,
} from "@/lib/affinityScore";

interface AffinitySectionProps {
  sitterProfile: AffinitySitterInput | null;
  ownerProfile: AffinityOwnerInput | null;
  pets: AffinityOwnerInput["pets"];
  context: string;
  targetId?: string;
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
  const { full, displayed } = useAffinityWithShadow(
    ownerProfile ? { ...ownerProfile, pets: pets || [] } : null,
    sitterProfile,
    { context, targetId, enabled: !!sitterProfile && !!ownerProfile },
  );

  if (!full || !displayed) {
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
    <div className="mt-3 space-y-2">
      <div className="flex items-center gap-2 flex-wrap">
        <AffinityBadge
          result={full}
          size="md"
          trackingContext={context}
          trackingId={targetId}
        />
        <span className="text-xs text-muted-foreground">
          Votre affinité avec ce propriétaire
        </span>
        <AlmaAffinityExplain
          audience="sitter"
          mode="sitter_view"
          result={full}
          context={context}
          targetId={targetId}
        />
      </div>
    </div>
  );
};

export default AffinitySection;
