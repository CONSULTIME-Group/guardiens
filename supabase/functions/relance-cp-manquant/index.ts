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
    // 1. Fetch users missing postal_code, with relance cadence filter
    const { data: users, error: fetchError } = await supabase
      .from("profiles")
      .select("id, first_name, cp_relance_count, created_at")
      .or("postal_code.is.null,postal_code.eq.")
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

    console.log(`relance-cp-manquant: ${users.length} candidats trouvés`);

    const now = new Date();
    const processedIds: string[] = [];
    let emailsSent = 0;
    let errors = 0;

    for (const user of users) {
      try {
        // Get auth user for email + email_confirmed_at
        const { data: authData, error: authError } =
          await supabase.auth.admin.getUserById(user.id);

        if (authError || !authData?.user) {
          console.warn(`Skip ${user.id}: auth lookup failed`);
          continue;
        }

        const authUser = authData.user;
        if (!authUser.email_confirmed_at) continue;

        // Apply timing rules
        const count = user.cp_relance_count ?? 0;
        const createdAt = new Date(user.created_at);
        const daysSince =
          (now.getTime() - createdAt.getTime()) / 86_400_000;

        if (count === 0 && daysSince < 1) continue;
        if (count === 1 && daysSince < 3) continue;
        if (count === 2 && daysSince < 7) continue;
        if (count >= 3) continue;

        // Send email via send-transactional-email
        const { error: emailError } = await supabase.functions.invoke(
          "send-transactional-email",
          {
            body: {
              templateName: "relance-cp-manquant",
              recipientEmail: authUser.email,
              idempotencyKey: `relance-cp-${user.id}-${count + 1}`,
              templateData: {
                prenom: user.first_name || "",
                cta_url:
                  "https://guardiens.fr/profile?focus=postal_code",
              },
            },
          }
        );

        if (emailError) {
          console.error(`Email error ${user.id}:`, emailError.message);
          errors++;
          continue;
        }

        processedIds.push(user.id);
        emailsSent++;
      } catch (err) {
        console.error(`Error user ${user.id}:`, err);
        errors++;
      }
    }

    // 3. Batch-increment relance counters
    if (processedIds.length > 0) {
      const { error: rpcError } = await supabase.rpc(
        "increment_cp_relance",
        { user_ids: processedIds }
      );
      if (rpcError) {
        console.error("RPC increment error:", rpcError.message);
      }
    }

    console.log(
      `relance-cp-manquant terminé: ${emailsSent} emails envoyés, ${errors} erreurs, ${processedIds.length} profils mis à jour`
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
    console.error("relance-cp-manquant fatal:", msg);
    return new Response(JSON.stringify({ error: msg }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
