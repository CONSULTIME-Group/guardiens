/**
 * Agrégateurs purs pour l'onglet Conversations de /admin/alma.
 * Consomment des lignes brutes `alma_conversations`. Aucun accès réseau.
 */

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

/** Contrôle anti formulation mécanique : cinq premiers mots des réponses. */
export function openingRepetition(rows: RawConversation[]): OpeningRepetition {
  const counts = new Map<string, number>();
  let total = 0;
  for (const r of rows) {
    const answer = (r.answer ?? "").trim();
    if (!answer) continue;
    const opening = answer
      .toLowerCase()
      .replace(/\s+/g, " ")
      .split(" ")
      .slice(0, 5)
      .join(" ");
    if (!opening) continue;
    total++;
    counts.set(opening, (counts.get(opening) ?? 0) + 1);
  }
  const groups = Array.from(counts.entries())
    .map(([opening, count]) => ({ opening, count }))
    .filter((g) => g.count > 1)
    .sort((a, b) => b.count - a.count);
  const repeated = groups.reduce((acc, g) => acc + g.count, 0);
  return { groups, repetitionRate: total > 0 ? repeated / total : 0 };
}

export interface InputSplit {
  voice: number;
  keyboard: number;
  unknown: number;
  voiceShare: number;
}

export function inputSplit(rows: RawConversation[]): InputSplit {
  let voice = 0;
  let keyboard = 0;
  let unknown = 0;
  for (const r of rows) {
    if (r.input_mode === "voice") voice++;
    else if (r.input_mode === "keyboard") keyboard++;
    else unknown++;
  }
  const known = voice + keyboard;
  return { voice, keyboard, unknown, voiceShare: known > 0 ? voice / known : 0 };
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
