// publish-stale-reviews
// Publie tout avis non publie depose depuis plus de 14 jours quand l'autre
// partie n'a rien soumis. Delegue a la RPC SECURITY DEFINER
// public.publish_stale_reviews, seule capable de poser le drapeau
// app.review_publisher qui autorise le passage des triggers de garde.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";
import { startCronRun } from "../_shared/cron-run-log.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const STALE_DAYS = 14;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

  const supabase = createClient(supabaseUrl, serviceKey);
  const run = await startCronRun("publish-stale-reviews");

  try {
    // Recupere les avis concernes avant publication, pour pouvoir notifier.
    const cutoff = new Date(Date.now() - STALE_DAYS * 86400_000).toISOString();
    const { data: candidates } = await supabase
      .from("reviews")
      .select("id, reviewee_id")
      .eq("published", false)
      .lt("created_at", cutoff)
      .limit(500);

    const { data: publishedCount, error: rpcErr } = await supabase.rpc(
      "publish_stale_reviews",
      { p_days: STALE_DAYS },
    );
    if (rpcErr) throw rpcErr;

    const published = (publishedCount as number) ?? 0;
    let notified = 0;

    if (published > 0) {
      for (const r of candidates ?? []) {
        try {
          await supabase.from("notifications").insert({
            user_id: r.reviewee_id,
            type: "review_published",
            title: "Un avis vous concernant est publie",
            body: "L'avis depose a votre sujet est desormais visible sur votre profil.",
            link: `/gardiens/${r.reviewee_id}`,
          });
          notified++;
        } catch (e) {
          console.warn("[publish-stale-reviews] notif failed", r.id, e);
        }
      }
    }

    await run.finish("success", {
      candidates: candidates?.length ?? 0,
      published,
      notified,
    });
    return new Response(JSON.stringify({ ok: true, published, notified }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error("[publish-stale-reviews] failed", msg);
    await run.fail(e);
    return new Response(JSON.stringify({ ok: false, error: msg }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

