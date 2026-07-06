/**
 * Alma Pass 4 — Trigger 7 (P0 réciprocité).
 *
 * Composant invisible monté sur PublicSitterProfile côté owner authentifié.
 * Détection : le sitter consulté a vu au moins 1 fois l'annonce de cet owner
 * dans les 7 derniers jours (analytics_events.event_type = 'sit_view').
 * Émet un whisper P0 via AlmaContext.queueWhisper() avec CTA
 * "Inviter à candidater" qui déclenche le bouton InviteToMySitButton
 * déjà présent dans AlmaFitGardien via un simple scroll+focus.
 */
import { useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useAlma } from "@/contexts/AlmaContext";
import { buildReciprocalInterestWhisper } from "@/lib/alma/whisper-triggers";

interface Props {
  sitterId: string;
  sitterFirstName: string | null;
}

export function AlmaReciprocityWhisper({ sitterId, sitterFirstName }: Props) {
  const { user, activeRole } = useAuth();
  const { queueWhisper, canEmit } = useAlma();
  const fired = useRef(false);

  const isOwnerMode =
    !!user &&
    user.id !== sitterId &&
    (user.role === "owner" || (user.role === "both" && activeRole === "owner"));

  useEffect(() => {
    if (fired.current) return;
    if (!isOwnerMode || !user?.id) return;
    if (!canEmit("owner_reciprocal_interest")) return;

    let cancelled = false;
    (async () => {
      // Sits publiés de l'owner
      const { data: sits } = await supabase
        .from("sits")
        .select("id")
        .eq("user_id", user.id)
        .eq("status", "published")
        .limit(10);
      if (cancelled) return;
      const sitIds = (sits ?? []).map((s: any) => s.id as string);
      if (sitIds.length === 0) return;

      // Vues du sitter sur ces sits, 7 derniers jours
      const weekAgo = new Date(Date.now() - 7 * 86_400_000).toISOString();
      const { data: events } = await supabase
        .from("analytics_events")
        .select("metadata")
        .eq("user_id", sitterId)
        .eq("event_type", "sit_view")
        .gte("created_at", weekAgo);
      if (cancelled) return;
      const views = (events ?? []).filter((row: any) => {
        const sid = row?.metadata?.sit_id;
        return typeof sid === "string" && sitIds.includes(sid);
      }).length;
      if (views < 1) return;

      fired.current = true;
      queueWhisper(
        buildReciprocalInterestWhisper({
          firstName: sitterFirstName || "Ce gardien",
          views,
          onInvite: () => {
            // Scroll vers la bulle AlmaFitGardien qui porte le bouton d'invitation.
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
  }, [isOwnerMode, user?.id, sitterId, sitterFirstName, canEmit, queueWhisper]);

  return null;
}

export default AlmaReciprocityWhisper;
