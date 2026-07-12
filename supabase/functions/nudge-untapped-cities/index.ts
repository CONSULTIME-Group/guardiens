/**
 * nudge-untapped-cities
 * Cron hebdo (mercredi 8h UTC). Détecte les villes fort potentiel GSC / offre gardien faible.
 * Insère un signal admin 'untapped_city' (warning) par ville, idempotent semainier.
 */
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import { startCronRun } from "../_shared/cron-run-log.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface UntappedCity {
  city: string;
  gsc_impressions: number;
  gsc_clicks: number;
  local_sitters_count: number;
  active_sits_count: number;
}

function isoWeek(d: Date): string {
  const date = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
  const dayNum = date.getUTCDay() || 7;
  date.setUTCDate(date.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(date.getUTCFullYear(), 0, 1));
  const week = Math.ceil((((date.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
  return `${date.getUTCFullYear()}${String(week).padStart(2, "0")}`;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  const run = await startCronRun("nudge-untapped-cities");
  try {
    const service = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

    const { data: flag } = await service.from("feature_flags").select("enabled").eq("key", "admin_signals_active").maybeSingle();
    if (!flag?.enabled) {
      await run.finish("success", { skipped: "flag_off" });
      return new Response(JSON.stringify({ skipped: "admin_signals_active is off" }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const { data, error } = await service.rpc("detect_untapped_cities");
    if (error) throw error;
    const cities: UntappedCity[] = (data as UntappedCity[]) ?? [];

    const weekTag = isoWeek(new Date());
    let inserted = 0, skipped = 0;

    for (const c of cities) {
      const messageId = `untapped-city-${c.city.toLowerCase().replace(/\s+/g, "-")}-${weekTag}`;
      // synth entity_id = md5(city+week) as uuid? use gen_random_uuid + rely on idempotence index on signal_type+entity_id
      // Idempotence: check existing unresolved for same signal_type+metadata.city+week
      const { data: existing } = await service
        .from("admin_signals")
        .select("id")
        .eq("signal_type", "untapped_city")
        .is("resolved_at", null)
        .contains("metadata", { city: c.city, week_tag: weekTag })
        .limit(1)
        .maybeSingle();
      if (existing) { skipped += 1; continue; }

      const { error: insErr } = await service.from("admin_signals").insert({
        signal_type: "untapped_city",
        severity: "warning",
        entity_type: "city",
        entity_id: crypto.randomUUID(),
        metadata: {
          city: c.city,
          gsc_impressions: c.gsc_impressions,
          gsc_clicks: c.gsc_clicks,
          local_sitters_count: c.local_sitters_count,
          active_sits_count: c.active_sits_count,
          week_tag: weekTag,
          message_id: messageId,
        },
      });
      if (insErr) { skipped += 1; continue; }
      inserted += 1;
    }

    await run.finish("success", { detected: cities.length, inserted, skipped });
    return new Response(JSON.stringify({ detected: cities.length, inserted, skipped }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (err) {
    console.error("[nudge-untapped-cities]", err);
    await run.fail(err);
    return new Response(JSON.stringify({ error: String((err as Error)?.message ?? err) }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
