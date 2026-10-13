import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";
import { countActiveCommitments } from "../_shared/account-erasure.ts";
import {
  executeAdminErasure,
  findRequest,
  recordDeletionRequest,
} from "../_shared/admin-erasure.ts";
import { findAccountByEmail } from "../_shared/admin-account-lookup.ts";


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
 *  - action = "lookup"  : recherche le compte par email, renvoie les garde-fous
 *                         métier et la demande déjà enregistrée s'il y en a une.
 *  - action = "record"  : enregistre la demande en 'pending' (source admin,
 *                         échéance d'un mois) sans rien effacer (lot X2).
 *  - action = "execute" : anonymise le compte par le circuit partagé
 *                         (_shared/admin-erasure.ts puis account-erasure.ts),
 *                         passe la demande en 'completed'. En cas d'engagement
 *                         actif, renvoie 409 et enregistre la demande en 'pending'.
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
    if (!["lookup", "record", "execute"].includes(action)) {
      return json({ error: "Action inconnue" }, 400);
    }
    const notes = typeof body?.notes === "string" ? body.notes : null;
    const requestId = typeof body?.requestId === "string" ? body.requestId : null;

    // --- Recherche du compte ------------------------------------------------
    // Lot X3c (D-10) : ilike exact puis toutes les pages de auth.users. Une
    // lecture en échec arrête tout, plutôt que de conclure « aucun compte ».
    const found = await findAccountByEmail(adminClient, rawEmail);
    if (found.error) {
      console.error("[admin-delete-account] recherche du compte impossible", found.error);
      return json({ error: "Recherche du compte impossible, réessayez dans un instant." }, 503);
    }
    const profile = found.profile;
    const userId: string | null = found.userId;

    if (action === "lookup") {
      // Garde-fous métier : mêmes règles que self-delete-account.
      const commitments = userId
        ? await countActiveCommitments(adminClient, userId)
        : { sits: 0, applications: 0, total: 0 };
      const existing = await findRequest(adminClient, userId, rawEmail);
      return json({
        found: Boolean(userId),
        userId,
        email: profile?.email ?? rawEmail,
        firstName: profile?.first_name ?? null,
        lastName: profile?.last_name ?? null,
        confirmedSits: commitments.sits,
        pendingApplications: commitments.applications,
        blocked: commitments.total > 0,
        pendingRequest:
          existing && existing.status === "pending"
            ? {
                id: existing.id,
                requestedAt: existing.requested_at,
                scheduledDeletionAt: existing.scheduled_deletion_at,
              }
            : null,
      });
    }

    if (action === "record") {
      const rec = await recordDeletionRequest(adminClient, {
        email: rawEmail,
        userId,
        callerId,
        notes,
      });
      if (rec.error) return json({ error: `Enregistrement impossible : ${rec.error}` }, 500);
      return json({ success: true, recorded: true, accountFound: Boolean(userId), userId, ...rec });
    }

    // --- execute --------------------------------------------------------------
    const result = await executeAdminErasure(adminClient, {
      userId,
      email: profile?.email ?? rawEmail,
      callerId,
      origin: "admin_gdpr_request",
      notes,
      requestId,
      force: body?.force === true,
    });

    if (result.kind === "blocked") {
      // La demande est gardée en attente : date de réception et délai d'un mois tracés.
      const rec = await recordDeletionRequest(adminClient, {
        email: rawEmail,
        userId,
        callerId,
        notes,
      });
      return json(
        {
          error:
            "Engagements actifs détectés. La demande est enregistrée en attente. Finalisez ou annulez les gardes confirmées et candidatures en attente, puis exécutez l'effacement.",
          confirmedSits: result.confirmedSits,
          pendingApplications: result.pendingApplications,
          recorded: !rec.error,
          requestId: rec.requestId,
          requestedAt: rec.requestedAt,
          scheduledDeletionAt: rec.scheduledDeletionAt,
        },
        409,
      );
    }

    if (result.kind === "no_account") {
      return json({
        success: true,
        accountFound: false,
        requestId: result.requestId,
        suppressed: result.suppressed,
        acknowledged: false,
        message:
          "Aucun compte ne correspond à cette adresse. La demande est enregistrée comme traitée et l'adresse est ajoutée à la liste de blocage.",
      });
    }

    return json({
      success: true,
      accountFound: true,
      userId: result.userId,
      requestId: result.requestId,
      acknowledged: result.acknowledged,
      suppressed: result.suppressed,
      storageFailures: result.storageFailures,
      authNeutralized: result.authNeutralized,
    });
  } catch (e) {
    console.error("[admin-delete-account]", e);
    return json({ error: e instanceof Error ? e.message : String(e) }, 500);
  }
});
