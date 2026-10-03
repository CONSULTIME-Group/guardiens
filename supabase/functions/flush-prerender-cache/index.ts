// Ancien consommateur deprecie, sans appel Prerender ni acquittement propre.
import { requireAdminOrServiceRole } from "../_shared/require-admin.ts";
import { queuePrerenderRefresh } from "../_shared/queue-prerender-refresh.ts";
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  const denied = await requireAdminOrServiceRole(req, corsHeaders);
  if (denied) return denied;
  try { return await queuePrerenderRefresh(req, corsHeaders); }
  catch { return new Response(JSON.stringify({ error: "Refresh unavailable" }), {
    status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
  }); }
});
