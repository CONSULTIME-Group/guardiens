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

type ListingType = "sits" | "long_stays";

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
      listingType,
      ownerUserId,
      listingTitle,
    } = (await req.json()) as {
      listingId?: string;
      listingType?: ListingType;
      ownerUserId?: string | null;
      listingTitle?: string;
    };

    if (!listingId || !listingType || !["sits", "long_stays"].includes(listingType)) {
      return json({ error: "listingId et listingType sont requis" }, 400);
    }

    const adminClient = createClient(supabaseUrl, serviceRoleKey);
    const isSit = listingType === "sits";
    const listingTable = isSit ? "sits" : "long_stays";
    const applicationsTable = isSit ? "applications" : "long_stay_applications";
    const applicationsFk = isSit ? "sit_id" : "long_stay_id";
    const conversationsFk = isSit ? "sit_id" : "long_stay_id";

    if (isSit) {
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
    }

    const { error: applicationsError } = await adminClient
      .from(applicationsTable)
      .delete()
      .eq(applicationsFk, listingId);
    if (applicationsError) return json({ error: applicationsError.message }, 500);

    const { data: conversations, error: conversationsSelectError } = await adminClient
      .from("conversations")
      .select("id")
      .eq(conversationsFk, listingId);
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
      .eq(conversationsFk, listingId);
    if (conversationsDeleteError) return json({ error: conversationsDeleteError.message }, 500);

    const { error: listingDeleteError, count } = await adminClient
      .from(listingTable)
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
