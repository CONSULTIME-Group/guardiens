// Bing Webmaster Tools API, équivalent fetch-seo-data côté Google.
// Doc : https://learn.microsoft.com/en-us/bingwebmaster/getting-access
//
// Endpoints utilisés :
//   GetRankAndTrafficStats        clics + impressions agrégés (30j)
//   GetQueryStats                 top requêtes
//   GetPageStats                  top pages
//
// Auth : ?apikey=XXX en query string. Pas d'OAuth requis.

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const SITE_URL = "https://guardiens.fr/";
const BASE = "https://ssl.bing.com/webmaster/api.svc/json";

async function bing(endpoint: string, apiKey: string): Promise<unknown> {
  const url = `${BASE}/${endpoint}?apikey=${encodeURIComponent(apiKey)}&siteUrl=${encodeURIComponent(SITE_URL)}`;
  const res = await fetch(url, { headers: { Accept: "application/json" } });
  const text = await res.text();
  if (!res.ok) throw new Error(`Bing ${endpoint} ${res.status}: ${text.slice(0, 300)}`);
  try { return JSON.parse(text); } catch { return { raw: text }; }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const apiKey = Deno.env.get("BING_WEBMASTER_API_KEY");
  if (!apiKey) {
    return new Response(
      JSON.stringify({ error: "BING_WEBMASTER_API_KEY not configured" }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }

  try {
    const [traffic, queries, pages] = await Promise.all([
      bing("GetRankAndTrafficStats", apiKey).catch((e) => ({ error: String(e) })),
      bing("GetQueryStats", apiKey).catch((e) => ({ error: String(e) })),
      bing("GetPageStats", apiKey).catch((e) => ({ error: String(e) })),
    ]);

    return new Response(
      JSON.stringify({
        site: SITE_URL,
        updated_at: new Date().toISOString(),
        traffic,
        queries,
        pages,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (e) {
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : String(e) }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
