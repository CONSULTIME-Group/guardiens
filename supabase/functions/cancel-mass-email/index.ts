// Annule une campagne d'email de masse : retire les messages pgmq de la campagne
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

    // 2) file pgmq : seuls les messages de CETTE campagne sont supprimés
    //    (lot N7). Lecture par lots avec une visibilité courte : les messages
    //    des autres campagnes redeviennent visibles à l'expiration, intacts.
    let purged = 0;
    const seen = new Set<number>();
    for (let round = 0; round < 50; round++) {
      const { data: batch, error: readErr } = await service.rpc("read_email_batch", {
        queue_name: "mass_emails", batch_size: 100, vt: 30,
      });
      if (readErr) { console.warn("read_email_batch error:", readErr); break; }
      const rows = (batch ?? []) as Array<{ msg_id: number; message: { campaign_id?: string } }>;
      if (rows.length === 0) break;
      let fresh = 0;
      for (const m of rows) {
        if (seen.has(m.msg_id)) continue;
        seen.add(m.msg_id);
        fresh++;
        if (m.message?.campaign_id === campaign_id) {
          const { error: delErr } = await service.rpc("delete_email", { queue_name: "mass_emails", message_id: m.msg_id });
          if (!delErr) purged++;
        }
      }
      if (fresh === 0) break;
    }

    // 2 bis) reports différés de la campagne : passés en cancelled.
    const { data: deferredRows, error: defErr } = await service
      .from("email_deferred_queue")
      .update({ status: "cancelled", updated_at: new Date().toISOString(), last_error: "campaign cancelled" })
      .like("idempotency_key", `mass-${campaign_id}-%`)
      .in("status", ["pending"])
      .select("id");
    if (defErr) console.warn("deferred queue cancel error:", defErr);
    const deferredCancelled = (deferredRows ?? []).length;

    // 3) marque les lignes queued/failed comme skipped
    await service
      .from("mass_email_sends")
      .update({ status: "skipped", last_error: "campaign cancelled", last_attempt_at: new Date().toISOString() })
      .eq("mass_email_id", campaign_id)
      .in("status", ["queued", "failed"]);

    return new Response(
      JSON.stringify({ ok: true, campaign_id, purged_messages: purged, deferred_cancelled: deferredCancelled }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (err) {
    console.error("cancel-mass-email error:", err);
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
