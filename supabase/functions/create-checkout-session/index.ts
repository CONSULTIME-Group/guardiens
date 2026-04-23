import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "npm:@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const JUNE_14_2026_UTC = new Date("2026-06-14T00:00:00Z");

const PRICE_IDS = {
  monthly:  "price_1TPPawIR9gPuLbxmH9vC614f", // 6,99€/mois récurrent (prod_UOByEwqFtArM7W)
  one_shot: "price_1TJKw9EbGS9RIjqFjRSGwnsQ",
  prorata:  "price_1TJKwgEbGS9RIjqFBUfno6Lr",
};

const PRORATA_PRODUCT_ID = "prod_UHumwgYhIdF6BV";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // 1. Auth
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Non authentifié" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: authError } = await supabaseAdmin.auth.getUser(token);
    if (authError || !userData.user) {
      return new Response(JSON.stringify({ error: "Token invalide" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const user = userData.user;

    // 2. Parse body
    let formulaType = "monthly";
    try {
      const body = await req.json();
      if (body?.formula_type) {
        formulaType = body.formula_type;
      } else if (body?.lookup_key) {
        const lookupKey = body.lookup_key;
        if (lookupKey === "gardien_oneshot") formulaType = "one_shot";
        else if (lookupKey === "gardien_annuel_2026" || lookupKey === "gardien_prorata_2026") formulaType = "prorata";
        else formulaType = "monthly";
      }
    } catch {
      // No body — default monthly
    }

    if (!["monthly", "one_shot", "prorata"].includes(formulaType)) {
      return new Response(JSON.stringify({ error: "formula_type invalide" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log(`[create-checkout-session] formula_type=${formulaType}, user=${user.id}`);

    // 3. Profile data
    const { data: profile } = await supabaseAdmin
      .from("profiles")
      .select("is_founder, free_months_credit, referral_code")
      .eq("id", user.id)
      .single();

    const isFounder = profile?.is_founder ?? false;
    const freeMonths = profile?.free_months_credit ?? 0;

    // 4. Stripe customer
    const stripeKey =
      Deno.env.get("STRIPE_SECRET_KEY_FULL") ?? Deno.env.get("STRIPE_SECRET_KEY")!;

    // ─── Detect Stripe environment (Test vs Live) ───
    const stripeMode: "test" | "live" = stripeKey.startsWith("sk_live_")
      ? "live"
      : stripeKey.startsWith("sk_test_")
        ? "test"
        : "test";
    console.log(`[create-checkout-session] Stripe mode: ${stripeMode}`);

    const stripe = new Stripe(stripeKey, {
      apiVersion: "2025-08-27.basil",
    });

    // ─── Validate that the price required for this formula exists in the current Stripe env ───
    const priceIdToCheck =
      formulaType === "monthly" ? PRICE_IDS.monthly :
      formulaType === "one_shot" ? PRICE_IDS.one_shot :
      null; // prorata uses price_data with product, validated separately

    if (priceIdToCheck) {
      try {
        await stripe.prices.retrieve(priceIdToCheck);
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        console.error(`[create-checkout-session] Price ${priceIdToCheck} introuvable en mode ${stripeMode}:`, msg);
        return new Response(
          JSON.stringify({
            error: `Configuration Stripe invalide : le prix « ${priceIdToCheck } » n'existe pas dans l'environnement ${stripeMode === "live" ? "production (live)" : "test"}. Vérifiez que la clé STRIPE_SECRET_KEY correspond bien à l'environnement où ce prix a été créé.`,
            stripe_mode: stripeMode,
            missing_price_id: priceIdToCheck,
          }),
          {
            status: 500,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }
    } else if (formulaType === "prorata") {
      // Validate prorata product exists
      try {
        await stripe.products.retrieve(PRORATA_PRODUCT_ID);
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        console.error(`[create-checkout-session] Product ${PRORATA_PRODUCT_ID} introuvable en mode ${stripeMode}:`, msg);
        return new Response(
          JSON.stringify({
            error: `Configuration Stripe invalide : le produit prorata « ${PRORATA_PRODUCT_ID} » n'existe pas dans l'environnement ${stripeMode === "live" ? "production (live)" : "test"}.`,
            stripe_mode: stripeMode,
            missing_product_id: PRORATA_PRODUCT_ID,
          }),
          {
            status: 500,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }
    }

    const { data: existingSub } = await supabaseAdmin
      .from("subscriptions")
      .select("stripe_customer_id")
      .eq("user_id", user.id)
      .maybeSingle();

    let customerId = existingSub?.stripe_customer_id;
    if (!customerId) {
      const customers = await stripe.customers.list({ email: user.email, limit: 1 });
      if (customers.data.length > 0) {
        customerId = customers.data[0].id;
      } else {
        const customer = await stripe.customers.create({
          email: user.email,
          metadata: { user_id: user.id },
        });
        customerId = customer.id;
      }
    }

    const origin = req.headers.get("origin") || "https://guardiens.fr";

    // ─── MONTHLY ───
    if (formulaType === "monthly") {
      const now = new Date();
      let trialEnd: number;

      if (isFounder && now < JUNE_14_2026_UTC) {
        const endDate = new Date(JUNE_14_2026_UTC);
        if (freeMonths > 0) endDate.setMonth(endDate.getMonth() + freeMonths);
        trialEnd = Math.floor(endDate.getTime() / 1000);
      } else {
        const endDate = new Date(now);
        endDate.setDate(endDate.getDate() + 7);
        if (freeMonths > 0) endDate.setMonth(endDate.getMonth() + freeMonths);
        trialEnd = Math.floor(endDate.getTime() / 1000);
      }

      const session = await stripe.checkout.sessions.create({
        mode: "subscription",
        customer: customerId,
        line_items: [{ price: PRICE_IDS.monthly, quantity: 1 }],
        subscription_data: {
          trial_end: trialEnd,
          metadata: { user_id: user.id, formula_type: "monthly" },
        },
        payment_method_collection: "always",
        locale: "fr",
        success_url: `${origin}/mon-abonnement?success=true&formula=monthly`,
        cancel_url: `${origin}/mon-abonnement?cancelled=true`,
        metadata: { user_id: user.id, formula_type: "monthly" },
      });

      if (freeMonths > 0) {
        await supabaseAdmin.from("profiles").update({ free_months_credit: 0 }).eq("id", user.id);
      }

      return new Response(JSON.stringify({ url: session.url }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ─── ONE_SHOT ───
    if (formulaType === "one_shot") {
      const session = await stripe.checkout.sessions.create({
        mode: "payment",
        customer: customerId,
        line_items: [{ price: PRICE_IDS.one_shot, quantity: 1 }],
        locale: "fr",
        success_url: `${origin}/mon-abonnement?success=true&formula=one_shot`,
        cancel_url: `${origin}/mon-abonnement?cancelled=true`,
        metadata: {
          user_id: user.id,
          formula_type: "one_shot",
          free_months_credit: freeMonths.toString(),
        },
      });

      return new Response(JSON.stringify({ url: session.url }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ─── PRORATA ───
    if (formulaType === "prorata") {
      const now = new Date();
      const currentMonth = now.getMonth();
      const moisRestants = 11 - currentMonth;

      if (moisRestants <= 0) {
        return new Response(JSON.stringify({ error: "Formule 2026 non disponible en décembre" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const montantEuros = Math.round(moisRestants * 6.99 * 0.8 * 100) / 100;
      const montantCents = Math.round(montantEuros * 100);

      const session = await stripe.checkout.sessions.create({
        mode: "payment",
        customer: customerId,
        line_items: [{
          price_data: {
            currency: "eur",
            product: PRORATA_PRODUCT_ID,
            unit_amount: montantCents,
          },
          quantity: 1,
        }],
        locale: "fr",
        success_url: `${origin}/mon-abonnement?success=true&formula=prorata`,
        cancel_url: `${origin}/mon-abonnement?cancelled=true`,
        metadata: {
          user_id: user.id,
          formula_type: "prorata",
          mois_restants: moisRestants.toString(),
          montant_euros: montantEuros.toFixed(2),
          free_months_credit: freeMonths.toString(),
        },
      });

      return new Response(JSON.stringify({ url: session.url }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ error: "formula_type invalide" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("[create-checkout-session] ERROR:", err);
    return new Response(JSON.stringify({ error: err instanceof Error ? err.message : "Erreur serveur" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
