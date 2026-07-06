/**
 * Agrégateurs purs pour /admin/alma.
 * Consomment des lignes brutes analytics_events + alma_whisper_history.
 * Aucun accès réseau : facilite les tests Vitest.
 */

export interface RawEvent {
  event_type: string;
  created_at: string;
  user_id: string | null;
  metadata?: Record<string, unknown> | null;
}

export interface RawWhisperHistory {
  whisper_type: string;
  emitted_at: string;
  action_taken: string | null;
  dismissed_reason: string | null;
  user_id: string;
}

/** Liste ordonnée des 11 moments Alma (Pass 1/2/3). */
export const ALMA_MOMENTS = [
  { key: "alma_message_opener", label: "Brise-glace Messages", role: "sitter" as const },
  { key: "alma_motivation", label: "Motivation sitter", role: "sitter" as const },
  { key: "alma_application_letter", label: "Lettre de candidature", role: "sitter" as const },
  { key: "alma_affinity_explain", label: "Explication affinité", role: "sitter" as const },
  { key: "alma_silent_sit", label: "Annonce silencieuse", role: "owner" as const },
  { key: "alma_review_draft", label: "Brouillon d'avis", role: "sitter" as const },
  { key: "alma_welcomeback", label: "Retour utilisateur", role: "both" as const },
  { key: "alma_house_guide", label: "Guide maison", role: "owner" as const },
  { key: "alma_fit_gardien", label: "Fit gardien", role: "owner" as const },
  { key: "alma_empty_search", label: "Recherche vide", role: "sitter" as const },
  { key: "alma_notif_summary", label: "Résumé notifications", role: "both" as const },
] as const;

export type AlmaMomentKey = (typeof ALMA_MOMENTS)[number]["key"];

export interface MomentStats {
  moment: string;
  label: string;
  role: "owner" | "sitter" | "both";
  views: number;
  actions: number;
  adoptionRate: number; // 0..1
  lastUsedAt: string | null;
}

const isSeenEvent = (t: string) => /_(bubble_)?seen$/.test(t);
const isActionEvent = (t: string) =>
  /_(generated|action_clicked|accepted|sent_with_draft|inserted|used)$/.test(t);

/** Agrège les events Alma par moment (prefix match). */
export function aggregateMoments(events: RawEvent[]): MomentStats[] {
  return ALMA_MOMENTS.map(({ key, label, role }) => {
    const scoped = events.filter((e) => e.event_type.startsWith(key));
    const views = scoped.filter((e) => isSeenEvent(e.event_type)).length;
    const actions = scoped.filter((e) => isActionEvent(e.event_type)).length;
    const lastUsedAt =
      scoped.length === 0
        ? null
        : scoped.reduce<string | null>(
            (acc, e) => (!acc || e.created_at > acc ? e.created_at : acc),
            null,
          );
    return {
      moment: key,
      label,
      role,
      views,
      actions,
      adoptionRate: views > 0 ? actions / views : 0,
      lastUsedAt,
    };
  }).sort((a, b) => b.adoptionRate - a.adoptionRate);
}

export interface BubbleKpis {
  uniqueUsers7d: number;
  uniqueUsers30d: number;
  totalViews: number;
  totalActions: number;
  engagementRate: number;
}

export function computeBubbleKpis(events: RawEvent[], now = new Date()): BubbleKpis {
  const ms7 = 7 * 24 * 3600 * 1000;
  const ms30 = 30 * 24 * 3600 * 1000;
  const u7 = new Set<string>();
  const u30 = new Set<string>();
  let views = 0;
  let actions = 0;
  const nowMs = now.getTime();
  for (const e of events) {
    const ts = new Date(e.created_at).getTime();
    const age = nowMs - ts;
    if (isSeenEvent(e.event_type)) views++;
    if (isActionEvent(e.event_type)) actions++;
    if (e.user_id && isSeenEvent(e.event_type)) {
      if (age <= ms30) u30.add(e.user_id);
      if (age <= ms7) u7.add(e.user_id);
    }
  }
  return {
    uniqueUsers7d: u7.size,
    uniqueUsers30d: u30.size,
    totalViews: views,
    totalActions: actions,
    engagementRate: views > 0 ? actions / views : 0,
  };
}

export interface WhisperStats {
  whisperType: string;
  priority: "P0" | "P1" | "P2";
  emitted: number;
  actions: number;
  dismissed: number;
  actionRate: number;
  dismissRate: number;
  blacklistedUsers: number;
}

export function aggregateWhispers(
  history: RawWhisperHistory[],
  priorityMap: Record<string, "P0" | "P1" | "P2">,
): WhisperStats[] {
  const byType = new Map<string, WhisperStats>();
  const blacklistByType = new Map<string, Set<string>>();

  for (const row of history) {
    const t = row.whisper_type;
    if (!byType.has(t)) {
      byType.set(t, {
        whisperType: t,
        priority: priorityMap[t] ?? "P2",
        emitted: 0,
        actions: 0,
        dismissed: 0,
        actionRate: 0,
        dismissRate: 0,
        blacklistedUsers: 0,
      });
    }
    const s = byType.get(t)!;
    s.emitted++;
    if (row.action_taken && row.action_taken !== "dismissed") s.actions++;
    if (row.dismissed_reason === "closed_manually") s.dismissed++;
    if (row.dismissed_reason === "blacklist") {
      if (!blacklistByType.has(t)) blacklistByType.set(t, new Set());
      blacklistByType.get(t)!.add(row.user_id);
    }
  }
  return Array.from(byType.values())
    .map((s) => ({
      ...s,
      actionRate: s.emitted > 0 ? s.actions / s.emitted : 0,
      dismissRate: s.emitted > 0 ? s.dismissed / s.emitted : 0,
      blacklistedUsers: blacklistByType.get(s.whisperType)?.size ?? 0,
    }))
    .sort((a, b) => b.actionRate - a.actionRate);
}

/** Convertit une plage en date ISO borne basse. */
export function rangeSinceISO(range: "7d" | "30d" | "90d", now = new Date()): string {
  const days = range === "7d" ? 7 : range === "30d" ? 30 : 90;
  return new Date(now.getTime() - days * 24 * 3600 * 1000).toISOString();
}

/** Sérialise un tableau générique en CSV (échappement RFC 4180 basique). */
export function toCsv<T extends Record<string, unknown>>(rows: T[], columns: (keyof T)[]): string {
  const esc = (v: unknown) => {
    const s = v === null || v === undefined ? "" : String(v);
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const header = columns.map((c) => esc(c)).join(",");
  const body = rows.map((r) => columns.map((c) => esc(r[c])).join(",")).join("\n");
  return `${header}\n${body}`;
}
