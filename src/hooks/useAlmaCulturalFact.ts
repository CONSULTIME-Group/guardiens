/**
 * useAlmaCulturalFact — Alma Pass 5, compagnon culturel.
 *
 * Appelle la RPC `get_alma_cultural_fact` et queue un whisper P3
 * ("cultural_fact") si un fait est éligible. La RPC gère elle-même le
 * cooldown 24h côté serveur (`alma_whisper_history`) : côté client on se
 * contente d'un debounce par session/surface pour éviter les doublons.
 *
 * Aucune action si :
 *  - pas d'utilisateur connecté
 *  - fréquence Alma "silent"
 *  - RPC renvoie null (cooldown ou aucun fait matching)
 */
import { useEffect, useRef } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useAlma } from "@/contexts/AlmaContext";
import { trackEvent } from "@/lib/analytics";
import {
  buildCulturalFactWhisper,
  type CulturalFactPayload,
} from "@/lib/alma/whisper-triggers";
import { CULTURAL_FACT_LIMITS, type AlmaAudience } from "@/lib/alma/whisper-types";

const SESSION_QUEUED_KEY = "alma_cultural_fact_queued";
const SESSION_COUNT_KEY = "alma_cultural_fact_count";

interface UseAlmaCulturalFactParams {
  surface: string;
  context?: Record<string, unknown>;
  /** Désactive le hook (utile en test ou pour skip une surface ponctuelle). */
  enabled?: boolean;
}

export function useAlmaCulturalFact({
  surface,
  context,
  enabled = true,
}: UseAlmaCulturalFactParams) {
  const { user, activeRole } = useAuth();
  const { queueWhisper, frequency } = useAlma();
  const firedRef = useRef(false);

  useEffect(() => {
    if (!enabled) return;
    if (!user?.id) return;
    if (frequency === "silent") return;
    if (firedRef.current) return;

    // Quota session par surface (évite un fact à chaque remount).
    const cfg = CULTURAL_FACT_LIMITS[frequency];
    if (cfg.maxPerSession === 0) return;
    try {
      const surfaceKey = `${SESSION_QUEUED_KEY}:${surface}`;
      if (sessionStorage.getItem(surfaceKey) === "1") return;
      const count = Number(sessionStorage.getItem(SESSION_COUNT_KEY) || "0");
      if (count >= cfg.maxPerSession) return;
      // Cadence de session : temps depuis le dernier fait culturel émis.
      const lastAt = Number(sessionStorage.getItem(SESSION_LAST_AT_KEY) || "0");
      if (cfg.cooldownMs > 0 && lastAt > 0 && Date.now() - lastAt < cfg.cooldownMs) return;
    } catch {
      /* silent */
    }

    let cancelled = false;
    firedRef.current = true;

    (async () => {
      try {
        const { data, error } = await supabase.rpc(
          "get_alma_cultural_fact" as any,
          {
            p_user_id: user.id,
            p_surface: surface,
            p_context: (context ?? {}) as any,
            p_frequency: frequency,
          },
        );
        if (cancelled || error || !data) return;

        const fact = data as unknown as CulturalFactPayload;
        if (!fact?.id || !fact?.content) return;

        const audience: AlmaAudience = activeRole === "owner" ? "owner" : "sitter";
        const whisper = buildCulturalFactWhisper({
          fact,
          audience,
          surface,
          onSource: (url) => {
            try {
              void trackEvent("alma_cultural_fact_action_clicked", {
                metadata: { fact_id: fact.id, source_url: url },
              });
            } catch { /* silent */ }
            try {
              window.open(url, "_blank", "noopener,noreferrer");
            } catch { /* silent */ }
          },
        });

        queueWhisper(whisper);

        try {
          void trackEvent("alma_cultural_fact_seen", {
            metadata: {
              fact_id: fact.id,
              fact_type: fact.type,
              surface,
            },
          });
        } catch { /* silent */ }

        try {
          sessionStorage.setItem(`${SESSION_QUEUED_KEY}:${surface}`, "1");
          const prev = Number(sessionStorage.getItem(SESSION_COUNT_KEY) || "0");
          sessionStorage.setItem(SESSION_COUNT_KEY, String(prev + 1));
        } catch { /* silent */ }
      } catch {
        /* silent */
      }
    })();

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled, user?.id, surface, frequency]);
}
