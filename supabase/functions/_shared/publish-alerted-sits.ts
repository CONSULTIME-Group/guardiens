// Annonces déjà envoyées en alerte immédiate (lot NUR1 bloc B, 08/11/2026).
//
// notify-sitters-on-publish réserve une ligne par annonce et par gardien dans
// sit_notification_log (clé publish-alert-{annonce}-{gardien}, source
// notify-sitters-on-publish, sit_ids = [annonce]). send-sitter-daily-digest
// écartait déjà ces annonces (30/08/2026) ; send-alert-digest et
// send-nearby-daily-digest les renvoyaient le jour même : 68 récapitulatifs
// sur 14 jours répétaient une annonce reçue en alerte (base du 08/11/2026).
//
// Une seule lecture par passage : les alertes des 7 derniers jours (environ
// 450 lignes). Seul status = 'claimed' compte, une ligne released veut dire
// que l'alerte n'est pas partie et le récapitulatif reste le filet.
// Lecture en échec : rien n'est écarté (un doublon coûte moins qu'une annonce
// jamais diffusée). Module sans dépendance Deno, importé aussi par Vitest.

export const PUBLISH_ALERT_SOURCE = 'notify-sitters-on-publish'
export const PUBLISH_ALERT_WINDOW_MS = 7 * 86400_000
const PAGE = 1000
const MAX_PAGES = 10

export type PublishAlertedSits = Map<string, Set<string>>

// deno-lint-ignore no-explicit-any
type Client = any

export async function loadPublishAlertedSits(client: Client, nowMs: number = Date.now()): Promise<PublishAlertedSits> {
  const out: PublishAlertedSits = new Map()
  const since = new Date(nowMs - PUBLISH_ALERT_WINDOW_MS).toISOString()
  try {
    for (let page = 0; page < MAX_PAGES; page++) {
      const { data, error } = await client.from('sit_notification_log')
        .select('user_id, sit_ids, created_at')
        .eq('source', PUBLISH_ALERT_SOURCE)
        .eq('status', 'claimed')
        .gte('created_at', since)
        .order('created_at', { ascending: true })
        .range(page * PAGE, page * PAGE + PAGE - 1)
      if (error) throw error
      const rows = (data ?? []) as Array<{ user_id: string | null; sit_ids: string[] | null }>
      for (const row of rows) {
        if (!row.user_id || !Array.isArray(row.sit_ids)) continue
        let set = out.get(row.user_id)
        if (!set) { set = new Set(); out.set(row.user_id, set) }
        for (const id of row.sit_ids) if (id) set.add(id)
      }
      if (rows.length < PAGE) break
    }
  } catch (err) {
    console.error('[publish-alerted-sits] lecture impossible, aucun filtre', (err as { message?: string })?.message ?? err)
    return new Map()
  }
  return out
}

/** Annonces de la liste que ce gardien n'a pas déjà reçues en alerte immédiate. */
export function withoutPublishAlerted<T extends { id: string }>(
  alerted: PublishAlertedSits, userId: string, sits: T[],
): T[] {
  const seen = alerted.get(userId)
  if (!seen || seen.size === 0) return sits
  return sits.filter((s) => !seen.has(s.id))
}
