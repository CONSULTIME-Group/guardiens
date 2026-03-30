import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "npm:@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const logStep = (step: string, details?: unknown) => {
  console.log(`[CREATE-CHECKOUT] ${step}${details ? ` - ${JSON.stringify(details)}` : ""}`);
};

const calculateYearlyProrata = (): { amount: number; months: number } => {
  const now = new Date();
  const endOfYear = new Date(2026, 11, 31);
  const months = Math.ceil(
    (endOfYear.getTime() - now.getTime()) / (1000 * 60 * 60 * 24 * 30.44)
  );
  const fullPrice = months * 9;
  const discounted = Math.round(fullPrice * 0.8);
  return { amount: discounted, months };
};

/**
 * Ensures the Guardiens monthly product+price exist in Stripe.
 * Returns the recurring price ID.
 */
async function ensureMonthlyPrice(stripe: Stripe): Promise<string> {
  // Search for existing product by metadata
  const products = await stripe.products.list({ limit: 100 });
  let product = products.data.find(
    (p) => p.metadata?.guardiens_type === "monthly_9eur"
  );

  if (!product) {
    product = await stripe.products.create({
      name: "Guardiens — Abonnement mensuel",
      description: "Accès complet Guardiens pour les gardiens. 9€/mois sans engagement.",
      metadata: { guardiens_type: "monthly_9eur" },
    });
    logStep("Created monthly product", { id: product.id });
  }

  // Check for existing active price
  const prices = await stripe.prices.list({
    product: product.id,
    active: true,
    limit: 10,
  });
  const monthlyPrice = prices.data.find(
    (p) =>
      p.unit_amount === 900 &&
      p.currency === "eur" &&
      p.recurring?.interval === "month"
  );

  if (monthlyPrice) return monthlyPrice.id;

  const newPrice = await stripe.prices.create({
    product: product.id,
    unit_amount: 900,
    currency: "eur",
    recurring: { interval: "month" },
  });
  logStep("Created monthly price", { id: newPrice.id });
  return newPrice.id;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseClient = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_ANON_KEY") ?? ""
  );

  try {
    logStep("Function started");

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("No authorization header");

    const token = authHeader.replace("Bearer ", "");
    const { data } = await supabaseClient.auth.getUser(token);
    const user = data.user;
    if (!user?.email) throw new Error("User not authenticated");
    logStep("User authenticated", { email: user.email });

    const { type } = await req.json();
    if (!type || !["monthly", "yearly_prorata"].includes(type)) {
      throw new Error("Invalid type. Must be 'monthly' or 'yearly_prorata'");
    }
    logStep("Checkout type", { type });

    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", {
      apiVersion: "2025-08-27.basil",
    });

    // Find or skip creating customer
    const customers = await stripe.customers.list({ email: user.email, limit: 1 });
    let customerId: string | undefined;
    if (customers.data.length > 0) {
      customerId = customers.data[0].id;
    }

    const origin = req.headers.get("origin") || "https://guardiens.lovable.app";

    if (type === "monthly") {
      const priceId = await ensureMonthlyPrice(stripe);
      logStep("Using monthly price", { priceId });

      const session = await stripe.checkout.sessions.create({
        customer: customerId,
        customer_email: customerId ? undefined : user.email,
        line_items: [{ price: priceId, quantity: 1 }],
        mode: "subscription",
        success_url: `${origin}/mon-abonnement?success=true`,
        cancel_url: `${origin}/mon-abonnement?cancelled=true`,
        metadata: { user_id: user.id, plan: "monthly" },
        subscription_data: {
          metadata: { user_id: user.id, plan: "monthly" },
        },
      });

      logStep("Monthly checkout session created", { url: session.url });
      return new Response(JSON.stringify({ url: session.url }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // yearly_prorata — one-time payment for rest of 2026
    const { amount, months } = calculateYearlyProrata();
    logStep("Yearly prorata calculation", { amount, months });

    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      customer_email: customerId ? undefined : user.email,
      line_items: [
        {
          price_data: {
            currency: "eur",
            unit_amount: amount * 100, // cents
            product_data: {
              name: `Guardiens — Accès 2026 (${months} mois restants)`,
              description: `Accès complet jusqu'au 31 décembre 2026. -20% vs mensuel.`,
            },
          },
          quantity: 1,
        },
      ],
      mode: "payment",
      success_url: `${origin}/mon-abonnement?success=true`,
      cancel_url: `${origin}/mon-abonnement?cancelled=true`,
      metadata: { user_id: user.id, plan: "yearly_prorata", months_covered: String(months) },
    });

    logStep("Yearly prorata checkout session created", { url: session.url, amount });
    return new Response(JSON.stringify({ url: session.url }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    logStep("ERROR", { message: msg });
    return new Response(JSON.stringify({ error: msg }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
