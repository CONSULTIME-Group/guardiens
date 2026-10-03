// Compatibilite admin : toutes les demandes rejoignent la file commune.
import { requireCronCaller } from "../_shared/require-cron-caller.ts";
import { queuePrerenderRefresh } from "../_shared/queue-prerender-refresh.ts";
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  const guard = await requireCronCaller(req, corsHeaders, "prerender-recache-pending");
  if (guard) return guard;
  try { return await queuePrerenderRefresh(req, corsHeaders); }
  catch { return new Response(JSON.stringify({ error: "Refresh unavailable" }), {
    status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
  }); }
});
