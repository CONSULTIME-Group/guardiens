import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "npm:@supabase/supabase-js@2.57.2";

Deno.serve(async (req) => {
  const signature = req.headers.get("stripe-signature");
  const body = await req.text();

  let event: Stripe.Event;

  try {
    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY_FULL") ?? Deno.env.get("STRIPE_SECRET_KEY")!, {
      apiVersion: "2025-08-27.basil",
    });
    event = await stripe.webhooks.constructEventAsync(
      body,
      signature!,
      Deno.env.get("STRIPE_WEBHOOK_SECRET")!
    );
  } catch (err) {
    console.error("Webhook signature invalide:", err);
    return new Response("Webhook signature invalide", { status: 400 });
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  // Helper to send subscription-expired email (idempotent via key)
  const sendExpiredEmail = async (user_id: string, marker: string) => {
    try {
      const { data: userData } = await supabase.auth.admin.getUserById(user_id);
      const recipientEmail = userData?.user?.email;
      if (!recipientEmail) {
        console.warn(`[stripe-webhook] No email found for user ${user_id}, skipping expired email`);
        return;
      }
      const _steRes = await fetch(`${Deno.env.get('SUPABASE_URL')}/functions/v1/send-transactional-email`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}` },
        body: JSON.stringify({
          templateName: "subscription-expired",
          recipientEmail,
          idempotencyKey: `subscription-expired-${user_id}-${marker}`,
        }),
      });
      const _steTxt1 = _steRes.ok ? '' : await _steRes.text().catch(() => '');
      if (!_steRes.ok) console.error('send-transactional-email failed', _steRes.status, _steTxt1);
      const mailError = _steRes.ok ? null : new Error(`send-transactional-email ${_steRes.status}: ${_steTxt1}`);
      if (mailError) console.error("[stripe-webhook] send-transactional-email error:", mailError);
    } catch (e) {
      console.error("[stripe-webhook] sendExpiredEmail failed:", e);
    }
  };

  try {
    switch (event.type) {
      case "customer.subscription.created":
      case "customer.subscription.updated": {
        const sub = event.data.object as Stripe.Subscription;
        const user_id = sub.metadata?.user_id;
        if (!user_id) break;

        // Map Stripe status to our status
        let statut: string;
        switch (sub.status) {
          case "trialing": statut = "trial"; break;
          case "active": statut = "active"; break;
          case "past_due": statut = "past_due"; break;
          case "paused": statut = "trial"; break; // Keep access on pause
          case "canceled": statut = "expired"; break;
          default: statut = "expired"; break;
        }

        // Détermination du plan : priorité au price.id (source de vérité Stripe),
        // fallback metadata.formula_type, puis "monthly".
        // Mapping miroir de PRICE_IDS dans create-checkout-session.
        const PRICE_TO_PLAN: Record<string, string> = {
          "price_1TPPawIR9gPuLbxmH9vC614f": "monthly", // 6,99 €/mois
          "price_1TWDLeIR9gPuLbxm0iCJDa58": "annuel",  // 65 €/an
        };

        const priceId = sub.items?.data?.[0]?.price?.id;
        const planFromPrice = priceId ? PRICE_TO_PLAN[priceId] : undefined;

        const rawFormula = sub.metadata?.formula_type || sub.metadata?.plan || "monthly";
        const planFromMetadata =
          rawFormula === "yearly_prorata" ? "prorata" : rawFormula;

        const normalizedPlan = planFromPrice ?? planFromMetadata;

        if (priceId && !planFromPrice) {
          console.warn(
            `[stripe-webhook] price.id ${priceId} non mappé dans PRICE_TO_PLAN, fallback metadata=${planFromMetadata}`
          );
        }

        await supabase.from("subscriptions").upsert({
          user_id,
          stripe_subscription_id: sub.id,
          stripe_customer_id: sub.customer as string,
          status: statut,
          plan: normalizedPlan,
          subscription_type: normalizedPlan,
          trial_end: sub.trial_end ? new Date(sub.trial_end * 1000).toISOString() : null,
          current_period_start: new Date(sub.current_period_start * 1000).toISOString(),
          expires_at: new Date(sub.current_period_end * 1000).toISOString(),
          started_at: new Date().toISOString(),
        }, { onConflict: "user_id" });

        // Send expired email if subscription transitioned to expired
        if (statut === "expired") {
          await sendExpiredEmail(user_id, `sub-${sub.id}-${sub.current_period_end}`);
        }
        break;
      }

      case "customer.subscription.deleted": {
        const sub = event.data.object as Stripe.Subscription;
        const user_id = sub.metadata?.user_id;
        if (!user_id) break;
        await supabase.from("subscriptions").upsert({
          user_id,
          status: "expired",
          stripe_subscription_id: sub.id,
          started_at: new Date().toISOString(),
        }, { onConflict: "user_id" });

        await sendExpiredEmail(user_id, `deleted-${sub.id}`);
        break;
      }

      case "invoice.payment_succeeded": {
        const invoice = event.data.object as Stripe.Invoice;
        const sub_id = invoice.subscription as string;
        if (!sub_id) break;
        await supabase.from("subscriptions")
          .update({ status: "active" })
          .eq("stripe_subscription_id", sub_id);
        break;
      }

      case "invoice.payment_failed": {
        const invoice = event.data.object as Stripe.Invoice;
        const sub_id = invoice.subscription as string;
        if (!sub_id) break;
        await supabase.from("subscriptions")
          .update({ status: "past_due" })
          .eq("stripe_subscription_id", sub_id);
        break;
      }

      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        const userId = session.metadata?.user_id;
        const formulaType = session.metadata?.formula_type;
        const freeMonthsCredit = parseInt(session.metadata?.free_months_credit ?? "0");

        // Les abonnements récurrents (monthly, annuel) sont gérés via
        // customer.subscription.created / .updated. Ici on ne traite que les
        // paiements uniques (one_shot — 10 €, 30 jours d'accès).
        if (!userId || formulaType !== "one_shot") break;

        console.log(`[stripe-webhook] checkout.session.completed: userId=${userId}, formula=${formulaType}`);

        const now = new Date();
        const startDate = now.toISOString();
        const end = new Date(now);
        end.setDate(end.getDate() + 30);
        if (freeMonthsCredit > 0) end.setMonth(end.getMonth() + freeMonthsCredit);
        const endDate = end.toISOString();

        // Upsert subscription
        await supabase.from("subscriptions").upsert({
          user_id: userId,
          subscription_type: "one_shot",
          status: "active",
          plan: "one_shot",
          stripe_customer_id: session.customer as string,
          stripe_subscription_id: null,
          trial_end: null,
          current_period_start: startDate,
          expires_at: endDate,
          started_at: startDate,
        }, { onConflict: "user_id" });

        // Decrement free months credit if used
        if (freeMonthsCredit > 0) {
          await supabase.from("profiles").update({ free_months_credit: 0 }).eq("id", userId);
        }

        // Apply referral reward
        try {
          await supabase.rpc("apply_referral_reward", { p_referred_id: userId });
        } catch (e) {
          console.error("Referral reward error:", e);
        }

        break;
      }
    }
  } catch (err) {
    console.error("Erreur traitement webhook:", err);
    return new Response("Erreur serveur", { status: 500 });
  }

  return new Response(JSON.stringify({ received: true }), {
    headers: { "Content-Type": "application/json" },
    status: 200,
  });
});
