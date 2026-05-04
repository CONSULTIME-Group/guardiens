// Edge function: invalidate Prerender.io cache for one or more URLs.
// Triggered by Postgres triggers on articles / seo_city_pages / city_guides
// when canonical_url, noindex, meta_title or meta_description changes.

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const PRERENDER_TOKEN = Deno.env.get("PRERENDER_TOKEN");
const PRERENDER_RECACHE_URL = "https://api.prerender.io/recache";

interface RecacheRequest {
  urls: string[];
}

function isValidUrl(u: unknown): u is string {
  if (typeof u !== "string") return false;
  try {
    const parsed = new URL(u);
    return parsed.protocol === "https:" || parsed.protocol === "http:";
  } catch {
    return false;
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  if (!PRERENDER_TOKEN) {
    return new Response(
      JSON.stringify({ error: "PRERENDER_TOKEN not configured" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  }

  let body: RecacheRequest;
  try {
    body = await req.json();
  } catch {
    return new Response(JSON.stringify({ error: "Invalid JSON" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const urls = Array.isArray(body?.urls)
    ? body.urls.filter(isValidUrl).slice(0, 50)
    : [];

  if (urls.length === 0) {
    return new Response(JSON.stringify({ error: "No valid URLs" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const results: Array<{ url: string; ok: boolean; status?: number; error?: string }> = [];

  // Prerender.io accepts one URL per call. Send sequentially with small delay.
  for (const url of urls) {
    try {
      const r = await fetch(PRERENDER_RECACHE_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prerenderToken: PRERENDER_TOKEN, url }),
      });
      results.push({ url, ok: r.ok, status: r.status });
      console.log(`[prerender-recache] ${url} → ${r.status}`);
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      results.push({ url, ok: false, error: msg });
      console.error(`[prerender-recache] ${url} failed: ${msg}`);
    }
  }

  const allOk = results.every((r) => r.ok);
  return new Response(JSON.stringify({ ok: allOk, results }), {
    status: allOk ? 200 : 207,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});
