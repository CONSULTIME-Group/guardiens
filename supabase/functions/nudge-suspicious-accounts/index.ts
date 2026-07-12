/**
 * nudge-suspicious-accounts
 * Cron toutes les 4h. Cas 1 : signup + candidature < 2h.
 * Cas 2 (haversine 200 km) : reporté, non implémenté.
 */
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import { startCronRun } from "../_shared/cron-run-log.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface Suspicious {
  profile_id: string;
  first_name: string | null;
  email: string | null;
  signal: string;
  detail: string;
  created_at: string;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  const run = await startCronRun("nudge-suspicious-accounts");
  try {
    const service = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const { data: flag } = await service.from("feature_flags").select("enabled").eq("key", "admin_signals_active").maybeSingle();
    if (!flag?.enabled) {
      await run.finish("success", { skipped: "flag_off" });
      return new Response(JSON.stringify({ skipped: "admin_signals_active is off" }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const { data, error } = await service.rpc("detect_suspicious_accounts");
    if (error) throw error;
    const rows: Suspicious[] = (data as Suspicious[]) ?? [];

    let inserted = 0, skipped = 0;
    for (const r of rows) {
      const { error: insErr } = await service.from("admin_signals").insert({
        signal_type: "suspicious_account",
        severity: "critical",
        entity_type: "profile",
        entity_id: r.profile_id,
        metadata: {
          first_name: r.first_name,
          email: r.email,
          signal: r.signal,
          detail: r.detail,
          signup_at: r.created_at,
        },
      });
      if (insErr) skipped += 1;
      else inserted += 1;
    }

    await run.finish("success", { detected: rows.length, inserted, skipped });
    return new Response(JSON.stringify({ detected: rows.length, inserted, skipped }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (err) {
    console.error("[nudge-suspicious-accounts]", err);
    await run.fail(err);
    return new Response(JSON.stringify({ error: String((err as Error)?.message ?? err) }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
