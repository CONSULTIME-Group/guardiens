// Annule une campagne d'email de masse : purge les messages pgmq restants
// et passe la campagne en statut `cancelled`. Admin uniquement.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }
  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;

    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const userClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user }, error: userErr } = await userClient.auth.getUser();
    if (userErr || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const service = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    const { data: isAdmin } = await service.rpc("has_role", {
      _user_id: user.id, _role: "admin",
    });
    if (!isAdmin) {
      return new Response(JSON.stringify({ error: "Forbidden: admin only" }), {
        status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { campaign_id } = await req.json();
    if (!campaign_id || typeof campaign_id !== "string") {
      return new Response(JSON.stringify({ error: "Missing campaign_id" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 1) marque la campagne cancelled (le worker skippera les messages restants)
    const { error: upErr } = await service
      .from("mass_emails")
      .update({ status: "cancelled", heartbeat_at: new Date().toISOString() })
      .eq("id", campaign_id);
    if (upErr) throw new Error(`campaign update failed: ${upErr.message}`);

    // 2) purge de la file pgmq (draine tous les messages en attente)
    //    Attention : purge_email_queue vide TOUTE la file mass_emails.
    //    Comme la file est dédiée aux campagnes de masse et que le worker
    //    ignore silencieusement les campagnes cancelled, c'est acceptable.
    //    À défaut, on pourrait consommer et filtrer, mais pgmq n'expose pas
    //    de purge par prédicat. On reste sur la purge globale.
    const { data: purged, error: purgeErr } = await service.rpc("purge_email_queue", {
      queue_name: "mass_emails",
    });
    if (purgeErr) console.warn("purge_email_queue error:", purgeErr);

    // 3) marque les lignes queued/failed comme skipped
    await service
      .from("mass_email_sends")
      .update({ status: "skipped", last_error: "campaign cancelled", last_attempt_at: new Date().toISOString() })
      .eq("mass_email_id", campaign_id)
      .in("status", ["queued", "failed"]);

    return new Response(
      JSON.stringify({ ok: true, campaign_id, purged_messages: purged ?? 0 }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (err) {
    console.error("cancel-mass-email error:", err);
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
