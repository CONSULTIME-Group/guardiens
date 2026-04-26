import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

type Action = "preview" | "approve" | "reject" | "request_resend" | "revoke";

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return json({ error: "Non autorisé" }, 401);

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

    const callerClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user: caller } } = await callerClient.auth.getUser();
    if (!caller) return json({ error: "Non autorisé" }, 401);

    const { data: isAdmin } = await callerClient.rpc("has_role", {
      _user_id: caller.id,
      _role: "admin",
    });

    if (!isAdmin) return json({ error: "Accès refusé" }, 403);

    const adminClient = createClient(supabaseUrl, serviceRoleKey);
    const { action, userId, reason } = await req.json() as { action?: Action; userId?: string; reason?: string };

    if (!action || !userId) return json({ error: "action et userId sont requis" }, 400);

    const { data: profile, error: profileError } = await adminClient
      .from("profiles")
      .select("id, first_name, last_name, identity_document_url, identity_selfie_url")
      .eq("id", userId)
      .single();

    if (profileError || !profile) return json({ error: "Profil introuvable" }, 404);

    if (action === "preview") {
      const [docSigned, selfieSigned] = await Promise.all([
        profile.identity_document_url
          ? adminClient.storage.from("identity-documents").createSignedUrl(profile.identity_document_url, 3600)
          : Promise.resolve({ data: null, error: null }),
        profile.identity_selfie_url
          ? adminClient.storage.from("identity-documents").createSignedUrl(profile.identity_selfie_url, 3600)
          : Promise.resolve({ data: null, error: null }),
      ]);

      return json({
        docUrl: docSigned.data?.signedUrl ?? null,
        selfieUrl: selfieSigned.data?.signedUrl ?? null,
      });
    }

    // Helper: récupère l'email de l'utilisateur depuis auth.users
    const getUserEmail = async (uid: string): Promise<string | null> => {
      const { data, error } = await adminClient.auth.admin.getUserById(uid);
      if (error || !data?.user?.email) return null;
      return data.user.email;
    };

    const sendEmail = async (templateName: string, recipientEmail: string, idempotencyKey: string, templateData: Record<string, unknown> = {}) => {
      try {
        await adminClient.functions.invoke("send-transactional-email", {
          body: { templateName, recipientEmail, idempotencyKey, templateData },
        });
      } catch (e) {
        console.error("send-transactional-email failed", { templateName, recipientEmail, error: e });
      }
    };

    if (action === "approve") {
      const { error } = await adminClient
        .from("profiles")
        .update({ identity_verified: true, identity_verification_status: "verified" })
        .eq("id", userId);
      if (error) return json({ error: error.message }, 500);

      const email = await getUserEmail(userId);

      await Promise.allSettled([
        adminClient.from("identity_verification_logs").insert({ user_id: userId, result: "verified" }),
        adminClient.from("notifications").insert({
          user_id: userId,
          type: "identity_verified",
          title: "Identité vérifiée ✓",
          body: "Votre identité a été vérifiée. Le badge apparaît maintenant sur votre profil.",
          link: "/profile",
        }),
        email ? sendEmail("identity-verified", email, `identity-verified-${userId}`) : Promise.resolve(),
      ]);

      return json({ success: true });
    }

    if (action === "reject") {
      if (!reason?.trim()) return json({ error: "Motif requis" }, 400);

      const { error } = await adminClient
        .from("profiles")
        .update({ identity_verified: false, identity_verification_status: "rejected" })
        .eq("id", userId);
      if (error) return json({ error: error.message }, 500);

      const email = await getUserEmail(userId);

      await Promise.allSettled([
        adminClient.from("identity_verification_logs").insert({ user_id: userId, result: "rejected", rejection_reason: reason }),
        adminClient.from("notifications").insert({
          user_id: userId,
          type: "identity_rejected",
          title: "Vérification d'identité refusée",
          body: `Votre document n'a pas pu être validé. Raison : ${reason}. Vous pouvez soumettre un nouveau document.`,
          link: "/settings",
        }),
        email ? sendEmail("identity-rejected", email, `identity-rejected-${userId}-${Date.now()}`, { reason }) : Promise.resolve(),
      ]);

      return json({ success: true });
    }

    if (action === "request_resend") {
      const { error } = await adminClient
        .from("profiles")
        .update({ identity_verified: false, identity_verification_status: "not_submitted" })
        .eq("id", userId);
      if (error) return json({ error: error.message }, 500);

      await adminClient.from("notifications").insert({
        user_id: userId,
        type: "identity_resend_request",
        title: "Nouveau document demandé",
        body: "Nous avons besoin d'un nouveau document d'identité. Veuillez en soumettre un depuis vos paramètres.",
        link: "/settings",
      });

      return json({ success: true });
    }

    if (action === "revoke") {
      if (!reason?.trim()) return json({ error: "Motif requis" }, 400);

      if (profile.identity_document_url) {
        await adminClient.storage.from("identity-documents").remove([profile.identity_document_url]);
      }
      if (profile.identity_selfie_url) {
        await adminClient.storage.from("identity-documents").remove([profile.identity_selfie_url]);
      }

      const { error } = await adminClient
        .from("profiles")
        .update({ identity_verified: false, identity_verification_status: "not_submitted", identity_document_url: null, identity_selfie_url: null })
        .eq("id", userId);
      if (error) return json({ error: error.message }, 500);

      await Promise.allSettled([
        adminClient.from("identity_verification_logs").insert({ user_id: userId, result: "rejected", rejection_reason: `Révocation : ${reason}` }),
        adminClient.from("notifications").insert({
          user_id: userId,
          type: "identity_rejected",
          title: "Badge ID vérifiée retiré",
          body: `Votre badge d'identité vérifiée a été retiré. Raison : ${reason}. Vous pouvez soumettre un nouveau document.`,
          link: "/settings",
        }),
      ]);

      return json({ success: true });
    }

    return json({ error: "Action inconnue" }, 400);
  } catch (error) {
    console.error("admin-manage-identity-verification error", error);
    return json({ error: error instanceof Error ? error.message : "Erreur interne" }, 500);
  }
});