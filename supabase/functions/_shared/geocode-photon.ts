// Lot GEO1 (13/11/2026) : relais de géocodage quand Nominatim refuse.
// Mesure du 13/11 : Nominatim répond 403 aux appels de la fonction geocode,
// alors qu'il répond 200 au même en-tête depuis une autre adresse. Le cache
// ne reçoit plus aucun lieu hors de France depuis le 21/10/2026 (304 avant).
// Photon (photon.komoot.io) lit les mêmes données OpenStreetMap, sans clé.
// Module pur, sans dépendance Deno, testé côté Vitest.

/** En-têtes d'identification demandés par la politique d'usage de Nominatim. */
export const NOMINATIM_HEADERS = {
  'User-Agent': 'Guardiens/1.0 (+https://guardiens.fr; contact@guardiens.fr)',
  Referer: 'https://guardiens.fr/',
}
export const NOMINATIM_EMAIL = 'contact@guardiens.fr'

/** Adresse de recherche Photon pour une commune, limitée aux lieux habités. */
export function photonUrl(city: string, countryCode?: string): string {
  const params = new URLSearchParams({ q: city, limit: '5', lang: 'fr' })
  params.append('osm_tag', 'place')
  const url = `https://photon.komoot.io/api/?${params}`
  return countryCode ? `${url}&countrycode=${encodeURIComponent(countryCode.toUpperCase())}` : url
}

type PhotonFeature = {
  geometry?: { coordinates?: unknown }
  properties?: { countrycode?: unknown; osm_value?: unknown; name?: unknown }
}

const PLACE_RANK: Record<string, number> = { city: 0, town: 1, village: 2, municipality: 3, hamlet: 4, suburb: 5, locality: 6 }

/**
 * Premier lieu habité du bon pays. Une réponse sans lieu exploitable, ou
 * dans un autre pays que celui demandé, rend null.
 */
export function pickPhotonPlace(body: unknown, countryCode?: string): { lat: number; lng: number; name: string } | null {
  const features = (body as { features?: unknown })?.features
  if (!Array.isArray(features)) return null
  const wanted = countryCode ? countryCode.toUpperCase() : null
  const usable = (features as PhotonFeature[])
    .map((f) => {
      const c = f?.geometry?.coordinates
      const lng = Array.isArray(c) ? Number(c[0]) : NaN
      const lat = Array.isArray(c) ? Number(c[1]) : NaN
      const country = typeof f?.properties?.countrycode === 'string' ? f.properties.countrycode.toUpperCase() : ''
      const kind = typeof f?.properties?.osm_value === 'string' ? f.properties.osm_value : ''
      const name = typeof f?.properties?.name === 'string' ? f.properties.name : ''
      return { lat, lng, country, rank: PLACE_RANK[kind] ?? 9, name }
    })
    .filter((p) => Number.isFinite(p.lat) && Number.isFinite(p.lng) && Math.abs(p.lat) <= 90 && Math.abs(p.lng) <= 180)
    .filter((p) => !wanted || p.country === wanted)
  if (usable.length === 0) return null
  // L'ordre de Photon est celui de la pertinence ; à pertinence voisine, une
  // ville passe devant un lieu-dit. Seuls les trois premiers sont départagés.
  const head = usable.slice(0, 3).sort((a, b) => a.rank - b.rank)
  const best = head[0]
  return { lat: best.lat, lng: best.lng, name: best.name }
}
