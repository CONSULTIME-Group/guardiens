// publish-stale-reviews
// Publie tout avis non publié déposé depuis plus de 14 jours quand l'autre
// partie n'a rien soumis. Idempotent (filtre published=false).
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";
import { startCronRun } from "../_shared/cron-run-log.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

  const supabase = createClient(supabaseUrl, serviceKey);
  const run = await startCronRun("publish-stale-reviews");

  try {
    const cutoff = new Date(Date.now() - 14 * 86400_000).toISOString();

    const { data: candidates, error } = await supabase
      .from("reviews")
      .select("id, sit_id, reviewer_id, reviewee_id, created_at")
      .eq("published", false)
      .lt("created_at", cutoff)
      .limit(500);
    if (error) throw error;

    let published = 0;
    const errors: Array<{ review_id: string; reason: string }> = [];

    for (const r of candidates ?? []) {
      const { error: updErr } = await supabase
        .from("reviews")
        .update({ published: true } as any)
        .eq("id", r.id)
        .eq("published", false);
      if (updErr) {
        errors.push({ review_id: r.id, reason: updErr.message });
        continue;
      }
      published++;

      // Notification à la personne évaluée
      try {
        await supabase.from("notifications").insert({
          user_id: r.reviewee_id,
          type: "review_published",
          title: "Un avis vous concernant est publié",
          body: "L'avis déposé à votre sujet est désormais visible sur votre profil.",
          link: `/gardiens/${r.reviewee_id}`,
        });
      } catch (e) {
        console.warn("[publish-stale-reviews] notif failed", r.id, e);
      }
    }

    await run.finish("success", {
      candidates: candidates?.length ?? 0,
      published,
      errors: errors.length,
    });
    return new Response(JSON.stringify({ ok: true, published, errors }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    await run.fail(e);
    return new Response(JSON.stringify({ error: String(e) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
