// Drains email_deferred_queue: re-invokes send-transactional-email for entries whose
// scheduled_for is past. Caps + quiet-hours are re-evaluated by send-transactional-email,
// so messages may be re-deferred (their queue row is then marked sent if the call succeeded
// or the new deferred row supersedes; the re-defer logic in the sender uses the
// original idempotency_key to avoid duplicates).
//
// Designed to be triggered by pg_cron every minute.

import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const MAX_BATCH = 50;
const MAX_ATTEMPTS = 6;
const TTL_HOURS = 36; // hard expire after 36h to avoid stale notifications

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
  const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

  // Auth : accepte la clé service_role brute (comparaison directe avec l'env,
  // pattern éprouvé de send-transactional-email et evaluate-journeys). Le
  // décodage de claim JWT `role=service_role` échoue pour les clés du vault
  // qui ne portent pas ce claim, ce qui bloquait le drainage automatique.
  const authHeader = req.headers.get("Authorization") ?? "";
  const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : "";
  let authorized = !!token && token === SERVICE_KEY;
  if (!authorized && token && token.split(".").length === 3) {
    try {
      const b64 = token.split(".")[1].replace(/-/g, "+").replace(/_/g, "/");
      const pad = b64.length % 4 === 0 ? "" : "=".repeat(4 - (b64.length % 4));
      const payload = JSON.parse(atob(b64 + pad)) as { role?: unknown };
      if (payload?.role === "service_role") authorized = true;
    } catch { /* ignore */ }
  }
  if (!authorized) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }


  const supabase = createClient(SUPABASE_URL, SERVICE_KEY);

  const nowIso = new Date().toISOString();

  // 1. Expire stale entries
  const ttlCutoff = new Date(Date.now() - TTL_HOURS * 3600_000).toISOString();
  await supabase
    .from("email_deferred_queue")
    .update({ status: "expired", last_error: "TTL exceeded" })
    .eq("status", "pending")
    .lt("created_at", ttlCutoff);

  // 2. Pull due rows
  const { data: due, error: fetchErr } = await supabase
    .from("email_deferred_queue")
    .select("id, template_name, recipient_email, template_data, idempotency_key, attempts")
    .eq("status", "pending")
    .lte("scheduled_for", nowIso)
    .order("scheduled_for", { ascending: true })
    .limit(MAX_BATCH);

  if (fetchErr) {
    console.error("flush fetch error", fetchErr);
    return new Response(JSON.stringify({ error: fetchErr.message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  let sent = 0, failed = 0, redeferred = 0;

  for (const row of due ?? []) {
    // Mark in-flight (set last_attempt_at, increment attempts) BEFORE invoking — avoids dup if cron overlaps
    const newAttempts = (row.attempts ?? 0) + 1;
    await supabase
      .from("email_deferred_queue")
      .update({ last_attempt_at: nowIso, attempts: newAttempts })
      .eq("id", row.id);

    try {
      const { data, error } = await supabase.functions.invoke("send-transactional-email", {
        body: {
          templateName: row.template_name,
          recipientEmail: row.recipient_email,
          idempotencyKey: row.idempotency_key,
          templateData: row.template_data || {},
        },
      });

      if (error) throw error;

      const result = data as Record<string, unknown> | null;
      if (result?.deferred) {
        // Sender re-deferred (still in quiet hours / over cap). Mark this row as sent so it
        // doesn't fire again — a new deferred row already exists from the sender.
        await supabase.from("email_deferred_queue").update({ status: "sent" }).eq("id", row.id);
        redeferred++;
      } else if (result?.sent || result?.skipped || result?.success) {
        await supabase.from("email_deferred_queue").update({ status: "sent" }).eq("id", row.id);
        sent++;
      } else {
        // Unknown response shape — treat as failure
        if (newAttempts >= MAX_ATTEMPTS) {
          await supabase.from("email_deferred_queue").update({ status: "failed", last_error: `Unexpected response: ${JSON.stringify(result)}` }).eq("id", row.id);
        }
        failed++;
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      console.error("flush invoke error", { id: row.id, err: msg });
      if (newAttempts >= MAX_ATTEMPTS) {
        await supabase.from("email_deferred_queue").update({ status: "failed", last_error: msg }).eq("id", row.id);
      } else {
        // Backoff: push scheduled_for forward (5min, 15, 30, 60, 120)
        const backoffMin = [5, 15, 30, 60, 120][Math.min(newAttempts - 1, 4)];
        await supabase
          .from("email_deferred_queue")
          .update({
            scheduled_for: new Date(Date.now() + backoffMin * 60_000).toISOString(),
            last_error: msg,
          })
          .eq("id", row.id);
      }
      failed++;
    }
  }

  return new Response(
    JSON.stringify({ ok: true, processed: (due ?? []).length, sent, failed, redeferred }),
    { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
  );
});
