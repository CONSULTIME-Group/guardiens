// Cron hebdomadaire des signaux villes (mercredi 08:00 UTC).
//
// Deux signaux distincts, tous deux fondes sur un comptage geographique :
//  A. city_coverage_gap : moins de 3 gardiens dans 30 km autour du point de la
//     page ville, sans condition de trafic Google.
//  B. city_seo_tension : demande Google rapportee a l'offre locale.
//
// Le comptage ignore volontairement identity_verified : la verification est
// une information affichee a cote, jamais un filtre.
//
// L'ancienne detection detect_untapped_cities n'est plus appelee : elle
// comptait par nom de ville exact et filtrait sur identity_verified.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const COVERAGE_RADIUS_KM = 30;
const COVERAGE_MIN_SITTERS = 3;
const TENSION_MIN_IMPRESSIONS = 100;
const TENSION_PERCENTILE = 0.75;
const TENSION_MIN_SAMPLE = 5;

/** Etiquette de semaine ISO, utilisee pour l'idempotence hebdomadaire. */
function isoWeekTag(d: Date): string {
  const t = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
  const day = t.getUTCDay() || 7;
  t.setUTCDate(t.getUTCDate() + 4 - day);
  const yearStart = new Date(Date.UTC(t.getUTCFullYear(), 0, 1));
  const week = Math.ceil(((t.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
  return `${t.getUTCFullYear()}-W${String(week).padStart(2, "0")}`;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
  );

  try {
    const { data: signalsFlag } = await supabase
      .from("feature_flags")
      .select("enabled")
      .eq("key", "admin_signals_active")
      .maybeSingle();

    if (signalsFlag && signalsFlag.enabled === false) {
      return new Response(
        JSON.stringify({ skipped: "admin_signals_active off" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const week = isoWeekTag(new Date());

    // Signaux villes deja ouverts cette semaine : on ne redouble jamais.
    const { data: existing } = await supabase
      .from("admin_signals")
      .select("signal_type, metadata")
      .in("signal_type", ["city_coverage_gap", "city_seo_tension"])
      .is("resolved_at", null);

    const alreadyOpen = new Set(
      (existing ?? []).map((s: { signal_type: string; metadata: Record<string, unknown> | null }) =>
        `${s.signal_type}:${(s.metadata?.city as string) ?? ""}:${(s.metadata?.week as string) ?? ""}`,
      ),
    );

    const rows: Record<string, unknown>[] = [];

    const { data: gaps, error: gapErr } = await supabase.rpc(
      "detect_city_coverage_gaps",
      { p_radius_km: COVERAGE_RADIUS_KM, p_min_sitters: COVERAGE_MIN_SITTERS },
    );
    if (gapErr) throw gapErr;

    for (const g of gaps ?? []) {
      const key = `city_coverage_gap:${g.city}:${week}`;
      if (alreadyOpen.has(key)) continue;
      rows.push({
        signal_type: "city_coverage_gap",
        severity: g.sitters_count === 0 ? "critical" : "warning",
        entity_type: "city",
        entity_id: g.city_page_id,
        metadata: {
          city: g.city,
          slug: g.slug,
          city_page_id: g.city_page_id,
          radius_km: g.radius_km,
          sitters_count: g.sitters_count,
          verified_sitters_count: g.verified_sitters_count,
          active_sits_count: g.active_sits_count,
          week,
        },
      });
    }

    const { data: tension, error: tErr } = await supabase.rpc(
      "detect_city_seo_tension",
      {
        p_radius_km: COVERAGE_RADIUS_KM,
        p_min_impressions: TENSION_MIN_IMPRESSIONS,
        p_percentile: TENSION_PERCENTILE,
        p_min_sample: TENSION_MIN_SAMPLE,
      },
    );
    if (tErr) throw tErr;

    let tensionCount = 0;
    for (const t of tension ?? []) {
      const key = `city_seo_tension:${t.city}:${week}`;
      if (alreadyOpen.has(key)) continue;
      tensionCount += 1;
      rows.push({
        signal_type: "city_seo_tension",
        severity: "warning",
        entity_type: "city",
        entity_id: t.city_page_id,
        metadata: {
          city: t.city,
          slug: t.slug,
          city_page_id: t.city_page_id,
          radius_km: t.radius_km,
          sitters_count: t.sitters_count,
          verified_sitters_count: t.verified_sitters_count,
          gsc_impressions: t.gsc_impressions,
          gsc_clicks: t.gsc_clicks,
          tension_ratio: t.tension_ratio,
          tension_threshold: t.tension_threshold,
          sample_size: t.sample_size,
          week,
        },
      });
    }

    if (rows.length > 0) {
      const { error: insErr } = await supabase.from("admin_signals").insert(rows);
      if (insErr) throw insErr;
    }

    return new Response(
      JSON.stringify({
        week,
        coverage_gaps: rows.length - tensionCount,
        seo_tension: tensionCount,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (e) {
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : String(e) }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
