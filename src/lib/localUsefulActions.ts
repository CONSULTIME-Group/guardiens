import { haversineDistance } from "@/utils/geo";
import { inferMissionCategory } from "@/lib/missionCategories";

export const LOCAL_ACTION_RADII = [5, 15, 30] as const;
export const DEFAULT_LOCAL_ACTION_RADIUS_KM = 15;
const DAY_MS = 86_400_000;

/** Informations publiques sur une action, distinctes du siège de l'association. */
export interface AssociationLocalAction {
  enabled?: boolean;
  title?: string;
  city?: string;
  postal_code?: string;
  latitude?: number | null;
  longitude?: number | null;
  confirmed_on?: string;
  available_from?: string;
  available_until?: string;
  when_label?: string;
  duration?: string;
  required_skills?: string[];
  beginner_friendly?: boolean;
}

export interface LocalAction {
  id: string;
  kind: "entraide" | "projet" | "association";
  title: string;
  city: string;
  latitude: number;
  longitude: number;
  href: string;
  date: string | null;
  until: string | null;
  when: string;
  duration: string;
  confirmedOn: string;
  skills: string[];
  requiredSkills: string[];
  beginnerFriendly: boolean;
  organisation?: string;
}

export type SelectedLocalAction = LocalAction & { distanceKm: number; matchingSkill: boolean };
export type ActionPoint = { latitude?: unknown; longitude?: unknown };

export function hasActionPoint<T extends ActionPoint>(point: T): point is T & { latitude: number; longitude: number } {
  return typeof point.latitude === "number" && Number.isFinite(point.latitude)
    && Math.abs(point.latitude) <= 90 && typeof point.longitude === "number"
    && Number.isFinite(point.longitude) && Math.abs(point.longitude) <= 180
    && !(point.latitude === 0 && point.longitude === 0);
}

/** Préférence de rayon propre au membre, partagée par le bloc et le rail. */
export const localActionRadiusKey = (userId: string) => `guardiens.local-actions-radius.${userId}`;
export function readStoredLocalActionRadius(userId: string): number {
  try {
    const km = Number(localStorage.getItem(localActionRadiusKey(userId)));
    if (LOCAL_ACTION_RADII.includes(km as 5 | 15 | 30)) return km;
  } catch { /* Préférence facultative. */ }
  return DEFAULT_LOCAL_ACTION_RADIUS_KM;
}

export function localActionDay(now = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Paris", year: "numeric", month: "2-digit", day: "2-digit" }).format(now);
}

const validDay = (day: unknown): day is string => typeof day === "string"
  && /^\d{4}-\d{2}-\d{2}$/.test(day) && Number.isFinite(Date.parse(day))
  && new Date(day).toISOString().slice(0, 10) === day;

export function isRecentActionConfirmation(day: unknown, now = new Date()): boolean {
  if (!validDay(day)) return false;
  const age = Date.parse(localActionDay(now)) - Date.parse(day);
  return age >= 0 && age <= 30 * DAY_MS;
}

/** Garde les seuls champs bien typés ; required_skills devient une liste de textes. */
function sanitizeLocalAction(value: unknown): AssociationLocalAction | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const v = value as Record<string, unknown>;
  const text = (k: string) => (typeof v[k] === "string" ? v[k] as string : undefined);
  return {
    enabled: v.enabled === true, title: text("title"), city: text("city"), postal_code: text("postal_code"),
    latitude: typeof v.latitude === "number" ? v.latitude : null, longitude: typeof v.longitude === "number" ? v.longitude : null,
    confirmed_on: text("confirmed_on"), available_from: text("available_from"), available_until: text("available_until"),
    when_label: text("when_label"), duration: text("duration"), beginner_friendly: v.beginner_friendly === true,
    required_skills: Array.isArray(v.required_skills) ? v.required_skills.filter((s): s is string => typeof s === "string") : [],
  };
}

export function associationLocalActionReady(input: AssociationLocalAction | null | undefined, sourceUrl?: string | null): boolean {
  const action = sanitizeLocalAction(input);
  let navigableSource = false;
  try { const url = new URL(sourceUrl ?? ""); navigableSource = ["http:", "https:"].includes(url.protocol) && !!url.hostname; } catch { /* Source obligatoire. */ }
  return !!action?.title?.trim() && !!action.city?.trim() && hasActionPoint(action)
    && validDay(action.confirmed_on) && validDay(action.available_from) && validDay(action.available_until)
    && action.available_from <= action.available_until && !!action.duration?.trim()
    && navigableSource
    && (action.beginner_friendly === true || (action.required_skills?.filter(s => s.trim()).length ?? 0) > 0);
}

const fold = (s: string) => s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
const DOMAINS: Array<[string, RegExp]> = [
  ["jardin", /jardin|potager|arros|semis|compost|plant|haie|horticul|permaculture|recolt/],
  ["meubles", /meuble|montage|monter|commode|bricol|repar|bois|reemploi/],
  ["couture", /couture|coudre|textile|retouche/],
  ["numerique", /informati|numerique|ordinateur|smartphone|telephone|web|excel/],
  ["animaux", /animaux|animal|chien|chat|poule|oiseau|refuge|promenade/],
  ["trajets", /transport|trajet|voiture|condu|covoit/],
  ["courses", /courses|livraison|colis|collecte.*(aliment|nourriture)/],
  ["compagnie", /compagnie|belote|scrabble|jeux|lecture|visite/],
  ["cuisine", /cuisine|repas|conserve|patisserie/],
  ["nature", /biodivers|naturaliste|pollinis|phenoclim|observation|spipoll/],
];
const domains = (text: string) => DOMAINS.filter(([, rx]) => rx.test(fold(text))).map(([key]) => key);

const escapeRx = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
// Un mot entier, jamais un fragment (« art » ne correspond plus à « départ »).
const containsWord = (text: string, word: string) => new RegExp(`(^|[^a-z0-9])${escapeRx(word)}($|[^a-z0-9])`).test(text);

/** Pertinence de découverte, jamais une certification ou une qualification. */
export function localActionSkillMatch(need: string, memberSkills: string[]): boolean {
  if (typeof need !== "string") return false;
  const n = fold(need).replace(/_/g, " ").trim();
  if (!n) return false;
  const target = domains(n);
  return memberSkills.some(skill => {
    if (typeof skill !== "string") return false;
    const s = fold(skill).trim();
    return s.length > 2 && (s === n || containsWord(s, n) || containsWord(n, s)
      || domains(s).some(d => target.includes(d)));
  });
}

/** Les prérequis ne se satisfont pas par une simple proximité de catégorie. */
export function requiredLocalActionSkillMatch(need: string, memberSkills: string[]): boolean {
  if (typeof need !== "string") return false;
  const n = fold(need).replace(/_/g, " ").trim();
  const names: Record<string, RegExp> = {
    bois: /charpente|menuiserie|travail du bois/,
    maconnerie: /maconnerie/,
    toiture: /toiture|couverture/,
    electricite: /electricite|electricien/,
    plomberie: /plomberie|plombier/,
    pierre_seche: /pierre seche/,
    taille_greffe: /greffe/,
    haie: /plantation.*haie|planter.*haie/,
    potager: /potager/,
    compost: /compost/,
    permaculture: /permaculture/,
  };
  const alias = names[need];
  return !!n && memberSkills.some(skill => {
    if (typeof skill !== "string") return false;
    const s = fold(skill).trim();
    return s.length > 2 && (s === n || s.includes(n) || (alias?.test(s) ?? false));
  });
}

const TECHNICAL_TERMS: Record<string, RegExp> = {
  electricite: /electri/,
  toiture: /toiture|toit\b|couvreur|gouttiere/,
  bois: /charpente|menuiserie/,
  maconnerie: /maconnerie|beton|parpaing/,
  plomberie: /plomberie|plombier|chauffe.?eau|canalisation/,
};

const DURATION_LABELS: Record<string, string> = {
  "1-2h": "1 à 2 heures", half_day: "Demi-journée", full_day: "Journée",
  weekend: "Week-end", week: "Semaine", several: "Plusieurs jours",
};
const durationLabel = (raw: unknown) => {
  const d = typeof raw === "string" ? raw.trim() : "";
  return DURATION_LABELS[d] ?? (d || "Durée à convenir");
};

interface MissionActionSource {
  id: string; user_id: string; slug?: string | null; title?: string | null;
  description?: string | null; city?: string | null; category?: string | null;
  latitude?: number | null; longitude?: number | null; status?: string | null;
  accepting_applications?: boolean | null; mission_type?: string | null;
  date_needed?: string | null; end_date?: string | null; created_at?: string | null;
  duration_estimate?: string | null; savoir_faire_attendus?: string[] | null;
  savoir_faire_transmis?: string[] | null; mois_accueil?: string[] | null;
}

export function missionLocalAction(row: MissionActionSource, userId: string, now = new Date()): LocalAction | null {
  if (row.status !== "open" || row.user_id === userId || row.mission_type === "offre"
    || row.accepting_applications === false || !row.title?.trim() || !row.city?.trim() || !hasActionPoint(row)) return null;
  const today = localActionDay(now);
  const until = row.end_date || row.date_needed || null;
  if ((until && (!validDay(until) || until < today)) || (row.date_needed && !validDay(row.date_needed))) return null;
  // Jour de publication à Paris, pas en UTC (une publication à 1 h 30 compte pour ce jour-là).
  const created = row.created_at ? new Date(row.created_at) : null;
  const confirmedOn = created && Number.isFinite(created.getTime()) ? localActionDay(created) : "";
  // Sans date, une ancienne publication ne prouve pas un besoin encore actuel.
  if (!until && !isRecentActionConfirmation(confirmedOn, now)) return null;
  const project = row.category === "projet";
  const expected = (row.savoir_faire_attendus ?? []).filter(s => s.trim());
  const category = inferMissionCategory(row.title, row.description);
  const text = fold(`${row.title} ${row.description ?? ""}`);
  const simpleTask = /arros|semis|compost|collecte|ramassage|belote|scrabble|compagnie|monter.{0,35}(meuble|commode)|montage.{0,35}meuble/.test(text);
  // Un terme technique devient un prérequis, satisfait par une compétence déclarée, jamais par un intérêt.
  const technical = Object.entries(TECHNICAL_TERMS).filter(([, rx]) => rx.test(text)).map(([key]) => key);
  return {
    id: `mission:${row.id}`, kind: project ? "projet" : "entraide", title: row.title.trim(), city: row.city.trim(),
    latitude: row.latitude, longitude: row.longitude,
    href: project ? `/projets/${encodeURIComponent(row.slug || row.id)}` : `/petites-missions/${encodeURIComponent(row.id)}`,
    date: row.date_needed ?? null, until, when: row.date_needed ?? "Dates à convenir",
    duration: durationLabel(row.duration_estimate), confirmedOn,
    requiredSkills: project ? expected : technical,
    skills: project ? [...expected, ...(row.savoir_faire_transmis ?? []), row.title] : [row.title, category === "house" ? "bricolage" : category === "garden" ? "jardinage" : category],
    beginnerFriendly: project ? expected.length === 0 : simpleTask && technical.length === 0,
  };
}

export function associationLocalActions(row: {
  slug: string; name: string; needs_details?: Array<{ url?: string | null; local_action?: AssociationLocalAction | null }> | null;
}, now = new Date()): LocalAction[] {
  // Données JSON saisies à la main : une entrée invalide est ignorée, jamais fatale.
  const needs: unknown[] = Array.isArray(row?.needs_details) ? row.needs_details : [];
  return needs.flatMap((raw, index) => {
    const need = raw && typeof raw === "object" ? raw as { url?: unknown; local_action?: unknown } : null;
    const a = sanitizeLocalAction(need?.local_action);
    if (!need || a?.enabled !== true || !associationLocalActionReady(a, typeof need.url === "string" ? need.url : null)
      || !isRecentActionConfirmation(a.confirmed_on, now) || a.available_until! < localActionDay(now)) return [];
    return [{
      id: `association:${row.slug}:${index}`, kind: "association" as const,
      title: a.title!.trim(), city: a.city!.trim(), latitude: a.latitude!, longitude: a.longitude!,
      href: `/associations/${encodeURIComponent(row.slug)}#besoin-${index}`, date: a.available_from!, until: a.available_until!,
      when: a.when_label?.trim() || a.available_from!, duration: a.duration!.trim(), confirmedOn: a.confirmed_on!,
      skills: [a.title!, ...(a.required_skills ?? []).filter(s => s.trim())], requiredSkills: (a.required_skills ?? []).filter(s => s.trim()),
      beginnerFriendly: a.beginner_friendly === true, organisation: row.name,
    }];
  });
}

export function selectLocalUsefulActions(actions: LocalAction[], context: {
  point: ActionPoint; skills: string[]; interests?: string[]; radiusKm?: number; now?: Date;
}): SelectedLocalAction[] {
  if (!hasActionPoint(context.point)) return [];
  const radius = LOCAL_ACTION_RADII.includes(context.radiusKm as 5 | 15 | 30) ? context.radiusKm! : DEFAULT_LOCAL_ACTION_RADIUS_KM;
  const today = localActionDay(context.now);
  const seen = new Set<string>();
  return actions.flatMap(a => {
    if (seen.has(a.id) || !hasActionPoint(a) || (a.until && a.until < today)) return [];
    if ((a.kind === "association" || !a.until) && !isRecentActionConfirmation(a.confirmedOn, context.now)) return [];
    seen.add(a.id);
    const distanceKm = haversineDistance({ lat: context.point.latitude as number, lng: context.point.longitude as number }, { lat: a.latitude, lng: a.longitude });
    if (!Number.isFinite(distanceKm) || distanceKm > radius) return [];
    if (a.requiredSkills.length && !a.requiredSkills.every(s => requiredLocalActionSkillMatch(s, context.skills))) return [];
    const matchingSkill = a.skills.some(s => localActionSkillMatch(s, [...context.skills, ...(context.interests ?? [])]));
    // Un intérêt oriente le classement ; seule une compétence ouvre une tâche non débutante.
    // Des prérequis tous satisfaits (contrôlés plus haut) valent correspondance de compétence.
    const matchingCompetence = a.requiredSkills.length > 0 || a.skills.some(s => localActionSkillMatch(s, context.skills));
    if (!matchingCompetence && !a.beginnerFriendly) return [];
    return [{ ...a, distanceKm, matchingSkill }];
  }).sort((a, b) => Number(b.matchingSkill) - Number(a.matchingSkill)
    || a.distanceKm - b.distanceKm || (a.date ?? "9999").localeCompare(b.date ?? "9999") || a.id.localeCompare(b.id)).slice(0, 2);
}
