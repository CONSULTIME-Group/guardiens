/**
 * Lot X2 : adresse d'une publication d'entraide dans les notifications.
 * Un projet participatif a sa propre page (/projets/{slug}, repli id), où son
 * porteur lit les candidatures ; tout autre besoin reste sur /petites-missions/{id}.
 * Même règle que projetPath (src/lib/projetSeo.ts), sans dépendance Deno.
 */
export function missionLinkFor(row: { id: string; slug?: string | null; category?: string | null }): string {
  if (row.category === 'projet') {
    const slug = typeof row.slug === 'string' ? row.slug.trim() : ''
    return `/projets/${slug || row.id}`
  }
  return `/petites-missions/${row.id}`
}
