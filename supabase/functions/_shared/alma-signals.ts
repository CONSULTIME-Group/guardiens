// Lot J2-B : signaux admin issus d'Alma. Une entrée par membre, par type et par
// jour de Paris (entity_id dérivé, l'index d'unicité fait l'anti-doublon).
// Gravité et destinations lues dans admin-signal-config.ts, configuration unique.
// Lot A4 : alma_safety se compte par heure de Paris et part par email immédiat
// (destination immediate_email), jamais par l'email quotidien de 8 h.
import { hasDestination, SIGNAL_TYPES } from "./admin-signal-config.ts";
import { memberAdminUrl, parisDay } from "./alma-frustration-signal.ts";

export const ALMA_SIGNAL_TITLES: Record<string, string> = {
  alma_frustration: "frustration avec Alma",
  alma_bug_report: "bug supposé signalé à Alma",
  alma_churn: "veut partir ou supprimer son compte",
  alma_unanswered: "question restée sans réponse",
  alma_contact_request: "demande à écrire à Jérémie et Elisa",
  alma_safety: "sujet de sûreté confié à Alma",
};

/** Lot A4 : types comptés par heure de Paris (un signal par membre et par heure). */
export const HOURLY_SIGNAL_TYPES = new Set(["alma_safety"]);

/** Heure de Paris « AAAA-MM-JJTHH », clé du signal horaire. */
export function parisHourKey(d = new Date()): string {
  const h = new Intl.DateTimeFormat("en-GB", { timeZone: "Europe/Paris", hour: "2-digit", hour12: false })
    .formatToParts(d).find((p) => p.type === "hour")?.value ?? "00";
  return `${parisDay(d)}T${h.padStart(2, "0").replace("24", "00")}`;
}

/** Clé de regroupement du signal : jour de Paris, ou heure de Paris pour alma_safety. */
export function signalBucket(type: string, d = new Date()): string {
  return HOURLY_SIGNAL_TYPES.has(type) ? parisHourKey(d) : parisDay(d);
}

/** UUID stable pour (type, membre, jour). */
export async function memberTypeDayEntityId(type: string, userId: string, day: string): Promise<string> {
  const buf = new Uint8Array(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(`${type}:${userId}:${day}`)));
  const h = [...buf.slice(0, 16)].map((b) => b.toString(16).padStart(2, "0")).join("");
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-4${h.slice(13, 16)}-8${h.slice(17, 20)}-${h.slice(20, 32)}`;
}

export interface AlmaSignalExtra {
  pagePath?: string | null;
  bugItem?: string | null;
  conversationId?: string | null;
  contactMessageId?: string | null;
  /** Lot A4 : famille de sûreté (alma-safety.ts). */
  safetyKind?: string | null;
}

export interface AlmaSignalResult {
  /** Vrai quand une nouvelle entrée a été créée (première du jour, ou de l'heure pour alma_safety). */
  created: boolean;
}

export async function recordAlmaSignal(
  // deno-lint-ignore no-explicit-any
  client: any,
  type: string,
  userId: string,
  message: string,
  extra: AlmaSignalExtra = {},
  now = new Date(),
): Promise<AlmaSignalResult> {
  const cfg = SIGNAL_TYPES[type];
  const day = parisDay(now);
  const entityId = await memberTypeDayEntityId(type, userId, signalBucket(type, now));
  const entry = {
    at: now.toISOString(),
    text: message.slice(0, 500),
    page_path: extra.pagePath ?? null,
    bug_item: extra.bugItem ?? null,
    conversation_id: extra.conversationId ?? null,
    ...(extra.safetyKind ? { safety_kind: extra.safetyKind } : {}),
  };

  // Bug supposé : erreurs techniques du membre dans les 10 minutes autour du message.
  let errors: unknown[] | undefined;
  if (type === "alma_bug_report") {
    const from = new Date(now.getTime() - 10 * 60_000).toISOString();
    const to = new Date(now.getTime() + 10 * 60_000).toISOString();
    const { data } = await client
      .from("error_logs")
      .select("id, message, url, source, last_seen_at")
      .eq("user_id", userId)
      .gte("last_seen_at", from)
      .lte("last_seen_at", to)
      .order("last_seen_at", { ascending: false })
      .limit(5);
    errors = (data ?? []).map((e: any) => ({ id: e.id, message: String(e.message ?? "").slice(0, 200), url: e.url, source: e.source, at: e.last_seen_at }));
  }

  const { data: existing } = await client
    .from("admin_signals")
    .select("id, metadata")
    .eq("signal_type", type)
    .eq("entity_id", entityId)
    .is("resolved_at", null)
    .maybeSingle();
  if (existing?.id) {
    const messages = [...((existing.metadata?.messages as unknown[]) ?? []), entry].slice(-10);
    const patch: Record<string, unknown> = { ...existing.metadata, messages };
    if (errors) patch.error_logs = [...((existing.metadata?.error_logs as unknown[]) ?? []), ...errors].slice(-10);
    await client.from("admin_signals").update({ metadata: patch }).eq("id", existing.id);
    return { created: false };
  }

  const { data: p } = await client.from("profiles").select("first_name, city, role").eq("id", userId).maybeSingle();
  const name = p?.first_name ?? "Membre";
  const { error } = await client.from("admin_signals").insert({
    signal_type: type,
    severity: cfg?.defaultSeverity ?? "warning",
    entity_type: "profile",
    entity_id: entityId,
    metadata: {
      title: `${name}${p?.city ? `, ${p.city}` : ""} (${p?.role ?? "rôle inconnu"}) : ${ALMA_SIGNAL_TITLES[type] ?? type}`,
      excerpt: message.slice(0, 200),
      profile_id: userId,
      first_name: p?.first_name ?? null,
      city: p?.city ?? null,
      role: p?.role ?? null,
      day,
      page_path: extra.pagePath ?? null,
      messages: [entry],
      ...(errors ? { error_logs: errors } : {}),
      ...(extra.contactMessageId ? { contact_message_id: extra.contactMessageId } : {}),
      ...(extra.safetyKind ? { safety_kind: extra.safetyKind } : {}),
      admin_url: memberAdminUrl(userId),
    },
  });
  if (error && error.code !== "23505") throw error;
  return { created: !error };
}

/** Adresse de l'équipe pour les signaux immédiats (même destinataire que l'email quotidien). */
export const IMMEDIATE_SIGNAL_RECIPIENT = "contact@guardiens.fr";

/** Libellés lisibles des familles de sûreté, pour l'email à l'équipe. */
export const SAFETY_KIND_LABELS: Record<string, string> = {
  animal_urgence: "urgence animale",
  animal_perdu: "animal perdu ou échappé",
  personne_danger: "personne en danger",
  detresse: "détresse, idées suicidaires",
  maltraitance_personne: "maltraitance d'une personne",
  maltraitance_animal: "maltraitance d'un animal",
  conflit_garde: "conflit grave pendant une garde",
};

export interface ImmediateSignalEmail {
  templateName: string;
  recipientEmail: string;
  idempotencyKey: string;
  templateData: Record<string, unknown>;
}

/**
 * Lot A4 : email immédiat à l'équipe pour un signal de destination
 * immediate_email, gabarit admin-signals-digest (une ligne). La clé
 * d'idempotence suit la même heure de Paris que le signal.
 */
export function buildImmediateSignalEmail(
  type: string,
  userId: string,
  info: { firstName?: string | null; safetyKind?: string | null; excerpt?: string | null },
  now = new Date(),
): ImmediateSignalEmail {
  const label = info.safetyKind ? SAFETY_KIND_LABELS[info.safetyKind] ?? info.safetyKind : ALMA_SIGNAL_TITLES[type] ?? type;
  const who = info.firstName?.trim() || "Un membre";
  return {
    templateName: "admin-signals-digest",
    recipientEmail: IMMEDIATE_SIGNAL_RECIPIENT,
    idempotencyKey: `${type}-${userId}-${signalBucket(type, now)}`,
    templateData: {
      criticalCount: 1,
      warningCount: 0,
      staleCount: 0,
      coverageLine: null,
      lines: [{
        title: `Alma, ${label} : ${who}`,
        action: `Lire l'échange et reprendre contact si besoin. Message : « ${(info.excerpt ?? "").slice(0, 200)} »`,
        startDate: null,
        ageDays: 0,
        count: 1,
        link: memberAdminUrl(userId),
      }],
    },
  };
}

/**
 * Lot A4 : lève le signal et, pour un type à email immédiat, envoie l'email
 * à l'équipe quand l'entrée de l'heure vient d'être créée (un par membre et
 * par heure). `send` reçoit le corps de send-transactional-email.
 */
export async function raiseImmediateAlmaSignal(
  // deno-lint-ignore no-explicit-any
  client: any,
  type: string,
  userId: string,
  message: string,
  extra: AlmaSignalExtra,
  send: (email: ImmediateSignalEmail) => Promise<boolean>,
  now = new Date(),
): Promise<{ created: boolean; emailed: boolean }> {
  const { created } = await recordAlmaSignal(client, type, userId, message, extra, now);
  if (!created || !hasDestination(type, "immediate_email")) return { created, emailed: false };
  const { data: p } = await client.from("profiles").select("first_name").eq("id", userId).maybeSingle();
  const email = buildImmediateSignalEmail(type, userId, { firstName: p?.first_name ?? null, safetyKind: extra.safetyKind ?? null, excerpt: message }, now);
  let emailed = false;
  try {
    emailed = await send(email);
  } catch (e) {
    console.error(`${type} immediate email failed`, e);
  }
  return { created, emailed };
}
