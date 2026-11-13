/**
 * Lot ALMA4 (13/11/2026, arène claude/arene/2026-11-10-alma-vivante, lot L4,
 * « l'aperçu qui se répond ») : règles de la puce de réponse posée sous un
 * fait d'Alma, et de la réplique scriptée qui la suit.
 *
 * Module pur, sans dépendance Deno : alma-chat le lit pour répondre sans
 * appel au modèle, le site le réexporte (src/lib/alma/peekReply.ts) pour
 * afficher la puce. Une seule source pour les libellés et les règles.
 */

export type ReplyChipKind = "another" | "tell";

/** Valeur de alma_conversations.input_mode pour une réponse d'un geste. */
export const REPLY_CHIP_INPUT_MODE = "reply_chip";

/** Réponses d'un geste par membre sur 24 heures. */
export const REPLY_CHIP_DAILY_LIMIT = 10;

export const REPLY_CHIP_HUMOR_TYPE = "animal_humor";

export const REPLY_CHIP_LABELS: Readonly<Record<ReplyChipKind, string>> = {
  another: "Une autre !",
  tell: "Raconte",
};

/** Écrans d'action : l'aperçu y tient sur une ligne, sans puce. */
export const REPLY_CHIP_ACTION_SURFACES: readonly string[] = ["sit_detail"];

/** Réplique quand Alma a déjà tout raconté de ce sujet au membre. */
export const REPLY_CHIP_EMPTY_ANSWER = "J'en garde pour votre prochaine visite.";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function isFactId(value: unknown): value is string {
  return typeof value === "string" && UUID_RE.test(value);
}

export function isActionSurface(surface: string | null | undefined): boolean {
  return !!surface && REPLY_CHIP_ACTION_SURFACES.includes(surface);
}

/** La puce d'un type de fait : la blague appelle « Une autre ! », le reste « Raconte ». */
export function replyChipKindForFact(factType: string | null | undefined): ReplyChipKind | null {
  if (!factType || factType === "usage_nudge" || factType === "unknown") return null;
  return factType === REPLY_CHIP_HUMOR_TYPE ? "another" : "tell";
}

/**
 * Puce à poser sous l'aperçu d'un murmure, ou null. Seul un fait d'Alma
 * identifié en porte une, jamais une relance d'usage (elle a son bouton),
 * jamais sur un écran d'action.
 */
export function replyChipForWhisper(whisper: {
  type: string;
  surface?: string | null;
  metadata?: Record<string, unknown> | null;
} | null | undefined): { kind: ReplyChipKind; label: string; factId: string; factType: string } | null {
  if (!whisper || whisper.type !== "cultural_fact") return null;
  if (isActionSurface(whisper.surface)) return null;
  const meta = whisper.metadata ?? {};
  const factId = meta.fact_id;
  const factType = typeof meta.fact_type === "string" ? meta.fact_type : null;
  if (!isFactId(factId)) return null;
  const kind = replyChipKindForFact(factType);
  if (!kind || !factType) return null;
  return { kind, label: REPLY_CHIP_LABELS[kind], factId, factType };
}

export type FactFilter = Record<string, unknown> | null | undefined;

/**
 * Un fait peut-il suivre le fait d'origine sur le même écran ? Oui quand
 * chacune de ses conditions (espèce, race, ville, écran) est déjà celle du
 * fait d'origine : ce qui valait pour l'un vaut pour l'autre. Une blague
 * propre au chien ou au chat vient partout (règle du lot ALMA1).
 */
export function isReplyFactCompatible(factType: string, source: FactFilter, candidate: FactFilter): boolean {
  const from = source ?? {};
  const to = candidate ?? {};
  for (const key of Object.keys(to)) {
    if (factType === REPLY_CHIP_HUMOR_TYPE && key === "animal_species") continue;
    if (!(key in from) || String(from[key]) !== String(to[key])) return false;
  }
  return true;
}

/** Mois courant dans la saison du fait (bornes incluses, saison à cheval sur l'année admise). */
export function isInSeason(month: number, start: number | null | undefined, end: number | null | undefined): boolean {
  if (!start || !end) return true;
  return start <= end ? month >= start && month <= end : month >= start || month <= end;
}

export interface ReplyFactCandidate {
  id: string;
  content: string;
  context_filter?: FactFilter;
  seasonal_start_month?: number | null;
  seasonal_end_month?: number | null;
  needs_pro_referral?: boolean | null;
}

/**
 * Choisit le fait de la réplique : même famille que le fait d'origine,
 * compatible avec son écran, de saison, sans renvoi vers un professionnel
 * (ces faits portent une mention que la réplique courte n'affiche pas), et
 * parmi ceux que le membre n'a pas reçus depuis 30 jours. Rien de neuf :
 * null, et Alma le dit (REPLY_CHIP_EMPTY_ANSWER).
 */
export function pickReplyFact(input: {
  factType: string;
  sourceId: string;
  sourceFilter: FactFilter;
  candidates: readonly ReplyFactCandidate[];
  recentIds: readonly string[];
  month: number;
  random?: () => number;
}): ReplyFactCandidate | null {
  const random = input.random ?? Math.random;
  const eligible = input.candidates.filter((c) =>
    c.id !== input.sourceId
    && typeof c.content === "string"
    && c.content.trim().length > 0
    && c.needs_pro_referral !== true
    && isInSeason(input.month, c.seasonal_start_month, c.seasonal_end_month)
    && isReplyFactCompatible(input.factType, input.sourceFilter, c.context_filter)
  );
  if (eligible.length === 0) return null;
  const recent = new Set(input.recentIds);
  const pool = eligible.filter((c) => !recent.has(c.id));
  if (pool.length === 0) return null;
  const index = Math.min(pool.length - 1, Math.max(0, Math.floor(random() * pool.length)));
  return pool[index];
}

export interface ReplyActionChip {
  label: string;
  path: string;
}

/** Puce d'action qui clôt la réplique : un pas concret sur le site, selon l'espace actif. */
export function replyActionChip(activeRole: "owner" | "sitter", factType: string): ReplyActionChip {
  if (factType === "mutual_aid_tip") return { label: "Voir l'entraide près de chez moi", path: "/petites-missions" };
  return activeRole === "owner"
    ? { label: "Publier une annonce", path: "/sits/create" }
    : { label: "Voir les gardes ouvertes", path: "/search" };
}
