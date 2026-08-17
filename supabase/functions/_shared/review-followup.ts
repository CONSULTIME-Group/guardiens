// Logique partagée des relances de dépôt d'avis (J+10 et J+20).
// La fenêtre de dépôt est de 30 jours après la fin de la garde.
// La relance ne part qu'à la partie qui n'a pas encore déposé son avis.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";
import { startCronRun } from "./cron-run-log.ts";
import { requireCronCaller } from "./require-cron-caller.ts";
import { recordReviewSendFailure } from "./review-send-failure.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

export interface ReviewFollowupConfig {
  edgeName: string;
  dayOffset: number;
  flagColumn: "review_j10_sent" | "review_j20_sent";
  stage: "j10" | "j20";
}

export function serveReviewFollowup(config: ReviewFollowupConfig) {
  Deno.serve(async (req) => {
    if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

    const guard = await requireCronCaller(req, corsHeaders, config.edgeName);
    if (guard) return guard;

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);
    const run = await startCronRun(config.edgeName);

    try {
      const now = Date.now();
      const day = 24 * 60 * 60 * 1000;
      // Fenêtre élargie à 3 jours de rattrapage (au lieu d'une) : un envoi qui
      // échoue laisse le drapeau à false et la garde est rejouée au run
      // suivant sans sortir de la fenêtre.
      const from = new Date(now - (config.dayOffset + 3) * day).toISOString().split("T")[0];
      const to = new Date(now - config.dayOffset * day).toISOString().split("T")[0];

      const { data: sits } = await supabase
        .from("sits")
        .select("id, title, end_date, user_id")
        .eq("status", "completed")
        .eq(config.flagColumn, false)
        .gte("end_date", from)
        .lte("end_date", to);

      let count = 0;
      let skipped = 0;
      const errors: string[] = [];

      for (const sit of sits || []) {
        try {
          const { data: apps } = await supabase
            .from("applications")
            .select("sitter_id")
            .eq("sit_id", sit.id)
            .eq("status", "accepted");

          const sitterId = apps?.[0]?.sitter_id ?? null;

          const { data: ownerProfile } = await supabase
            .from("profiles")
            .select("first_name, email")
            .eq("id", sit.user_id)
            .maybeSingle();

          const { data: sitterProfile } = sitterId
            ? await supabase
                .from("profiles")
                .select("first_name, email")
                .eq("id", sitterId)
                .maybeSingle()
            : { data: null };

          const parties = [
            { id: sit.user_id, profile: ownerProfile, isOwner: true },
            ...(sitterId && sitterProfile
              ? [{ id: sitterId, profile: sitterProfile, isOwner: false }]
              : []),
          ];

          // Même règle que send-avis-j1 : le drapeau n'est posé que si tous
          // les envois attendus ont été acceptés (2xx). Sinon la garde est
          // rejouée au run suivant et chaque échec est tracé.
          let allAccepted = true;

          for (const party of parties) {
            // Aucune relance si cette partie a déjà déposé son avis.
            const { data: existingReview } = await supabase
              .from("reviews")
              .select("id")
              .eq("sit_id", sit.id)
              .eq("reviewer_id", party.id)
              .limit(1);

            if (existingReview && existingReview.length > 0) {
              skipped++;
              continue;
            }

            const otherName = party.isOwner
              ? (sitterProfile?.first_name || "")
              : (ownerProfile?.first_name || "");

            if (!party.profile?.email) continue;

            const idempotencyKey = `review-${config.stage}-${party.id}-${sit.id}`;

            let res: Response;
            try {
              res = await fetch(`${supabaseUrl}/functions/v1/send-transactional-email`, {
                method: "POST",
                headers: {
                  "Content-Type": "application/json",
                  Authorization: `Bearer ${supabaseKey}`,
                },
                body: JSON.stringify({
                  templateName: "review-reminder",
                  recipientEmail: party.profile.email,
                  idempotencyKey,
                  templateData: {
                    firstName: party.profile.first_name || "",
                    sitTitle: sit.title || "",
                    revieweeName: otherName,
                    sitId: sit.id,
                    isOwner: party.isOwner,
                    stage: config.stage,
                  },
                  logMetadata: { sit_id: sit.id, source: config.edgeName },
                }),
              });
            } catch (fetchErr) {
              const msg = fetchErr instanceof Error ? fetchErr.message : String(fetchErr);
              console.error(`[${config.edgeName}] fetch threw`, sit.id, msg);
              errors.push(`${sit.id}: fetch_error`);
              allAccepted = false;
              await recordReviewSendFailure(supabase, {
                edgeName: config.edgeName,
                stage: config.stage,
                sitId: sit.id,
                sitTitle: sit.title,
                party: party.isOwner ? "owner" : "sitter",
                recipientEmail: party.profile.email,
                idempotencyKey,
                responseBody: msg,
              });
              continue;
            }
            if (!res.ok) {
              const body = await res.text().catch(() => "");
              console.error(`[${config.edgeName}] send failed`, res.status, body);
              errors.push(`${sit.id}: send_failed_${res.status}`);
              allAccepted = false;
              await recordReviewSendFailure(supabase, {
                edgeName: config.edgeName,
                stage: config.stage,
                sitId: sit.id,
                sitTitle: sit.title,
                party: party.isOwner ? "owner" : "sitter",
                recipientEmail: party.profile.email,
                idempotencyKey,
                httpStatus: res.status,
                responseBody: body,
              });
              continue;
            }
            count++;
          }

          // Le drapeau passe à true si personne n'avait à être relancé ou si
          // tous les envois ont été acceptés. Un échec le laisse à false :
          // rejeu automatique au prochain run.
          if (allAccepted) {
            await supabase.from("sits").update({ [config.flagColumn]: true }).eq("id", sit.id);
          }
        } catch (e) {
          const msg = e instanceof Error ? e.message : String(e);
          console.error(`[${config.edgeName}] sit failed`, sit.id, msg);
          errors.push(`${sit.id}: ${msg}`);
          await recordReviewSendFailure(supabase, {
            edgeName: config.edgeName,
            stage: config.stage,
            sitId: sit.id,
            sitTitle: sit.title,
            party: "unknown",
            idempotencyKey: `review-${config.stage}-${sit.id}`,
            responseBody: msg,
          });
        }
      }

      await run.finish(errors.length > 0 ? "partial" : "success", {
        sent: count,
        already_reviewed: skipped,
        errors: errors.length,
        error_samples: errors.slice(0, 5),
      });

      return new Response(JSON.stringify({ sent: count, skipped, errors: errors.length }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    } catch (e) {
      await run.fail(e);
      throw e;
    }
  });
}
