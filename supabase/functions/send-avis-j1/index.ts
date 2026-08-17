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

  const guard = await requireCronCaller(req, corsHeaders, "send-avis-j1");
  if (guard) return guard;

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const supabase = createClient(supabaseUrl, supabaseKey);
  const run = await startCronRun("send-avis-j1");

  try {
    const now = new Date();

    // Fenetre de rattrapage elargie a 4 jours (au lieu de 2), et statut
    // 'in_progress' accepte : si la transition de nuit echoue, la garde
    // reste 'in_progress' et doit quand meme declencher la demande d'avis.
    // Le flag review_j1_sent reste la garantie anti doublon. Depuis le
    // 17/08/2026, ce flag n'est pose que si tous les envois attendus ont ete
    // acceptes : la fenetre de 4 jours sert alors de rejeu automatique.
    const h24ago = new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString().split("T")[0];
    const d4ago = new Date(now.getTime() - 4 * 24 * 60 * 60 * 1000).toISOString().split("T")[0];

    const { data: sits } = await supabase
      .from("sits")
      .select("id, title, end_date, user_id, status")
      .in("status", ["confirmed", "in_progress", "completed"])
      .eq("review_j1_sent", false)
      .gte("end_date", d4ago)
      .lte("end_date", h24ago);

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

        // Forcage du statut final pour les gardes restees en 'confirmed'
        // ou en 'in_progress' faute de transition automatique.
        if (sit.status === "confirmed" || sit.status === "in_progress") {
          await supabase.from("sits").update({ status: "completed" }).eq("id", sit.id);
        }

        const parties = [
          {
            role: "owner" as const,
            profile: ownerProfile,
            isOwner: true,
            idempotencyKey: `review-j1-owner-${sit.id}`,
            revieweeName: sitterProfile?.first_name || "",
          },
          ...(sitterId && sitterProfile
            ? [{
                role: "sitter" as const,
                profile: sitterProfile,
                isOwner: false,
                idempotencyKey: `review-j1-sitter-${sit.id}`,
                revieweeName: ownerProfile?.first_name || "",
              }]
            : []),
        ];

        // Le drapeau ne passe a true que si chaque envoi attendu a ete
        // accepte (2xx : envoye, differe ou ecarte pour motif metier, tous
        // traces dans email_send_log). Toute reponse non-2xx ou erreur reseau
        // laisse le drapeau a false : la garde sera rejouee au prochain run,
        // et l'echec remonte dans email_send_log + signaux admin.
        let allAccepted = true;

        for (const party of parties) {
          if (!party.profile?.email) continue;

          let res: Response;
          try {
            res = await fetch(`${supabaseUrl}/functions/v1/send-transactional-email`, {
              method: "POST",
              headers: { "Content-Type": "application/json", Authorization: `Bearer ${supabaseKey}` },
              body: JSON.stringify({
                templateName: "review-reminder",
                recipientEmail: party.profile.email,
                idempotencyKey: party.idempotencyKey,
                templateData: {
                  firstName: party.profile.first_name || "",
                  sitTitle: sit.title || "",
                  revieweeName: party.revieweeName,
                  sitId: sit.id,
                  isOwner: party.isOwner,
                  stage: "j1",
                },
                logMetadata: { sit_id: sit.id, source: "send-avis-j1" },
              }),
            });
          } catch (fetchErr) {
            const msg = fetchErr instanceof Error ? fetchErr.message : String(fetchErr);
            console.error("[avis-j1] fetch threw", sit.id, party.role, msg);
            errors.push(`${sit.id}: ${party.role} fetch_error`);
            allAccepted = false;
            await recordReviewSendFailure(supabase, {
              edgeName: "send-avis-j1",
              stage: "j1",
              sitId: sit.id,
              sitTitle: sit.title,
              party: party.role,
              recipientEmail: party.profile.email,
              idempotencyKey: party.idempotencyKey,
              responseBody: msg,
            });
            continue;
          }

          if (res.ok) {
            count++;
            continue;
          }

          const bodyText = await res.text().catch(() => "");
          console.error("[avis-j1] send failed", sit.id, party.role, res.status, bodyText);
          errors.push(`${sit.id}: ${party.role} http_${res.status}`);
          allAccepted = false;
          await recordReviewSendFailure(supabase, {
            edgeName: "send-avis-j1",
            stage: "j1",
            sitId: sit.id,
            sitTitle: sit.title,
            party: party.role,
            recipientEmail: party.profile.email,
            idempotencyKey: party.idempotencyKey,
            httpStatus: res.status,
            responseBody: bodyText,
          });
        }

        if (allAccepted) {
          await supabase.from("sits").update({ review_j1_sent: true }).eq("id", sit.id);
        }
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        console.error("[avis-j1] sit failed", sit.id, msg);
        errors.push(`${sit.id}: ${msg}`);
        await recordReviewSendFailure(supabase, {
          edgeName: "send-avis-j1",
          stage: "j1",
          sitId: sit.id,
          sitTitle: sit.title,
          party: "unknown",
          idempotencyKey: `review-j1-${sit.id}`,
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
