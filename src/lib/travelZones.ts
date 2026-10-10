/**
 * Mobilité géographique des gardiens (lot 2).
 *
 * Jetons stockés dans sitter_profiles.travel_zones (contrôle SQL
 * valid_travel_zones) :
 *   local                 près de chez moi, dans le rayon déclaré
 *   region:FR-XXX         une région française (ISO 3166-2)
 *   country:XX            un pays entier (ISO 3166-1 alpha-2), le sien inclus
 *   continent:AF|AS|EU|NA|OC|SA
 *   world                 le monde entier
 * NULL = non renseignée : jamais présentée comme une mobilité.
 * Les zones se combinent en OU.
 */
import { haversineDistance } from "@/lib/geocode";
import { effectiveSearchRadius } from "@/lib/searchRadius";

export type ContinentCode = "AF" | "AS" | "EU" | "NA" | "OC" | "SA";

export const CONTINENT_LABELS: Record<ContinentCode, string> = {
  EU: "Europe",
  NA: "Amérique du Nord",
  SA: "Amérique du Sud",
  AF: "Afrique",
  AS: "Asie",
  OC: "Océanie",
};

/** Pays vers continent (ISO). Amérique centrale et Caraïbes rattachées à l'Amérique du Nord. */
const CONTINENT_OF: Record<string, ContinentCode> = {};
const add = (c: ContinentCode, codes: string) => codes.split(" ").forEach((k) => { CONTINENT_OF[k] = c; });
add("EU", "AD AL AT BA BE BG BY CH CY CZ DE DK EE ES FI FO FR GB GG GI GR HR HU IE IM IS IT JE LI LT LU LV MC MD ME MK MT NL NO PL PT RO RS RU SE SI SK SM UA VA XK");
add("NA", "AG AI AW BB BL BM BQ BS BZ CA CR CU CW DM DO GD GL GP GT HN HT JM KN KY LC MF MQ MS MX NI PA PM PR SV SX TC TT US VC VG VI");
add("SA", "AR BO BR CL CO EC FK GF GY PE PY SR UY VE");
add("AF", "AO BF BI BJ BW CD CF CG CI CM CV DJ DZ EG EH ER ET GA GH GM GN GQ GW KE KM LR LS LY MA MG ML MR MU MW MZ NA NE NG RE RW SC SD SH SL SN SO SS ST SZ TD TG TN TZ UG YT ZA ZM ZW");
add("AS", "AE AF AM AZ BD BH BN BT CN GE HK ID IL IN IQ IR JO JP KG KH KP KR KW KZ LA LB LK MM MN MO MV MY NP OM PH PK PS QA SA SG SY TH TJ TL TM TR TW UZ VN YE");
add("OC", "AS AU CK FJ FM GU KI MH MP NC NF NR NU NZ PF PG PN PW SB TK TO TV VU WF WS");

/** Tous les pays connus (ISO), pour les listes de choix. */
export const KNOWN_COUNTRY_CODES: string[] = Object.keys(CONTINENT_OF);

export function continentOf(country: string | null | undefined): ContinentCode | null {
  if (!country) return null;
  return CONTINENT_OF[country.trim().toUpperCase()] ?? null;
}

/** Régions de France métropolitaine (codes ISO 3166-2 sans préfixe). */
export const FR_REGION_CODES = ["ARA", "BFC", "BRE", "CVL", "COR", "GES", "HDF", "IDF", "NOR", "NAQ", "OCC", "PDL", "PAC"] as const;

/** Libellés affichés. Règle éditoriale : le nom officiel ARA n'est jamais affiché. */
export const FR_REGION_LABELS: Record<string, string> = {
  ARA: "Rhône, Alpes et Massif central",
  BFC: "Bourgogne-Franche-Comté",
  BRE: "Bretagne",
  CVL: "Centre-Val de Loire",
  COR: "Corse",
  GES: "Grand Est",
  HDF: "Hauts-de-France",
  IDF: "Île-de-France",
  NOR: "Normandie",
  NAQ: "Nouvelle-Aquitaine",
  OCC: "Occitanie",
  PDL: "Pays de la Loire",
  PAC: "Provence-Alpes-Côte d'Azur",
};

const TOKEN_RE = /^(local|world|country:[A-Z]{2}|continent:(AF|AS|EU|NA|OC|SA)|region:FR-[A-Z]{3})$/;

/** Normalise une saisie : jetons valides, uniques, triés ; vide => null (non renseignée). */
export function normalizeTravelZones(input: readonly (string | null | undefined)[] | null | undefined): string[] | null {
  if (!input) return null;
  const out = new Set<string>();
  for (const raw of input) {
    if (!raw) continue;
    let t = raw.trim();
    const [k, v] = t.split(":");
    if (v !== undefined) t = `${k.toLowerCase()}:${v.toUpperCase()}`;
    else t = t.toLowerCase();
    if (t.startsWith("region:FR-") && !FR_REGION_CODES.includes(t.slice(10) as any)) continue;
    if (TOKEN_RE.test(t)) out.add(t);
  }
  if (out.size === 0) return null;
  return [...out].sort();
}

export function countryName(code: string): string {
  try { return new Intl.DisplayNames(["fr"], { type: "region" }).of(code) || code; } catch { return code; }
}

/** Libellés lisibles, dans l'ordre du plus proche au plus large. */
export function travelZoneLabels(zones: string[] | null | undefined, homeCountry?: string | null): string[] {
  const z = normalizeTravelZones(zones);
  if (!z) return [];
  const order = (t: string) => t === "local" ? 0 : t.startsWith("region:") ? 1 : t.startsWith("country:") ? 2 : t.startsWith("continent:") ? 3 : 4;
  return [...z].sort((a, b) => order(a) - order(b) || a.localeCompare(b)).map((t) => {
    if (t === "local") return "Près de chez soi";
    if (t === "world") return "Le monde entier";
    const [k, v] = t.split(":");
    if (k === "region") return `Région ${FR_REGION_LABELS[v.slice(3)] ?? v}`;
    if (k === "continent") return CONTINENT_LABELS[v as ContinentCode] ?? v;
    const name = countryName(v);
    return homeCountry && v === homeCountry.toUpperCase() ? `${name} entière` : name;
  });
}

/** Phrase de fiche publique ; jamais de mobilité inventée. */
export function travelZonesSummary(zones: string[] | null | undefined, homeCountry?: string | null): string {
  const labels = travelZoneLabels(zones, homeCountry);
  return labels.length ? `Peut se déplacer : ${labels.join(", ")}` : "Mobilité non renseignée";
}

export interface Destination {
  country: string;
  /** Région française ISO (ARA...) si la destination est en France. */
  regionFr?: string | null;
  center?: { lat: number; lng: number } | null;
}

/** Jetons qui couvrent une destination : monde, continent, pays, région. */
export function destinationTokens(dest: Destination): string[] {
  const c = dest.country.toUpperCase();
  const out = ["world", `country:${c}`];
  const cont = continentOf(c);
  if (cont) out.push(`continent:${cont}`);
  if (c === "FR" && dest.regionFr && FR_REGION_CODES.includes(dest.regionFr as any)) out.push(`region:FR-${dest.regionFr}`);
  return out;
}

export interface MobileSitter {
  country?: string | null;
  travel_zones?: string[] | null;
  geographic_radius?: number | null;
  profile?: { latitude_approx?: number | null; longitude_approx?: number | null } | null;
}

/**
 * « Peut venir ici » : ne lit que les zones DÉCLARÉES. NULL ou [] = jamais
 * retenu (aucune mobilité inventée, aucun opt-in implicite par la résidence).
 * world, continent, pays ou région déclarés couvrent la destination. « local »
 * seul : retenu uniquement avec une ville de destination, même pays, et
 * position approximative dans le rayon ; sans ville, local ne couvre pas un
 * pays entier.
 */
export function canComeTo(s: MobileSitter, dest: Destination): boolean {
  const zones = normalizeTravelZones(s.travel_zones);
  if (!zones || zones.length === 0) return false;
  const tokens = new Set(destinationTokens(dest));
  if (zones.some((z) => tokens.has(z))) return true;
  if (!zones.includes("local")) return false;
  if ((s.country ?? "").toUpperCase() !== dest.country.toUpperCase()) return false;
  if (!dest.center) return false;
  const lat = s.profile?.latitude_approx, lng = s.profile?.longitude_approx;
  if (typeof lat !== "number" || typeof lng !== "number") return false;
  const d = haversineDistance(dest.center.lat, dest.center.lng, lat, lng);
  return d <= effectiveSearchRadius(s.geographic_radius ?? null);
}
