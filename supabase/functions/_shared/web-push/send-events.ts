// Lot M1 (12/10/2026) : trace de chaque envoi web push dans analytics_events.
//
// push_send_attempted avant l'appel au service de push, puis
// push_send_succeeded (2xx) ou push_send_failed (code HTTP, endpoint_host,
// raison). Pour les envois de test, le succès met à jour last_success_at et
// un 404 ou un 410 désactive l'abonnement (disabled_at, disabled_reason) ;
// le dispatcher garde sa propre logique (lot N1) et ne double rien.
// Aucune écriture de trace ne bloque ni ne change l'envoi.

export type PushSendChannel = "dispatch" | "dispatch_nearby" | "member_test" | "server_test";

export interface PushSendContext {
  channel: PushSendChannel;
  subscriptionId: string;
  endpoint: string;
  userId?: string | null;
  jobId?: string | null;
  eventKind?: string | null;
}

export interface PushEventClient {
  from(table: string): any;
  rpc(fn: string, args: Record<string, unknown>): any;
}

export function endpointHost(endpoint: string | null | undefined): string | null {
  try {
    return endpoint ? new URL(endpoint).hostname || null : null;
  } catch {
    return null;
  }
}

const REASON_MAX = 160;

/** Code HTTP et raison fournie par le service de push, sans URL ni clé. */
export function pushFailure(err: unknown): { http_status: number | null; reason: string | null } {
  const e = (err ?? {}) as { statusCode?: unknown; body?: unknown; message?: unknown };
  const code = typeof e.statusCode === "number" && Number.isInteger(e.statusCode) ? e.statusCode : null;
  const raw = typeof e.body === "string" && e.body.trim()
    ? e.body
    : typeof e.message === "string" ? e.message : "";
  // Retire toute adresse : une raison ne doit jamais porter d'endpoint.
  // Avec un code HTTP, seule la réponse du service compte comme raison ;
  // le message générique de la bibliothèque n'en est pas une.
  const source = code !== null ? (typeof e.body === "string" ? e.body : "") : raw;
  const reason = source.replace(/https?:\/\/\S+/g, "[url]").replace(/\s+/g, " ").trim().slice(0, REASON_MAX);
  return { http_status: code, reason: reason || (code === null ? "network_ambiguous" : null) };
}

export function isGoneStatus(status: number | null): boolean {
  return status === 404 || status === 410;
}

export function pushEventRow(
  eventType: "push_send_attempted" | "push_send_succeeded" | "push_send_failed",
  ctx: PushSendContext,
  extra: Record<string, unknown> = {},
) {
  return {
    user_id: ctx.userId ?? null,
    event_type: eventType,
    source: "web_push",
    metadata: {
      channel: ctx.channel,
      subscription_id: ctx.subscriptionId,
      endpoint_host: endpointHost(ctx.endpoint),
      job_id: ctx.jobId ?? null,
      event_kind: ctx.eventKind ?? null,
      ...extra,
    },
  };
}

async function record(client: PushEventClient, row: ReturnType<typeof pushEventRow>) {
  try {
    const result = await client.from("analytics_events").insert(row);
    if (result?.error) console.warn(`web-push trace ${row.event_type} non enregistree`);
  } catch {
    console.warn(`web-push trace ${row.event_type} non enregistree`);
  }
}

async function resolveUserId(client: PushEventClient, ctx: PushSendContext): Promise<string | null> {
  if (ctx.userId) return ctx.userId;
  try {
    const { data } = await client.from("push_subscriptions").select("user_id").eq("id", ctx.subscriptionId).maybeSingle();
    return (data?.user_id as string | undefined) ?? null;
  } catch {
    return null;
  }
}

/**
 * Enveloppe un envoi : trace avant, trace après, puis rend le code HTTP ou
 * relance l'erreur telle quelle (le comportement de l'appelant est inchangé).
 */
export async function sendWithPushEvents(
  client: PushEventClient,
  input: PushSendContext,
  send: () => Promise<number>,
  opts: { manageSubscription: boolean },
): Promise<number> {
  const ctx = { ...input, userId: await resolveUserId(client, input) };
  await record(client, pushEventRow("push_send_attempted", ctx));
  const started = Date.now();
  let status: number;
  try {
    status = await send();
  } catch (err) {
    const failure = pushFailure(err);
    await record(client, pushEventRow("push_send_failed", ctx, { ...failure, duration_ms: Date.now() - started }));
    if (opts.manageSubscription && isGoneStatus(failure.http_status)) {
      await disable(client, ctx.subscriptionId, `http_${failure.http_status}`);
    }
    throw err;
  }
  if (status >= 200 && status < 300) {
    await record(client, pushEventRow("push_send_succeeded", ctx, { http_status: status, duration_ms: Date.now() - started }));
    if (opts.manageSubscription) {
      try {
        const seen = await client.from("push_subscriptions").update({ last_success_at: new Date().toISOString() }).eq("id", ctx.subscriptionId);
        if (seen?.error) console.warn("web-push last_success_at non enregistre");
      } catch {
        console.warn("web-push last_success_at non enregistre");
      }
    }
  } else {
    await record(client, pushEventRow("push_send_failed", ctx, { http_status: status, reason: null, duration_ms: Date.now() - started }));
    if (opts.manageSubscription && isGoneStatus(status)) await disable(client, ctx.subscriptionId, `http_${status}`);
  }
  return status;
}

async function disable(client: PushEventClient, subscriptionId: string, reason: string) {
  try {
    const result = await client.rpc("push_disable_subscription", { p_subscription_id: subscriptionId, p_reason: reason });
    if (result?.error) console.warn("web-push desactivation non enregistree");
  } catch {
    console.warn("web-push desactivation non enregistree");
  }
}
