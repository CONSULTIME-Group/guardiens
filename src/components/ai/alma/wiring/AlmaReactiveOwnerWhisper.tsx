/**
 * Alma — Trigger sitter_reactive_owner_context (P2).
 *
 * Monté sur SitterSitView. Charge la latence médiane de première réponse de
 * l'owner via RPC `get_owner_response_median_minutes`. Ne s'affiche QUE si
 * le RPC retourne une valeur non nulle (>= 3 conversations exploitables sur
 * 90 jours) ET si median <= 180 minutes (« moins de 3h »), ce qui correspond
 * au message figé du builder.
 *
 * Aucune valeur inventée : si NULL ou > 3h, aucun whisper.
 */
import { useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useAlma } from "@/contexts/AlmaContext";
import { buildReactiveOwnerWhisper } from "@/lib/alma/whisper-triggers";

interface Props {
  ownerId: string;
}

const REACTIVE_MAX_MINUTES = 180;

export function AlmaReactiveOwnerWhisper({ ownerId }: Props) {
  const { user } = useAuth();
  const { queueWhisper, canEmit } = useAlma();
  const fired = useRef(false);

  useEffect(() => {
    if (fired.current) return;
    if (!user?.id || user.id === ownerId) return;
    if (!canEmit("sitter_reactive_owner_context")) return;

    let cancelled = false;
    (async () => {
      const { data, error } = await supabase.rpc(
        "get_owner_response_median_minutes" as any,
        { p_owner_id: ownerId } as any,
      );
      if (cancelled || error) return;
      if (data === null || data === undefined) return;
      const minutes = Number(data);
      if (!Number.isFinite(minutes)) return;
      if (minutes > REACTIVE_MAX_MINUTES) return;

      fired.current = true;
      queueWhisper(buildReactiveOwnerWhisper());
    })();

    return () => {
      cancelled = true;
    };
  }, [ownerId, user?.id, canEmit, queueWhisper]);

  return null;
}

export default AlmaReactiveOwnerWhisper;
