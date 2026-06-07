// Bing Webmaster Tools API.
// Doc : https://learn.microsoft.com/en-us/bingwebmaster/getting-access
//
// Endpoints utilisés :
//   GetRankAndTrafficStats   clics + impressions par jour
//   GetQueryStats            top requêtes
//   GetPageStats             top pages
//   GetLinkCounts            backlinks (top 1000)
//
// Paramètre ?period=7|28|90 (défaut 28) pour la fenêtre courante et précédente.

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const SITE_URL = "https://guardiens.fr/";
const BASE = "https://ssl.bing.com/webmaster/api.svc/json";

interface BingDailyRow {
  Date?: string;
  Clicks?: number;
  Impressions?: number;
  AvgClickPosition?: number;
  AvgImpressionPosition?: number;
}

interface BingListResponse<T> { d?: T[]; }

async function bing<T = unknown>(endpoint: string, apiKey: string): Promise<T> {
  const url = `${BASE}/${endpoint}?apikey=${encodeURIComponent(apiKey)}&siteUrl=${encodeURIComponent(SITE_URL)}`;
  const res = await fetch(url, { headers: { Accept: "application/json" } });
  const text = await res.text();
  if (!res.ok) throw new Error(`Bing ${endpoint} ${res.status}: ${text.slice(0, 300)}`);
  try { return JSON.parse(text) as T; } catch { return { raw: text } as unknown as T; }
}

function parseBingDate(raw: string | undefined): number | null {
  if (!raw) return null;
  const m = raw.match(/\/Date\((-?\d+)\)\//);
  if (m) return Number(m[1]);
  const t = Date.parse(raw);
  return Number.isFinite(t) ? t : null;
}

interface PeriodTotals {
  clicks: number;
  impressions: number;
  ctr: number;
  position: number;
}

function summarize(rows: BingDailyRow[], startMs: number, endMs: number): PeriodTotals {
  let clicks = 0, impressions = 0, posSum = 0, posCount = 0;
  for (const r of rows) {
    const t = parseBingDate(r.Date);
    if (t === null || t < startMs || t > endMs) continue;
    clicks += Number(r.Clicks) || 0;
    impressions += Number(r.Impressions) || 0;
    const p = Number(r.AvgImpressionPosition);
    if (Number.isFinite(p) && p > 0) { posSum += p; posCount += 1; }
  }
  return {
    clicks,
    impressions,
    ctr: impressions > 0 ? clicks / impressions : 0,
    position: posCount > 0 ? posSum / posCount : 0,
  };
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

  // Période demandée par le client
  let periodDays = 28;
  try {
    const url = new URL(req.url);
    const p = Number(url.searchParams.get("period"));
    if ([7, 28, 90].includes(p)) periodDays = p;
  } catch {}

  try {
    const [trafficRaw, queriesRaw, pagesRaw, linksRaw] = await Promise.all([
      bing<BingListResponse<BingDailyRow>>("GetRankAndTrafficStats", apiKey).catch((e) => ({ error: String(e) }) as any),
      bing("GetQueryStats", apiKey).catch((e) => ({ error: String(e) })),
      bing("GetPageStats", apiKey).catch((e) => ({ error: String(e) })),
      bing("GetLinkCounts?page=0", apiKey).catch((e) => ({ error: String(e) })),
    ]);

    let summary: { current: PeriodTotals; previous: PeriodTotals; byDay: Array<{ date: string; clicks: number; impressions: number }> } | null = null;
    const rows = (trafficRaw && "d" in trafficRaw ? (trafficRaw as BingListResponse<BingDailyRow>).d : undefined) || [];
    if (rows.length > 0) {
      const now = Date.now();
      const day = 86400000;
      const currentStart = now - periodDays * day;
      const previousEnd = currentStart - 1;
      const previousStart = previousEnd - periodDays * day;

      const current = summarize(rows, currentStart, now);
      const previous = summarize(rows, previousStart, previousEnd);

      const byDay = rows
        .map((r) => {
          const t = parseBingDate(r.Date);
          if (t === null || t < currentStart) return null;
          return {
            date: new Date(t).toISOString().slice(0, 10),
            clicks: Number(r.Clicks) || 0,
            impressions: Number(r.Impressions) || 0,
          };
        })
        .filter((x): x is { date: string; clicks: number; impressions: number } => x !== null)
        .sort((a, b) => a.date.localeCompare(b.date));

      summary = { current, previous, byDay };
    }

    return new Response(
      JSON.stringify({
        site: SITE_URL,
        period_days: periodDays,
        updated_at: new Date().toISOString(),
        summary,
        traffic: trafficRaw,
        queries: queriesRaw,
        pages: pagesRaw,
        links: linksRaw,
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
