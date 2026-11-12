// Lot REL1 (12/11/2026, décision D2 option B) : la mention « Réponse du
// propriétaire en attente » se montre au seul candidat concerné, sur sa
// candidature. La base ne rend à un gardien que ses propres lignes encore
// actives (RLS de owner_response_pending). Lecture en échec ou table absente :
// aucune mention, jamais d'erreur à l'écran.
import { supabase } from "@/integrations/supabase/client";
import { REL1_MENTION } from "../../supabase/functions/_shared/rel1-copy";

export const OWNER_RESPONSE_PENDING_LABEL = REL1_MENTION;

/** Statuts d'une candidature encore sans réponse. */
export function showsOwnerResponsePending(status: string | null | undefined, marked: boolean): boolean {
  return marked && (status === "pending" || status === "viewed");
}

interface Row { application_id: string; sit_id: string }

async function read(sitId?: string): Promise<Row[]> {
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let query = (supabase as any).from("owner_response_pending").select("application_id, sit_id");
    if (sitId) query = query.eq("sit_id", sitId);
    const { data, error } = await query.limit(200);
    if (error) return [];
    return (data ?? []) as Row[];
  } catch {
    return [];
  }
}

/** Candidatures du membre connecté qui portent la mention. */
export async function fetchOwnerResponsePendingIds(): Promise<Set<string>> {
  return new Set((await read()).map((r) => r.application_id));
}

/** Vrai si la candidature du membre connecté sur cette annonce porte la mention. */
export async function hasOwnerResponsePending(sitId: string): Promise<boolean> {
  return (await read(sitId)).length > 0;
}
