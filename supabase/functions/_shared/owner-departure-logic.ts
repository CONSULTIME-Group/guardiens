/**
 * Logique pure du nurturing propriétaire v2, « Vous partez quand ? » (lot N4).
 * Aucune dépendance : partagée entre les fonctions serveur, le client et les
 * tests Vitest.
 */

export const DEPARTURE_PERIODS = ["noel", "hiver", "printemps", "ete", "plus_tard"] as const;
export type DeparturePeriod = typeof DEPARTURE_PERIODS[number];
export const DEPARTURE_SOURCES = ["email", "dashboard", "message"] as const;
export type DepartureSource = typeof DEPARTURE_SOURCES[number];

export const DEPARTURE_TOKEN_DAYS = 30;
export const DEPARTURE_TEMPLATE = "owner-departure-question";
/** Après « plus tard », la question revient au bout de 30 jours. */
export const LATER_SNOOZE_DAYS = 30;
/** Deux réponses identiques dans la même minute n'en font qu'une. */
export const DUPLICATE_WINDOW_MS = 60_000;

export const isDeparturePeriod = (v: unknown): v is DeparturePeriod =>
  typeof v === "string" && (DEPARTURE_PERIODS as readonly string[]).includes(v);

/** Libellés des cinq boutons, dans l'ordre. */
export const PERIOD_BUTTONS: Array<{ period: DeparturePeriod; label: string }> = [
  { period: "noel", label: "Pour Noël" },
  { period: "hiver", label: "Cet hiver" },
  { period: "printemps", label: "Au printemps" },
  { period: "ete", label: "Cet été" },
  { period: "plus_tard", label: "Je verrai plus tard" },
];

/** Titre « C'est noté : … » */
export const PERIOD_NOTED: Record<Exclude<DeparturePeriod, "plus_tard">, string> = {
  noel: "Noël",
  hiver: "cet hiver",
  printemps: "au printemps",
  ete: "cet été",
};

/** « Votre annonce de … » */
export const PERIOD_OF: Record<Exclude<DeparturePeriod, "plus_tard">, string> = {
  noel: "Noël",
  hiver: "cet hiver",
  printemps: "printemps",
  ete: "cet été",
};

/** Moment du rappel. */
export const PERIOD_REMINDER: Record<Exclude<DeparturePeriod, "plus_tard">, string> = {
  noel: "mi-novembre",
  hiver: "mi-novembre",
  printemps: "fin février",
  ete: "mi-mai",
};

/**
 * Dates préremplies. Seules les dates de Noël sont fixées par la demande
 * (19/12/2026 au 03/01/2027) : les autres périodes ouvrent la création sans
 * date plutôt qu'avec des dates inventées.
 */
export const PERIOD_PREFILL: Partial<Record<DeparturePeriod, { debut: string; fin: string }>> = {
  noel: { debut: "2026-12-19", fin: "2027-01-03" },
};

export function finishUrl(period: DeparturePeriod): string {
  const qs = new URLSearchParams({ express: "1", periode: period });
  const pre = PERIOD_PREFILL[period];
  if (pre) { qs.set("debut", pre.debut); qs.set("fin", pre.fin); }
  return `/sits/create?${qs.toString()}`;
}

export const departureUrlForToken = (token: string, period: DeparturePeriod) =>
  `https://guardiens.fr/ma-periode/${token}?p=${period}&utm_source=email&utm_medium=email&utm_campaign=owner_departure_question`;

/** Même format que les jetons /ma-ligne. */
export const isWellFormedDepartureToken = (t: unknown): t is string =>
  typeof t === "string" && t.length >= 32 && t.length <= 200 && /^[a-f0-9]+$/i.test(t);

export interface DepartureTokenRow { profile_id: string | null; expires_at: string | null; revoked_at: string | null }
export type DepartureTokenState = "valid" | "expired" | "revoked" | "invalid";

export function departureTokenState(row: DepartureTokenRow | null, now: Date = new Date()): DepartureTokenState {
  if (!row || !row.profile_id) return "invalid";
  if (row.revoked_at) return "revoked";
  if (!row.expires_at || new Date(row.expires_at).getTime() <= now.getTime()) return "expired";
  return "valid";
}

export interface IntentRow { period: string; answered_at: string }

/** Idempotence : même période dans la même minute que la dernière réponse. */
export function isDuplicateAnswer(last: IntentRow | null, period: DeparturePeriod, now: Date = new Date()): boolean {
  if (!last || last.period !== period) return false;
  return now.getTime() - new Date(last.answered_at).getTime() < DUPLICATE_WINDOW_MS;
}

/** État de la carte Alma selon la dernière réponse. */
export type AlmaDepartureState = "ask" | "known" | "hidden";
export function almaDepartureState(last: IntentRow | null, now: Date = new Date()): AlmaDepartureState {
  if (!last || !isDeparturePeriod(last.period)) return "ask";
  if (last.period !== "plus_tard") return "known";
  const age = now.getTime() - new Date(last.answered_at).getTime();
  return age < LATER_SNOOZE_DAYS * 86400000 ? "hidden" : "ask";
}

// ── Groupe témoin ────────────────────────────────────────────────────────────

export const HOLDOUT_SALT = "owner_v2_2026";

/**
 * Témoin si md5(user_id || 'owner_v2_2026') commence par « 0 » ou si ses deux
 * premiers caractères hexadécimaux sont inférieurs à « 1a ». La première
 * condition est incluse dans la seconde : la règle effective est « deux
 * premiers caractères entre 00 et 19 », soit 26 valeurs sur 256 (10,16 %).
 * Déterministe, sans écriture. Équivalent SQL :
 *   substr(md5(id::text || 'owner_v2_2026'), 1, 2) < '1a'
 */
export function isOwnerV2Holdout(userId: string): boolean {
  const h = md5(userId + HOLDOUT_SALT);
  return h[0] === "0" || h.slice(0, 2) < "1a";
}

/** MD5 (RFC 1321), sortie hexadécimale minuscule, entrée UTF-8. */
export function md5(input: string): string {
  const bytes = new TextEncoder().encode(input);
  const len = bytes.length;
  const words = new Uint32Array((((len + 8) >>> 6) + 1) * 16);
  for (let i = 0; i < len; i++) words[i >> 2] |= bytes[i] << ((i % 4) * 8);
  words[len >> 2] |= 0x80 << ((len % 4) * 8);
  words[words.length - 2] = (len * 8) >>> 0;
  words[words.length - 1] = Math.floor(len / 0x20000000);
  const S = [7, 12, 17, 22, 5, 9, 14, 20, 4, 11, 16, 23, 6, 10, 15, 21];
  const K = Array.from({ length: 64 }, (_, i) => Math.floor(Math.abs(Math.sin(i + 1)) * 2 ** 32) >>> 0);
  let a0 = 0x67452301, b0 = 0xefcdab89, c0 = 0x98badcfe, d0 = 0x10325476;
  for (let o = 0; o < words.length; o += 16) {
    let a = a0, b = b0, c = c0, d = d0;
    for (let i = 0; i < 64; i++) {
      let f: number, g: number;
      if (i < 16) { f = (b & c) | (~b & d); g = i; }
      else if (i < 32) { f = (d & b) | (~d & c); g = (5 * i + 1) % 16; }
      else if (i < 48) { f = b ^ c ^ d; g = (3 * i + 5) % 16; }
      else { f = c ^ (b | ~d); g = (7 * i) % 16; }
      const tmp = d; d = c; c = b;
      const x = (a + f + K[i] + words[o + g]) >>> 0;
      const s = S[(i >> 4) * 4 + (i % 4)];
      b = (b + ((x << s) | (x >>> (32 - s)))) >>> 0;
      a = tmp;
    }
    a0 = (a0 + a) >>> 0; b0 = (b0 + b) >>> 0; c0 = (c0 + c) >>> 0; d0 = (d0 + d) >>> 0;
  }
  return [a0, b0, c0, d0].map((n) =>
    [0, 8, 16, 24].map((s) => ((n >>> s) & 0xff).toString(16).padStart(2, "0")).join("")).join("");
}

// ── Préparation de l'annonce ─────────────────────────────────────────────────

export interface ReadinessInput {
  city?: string | null;
  latitude?: number | null;
  hasProperty: boolean;
  pets: Array<{ name?: string | null; species?: string | null }>;
  galleryPhotoCount: number;
  propertyPhotoCount: number;
  /** Brouillons : dates de début. */
  draftStartDates: Array<string | null>;
  today?: string;
}

export interface ReadinessItem { key: "commune" | "logement" | "animaux" | "photo" | "dates"; label: string; done: boolean }
export interface Readiness { percent: number; items: ReadinessItem[]; todo: ReadinessItem[] }

/**
 * Noms seuls, jamais de genre deviné (lot N5) : « Mila », « Mila et Rex »,
 * « Mila, Rex et Nala ». Sans nom : « Vos animaux ».
 */
function petLabel(pets: ReadinessInput["pets"]): string {
  const names = pets.map((p) => (p.name ?? "").trim()).filter(Boolean);
  if (names.length === 0) return "Vos animaux";
  if (names.length === 1) return names[0];
  return `${names.slice(0, -1).join(", ")} et ${names[names.length - 1]}`;
}

/** Cinq éléments de 20 % : commune, logement, animaux, photo, dates. */
export function computeReadiness(i: ReadinessInput): Readiness {
  const city = (i.city ?? "").trim();
  const today = i.today ?? new Date().toISOString().slice(0, 10);
  const hasCommune = !!city && typeof i.latitude === "number";
  const hasPets = i.pets.length > 0;
  const items: ReadinessItem[] = [
    { key: "commune", done: hasCommune, label: hasCommune ? `Votre commune, ${city}` : "Votre commune" },
    { key: "logement", done: i.hasProperty, label: i.hasProperty ? (city ? `Votre maison à ${city}` : "Votre maison") : "Votre maison" },
    {
      key: "animaux",
      done: hasPets || i.hasProperty,
      label: hasPets ? petLabel(i.pets) : i.hasProperty ? "Une maison à garder" : "Vos animaux",
    },
    { key: "photo", done: i.galleryPhotoCount + i.propertyPhotoCount > 0, label: "Une photo de chez vous" },
    { key: "dates", done: i.draftStartDates.some((d) => !!d && d >= today), label: "Vos dates" },
  ];
  const done = items.filter((x) => x.done).length;
  return { percent: done * 20, items, todo: items.filter((x) => !x.done) };
}

const lowerFirst = (s: string) => (s ? s.charAt(0).toLowerCase() + s.slice(1) : s);

/** « une photo de chez vous et vos dates », au plus deux, sinon « quelques détails ». */
export function remainingPhrase(todo: ReadinessItem[]): string {
  if (todo.length === 0) return "";
  if (todo.length === 1) return lowerFirst(todo[0].label);
  if (todo.length === 2) return `${lowerFirst(todo[0].label)} et ${lowerFirst(todo[1].label)}`;
  return "quelques détails";
}

/**
 * Robots de messagerie (lot N7) : un même jeton qui enregistre plus d'une
 * période distincte en moins de deux minutes signale un clic automatique.
 * Le jeton est unique par profil, les réponses « email » du profil suffisent.
 */
export const SCANNER_WINDOW_MS = 2 * 60 * 1000;
export function isScannerBurst(
  recentEmailRows: Array<{ period: string; answered_at: string }>,
  period: string,
  now: Date = new Date(),
): boolean {
  const since = now.getTime() - SCANNER_WINDOW_MS;
  const periods = new Set(
    recentEmailRows.filter((r) => new Date(r.answered_at).getTime() >= since).map((r) => r.period),
  );
  periods.add(period);
  return periods.size > 1;
}
