// Lot ANN-6 (17/11/2026) : diffusion nationale ciblée d'une annonce.
//
// Règles partagées entre l'écran admin (ListingProximityCard) et la fonction
// send-listing-proximity, sans dépendance Deno, pour qu'un texte refusé à
// l'écran le soit aussi au serveur.
//
// - audience : « recent_90d » (gardiens vus depuis 90 jours) ou « all »
//   (tous les gardiens actifs). Elle ne vaut que pour une diffusion nationale
//   (rayon d'au moins 1 000 km) ; autour de l'annonce, tous les gardiens du
//   rayon sont visés, comme avant.
// - objet et accroche : facultatifs, rédigés par l'administrateur.

export type BroadcastAudience = "recent_90d" | "all";

/** Choix proposé par défaut à l'écran. Sans audience dans l'appel, la fonction garde son comportement d'avant (tous). */
export const DEFAULT_AUDIENCE: BroadcastAudience = "recent_90d";
export const RECENT_AUDIENCE_DAYS = 90;
export const CUSTOM_SUBJECT_MAX = 90;
export const CUSTOM_HOOK_MAX = 220;

/**
 * Audience demandée. Seule la valeur explicite « recent_90d » restreint la
 * cible : un autre appelant (fenêtre des signaux) qui n'envoie pas d'audience
 * garde le comportement d'avant, tous les gardiens actifs.
 */
export function parseAudience(raw: unknown): BroadcastAudience {
  return raw === "recent_90d" ? "recent_90d" : "all";
}

/** Date limite de dernière visite pour l'audience « recent_90d ». */
export function recentSeenCutoff(now: Date = new Date()): string {
  return new Date(now.getTime() - RECENT_AUDIENCE_DAYS * 24 * 60 * 60 * 1000).toISOString();
}

const EMOJI_RE = /[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}\u{1F000}-\u{1F2FF}✅✓✔✌⭐⭕️]/u;
const DASH_RE = /[–—]/;

/** Espaces et retours à la ligne ramenés à des espaces simples. */
export function collapseSpaces(text: string): string {
  return text.replace(/\s+/g, " ").trim();
}

export interface CustomTextCheck {
  /** Texte nettoyé (vide quand le champ est laissé vide). */
  value: string;
  /** Message affirmatif quand le texte est refusé, sinon null. */
  error: string | null;
}

function checkCommon(label: string, value: string): string | null {
  if (EMOJI_RE.test(value)) return `${label} : retirez les émojis.`;
  if (DASH_RE.test(value)) return `${label} : remplacez les tirets longs par des virgules ou des parenthèses.`;
  return null;
}

/**
 * Objet de l'email. Apostrophes droites ramenées à l'apostrophe typographique
 * (charte des objets), pas de point d'exclamation.
 */
export function checkCustomSubject(raw: unknown): CustomTextCheck {
  if (raw == null) return { value: "", error: null };
  const value = collapseSpaces(String(raw)).replace(/'/g, "’");
  if (!value) return { value: "", error: null };
  if (value.length > CUSTOM_SUBJECT_MAX) {
    return { value, error: `Objet : ${CUSTOM_SUBJECT_MAX} caractères au plus.` };
  }
  if (value.includes("!")) return { value, error: "Objet : retirez le point d'exclamation." };
  const common = checkCommon("Objet", value);
  return { value, error: common };
}

/** Accroche : un paragraphe de texte simple, ajouté sous la phrase d'ouverture. */
export function checkCustomHook(raw: unknown): CustomTextCheck {
  if (raw == null) return { value: "", error: null };
  const value = collapseSpaces(String(raw));
  if (!value) return { value: "", error: null };
  if (value.length > CUSTOM_HOOK_MAX) {
    return { value, error: `Accroche : ${CUSTOM_HOOK_MAX} caractères au plus.` };
  }
  const common = checkCommon("Accroche", value);
  return { value, error: common };
}

/** Vrai quand la garde couvre le 24 ou le 25 décembre (dates AAAA-MM-JJ). */
export function coversChristmas(start?: string | null, end?: string | null): boolean {
  if (!start || !end) return false;
  const s = start.slice(0, 10);
  const e = end.slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s) || !/^\d{4}-\d{2}-\d{2}$/.test(e) || e < s) return false;
  const y0 = Number(s.slice(0, 4));
  const y1 = Number(e.slice(0, 4));
  for (let y = y0; y <= y1; y++) {
    for (const day of ["24", "25"]) {
      const d = `${y}-12-${day}`;
      if (d >= s && d <= e) return true;
    }
  }
  return false;
}

/**
 * Suggestions d'objet et d'accroche, pré-remplies côté écran. L'administrateur
 * les garde, les modifie ou les efface.
 * Objet : « Et si votre Noël avait lieu à {ville} ? » quand les dates incluent
 * le 24 ou le 25 décembre, sinon « {Prénom} cherche un gardien à {ville} ».
 * Accroche : « {Prénom} cherche quelqu'un pour garder son logement à {ville},
 * {dates}. Nous avons pensé à vous. »
 */
export function suggestBroadcastTexts(input: {
  city?: string | null;
  ownerFirstName?: string | null;
  startDate?: string | null;
  endDate?: string | null;
  dateRange?: string | null;
}): { subject: string; hook: string } {
  const place = (input.city || "").trim();
  if (!place) return { subject: "", hook: "" };
  const who = (input.ownerFirstName || "").trim() || "Un membre";
  const subject = coversChristmas(input.startDate, input.endDate)
    ? `Et si votre Noël avait lieu à ${place} ?`
    : `${who} cherche un gardien à ${place}`;
  const when = (input.dateRange || "").trim();
  const full = when
    ? `${who} cherche quelqu'un pour garder son logement à ${place}, ${when}. Nous avons pensé à vous.`
    : `${who} cherche quelqu'un pour garder son logement à ${place}. Nous avons pensé à vous.`;
  const short = `${who} cherche quelqu'un pour garder son logement à ${place}. Nous avons pensé à vous.`;
  const hook = full.length <= CUSTOM_HOOK_MAX ? full : short.length <= CUSTOM_HOOK_MAX ? short : "";
  return { subject: subject.length <= CUSTOM_SUBJECT_MAX ? subject : "", hook };
}
