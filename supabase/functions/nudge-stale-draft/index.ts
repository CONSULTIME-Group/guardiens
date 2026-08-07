/**
 * nudge-stale-draft
 *
 * Deux modes, calqués sur nudge-owner-pending-application :
 *  - cron (body vide) : détecte les annonces en brouillon dormantes (plus de
 *    48h, garde encore à venir, propriétaire n'ayant jamais publié) et insère
 *    un signal admin_signals de type 'stale_draft' (insertion idempotente).
 *    Aucun email n'est envoyé en mode cron : la relance email est déjà assurée
 *    par send-sit-draft-reminder, ce job ne fait que rendre le sujet visible.
 *  - manual (body { sit_id, signal_id }) : appelé depuis l'admin, envoie le
 *    template existant sit-draft-reminder via send-transactional-email, puis
 *    marque le signal comme résolu avec action_taken 'email_sent'.
 *
 * Respecte : feature flag admin_signals_active et suppressed_emails.
 * Le filtrage par catégorie est centralisé dans send-transactional-email.
 */
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import { startCronRun, type CronRun } from "../_shared/cron-run-log.ts";
import { loadMissingDraftItems } from "../_shared/sit-draft-missing.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const TEMPLATE = "sit-draft-reminder";

interface StaleDraft {
  sit_id: string;
  sit_title: string | null;
  city: string | null;
  start_date: string | null;
  owner_id: string;
  owner_first_name: string | null;
  owner_email: string;
  days_since_created: number;
}

function daysUntil(startDate: string | null): number | null {
  if (!startDate) return null;
  const start = new Date(`${startDate}T00:00:00Z`).getTime();
  const today = new Date();
  const todayUtc = Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate());
  return Math.round((start - todayUtc) / 86400000);
}

async function sendDraftReminder(params: {
  serviceClient: ReturnType<typeof createClient>;
  draft: StaleDraft;
  messageId: string;
}): Promise<{ ok: boolean; outcome: "sent" | "deferred" | "skipped" | "failed"; error?: string }> {
  const { serviceClient, draft, messageId } = params;
  const email = draft.owner_email.trim().toLowerCase();

  // Liste nommée de ce qui manque, calculée sur l'annonce réelle.
  const { data: sitRow } = await serviceClient
    .from("sits")
    .select("id, user_id, title, start_date, end_date, absence_reason, sitter_expectations, cover_photo_url")
    .eq("id", draft.sit_id)
    .maybeSingle();
  const missingItems = sitRow
    ? await loadMissingDraftItems(serviceClient, sitRow as Record<string, any>)
    : [];

  const { data: sup } = await serviceClient
    .from("suppressed_emails")
    .select("email")
    .eq("email", email)
    .maybeSingle();
  if (sup) return { ok: false, outcome: "skipped", error: "suppressed" };

  const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
  const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const resp = await fetch(`${SUPABASE_URL}/functions/v1/send-transactional-email`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${SERVICE_KEY}`,
      apikey: SERVICE_KEY,
    },
    body: JSON.stringify({
      templateName: TEMPLATE,
      recipientEmail: email,
      idempotencyKey: messageId,
      templateData: {
        firstName: draft.owner_first_name || "",
        sitId: draft.sit_id,
        fieldsRemaining: missingItems.length,
        missingItems,
        profileUrl: "https://guardiens.fr/owner-profile",
        nearbySittersCount: 0,
        daysSinceCreated: draft.days_since_created,
        resumeUrl: `https://guardiens.fr/sits/create?resume=${draft.sit_id}`,
      },
      logMetadata: {
        sit_id: draft.sit_id,
        owner_id: draft.owner_id,
        days_since_created: draft.days_since_created,
        source: "nudge-stale-draft",
      },
    }),
  });

  if (!resp.ok) {
    const body = await resp.text();
    console.error("[nudge-stale-draft] send failed", resp.status, body);
    return { ok: false, outcome: "failed", error: `send_failed_${resp.status}` };
  }

  const payload = (await resp.json().catch(() => null)) as Record<string, unknown> | null;
  if (payload?.deferred) {
    return { ok: false, outcome: "deferred", error: String(payload?.reason ?? "deferred") };
  }
  if (payload?.skipped) {
    return { ok: false, outcome: "skipped", error: String(payload?.reason ?? "skipped") };
  }
  return { ok: true, outcome: "sent" };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  let run: CronRun | null = null;
  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;

    const serviceClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    const { data: flag } = await serviceClient
      .from("feature_flags")
      .select("enabled")
      .eq("key", "admin_signals_active")
      .maybeSingle();
    if (!flag?.enabled) {
      return new Response(
        JSON.stringify({ skipped: "admin_signals_active is off" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    let payload: { mode?: string; sit_id?: string; signal_id?: string } = {};
    try {
      const text = await req.text();
      if (text.trim()) payload = JSON.parse(text);
    } catch {
      // ignore
    }

    const mode = payload.mode === "manual" ? "manual" : "cron";
    if (mode === "cron") {
      run = await startCronRun("nudge-stale-draft");
    }

    // ── Mode MANUAL : relance ciblée depuis l'admin ─────────────────────
    if (mode === "manual") {
      const authHeader = req.headers.get("Authorization");
      if (!authHeader?.startsWith("Bearer ")) {
        return new Response(JSON.stringify({ error: "Unauthorized" }), {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const userClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
        global: { headers: { Authorization: authHeader } },
      });
      const { data: { user } } = await userClient.auth.getUser();
      if (!user) {
        return new Response(JSON.stringify({ error: "Unauthorized" }), {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const { data: role } = await serviceClient
        .from("user_roles")
        .select("role")
        .eq("user_id", user.id)
        .eq("role", "admin")
        .maybeSingle();
      if (!role) {
        return new Response(JSON.stringify({ error: "Admin access required" }), {
          status: 403,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      if (!payload.sit_id) {
        return new Response(JSON.stringify({ error: "sit_id requis" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const { data: rows } = await serviceClient.rpc("detect_stale_drafts");
      const draft = ((rows as StaleDraft[]) ?? []).find((d) => d.sit_id === payload.sit_id);
      if (!draft) {
        return new Response(
          JSON.stringify({ error: "Brouillon introuvable ou déjà publié" }),
          { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }

      const result = await sendDraftReminder({
        serviceClient,
        draft,
        messageId: `stale-draft-manual-${draft.sit_id}-${Date.now()}`,
      });

      if (result.ok && payload.signal_id) {
        await serviceClient
          .from("admin_signals")
          .update({
            resolved_at: new Date().toISOString(),
            action_taken: "email_sent",
            admin_id: user.id,
          })
          .eq("id", payload.signal_id);
      }

      return new Response(
        JSON.stringify({
          mode,
          sent: result.ok,
          outcome: result.outcome,
          error: result.error ?? null,
          recipient: draft.owner_email,
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // ── Mode CRON : balayage ─────────────────────────────────────────────
    const { data: rows, error: rpcErr } = await serviceClient.rpc("detect_stale_drafts");
    if (rpcErr) throw rpcErr;
    const drafts: StaleDraft[] = (rows as StaleDraft[]) ?? [];

    let signalsInserted = 0;
    let signalsSkipped = 0;
    const errors: Array<{ sit_id: string; error: string }> = [];

    for (const draft of drafts) {
      const untilStart = daysUntil(draft.start_date);
      const severity =
        draft.days_since_created >= 14 || (untilStart !== null && untilStart < 21)
          ? "critical"
          : "warning";

      const { error: insErr } = await serviceClient.from("admin_signals").insert({
        signal_type: "stale_draft",
        severity,
        entity_type: "sit",
        entity_id: draft.sit_id,
        metadata: {
          sit_title: draft.sit_title,
          city: draft.city,
          start_date: draft.start_date,
          owner_id: draft.owner_id,
          owner_first_name: draft.owner_first_name,
          owner_email: draft.owner_email,
          days_since_created: draft.days_since_created,
          days_until_start: untilStart,
        },
      });

      if (insErr) {
        if (insErr.code === "23505" || insErr.message?.includes("idx_admin_signals_idempotent")) {
          signalsSkipped += 1;
        } else {
          errors.push({ sit_id: draft.sit_id, error: insErr.message });
        }
      } else {
        signalsInserted += 1;
      }
    }

    const metrics = {
      detected: drafts.length,
      signals_inserted: signalsInserted,
      signals_skipped: signalsSkipped,
      emails_sent: 0,
      emails_deferred: 0,
      emails_skipped: drafts.length,
      errors_count: errors.length,
    };

    if (run) {
      await run.finish(errors.length > 0 ? "partial" : "success", metrics);
    }

    return new Response(
      JSON.stringify({ mode, ...metrics, errors, generated_at: new Date().toISOString() }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (err) {
    console.error("[nudge-stale-draft]", err);
    if (run) await run.fail(err);
    return new Response(
      JSON.stringify({ error: String((err as Error)?.message ?? err) }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
