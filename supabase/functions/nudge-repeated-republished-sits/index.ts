/**
 * nudge-repeated-republished-sits
 * Cron hebdo (vendredi 12h UTC). Titres d'annonces republiés 3+ fois en 180j.
 */
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import { startCronRun } from "../_shared/cron-run-log.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface Republish {
  owner_id: string;
  first_name: string | null;
  sit_title_pattern: string;
  republish_count: number;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  const run = await startCronRun("nudge-repeated-republished-sits");
  try {
    const service = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const { data: flag } = await service.from("feature_flags").select("enabled").eq("key", "admin_signals_active").maybeSingle();
    if (!flag?.enabled) {
      await run.finish("success", { skipped: "flag_off" });
      return new Response(JSON.stringify({ skipped: "admin_signals_active is off" }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const { data, error } = await service.rpc("detect_repeated_republished_sits");
    if (error) throw error;
    const rows: Republish[] = (data as Republish[]) ?? [];

    let inserted = 0, skipped = 0;
    for (const r of rows) {
      const { error: insErr } = await service.from("admin_signals").insert({
        signal_type: "repeated_republish",
        severity: "warning",
        entity_type: "profile",
        entity_id: r.owner_id,
        metadata: {
          first_name: r.first_name,
          sit_title_pattern: r.sit_title_pattern,
          republish_count: r.republish_count,
        },
      });
      if (insErr) skipped += 1;
      else inserted += 1;
    }

    await run.finish("success", { detected: rows.length, inserted, skipped });
    return new Response(JSON.stringify({ detected: rows.length, inserted, skipped }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (err) {
    console.error("[nudge-repeated-republished-sits]", err);
    await run.fail(err);
    return new Response(JSON.stringify({ error: String((err as Error)?.message ?? err) }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
