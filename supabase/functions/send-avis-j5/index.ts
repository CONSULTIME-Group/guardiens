import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";
import { startCronRun } from "../_shared/cron-run-log.ts";
import { requireCronCaller } from "../_shared/require-cron-caller.ts";
import { recordReviewSendFailure } from "../_shared/review-send-failure.ts";


const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const guard = await requireCronCaller(req, corsHeaders, "send-avis-j5");
  if (guard) return guard;

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const supabase = createClient(supabaseUrl, supabaseKey);
  const run = await startCronRun("send-avis-j5");

  try {
    const now = new Date();

    // Fenetre elargie a 3 jours de rattrapage (au lieu d'une) : un envoi qui
    // echoue laisse le drapeau a false et la garde est rejouee au run suivant
    // sans sortir de la fenetre.
    const d5ago = new Date(now.getTime() - 5 * 24 * 60 * 60 * 1000).toISOString().split("T")[0];
    const d8ago = new Date(now.getTime() - 8 * 24 * 60 * 60 * 1000).toISOString().split("T")[0];

    const { data: sits } = await supabase
      .from("sits")
      .select("id, title, end_date, user_id")
      .eq("status", "completed")
      .eq("review_j1_sent", true)
      .eq("review_j5_sent", false)
      .gte("end_date", d8ago)
      .lte("end_date", d5ago);

    let count = 0;
    const errors: string[] = [];

    for (const sit of sits || []) {
      try {
        const { data: apps } = await supabase
          .from("applications")
          .select("sitter_id")
          .eq("sit_id", sit.id)
          .eq("status", "accepted");

        const sitterId = apps?.[0]?.sitter_id;

        const { data: ownerProfile } = await supabase
          .from("profiles")
          .select("first_name, email")
          .eq("id", sit.user_id)
          .single();

        const sitterProfile = sitterId
          ? (await supabase.from("profiles").select("first_name, email").eq("id", sitterId).single()).data
          : null;

        const parties = [
          {
            role: "owner" as const,
            userId: sit.user_id,
            profile: ownerProfile,
            isOwner: true,
            revieweeName: sitterProfile?.first_name || "",
          },
          ...(sitterId && sitterProfile
            ? [{
                role: "sitter" as const,
                userId: sitterId,
                profile: sitterProfile,
                isOwner: false,
                revieweeName: ownerProfile?.first_name || "",
              }]
            : []),
        ];

        // Meme regle que send-avis-j1 : le drapeau n'est pose que si tous les
        // envois attendus ont ete acceptes. Sinon la garde est rejouee (la
        // cle d'idempotence protege la partie deja relancee) et l'echec est
        // trace dans email_send_log + signaux admin.
        let allAccepted = true;

        for (const party of parties) {
          // Aucune relance si cette partie a deja depose son avis.
          const { data: existingReview } = await supabase
            .from("reviews")
            .select("id")
            .eq("sit_id", sit.id)
            .eq("reviewer_id", party.userId)
            .limit(1);

          if (existingReview && existingReview.length > 0) continue;
          if (!party.profile?.email) continue;

          const idempotencyKey = `review-j5-${party.userId}-${sit.id}`;

          let res: Response;
          try {
            res = await fetch(`${supabaseUrl}/functions/v1/send-transactional-email`, {
              method: "POST",
              headers: { "Content-Type": "application/json", Authorization: `Bearer ${supabaseKey}` },
              body: JSON.stringify({
                templateName: "review-reminder",
                recipientEmail: party.profile.email,
                idempotencyKey,
                templateData: {
                  firstName: party.profile.first_name || "",
                  sitTitle: sit.title || "",
                  revieweeName: party.revieweeName,
                  sitId: sit.id,
                  isOwner: party.isOwner,
                  stage: "j5",
                },
                logMetadata: { sit_id: sit.id, source: "send-avis-j5" },
              }),
            });
          } catch (fetchErr) {
            const msg = fetchErr instanceof Error ? fetchErr.message : String(fetchErr);
            console.error("[avis-j5] fetch threw", sit.id, party.role, msg);
            errors.push(`${sit.id}: ${party.role} fetch_error`);
            allAccepted = false;
            await recordReviewSendFailure(supabase, {
              edgeName: "send-avis-j5",
              stage: "j5",
              sitId: sit.id,
              sitTitle: sit.title,
              party: party.role,
              recipientEmail: party.profile.email,
              idempotencyKey,
              responseBody: msg,
            });
            continue;
          }

          if (res.ok) {
            count++;
            continue;
          }

          const bodyText = await res.text().catch(() => "");
          console.error("[avis-j5] send failed", sit.id, party.role, res.status, bodyText);
          errors.push(`${sit.id}: ${party.role} http_${res.status}`);
          allAccepted = false;
          await recordReviewSendFailure(supabase, {
            edgeName: "send-avis-j5",
            stage: "j5",
            sitId: sit.id,
            sitTitle: sit.title,
            party: party.role,
            recipientEmail: party.profile.email,
            idempotencyKey,
            httpStatus: res.status,
            responseBody: bodyText,
          });
        }

        if (allAccepted) {
          await supabase.from("sits").update({ review_j5_sent: true }).eq("id", sit.id);
        }
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        console.error("[avis-j5] sit failed", sit.id, msg);
        errors.push(`${sit.id}: ${msg}`);
        await recordReviewSendFailure(supabase, {
          edgeName: "send-avis-j5",
          stage: "j5",
          sitId: sit.id,
          sitTitle: sit.title,
          party: "unknown",
          idempotencyKey: `review-j5-${sit.id}`,
          responseBody: msg,
        });
      }
    }

    await run.finish(errors.length > 0 ? "partial" : "success", {
      sent: count,
      errors: errors.length,
      error_samples: errors.slice(0, 5),
    });
    return new Response(JSON.stringify({ sent: count, errors: errors.length }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    await run.fail(e);
    throw e;
  }
});
