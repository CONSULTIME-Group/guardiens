/**
 * nudge-owner-unconfirmed-sit
 *
 * Cron quotidien. Detecte les annonces publiees ou la mise en relation a
 * reussi (candidature en attente de decision ET conversation a double sens)
 * mais n'a jamais ete officialisee par une confirmation.
 *
 * Pour chaque annonce retenue :
 *  - signal admin `owner_sit_unconfirmed` (idempotent sur (type, entity_id),
 *    resolu automatiquement par le trigger trg_resolve_owner_sit_unconfirmed
 *    des que le sit quitte l'etat publie) ;
 *  - email `owner-sit-unconfirmed` (categorie transactionnelle), une seule
 *    fois par annonce et par palier d'urgence ;
 *  - notification in-app pointant sur /sits/<id>#candidatures.
 *
 * Respecte : feature flag admin_signals_active, suppressed_emails, et le
 * plafond de securite SEND_CAP par execution.
 */
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import { startCronRun } from "../_shared/cron-run-log.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

/** Plafond de securite par execution, meme esprit que remind-unread-messages. */
const SEND_CAP = 200;

interface UnconfirmedSit {
  sit_id: string;
  sit_title: string | null;
  sit_slug: string | null;
  start_date: string | null;
  end_date: string | null;
  days_until_start: number | null;
  owner_id: string;
  owner_first_name: string | null;
  owner_email: string;
  sitter_first_names: string[] | null;
  discussing_count: number;
  last_message_at: string | null;
  urgency: "imminent" | "stale";
}

const dateFmt = new Intl.DateTimeFormat("fr-FR", {
  day: "numeric",
  month: "long",
  year: "numeric",
  timeZone: "Europe/Paris",
});

function formatDate(value: string | null): string | null {
  if (!value) return null;
  const d = new Date(value.length <= 10 ? `${value}T00:00:00Z` : value);
  if (Number.isNaN(d.getTime())) return null;
  return dateFmt.format(d);
}

function formatRange(start: string | null, end: string | null): string {
  const s = formatDate(start);
  const e = formatDate(end);
  if (s && e) return `du ${s} au ${e}`;
  if (s) return `à partir du ${s}`;
  return "";
}

function joinNames(names: string[]): string {
  if (names.length === 0) return "votre gardien";
  if (names.length === 1) return names[0];
  return `${names.slice(0, -1).join(", ")} et ${names[names.length - 1]}`;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const run = await startCronRun("nudge-owner-unconfirmed-sit");
  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const service = createClient(SUPABASE_URL, SERVICE_KEY);

    const { data: flag } = await service
      .from("feature_flags")
      .select("enabled")
      .eq("key", "admin_signals_active")
      .maybeSingle();
    if (!flag?.enabled) {
      await run.finish("success", { skipped: "admin_signals_active is off" });
      return new Response(
        JSON.stringify({ skipped: "admin_signals_active is off" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const { data, error } = await service.rpc("detect_unconfirmed_sits");
    if (error) throw error;
    const rows: UnconfirmedSit[] = (data as UnconfirmedSit[]) ?? [];

    let signalsInserted = 0;
    let signalsSkipped = 0;
    let emailsSent = 0;
    let emailsDeferred = 0;
    let emailsSkipped = 0;
    let notificationsCreated = 0;
    let capped = 0;
    const errors: Array<{ sit_id: string; error: string }> = [];

    for (const row of rows) {
      const names = (row.sitter_first_names ?? []).filter(Boolean);
      const who = joinNames(names);

      // 1. Signal admin, idempotent sur (signal_type, entity_id) non resolu.
      const { error: insErr } = await service.from("admin_signals").insert({
        signal_type: "owner_sit_unconfirmed",
        severity: row.urgency === "imminent" ? "critical" : "warning",
        entity_type: "sit",
        entity_id: row.sit_id,
        metadata: {
          nature: "conversion",
          urgency: row.urgency,
          sit_title: row.sit_title,
          owner_id: row.owner_id,
          owner_first_name: row.owner_first_name,
          discussing_count: row.discussing_count,
          sitter_first_names: names,
          start_date: row.start_date,
          days_until_start: row.days_until_start,
          last_message_at: row.last_message_at,
        },
      });
      if (insErr) {
        if (
          insErr.code === "23505" ||
          insErr.message?.includes("idx_admin_signals_idempotent")
        ) {
          signalsSkipped += 1;
        } else {
          errors.push({ sit_id: row.sit_id, error: insErr.message });
          continue;
        }
      } else {
        signalsInserted += 1;
      }

      // 2. Email, une fois par annonce et par palier d'urgence.
      if (emailsSent >= SEND_CAP) {
        capped += 1;
        continue;
      }
      const messageId = `sit-unconfirmed-${row.sit_id}-${row.urgency}`;
      const email = row.owner_email.trim().toLowerCase();

      const { data: dup } = await service
        .from("email_send_log")
        .select("id")
        .eq("message_id", messageId)
        .limit(1)
        .maybeSingle();
      if (dup) {
        emailsSkipped += 1;
        continue;
      }

      const { data: sup } = await service
        .from("suppressed_emails")
        .select("email")
        .eq("email", email)
        .maybeSingle();
      if (sup) {
        emailsSkipped += 1;
        continue;
      }

      const ctaUrl = `https://guardiens.fr/sits/${row.sit_id}#candidatures`;
      const unpublishUrl = `https://guardiens.fr/sits/${row.sit_id}#depublier`;

      const resp = await fetch(`${SUPABASE_URL}/functions/v1/send-transactional-email`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${SERVICE_KEY}`,
          apikey: SERVICE_KEY,
        },
        body: JSON.stringify({
          templateName: "owner-sit-unconfirmed",
          category: "transactional",
          recipientEmail: email,
          idempotencyKey: messageId,
          templateData: {
            ownerFirstName: row.owner_first_name || "",
            sitTitle: row.sit_title || "",
            dateRange: formatRange(row.start_date, row.end_date),
            sitterNames: names,
            lastExchange: formatDate(row.last_message_at),
            daysUntilStart: row.days_until_start,
            urgency: row.urgency,
            ctaUrl,
            unpublishUrl,
          },
          logMetadata: {
            sit_id: row.sit_id,
            owner_id: row.owner_id,
            urgency: row.urgency,
            discussing_count: row.discussing_count,
            days_until_start: row.days_until_start,
          },
        }),
      });

      if (!resp.ok) {
        const body = await resp.text();
        console.error("[nudge-owner-unconfirmed-sit] send failed", resp.status, body);
        errors.push({ sit_id: row.sit_id, error: `send_failed_${resp.status}` });
        continue;
      }
      const outcome = (await resp.json().catch(() => null)) as Record<string, unknown> | null;
      if (outcome?.deferred) {
        emailsDeferred += 1;
      } else if (outcome?.skipped) {
        emailsSkipped += 1;
      } else {
        emailsSent += 1;
      }

      // 3. Notification in-app, une par annonce et par palier.
      const { data: existingNotif } = await service
        .from("notifications")
        .select("id")
        .eq("user_id", row.owner_id)
        .eq("type", "sit_unconfirmed")
        .eq("link", ctaUrl.replace("https://guardiens.fr", ""))
        .gte("created_at", new Date(Date.now() - 30 * 86400000).toISOString())
        .limit(1)
        .maybeSingle();
      if (!existingNotif) {
        const { error: notifErr } = await service.from("notifications").insert({
          user_id: row.owner_id,
          type: "sit_unconfirmed",
          title:
            row.urgency === "imminent"
              ? "Votre garde commence bientôt, il reste une étape"
              : "Une garde attend votre confirmation",
          body:
            row.urgency === "imminent"
              ? `Vous échangez avec ${who}. Confirmez la garde pour que tout soit en place.`
              : `Vous échangez avec ${who} sans avoir confirmé la garde.`,
          link: `/sits/${row.sit_id}#candidatures`,
        });
        if (notifErr) {
          errors.push({ sit_id: row.sit_id, error: notifErr.message });
        } else {
          notificationsCreated += 1;
        }
      }
    }

    const metrics = {
      detected: rows.length,
      signals_inserted: signalsInserted,
      signals_skipped: signalsSkipped,
      emails_sent: emailsSent,
      emails_deferred: emailsDeferred,
      emails_skipped: emailsSkipped,
      notifications_created: notificationsCreated,
      capped,
      errors_count: errors.length,
    };
    await run.finish(errors.length > 0 ? "partial" : "success", metrics);
    return new Response(
      JSON.stringify({ ...metrics, errors, generated_at: new Date().toISOString() }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (err) {
    console.error("[nudge-owner-unconfirmed-sit]", err);
    await run.fail(err);
    return new Response(
      JSON.stringify({ error: String((err as Error)?.message ?? err) }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
