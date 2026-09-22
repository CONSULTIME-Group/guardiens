// Annonces ouvertes à portée d'un gardien.
//
// Décision du 22/09/2026 : les relances « candidatez » ne partent plus à vide.
// Elles ne partent que si au moins une annonce réellement ouverte se trouve à
// portée, et elles montrent cette annonce. Mesuré en production : 9 annonces
// ouvertes en France, 130 gardiens seulement en ont une à portée.
//
// Annonce ouverte, définition unique :
//   status = published, début dans le futur, candidatures acceptées,
//   ni masquée par le propriétaire (hidden_at) ni par la modération
//   (moderation_hidden_at).
//
// `sits` ne porte pas de coordonnées : on prend celles du propriétaire, comme
// le fait déjà send-nearby-daily-digest.
//
// Rayon : plafonné à 50 km, et rétréci si le gardien a déclaré plus petit.
// La lecture du rayon déclaré suit search-radius.ts, donc 30 km reste un
// marqueur de silence et vaut 100 km avant plafonnement.

import { effectiveSearchRadius } from "./search-radius.ts";

export const MAX_NEARBY_RADIUS_KM = 50;

const SITE_URL = "https://guardiens.fr";

export interface OpenSitRow {
  id: string;
  slug?: string | null;
  title?: string | null;
  city?: string | null;
  start_date?: string | null;
  end_date?: string | null;
  status?: string | null;
  accepting_applications?: boolean | null;
  hidden_at?: string | null;
  moderation_hidden_at?: string | null;
  owner_latitude?: number | null;
  owner_longitude?: number | null;
}

export interface NearbySit {
  id: string;
  title: string;
  city: string | null;
  startDate: string | null;
  endDate: string | null;
  distanceKm: number;
  url: string;
}

export type NearbySkipReason = "no_coordinates" | "no_open_sit_nearby";

export interface NearbySitsResult {
  sits: NearbySit[];
  reason: NearbySkipReason | null;
}

/** Rayon réellement appliqué : le plus petit entre 50 km et le rayon déclaré. */
export function nearbyRadiusKm(declared: number | null | undefined): number {
  return Math.min(MAX_NEARBY_RADIUS_KM, effectiveSearchRadius(declared));
}

export function haversineKm(
  a: { lat: number; lng: number },
  b: { lat: number; lng: number },
): number {
  const R = 6371;
  const dLat = ((b.lat - a.lat) * Math.PI) / 180;
  const dLng = ((b.lng - a.lng) * Math.PI) / 180;
  const x = Math.sin(dLat / 2) ** 2
    + Math.cos((a.lat * Math.PI) / 180) * Math.cos((b.lat * Math.PI) / 180)
      * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(x), Math.sqrt(1 - x));
}

export function isOpenSit(row: OpenSitRow, nowIso: string): boolean {
  if (row.status !== "published") return false;
  if (row.accepting_applications === false) return false;
  if (row.hidden_at) return false;
  if (row.moderation_hidden_at) return false;
  if (!row.start_date) return false;
  return row.start_date > nowIso.slice(0, 10);
}

const FR_DATE = new Intl.DateTimeFormat("fr-FR", {
  day: "numeric",
  month: "long",
  year: "numeric",
  timeZone: "UTC",
});

function frDate(value: string | null | undefined): string | null {
  if (!value) return null;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : FR_DATE.format(d);
}

/**
 * Filtre pur, testable sans base : annonces ouvertes, dans le rayon, les plus
 * proches d'abord, au plus `limit`.
 */
export function selectNearbyOpenSits(
  rows: OpenSitRow[],
  viewer: { latitude?: number | null; longitude?: number | null; declaredRadiusKm?: number | null },
  options: { nowIso?: string; limit?: number } = {},
): NearbySitsResult {
  const nowIso = options.nowIso ?? new Date().toISOString();
  const limit = options.limit ?? 3;

  if (typeof viewer.latitude !== "number" || typeof viewer.longitude !== "number") {
    return { sits: [], reason: "no_coordinates" };
  }
  const radius = nearbyRadiusKm(viewer.declaredRadiusKm);
  const here = { lat: viewer.latitude, lng: viewer.longitude };

  const matches = rows
    .filter((row) => isOpenSit(row, nowIso))
    .filter((row) =>
      typeof row.owner_latitude === "number" && typeof row.owner_longitude === "number"
    )
    .map((row) => ({
      row,
      distance: haversineKm(here, {
        lat: row.owner_latitude as number,
        lng: row.owner_longitude as number,
      }),
    }))
    .filter((m) => m.distance <= radius)
    .sort((a, b) => a.distance - b.distance)
    .slice(0, limit)
    .map(({ row, distance }) => ({
      id: row.id,
      title: row.title ?? "Une garde près de chez vous",
      city: row.city ?? null,
      startDate: frDate(row.start_date),
      endDate: frDate(row.end_date),
      distanceKm: Math.round(distance),
      url: `${SITE_URL}/sits/${row.slug || row.id}`,
    }));

  return matches.length > 0
    ? { sits: matches, reason: null }
    : { sits: [], reason: "no_open_sit_nearby" };
}

/** Données passées aux templates. Aucune valeur inventée. */
export function nearbySitsTemplateData(sits: NearbySit[]): Record<string, unknown> {
  if (sits.length === 0) return {};
  return { nearbySits: sits, primarySitUrl: sits[0].url };
}

interface MinimalClient {
  from: (table: string) => any;
}

/**
 * Charge une fois les annonces ouvertes du pays, coordonnées propriétaire
 * incluses. Le volume est très faible (9 annonces mesurées), un appel par
 * passage suffit et se partage entre tous les destinataires.
 */
export async function fetchOpenSits(supabase: MinimalClient): Promise<OpenSitRow[]> {
  const today = new Date().toISOString().slice(0, 10);
  const { data, error } = await supabase
    .from("sits")
    .select(
      "id, slug, title, city, start_date, end_date, status, accepting_applications, hidden_at, moderation_hidden_at, profiles:user_id (latitude, longitude)",
    )
    .eq("status", "published")
    .gt("start_date", today)
    .limit(500);
  if (error) throw error;
  return ((data ?? []) as any[]).map((row) => {
    const owner = Array.isArray(row.profiles) ? row.profiles[0] : row.profiles;
    return {
      id: row.id,
      slug: row.slug,
      title: row.title,
      city: row.city,
      start_date: row.start_date,
      end_date: row.end_date,
      status: row.status,
      accepting_applications: row.accepting_applications,
      hidden_at: row.hidden_at,
      moderation_hidden_at: row.moderation_hidden_at,
      owner_latitude: owner?.latitude ?? null,
      owner_longitude: owner?.longitude ?? null,
    } as OpenSitRow;
  });
}
