import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "npm:@supabase/supabase-js@2.57.2";

Deno.serve(async (req) => {
  const signature = req.headers.get("stripe-signature");
  const body = await req.text();

  let event: Stripe.Event;

  try {
    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY")!, {
      apiVersion: "2025-08-27.basil",
    });
    event = stripe.webhooks.constructEvent(
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

  try {
    switch (event.type) {
      case "customer.subscription.created":
      case "customer.subscription.updated": {
        const sub = event.data.object as Stripe.Subscription;
        const user_id = sub.metadata?.user_id;
        if (!user_id) break;
        await supabase.from("abonnements").upsert({
          user_id,
          stripe_subscription_id: sub.id,
          stripe_customer_id: sub.customer as string,
          statut: sub.status === "trialing" ? "trial" : sub.status === "active" ? "active" : "expired",
          trial_end: sub.trial_end ? new Date(sub.trial_end * 1000).toISOString() : null,
          current_period_end: new Date(sub.current_period_end * 1000).toISOString(),
          updated_at: new Date().toISOString(),
        }, { onConflict: "user_id" });
        break;
      }
      case "customer.subscription.deleted": {
        const sub = event.data.object as Stripe.Subscription;
        const user_id = sub.metadata?.user_id;
        if (!user_id) break;
        await supabase.from("abonnements").upsert({
          user_id,
          statut: "expired",
          updated_at: new Date().toISOString(),
        }, { onConflict: "user_id" });
        break;
      }
      case "invoice.payment_succeeded": {
        const invoice = event.data.object as Stripe.Invoice;
        const sub_id = invoice.subscription as string;
        if (!sub_id) break;
        await supabase.from("abonnements")
          .update({ statut: "active", updated_at: new Date().toISOString() })
          .eq("stripe_subscription_id", sub_id);
        break;
      }
      case "invoice.payment_failed": {
        const invoice = event.data.object as Stripe.Invoice;
        const sub_id = invoice.subscription as string;
        if (!sub_id) break;
        await supabase.from("abonnements")
          .update({ statut: "past_due", updated_at: new Date().toISOString() })
          .eq("stripe_subscription_id", sub_id);
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
