/**
 * Lot Z2 (audit C-15 du 13/10/2026) : « Clôturer sans sélectionner ».
 *
 * Avant : les deux écritures ignoraient leur erreur, le toast « Mission
 * clôturée » s'affichait toujours, et le besoin passait en cancelled sans
 * closed_at ni close_reason (deux besoins en base dans cet état, avec 3
 * propositions restées en attente).
 *
 * Ordre conservé : les propositions en attente sont déclinées, puis le besoin
 * est clos avec sa date et son motif. Toute erreur, ou un besoin que la base
 * n'a pas modifié, remonte à l'écran.
 */
export const AUTHOR_CLOSE_NO_SELECT_REASON = "closed_by_author";

export type CloseNoSelectResult = { ok: true } | { ok: false; message: string };

export interface CloseNoSelectInput {
  missionId: string;
  pendingResponseIds: string[];
  now?: Date;
}

const DEFAULT_ERROR = "Clôture impossible. Réessayez dans un instant.";

// Client Supabase réduit aux appels utilisés (bouchonnable en test).
export async function closeMissionWithoutSelection(
  client: { from: (table: string) => any },
  { missionId, pendingResponseIds, now = new Date() }: CloseNoSelectInput,
): Promise<CloseNoSelectResult> {
  if (pendingResponseIds.length > 0) {
    const { error } = await client
      .from("small_mission_responses")
      .update({ status: "declined" })
      .in("id", pendingResponseIds);
    if (error) return { ok: false, message: error.message || DEFAULT_ERROR };
  }
  const { data, error } = await client
    .from("small_missions")
    .update({
      status: "cancelled",
      closed_at: now.toISOString(),
      close_reason: AUTHOR_CLOSE_NO_SELECT_REASON,
    })
    .eq("id", missionId)
    .select("id");
  if (error) return { ok: false, message: error.message || DEFAULT_ERROR };
  if (!Array.isArray(data) || data.length === 0) return { ok: false, message: DEFAULT_ERROR };
  return { ok: true };
}
