/**
 * Agrégateurs purs pour l'onglet Conversations de /admin/alma.
 * Consomment des lignes brutes `alma_conversations`. Aucun accès réseau.
 */
import { openerGroups } from "@/lib/alma/companionMetrics";


export interface RawConversation {
  id: string;
  created_at: string;
  surface: string;
  active_role: string;
  question: string;
  answer: string | null;
  register: string | null;
  refusal_reason: string | null;
  input_mode: string | null;
  user_id: string;
}

export interface ThemeStat {
  theme: string;
  label: string;
  count: number;
  share: number;
}

/** Thèmes détectés sur la question, par mots clés métier observés. */
const THEMES: Array<{ theme: string; label: string; re: RegExp }> = [
  { theme: "sante", label: "Santé de l'animal", re: /(v[ée]t[ée]rinaire|malade|bless|boite|vaccin|traitement|m[ée]dicament)/i },
  { theme: "affinite", label: "Affinité et matching", re: /(affinit|score|matching|compatib)/i },
  { theme: "annonce", label: "Annonce et publication", re: /(annonce|publier|publication|brouillon)/i },
  { theme: "candidature", label: "Candidatures", re: /(candidat|postul|lettre)/i },
  { theme: "profil", label: "Profil et complétion", re: /(profil|compl[ée]tion|photo|bio|v[ée]rification)/i },
  { theme: "garde", label: "Déroulé de la garde", re: /(garde|s[ée]jour|guide de la maison|arriv[ée]e|remise des cl)/i },
  { theme: "entraide", label: "Entraide", re: /(entraide|coup de main|mission)/i },
  { theme: "argent", label: "Argent et abonnement", re: /(prix|tarif|abonnement|paiement|rembours|facture)/i },
  { theme: "juridique", label: "Assurance et juridique", re: /(assurance|assureur|contrat|responsabilit|litige)/i },
];

export function aggregateThemes(rows: RawConversation[]): ThemeStat[] {
  const counts = new Map<string, number>();
  let matched = 0;
  for (const r of rows) {
    let hit = false;
    for (const t of THEMES) {
      if (t.re.test(r.question)) {
        counts.set(t.theme, (counts.get(t.theme) ?? 0) + 1);
        hit = true;
      }
    }
    if (hit) matched++;
  }
  const other = rows.length - matched;
  const stats: ThemeStat[] = THEMES.filter((t) => (counts.get(t.theme) ?? 0) > 0).map((t) => ({
    theme: t.theme,
    label: t.label,
    count: counts.get(t.theme) ?? 0,
    share: rows.length > 0 ? (counts.get(t.theme) ?? 0) / rows.length : 0,
  }));
  if (other > 0) {
    stats.push({
      theme: "autre",
      label: "Hors thèmes identifiés",
      count: other,
      share: rows.length > 0 ? other / rows.length : 0,
    });
  }
  return stats.sort((a, b) => b.count - a.count);
}

export interface RefusalStat {
  reason: string;
  label: string;
  count: number;
  rate: number;
}

const REFUSAL_LABEL: Record<string, string> = {
  hors_perimetre: "Hors périmètre",
  sensible: "Sujet sensible",
  urgence: "Urgence",
  daily_limit: "Plafond quotidien",
  empty_answer: "Réponse vide",
  reply_chip_limit: "Plafond des réponses d'un geste",
};

export function aggregateRefusals(rows: RawConversation[]): RefusalStat[] {
  const counts = new Map<string, number>();
  for (const r of rows) {
    if (!r.refusal_reason) continue;
    counts.set(r.refusal_reason, (counts.get(r.refusal_reason) ?? 0) + 1);
  }
  return Array.from(counts.entries())
    .map(([reason, count]) => ({
      reason,
      label: REFUSAL_LABEL[reason] ?? reason,
      count,
      rate: rows.length > 0 ? count / rows.length : 0,
    }))
    .sort((a, b) => b.count - a.count);
}

/** Longueur moyenne des réponses, en caractères. */
export function averageAnswerLength(rows: RawConversation[]): number {
  const answers = rows.filter((r) => r.answer && r.answer.trim().length > 0);
  if (answers.length === 0) return 0;
  const total = answers.reduce((acc, r) => acc + (r.answer as string).trim().length, 0);
  return Math.round(total / answers.length);
}

export interface OpeningStat {
  opening: string;
  count: number;
}

export interface OpeningRepetition {
  groups: OpeningStat[];
  /** Part des réponses qui partagent leur ouverture avec au moins une autre. */
  repetitionRate: number;
}

/** Contrôle anti formulation mécanique : même définition que le Pilotage (openerGroups). */
export function openingRepetition(rows: RawConversation[]): OpeningRepetition {
  const { total, repeated, groups } = openerGroups(rows.map((r) => r.answer));
  return { groups, repetitionRate: total > 0 ? repeated / total : 0 };
}

export interface InputSplit {
  voice: number;
  keyboard: number;
  /** Lot ALMA4b : réponses d'un geste sous un fait (input_mode reply_chip). */
  replyChip: number;
  unknown: number;
  voiceShare: number;
}

/** Lot ALMA4 : valeur de input_mode pour une réponse d'un geste. */
export const REPLY_CHIP_INPUT_MODE = "reply_chip";

export function isReplyChipRow(r: Pick<RawConversation, "input_mode">): boolean {
  return r.input_mode === REPLY_CHIP_INPUT_MODE;
}

/** Libellé du mode de saisie d'un échange, ou null quand il est inconnu. */
export function inputModeLabel(mode: string | null | undefined): string | null {
  if (mode === "voice") return "voix";
  if (mode === "keyboard") return "clavier";
  if (mode === REPLY_CHIP_INPUT_MODE) return "réponse d'un geste";
  return null;
}

/**
 * Lot ALMA4b : les réponses d'un geste sortent des mesures de qualité des
 * réponses (thèmes, longueur, amorces) : la question est le libellé d'une
 * puce et la réponse un fait lu en base, jamais un texte du modèle.
 */
export function typedConversations<T extends Pick<RawConversation, "input_mode">>(rows: T[]): T[] {
  return rows.filter((r) => !isReplyChipRow(r));
}

export interface SpeakerStats {
  /** Personnes distinctes qui ont parlé à Alma, en écrivant ou d'un geste. */
  people: number;
  typedPeople: number;
  replyChipPeople: number;
  typed: number;
  replyChips: number;
}

/**
 * « Parler à Alma » (arène du 10/11/2026) : message tapé ou dicté, ou réponse
 * d'un geste. Une personne qui fait les deux compte une fois.
 */
export function speakerStats(rows: Array<Pick<RawConversation, "input_mode" | "user_id">>): SpeakerStats {
  const typedPeople = new Set<string>();
  const chipPeople = new Set<string>();
  let typed = 0;
  let replyChips = 0;
  for (const r of rows) {
    if (isReplyChipRow(r)) { replyChips++; chipPeople.add(r.user_id); }
    else { typed++; typedPeople.add(r.user_id); }
  }
  return {
    people: new Set([...typedPeople, ...chipPeople]).size,
    typedPeople: typedPeople.size,
    replyChipPeople: chipPeople.size,
    typed,
    replyChips,
  };
}

export function inputSplit(rows: RawConversation[]): InputSplit {
  let voice = 0;
  let keyboard = 0;
  let replyChip = 0;
  let unknown = 0;
  for (const r of rows) {
    if (r.input_mode === "voice") voice++;
    else if (r.input_mode === "keyboard") keyboard++;
    else if (isReplyChipRow(r)) replyChip++;
    else unknown++;
  }
  const known = voice + keyboard;
  return { voice, keyboard, replyChip, unknown, voiceShare: known > 0 ? voice / known : 0 };
}

export interface ActionEvent {
  user_id: string | null;
  created_at: string;
}

/** Conversations suivies d'une action de la même personne sous dix minutes. */
export function conversationsFollowedByAction(
  rows: RawConversation[],
  events: ActionEvent[],
  windowMs = 10 * 60 * 1000,
): { count: number; rate: number } {
  const byUser = new Map<string, number[]>();
  for (const e of events) {
    if (!e.user_id) continue;
    const list = byUser.get(e.user_id) ?? [];
    list.push(new Date(e.created_at).getTime());
    byUser.set(e.user_id, list);
  }
  let count = 0;
  for (const r of rows) {
    const times = byUser.get(r.user_id);
    if (!times) continue;
    const at = new Date(r.created_at).getTime();
    if (times.some((t) => t >= at && t - at <= windowMs)) count++;
  }
  return { count, rate: rows.length > 0 ? count / rows.length : 0 };
}

export interface ActionRateRow {
  action_reason: string;
  register: string;
  answers: number | string;
  acted: number | string;
}

/**
 * Lot J3 : taux de suivi mesuré seulement sur les réponses qui proposent une
 * action (motif différent de « aucune »). null quand aucune réponse n'en a :
 * l'écran affiche alors « Non mesurable ».
 */
export function measureActionFollowUp(rows: ActionRateRow[]): { total: number; count: number; rate: number | null } {
  const withAction = rows.filter((r) => r.action_reason && r.action_reason !== "aucune");
  const total = withAction.reduce((s, r) => s + (Number(r.answers) || 0), 0);
  const count = withAction.reduce((s, r) => s + (Number(r.acted) || 0), 0);
  return { total, count, rate: total > 0 ? count / total : null };
}
