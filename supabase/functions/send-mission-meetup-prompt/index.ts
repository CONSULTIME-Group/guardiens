/**
 * send-mission-meetup-prompt
 * -------------------------------------------------------------------------
 * Entraide, fin d'échange. Passage horaire.
 *
 * Pour chaque besoin en cours dont le coup de main a été retenu, le lendemain
 * de sa date (ou trois jours après l'acceptation quand aucune date n'est
 * indiquée), une relance part aux deux personnes : « Vous vous êtes
 * rencontrés ? », avec deux boutons par jeton à usage unique.
 *
 * Garde-fou : seuls les besoins dont la date de référence tombe après la mise
 * en service du dispositif sont relancés.
 */
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import { requireCronCaller } from "../_shared/require-cron-caller.ts";
import { startCronRun } from "../_shared/cron-run-log.ts";
import { isMeetupDue, MEETUP_PROMPT_TITLE, meetupPromptBody } from "../_shared/mission-meetup.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

async function sendEmail(payload: Record<string, unknown>) {
  const res = await fetch(`${SUPABASE_URL}/functions/v1/send-transactional-email`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${SERVICE_KEY}`,
      apikey: SERVICE_KEY,
    },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    console.error("[send-mission-meetup-prompt] email failed", res.status, await res.text().catch(() => ""));
  }
  return res.ok;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const denied = await requireCronCaller(req, corsHeaders, "send-mission-meetup-prompt");
  if (denied) return denied;

  const supabase = createClient(SUPABASE_URL, SERVICE_KEY, { auth: { persistSession: false } });
  const now = new Date();

  try {
    const { data: missions, error } = await supabase
      .from("small_missions")
      .select("id, title, city, user_id, date_needed, end_date")
      .eq("status", "in_progress")
      .eq("mission_type", "besoin")
      .is("meetup_prompt_sent_at", null)
      .order("created_at", { ascending: true })
      .limit(200);
    if (error) throw error;

    let prompted = 0;
    let emails = 0;
    const details: Array<Record<string, unknown>> = [];

    for (const mission of missions ?? []) {
      const { data: response } = await supabase
        .from("small_mission_responses")
        .select("responder_id, accepted_at, created_at")
        .eq("mission_id", mission.id)
        .eq("status", "accepted")
        .order("created_at", { ascending: true })
        .limit(1)
        .maybeSingle();
      if (!response) continue;

      const due = isMeetupDue(
        {
          end_date: mission.end_date,
          date_needed: mission.date_needed,
          accepted_at: response.accepted_at,
          response_created_at: response.created_at,
        },
        now,
      );
      if (!due) continue;

      const { data: tokens, error: tokenError } = await supabase.rpc("emit_mission_meetup_tokens", {
        p_mission_id: mission.id,
      });
      if (tokenError || !tokens?.ok) {
        console.error("[send-mission-meetup-prompt] tokens", mission.id, tokenError?.message ?? tokens?.reason);
        continue;
      }

      const people = (tokens.people ?? []) as Array<{
        user_id: string;
        role: "owner" | "helper";
        yes_token: string;
        no_token: string;
      }>;

      const ids = people.map((p) => p.user_id);
      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, first_name, email")
        .in("id", ids);
      const byId = new Map((profiles ?? []).map((p) => [p.id, p]));

      for (const person of people) {
        const me = byId.get(person.user_id);
        if (!me?.email) continue;
        const other = people.find((p) => p.user_id !== person.user_id);
        const otherProfile = other ? byId.get(other.user_id) : null;
        const otherName = otherProfile?.first_name ?? null;

        const ok = await sendEmail({
          templateName: person.role === "owner" ? "mission-meetup-confirm-owner" : "mission-meetup-confirm-helper",
          recipientEmail: me.email,
          idempotencyKey: `mission-meetup-${mission.id}-${person.user_id}`,
          templateData: person.role === "owner"
            ? {
              ownerFirstName: me.first_name ?? "",
              helperFirstName: otherName ?? "",
              missionTitle: mission.title ?? "",
              missionCity: mission.city ?? "",
              yesToken: person.yes_token,
              noToken: person.no_token,
            }
            : {
              helperFirstName: me.first_name ?? "",
              ownerFirstName: otherName ?? "",
              missionTitle: mission.title ?? "",
              missionCity: mission.city ?? "",
              yesToken: person.yes_token,
              noToken: person.no_token,
            },
          logMetadata: { mission_id: mission.id, source: "mission_meetup" },
        });
        if (ok) emails++;

        await supabase.from("notifications").insert({
          user_id: person.user_id,
          type: "mission_meetup_prompt",
          title: MEETUP_PROMPT_TITLE,
          body: meetupPromptBody(otherName, mission.title),
          link: "/tableau-de-bord",
        });
      }

      await supabase
        .from("small_missions")
        .update({ meetup_prompt_sent_at: new Date().toISOString() })
        .eq("id", mission.id);

      prompted++;
      details.push({ mission_id: mission.id, people: people.length });
    }

    if (prompted > 0) {
      const run = await startCronRun("send-mission-meetup-prompt");
      await run.finish("success", { missions_prompted: prompted, emails_sent: emails, details });
    }

    return json({ ok: true, missions_prompted: prompted, emails_sent: emails, details });
  } catch (e) {
    const run = await startCronRun("send-mission-meetup-prompt");
    await run.fail(e);
    console.error("[send-mission-meetup-prompt] fatal", e);
    return json({ ok: false, error: String(e) }, 500);
  }
});
