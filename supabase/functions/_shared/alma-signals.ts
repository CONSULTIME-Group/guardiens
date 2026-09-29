// Lot J2-B : signaux admin issus d'Alma. Une entrée par membre, par type et par
// jour de Paris (entity_id dérivé, l'index d'unicité fait l'anti-doublon).
// Gravité et destinations lues dans admin-signal-config.ts, configuration unique.
import { SIGNAL_TYPES } from "./admin-signal-config.ts";
import { memberAdminUrl, parisDay } from "./alma-frustration-signal.ts";

export const ALMA_SIGNAL_TITLES: Record<string, string> = {
  alma_frustration: "frustration avec Alma",
  alma_bug_report: "bug supposé signalé à Alma",
  alma_churn: "veut partir ou supprimer son compte",
  alma_unanswered: "question restée sans réponse",
  alma_contact_request: "demande à écrire à Jérémie et Elisa",
};

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
}

export async function recordAlmaSignal(
  // deno-lint-ignore no-explicit-any
  client: any,
  type: string,
  userId: string,
  message: string,
  extra: AlmaSignalExtra = {},
  now = new Date(),
): Promise<void> {
  const cfg = SIGNAL_TYPES[type];
  const day = parisDay(now);
  const entityId = await memberTypeDayEntityId(type, userId, day);
  const entry = {
    at: now.toISOString(),
    text: message.slice(0, 500),
    page_path: extra.pagePath ?? null,
    bug_item: extra.bugItem ?? null,
    conversation_id: extra.conversationId ?? null,
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
    return;
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
      admin_url: memberAdminUrl(userId),
    },
  });
  if (error && error.code !== "23505") throw error;
}
