// Helper léger : trace chaque exécution d'un cron dans public.cron_run_log.
// Usage :
//   const run = await startCronRun("nudge-xxx");
//   try { ... await run.finish("success", { emails_sent: 3 }); }
//   catch (e) { await run.fail(e); throw e; }
import { createClient, SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

/**
 * Sérialisation lisible d'une erreur, quelle que soit sa forme.
 *
 * Motif corrigé : `String(erreurPostgrest)` produisait la chaîne
 * "[object Object]", ce qui a laissé un cron mourir en silence. Une erreur
 * Supabase (message, code, details, hint) n'est pas une instance de Error,
 * elle doit donc passer par une sérialisation explicite.
 */
export function describeError(error: unknown): string {
  if (error == null) return "unknown_error";
  if (typeof error === "string") return error;
  if (error instanceof Error) {
    const cause = (error as { cause?: unknown }).cause;
    return cause ? `${error.message} (cause: ${describeError(cause)})` : error.message;
  }
  if (typeof error === "object") {
    const e = error as Record<string, unknown>;
    const parts = ["message", "code", "details", "hint"]
      .filter((k) => e[k] != null && e[k] !== "")
      .map((k) => `${k}: ${String(e[k])}`);
    if (parts.length > 0) return parts.join(", ");
    try {
      return JSON.stringify(error);
    } catch {
      return Object.prototype.toString.call(error);
    }
  }
  return String(error);
}

export interface CronRun {
  id: string | null;
  finish: (status: "success" | "partial", metrics?: Record<string, unknown>) => Promise<void>;
  fail: (error: unknown, metrics?: Record<string, unknown>) => Promise<void>;
}


function getServiceClient(): SupabaseClient | null {
  const url = Deno.env.get("SUPABASE_URL");
  const key = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!url || !key) return null;
  return createClient(url, key);
}

export async function startCronRun(edgeName: string): Promise<CronRun> {
  // Garde-fou : jamais de sérialisation d'un argument inattendu (ex. client avec clé).
  const validName = typeof edgeName === "string" && edgeName.trim().length > 0;
  const row: Record<string, unknown> = validName
    ? { edge_name: edgeName }
    : { edge_name: "invalid-edge-name", error_message: "startCronRun appelé sans nom valide" };
  const client = getServiceClient();
  let id: string | null = null;
  if (client) {
    const { data } = await client
      .from("cron_run_log")
      .insert({ ...row, started_at: new Date().toISOString() })
      .select("id")
      .maybeSingle();
    id = (data as { id?: string } | null)?.id ?? null;
  }

  async function update(fields: Record<string, unknown>) {
    if (!client || !id) return;
    await client.from("cron_run_log").update(fields).eq("id", id);
  }

  return {
    id,
    async finish(status, metrics = {}) {
      await update({
        finished_at: new Date().toISOString(),
        status,
        metrics,
      });
    },
    async fail(error, metrics = {}) {
      const msg = describeError(error);
      await update({
        finished_at: new Date().toISOString(),
        status: "failed",
        metrics,
        error_message: msg.slice(0, 2000),
      });
    },
  };
}

/**
 * Trace un rejet d'authentification de cron dans public.cron_run_log.
 * Sans cela, un 401 renvoye par le garde reste totalement invisible.
 */
export async function logCronRejection(
  edgeName: string,
  errorMessage: string,
): Promise<void> {
  const client = getServiceClient();
  if (!client) return;
  const now = new Date().toISOString();
  await client.from("cron_run_log").insert({
    edge_name: edgeName,
    started_at: now,
    finished_at: now,
    status: "failed",
    error_message: errorMessage.slice(0, 2000),
  });
}

/** Appel planifié : clé de service brute ou jeton signé portant role=service_role. */
export function isServiceRoleCall(req: Request): boolean {
  const raw = req.headers.get("Authorization") ?? "";
  if (!raw.startsWith("Bearer ")) return false;
  const token = raw.slice(7);
  const key = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (key && token === key) return true;
  try {
    const parts = token.split(".");
    if (parts.length !== 3) return false;
    const pad = parts[1].length % 4 === 0 ? "" : "=".repeat(4 - (parts[1].length % 4));
    const payload = JSON.parse(atob(parts[1].replace(/-/g, "+").replace(/_/g, "/") + pad));
    return payload?.role === "service_role";
  } catch {
    return false;
  }
}

/** Champs simples d'une réponse JSON, gardés comme métriques (jamais d'objet imbriqué). */
export function runMetricsFromBody(body: unknown, httpStatus: number): Record<string, unknown> {
  const metrics: Record<string, unknown> = { http_status: httpStatus };
  if (!body || typeof body !== "object" || Array.isArray(body)) return metrics;
  for (const [k, v] of Object.entries(body as Record<string, unknown>).slice(0, 20)) {
    if (typeof v === "number" || typeof v === "boolean") metrics[k] = v;
    else if (typeof v === "string") metrics[k] = v.slice(0, 200);
  }
  return metrics;
}

/**
 * Lot ADM8 : journalise chaque appel planifié d'une fonction qui n'écrivait
 * rien dans cron_run_log. Seuls les appels avec la clé de service comptent
 * (les aperçus lancés depuis l'admin restent hors journal). Réponse 2xx sans
 * champ « error » : succès ; sinon échec, avec le message renvoyé.
 */
export function withCronRunLog(
  edgeName: string,
  handler: (req: Request) => Promise<Response>,
): (req: Request) => Promise<Response> {
  return async (req: Request): Promise<Response> => {
    if (req.method === "OPTIONS" || !isServiceRoleCall(req)) return handler(req);
    // Nom littéral passé par l'appelant (garde edge-cron-run-log-usage).
    const config = { edgeName: String(edgeName) };
    const run = await startCronRun(config.edgeName);
    let res: Response;
    try {
      res = await handler(req);
    } catch (e) {
      await run.fail(e);
      throw e;
    }
    let body: unknown = null;
    try { body = await res.clone().json(); } catch { /* corps non JSON */ }
    const metrics = runMetricsFromBody(body, res.status);
    const bodyError = body && typeof body === "object" && !Array.isArray(body)
      ? (body as Record<string, unknown>).error
      : null;
    if (res.status >= 400 || bodyError) {
      await run.fail(bodyError ? String(bodyError) : `HTTP ${res.status}`, metrics);
    } else {
      await run.finish("success", metrics);
    }
    return res;
  };
}
