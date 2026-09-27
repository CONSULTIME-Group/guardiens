// Alerte sur échecs consécutifs d'un cron, à partir de public.cron_run_log.
// Réutilise le mécanisme existant : table admin_signals (gravité critical)
// puis edge function alert-admin-signals, qui envoie le gabarit
// admin-signals-digest à l'adresse admin des signaux critiques.
import type { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

import {
  CRON_ENTITY_IDS,
  CRON_FAILURE_SIGNAL,
  CRON_FAILURE_THRESHOLD,
  hasConsecutiveFailures,
} from "./cron-failure-logic.ts";
export { CRON_ENTITY_IDS, CRON_FAILURE_SIGNAL, CRON_FAILURE_THRESHOLD, hasConsecutiveFailures };

export async function checkCronFailureAlert(
  client: SupabaseClient,
  edgeName: string,
  errorMessage: string,
): Promise<{ signaled: boolean; emailed: boolean }> {
  const entityId = CRON_ENTITY_IDS[edgeName];
  if (!entityId) return { signaled: false, emailed: false };
  const { data } = await client
    .from("cron_run_log")
    .select("status")
    .eq("edge_name", edgeName)
    .not("status", "is", null)
    .order("started_at", { ascending: false })
    .limit(CRON_FAILURE_THRESHOLD);
  const statuses = ((data ?? []) as Array<{ status: string | null }>).map((r) => r.status);
  if (!hasConsecutiveFailures(statuses)) return { signaled: false, emailed: false };

  const { data: open } = await client
    .from("admin_signals")
    .select("id")
    .eq("signal_type", CRON_FAILURE_SIGNAL)
    .eq("entity_id", entityId)
    .is("resolved_at", null)
    .maybeSingle();
  if (open) return { signaled: false, emailed: false }; // déjà signalé, email déjà parti

  const { data: inserted, error } = await client
    .from("admin_signals")
    .insert({
      signal_type: CRON_FAILURE_SIGNAL,
      severity: "critical",
      entity_type: "cron",
      entity_id: entityId,
      metadata: { title: `Cron en échec : ${edgeName}`, edge_name: edgeName, error: errorMessage.slice(0, 500) },
    })
    .select("id")
    .maybeSingle();
  if (error || !inserted) return { signaled: false, emailed: false };

  const url = Deno.env.get("SUPABASE_URL");
  const key = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  let emailed = false;
  try {
    const res = await fetch(`${url}/functions/v1/alert-admin-signals`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}` },
      body: JSON.stringify({ trigger: `cron-failure-${(inserted as { id: string }).id}` }),
    });
    emailed = res.ok;
  } catch (e) {
    console.error("[cron-failure-alert] email", e);
  }
  return { signaled: true, emailed };
}

/** Un passage réussi referme le signal ouvert. */
export async function resolveCronFailureAlert(client: SupabaseClient, edgeName: string): Promise<void> {
  const entityId = CRON_ENTITY_IDS[edgeName];
  if (!entityId) return;
  await client
    .from("admin_signals")
    .update({ resolved_at: new Date().toISOString(), action_taken: "auto_resolved_cron_success" })
    .eq("signal_type", CRON_FAILURE_SIGNAL)
    .eq("entity_id", entityId)
    .is("resolved_at", null);
}
