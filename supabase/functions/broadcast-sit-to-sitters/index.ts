/**
 * broadcast-sit-to-sitters — DEPRECATED wrapper.
 *
 * Cette fonction est conservée uniquement pour ne pas casser les appelants
 * historiques. Elle redirige immédiatement vers `send-listing-proximity`,
 * unique source de vérité pour la diffusion d'une annonce aux gardiens de
 * proximité (template riche, plafond 2000 km, fallback ville, etc.).
 *
 * Ne rien ajouter ici. Toute évolution doit se faire dans
 * `send-listing-proximity`.
 */
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  console.warn(
    "[broadcast-sit-to-sitters] DEPRECATED. Use send-listing-proximity instead.",
  );

  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;

    const authHeader = req.headers.get("Authorization") ?? "";
    const payload = await req.json().catch(() => ({}));

    const client = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    });

    // Forward everything (mode, sit_id, radius_km, signal_id) to the canonical
    // function. `subject` and `body` from legacy callers are intentionally
    // ignored: the new template is prescriptive and rich.
    const { data, error } = await client.functions.invoke(
      "send-listing-proximity",
      {
        body: {
          mode: payload?.mode ?? "preview",
          sit_id: payload?.sit_id,
          radius_km: payload?.radius_km,
          signal_id: payload?.signal_id ?? null,
        },
      },
    );

    if (error) {
      return new Response(
        JSON.stringify({ error: error.message ?? String(error) }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    return new Response(JSON.stringify(data), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("[broadcast-sit-to-sitters wrapper]", err);
    return new Response(
      JSON.stringify({ error: String((err as Error)?.message ?? err) }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  }
});
