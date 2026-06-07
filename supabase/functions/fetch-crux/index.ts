// Chrome UX Report API (Core Web Vitals données réelles).
// Doc: https://developer.chrome.com/docs/crux/api
//
// POST { origin?: "https://guardiens.fr", url?: "https://guardiens.fr/path" }
// Renvoie LCP, INP, CLS p75 sur 28 derniers jours (phone + desktop).
//
// Nécessite secret CRUX_API_KEY (API key Google avec CrUX API activée).

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const DEFAULT_ORIGIN = "https://guardiens.fr";

async function queryCrux(apiKey: string, payload: Record<string, unknown>) {
  const res = await fetch(`https://chromeuxreport.googleapis.com/v1/records:queryRecord?key=${apiKey}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  const text = await res.text();
  try {
    const data = JSON.parse(text);
    return { ok: res.ok, status: res.status, data };
  } catch {
    return { ok: false, status: res.status, data: { error: { message: text.slice(0, 300) } } };
  }
}

function extractMetrics(record: any) {
  const m = record?.record?.metrics ?? {};
  const get = (key: string) => {
    const v = m[key];
    if (!v) return null;
    return {
      p75: v.percentiles?.p75 ?? null,
      good: v.histogram?.[0]?.density ?? null,
      ni: v.histogram?.[1]?.density ?? null,
      poor: v.histogram?.[2]?.density ?? null,
    };
  };
  return {
    lcp: get("largest_contentful_paint"),
    inp: get("interaction_to_next_paint"),
    cls: get("cumulative_layout_shift"),
    fcp: get("first_contentful_paint"),
    ttfb: get("experimental_time_to_first_byte"),
    collectionPeriod: record?.record?.collectionPeriod ?? null,
  };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const apiKey = Deno.env.get("CRUX_API_KEY");
  if (!apiKey) {
    return new Response(JSON.stringify({ error: "CRUX_API_KEY not configured" }), {
      status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    let origin = DEFAULT_ORIGIN;
    let specificUrl: string | undefined;
    if (req.method === "POST") {
      const body = await req.json().catch(() => ({}));
      if (typeof body?.origin === "string") origin = body.origin;
      if (typeof body?.url === "string") specificUrl = body.url;
    }

    const target = specificUrl ? { url: specificUrl } : { origin };

    const [phone, desktop] = await Promise.all([
      queryCrux(apiKey, { ...target, formFactor: "PHONE" }),
      queryCrux(apiKey, { ...target, formFactor: "DESKTOP" }),
    ]);

    return new Response(
      JSON.stringify({
        target,
        updated_at: new Date().toISOString(),
        phone: phone.ok ? extractMetrics(phone.data) : { error: phone.data?.error?.message ?? "no data" },
        desktop: desktop.ok ? extractMetrics(desktop.data) : { error: desktop.data?.error?.message ?? "no data" },
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (e) {
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : String(e) }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
