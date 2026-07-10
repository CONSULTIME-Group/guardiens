// Watchdog des campagnes d'email de masse.
// Passe en `paused` toute campagne bloquée en `sending` :
//   - heartbeat_at plus vieux que 5 min, OU
//   - locked_at plus vieux que 5 min sans heartbeat.
// Ne renvoie AUCUN email. Débloque uniquement le statut pour permettre reprise manuelle.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const STALE_MINUTES = 5;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const service = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    const cutoff = new Date(Date.now() - STALE_MINUTES * 60_000).toISOString();

    // Sélection : campagnes en `sending` dont le heartbeat est trop ancien,
    // OU aucun heartbeat et locked_at trop ancien,
    // OU aucun heartbeat/locked_at mais created_at trop ancien (démarrage crashé).
    const { data: stalled, error: selErr } = await service
      .from("mass_emails")
      .select("id, heartbeat_at, locked_at, created_at")
      .eq("status", "sending")
      .or(
        `heartbeat_at.lt.${cutoff},and(heartbeat_at.is.null,locked_at.lt.${cutoff}),and(heartbeat_at.is.null,locked_at.is.null,created_at.lt.${cutoff})`,
      );

    if (selErr) throw new Error(`stalled query failed: ${selErr.message}`);

    const ids = (stalled || []).map((r: any) => r.id);
    if (ids.length === 0) {
      return new Response(JSON.stringify({ paused: 0 }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { error: updErr } = await service
      .from("mass_emails")
      .update({ status: "paused" })
      .in("id", ids)
      .eq("status", "sending"); // garde-fou concurrent

    if (updErr) throw new Error(`pause update failed: ${updErr.message}`);

    console.log(`mass-email-watchdog: paused ${ids.length} stalled campaign(s)`, ids);

    return new Response(JSON.stringify({ paused: ids.length, ids }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("mass-email-watchdog error:", err);
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
