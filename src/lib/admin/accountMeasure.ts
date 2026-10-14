/**
 * Lot J2c (14/10/2026) : suspension et résiliation motivées depuis l'espace
 * admin (CGU 11.3, 11.4, 11.5, 14.5).
 *
 * Trois modes :
 *  - « notice » : procédure ordinaire de l'article 11.3. Aucun changement de
 *    compte, un email d'avertissement donne les faits, la règle, la mesure
 *    envisagée et le délai pour présenter ses observations ;
 *  - « immediate » : cas de l'article 11.4 seulement. La mesure s'applique
 *    puis l'email de décision part, la suspension est conservatoire ;
 *  - « after_notice » : décision prise après un avertissement envoyé, au vu
 *    des observations.
 *
 * Chaque mesure passe par send-transactional-email (gabarit transactionnel
 * moderation-decision, clé d'idempotence par mesure, garde-fous existants)
 * et se journalise dans admin_action_logs. Logique pure testée par
 * src/__tests__/j2c/.
 */
import {
  allowsImmediateEffect,
  findModerationRule,
} from "../../../supabase/functions/_shared/moderation-rules.ts";

export type AccountMeasure = "suspend" | "terminate";
export type MeasureMode = "notice" | "immediate" | "after_notice";
export type MeasureOrigin = "report" | "initiative";
export type MeasureAutomation = "none" | "detection";

export const SUSPENSION_DURATIONS: ReadonlyArray<{ value: number | null; label: string }> = [
  { value: 7, label: "7 jours" },
  { value: 15, label: "15 jours" },
  { value: 30, label: "30 jours" },
  { value: 90, label: "90 jours" },
  { value: null, label: "Le temps de l'examen" },
];

export const DEFAULT_OBSERVATION_DAYS = 7;
export const MAX_OBSERVATION_DAYS = 60;
export const MAX_FACTS_LENGTH = 300;

// Tirets demi-cadratin et cadratin (U+2013, U+2014), écrits par leur code.
const LONG_DASH = new RegExp(`[${String.fromCharCode(0x2013, 0x2014)}]`);

export const MEASURE_LOG_ACTIONS: Record<AccountMeasure | "notice", string> = {
  notice: "moderation_notice",
  suspend: "suspend_account",
  terminate: "terminate_account",
};

export interface AccountMeasureInput {
  /** Identifiant tiré à l'ouverture du dialogue : une nouvelle tentative réutilise la même clé. */
  measureId: string;
  userId: string;
  firstName?: string | null;
  measure: AccountMeasure;
  mode: MeasureMode;
  ruleId: string;
  facts: string;
  /** Suspension : nombre de jours, null pour le temps de l'examen. */
  durationDays: number | null;
  /** Avertissement : délai pour présenter ses observations. */
  observationDays: number;
  origin: MeasureOrigin;
  automated: MeasureAutomation;
  /** Date du dernier avertissement envoyé, requis pour « after_notice ». */
  priorNoticeAt?: string | null;
}

/** Date de Paris au format AAAA-MM-JJ. */
export function parisDay(d: Date): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Paris", year: "numeric", month: "2-digit", day: "2-digit",
  }).format(d);
}

export function addDays(now: Date, days: number): Date {
  return new Date(now.getTime() + days * 24 * 60 * 60 * 1000);
}

/** Message d'erreur à afficher, ou null si la mesure peut partir. */
export function validateAccountMeasure(i: AccountMeasureInput): string | null {
  if (!i.userId) return "Membre introuvable.";
  if (!findModerationRule(i.ruleId)) return "Choisissez la règle appliquée.";
  const facts = i.facts.trim();
  if (!facts) return "Décrivez les faits en une phrase.";
  if (facts.length > MAX_FACTS_LENGTH) return `Les faits tiennent en ${MAX_FACTS_LENGTH} caractères au plus.`;
  if (LONG_DASH.test(facts)) return "Remplacez les tirets longs par une virgule ou deux-points.";
  if (i.mode === "notice") {
    if (!Number.isInteger(i.observationDays) || i.observationDays < 1 || i.observationDays > MAX_OBSERVATION_DAYS) {
      return `Le délai d'observations va de 1 à ${MAX_OBSERVATION_DAYS} jours.`;
    }
  }
  if (i.mode === "immediate" && !allowsImmediateEffect(i.ruleId)) {
    return "L'effet immédiat demande un cas de l'article 11.4.";
  }
  if (i.mode === "after_notice" && !i.priorNoticeAt) {
    return "Aucun avertissement préalable n'est enregistré pour ce membre.";
  }
  if (i.measure === "suspend" && i.mode !== "notice" && i.durationDays !== null) {
    if (!Number.isInteger(i.durationDays) || i.durationDays < 1 || i.durationDays > 365) {
      return "La durée de suspension va de 1 à 365 jours.";
    }
  }
  return null;
}

/** Données du gabarit moderation-decision, à partir des seuls choix de l'équipe. */
export function accountMeasureEmailData(i: AccountMeasureInput, now: Date): Record<string, unknown> {
  const rule = findModerationRule(i.ruleId);
  const base = {
    firstName: i.firstName?.trim() || undefined,
    action: i.measure,
    targetType: "profile",
    facts: i.facts.trim(),
    origin: i.origin,
    automated: i.automated,
    ruleStatement: rule?.statement,
  };
  if (i.mode === "notice") {
    return {
      ...base,
      kind: "notice",
      observationDays: i.observationDays,
      observationUntil: parisDay(addDays(now, i.observationDays)),
    };
  }
  if (i.measure === "suspend") {
    return {
      ...base,
      kind: "decision",
      durationDays: i.durationDays,
      ...(i.durationDays ? { untilDate: parisDay(addDays(now, i.durationDays)) } : {}),
      conservatory: i.mode === "immediate",
    };
  }
  return { ...base, kind: "decision" };
}

/** Écriture sur profiles, null pour un avertissement (aucun changement de compte). */
export function accountMeasureProfileUpdate(
  i: AccountMeasureInput,
  adminId: string,
  now: Date,
): Record<string, unknown> | null {
  if (i.mode === "notice") return null;
  const rule = findModerationRule(i.ruleId);
  const reason = `${rule?.label ?? i.ruleId} : ${i.facts.trim()}`;
  return {
    account_status: i.measure === "suspend" ? "suspended" : "deleted",
    suspended_at: now.toISOString(),
    suspended_by: adminId,
    suspended_until: i.measure === "suspend" && i.durationDays ? addDays(now, i.durationDays).toISOString() : null,
    suspension_reason: reason,
  };
}

export function accountMeasureIdempotencyKey(i: AccountMeasureInput): string {
  const kind = i.mode === "notice" ? "notice" : i.measure;
  return `moderation-${kind}-${i.userId}-${i.measureId}`;
}

/** Adresse de référence résolue côté serveur : l'adresse du membre ne passe jamais par le navigateur. */
export function memberEmailReference(userId: string): string {
  return `user-${userId}@notification.guardiens.invalid`;
}

export interface EmailOutcome {
  sent: boolean;
  /** Motif d'un email non parti. */
  reason?: string;
}

export interface AccountMeasureResult {
  ok: boolean;
  error?: string;
  applied: boolean;
  email: EmailOutcome;
}

type Res = { data?: any; error: { message: string } | null };

/** Client Supabase réduit aux appels utilisés, remplaçable dans les tests. */
export interface MeasureClient {
  from: (table: string) => any;
  functions: { invoke: (name: string, opts: { body: Record<string, unknown> }) => Promise<Res> };
}

function emailOutcome(res: Res): EmailOutcome {
  if (res.error) return { sent: false, reason: res.error.message || "erreur d'envoi" };
  const d = res.data ?? {};
  if (d.error) return { sent: false, reason: String(d.error) };
  if (d.success === true) return { sent: true };
  return { sent: false, reason: String(d.reason ?? "refusé par la fonction d'envoi") };
}

export async function executeAccountMeasure(
  client: MeasureClient,
  i: AccountMeasureInput,
  adminId: string,
  now: Date = new Date(),
): Promise<AccountMeasureResult> {
  const invalid = validateAccountMeasure(i);
  if (invalid) return { ok: false, error: invalid, applied: false, email: { sent: false, reason: "non envoyé" } };

  // 1. Mesure sur le compte (effet immédiat ou décision après observations).
  const update = accountMeasureProfileUpdate(i, adminId, now);
  if (update) {
    const { error } = (await client.from("profiles").update(update).eq("id", i.userId)) as Res;
    if (error) {
      return { ok: false, error: `Mesure non appliquée : ${error.message}`, applied: false, email: { sent: false, reason: "non envoyé" } };
    }
    await client.from("profile_moderation").upsert(
      { profile_id: i.userId, suspension_reason: update.suspension_reason },
      { onConflict: "profile_id" },
    );
  }

  // 2. Email motivé, au plus tard à la prise d'effet (CGU 14.5).
  let email: EmailOutcome;
  try {
    email = emailOutcome(await client.functions.invoke("send-transactional-email", {
      body: {
        templateName: "moderation-decision",
        recipientEmail: memberEmailReference(i.userId),
        idempotencyKey: accountMeasureIdempotencyKey(i),
        templateData: accountMeasureEmailData(i, now),
      },
    }));
  } catch (e) {
    email = { sent: false, reason: e instanceof Error ? e.message : "erreur d'envoi" };
  }

  // 3. Journal admin, comme les autres actions.
  const rule = findModerationRule(i.ruleId);
  await client.from("admin_action_logs").insert({
    admin_id: adminId,
    action: MEASURE_LOG_ACTIONS[i.mode === "notice" ? "notice" : i.measure],
    target_type: "profile",
    target_id: i.userId,
    note: i.facts.trim(),
    metadata: {
      measure: i.measure,
      mode: i.mode,
      rule_id: rule?.id ?? null,
      origin: i.origin,
      automated: i.automated,
      duration_days: i.measure === "suspend" && i.mode !== "notice" ? i.durationDays : null,
      observation_days: i.mode === "notice" ? i.observationDays : null,
      measure_id: i.measureId,
      email_sent: email.sent,
      email_reason: email.sent ? null : email.reason,
    },
  });

  return { ok: true, applied: !!update, email };
}

/** Dernier avertissement envoyé au membre (procédure de l'article 11.3). */
export async function fetchLastMeasureNotice(client: MeasureClient, userId: string): Promise<string | null> {
  try {
    const { data, error } = (await client
      .from("admin_action_logs")
      .select("created_at")
      .eq("target_id", userId)
      .eq("action", MEASURE_LOG_ACTIONS.notice)
      .order("created_at", { ascending: false })
      .limit(1)) as Res;
    if (error || !Array.isArray(data) || data.length === 0) return null;
    return typeof data[0]?.created_at === "string" ? data[0].created_at : null;
  } catch {
    return null;
  }
}
