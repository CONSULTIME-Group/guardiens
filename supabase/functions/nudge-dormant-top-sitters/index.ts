/**
 * nudge-dormant-top-sitters
 * Cron hebdo (mercredi 11h UTC). Top gardiens (note ≥ 4,7, ≥3 avis) sans candidature > 30j.
 */
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import { startCronRun } from "../_shared/cron-run-log.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface DormantTop {
  sitter_id: string;
  first_name: string | null;
  avg_rating: number;
  reviews_count: number;
  days_since_last_application: number;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  const run = await startCronRun("nudge-dormant-top-sitters");
  try {
    const service = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const { data: flag } = await service.from("feature_flags").select("enabled").eq("key", "admin_signals_active").maybeSingle();
    if (!flag?.enabled) {
      await run.finish("success", { skipped: "flag_off" });
      return new Response(JSON.stringify({ skipped: "admin_signals_active is off" }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const { data, error } = await service.rpc("detect_dormant_top_sitters");
    if (error) throw error;
    const rows: DormantTop[] = (data as DormantTop[]) ?? [];

    let inserted = 0, skipped = 0;
    for (const s of rows) {
      const { error: insErr } = await service.from("admin_signals").insert({
        signal_type: "dormant_top_sitter",
        severity: "warning",
        entity_type: "profile",
        entity_id: s.sitter_id,
        metadata: {
          first_name: s.first_name,
          avg_rating: s.avg_rating,
          reviews_count: s.reviews_count,
          days_since_last_application: s.days_since_last_application,
        },
      });
      if (insErr) {
        if (insErr.code === "23505" || insErr.message?.includes("idx_admin_signals_idempotent")) skipped += 1;
        else skipped += 1;
      } else inserted += 1;
    }

    await run.finish("success", { detected: rows.length, inserted, skipped });
    return new Response(JSON.stringify({ detected: rows.length, inserted, skipped }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (err) {
    console.error("[nudge-dormant-top-sitters]", err);
    await run.fail(err);
    return new Response(JSON.stringify({ error: String((err as Error)?.message ?? err) }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
