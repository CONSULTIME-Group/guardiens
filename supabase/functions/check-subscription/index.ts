import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "npm:@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const logStep = (step: string, details?: unknown) => {
  console.log(`[CHECK-SUBSCRIPTION] ${step}${details ? ` - ${JSON.stringify(details)}` : ""}`);
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseClient = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    { auth: { persistSession: false } }
  );

  try {
    logStep("Function started");

    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (!stripeKey) throw new Error("STRIPE_SECRET_KEY is not set");

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("No authorization header");

    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userError } = await supabaseClient.auth.getUser(token);
    if (userError || !userData?.user?.email) {
      logStep("Auth failed, returning unsubscribed", { error: userError?.message || "no user" });
      return new Response(
        JSON.stringify({ subscribed: false, plan: null, subscription_end: null, has_yearly_access: false }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    const user = userData.user;
    logStep("User authenticated", { email: user.email });

    const stripe = new Stripe(stripeKey, { apiVersion: "2025-08-27.basil" });
    const customers = await stripe.customers.list({ email: user.email, limit: 1 });

    if (customers.data.length === 0) {
      logStep("No Stripe customer found");

      // Check for one-time payment (yearly prorata) via checkout sessions
      return new Response(
        JSON.stringify({
          subscribed: false,
          plan: null,
          subscription_end: null,
          has_yearly_access: false,
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const customerId = customers.data[0].id;
    logStep("Found customer", { customerId });

    // Check active subscriptions
    const subscriptions = await stripe.subscriptions.list({
      customer: customerId,
      status: "active",
      limit: 1,
    });

    if (subscriptions.data.length > 0) {
      const sub = subscriptions.data[0];
      // Source de vérité : metadata.formula_type (écrit par create-checkout-session)
      // Fallback `plan` (legacy) puis "monthly".
      const plan = sub.metadata?.formula_type || sub.metadata?.plan || "monthly";
      logStep("Active subscription found", { id: sub.id, plan });

      return new Response(
        JSON.stringify({
          subscribed: true,
          plan, // "monthly" | "annuel"
          subscription_end: new Date(sub.current_period_end * 1000).toISOString(),
          has_yearly_access: plan === "annuel",
          cancel_at_period_end: sub.cancel_at_period_end,
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Vérifie un paiement ponctuel one_shot (10 €) ou ancien yearly_prorata (legacy)
    const checkoutSessions = await stripe.checkout.sessions.list({
      customer: customerId,
      limit: 20,
    });

    const paidSession = checkoutSessions.data.find(
      (s) =>
        s.payment_status === "paid" &&
        s.mode === "payment" &&
        s.metadata?.user_id === user.id &&
        (s.metadata?.formula_type === "one_shot" ||
          s.metadata?.plan === "yearly_prorata"),
    );

    if (paidSession) {
      const created = new Date((paidSession.created ?? 0) * 1000);
      const isLegacyYearly = paidSession.metadata?.plan === "yearly_prorata";
      // one_shot = 30 jours d'accès. yearly_prorata legacy = jusqu'au 31/12/2026.
      const end = isLegacyYearly
        ? new Date(2026, 11, 31, 23, 59, 59)
        : new Date(created.getTime() + 30 * 86400000);
      const now = new Date();
      if (now < end) {
        const plan = isLegacyYearly ? "yearly_prorata" : "one_shot";
        logStep("One-time payment access active", { sessionId: paidSession.id, plan });
        return new Response(
          JSON.stringify({
            subscribed: true,
            plan,
            subscription_end: end.toISOString(),
            has_yearly_access: isLegacyYearly,
            cancel_at_period_end: false,
          }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }

    logStep("No active subscription or yearly access");
    return new Response(
      JSON.stringify({
        subscribed: false,
        plan: null,
        subscription_end: null,
        has_yearly_access: false,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    logStep("ERROR", { message: msg });
    return new Response(JSON.stringify({ error: msg }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
