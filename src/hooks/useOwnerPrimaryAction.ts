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

const PUBLISHED_STATUSES = ["published", "confirmed", "completed"] as const;

export function useOwnerPrimaryAction(userId: string | undefined) {
  return useQuery<OwnerPrimaryAction>({
    queryKey: ["owner-primary-action", userId],
    enabled: !!userId,
    staleTime: 60_000,
    queryFn: async () => {
      if (!userId) return { action: null, draftId: null };

      // Une seule lecture : le compte d'annonces publiées et le dernier
      // brouillon se déduisent côté client de la même liste, triée comme
      // l'ancienne requête brouillon (updated_at desc, created_at desc).
      const { data: rows, error } = await supabase
        .from("sits")
        .select("id, status, updated_at, created_at")
        .eq("user_id", userId)
        .order("updated_at", { ascending: false, nullsFirst: false })
        .order("created_at", { ascending: false });
      if (error) throw error;
      const list = rows ?? [];

      // Au moins une annonce publiée (état "activé") : on ne pousse plus.
      if (list.some((r) => (PUBLISHED_STATUSES as readonly string[]).includes(r.status))) {
        return { action: null, draftId: null };
      }

      // Sinon, dernier brouillon éventuel (premier dans l'ordre ci-dessus).
      const draft = list.find((r) => r.status === "draft");
      if (draft) {
        return { action: "publish_draft", draftId: draft.id };
      }
      return { action: "create_first_sit", draftId: null };
    },
  });
}
