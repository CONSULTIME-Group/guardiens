import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    { auth: { persistSession: false } }
  );

  try {
    // 1. Fetch users missing postal_code with confirmed email, respecting relance cadence
    const { data: users, error: fetchError } = await supabase
      .from("profiles")
      .select("id, first_name")
      .is("postal_code", null)
      .lt("cp_relance_count", 3)
      .limit(100);

    if (fetchError) {
      console.error("Fetch error:", fetchError.message);
      throw fetchError;
    }

    if (!users || users.length === 0) {
      console.log("relance-cp-manquant: 0 users éligibles");
      return new Response(JSON.stringify({ processed: 0 }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // We need to also get auth emails — query auth.users via admin
    // Since we can't join profiles to auth.users in the client, we'll use a different approach
    // Get the user IDs first, then fetch their emails from auth
    const userIds = users.map((u) => u.id);

    // Use the admin API to get emails and filter by email_confirmed_at + timing
    const now = new Date();
    const processedIds: string[] = [];
    let emailsSent = 0;
    let errors = 0;

    for (const user of users) {
      try {
        // Get auth user to check email_confirmed_at and created_at
        const { data: authData, error: authError } = await supabase.auth.admin.getUserById(user.id);

        if (authError || !authData?.user) {
          console.warn(`Skip user ${user.id}: auth lookup failed`);
          continue;
        }

        const authUser = authData.user;

        // Check email confirmed
        if (!authUser.email_confirmed_at) continue;

        // Get current relance count from profiles
        const { data: profileData } = await supabase
          .from("profiles")
          .select("cp_relance_count, created_at")
          .eq("id", user.id)
          .single();

        if (!profileData) continue;

        const count = profileData.cp_relance_count ?? 0;
        const createdAt = new Date(profileData.created_at);
        const daysSinceCreation = (now.getTime() - createdAt.getTime()) / 86400000;

        // Apply timing rules
        if (count === 0 && daysSinceCreation < 1) continue;
        if (count === 1 && daysSinceCreation < 3) continue;
        if (count === 2 && daysSinceCreation < 7) continue;
        if (count >= 3) continue;

        // Send email
        const { error: emailError } = await supabase.functions.invoke(
          "send-transactional-email",
          {
            body: {
              templateName: "relance-cp-manquant",
              recipientEmail: authUser.email,
              idempotencyKey: `relance-cp-${user.id}-${count + 1}`,
              templateData: {
                prenom: user.first_name || "",
                cta_url: "https://guardiens.fr/mon-profil?focus=postal_code",
              },
            },
          }
        );

        if (emailError) {
          console.error(`Email error for ${user.id}:`, emailError.message);
          errors++;
          continue;
        }

        processedIds.push(user.id);
        emailsSent++;
      } catch (err) {
        console.error(`Error processing user ${user.id}:`, err);
        errors++;
      }
    }

    // 3. Update relance counts for all processed users
    if (processedIds.length > 0) {
      const { error: updateError } = await supabase.rpc("increment_cp_relance", {
        user_ids: processedIds,
      });

      // Fallback: update one by one if RPC doesn't exist
      if (updateError) {
        console.warn("RPC increment_cp_relance not found, updating individually");
        for (const uid of processedIds) {
          await supabase
            .from("profiles")
            .update({
              cp_relance_count: (users.find((u) => u.id === uid) as any)?.cp_relance_count
                ? undefined
                : undefined,
              last_cp_relance_at: new Date().toISOString(),
            })
            .eq("id", uid);

          // Increment with raw SQL isn't possible via client, so re-fetch and set
          const { data: current } = await supabase
            .from("profiles")
            .select("cp_relance_count")
            .eq("id", uid)
            .single();

          if (current) {
            await supabase
              .from("profiles")
              .update({
                cp_relance_count: (current.cp_relance_count ?? 0) + 1,
                last_cp_relance_at: new Date().toISOString(),
              })
              .eq("id", uid);
          }
        }
      }
    }

    console.log(
      `relance-cp-manquant: ${users.length} éligibles, ${emailsSent} emails envoyés, ${errors} erreurs`
    );

    return new Response(
      JSON.stringify({
        eligible: users.length,
        processed: processedIds.length,
        emailsSent,
        errors,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    console.error("relance-cp-manquant fatal error:", msg);
    return new Response(JSON.stringify({ error: msg }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
