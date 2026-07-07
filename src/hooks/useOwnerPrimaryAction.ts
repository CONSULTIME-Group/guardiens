/**
 * useOwnerPrimaryAction — activation goulot proprio.
 *
 * Retourne l'unique action prioritaire pour un proprio tant qu'il n'a pas
 * publié sa première annonce :
 *   - `create_first_sit` : aucune annonce en base (ni brouillon).
 *   - `publish_draft`    : au moins un brouillon, aucune annonce publiée.
 *   - `null`             : au moins une annonce publiée (activé), on ne
 *                          pousse plus.
 *
 * Volontairement autonome (query dédiée) pour rester réutilisable hors du
 * dashboard, notamment par Alma et les whispers.
 */
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type OwnerPrimaryActionKind = "create_first_sit" | "publish_draft";

export interface OwnerPrimaryAction {
  action: OwnerPrimaryActionKind | null;
  draftId: string | null;
}

const PUBLISHED_STATUSES = ["published", "confirmed", "completed"];

export function useOwnerPrimaryAction(userId: string | undefined) {
  return useQuery<OwnerPrimaryAction>({
    queryKey: ["owner-primary-action", userId],
    enabled: !!userId,
    staleTime: 60_000,
    queryFn: async () => {
      if (!userId) return { action: null, draftId: null };

      // Détecte l'existence d'au moins une annonce publiée (état "activé").
      const { count: publishedCount, error: publishedErr } = await supabase
        .from("sits")
        .select("id", { count: "exact", head: true })
        .eq("user_id", userId)
        .in("status", PUBLISHED_STATUSES);
      if (publishedErr) throw publishedErr;
      if ((publishedCount ?? 0) > 0) {
        return { action: null, draftId: null };
      }

      // Sinon, dernier brouillon éventuel.
      const { data: drafts, error: draftErr } = await supabase
        .from("sits")
        .select("id, updated_at, created_at")
        .eq("user_id", userId)
        .eq("status", "draft")
        .order("updated_at", { ascending: false, nullsFirst: false })
        .order("created_at", { ascending: false })
        .limit(1);
      if (draftErr) throw draftErr;
      const draft = drafts?.[0];
      if (draft) {
        return { action: "publish_draft", draftId: draft.id };
      }
      return { action: "create_first_sit", draftId: null };
    },
  });
}
