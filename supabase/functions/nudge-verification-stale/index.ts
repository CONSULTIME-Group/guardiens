/**
 * nudge-verification-stale
 *
 * Cron hebdomadaire (mardi 9h UTC) : détecte les demandes de vérification
 * d'identité en attente depuis plus de 7 jours et remonte un signal admin.
 *
 * Aucun email n'est envoyé au user : c'est un signal opérationnel destiné
 * à l'équipe Guardiens (Jérémie doit traiter). Severity warning entre
 * 7 et 14 jours, critical au-delà.
 */
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface StaleVerification {
  profile_id: string;
  first_name: string | null;
  email: string | null;
  days_since_request: number;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }
  try {
    const service = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const { data: flag } = await service
      .from("feature_flags")
      .select("enabled")
      .eq("key", "admin_signals_active")
      .maybeSingle();
    if (!flag?.enabled) {
      return new Response(
        JSON.stringify({ skipped: "admin_signals_active is off" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const { data, error } = await service.rpc("detect_stale_verifications");
    if (error) throw error;
    const rows: StaleVerification[] = (data as StaleVerification[]) ?? [];

    let inserted = 0;
    let skipped = 0;
    const errors: Array<{ profile_id: string; error: string }> = [];

    for (const r of rows) {
      const severity = r.days_since_request >= 14 ? "critical" : "warning";
      const { error: insErr } = await service.from("admin_signals").insert({
        signal_type: "stale_verification",
        severity,
        entity_type: "profile",
        entity_id: r.profile_id,
        metadata: {
          first_name: r.first_name,
          email: r.email,
          days_since_request: r.days_since_request,
        },
      });
      if (insErr) {
        if (insErr.code === "23505" || insErr.message?.includes("idx_admin_signals_idempotent")) {
          skipped += 1;
        } else {
          errors.push({ profile_id: r.profile_id, error: insErr.message });
        }
      } else {
        inserted += 1;
      }
    }

    return new Response(
      JSON.stringify({
        detected: rows.length,
        inserted,
        skipped,
        errors,
        generated_at: new Date().toISOString(),
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (err) {
    console.error("[nudge-verification-stale]", err);
    return new Response(
      JSON.stringify({ error: String((err as Error)?.message ?? err) }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
