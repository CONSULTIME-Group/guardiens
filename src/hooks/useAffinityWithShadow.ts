/**
 * Hook unifié pour calculer le score d'affinité ET tracker les impressions
 * masquées (« shadow tracking ») sur TOUTES les surfaces.
 *
 * Centralise ce que faisait AffinitySection pour le détail d'annonce, afin
 * que Search, Favoris et PublicProfile remontent aussi des données fiables
 * dans AffinityPilotCard.
 *
 * Retourne :
 *  - `full` : résultat complet (toujours, même masqué).
 *  - `displayed` : commodité, `full?.displayed === true`.
 *
 * Le tracking « shadow » (displayed:false) est émis 1×/session/cible via
 * sessionStorage, sans IntersectionObserver puisqu'il n'y a rien à observer.
 * Le tracking « displayed:true » reste à la charge d'AffinityBadge quand on
 * lui passe trackingContext + trackingId.
 */
import { useEffect, useMemo, useRef } from "react";
import {
  computeAffinityResultFull,
  type AffinityOwnerInput,
  type AffinitySitterInput,
  type AffinityResult,
} from "@/lib/affinityScore";
import { trackEvent } from "@/lib/analytics";

interface Options {
  /** Surface d'origine (ex: "search_listing", "favorites", "public_profile"). */
  context: string;
  /** Identifiant de la cible (annonce ou profil). Pour dédup. */
  targetId?: string;
  /** Activer/désactiver le calcul (ex: en demo, hors zone, etc.). */
  enabled?: boolean;
}

export function useAffinityWithShadow(
  owner: AffinityOwnerInput | null | undefined,
  sitter: AffinitySitterInput | null | undefined,
  { context, targetId, enabled = true }: Options,
): { full: AffinityResult | null; displayed: boolean } {
  const full = useMemo<AffinityResult | null>(() => {
    if (!enabled || !owner || !sitter) return null;
    return computeAffinityResultFull(owner, sitter);
  }, [enabled, owner, sitter]);

  const sentRef = useRef<string | null>(null);
  useEffect(() => {
    if (!full || full.displayed) return;
    const key = `affinity:${context}:${targetId ?? "anon"}:hidden:${full.hiddenReason}:${full.score}`;
    if (sentRef.current === key) return;
    sentRef.current = key;
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

  return { full, displayed: !!full?.displayed };
}
