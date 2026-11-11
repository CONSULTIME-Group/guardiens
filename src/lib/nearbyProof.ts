/**
 * Lot ANN1 (11/11/2026) : la preuve affichée au premier écran de « Publier
 * une annonce » est le nombre réel de gardiens à moins de 50 km du membre
 * (mini arène du 11/11/2026 : médiane 23, un propriétaire sur dix en a 5 ou
 * moins). Sous 5 gardiens proches ou sans commune connue, le total des
 * gardiens inscrits prend le relais. Jamais de zéro affiché.
 */
export const NEARBY_PROOF_RADIUS_KM = 50;
export const NEARBY_PROOF_MIN_LOCAL = 5;

export interface NearbyProofInput {
  /** Gardiens à moins de 50 km, null sans position ou lecture en échec. */
  localCount: number | null;
  /** Total des gardiens inscrits, null si la lecture échoue. */
  nationalCount: number | null;
  /** Prénoms de gardiens proches, du plus proche au plus loin. */
  names?: string[];
}

export interface NearbyProof {
  scope: "local" | "national";
  count: number;
  headline: string;
  line: string;
  names: string[];
}

const NARROW_SPACES = new RegExp(`[${String.fromCharCode(0x202f)}${String.fromCharCode(0xa0)}]`, "g");
const fmt = (n: number) => n.toLocaleString("fr-FR").replace(NARROW_SPACES, " ");

function cleanNames(names: string[] | undefined): string[] {
  const out: string[] = [];
  for (const raw of names ?? []) {
    const n = (raw ?? "").trim().split(/\s+/)[0] ?? "";
    if (n.length < 2 || out.includes(n)) continue;
    out.push(n);
    if (out.length === 3) break;
  }
  return out;
}

export function buildNearbyProof(input: NearbyProofInput): NearbyProof | null {
  const local = typeof input.localCount === "number" ? Math.floor(input.localCount) : null;
  const national = typeof input.nationalCount === "number" ? Math.floor(input.nationalCount) : null;
  const tail = "Ceux que votre garde intéresse vous écrivent.";

  if (local !== null && local >= NEARBY_PROOF_MIN_LOCAL) {
    const names = cleanNames(input.names);
    const others = local - names.length;
    let who = "Ils voient";
    if (names.length === 3 && others > 0) {
      who = `${names[0]}, ${names[1]}, ${names[2]} et ${fmt(others)} ${others > 1 ? "autres" : "autre"} voient`;
    }
    return {
      scope: "local",
      count: local,
      headline: `${fmt(local)} gardiens à moins de ${NEARBY_PROOF_RADIUS_KM} km de chez vous`,
      line: `${who} votre annonce dès sa publication. ${tail}`,
      names: who === "Ils voient" ? [] : names,
    };
  }
  if (national !== null && national >= NEARBY_PROOF_MIN_LOCAL) {
    return {
      scope: "national",
      count: national,
      headline: `${fmt(national)} gardiens inscrits sur Guardiens`,
      line: `Ils voient votre annonce dès sa publication. ${tail}`,
      names: [],
    };
  }
  return null;
}

/** Distance en km entre deux points (haversine). */
export function kmBetween(a: { lat: number; lng: number }, b: { lat: number; lng: number }): number {
  const rad = (d: number) => (d * Math.PI) / 180;
  const dLat = rad(b.lat - a.lat);
  const dLng = rad(b.lng - a.lng);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 6371 * 2 * Math.asin(Math.min(1, Math.sqrt(h)));
}

export interface NearbyFace { id: string; first_name: string; avatar_url: string | null }

/** Trois gardiens au plus, les plus proches dans le rayon, photo d'abord. */
export function pickNearbyFaces(
  me: { lat: number; lng: number; id: string },
  rows: Array<{ id: string; first_name: string | null; avatar_url: string | null; latitude_approx: number | null; longitude_approx: number | null }>,
): NearbyFace[] {
  return rows
    .filter((r) => r.id !== me.id && !!r.first_name && r.first_name.trim().length >= 2 && typeof r.latitude_approx === "number" && typeof r.longitude_approx === "number")
    .map((r) => ({ r, km: kmBetween(me, { lat: r.latitude_approx as number, lng: r.longitude_approx as number }) }))
    .filter((x) => x.km <= NEARBY_PROOF_RADIUS_KM)
    .sort((a, b) => Number(!!b.r.avatar_url) - Number(!!a.r.avatar_url) || a.km - b.km)
    .slice(0, 3)
    .map((x) => ({ id: x.r.id, first_name: (x.r.first_name as string).trim().split(/\s+/)[0], avatar_url: x.r.avatar_url }));
}
