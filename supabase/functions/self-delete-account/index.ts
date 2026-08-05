import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";
import {
  anonymizeAccount,
  countActiveCommitments,
} from "../_shared/account-erasure.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

/**
 * Effacement du compte de l'appelant, par ANONYMISATION.
 *
 * Le compte n'est plus détruit : les avis, conversations et messages
 * appartiennent aussi aux tiers, et les textes publiés (CGU article 9,
 * politique de confidentialité section 5) annoncent une conservation
 * anonymisée. La ligne profiles est conservée, vidée de toute donnée
 * personnelle, et le compte d'authentification est neutralisé.
 *
 * Sécurité :
 *  - Authentifie l'appelant via son JWT (c'est SON compte).
 *  - Vérifie l'absence d'engagements actifs (le serveur fait foi).
 *  - Écrit via service_role.
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

    // Garde-fou serveur, aligné sur le client : gardes confirmées ou en cours,
    // candidatures en attente ou acceptées.
    const commitments = await countActiveCommitments(adminClient, caller.id);
    if (commitments.total > 0) {
      return new Response(
        JSON.stringify({
          error:
            "Engagements actifs détectés. Finalisez ou annulez vos gardes en cours et vos candidatures en attente avant de supprimer votre compte.",
          confirmedSits: commitments.sits,
          pendingApplications: commitments.applications,
        }),
        { status: 409, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const outcome = await anonymizeAccount(adminClient, caller.id, {
      fallbackEmail: caller.email ?? null,
      source: "self_delete",
    });

    // Trace de conformité : demande marquée "completed" pour l'historique.
    await adminClient
      .from("account_deletion_requests")
      .upsert(
        {
          user_id: caller.id,
          requester_email: outcome.email,
          source: "self",
          status: "completed",
          processed_at: new Date().toISOString(),
          scheduled_deletion_at: new Date().toISOString(),
        },
        { onConflict: "user_id" }
      );

    return new Response(
      JSON.stringify({
        success: true,
        anonymized: true,
        storageRemoved: outcome.storageRemoved,
        storageFailures: outcome.storageFailures,
        authNeutralized: outcome.authNeutralized,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  } catch (e) {
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : String(e) }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
