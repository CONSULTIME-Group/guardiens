// Annonces ouvertes montrées à un gardien dans les relances.
//
// Décision du 23/09/2026 (lot N2), qui corrige le lot N1 : la distance ne
// commande plus l'envoi. Une garde à 300 km reste une garde possible, et un
// gardien qui voit une annonce comprend le service. On montre donc les
// 3 annonces ouvertes les plus proches en France, sans plafond de distance et
// sans lire le rayon déclaré du gardien.
//
// Gardien sans coordonnées : on montre les 3 annonces ouvertes les plus
// récentes, sans mention de distance.
//
// Seul le vide total reporte l'étape : zéro annonce ouverte en France.
//
// Annonce ouverte, définition unique :
//   status = published, début dans le futur, candidatures acceptées,
//   ni masquée par le propriétaire (hidden_at) ni par la modération
//   (moderation_hidden_at).
//
// `sits` ne porte pas de coordonnées : on prend celles du propriétaire, comme
// le fait déjà send-nearby-daily-digest.

const SITE_URL = "https://guardiens.fr";

export interface OpenSitRow {
  id: string;
  slug?: string | null;
  title?: string | null;
  city?: string | null;
  start_date?: string | null;
  end_date?: string | null;
  created_at?: string | null;
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
  /** null quand le gardien n'a pas de coordonnées : aucune distance inventée. */
  distanceKm: number | null;
  url: string;
}

export type NearbySkipReason = "no_coordinates" | "no_open_sit";

export interface NearbySitsResult {
  sits: NearbySit[];
  reason: NearbySkipReason | null;
  /** Distance de l'annonce la plus proche, pour le tri des envois. */
  nearestKm: number | null;
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

function toSit(row: OpenSitRow, distanceKm: number | null): NearbySit {
  return {
    id: row.id,
    title: row.title ?? "Une garde à découvrir",
    city: row.city ?? null,
    startDate: frDate(row.start_date),
    endDate: frDate(row.end_date),
    distanceKm,
    url: `${SITE_URL}/sits/${row.slug || row.id}`,
  };
}

/**
 * Filtre pur, testable sans base : annonces ouvertes du pays, les plus proches
 * d'abord, au plus `limit`. Sans coordonnées côté gardien, les plus récentes.
 */
export function selectNearbyOpenSits(
  rows: OpenSitRow[],
  viewer: { latitude?: number | null; longitude?: number | null },
  options: { nowIso?: string; limit?: number } = {},
): NearbySitsResult {
  const nowIso = options.nowIso ?? new Date().toISOString();
  const limit = options.limit ?? 3;

  const open = rows.filter((row) => isOpenSit(row, nowIso));
  if (open.length === 0) return { sits: [], reason: "no_open_sit", nearestKm: null };

  if (typeof viewer.latitude !== "number" || typeof viewer.longitude !== "number") {
    const recent = [...open]
      .sort((a, b) => String(b.created_at ?? "").localeCompare(String(a.created_at ?? "")))
      .slice(0, limit)
      .map((row) => toSit(row, null));
    return { sits: recent, reason: null, nearestKm: null };
  }

  const here = { lat: viewer.latitude, lng: viewer.longitude };
  const located = open.filter((row) =>
    typeof row.owner_latitude === "number" && typeof row.owner_longitude === "number"
  );

  // Aucune annonce géolocalisée : on montre quand même les plus récentes.
  if (located.length === 0) {
    const recent = [...open]
      .sort((a, b) => String(b.created_at ?? "").localeCompare(String(a.created_at ?? "")))
      .slice(0, limit)
      .map((row) => toSit(row, null));
    return { sits: recent, reason: null, nearestKm: null };
  }

  const matches = located
    .map((row) => ({
      row,
      distance: haversineKm(here, {
        lat: row.owner_latitude as number,
        lng: row.owner_longitude as number,
      }),
    }))
    .sort((a, b) => a.distance - b.distance)
    .slice(0, limit)
    .map(({ row, distance }) => toSit(row, Math.round(distance)));

  return { sits: matches, reason: null, nearestKm: matches[0].distanceKm };
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
 * incluses. Le volume est très faible, un appel par passage suffit et se
 * partage entre tous les destinataires.
 */
export async function fetchOpenSits(supabase: MinimalClient): Promise<OpenSitRow[]> {
  const today = new Date().toISOString().slice(0, 10);
  const { data, error } = await supabase
    .from("sits")
    .select(
      "id, slug, title, city, start_date, end_date, created_at, status, accepting_applications, hidden_at, moderation_hidden_at, profiles:user_id (latitude, longitude)",
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
      created_at: row.created_at,
      status: row.status,
      accepting_applications: row.accepting_applications,
      hidden_at: row.hidden_at,
      moderation_hidden_at: row.moderation_hidden_at,
      owner_latitude: owner?.latitude ?? null,
      owner_longitude: owner?.longitude ?? null,
    } as OpenSitRow;
  });
}
