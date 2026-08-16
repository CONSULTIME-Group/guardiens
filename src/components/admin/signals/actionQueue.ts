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
  | { kind: "ai"; action: SuggestedAction };

const PRIORITY_RANK: Record<QueuePriority, number> = { haute: 0, moyenne: 1, basse: 2 };

/** Priorité d'une entrée sur l'échelle unifiée (signal ou suggestion IA). */
export const entryPriority = (entry: QueueEntry): QueuePriority =>
  entry.kind === "ai"
    ? entry.action.priority
    : severityToPriority(entry.kind === "group" ? entry.group.severity : entry.signal.severity);

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
): QueueEntry[] {
  const signalPaths = new Set(signals.map((s) => linkPath(signalAdminLink(s))));
  const signalTopics = new Set(
    signals.map((s) => SIGNAL_TOPIC[s.signal_type]).filter((t): t is string => Boolean(t)),
  );

  const aiByPriority = [...aiActions].sort(
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

  const groups = groupSignals(signals);
  const signalEntries: QueueEntry[] = groups.flatMap((g): QueueEntry[] =>
    g.items.length >= GROUP_THRESHOLD
      ? [{ kind: "group", group: g }]
      : g.items.map((s) => ({ kind: "signal", signal: s })),
  );
  return [
    ...signalEntries,
    ...dedupedAi.map((a): QueueEntry => ({ kind: "ai", action: a })),
  ].sort((a, b) => PRIORITY_RANK[entryPriority(a)] - PRIORITY_RANK[entryPriority(b)]);
}
