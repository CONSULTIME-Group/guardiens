import {
  groupSignals,
  signalAdminLink,
  severityToPriority,
  SIGNAL_TOPIC,
  GROUP_THRESHOLD,
  type AdminSignalBase,
  type SignalGroup,
  type QueuePriority,
} from "./signalGrouping";
import {
  daysUntilStart,
  hasDestination,
  isSitImminent,
  isSitStarted,
  queueSectionOf,
  SIGNAL_TYPES,
  SIT_TIMED_TYPES,
  type QueueSection,
} from "../../../../supabase/functions/_shared/admin-signal-config.ts";

/** Lot ADM1 : date de début des annonces citées par les signaux. */
export interface QueueSitDates {
  sits?: Map<string, { start_date: string | null }>;
  now?: number;
}

/** Action suggérée par l'analyse IA de l'activité. */
export interface SuggestedAction {
  title: string;
  why: string;
  link: string;
  priority: QueuePriority;
  topic?: string;
}

export type QueueEntry =
  | { kind: "group"; group: SignalGroup }
  | { kind: "signal"; signal: AdminSignalBase }
  | { kind: "sit"; sitId: string; items: AdminSignalBase[]; severity: "critical" | "warning" }
  | { kind: "ai"; action: SuggestedAction };

const PRIORITY_RANK: Record<QueuePriority, number> = { haute: 0, moyenne: 1, basse: 2 };

/** Priorité d'une entrée sur l'échelle unifiée (signal ou suggestion IA). */
export const entryPriority = (entry: QueueEntry): QueuePriority =>
  entry.kind === "ai"
    ? entry.action.priority
    : severityToPriority(
        entry.kind === "group" || entry.kind === "sit"
          ? entry.kind === "group" ? entry.group.severity : entry.severity
          : entry.signal.severity,
      );

export const sitIdOf = (s: AdminSignalBase): string | null => {
  const m = s.metadata ?? {};
  if (typeof m.sit_id === "string") return m.sit_id;
  if (s.entity_type === "sit" && s.entity_id) return s.entity_id;
  return null;
};

const highest = (items: AdminSignalBase[]): "critical" | "warning" =>
  items.some((s) => s.severity === "critical") ? "critical" : "warning";

/**
 * Lot S2 : ne garde que les types destinés à la file d'actions (configuration
 * unique) et forme les regroupements : une entrée par annonce pour les
 * candidatures et discussions, une entrée « File des digests », une entrée
 * « Qualité éditoriale ». Aucun signal n'est perdu : tout signal de la file
 * figure dans exactement une entrée.
 */
export function groupQueueSignals(signals: AdminSignalBase[], opts: QueueSitDates = {}): QueueEntry[] {
  const now = opts.now ?? Date.now();
  const startOf = (sitId: string | null) => (sitId ? opts.sits?.get(sitId)?.start_date ?? null : null);
  // Lot ADM1 : une garde commencée ne demande plus d'action avant le départ
  // (même règle que sit_started dans auto_resolve_admin_signals).
  const queued = signals.filter((s) =>
    hasDestination(s.signal_type, "action_queue")
    && !(SIT_TIMED_TYPES.has(s.signal_type) && isSitStarted(startOf(sitIdOf(s)), now)));
  const bySit = new Map<string, AdminSignalBase[]>();
  const byFamily = new Map<string, AdminSignalBase[]>();
  const rest: AdminSignalBase[] = [];
  for (const s of queued) {
    const g = SIGNAL_TYPES[s.signal_type]?.queueGroup;
    const sitId = g === "sit" ? sitIdOf(s) : null;
    if (sitId) {
      bySit.set(sitId, [...(bySit.get(sitId) ?? []), s]);
    } else if (g === "digest_queue" || g === "content") {
      byFamily.set(g, [...(byFamily.get(g) ?? []), s]);
    } else {
      rest.push(s);
    }
  }
  const out: QueueEntry[] = [];
  // Lot ADM1 : une garde qui commence dans 7 jours ou moins passe en priorité haute.
  for (const [sitId, items] of bySit) {
    out.push({ kind: "sit", sitId, items, severity: isSitImminent(startOf(sitId), now) ? "critical" : highest(items) });
  }
  for (const [g, items] of byFamily) {
    out.push({ kind: "group", group: { signalType: `group:${g}`, items, severity: highest(items) } });
  }
  for (const g of groupSignals(rest)) {
    if (g.items.length >= GROUP_THRESHOLD) out.push({ kind: "group", group: g });
    else out.push(...g.items.map((s): QueueEntry => ({ kind: "signal", signal: s })));
  }
  return out;
}

/** Chemin normalisé d'un lien admin (sans requête ni slash final). */
const linkPath = (href: string): string => {
  try {
    const u = new URL(href, "https://admin.local");
    return u.pathname.replace(/\/+$/, "") || "/";
  } catch {
    return href;
  }
};

/**
 * Construit la file "À traiter" : signaux groupés dès GROUP_THRESHOLD du
 * même type, puis suggestions IA dédupliquées. Une suggestion est écartée
 * quand son lien OU son sujet (topic) est déjà porté par un signal : le
 * signal porte l'action concrète, la suggestion n'est que descriptive. Les
 * suggestions IA sont aussi dédupliquées entre elles par sujet, en gardant
 * la plus prioritaire. Tri stable sur l'échelle unifiée haute, moyenne,
 * basse ; à priorité égale, les signaux passent d'abord.
 */
export function buildActionQueue(
  signals: AdminSignalBase[],
  aiActions: SuggestedAction[],
  opts: QueueSitDates = {},
): QueueEntry[] {
  // Sujets et liens lus sur TOUS les signaux ouverts : un signal routé vers
  // « À animer » couvre aussi son sujet, l'IA ne le redouble pas.
  const signalPaths = new Set(signals.map((s) => linkPath(signalAdminLink(s))));
  const signalTopics = new Set(
    signals.map((s) => SIGNAL_TOPIC[s.signal_type]).filter((t): t is string => Boolean(t)),
  );

  const aiByPriority = aiActions.map((a) => ({ ...a, topic: inferAiTopic(a) })).sort(
    (a, b) => PRIORITY_RANK[a.priority] - PRIORITY_RANK[b.priority],
  );
  const seenAiTopics = new Set<string>();
  const dedupedAi = aiByPriority.filter((a) => {
    if (signalPaths.has(linkPath(a.link))) return false;
    const topic = a.topic && a.topic !== "autre" ? a.topic : null;
    if (!topic) return true;
    if (signalTopics.has(topic) || seenAiTopics.has(topic)) return false;
    seenAiTopics.add(topic);
    return true;
  });

  const signalEntries = groupQueueSignals(signals, opts);
  // Lot ADM1 : à priorité égale, la garde qui commence le plus tôt d'abord,
  // puis les signaux, puis les suggestions IA (tri stable).
  const startKey = (e: QueueEntry): string =>
    e.kind === "sit" ? opts.sits?.get(e.sitId)?.start_date?.slice(0, 10) ?? "9999-12-31" : "9999-12-31";
  return [
    ...signalEntries,
    ...dedupedAi.map((a): QueueEntry => ({ kind: "ai", action: a })),
  ].sort((a, b) =>
    PRIORITY_RANK[entryPriority(a)] - PRIORITY_RANK[entryPriority(b)]
    || startKey(a).localeCompare(startKey(b)));
}

/**
 * Lot ADM1 : sujet d'une suggestion IA. Une suggestion sans sujet qui parle du
 * rendu SEO prend le sujet rendu_seo, pour ne jamais doubler le signal
 * prerender_monthly_budget_reached avec une priorité différente.
 */
export function inferAiTopic(a: SuggestedAction): string | undefined {
  if (a.topic && a.topic !== "autre") return a.topic;
  const text = `${a.title} ${a.why}`.toLowerCase();
  if (/pr[ée]-?rendu|prerender|rendu seo|service de rendu|renders?\b/.test(text)) return "rendu_seo";
  return a.topic;
}

const AI_TOPIC_SECTION: Record<string, QueueSection> = {
  deliverabilite_email: "technique",
  rendu_seo: "technique",
  verifications_identite: "moderation",
};

/** Lot ADM1 : section de la file (Membres à contacter, Modération, Technique et contenus). */
export function entrySection(entry: QueueEntry): QueueSection {
  if (entry.kind === "ai") return AI_TOPIC_SECTION[inferAiTopic(entry.action) ?? ""] ?? "membres";
  if (entry.kind === "sit") return "membres";
  if (entry.kind === "signal") return queueSectionOf(entry.signal.signal_type);
  return queueSectionOf(entry.group.items[0]?.signal_type ?? "");
}

/** Lot ADM1 : jours avant le début de garde d'une entrée par annonce (null sinon). */
export function entryDaysUntilStart(entry: QueueEntry, opts: QueueSitDates = {}): number | null {
  if (entry.kind !== "sit") return null;
  return daysUntilStart(opts.sits?.get(entry.sitId)?.start_date ?? null, opts.now ?? Date.now());
}
