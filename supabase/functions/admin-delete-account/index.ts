import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";
import {
  anonymizeAccount,
  countActiveCommitments,
  finalizeErasure,
} from "../_shared/account-erasure.ts";


const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

/**
 * Traitement ADMIN d'une demande d'effacement RGPD reçue hors plateforme.
 *
 * Sécurité : réservé aux admins. Le JWT de l'appelant est vérifié avec la clé
 * service_role, puis has_role(caller, 'admin') est exigé. Aucune bascule
 * service_role côté client n'est possible.
 *
 * Actions :
 *  - action = "lookup"  : recherche le compte par email et renvoie les garde-fous métier.
 *  - action = "execute" : supprime le compte (auth.admin.deleteUser + cascade),
 *                         envoie l'accusé de traitement, ajoute l'email à
 *                         suppressed_emails, et trace la demande en 'completed'.
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

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const adminClient = createClient(supabaseUrl, serviceKey);

  // --- Garde admin ---------------------------------------------------------
  const authHeader = req.headers.get("Authorization") ?? "";
  if (!authHeader.startsWith("Bearer ")) return json({ error: "Non autorisé" }, 401);
  const token = authHeader.replace("Bearer ", "");
  const { data: userData, error: userErr } = await adminClient.auth.getUser(token);
  if (userErr || !userData?.user) return json({ error: "Non autorisé" }, 401);
  const callerId = userData.user.id;
  const { data: isAdmin } = await adminClient.rpc("has_role", {
    _user_id: callerId,
    _role: "admin",
  });
  if (!isAdmin) return json({ error: "Accès réservé aux administrateurs" }, 403);

  try {
    const body = await req.json().catch(() => ({}));
    const action = String(body?.action ?? "lookup");
    const rawEmail = typeof body?.email === "string" ? body.email.trim().toLowerCase() : "";
    if (!rawEmail || !rawEmail.includes("@")) {
      return json({ error: "Email requis" }, 400);
    }

    // --- Recherche du compte ------------------------------------------------
    const { data: profile } = await adminClient
      .from("profiles")
      .select("id, email, first_name, last_name")
      .ilike("email", rawEmail)
      .maybeSingle();

    let userId: string | null = profile?.id ?? null;
    if (!userId) {
      // Repli : l'email peut n'exister que dans auth.users.
      const { data: list } = await adminClient.auth.admin.listUsers({ page: 1, perPage: 200 });
      const match = list?.users?.find(
        (u) => (u.email ?? "").toLowerCase() === rawEmail,
      );
      userId = match?.id ?? null;
    }

    // Garde-fous métier : mêmes règles que self-delete-account.
    let confirmedSits = 0;
    let pendingApplications = 0;
    if (userId) {

      const commitments = await countActiveCommitments(adminClient, userId);
      confirmedSits = commitments.sits;
      pendingApplications = commitments.applications;
    }

    const blockers = confirmedSits + pendingApplications;

    if (action === "lookup") {
      return json({
        found: Boolean(userId),
        userId,
        email: profile?.email ?? rawEmail,
        firstName: profile?.first_name ?? null,
        lastName: profile?.last_name ?? null,
        confirmedSits,
        pendingApplications,
        blocked: blockers > 0,
      });
    }

    if (action !== "execute") return json({ error: "Action inconnue" }, 400);

    const force = body?.force === true;
    if (userId && blockers > 0 && !force) {
      return json(
        {
          error:
            "Engagements actifs détectés. Finalisez ou annulez les gardes confirmées et candidatures en attente avant l'effacement.",
          confirmedSits,
          pendingApplications,
        },
        409,
      );
    }

    const nowIso = new Date().toISOString();
    const trace = {
      requester_email: rawEmail,
      source: "admin",
      status: "completed",
      processed_by: callerId,
      processed_at: nowIso,
      scheduled_deletion_at: nowIso,
      notes: typeof body?.notes === "string" ? body.notes : null,
    };

    // Cas 1 : aucun compte correspondant. On ne plante pas : trace + suppression email.
    if (!userId) {
      await adminClient.from("account_deletion_requests").insert({ ...trace, user_id: null });
      const { suppressed } = await finalizeErasure(adminClient, rawEmail, {
        metadata: { source: "admin_gdpr_request", account_found: false },
      });
      return json({
        success: true,
        accountFound: false,
        suppressed,
        acknowledged: false,
        message:
          "Aucun compte ne correspond à cette adresse. La demande est enregistrée comme traitée et l'adresse est ajoutée à la liste de blocage.",
      });
    }

    // Cas 2 : compte existant. Accusé + suppression email AVANT la suppression du compte
    // (l'accusé doit partir tant que l'adresse n'est pas encore bloquée).
    const { acknowledged, suppressed } = await finalizeErasure(
      adminClient,
      profile?.email ?? rawEmail,
      {
        firstName: profile?.first_name ?? null,
        metadata: { source: "admin_gdpr_request", user_id: userId },
      },
    );

    // Trace de conformité écrite avant la suppression (user_id passe à NULL en cascade).
    const existing = typeof body?.requestId === "string" ? body.requestId : null;
    if (existing) {
      await adminClient.from("account_deletion_requests").update(trace).eq("id", existing);
    } else {
      const { error: upErr } = await adminClient
        .from("account_deletion_requests")
        .upsert({ ...trace, user_id: userId }, { onConflict: "user_id" });
      if (upErr) console.error("[admin-delete-account] trace échouée", upErr.message);
    }

    const { error: delErr } = await adminClient.auth.admin.deleteUser(userId);
    if (delErr) return json({ error: delErr.message }, 500);

    await adminClient.from("admin_action_logs").insert({
      admin_id: callerId,
      action: "gdpr_account_erasure",
      target_type: "profile",
      target_id: userId,
      note: `Effacement RGPD exécuté pour ${rawEmail}`,
      metadata: { email: rawEmail, acknowledged, suppressed, forced: force },
    });

    return json({ success: true, accountFound: true, userId, acknowledged, suppressed });
  } catch (e) {
    console.error("[admin-delete-account]", e);
    return json({ error: e instanceof Error ? e.message : String(e) }, 500);
  }
});
