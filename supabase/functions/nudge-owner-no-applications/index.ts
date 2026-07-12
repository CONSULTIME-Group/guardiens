/**
 * nudge-owner-no-applications
 *
 * Cron quotidien (10h00) : détecte les annonces publiées depuis plus de 3 jours
 * sans candidature, calcule le nombre de gardiens éligibles à 30 km, et insère
 * un signal actionnable dans admin_signals (idempotent grâce à l'index unique
 * signal_type + entity_id où resolved_at IS NULL).
 *
 * Respecte le feature flag admin_signals_active : si false, sortie early.
 */
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import { startCronRun } from "../_shared/cron-run-log.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const DEFAULT_RADIUS_KM = 30;

interface StaleSit {
  sit_id: string;
  owner_id: string;
  sit_title: string;
  sit_city: string | null;
  latitude: number | null;
  longitude: number | null;
  days_since_published: number;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const run = await startCronRun("nudge-owner-no-applications");
  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    // Feature flag check
    const { data: flag } = await supabase
      .from("feature_flags")
      .select("enabled")
      .eq("key", "admin_signals_active")
      .maybeSingle();

    if (!flag?.enabled) {
      await run.finish("success", { skipped: "flag_off" });
      return new Response(
        JSON.stringify({ skipped: "admin_signals_active is off" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const { data: staleSits, error: staleErr } = await supabase.rpc(
      "detect_stale_sits",
    );
    if (staleErr) throw staleErr;

    const sits: StaleSit[] = (staleSits as StaleSit[]) ?? [];

    let inserted = 0;
    let skipped = 0;
    const errors: Array<{ sit_id: string; error: string }> = [];

    for (const sit of sits) {
      let eligible = 0;
      if (sit.latitude != null && sit.longitude != null) {
        const { data: count, error: cErr } = await supabase.rpc(
          "count_eligible_sitters",
          {
            p_lat: sit.latitude,
            p_lng: sit.longitude,
            p_radius_km: DEFAULT_RADIUS_KM,
          },
        );
        if (cErr) {
          errors.push({ sit_id: sit.sit_id, error: cErr.message });
          continue;
        }
        eligible = (count as number) ?? 0;
      }

      const severity = eligible === 0 ? "info" : "warning";

      const { error: insErr } = await supabase.from("admin_signals").insert({
        signal_type: "no_applications",
        severity,
        entity_type: "sit",
        entity_id: sit.sit_id,
        metadata: {
          sit_title: sit.sit_title,
          sit_city: sit.sit_city,
          days_since_published: sit.days_since_published,
          eligible_sitters_count: eligible,
          eligible_radius_km: DEFAULT_RADIUS_KM,
          owner_id: sit.owner_id,
        },
      });

      if (insErr) {
        // Idempotence : conflit d'index unique => déjà signalé, on ignore
        if (
          insErr.code === "23505" ||
          insErr.message?.includes("idx_admin_signals_idempotent")
        ) {
          skipped += 1;
        } else {
          errors.push({ sit_id: sit.sit_id, error: insErr.message });
        }
      } else {
        inserted += 1;
      }
    }

    const metrics = { detected: sits.length, inserted, skipped, errors_count: errors.length };
    await run.finish(errors.length > 0 ? "partial" : "success", metrics);
    return new Response(
      JSON.stringify({
        detected: sits.length,
        inserted,
        skipped,
        errors,
        generated_at: new Date().toISOString(),
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (err) {
    console.error("[nudge-owner-no-applications]", err);
    await run.fail(err);
    return new Response(
      JSON.stringify({ error: String((err as Error)?.message ?? err) }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  }
});
