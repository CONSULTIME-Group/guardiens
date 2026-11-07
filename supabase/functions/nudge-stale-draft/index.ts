/**
 * nudge-stale-draft
 *
 * Deux modes, calqués sur nudge-owner-pending-application :
 *  - cron (body vide) : détecte les annonces en brouillon dormantes (plus de
 *    48h, garde encore à venir, propriétaire n'ayant jamais publié) et insère
 *    un signal admin_signals de type 'stale_draft' (insertion idempotente).
 *    Aucun email n'est envoyé en mode cron : la relance email est déjà assurée
 *    par send-sit-draft-reminder, ce job ne fait que rendre le sujet visible.
 *  - manual (body { sit_id, signal_id }) : appelé depuis l'admin, passe par la
 *    même politique que la relance automatique (_shared/draft-reminder-eligibility.ts :
 *    deux relances au plus, 7 jours entre elles, 48 heures après un email de la
 *    séquence, une par jour, préférences product_emails, suppression, date
 *    passée, propriétaire déjà publié), avec la même clé d'envoi par annonce et
 *    par rang. send-transactional-email refait ces contrôles au moment réel de
 *    l'envoi. Le signal n'est résolu qu'après un envoi réel. La réponse ne
 *    contient jamais l'adresse du propriétaire.
 *
 * Toute lecture en échec : aucun envoi, réponse 503 (fail closed).
 */
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import { startCronRun, type CronRun } from "../_shared/cron-run-log.ts";
import { requireAdminOrServiceRole } from "../_shared/require-admin.ts";
import { loadMissingDraftItems, draftReminderUrl } from "../_shared/sit-draft-missing.ts";
import {
  classifyTransactionalResponse, DRAFT_REMINDER_SELECT, DRAFT_REMINDER_TEMPLATE, evaluateDraftReminder,
  type DraftReminderDecision,
} from "../_shared/draft-reminder-eligibility.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

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
  serviceClient: any;
  decision: Extract<DraftReminderDecision, { send: true }>;
}): Promise<{ ok: boolean; outcome: "sent" | "deferred" | "skipped" | "failed"; error?: string }> {
  const { serviceClient, decision } = params;
  const { draft, owner } = decision;
  const missingItems = await loadMissingDraftItems(serviceClient, draft as Record<string, any>);
  const daysSinceCreated = Math.max(0, Math.floor((Date.now() - Date.parse(String(draft.created_at))) / 86400000));

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
      templateName: DRAFT_REMINDER_TEMPLATE,
      recipientEmail: owner.email,
      idempotencyKey: decision.idempotencyKey,
      templateData: {
        firstName: owner.first_name || "",
        sitId: draft.id,
        title: draft.title,
        fieldsRemaining: missingItems.length,
        missingItems,
        profileUrl: "https://guardiens.fr/owner-profile",
        nearbySittersCount: 0,
        daysSinceCreated,
        resumeUrl: draftReminderUrl(draft.id, missingItems),
      },
      logMetadata: {
        sit_id: draft.id,
        owner_id: draft.user_id,
        reminder_stage: decision.stage,
        days_since_created: daysSinceCreated,
        source: "nudge-stale-draft",
      },
    }),
  });
  const body = (await resp.json().catch(() => null)) as Record<string, unknown> | null;
  const { outcome, reason } = classifyTransactionalResponse(resp.ok, body);
  if (outcome === "failed") console.error("[nudge-stale-draft] send failed", resp.status, reason);
  return outcome === "sent" ? { ok: true, outcome } : { ok: false, outcome, error: reason ?? outcome };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  let run: CronRun | null = null;
  try {
    const authError = await requireAdminOrServiceRole(req, corsHeaders);
    if (authError) return authError;

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

      const { data: rows, error: detectError } = await serviceClient.rpc("detect_stale_drafts");
      if (detectError) {
        return new Response(JSON.stringify({ mode, sent: false, outcome: "failed", error: "verification_unavailable" }), {
          status: 503, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const listed = ((rows as StaleDraft[]) ?? []).find((d) => d.sit_id === payload.sit_id);
      if (!listed) {
        return new Response(
          JSON.stringify({ error: "Brouillon introuvable ou déjà publié" }),
          { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }

      // Même politique que la tâche quotidienne, relue sur l'annonce réelle.
      let decision: DraftReminderDecision;
      try {
        const { data: sitRow, error: sitError } = await serviceClient
          .from("sits").select(DRAFT_REMINDER_SELECT).eq("id", listed.sit_id).maybeSingle();
        if (sitError) throw sitError;
        decision = await evaluateDraftReminder(serviceClient, sitRow);
      } catch (e) {
        console.error("[nudge-stale-draft] eligibility unavailable", (e as Error)?.message);
        return new Response(JSON.stringify({ mode, sent: false, outcome: "failed", error: "verification_unavailable" }), {
          status: 503, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (!decision.send) {
        return new Response(
          JSON.stringify({ mode, sent: false, outcome: "skipped", error: decision.reason }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }

      let result: Awaited<ReturnType<typeof sendDraftReminder>>;
      try {
        result = await sendDraftReminder({ serviceClient, decision });
      } catch (e) {
        console.error("[nudge-stale-draft] send unavailable", (e as Error)?.message);
        result = { ok: false, outcome: "failed", error: "send_unavailable" };
      }

      if (result.ok && payload.signal_id) {
        await serviceClient
          .from("admin_signals")
          .update({
            resolved_at: new Date().toISOString(),
            action_taken: "email_sent",
            admin_id: user.id,
          })
          .eq("id", payload.signal_id)
          .eq("signal_type", "stale_draft")
          .eq("entity_id", listed.sit_id)
          .is("resolved_at", null);
      }

      return new Response(
        JSON.stringify({
          mode,
          sent: result.ok,
          outcome: result.outcome,
          stage: decision.stage,
          error: result.error ?? null,
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
