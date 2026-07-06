/**
 * useAlmaUsageNudge — hook client Alma étape 1.
 *
 * Interroge la RPC `get_alma_usage_nudge` avec le role + state du user
 * courant, puis queue un whisper de type "usage_nudge" (P2). Le scheduler
 * décide s'il passe en tête (P2 > P3 cultural_fact) ou pas.
 *
 * Ciblage : n'invoque la RPC que si `enabled` est vrai, si le user est loggé
 * et si la fréquence Alma n'est pas "silent". Les CTA sont résolus par
 * `resolveAlmaCtaHref` côté AlmaWhisperOutlet, ne rien passer ici.
 */
import { useEffect, useRef } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useAlma } from "@/contexts/AlmaContext";
import { trackEvent } from "@/lib/analytics";
import { buildUsageNudgeWhisper, type UsageNudgePayload } from "@/lib/alma/whisper-triggers";
import type { AlmaAudience } from "@/lib/alma/whisper-types";

type NudgeRole = "owner" | "sitter";
type NudgeState =
  | "any"
  | "no_active_sit"
  | "new_owner"
  | "new_sitter"
  | "profile_incomplete";

interface UseAlmaUsageNudgeParams {
  surface: string;
  role: NudgeRole;
  state: NudgeState;
  enabled?: boolean;
}

const SESSION_KEY_PREFIX = "alma_usage_nudge_queued";

export function useAlmaUsageNudge({
  surface,
  role,
  state,
  enabled = true,
}: UseAlmaUsageNudgeParams) {
  const { user, activeRole } = useAuth();
  const { queueWhisper, frequency, verboseMode } = useAlma();
  const firedRef = useRef(false);

  useEffect(() => {
    if (!enabled) return;
    if (!user?.id) return;
    if (frequency === "silent" && !verboseMode) return;
    if (firedRef.current) return;

    try {
      const key = `${SESSION_KEY_PREFIX}:${surface}:${role}:${state}`;
      if (!verboseMode && sessionStorage.getItem(key) === "1") return;
      sessionStorage.setItem(key, "1");
    } catch {
      /* silent */
    }

    let cancelled = false;
    firedRef.current = true;

    (async () => {
      try {
        const { data, error } = await supabase.rpc("get_alma_usage_nudge" as any, {
          p_user_id: user.id,
          p_surface: surface,
          p_role: role,
          p_state: state,
          p_bypass_cooldown: verboseMode,
        });
        if (cancelled || error || !data) return;
        const payload = data as unknown as UsageNudgePayload;
        if (!payload?.id || !payload?.content) return;

        const audience: AlmaAudience = activeRole === "owner" ? "owner" : "sitter";
        const whisper = buildUsageNudgeWhisper({
          payload,
          audience,
          surface,
          // onCta câblé côté AlmaWhisperOutlet (navigation React Router)
        });
        queueWhisper(whisper);

        try {
          void trackEvent("alma_usage_nudge_seen", {
            metadata: {
              fact_id: payload.id,
              surface,
              cta_action: payload.cta_action ?? null,
            },
          });
        } catch {
          /* silent */
        }
      } catch {
        /* silent */
      }
    })();

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled, user?.id, surface, role, state, frequency, verboseMode]);
}
