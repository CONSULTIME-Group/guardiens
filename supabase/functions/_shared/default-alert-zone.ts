// Lot ALR2 (14/11/2026) : alerte immédiate pour les gardiens sans zone d'alerte.
//
// Audit du système d'alertes du 14/11/2026 (claude/audit-systeme-alertes-
// 14-novembre-2026.md, constat A2). La page de préférences promet « Un email
// dès qu'une garde correspond à votre secteur » (réglage par défaut), mais
// notify-sitters-on-publish ne servait que les zones d'alerte enregistrées.
// Les zones des anciens membres ont été créées le 31/07/2026 ; rien n'en crée
// depuis : 48 gardiens sur 793 inscrits depuis le 01/08 en avaient une, 745
// gardiens géolocalisés au total n'en avaient pas.
//
// Règle : un gardien sans aucune zone d'alerte active est servi comme s'il
// avait une zone de 30 km autour de la position de son profil (décision de
// Jérémie du 14/11/2026). Rien n'est écrit en base : la zone n'apparaît ni
// dans Paramètres ni dans le récapitulatif de zone. Elle n'est jamais faite
// main, donc elle passe sous le plafond de destinataires par annonce.
// Module pur, sans dépendance Deno, lu par la fonction et par les tests.

export const DEFAULT_ALERT_RADIUS_KM = 30
export const DEFAULT_ZONE_SOURCE = "alr2_position_profil"

export interface DefaultZoneCandidate {
  id: string
  latitude: number | null
  longitude: number | null
}

export interface DefaultZoneRow {
  user_id: string
  zone_type: "rayon"
  radius_km: number
  departement: null
  alert_types: string[]
  active: true
  source: string
}

function haversineKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371
  const dLat = ((lat2 - lat1) * Math.PI) / 180
  const dLon = ((lon2 - lon1) * Math.PI) / 180
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLon / 2) ** 2
  return 2 * R * Math.asin(Math.sqrt(a))
}

/** Cadre de lecture des profils autour d'un point, un peu plus large que le rayon. */
export function boundingBox(lat: number, lon: number, km: number) {
  const dLat = (km / 111) * 1.05
  const cos = Math.max(Math.cos((lat * Math.PI) / 180), 0.05)
  const dLon = (km / (111 * cos)) * 1.05
  return { minLat: lat - dLat, maxLat: lat + dLat, minLon: lon - dLon, maxLon: lon + dLon }
}

/**
 * Zones implicites pour une annonce : gardiens sans zone d'alerte active, dans
 * le rayon par défaut autour de la position de leur profil. Le propriétaire de
 * l'annonce est toujours écarté.
 */
export function defaultZonesFor(
  sit: { lat: number | null; lon: number | null },
  candidates: DefaultZoneCandidate[],
  usersWithZone: Set<string>,
  ownerId: string,
  radiusKm: number = DEFAULT_ALERT_RADIUS_KM,
): DefaultZoneRow[] {
  if (sit.lat == null || sit.lon == null) return []
  const out: DefaultZoneRow[] = []
  const seen = new Set<string>()
  for (const c of candidates) {
    if (!c.id || c.id === ownerId || seen.has(c.id) || usersWithZone.has(c.id)) continue
    if (c.latitude == null || c.longitude == null) continue
    if (haversineKm(sit.lat, sit.lon, c.latitude, c.longitude) > radiusKm) continue
    seen.add(c.id)
    out.push({
      user_id: c.id,
      zone_type: "rayon",
      radius_km: radiusKm,
      departement: null,
      alert_types: ["gardes"],
      active: true,
      source: DEFAULT_ZONE_SOURCE,
    })
  }
  return out
}

/** Même clé que lower(unaccent(city)) de geocode_cache.normalized_name. */
export function cacheCityKey(city: string | null | undefined): string {
  return String(city ?? "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase()
}
