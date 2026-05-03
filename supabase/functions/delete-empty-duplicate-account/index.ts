import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

/**
 * Self-service deletion d'un compte STRICTEMENT VIDE quand un doublon
 * canonique (même email Gmail normalisé sans points) existe déjà.
 *
 * Sécurité :
 *  - Authentifie l'appelant via son JWT (pas d'admin requis : c'est SON compte).
 *  - Vérifie côté serveur que `is_account_empty(caller.id) = true`.
 *  - Vérifie qu'un doublon canonique existe via `find_duplicate_gmail_account`.
 *  - Supprime ensuite le compte appelant via service_role.
 */
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Non autorisé" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

    const callerClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user: caller } } = await callerClient.auth.getUser();
    if (!caller) {
      return new Response(JSON.stringify({ error: "Session invalide" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 1. Le compte courant doit être strictement vide.
    const { data: emptyData, error: emptyErr } = await callerClient.rpc(
      "is_account_empty",
      { _user_id: caller.id }
    );
    if (emptyErr) {
      return new Response(JSON.stringify({ error: emptyErr.message }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (emptyData !== true) {
      return new Response(
        JSON.stringify({ error: "Compte non vide, suppression refusée" }),
        { status: 409, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 2. Un doublon canonique doit exister.
    const { data: dupData, error: dupErr } = await callerClient.rpc(
      "find_duplicate_gmail_account",
      { _user_id: caller.id }
    );
    if (dupErr) {
      return new Response(JSON.stringify({ error: dupErr.message }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const row = Array.isArray(dupData) ? dupData[0] : dupData;
    if (!row?.canonical_email) {
      return new Response(
        JSON.stringify({ error: "Aucun doublon canonique trouvé" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 3. Suppression via service_role.
    const adminClient = createClient(supabaseUrl, serviceKey);
    const { error: delErr } = await adminClient.auth.admin.deleteUser(caller.id);
    if (delErr) {
      return new Response(JSON.stringify({ error: delErr.message }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(
      JSON.stringify({ success: true, canonical_email: row.canonical_email }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e) {
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : String(e) }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
