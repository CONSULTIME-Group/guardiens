/**
 * Section d'affinité affichée côté gardien sur une annonce.
 *
 * Encapsule :
 *  - le calcul du score (memoizé),
 *  - le rendu du badge (auto-tracking via IntersectionObserver),
 *  - le CTA contextuel quand le score n'est pas calculable et que le profil
 *    du visiteur peut être complété,
 *  - le tracking « shadow » d'une impression masquée (displayed: false) pour
 *    piloter le seuil d'affichage via les analytics.
 */
import { useCallback, useEffect, useMemo, useRef } from "react";
import AffinityBadge from "./AffinityBadge";
import AffinityMissingCTA from "./AffinityMissingCTA";
import {
  computeAffinityResultFull,
  type AffinitySitterInput,
  type AffinityOwnerInput,
} from "@/lib/affinityScore";
import { trackEvent } from "@/lib/analytics";
import { useImpressionOnce } from "@/hooks/useImpressionOnce";

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
  const full = useMemo(() => {
    if (!sitterProfile || !ownerProfile) return null;
    return computeAffinityResultFull({ ...ownerProfile, pets: pets || [] }, sitterProfile);
  }, [sitterProfile, ownerProfile, pets]);

  // Tracking « shadow » des impressions masquées : on émet un event marqué
  // displayed:false avec la raison, hors du DOM (pas d'IntersectionObserver
  // nécessaire car il n'y a rien à observer).
  const shadowSentRef = useRef<string | null>(null);
  useEffect(() => {
    if (!full || full.displayed) return;
    const key = `affinity:${context}:${targetId ?? "anon"}:hidden:${full.hiddenReason}:${full.score}`;
    if (shadowSentRef.current === key) return;
    shadowSentRef.current = key;
    try {
      if (sessionStorage.getItem(`impr:${key}`)) return;
      sessionStorage.setItem(`impr:${key}`, "1");
    } catch {
      // ignore
    }
    void trackEvent("affinity_badge_seen", {
      metadata: {
        context,
        score: full.score,
        total: full.total,
        target_id: targetId ?? null,
        displayed: false,
        hidden_reason: full.hiddenReason,
      },
    });
  }, [full, context, targetId]);

  if (!full || !full.displayed) {
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
        result={full}
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
