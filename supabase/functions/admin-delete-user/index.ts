import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";
import { technicalEmail } from "../_shared/account-erasure.ts";
import { executeAdminErasure } from "../_shared/admin-erasure.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

/**
 * Effacement d'un compte depuis la fiche admin d'un membre (lot X2).
 *
 * Même circuit que admin-delete-account : garde-fou des engagements (409),
 * trace account_deletion_requests (source admin, completed), accusé de
 * traitement, blocage de l'adresse, purge des fichiers, anonymisation et
 * neutralisation du compte d'authentification, journal admin_action_logs.
 * Le compte d'authentification est conservé : les conversations et les avis
 * des autres membres restent en place.
 */

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Verify the caller is an admin
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return json({ error: "Non autorisé" }, 401);

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

    // Create a client with the caller's JWT to check admin role
    const callerClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const {
      data: { user: caller },
    } = await callerClient.auth.getUser();
    if (!caller) return json({ error: "Non autorisé" }, 401);

    // Check admin role
    const { data: isAdmin } = await callerClient.rpc("has_role", {
      _user_id: caller.id,
      _role: "admin",
    });
    if (!isAdmin) return json({ error: "Accès refusé" }, 403);

    const body = await req.json().catch(() => ({}));
    const userId = typeof body?.userId === "string" ? body.userId : "";
    if (!userId) return json({ error: "userId manquant" }, 400);

    // Prevent self-deletion
    if (userId === caller.id) {
      return json({ error: "Vous ne pouvez pas supprimer votre propre compte" }, 400);
    }

    const adminClient = createClient(supabaseUrl, supabaseServiceKey);

    // Adresse du membre : profil d'abord, compte d'authentification ensuite.
    const { data: profile } = await adminClient
      .from("profiles")
      .select("id, email")
      .eq("id", userId)
      .maybeSingle();
    let email: string | null = (profile as { email?: string } | null)?.email ?? null;
    if (!profile) {
      const { data: authData } = await adminClient.auth.admin.getUserById(userId);
      if (!authData?.user) return json({ error: "Compte introuvable" }, 404);
      email = authData.user.email ?? null;
    }
    if (email && email.toLowerCase() === technicalEmail(userId)) {
      return json({ error: "Ce compte est déjà effacé." }, 409);
    }

    const result = await executeAdminErasure(adminClient, {
      userId,
      email,
      callerId: caller.id,
      origin: "admin_users",
      notes: typeof body?.notes === "string" && body.notes.trim()
        ? body.notes
        : "Effacement depuis la fiche membre (admin)",
      requestId: typeof body?.requestId === "string" ? body.requestId : null,
      force: body?.force === true,
    });

    if (result.kind === "blocked") {
      return json(
        {
          error:
            "Engagements actifs détectés. Finalisez ou annulez les gardes confirmées et candidatures en attente avant l'effacement.",
          confirmedSits: result.confirmedSits,
          pendingApplications: result.pendingApplications,
        },
        409,
      );
    }

    if (result.kind !== "done") return json({ error: "Compte introuvable" }, 404);

    return json({
      success: true,
      anonymized: true,
      userId: result.userId,
      requestId: result.requestId,
      acknowledged: result.acknowledged,
      suppressed: result.suppressed,
      storageRemoved: result.storageRemoved,
      storageFailures: result.storageFailures,
      authNeutralized: result.authNeutralized,
    });
  } catch (err) {
    console.error("[admin-delete-user]", err);
    return json({ error: err instanceof Error ? err.message : "Erreur interne" }, 500);
  }
});
