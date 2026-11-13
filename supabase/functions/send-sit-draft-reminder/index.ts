// send-sit-draft-reminder
// Relance les owners ayant un sit en status='draft' créé il y a plus de 24h
// et jamais publié. Anti-doublon par annonce via email_send_log (template_name +
// metadata.sit_id, repli sur la clé d'idempotence historique), plus un plafond
// d'une relance de brouillon par personne et par jour (UTC).
// Déclenchement : cron quotidien existant, 08h UTC.
// Plafond : 25 envois max par run, les plus anciens d'abord.

import { createClient } from "npm:@supabase/supabase-js@2.45.0";
import { loadMissingDraftItems, draftReminderUrl } from "../_shared/sit-draft-missing.ts";
import { loadOwnerSitterPool, ownerNearbyContext, type SitterRow } from "../_shared/owner-nearby.ts";
import {
  classifyTransactionalResponse, DRAFT_REMINDER_SELECT, DRAFT_REMINDER_TEMPLATE, evaluateDraftReminder,
} from "../_shared/draft-reminder-eligibility.ts";
import { withCronRunLog } from "../_shared/cron-run-log.ts";
import { departureHoldsPublishAsk, loadLastDepartureAnswer } from "../_shared/owner-sequence-rules.ts";
import { readFlag, REL1_FLAG_DRAFT, runAlmostReadySweep, type SendRequest } from "../_shared/rel1-sweeps.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const MAX_PER_RUN = 25;

// Lot REL1 : second passage « presque prêt », un seul email par annonce, pour
// les brouillons que la relance ci-dessous ne couvre plus (annonce déjà
// publiée une fois, plafond de deux relances atteint). Drapeau
// rel1_draft_almost_ready éteint : la liste est calculée et rendue, rien ne part.
// deno-lint-ignore no-explicit-any
async function almostReadyPass(supabase: any, now: number, alreadyServed: ReadonlySet<string>) {
  try {
    const send = async (request: SendRequest) => {
      const res = await fetch(`${Deno.env.get("SUPABASE_URL")}/functions/v1/send-transactional-email`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "Authorization": `Bearer ${Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")}` },
        body: JSON.stringify(request),
      });
      return classifyTransactionalResponse(res.ok, await res.json().catch(() => null));
    };
    return await runAlmostReadySweep({
      client: supabase,
      enabled: await readFlag(supabase, REL1_FLAG_DRAFT),
      send,
      loadMissing: (draft) => loadMissingDraftItems(supabase, draft as unknown as Record<string, unknown>),
      resumeUrl: draftReminderUrl,
      departureHeld: async (ownerId) => departureHoldsPublishAsk(await loadLastDepartureAnswer(supabase, ownerId), new Date(now)),
      alreadyServed,
    });
  } catch (e) {
    console.error("[sit-draft-reminder] almost ready pass failed", e);
    return { mode: "error", error: (e as Error)?.message ?? "unknown" };
  }
}

/** Champs simples du second passage, lisibles dans cron_run_log. */
function almostReadyMetrics(r: Record<string, unknown>) {
  return {
    almost_ready_mode: r.mode, almost_ready_detected: r.detected ?? 0, almost_ready_eligible: r.eligible ?? 0,
    almost_ready_sent: r.sent ?? 0, almost_ready_sit_ids: r.sit_ids ?? "",
  };
}

// Règles d'admissibilité (jamais publié, réponse de départ, 48 heures après
// un email de la séquence, deux relances au plus, 7 jours, préférences,
// suppression, une par jour) : _shared/draft-reminder-eligibility.ts, la même
// politique que la relance admin de nudge-stale-draft.

Deno.serve(withCronRunLog("send-sit-draft-reminder", async (req) => {
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


  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  const now = Date.now();
  const cutoffDate = new Date(now - 24 * 60 * 60 * 1000).toISOString();
  const today = new Date(now).toISOString().slice(0, 10);

  // Récupérer les drafts créés il y a plus de 24h, les plus anciens d'abord.
  // Filtre dates : on ne relance que les brouillons sans date de début
  // ou dont la garde est encore à venir (start_date strictement après aujourd'hui).
  const { data: drafts, error } = await supabase
    .from("sits")
    .select(DRAFT_REMINDER_SELECT)
    .eq("status", "draft")
    .is("published_at", null)
    .is("unpublished_at", null)
    .lt("created_at", cutoffDate)
    .or(`start_date.is.null,start_date.gte.${today}`)
    .order("created_at", { ascending: true })
    .order("id", { ascending: true })
    .limit(100);

  if (error) {
    console.error("[sit-draft-reminder] fetch drafts failed", error);
    return new Response(JSON.stringify({ error: "fetch_failed" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  if (!drafts || drafts.length === 0) {
    const almostReady = await almostReadyPass(supabase, now, new Set());
    return new Response(JSON.stringify({ ok: true, sent: 0, skipped: 0, ...almostReadyMetrics(almostReady), almost_ready: almostReady }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  let sent = 0;
  let skipped = 0;
  let deferred = 0;
  let attempted = 0;
  const errors: Array<{ sit_id: string; reason: string }> = [];
  const skipReasons: Record<string, number> = {};
  const sentToday = new Set<string>();
  let sitterPool: SitterRow[] | null = null;
  let held = 0;

  for (const draft of drafts) {
    try {
      const decision = await evaluateDraftReminder(supabase, draft as any, { now });
      if (!decision.send) {
        skipReasons[decision.reason] = (skipReasons[decision.reason] ?? 0) + 1;
        if (decision.reason === "departure_hold") held++;
        skipped++;
        continue;
      }
      // Plafond par personne dans ce passage (deux brouillons d'un même compte).
      if (sentToday.has(decision.owner.email)) {
        skipReasons.already_sent_today = (skipReasons.already_sent_today ?? 0) + 1;
        skipped++;
        continue;
      }

      // Liste nommée de ce qui manque, avec les mots exacts du formulaire.
      const missingItems = await loadMissingDraftItems(supabase, draft as Record<string, any>);
      const daysSinceCreated = Math.max(0, Math.floor((now - Date.parse(String(draft.created_at))) / 86400000));

      // Lieu : celui du profil du propriétaire. Échec de lecture : l'email part sans phrase.
      let nearbySittersCount = 0;
      let nearbySittersLabel: string | null = null;
      try {
        if (sitterPool === null) sitterPool = await loadOwnerSitterPool(supabase);
        const near = ownerNearbyContext({
          id: draft.user_id, city: decision.owner.city, latitude: decision.owner.latitude, longitude: decision.owner.longitude,
        }, sitterPool);
        nearbySittersCount = near.count;
        nearbySittersLabel = near.label;
      } catch (nearErr) {
        console.warn("[sit-draft-reminder] nearby lookup failed", nearErr);
      }

      const res = await fetch(`${Deno.env.get("SUPABASE_URL")}/functions/v1/send-transactional-email`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "Authorization": `Bearer ${Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")}` },
        body: JSON.stringify({
          templateName: DRAFT_REMINDER_TEMPLATE,
          recipientEmail: decision.owner.email,
          idempotencyKey: decision.idempotencyKey,
          logMetadata: { sit_id: draft.id, owner_id: draft.user_id, reminder_stage: decision.stage, source: "send-sit-draft-reminder" },
          templateData: {
            firstName: decision.owner.first_name || "",
            sitId: draft.id,
            title: draft.title,
            fieldsRemaining: missingItems.length,
            missingItems,
            profileUrl: "https://guardiens.fr/owner-profile",
            nearbySittersCount,
            nearbySittersLabel,
            daysSinceCreated,
            resumeUrl: draftReminderUrl(draft.id, missingItems),
          },
        }),
      });
      const body = await res.json().catch(() => null);
      attempted++;
      const { outcome, reason } = classifyTransactionalResponse(res.ok, body);
      if (outcome === "failed") {
        console.error("send-transactional-email failed", res.status, reason);
        errors.push({ sit_id: draft.id, reason: `send_failed_${res.status}:${reason}` });
      } else if (outcome === "sent") sent++;
      else if (outcome === "deferred") deferred++;
      else { skipped++; skipReasons[reason ?? "skipped"] = (skipReasons[reason ?? "skipped"] ?? 0) + 1; }
      if (outcome !== "failed") sentToday.add(decision.owner.email);
      if (attempted >= MAX_PER_RUN) break;
    } catch (e: any) {
      // Lecture impossible : rien ne part pour ce brouillon (fail closed).
      errors.push({ sit_id: draft.id, reason: e?.message ?? "unknown" });
    }
  }

  const almostReady = await almostReadyPass(supabase, now, sentToday);
  return new Response(
    JSON.stringify({ ok: true, sent, deferred, skipped, held, total: drafts.length, errors_count: errors.length, ...almostReadyMetrics(almostReady), errors, skip_reasons: skipReasons, almost_ready: almostReady }),
    { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
  );
}));
