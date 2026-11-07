// Suivi des relances de brouillon (/admin/listings) : stock admissible et effet
// mesuré. Lecture seule, aucune adresse email lue ni affichée. Les règles
// d'admissibilité sont celles du serveur (draft-reminder-policy.ts) ; ce que le
// navigateur ne peut pas vérifier sans adresse (liste de suppression, emails de
// la séquence des 48 dernières heures, réponse de départ) est dit à l'écran.
import { fetchAllRows } from "@/lib/admin/fetchAllRows";
import {
  draftReminderStageDecision, draftReminderStillRelevant, DRAFT_REMINDER_SKIP_LABELS,
  type DraftReminderLog, type DraftReminderSkipReason,
} from "../../../supabase/functions/_shared/draft-reminder-policy";

export const ATTRIBUTION_WINDOW_MS = 7 * 86400000;
const MIN_AGE_MS = 24 * 3600_000;
const UUID = /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i;

export interface ReminderLogRow extends DraftReminderLog {
  id: string;
  delivered_at?: string | null;
  first_clicked_at?: string | null;
  bounced_at?: string | null;
}
export interface DraftRow { id: string; user_id: string; status: string; created_at: string; start_date: string | null; published_at: string | null; unpublished_at: string | null }
export interface SitOutcomeRow { id: string; title: string | null; status: string; published_at: string | null }

export interface ConversionInput {
  logs: ReminderLogRow[];
  drafts: DraftRow[];
  sits: Map<string, SitOutcomeRow>;
  publishedOwners: Set<string>;
  productEmails: Map<string, boolean>;
  lastSeen: Map<string, string | null>;
  now: number;
  periodDays: number | null;
  truncated: boolean;
}

export interface ReminderDetail {
  logId: string; sitId: string | null; title: string | null; sentAt: string; stage: 1 | 2; source: "auto" | "admin";
  deliveredAt: string | null; clickedAt: string | null; bounced: boolean; publishedAt: string | null; sitDeleted: boolean;
  attributed: "after_send" | "after_click" | null; mature: boolean;
}

export interface DraftConversionSummary {
  stock: { active: number; eligible: number; reasons: Array<{ reason: DraftReminderSkipReason; label: string; count: number }> };
  campaign: {
    sent: number; delivered: number; clicked: number; bounced: number; unattributed: number; sitDeleted: number;
    matureSent: number; immatureSent: number; remindedSits: number; publishedSits: number; publishedAfterClickSits: number;
    conversionRate: number | null; clickRate: number | null; otherStatuses: Record<string, number>;
  };
  details: ReminderDetail[];
  warnings: string[];
}

export function reminderSitId(log: Pick<ReminderLogRow, "metadata">): string | null {
  const meta = log.metadata ?? {};
  if (typeof meta.sit_id === "string" && UUID.test(meta.sit_id)) return meta.sit_id;
  const key = typeof meta.idempotency_key === "string" ? meta.idempotency_key : "";
  if (/^(sit-draft-reminder|stale-draft-manual)-/.test(key)) return key.match(UUID)?.[0] ?? null;
  return null;
}

function reminderStage(log: ReminderLogRow): 1 | 2 {
  const key = String(log.metadata?.idempotency_key ?? "");
  return Number(log.metadata?.reminder_stage) === 2 || /-2$/.test(key) ? 2 : 1;
}

function reminderSource(log: ReminderLogRow): "auto" | "admin" {
  const key = String(log.metadata?.idempotency_key ?? "");
  return log.metadata?.source === "nudge-stale-draft" || key.startsWith("stale-draft-manual-") ? "admin" : "auto";
}

const within = (at: string | null | undefined, from: string | null | undefined) =>
  !!at && !!from && Date.parse(at) >= Date.parse(from) && Date.parse(at) < Date.parse(from) + ATTRIBUTION_WINDOW_MS;

/** Calcul pur, testé à part. */
export function summarizeDraftConversion(input: ConversionInput): DraftConversionSummary {
  const { logs, drafts, sits, now } = input;
  const today = new Date(now).toISOString().slice(0, 10);
  const bySit = new Map<string, ReminderLogRow[]>();
  for (const log of logs) {
    const id = reminderSitId(log);
    if (id) bySit.set(id, [...(bySit.get(id) ?? []), log]);
  }

  // Stock : brouillons jamais mis en ligne, raisons de non-relance au sens du serveur.
  const reasons = new Map<DraftReminderSkipReason, number>();
  let active = 0;
  let eligible = 0;
  for (const d of drafts) {
    if (d.status !== "draft" || d.published_at || d.unpublished_at) continue;
    active++;
    let reason: DraftReminderSkipReason | null = null;
    if (!draftReminderStillRelevant(d, today)) reason = "draft_no_longer_relevant";
    else if (now - Date.parse(d.created_at) < MIN_AGE_MS) reason = "too_recent";
    else if (input.publishedOwners.has(d.user_id)) reason = "owner_already_published";
    else if (input.productEmails.get(d.user_id) === false) reason = "product_emails_off";
    else {
      const stage = draftReminderStageDecision(bySit.get(d.id) ?? [], input.lastSeen.get(d.user_id) ?? null, now);
      if (stage.stage === null) reason = stage.reason;
    }
    if (reason) reasons.set(reason, (reasons.get(reason) ?? 0) + 1);
    else eligible++;
  }

  // Campagne : envois réussis de la période, une ligne par clé d'envoi.
  const since = input.periodDays ? now - input.periodDays * 86400000 : -Infinity;
  const otherStatuses: Record<string, number> = {};
  const sentByKey = new Map<string, ReminderLogRow>();
  for (const log of logs) {
    if (Date.parse(log.created_at) < since) continue;
    if (log.status !== "sent") { otherStatuses[log.status] = (otherStatuses[log.status] ?? 0) + 1; continue; }
    sentByKey.set(String(log.metadata?.idempotency_key ?? log.id), log);
  }
  const details: ReminderDetail[] = [];
  for (const log of sentByKey.values()) {
    const sitId = reminderSitId(log);
    const sit = sitId ? sits.get(sitId) : undefined;
    const publishedAt = sit?.published_at ?? null;
    const afterClick = within(publishedAt, log.first_clicked_at);
    const afterSend = within(publishedAt, log.created_at);
    details.push({
      logId: log.id, sitId, title: sit?.title ?? null, sentAt: log.created_at, stage: reminderStage(log), source: reminderSource(log),
      deliveredAt: log.delivered_at ?? null, clickedAt: log.first_clicked_at ?? null, bounced: !!log.bounced_at,
      publishedAt, sitDeleted: !!sitId && !sit, attributed: afterClick ? "after_click" : afterSend ? "after_send" : null,
      mature: now - Date.parse(log.created_at) >= ATTRIBUTION_WINDOW_MS,
    });
  }
  details.sort((a, b) => Date.parse(b.sentAt) - Date.parse(a.sentAt));
  const mature = details.filter(d => d.mature && d.sitId && !d.sitDeleted);
  const remindedSits = new Set(mature.map(d => d.sitId!));
  const publishedSits = new Set(mature.filter(d => d.attributed).map(d => d.sitId!));
  const publishedAfterClickSits = new Set(mature.filter(d => d.attributed === "after_click").map(d => d.sitId!));
  const delivered = details.filter(d => d.deliveredAt).length;
  const clicked = details.filter(d => d.clickedAt).length;

  const warnings: string[] = [];
  if (input.truncated) warnings.push("Lecture partielle : au moins une liste a atteint la limite de lecture, les chiffres sont incomplets.");
  const unattributed = details.filter(d => !d.sitId).length;
  if (unattributed) warnings.push(`${unattributed} relance(s) sans annonce identifiable, hors taux.`);
  const sitDeleted = details.filter(d => d.sitDeleted).length;
  if (sitDeleted) warnings.push(`${sitDeleted} relance(s) vers une annonce supprimée depuis, hors taux.`);
  const immature = details.filter(d => !d.mature).length;
  if (immature) warnings.push(`${immature} relance(s) de moins de 7 jours : leur effet n'est pas encore mesurable, hors taux.`);

  return {
    stock: {
      active, eligible,
      reasons: [...reasons.entries()].sort((a, b) => b[1] - a[1]).map(([reason, count]) => ({ reason, label: reason === "draft_no_longer_relevant" ? "Date de début dépassée" : DRAFT_REMINDER_SKIP_LABELS[reason], count })),
    },
    campaign: {
      sent: details.length, delivered, clicked, bounced: details.filter(d => d.bounced).length, unattributed, sitDeleted,
      matureSent: mature.length, immatureSent: immature, remindedSits: remindedSits.size, publishedSits: publishedSits.size,
      publishedAfterClickSits: publishedAfterClickSits.size,
      conversionRate: remindedSits.size ? publishedSits.size / remindedSits.size : null,
      clickRate: delivered ? clicked / delivered : null,
      otherStatuses,
    },
    details,
    warnings,
  };
}

function chunks<T>(items: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < items.length; i += size) out.push(items.slice(i, i + size));
  return out;
}

/** Lectures groupées : journal, brouillons, annonces relancées, propriétaires (aucune lecture par ligne). */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function loadDraftConversion(client: any, periodDays: number | null, now = Date.now()): Promise<DraftConversionSummary> {
  const [logs, drafts] = await Promise.all([
    fetchAllRows<ReminderLogRow>((from, to) => client.from("email_send_log")
      .select("id, status, created_at, delivered_at, first_clicked_at, bounced_at, metadata")
      .eq("template_name", "sit-draft-reminder").order("created_at").order("id").range(from, to)),
    fetchAllRows<DraftRow>((from, to) => client.from("sits")
      .select("id, user_id, status, created_at, start_date, published_at, unpublished_at")
      .eq("status", "draft").order("id").range(from, to)),
  ]);
  const sitIds = [...new Set(logs.rows.map(reminderSitId).filter((id): id is string => !!id))];
  const owners = [...new Set(drafts.rows.filter(d => !d.published_at && !d.unpublished_at).map(d => d.user_id))];

  const sits = new Map<string, SitOutcomeRow>();
  const publishedOwners = new Set<string>();
  const productEmails = new Map<string, boolean>();
  const lastSeen = new Map<string, string | null>();
  await Promise.all([
    ...chunks(sitIds, 100).map(async ids => {
      const { data, error } = await client.from("sits").select("id, title, status, published_at").in("id", ids);
      if (error) throw error;
      for (const row of data ?? []) sits.set(row.id, row);
    }),
    ...chunks(owners, 100).map(async ids => {
      const [pub, seen] = await Promise.all([
        client.from("sits").select("user_id").in("user_id", ids).not("published_at", "is", null),
        client.from("profiles").select("id, last_seen_at").in("id", ids),
      ]);
      if (pub.error) throw pub.error;
      if (seen.error) throw seen.error;
      for (const row of pub.data ?? []) publishedOwners.add(row.user_id);
      for (const row of seen.data ?? []) lastSeen.set(row.id, row.last_seen_at ?? null);
    }),
    ...chunks(owners, 500).map(async ids => {
      const { data, error } = await client.rpc("admin_draft_email_preferences", { p_owner_ids: ids });
      if (error) throw error;
      for (const row of data ?? []) productEmails.set(row.user_id, row.product_emails);
    }),
  ]);
  return summarizeDraftConversion({
    logs: logs.rows, drafts: drafts.rows, sits, publishedOwners, productEmails, lastSeen, now, periodDays,
    truncated: logs.truncated || drafts.truncated,
  });
}

export const DRAFT_ATTRIBUTION_LIMITS =
  "Une publication est rattachée à une relance si elle a lieu dans les 7 jours qui suivent l'envoi. C'est une coïncidence dans le temps, pas une preuve : il n'y a pas de groupe témoin et un propriétaire peut publier sans avoir ouvert l'email. Les clics dépendent du suivi de l'hébergeur d'emails ; « remise » signifie acceptée par la messagerie du destinataire.";

export const DRAFT_STOCK_LIMITS =
  "Admissibles selon les règles vérifiables ici : brouillon de plus de 24 heures, début à venir, propriétaire jamais publié, relances acceptées, deux relances au plus, 7 jours entre elles, visite sous 30 jours. La liste de suppression, un autre email propriétaire dans les 48 heures et une réponse de départ ne sont vérifiés qu'au moment de l'envoi.";

/** Message de l'écran admin après « Relancer », sans adresse email. */
export function manualDraftReminderMessage(payload: { sent?: boolean; outcome?: string; error?: string | null; stage?: number } | null | undefined): string {
  if (payload?.sent) return payload.stage === 2 ? "Seconde relance envoyée." : "Relance envoyée.";
  const reason = payload?.error ?? "";
  if (reason in DRAFT_REMINDER_SKIP_LABELS) return `Aucun envoi : ${DRAFT_REMINDER_SKIP_LABELS[reason as DraftReminderSkipReason].toLowerCase()}.`;
  if (payload?.outcome === "deferred") return "Envoi différé : plafond de fréquence atteint, il partira plus tard.";
  if (reason === "unsubscribed_category") return "Aucun envoi : relances désactivées par le propriétaire.";
  if (reason === "email_suppressed") return "Aucun envoi : adresse en liste de suppression.";
  if (reason === "account_suspended") return "Aucun envoi : compte suspendu ou inactif.";
  if (reason === "duplicate_idempotency_key") return "Aucun envoi : cette relance est déjà partie.";
  if (reason === "verification_unavailable") return "Vérification impossible pour le moment, rien n'a été envoyé.";
  return "Envoi impossible pour le moment, rien n'a été envoyé.";
}
