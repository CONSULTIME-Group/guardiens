import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";
import { finalizeErasure } from "../_shared/account-erasure.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

/**
 * Suppression IMMÉDIATE et DÉFINITIVE du compte de l'appelant.
 *
 * Politique produit : plus de délai de grâce de 7 / 30 jours.
 * L'utilisateur confirme dans l'UI (tape "SUPPRIMER"), et son compte
 * auth.users est supprimé sur-le-champ (cascade sur profiles + reste).
 *
 * Sécurité :
 *  - Authentifie l'appelant via son JWT (c'est SON compte).
 *  - Vérifie qu'il n'a pas d'engagements actifs (garde-fou serveur en plus du client).
 *  - Supprime via service_role.
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

    const adminClient = createClient(supabaseUrl, serviceKey);

    // Garde-fou serveur : refuser si engagements actifs (gardes confirmées / candidatures pending).
    const [{ count: sitsCount }, { count: appsCount }] = await Promise.all([
      adminClient
        .from("sits")
        .select("id", { count: "exact", head: true })
        .eq("user_id", caller.id)
        .eq("status", "confirmed"),
      adminClient
        .from("applications")
        .select("id", { count: "exact", head: true })
        .eq("sitter_id", caller.id)
        .eq("status", "pending"),
    ]);
    const activeCommitments = (sitsCount ?? 0) + (appsCount ?? 0);
    if (activeCommitments > 0) {
      return new Response(
        JSON.stringify({
          error:
            "Engagements actifs détectés. Finalisez ou annulez vos gardes confirmées et candidatures en attente avant de supprimer votre compte.",
        }),
        { status: 409, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Accusé de traitement RGPD + mise en liste de blocage de l'adresse.
    // Fait AVANT la suppression : l'email doit partir tant que l'adresse n'est
    // pas encore dans suppressed_emails, et le profil est encore lisible.
    const { data: prof } = await adminClient
      .from("profiles")
      .select("email, first_name")
      .eq("id", caller.id)
      .maybeSingle();
    const targetEmail = (prof as { email?: string } | null)?.email ?? caller.email ?? null;
    await finalizeErasure(adminClient, targetEmail, {
      firstName: (prof as { first_name?: string } | null)?.first_name ?? null,
      metadata: { source: "self_delete", user_id: caller.id },
    });

    // Trace de conformité : demande marquée "completed" pour l'historique.
    await adminClient
      .from("account_deletion_requests")
      .upsert(
        {
          user_id: caller.id,
          requester_email: targetEmail,
          source: "self",
          status: "completed",
          processed_at: new Date().toISOString(),
          scheduled_deletion_at: new Date().toISOString(),
        },
        { onConflict: "user_id" }
      );

    const { error: delErr } = await adminClient.auth.admin.deleteUser(caller.id);
    if (delErr) {
      return new Response(JSON.stringify({ error: delErr.message }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : String(e) }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
