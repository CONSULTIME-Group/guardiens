/**
 * Lot perf 19 (09/11/2026) : une recherche par changement réel.
 *
 * searchKey résume les dix dépendances réseau de doSearch (SearchSitter) :
 * deux états de même clé donnent exactement la même recherche, la relancer ne
 * changerait rien à l'écran. Le point du membre est arrondi à 4 décimales
 * (environ 11 m) : un profil qui repose le même point dans un nouvel objet
 * ne relance rien. La ville est comparée sans casse, accents ni espaces de
 * bord, comme la saisie (normalize).
 *
 * diffSearchInputs nomme les clés changées entre deux états, triggerMotif les
 * traduit en motif de mesure (tab, city, radius, zone, dates, user_point,
 * user_city, user_postal). Module pur, sans lecture ni effet.
 */
import { normalize } from "@/lib/normalize";

export interface SearchInputs {
  tab: string;
  missionSubTab: string;
  city: string;
  radius: number[] | number;
  zoneMode: string;
  startDate: string;
  endDate: string;
  userCoords: { lat: number; lng: number } | null;
  userCity: string;
  userPostalCode: string | null;
}

export const SEARCH_INPUT_KEYS = [
  "tab", "missionSubTab", "city", "radius", "zoneMode", "startDate", "endDate", "userCoords", "userCity", "userPostalCode",
] as const satisfies readonly (keyof SearchInputs)[];
export type SearchInputKey = (typeof SEARCH_INPUT_KEYS)[number];

/** Nombre de motifs gardés dans une mesure (chaîne « 1:init,2:radius »). */
export const MAX_TRIGGERS = 6;

const round4 = (n: number) => Math.round(n * 10_000) / 10_000;

function part(i: SearchInputs, k: SearchInputKey): string | number | null {
  switch (k) {
    case "city": return normalize((i.city ?? "").trim());
    case "userCity": return normalize((i.userCity ?? "").trim());
    case "radius": return Array.isArray(i.radius) ? (i.radius[0] ?? null) : i.radius;
    case "userCoords": return i.userCoords ? `${round4(i.userCoords.lat)},${round4(i.userCoords.lng)}` : null;
    case "userPostalCode": return i.userPostalCode ? i.userPostalCode.trim() : null;
    default: return (i[k] as string) ?? "";
  }
}

/** Clé d'une recherche : même clé, même recherche. */
export function searchKey(i: SearchInputs): string {
  return JSON.stringify(SEARCH_INPUT_KEYS.map((k) => part(i, k)));
}

/** Noms des clés changées entre deux états, dans l'ordre de SEARCH_INPUT_KEYS. */
export function diffSearchInputs(prev: SearchInputs, next: SearchInputs): SearchInputKey[] {
  return SEARCH_INPUT_KEYS.filter((k) => part(prev, k) !== part(next, k));
}

const MOTIF_OF: Record<SearchInputKey, string> = {
  tab: "tab",
  missionSubTab: "tab",
  city: "city",
  radius: "radius",
  zoneMode: "zone",
  startDate: "dates",
  endDate: "dates",
  userCoords: "user_point",
  userCity: "user_city",
  userPostalCode: "user_postal",
};

/** Motif d'une recherche relancée : motifs distincts joints par « + », vide si rien n'a changé. */
export function triggerMotif(changed: readonly SearchInputKey[]): string {
  const out: string[] = [];
  for (const k of changed) {
    const m = MOTIF_OF[k];
    if (!out.includes(m)) out.push(m);
  }
  return out.join("+");
}

/** Chaîne des motifs envoyée avec la mesure, 6 au plus. */
export function formatTriggers(list: readonly string[]): string {
  return list.slice(0, MAX_TRIGGERS).join(",");
}
