/**
 * Alma — Trigger owner_view_trend_up (P2).
 *
 * Monté sur OwnerDashboard. Charge, via RPC `get_owner_sits_view_trend`,
 * les vraies vues 7 derniers jours vs 7 jours précédents pour chaque annonce
 * publiée de l'owner. Ne s'affiche QUE si au moins une annonce affiche :
 *   - views_this_week >= 10
 *   - views_this_week > views_last_week
 *   - variation >= +20 %
 *
 * Aucune valeur inventée : les deux compteurs viennent du RPC scoped owner.
 */
import { useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useAlma } from "@/contexts/AlmaContext";
import { buildViewTrendUpWhisper } from "@/lib/alma/whisper-triggers";

const MIN_VIEWS_THIS_WEEK = 10;
const MIN_VARIATION_PCT = 20;

export function AlmaOwnerViewTrendWhisper() {
  const { user } = useAuth();
  const { queueWhisper, canEmit } = useAlma();
  const fired = useRef(false);

  useEffect(() => {
    if (fired.current) return;
    if (!user?.id) return;
    if (!canEmit("owner_view_trend_up")) return;

    let cancelled = false;
    (async () => {
      const { data, error } = await supabase.rpc(
        "get_owner_sits_view_trend" as any,
        { p_user_id: user.id } as any,
      );
      if (cancelled || error) return;
      const rows = Array.isArray(data) ? (data as any[]) : [];
      if (rows.length === 0) return;

      let best: { thisWeek: number; variationPct: number } | null = null;
      for (const r of rows) {
        const thisWeek = Number(r?.views_this_week ?? 0);
        const lastWeek = Number(r?.views_last_week ?? 0);
        if (!Number.isFinite(thisWeek) || !Number.isFinite(lastWeek)) continue;
        if (thisWeek < MIN_VIEWS_THIS_WEEK) continue;
        if (thisWeek <= lastWeek) continue;
        // Variation exigée. Cas lastWeek = 0 : on impose thisWeek >= seuil,
        // on affiche « +100 % » plafonné (chiffre réel = passage de 0 à N).
        const variation =
          lastWeek === 0 ? 100 : Math.round(((thisWeek - lastWeek) / lastWeek) * 100);
        if (variation < MIN_VARIATION_PCT) continue;
        if (!best || variation > best.variationPct) {
          best = { thisWeek, variationPct: variation };
        }
      }
      if (!best) return;

      fired.current = true;
      queueWhisper(
        buildViewTrendUpWhisper({
          viewsThisWeek: best.thisWeek,
          variationPct: best.variationPct,
        }),
      );
    })();

    return () => {
      cancelled = true;
    };
  }, [user?.id, canEmit, queueWhisper]);

  return null;
}

export default AlmaOwnerViewTrendWhisper;
