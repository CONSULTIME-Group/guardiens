import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "npm:@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const JUNE_14_2026_UTC = new Date("2026-06-14T00:00:00Z");

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
    let lookupKey = "gardien_mensuel";
    try {
      const body = await req.json();
      if (body?.formula_type) {
        formulaType = body.formula_type;
      } else if (body?.lookup_key) {
        // Backwards compatibility
        lookupKey = body.lookup_key;
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
    const stripe = new Stripe(stripeKey, {
      apiVersion: "2025-08-27.basil",
    });

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
    const isTestStripeKey = stripeKey.startsWith("sk_test_") || stripeKey.startsWith("rk_test_");

    const resolveActivePrice = async (
      lookupKeys: string[],
      fallbackPriceId?: string,
    ) => {
      const prices = await stripe.prices.list({
        lookup_keys: lookupKeys,
        active: true,
        limit: Math.max(lookupKeys.length, 1),
      });

      if (prices.data.length > 0) {
        return (
          prices.data.find((price) =>
            price.lookup_key ? lookupKeys.includes(price.lookup_key) : false,
          ) ?? prices.data[0]
        );
      }

      if (isTestStripeKey && fallbackPriceId) {
        console.warn(
          `[create-checkout-session] lookup_keys introuvables (${lookupKeys.join(", ")}), fallback sur ${fallbackPriceId}`,
        );
        const fallbackPrice = await stripe.prices.retrieve(fallbackPriceId);
        if (!("deleted" in fallbackPrice) && fallbackPrice.active) {
          return fallbackPrice;
        }
      }

      return null;
    };

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

      const monthlyPrice = await resolveActivePrice(
        ["gardien_mensuel"],
        "price_1TIPaZIR9gPuLbxmwV01tgwa",
      );
      if (!monthlyPrice) {
        return new Response(JSON.stringify({ error: "Prix gardien_mensuel introuvable" }), {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const session = await stripe.checkout.sessions.create({
        mode: "subscription",
        customer: customerId,
        line_items: [{ price: monthlyPrice.id, quantity: 1 }],
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
      const oneShotPrice = await resolveActivePrice(
        ["gardien_oneshot", "gardien_one_shot"],
        "price_1TJHDhIR9gPuLbxmKScyHEoq",
      );
      if (!oneShotPrice) {
        return new Response(JSON.stringify({ error: "Prix gardien_oneshot introuvable" }), {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const session = await stripe.checkout.sessions.create({
        mode: "payment",
        customer: customerId,
        line_items: [{ price: oneShotPrice.id, quantity: 1 }],
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

      const montantEuros = Math.ceil(moisRestants * 9 * 0.8);
      const montantCents = montantEuros * 100;

      const prorataPrice = await resolveActivePrice(
        ["gardien_prorata_2026"],
        "price_1TJHGSIR9gPuLbxmWVvgB2rQ",
      );
      if (!prorataPrice) {
        return new Response(JSON.stringify({ error: "Prix gardien_prorata_2026 introuvable" }), {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const session = await stripe.checkout.sessions.create({
        mode: "payment",
        customer: customerId,
        line_items: [{
          price_data: {
            currency: "eur",
            product: prorataPrice.product as string,
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
          montant_euros: montantEuros.toString(),
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
