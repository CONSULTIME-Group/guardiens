// Webhook Resend — reçoit les événements email.delivered, email.opened,
// email.clicked, email.bounced, email.complained et met à jour mass_email_sends.
//
// Configuration Resend dashboard :
//   URL : https://erhccyqevdyevpyctsjj.supabase.co/functions/v1/resend-webhook
//   Events : email.delivered, email.opened, email.clicked, email.bounced, email.complained
//   Signing secret : à stocker dans la variable d'env RESEND_WEBHOOK_SECRET (Svix)
//
// Vérification de signature : Resend signe avec Svix (svix-id, svix-timestamp, svix-signature).
// On vérifie via HMAC-SHA256.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import { createHmac } from "node:crypto";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, svix-id, svix-timestamp, svix-signature",
};

interface ResendEvent {
  type: string; // "email.opened", "email.clicked", etc.
  created_at: string;
  data: {
    email_id: string;
    to: string[];
    click?: { link: string; timestamp: string };
    bounce?: { message: string; subType?: string };
    [key: string]: unknown;
  };
}

function verifySignature(
  secret: string,
  svixId: string,
  svixTimestamp: string,
  body: string,
  svixSignature: string,
): boolean {
  try {
    // Le secret Svix est préfixé "whsec_" + base64
    const cleanSecret = secret.startsWith("whsec_") ? secret.slice(6) : secret;
    const secretBytes = Uint8Array.from(atob(cleanSecret), (c) => c.charCodeAt(0));
    const toSign = `${svixId}.${svixTimestamp}.${body}`;
    const hmac = createHmac("sha256", secretBytes);
    hmac.update(toSign);
    const expected = hmac.digest("base64");
    // svixSignature = "v1,xxx v1,yyy" — on accepte si l'une matche
    const sigs = svixSignature.split(" ").map((s) => s.split(",")[1]);
    return sigs.includes(expected);
  } catch (e) {
    console.error("Signature verification error:", e);
    return false;
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }
  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405, headers: corsHeaders });
  }

  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const WEBHOOK_SECRET = Deno.env.get("RESEND_WEBHOOK_SECRET");

    const rawBody = await req.text();

    // Vérification signature Svix — MANDATORY. Sans secret, tout appelant pourrait
    // corrompre les métriques de délivrabilité (bounces / complaints / opens).
    if (!WEBHOOK_SECRET) {
      console.error("RESEND_WEBHOOK_SECRET is not configured");
      return new Response(
        JSON.stringify({ error: "Webhook secret not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }
    const svixId = req.headers.get("svix-id");
    const svixTimestamp = req.headers.get("svix-timestamp");
    const svixSignature = req.headers.get("svix-signature");
    if (!svixId || !svixTimestamp || !svixSignature) {
      console.warn("Missing Svix headers");
      return new Response(JSON.stringify({ error: "Missing signature headers" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (!verifySignature(WEBHOOK_SECRET, svixId, svixTimestamp, rawBody, svixSignature)) {
      console.warn("Invalid signature");
      return new Response(JSON.stringify({ error: "Invalid signature" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const event: ResendEvent = JSON.parse(rawBody);
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    const emailId = event.data?.email_id;
    if (!emailId) {
      return new Response(JSON.stringify({ skipped: "no email_id" }), {
        status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // === 1) Update email_send_log (transactional emails tracked by resend_id) ===
    // We update ALL rows matching this resend_id (typically one with status='sent').
    // Strategy: read latest sent row, compute incremental update, write back.
    const { data: logRow } = await supabase
      .from("email_send_log")
      .select("id, open_count, click_count, first_opened_at, first_clicked_at")
      .eq("resend_id", emailId)
      .eq("status", "sent")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (logRow) {
      const tNow = event.created_at || new Date().toISOString();
      const logUpdate: Record<string, unknown> = {};
      switch (event.type) {
        case "email.delivered":
          logUpdate.delivered_at = tNow;
          break;
        case "email.opened":
          logUpdate.last_opened_at = tNow;
          logUpdate.open_count = (logRow.open_count || 0) + 1;
          if (!logRow.first_opened_at) logUpdate.first_opened_at = tNow;
          break;
        case "email.clicked":
          logUpdate.last_clicked_at = tNow;
          logUpdate.click_count = (logRow.click_count || 0) + 1;
          if (!logRow.first_clicked_at) logUpdate.first_clicked_at = tNow;
          if (event.data.click?.link) logUpdate.last_clicked_url = event.data.click.link;
          break;
        case "email.bounced":
          logUpdate.bounced_at = tNow;
          logUpdate.error_message = event.data.bounce?.message || "bounced";
          break;
        case "email.complained":
          logUpdate.complained_at = tNow;
          break;
      }
      if (Object.keys(logUpdate).length > 0) {
        const { error: logErr } = await supabase
          .from("email_send_log")
          .update(logUpdate)
          .eq("id", logRow.id);
        if (logErr) console.error("email_send_log update error:", logErr);
      }
    }

    // === 2) Update mass_email_sends (legacy mass-email tracking) ===
    const { data: send } = await supabase
      .from("mass_email_sends")
      .select("id, open_count, click_count, first_opened_at, first_clicked_at")
      .eq("resend_id", emailId)
      .maybeSingle();

    if (!send) {
      // Email pas dans mass_email_sends — il a peut-être été tracké côté email_send_log au-dessus.
      return new Response(JSON.stringify({ ok: true, tracked_in: logRow ? "email_send_log" : "none", type: event.type }), {
        status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const now = event.created_at || new Date().toISOString();
    const update: Record<string, unknown> = {};

    switch (event.type) {
      case "email.delivered":
        update.delivered_at = now;
        update.status = "delivered";
        break;
      case "email.opened":
        update.last_opened_at = now;
        update.open_count = (send.open_count || 0) + 1;
        if (!send.first_opened_at) update.first_opened_at = now;
        update.status = "opened";
        break;
      case "email.clicked":
        update.last_clicked_at = now;
        update.click_count = (send.click_count || 0) + 1;
        if (!send.first_clicked_at) update.first_clicked_at = now;
        if (event.data.click?.link) update.last_clicked_url = event.data.click.link;
        update.status = "clicked";
        break;
      case "email.bounced":
        update.bounced_at = now;
        update.status = "bounced";
        update.error_message = event.data.bounce?.message || "bounced";
        break;
      case "email.complained":
        update.complained_at = now;
        update.status = "complained";
        break;
      default:
        return new Response(JSON.stringify({ ignored: event.type }), {
          status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
    }

    const { error } = await supabase
      .from("mass_email_sends")
      .update(update)
      .eq("id", send.id);

    if (error) {
      console.error("Update error:", error);
      return new Response(JSON.stringify({ error: error.message }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ ok: true, type: event.type }), {
      status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("resend-webhook error:", err);
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
