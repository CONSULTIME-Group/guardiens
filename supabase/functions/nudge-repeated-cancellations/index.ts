/**
 * nudge-repeated-cancellations
 * Cron hebdo (jeudi 10h UTC). Personnes ayant annulé 2+ gardes en 90j.
 */
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import { startCronRun } from "../_shared/cron-run-log.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface RepeatedCancel {
  profile_id: string;
  first_name: string | null;
  role: string;
  cancellations_count: number;
  period_days: number;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  const run = await startCronRun("nudge-repeated-cancellations");
  try {
    const service = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const { data: flag } = await service.from("feature_flags").select("enabled").eq("key", "admin_signals_active").maybeSingle();
    if (!flag?.enabled) {
      await run.finish("success", { skipped: "flag_off" });
      return new Response(JSON.stringify({ skipped: "admin_signals_active is off" }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const { data, error } = await service.rpc("detect_repeated_cancellations");
    if (error) throw error;
    const rows: RepeatedCancel[] = (data as RepeatedCancel[]) ?? [];

    let inserted = 0, skipped = 0;
    for (const r of rows) {
      const { error: insErr } = await service.from("admin_signals").insert({
        signal_type: "repeated_cancellations",
        severity: "warning",
        entity_type: "profile",
        entity_id: r.profile_id,
        metadata: {
          first_name: r.first_name,
          role: r.role,
          cancellations_count: r.cancellations_count,
          period_days: r.period_days,
        },
      });
      if (insErr) skipped += 1;
      else inserted += 1;
    }

    await run.finish("success", { detected: rows.length, inserted, skipped });
    return new Response(JSON.stringify({ detected: rows.length, inserted, skipped }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (err) {
    console.error("[nudge-repeated-cancellations]", err);
    await run.fail(err);
    return new Response(JSON.stringify({ error: String((err as Error)?.message ?? err) }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
