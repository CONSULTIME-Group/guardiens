/**
 * Lot perf 9 : centre officiel d'une commune française par geo.api.gouv.fr
 * (base des communes de l'État), avant Nominatim, qui refuse souvent les
 * appels des fonctions serveur (406 ou silence, mesuré au lot GL4) : une
 * commune absente du cache coûtait 2 à 5 s à chaque recherche avec un point.
 *
 * Règles, prudentes pour ne jamais mettre en cache un mauvais point :
 * - code postal : la commune la plus peuplée du code postal ;
 * - nom : une seule commune au nom exact (accents, casse et tirets ignorés),
 *   sinon rien (homonymes : Nominatim garde la main, comme avant).
 * Aucune exception : réseau en panne, délai dépassé ou réponse illisible = null.
 */

export type CommuneRow = {
  nom?: unknown;
  population?: unknown;
  centre?: { coordinates?: unknown } | null;
};

export const OFFICIAL_FR_TIMEOUT_MS = 3000;

export function normalizeCommuneName(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/\bst\b/g, "saint")
    .replace(/\bste\b/g, "sainte")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function centreOf(row: CommuneRow): { lat: number; lng: number } | null {
  const c = row?.centre?.coordinates;
  if (!Array.isArray(c) || c.length < 2) return null;
  const lng = Number(c[0]);
  const lat = Number(c[1]);
  if (!Number.isFinite(lat) || !Number.isFinite(lng) || Math.abs(lat) > 90 || Math.abs(lng) > 180) return null;
  if (lat === 0 && lng === 0) return null;
  return { lat, lng };
}

const pop = (r: CommuneRow) => (typeof r.population === "number" && Number.isFinite(r.population) ? r.population : 0);

/** Choix pur dans la réponse de geo.api.gouv.fr. */
export function pickOfficialCommune(
  rows: unknown,
  query: string,
  isPostal: boolean,
): { lat: number; lng: number; nom: string } | null {
  if (!Array.isArray(rows) || rows.length === 0) return null;
  const located = (rows as CommuneRow[])
    .map((r) => ({ r, c: centreOf(r) }))
    .filter((x): x is { r: CommuneRow; c: { lat: number; lng: number } } => !!x.c && typeof x.r.nom === "string");
  if (located.length === 0) return null;
  if (isPostal) {
    const best = [...located].sort((a, b) => pop(b.r) - pop(a.r))[0];
    return { ...best.c, nom: best.r.nom as string };
  }
  const wanted = normalizeCommuneName(query);
  if (!wanted) return null;
  const exact = located.filter((x) => normalizeCommuneName(x.r.nom as string) === wanted);
  if (exact.length !== 1) return null;
  return { ...exact[0].c, nom: exact[0].r.nom as string };
}

export function officialCommuneUrl(query: string, isPostal: boolean): string {
  const params = new URLSearchParams({ fields: "nom,centre,population", format: "json" });
  if (isPostal) params.set("codePostal", query.trim());
  else {
    params.set("nom", query.trim());
    params.set("boost", "population");
    params.set("limit", "20");
  }
  return `https://geo.api.gouv.fr/communes?${params}`;
}

export async function geocodeOfficialFr(
  query: string,
  isPostal: boolean,
  fetchImpl: typeof fetch = fetch,
  timeoutMs = OFFICIAL_FR_TIMEOUT_MS,
): Promise<{ lat: number; lng: number; nom: string } | null> {
  if (!query || query.trim().length < 2) return null;
  try {
    const res = await fetchImpl(officialCommuneUrl(query, isPostal), {
      headers: { "User-Agent": "Guardiens/1.0 (geocode)" },
      signal: typeof AbortSignal.timeout === "function" ? AbortSignal.timeout(timeoutMs) : undefined,
    });
    if (!res.ok) return null;
    return pickOfficialCommune(await res.json(), query, isPostal);
  } catch {
    return null;
  }
}
