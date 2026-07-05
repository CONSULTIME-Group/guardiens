import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "npm:@supabase/supabase-js@2.57.2";
import { PRICING_IS_ACTIVE } from "../_shared/config-pricing.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const JULY_14_2026_UTC = new Date("2026-09-30T00:00:00Z");

const PRICE_IDS = {
  monthly:  "price_1TPPawIR9gPuLbxmH9vC614f", // 6,99 €/mois récurrent  (prod_UOByEwqFtArM7W)
  one_shot: "price_1TWDJpIR9gPuLbxmG5i5fZHR", // 10 € paiement unique   (prod_UVDlR3KnhFvfYP)
  annuel:   "price_1TWDLeIR9gPuLbxm0iCJDa58", // 65 €/an récurrent      (prod_UVDnMM7d5bbZ6o)
};

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
        else if (
          lookupKey === "gardien_annuel" ||
          lookupKey === "gardien_annuel_2026" ||
          lookupKey === "gardien_annuel_65" ||
          lookupKey === "gardien_prorata_2026"
        ) formulaType = "annuel";
        else formulaType = "monthly";
      }
    } catch {
      // No body — default monthly
    }

    if (!["monthly", "one_shot", "annuel"].includes(formulaType)) {
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
      formulaType === "monthly"  ? PRICE_IDS.monthly  :
      formulaType === "one_shot" ? PRICE_IDS.one_shot :
      formulaType === "annuel"   ? PRICE_IDS.annuel   :
      null;

    if (priceIdToCheck) {
      try {
        await stripe.prices.retrieve(priceIdToCheck);
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        console.error(`[create-checkout-session] Price ${priceIdToCheck} introuvable en mode ${stripeMode}:`, msg);
        return new Response(
          JSON.stringify({
            error: `Configuration Stripe invalide : le prix « ${priceIdToCheck} » n'existe pas dans l'environnement ${stripeMode === "live" ? "production (live)" : "test"}. Vérifiez que la clé STRIPE_SECRET_KEY correspond bien à l'environnement où ce prix a été créé.`,
            stripe_mode: stripeMode,
            missing_price_id: priceIdToCheck,
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
      // Pas de phase d'essai 7j (politique no-trial — cf. mem://features/no-trial-policy).
      // Le seul "trial Stripe" encore utilisé = accès gratuit Fondateur jusqu'au 14/07/2026
      // ou crédit de mois offerts (parrainage).
      let trialEnd: number | undefined = undefined;

      if (isFounder && now < JULY_14_2026_UTC) {
        const endDate = new Date(JULY_14_2026_UTC);
        if (freeMonths > 0) endDate.setMonth(endDate.getMonth() + freeMonths);
        trialEnd = Math.floor(endDate.getTime() / 1000);
      } else if (freeMonths > 0) {
        const endDate = new Date(now);
        endDate.setMonth(endDate.getMonth() + freeMonths);
        trialEnd = Math.floor(endDate.getTime() / 1000);
      }

      const session = await stripe.checkout.sessions.create({
        mode: "subscription",
        customer: customerId,
        line_items: [{ price: PRICE_IDS.monthly, quantity: 1 }],
        subscription_data: {
          ...(trialEnd ? { trial_end: trialEnd } : {}),
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

    // ─── ANNUEL (65 €/an récurrent) ───
    if (formulaType === "annuel") {
      const session = await stripe.checkout.sessions.create({
        mode: "subscription",
        customer: customerId,
        line_items: [{ price: PRICE_IDS.annuel, quantity: 1 }],
        subscription_data: {
          metadata: { user_id: user.id, formula_type: "annuel" },
        },
        payment_method_collection: "always",
        locale: "fr",
        success_url: `${origin}/mon-abonnement?success=true&formula=annuel`,
        cancel_url: `${origin}/mon-abonnement?cancelled=true`,
        metadata: {
          user_id: user.id,
          formula_type: "annuel",
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
