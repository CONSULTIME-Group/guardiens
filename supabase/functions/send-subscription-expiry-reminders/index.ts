// Cron quotidien : détecte les abonnements actifs qui expirent dans ~30 ou ~7
// jours et envoie l'email transactionnel correspondant. Idempotent grâce aux
// flags `expiry_30d_sent` / `expiry_7d_sent` posés sur `subscriptions`.
//
// Logique :
//   - J-30 : abonnements `active` dont `expires_at` tombe dans [29, 31[ jours
//     ET `expiry_30d_sent = false`
//   - J-7 : idem pour [6, 8[ jours ET `expiry_7d_sent = false`
//
// Les deux templates `subscription-expires-30d` / `-7d` reçoivent
// `{ firstName, renewalDate }` (date FR formatée côté template).

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface SubscriptionRow {
  id: string;
  user_id: string;
  expires_at: string;
  plan: string | null;
  expiry_30d_sent: boolean;
  expiry_7d_sent: boolean;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const supabase = createClient(supabaseUrl, supabaseKey);

  const now = Date.now();
  const day = 24 * 60 * 60 * 1000;

  // Fenêtres : on prend ±1 jour autour de la cible pour absorber les retards
  // de cron (si la fonction n'a pas tourné un jour, on rattrape le lendemain).
  const win30Lo = new Date(now + 29 * day).toISOString();
  const win30Hi = new Date(now + 31 * day).toISOString();
  const win7Lo = new Date(now + 6 * day).toISOString();
  const win7Hi = new Date(now + 8 * day).toISOString();

  let sent30 = 0;
  let sent7 = 0;
  const errors: string[] = [];

  // ---- J-30 ----
  const { data: subs30 } = await supabase
    .from("subscriptions")
    .select("id, user_id, expires_at, plan, expiry_30d_sent, expiry_7d_sent")
    .eq("status", "active")
    .eq("expiry_30d_sent", false)
    .gte("expires_at", win30Lo)
    .lt("expires_at", win30Hi);

  for (const sub of (subs30 ?? []) as SubscriptionRow[]) {
    const ok = await sendReminder(supabase, sub, "subscription-expires-30d");
    if (ok) {
      await supabase
        .from("subscriptions")
        .update({ expiry_30d_sent: true })
        .eq("id", sub.id);
      sent30++;
    } else {
      errors.push(`30d:${sub.id}`);
    }
  }

  // ---- J-7 ----
  const { data: subs7 } = await supabase
    .from("subscriptions")
    .select("id, user_id, expires_at, plan, expiry_30d_sent, expiry_7d_sent")
    .eq("status", "active")
    .eq("expiry_7d_sent", false)
    .gte("expires_at", win7Lo)
    .lt("expires_at", win7Hi);

  for (const sub of (subs7 ?? []) as SubscriptionRow[]) {
    const ok = await sendReminder(supabase, sub, "subscription-expires-7d");
    if (ok) {
      await supabase
        .from("subscriptions")
        .update({ expiry_7d_sent: true })
        .eq("id", sub.id);
      sent7++;
    } else {
      errors.push(`7d:${sub.id}`);
    }
  }

  return new Response(
    JSON.stringify({ sent30, sent7, errors }),
    { headers: { ...corsHeaders, "Content-Type": "application/json" } },
  );
});

async function sendReminder(
  supabase: ReturnType<typeof createClient>,
  sub: SubscriptionRow,
  templateName: "subscription-expires-30d" | "subscription-expires-7d",
): Promise<boolean> {
  // Récupère prénom + email
  const { data: profile } = await supabase
    .from("profiles")
    .select("first_name, email")
    .eq("id", sub.user_id)
    .maybeSingle();

  let email = (profile as { email?: string } | null)?.email ?? null;

  if (!email) {
    // Fallback via RPC sécurisée si l'email n'est pas miroitée sur profiles
    const { data: rpcEmail } = await supabase
      .rpc("get_user_email_for_notification" as any, { target_user_id: sub.user_id });
    email = typeof rpcEmail === "string" ? rpcEmail : null;
  }

  if (!email) {
    console.warn("[expiry-reminders] no email", { user_id: sub.user_id, templateName });
    return false;
  }

  const { error } = await supabase.functions.invoke("send-transactional-email", {
    body: {
      templateName,
      recipientEmail: email,
      idempotencyKey: `${templateName}-${sub.id}`,
      templateData: {
        firstName: (profile as { first_name?: string } | null)?.first_name ?? "",
        renewalDate: sub.expires_at,
        plan: sub.plan ?? "",
      },
    },
  });

  if (error) {
    console.error("[expiry-reminders] invoke error", { templateName, sub: sub.id, error });
    return false;
  }
  return true;
}
