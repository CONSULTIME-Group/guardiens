/**
 * send-mission-choose-prompt
 * -------------------------------------------------------------------------
 * Entraide, fermer la boucle. Passage horaire.
 *
 * 48 h après le premier échange de messages entre un demandeur et une personne
 * qui a dit « Je peux », sans choix entre-temps, un email part au demandeur :
 * « C'est {prénom} qui vous aide ? », avec un lien qui choisit la personne.
 *
 * Seuls les échanges postérieurs à la mise en service (27/09/2026) comptent,
 * une seule relance par réponse (choose_prompt_sent_at).
 */
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import { requireCronCaller } from "../_shared/require-cron-caller.ts";
import { startCronRun } from "../_shared/cron-run-log.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });

const firstName = (value?: string | null) => {
  const word = (value ?? "").trim().split(/\s+/)[0] ?? "";
  return word ? word.charAt(0).toUpperCase() + word.slice(1) : "";
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  const denied = await requireCronCaller(req, corsHeaders, "send-mission-choose-prompt");
  if (denied) return denied;

  const supabase = createClient(SUPABASE_URL, SERVICE_KEY, { auth: { persistSession: false } });
  const run = await startCronRun(supabase, "send-mission-choose-prompt");

  try {
    const { data: rows, error } = await supabase.rpc("mission_choose_prompt_candidates");
    if (error) throw error;

    let sent = 0;
    for (const row of (rows ?? []) as Array<{ response_id: string; mission_id: string; mission_title: string; owner_id: string; responder_id: string }>) {
      const { data: token } = await supabase.rpc("emit_mission_choose_token", { p_response_id: row.response_id });
      if (!token) continue;
      const { data: people } = await supabase.from("profiles").select("id, first_name, email").in("id", [row.owner_id, row.responder_id]);
      const owner = people?.find((p) => p.id === row.owner_id);
      const helper = people?.find((p) => p.id === row.responder_id);
      if (!owner?.email) continue;

      const res = await fetch(`${SUPABASE_URL}/functions/v1/send-transactional-email`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${SERVICE_KEY}`, apikey: SERVICE_KEY },
        body: JSON.stringify({
          templateName: "mission-choose-helper",
          recipientEmail: owner.email,
          idempotencyKey: `mission-choose-${row.response_id}`,
          templateData: {
            ownerFirstName: firstName(owner.first_name),
            helperFirstName: firstName(helper?.first_name),
            missionTitle: row.mission_title ?? "",
            chooseToken: token,
          },
          logMetadata: { mission_id: row.mission_id, source: "mission_choose_prompt" },
        }),
      });
      if (!res.ok) {
        console.error("[send-mission-choose-prompt] email failed", res.status, await res.text().catch(() => ""));
        continue;
      }
      await supabase.rpc("mark_mission_choose_prompt_sent", { p_response_id: row.response_id });
      sent++;
    }

    await run?.ok?.({ sent, candidates: rows?.length ?? 0 });
    return json({ ok: true, sent, candidates: rows?.length ?? 0 });
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    console.error("[send-mission-choose-prompt]", message);
    await run?.fail?.(message);
    return json({ ok: false, error: message }, 500);
  }
});
