/**
 * send-mission-choose-prompt
 * -------------------------------------------------------------------------
 * Lot E17 « La boucle tenue » : la relance « C'est {prénom} qui vous aide ? »
 * (mission-choose-helper), qui exigeait un message de chaque côté puis 48 h,
 * n'est jamais partie (0 envoi depuis sa mise en service). Elle est fondue
 * dans la relance du demandeur à 24 h (send-mission-nudges,
 * mission-response-waiting), qui porte un bouton « Choisir {prénom} » par
 * répondant en attente, une seule fois par réponse (choose_prompt_sent_at).
 *
 * La tâche planifiée est retirée par la migration 0099. Cette fonction reste
 * déployée sans effet, pour qu'un appel résiduel n'envoie jamais un second
 * email pour la même réponse.
 */
import { requireCronCaller } from "../_shared/require-cron-caller.ts";
import { startCronRun } from "../_shared/cron-run-log.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  const denied = await requireCronCaller(req, corsHeaders, "send-mission-choose-prompt");
  if (denied) return denied;
  const run = await startCronRun("send-mission-choose-prompt");
  try {
    await run.finish("success", { sent: 0, merged_into: "send-mission-nudges" });
    return json({ ok: true, sent: 0, merged_into: "send-mission-nudges" });
  } catch (e) {
    await run.fail(e);
    return json({ ok: false }, 500);
  }
});
