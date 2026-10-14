/**
 * Lot H2 : lieu affiché sur les cartes « En ce moment » de l'accueil.
 *
 * Règle (décision de Jérémie du 14/10/2026) : la commune puis le département,
 * comme sur les cartes de /annonces (« Vialas, Lozère »). Hors de France, la
 * commune puis le pays ou le territoire (« Punaauia, Polynésie française »).
 * Le nom vient d'une table locale : aucune lecture réseau de plus sur l'accueil.
 */
import { DEPT_NAMES } from "@/lib/departments";
import { formatCityDepartement } from "@/lib/locationLabel";

/** Collectivités d'outre-mer absentes de DEPT_NAMES (codes 975 à 988). */
const OVERSEAS_NAMES: Record<string, string> = {
  "975": "Saint-Pierre-et-Miquelon",
  "977": "Saint-Barthélemy",
  "978": "Saint-Martin",
  "986": "Wallis-et-Futuna",
  "987": "Polynésie française",
  "988": "Nouvelle-Calédonie",
};

export const homeDepartmentName = (code: string | null | undefined): string | null => {
  if (!code) return null;
  const raw = String(code).trim().toUpperCase();
  if (!raw) return null;
  return DEPT_NAMES[raw] ?? DEPT_NAMES[raw.padStart(2, "0")] ?? OVERSEAS_NAMES[raw] ?? null;
};

/** Code département d'un code postal français, outre-mer compris (97x et 98x). */
export const homeDepartmentCodeFromPostal = (postalCode: string | null | undefined): string | null => {
  const cp = (postalCode ?? "").trim();
  if (!/^\d{5}$/.test(cp)) return null;
  if (cp.startsWith("97") || cp.startsWith("98")) return cp.slice(0, 3);
  if (cp.startsWith("20")) return Number(cp) <= 20190 ? "2A" : "2B";
  return cp.slice(0, 2);
};

/** Commune lisible : « VIALAS » devient « Vialas », « les Issambres » devient « Les Issambres ». */
export const homeCityDisplay = (city: string | null | undefined): string => {
  const c = (city ?? "").replace(/\s+/g, " ").trim();
  if (!c) return "";
  const letters = c.replace(/[^\p{L}]/gu, "");
  const base = letters.length > 1 && letters === letters.toLocaleUpperCase("fr")
    ? c.toLocaleLowerCase("fr").replace(/(^|[\s'’-])(\p{L})/gu, (_, sep: string, ch: string) => sep + ch.toLocaleUpperCase("fr"))
    : c;
  return base.charAt(0).toLocaleUpperCase("fr") + base.slice(1);
};

const countryName = (country: string): string | null => {
  try {
    const name = new Intl.DisplayNames(["fr"], { type: "region" }).of(country);
    return name && name !== country ? name : null;
  } catch {
    return null;
  }
};

const includesName = (text: string, name: string) =>
  text.toLocaleLowerCase("fr").includes(name.toLocaleLowerCase("fr"));

export interface HomeListingPlaceInput {
  city?: string | null;
  departementCode?: string | null;
  postalCode?: string | null;
  country?: string | null;
}

export const homeListingPlace = ({ city, departementCode, postalCode, country }: HomeListingPlaceInput): string => {
  const c = homeCityDisplay(city);
  const iso = (country ?? "FR").trim().toUpperCase() || "FR";
  const code = departementCode || (iso === "FR" || iso === "PF" || iso === "NC" ? homeDepartmentCodeFromPostal(postalCode) : null);
  const area = homeDepartmentName(code) ?? (iso !== "FR" ? countryName(iso) : null);
  if (area && c && includesName(c, area)) return c;
  return formatCityDepartement(c, area);
};
