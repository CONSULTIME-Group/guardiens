// publish-stale-reviews
// Publie tout avis non publie depose depuis plus de 14 jours quand l'autre
// partie n'a rien soumis. Delegue a la RPC SECURITY DEFINER
// public.publish_stale_reviews, seule capable de poser le drapeau
// app.review_publisher qui autorise le passage des triggers de garde.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";
import { startCronRun } from "../_shared/cron-run-log.ts";
import { requireCronCaller } from "../_shared/require-cron-caller.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const STALE_DAYS = 14;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const guard = await requireCronCaller(req, corsHeaders, "publish-stale-reviews");
  if (guard) return guard;

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

  const supabase = createClient(supabaseUrl, serviceKey);
  const run = await startCronRun("publish-stale-reviews");

  try {
    // Lot Z : aucune notification ecrite ici. Le passage a published = true
    // declenche le trigger on_review_notify (notify_review_published), qui
    // notifie deja la personne evaluee : l'insertion d'ici faisait doublon.
    const { data: publishedCount, error: rpcErr } = await supabase.rpc(
      "publish_stale_reviews",
      { p_days: STALE_DAYS },
    );
    if (rpcErr) throw rpcErr;

    const published = (publishedCount as number) ?? 0;

    await run.finish("success", { published });
    return new Response(JSON.stringify({ ok: true, published }), {
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

