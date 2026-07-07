/**
 * Alma — Trigger owner_active_sitter_context (P1).
 *
 * Monté sur PublicSitterProfile côté owner authentifié. Charge les vraies
 * stats de gardes du gardien via RPC `get_sitter_stay_stats` (source unique :
 * reviews validées + durée des sits). Ne s'affiche QUE si :
 *   - completed_sits >= 3
 *   - long_stays >= 1
 *
 * Aucune valeur inventée : si le RPC retourne 0, aucun whisper.
 */
import { useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useAlma } from "@/contexts/AlmaContext";
import { buildActiveSitterWhisper } from "@/lib/alma/whisper-triggers";

interface Props {
  sitterId: string;
  sitterFirstName: string | null;
}

const MIN_COMPLETED = 3;
const MIN_LONG_STAYS = 1;

export function AlmaOwnerActiveSitterWhisper({ sitterId, sitterFirstName }: Props) {
  const { user, activeRole } = useAuth();
  const { queueWhisper, canEmit } = useAlma();
  const fired = useRef(false);

  const isOwnerMode =
    !!user &&
    user.id !== sitterId &&
    (user.role === "owner" || (user.role === "both" && activeRole === "owner"));

  useEffect(() => {
    if (fired.current) return;
    if (!isOwnerMode) return;
    if (!canEmit("owner_active_sitter_context")) return;

    let cancelled = false;
    (async () => {
      const { data, error } = await supabase.rpc(
        "get_sitter_stay_stats" as any,
        { p_sitter_id: sitterId } as any,
      );
      if (cancelled || error) return;
      const row = Array.isArray(data) ? (data[0] as any) : (data as any);
      if (!row) return;
      const completed = Number(row.completed_sits ?? 0);
      const longStays = Number(row.long_stays ?? 0);
      if (completed < MIN_COMPLETED || longStays < MIN_LONG_STAYS) return;

      fired.current = true;
      queueWhisper(
        buildActiveSitterWhisper({
          firstName: sitterFirstName || "Ce gardien",
          completedSits: completed,
          longStays,
          onInvite: () => {
            const btn = document.querySelector<HTMLElement>(
              '[data-invite-to-my-sit], button[aria-label*="Inviter"]',
            );
            if (btn) {
              btn.scrollIntoView({ behavior: "smooth", block: "center" });
              btn.focus?.();
            }
          },
        }),
      );
    })();

    return () => {
      cancelled = true;
    };
  }, [isOwnerMode, sitterId, sitterFirstName, canEmit, queueWhisper]);

  return null;
}

export default AlmaOwnerActiveSitterWhisper;
