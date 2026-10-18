import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

export const DELETABLE_STATUSES = ["published", "draft", "archived", "expired"];

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

    const {
      data: { user: caller },
      error: callerError,
    } = await callerClient.auth.getUser();

    if (callerError || !caller) return json({ error: "Non autorisé" }, 401);

    const { data: isAdmin, error: roleError } = await callerClient.rpc("has_role", {
      _user_id: caller.id,
      _role: "admin",
    });

    if (roleError) return json({ error: roleError.message }, 500);
    if (!isAdmin) return json({ error: "Accès refusé" }, 403);

    const {
      listingId,
      ownerUserId,
      listingTitle,
    } = (await req.json()) as {
      listingId?: string;
      listingType?: string; // legacy, ignoré
      ownerUserId?: string | null;
      listingTitle?: string;
    };

    if (!listingId) {
      return json({ error: "listingId est requis" }, 400);
    }

    const adminClient = createClient(supabaseUrl, serviceRoleKey);

    // Lot A9 : suppression limitée aux annonces sans garde engagée.
    const { data: sit, error: sitError } = await adminClient
      .from("sits").select("status, title, user_id").eq("id", listingId).maybeSingle();
    if (sitError) return json({ error: sitError.message }, 500);
    if (!sit) return json({ error: "Annonce introuvable ou déjà supprimée" }, 404);
    if (!DELETABLE_STATUSES.includes(String(sit.status))) {
      return json({ error: "Suppression réservée aux annonces en ligne, brouillons, archivées ou expirées" }, 409);
    }

    // Lot ADM5 (audit admin du 18/10/2026) : trace écrite par le serveur
    // AVANT tout effacement, avec ce qui va disparaître. Sans trace, rien
    // n'est supprimé.
    const countOf = async (table: string, column: string, values: string | string[]) => {
      const q = adminClient.from(table).select("id", { count: "exact", head: true });
      const { count: n, error } = Array.isArray(values) ? await q.in(column, values) : await q.eq(column, values);
      if (error) throw error;
      return n ?? 0;
    };
    const { data: convRows, error: convCountError } = await adminClient
      .from("conversations").select("id").eq("sit_id", listingId);
    if (convCountError) return json({ error: convCountError.message }, 500);
    const convIds = (convRows ?? []).map((c) => c.id);
    let counts: Record<string, number>;
    try {
      counts = {
        reviews: await countOf("reviews", "sit_id", listingId),
        applications: await countOf("applications", "sit_id", listingId),
        conversations: convIds.length,
        messages: convIds.length ? await countOf("messages", "conversation_id", convIds) : 0,
      };
    } catch (e) {
      return json({ error: e instanceof Error ? e.message : "Lecture des dépendances impossible" }, 500);
    }
    const { error: logError } = await adminClient.from("admin_action_logs").insert({
      admin_id: caller.id,
      action: "listing_delete",
      target_type: "sit",
      target_id: listingId,
      metadata: {
        title: sit.title ?? listingTitle ?? null,
        owner_id: sit.user_id ?? ownerUserId ?? null,
        status: sit.status,
        ...counts,
      },
    });
    if (logError) {
      return json({ error: `Trace d'audit impossible, suppression annulée : ${logError.message}` }, 500);
    }

    // Cleanup dépendances liées à un sit
    const { error: reviewsError } = await adminClient.from("reviews").delete().eq("sit_id", listingId);
    if (reviewsError) return json({ error: reviewsError.message }, 500);

    const { error: badgesError } = await adminClient
      .from("badge_attributions")
      .delete()
      .eq("sit_id", listingId);
    if (badgesError) return json({ error: badgesError.message }, 500);

    const { error: highlightsError } = await adminClient
      .from("owner_highlights")
      .delete()
      .eq("sit_id", listingId);
    if (highlightsError) return json({ error: highlightsError.message }, 500);

    const { error: applicationsError } = await adminClient
      .from("applications")
      .delete()
      .eq("sit_id", listingId);
    if (applicationsError) return json({ error: applicationsError.message }, 500);

    const { data: conversations, error: conversationsSelectError } = await adminClient
      .from("conversations")
      .select("id")
      .eq("sit_id", listingId);
    if (conversationsSelectError) return json({ error: conversationsSelectError.message }, 500);

    const conversationIds = (conversations ?? []).map((c) => c.id);
    if (conversationIds.length > 0) {
      const { error: messagesError } = await adminClient
        .from("messages")
        .delete()
        .in("conversation_id", conversationIds);
      if (messagesError) return json({ error: messagesError.message }, 500);
    }

    const { error: conversationsDeleteError } = await adminClient
      .from("conversations")
      .delete()
      .eq("sit_id", listingId);
    if (conversationsDeleteError) return json({ error: conversationsDeleteError.message }, 500);

    const { error: listingDeleteError, count } = await adminClient
      .from("sits")
      .delete({ count: "exact" })
      .eq("id", listingId);

    if (listingDeleteError) return json({ error: listingDeleteError.message }, 500);
    if (!count) return json({ error: "Annonce introuvable ou déjà supprimée" }, 404);

    if (ownerUserId) {
      await adminClient.from("notifications").insert({
        user_id: ownerUserId,
        type: "listing_deleted",
        title: "Annonce supprimée",
        body: `Votre annonce "${listingTitle || "Sans titre"}" a été supprimée par un administrateur.`,
      });
    }

    return json({ success: true, deletedCount: count });
  } catch (error) {
    console.error("admin-delete-listing error", error);
    return json({ error: error instanceof Error ? error.message : "Erreur interne" }, 500);
  }
});
