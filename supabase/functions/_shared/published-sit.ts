// Définition unique de « jamais publié » (lot W0, 14/10/2026).
//
// Un propriétaire a publié dès qu'une de ses annonces porte published_at
// (quel que soit son statut aujourd'hui : en ligne, expirée, archivée,
// annulée, repassée en brouillon). Un brouillon jamais mis en ligne ne compte
// pas. Équivalent SQL : public.has_published_sit(uuid), même règle.
//
// Utilisé par evaluate-journeys (sortie de séquence), owner-noel-audience,
// send-sit-draft-reminder, send-mass-email (no_sit_published_ever et
// never_published_sit) et ma-periode. Module sans dépendance : importé aussi
// par les tests Vitest.

export interface PublishedSitLike {
  published_at?: string | null
}

/** Vrai si l'annonce a été mise en ligne au moins une fois. */
export function isPublishedSit(row: PublishedSitLike | null | undefined): boolean {
  return !!row && typeof row.published_at === 'string' && row.published_at.trim().length > 0
}

/** Identifiants des propriétaires ayant publié, depuis des lignes de sits. */
export function publishedOwnerIdsFrom(rows: Array<PublishedSitLike & { user_id: string }>): Set<string> {
  const out = new Set<string>()
  for (const r of rows) if (isPublishedSit(r)) out.add(r.user_id)
  return out
}

// deno-lint-ignore no-explicit-any
type Client = any
const PAGE = 1000

/** Tous les propriétaires ayant publié au moins une fois (lecture paginée). */
export async function loadPublishedOwnerIdSet(client: Client): Promise<Set<string>> {
  const out = new Set<string>()
  for (let from = 0; ; from += PAGE) {
    const { data, error } = await client.from('sits')
      .select('user_id, published_at')
      .not('published_at', 'is', null)
      .order('id', { ascending: true })
      .range(from, from + PAGE - 1)
    if (error) throw new Error(`published sits lookup failed: ${error.message}`)
    for (const r of (data ?? []) as Array<{ user_id: string; published_at: string | null }>) {
      if (isPublishedSit(r)) out.add(r.user_id)
    }
    if (!data || data.length < PAGE) break
  }
  return out
}

/** Un propriétaire précis a-t-il publié ? Lève une erreur si la lecture échoue. */
export async function ownerHasPublished(client: Client, userId: string): Promise<boolean> {
  const { count, error } = await client.from('sits')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', userId)
    .not('published_at', 'is', null)
  if (error) throw new Error(`published sit lookup failed: ${error.message}`)
  return (count ?? 0) > 0
}
