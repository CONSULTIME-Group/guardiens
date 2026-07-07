/**
 * Alma — Trigger sitter_popular_sit_context (P1).
 *
 * Monté sur SitterSitView (fiche annonce côté gardien authentifié). Charge
 * les vraies vues sur 7 jours via RPC `get_sit_view_count_week` (seulement
 * si l'annonce est publiée) et calcule le score d'affinité réel avec
 * `useAffinityWithShadow`. Ne s'affiche QUE si :
 *   - views_week >= 15
 *   - applicationsCount >= 2
 *   - affinity.score >= 60 (et non masqué)
 *
 * Aucune valeur inventée : si l'une des trois métriques est absente ou en
 * deçà du seuil, aucun whisper.
 */
import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useAlma } from "@/contexts/AlmaContext";
import { useAffinityWithShadow } from "@/hooks/useAffinityWithShadow";
import { buildPopularSitWhisper } from "@/lib/alma/whisper-triggers";

interface Props {
  sitId: string;
  applicationsCount: number;
  ownerProfile: any;
  sitterProfile: any;
  pets: any[];
  onApply: () => void;
}

const MIN_VIEWS_WEEK = 15;
const MIN_APPLICATIONS = 2;
const MIN_AFFINITY = 60;

export function AlmaPopularSitWhisper({
  sitId,
  applicationsCount,
  ownerProfile,
  sitterProfile,
  pets,
  onApply,
}: Props) {
  const { user } = useAuth();
  const { queueWhisper, canEmit } = useAlma();
  const fired = useRef(false);
  const [viewsWeek, setViewsWeek] = useState<number | null>(null);

  const { full: affinity } = useAffinityWithShadow(
    ownerProfile ? { ...ownerProfile, pets: pets || [] } : null,
    sitterProfile,
    { context: "sit_detail_alma", targetId: sitId, enabled: !!ownerProfile && !!sitterProfile },
  );

  useEffect(() => {
    if (fired.current) return;
    if (!user?.id) return;
    if (applicationsCount < MIN_APPLICATIONS) return;
    if (!canEmit("sitter_popular_sit_context")) return;

    let cancelled = false;
    (async () => {
      const { data, error } = await supabase.rpc(
        "get_sit_view_count_week" as any,
        { p_sit_id: sitId } as any,
      );
      if (cancelled || error) return;
      const n = data === null || data === undefined ? null : Number(data);
      if (n === null || !Number.isFinite(n)) return;
      setViewsWeek(n);
    })();

    return () => {
      cancelled = true;
    };
  }, [sitId, applicationsCount, canEmit, user?.id]);

  useEffect(() => {
    if (fired.current) return;
    if (viewsWeek === null) return;
    if (viewsWeek < MIN_VIEWS_WEEK) return;
    if (applicationsCount < MIN_APPLICATIONS) return;
    if (!affinity || !affinity.displayed) return;
    if (affinity.score < MIN_AFFINITY) return;
    if (!canEmit("sitter_popular_sit_context")) return;

    fired.current = true;
    queueWhisper(
      buildPopularSitWhisper({
        viewCount: viewsWeek,
        applicationsCount,
        affinityScore: affinity.score,
        onApply,
      }),
    );
  }, [viewsWeek, applicationsCount, affinity, canEmit, queueWhisper, onApply]);

  return null;
}

export default AlmaPopularSitWhisper;
