// Helper léger : trace chaque exécution d'un cron dans public.cron_run_log.
// Usage :
//   const run = await startCronRun("nudge-xxx");
//   try { ... await run.finish("success", { emails_sent: 3 }); }
//   catch (e) { await run.fail(e); throw e; }
import { createClient, SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

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
  const client = getServiceClient();
  let id: string | null = null;
  if (client) {
    const { data } = await client
      .from("cron_run_log")
      .insert({ edge_name: edgeName, started_at: new Date().toISOString() })
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
      const msg = error instanceof Error ? error.message : String(error);
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
