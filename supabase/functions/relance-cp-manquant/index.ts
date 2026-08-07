import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

/**
 * Page d'atterrissage dédiée : elle ne demande que le code postal et le rayon.
 * L'ancien lien pointait vers /profile?focus=postal_code, donc vers un
 * formulaire entier, ce qui tuait la conversion.
 */
const CTA_URL = "https://guardiens.fr/mon-secteur";

/** Plafond par défaut, surchargeable en base sans redéploiement. */
const DEFAULT_MAX_RELANCES = 3;

/**
 * Garde dure (07/08/2026) : jamais plus de 3 relances pour un même
 * destinataire, quelle que soit la valeur du drapeau en base. Au delà, la
 * relance devient de la pression, pas un service.
 */
const HARD_MAX_RELANCES = 3;

/**
 * Espacement croissant, en jours depuis l'inscription, avant la relance de
 * rang N + 1 (index = nombre de relances déjà reçues). Cadence hebdomadaire
 * du cron, donc les paliers sont calés sur des semaines pleines.
 */
const MIN_DAYS_BY_COUNT = [1, 7, 21];


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
    // Plafond configurable en base : feature_flags.key = 'cp_relance_max'.
    let maxRelances = DEFAULT_MAX_RELANCES;
    {
      const { data: flag } = await supabase
        .from("feature_flags")
        .select("value_int, enabled")
        .eq("key", "cp_relance_max")
        .maybeSingle();
      if (flag?.enabled && typeof flag.value_int === "number" && flag.value_int > 0) {
        maxRelances = flag.value_int;
      }
    }

    // Ciblage : uniquement les gardiens. Un propriétaire ne doit pas recevoir
    // une relance formulée pour un gardien.
    const { data: users, error: fetchError } = await supabase
      .from("profiles")
      .select("id, first_name, cp_relance_count, created_at, role")
      .or("postal_code.is.null,postal_code.eq.")
      .in("role", ["sitter", "both"])
      .lt("cp_relance_count", maxRelances)
      .limit(100);

    if (fetchError) {
      console.error("Fetch error:", fetchError.message);
      throw fetchError;
    }

    if (!users || users.length === 0) {
      console.log("relance-cp-manquant: 0 gardiens éligibles");
      return new Response(JSON.stringify({ processed: 0, maxRelances }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log(`relance-cp-manquant: ${users.length} candidats trouvés`);

    // Donnée concrète pour la relance de rang 2 : le nombre de gardes ouvertes.
    // Faute de code postal, on ne peut pas restreindre au département, donc on
    // annonce la couverture nationale, sans jamais surestimer.
    let openSitsCount = 0;
    {
      const todayIso = new Date().toISOString().slice(0, 10);
      const { count } = await supabase
        .from("sits")
        .select("id", { count: "exact", head: true })
        .eq("status", "published")
        .gte("end_date", todayIso);
      openSitsCount = count ?? 0;
    }

    const now = new Date();
    const processedIds: string[] = [];
    let emailsSent = 0;
    let errors = 0;

    for (const user of users) {
      try {
        const { data: authData, error: authError } =
          await supabase.auth.admin.getUserById(user.id);

        if (authError || !authData?.user) {
          console.warn(`Skip ${user.id}: auth lookup failed`);
          continue;
        }

        const authUser = authData.user;
        if (!authUser.email_confirmed_at) continue;

        const count = user.cp_relance_count ?? 0;
        if (count >= maxRelances) continue;

        const createdAt = new Date(user.created_at);
        const daysSince = (now.getTime() - createdAt.getTime()) / 86_400_000;
        const minDays = MIN_DAYS_BY_COUNT[Math.min(count, MIN_DAYS_BY_COUNT.length - 1)];
        if (daysSince < minDays) continue;

        const rang = count + 1;

        const { error: emailError } = await supabase.functions.invoke(
          "send-transactional-email",
          {
            body: {
              templateName: "relance-cp-manquant",
              recipientEmail: authUser.email,
              idempotencyKey: `relance-cp-${user.id}-${rang}`,
              templateData: {
                prenom: user.first_name || "",
                cta_url: CTA_URL,
                rang,
                open_sits_count: openSitsCount,
                open_sits_zone: "en France",
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
      `relance-cp-manquant terminé: ${emailsSent} emails envoyés, ${errors} erreurs, ${processedIds.length} profils mis à jour, plafond ${maxRelances}`
    );

    return new Response(
      JSON.stringify({
        eligible: users.length,
        processed: processedIds.length,
        emailsSent,
        errors,
        maxRelances,
        openSitsCount,
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
