// Lot HOME4 (13/11/2026) : quota des recherches geocode envoyées à Nominatim.
// Module pur, sans dépendance Deno, testé côté Vitest.

/** Recherches sortantes par appelant et par heure. Usage normal relevé à l'audit : 125 recherches sur 7 jours, tous appelants confondus. */
export const GEOCODE_PER_CALLER_HOURLY = 20
/** Recherches sortantes par heure, tous appelants confondus. */
export const GEOCODE_GLOBAL_HOURLY = 300
export const GEOCODE_GLOBAL_BUCKET = 'global'

/** Adresse de l'appelant, lue dans les en-têtes posés par la plateforme. */
export function callerAddress(headers: { get(name: string): string | null }): string {
  const direct = headers.get('cf-connecting-ip') || headers.get('x-real-ip')
  if (direct && direct.trim()) return direct.trim().slice(0, 64)
  const forwarded = headers.get('x-forwarded-for')
  const first = forwarded ? forwarded.split(',')[0].trim() : ''
  return first ? first.slice(0, 64) : 'inconnu'
}

/** Seau d'un appelant : empreinte de l'adresse, jamais l'adresse elle-même. */
export async function callerBucket(address: string): Promise<string> {
  const bytes = new TextEncoder().encode(`geocode:${address}`)
  const digest = await crypto.subtle.digest('SHA-256', bytes)
  const hex = Array.from(new Uint8Array(digest), (b) => b.toString(16).padStart(2, '0')).join('')
  return `ip_${hex.slice(0, 32)}`
}

type Take = (bucket: string, limit: number) => Promise<boolean | null>

/**
 * Une recherche sortante est-elle permise ? Deux prises : l'appelant, puis le
 * total. Une prise en échec technique (null) laisse passer : le quota protège
 * Nominatim, il ne coupe jamais la recherche à cause d'une panne du compteur.
 */
export async function allowOutboundGeocode(address: string, take: Take): Promise<boolean> {
  try {
    const own = await take(await callerBucket(address), GEOCODE_PER_CALLER_HOURLY)
    if (own === false) return false
    const all = await take(GEOCODE_GLOBAL_BUCKET, GEOCODE_GLOBAL_HOURLY)
    return all !== false
  } catch {
    return true
  }
}
