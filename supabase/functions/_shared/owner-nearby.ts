// Gardiens à proximité dans les emails propriétaires (lot W0, 14/10/2026).
//
// Un seul calcul pour tous les emails propriétaires (onboarding-j1,
// owner-no-sit-j3, j10, j21, sit-draft-reminder) : celui de l'email de Noël
// (owner-noel-audience.ts). Gardiens actifs, non suspendus, au rôle sitter ou
// both, fondateurs et admins exclus, géolocalisés, à moins de 50 km du
// propriétaire. Libellé : « N gardiens à moins de 50 km de {commune} », sans
// « vérifiés » et jamais « disponibles ».
//
// Module sans dépendance réseau hors loadOwnerSitterPool : importé aussi par
// les tests Vitest.

import {
  loadSitterPool,
  nearbySitters,
  NOEL_RADIUS_KM,
  pickThree,
  type OwnerGeo,
  type SitterRow,
} from './owner-noel-audience.ts'
import { emailAvatarUrl, emailCity } from './entraide-card-data.ts'

export const OWNER_NEARBY_RADIUS_KM = NOEL_RADIUS_KM

const SITE_URL = 'https://guardiens.fr'

/** « 1 gardien » ou « N gardiens », accord compris. */
export function sittersCountPhrase(count: number): string {
  return count === 1 ? '1 gardien' : `${count} gardiens`
}

/**
 * « N gardiens à moins de 50 km de Lyon », « de chez vous » sans commune.
 * Rien à afficher (null) quand aucun gardien n'est à proximité.
 */
export function nearbySittersLabel(count: number | null | undefined, city?: string | null): string | null {
  if (typeof count !== 'number' || !Number.isFinite(count) || count <= 0) return null
  const where = emailCity(city) ?? 'chez vous'
  return `${sittersCountPhrase(Math.floor(count))} à moins de ${OWNER_NEARBY_RADIUS_KM} km de ${where}`
}

/** Carte gardien transmise aux gabarits : prénom, commune, photo, distance arrondie. */
export interface OwnerNearbyCard {
  id: string
  first_name: string
  city?: string
  avatar_url?: string
  distance_km: number
  url: string
}

export interface OwnerNearbyContext {
  /** Nombre de gardiens à moins de 50 km. */
  count: number
  /** Libellé prêt à afficher, null sans gardien proche. */
  label: string | null
  /** Commune du propriétaire telle qu'affichée. */
  city?: string
  /** Les 3 cartes (photo et profil à 60 % d'abord), au plus 3. */
  cards: OwnerNearbyCard[]
}

/** Contexte « à proximité » d'un propriétaire, calcul pur. */
export function ownerNearbyContext(owner: OwnerGeo, pool: SitterRow[]): OwnerNearbyContext {
  const nearby = nearbySitters(owner, pool)
  const city = emailCity(owner.city)
  const cards = pickThree(nearby).map(({ row, km }) => {
    const c = emailCity(row.city)
    const a = emailAvatarUrl(row.avatar_url)
    return {
      id: row.id,
      first_name: (row.first_name ?? '').trim(),
      ...(c ? { city: c } : {}),
      ...(a ? { avatar_url: a } : {}),
      distance_km: Math.round(km),
      url: `${SITE_URL}/gardiens/${row.id}`,
    }
  })
  return {
    count: nearby.length,
    label: nearbySittersLabel(nearby.length, owner.city),
    ...(city ? { city } : {}),
    cards,
  }
}

/** Données communes aux gabarits propriétaires (noms de champs historiques conservés). */
export function ownerNearbyTemplateData(ctx: OwnerNearbyContext): Record<string, unknown> {
  return {
    ...(ctx.city ? { city: ctx.city } : {}),
    nearby_sitters_count: ctx.count,
    nearbySittersCount: ctx.count,
    nearbySittersLabel: ctx.label,
    radius_km: OWNER_NEARBY_RADIUS_KM,
    top_3_sitters: ctx.cards,
  }
}

/** Vivier partagé (lecture service), même source que l'email de Noël. */
export function loadOwnerSitterPool(client: unknown): Promise<SitterRow[]> {
  return loadSitterPool(client)
}

export type { OwnerGeo, SitterRow }
