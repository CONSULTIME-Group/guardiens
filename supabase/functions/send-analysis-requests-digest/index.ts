// Daily digest to admin: new analysis_requests in the last 24h.
// Triggered by pg_cron every day at 08:00 Europe/Paris (06:00 UTC in winter, 05:00 UTC in summer — we use 07:00 UTC as a stable compromise).

import { createClient } from "npm:@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  // Auth guard: only accept the service-role key (used by pg_cron via pg_net).
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const token = req.headers.get("Authorization")?.replace("Bearer ", "") ?? "";
  if (token !== serviceKey) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }


  const adminEmail = Deno.env.get("ADMIN_DIGEST_EMAIL");
  if (!adminEmail) {
    return new Response(
      JSON.stringify({ skipped: true, reason: "ADMIN_DIGEST_EMAIL not set" }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  const since = new Date(Date.now() - 24 * 60 * 60 * 1000);
  const { data: items, error } = await supabase
    .from("analysis_requests")
    .select("id, request_type, subject, email, created_at")
    .gte("created_at", since.toISOString())
    .order("created_at", { ascending: false });

  if (error) {
    console.error("digest fetch error", error);
    return new Response(JSON.stringify({ error: "fetch_failed" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const total = items?.length ?? 0;
  if (total === 0) {
    return new Response(JSON.stringify({ skipped: true, reason: "no_new_requests" }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const sinceLabel = since.toLocaleString("fr-FR", { dateStyle: "long", timeStyle: "short" });
  const idemKey = `analysis-digest-${new Date().toISOString().slice(0, 10)}`;

  const { error: sendErr } = await supabase.functions.invoke("send-transactional-email", {
    body: {
      templateName: "analysis-requests-digest",
      recipientEmail: adminEmail,
      idempotencyKey: idemKey,
      templateData: {
        total,
        since: sinceLabel,
        items,
        adminUrl: "https://guardiens.fr/admin/analysis-requests",
      },
    },
  });

  if (sendErr) {
    console.error("send failed", sendErr);
    return new Response(JSON.stringify({ error: "send_failed" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  return new Response(JSON.stringify({ ok: true, total, adminEmail }), {
    status: 200,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});
