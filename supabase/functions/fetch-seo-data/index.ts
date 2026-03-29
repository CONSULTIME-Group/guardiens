import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const GSC_SITE_URL = "https://guardiens.fr/";

// ---------- Google JWT Auth ----------

async function importPrivateKey(pem: string): Promise<CryptoKey> {
  const pemContents = pem
    .replace(/-----BEGIN PRIVATE KEY-----/, "")
    .replace(/-----END PRIVATE KEY-----/, "")
    .replace(/\s/g, "");
  const binaryDer = Uint8Array.from(atob(pemContents), (c) => c.charCodeAt(0));
  return crypto.subtle.importKey(
    "pkcs8",
    binaryDer,
    { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
    false,
    ["sign"]
  );
}

function base64url(data: Uint8Array | string): string {
  const str =
    typeof data === "string"
      ? btoa(data)
      : btoa(String.fromCharCode(...data));
  return str.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

async function createGoogleJWT(
  serviceAccount: { client_email: string; private_key: string },
  scopes: string[]
): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  const header = { alg: "RS256", typ: "JWT" };
  const payload = {
    iss: serviceAccount.client_email,
    scope: scopes.join(" "),
    aud: "https://oauth2.googleapis.com/token",
    exp: now + 3600,
    iat: now,
  };

  const headerB64 = base64url(JSON.stringify(header));
  const payloadB64 = base64url(JSON.stringify(payload));
  const signingInput = `${headerB64}.${payloadB64}`;

  const key = await importPrivateKey(serviceAccount.private_key);
  const signature = new Uint8Array(
    await crypto.subtle.sign(
      "RSASSA-PKCS1-v1_5",
      key,
      new TextEncoder().encode(signingInput)
    )
  );

  return `${signingInput}.${base64url(signature)}`;
}

async function getAccessToken(
  serviceAccount: { client_email: string; private_key: string },
  scopes: string[]
): Promise<string> {
  const jwt = await createGoogleJWT(serviceAccount, scopes);
  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: `grant_type=urn%3Aietf%3Aparams%3Aoauth%3Agrant-type%3Ajwt-bearer&assertion=${jwt}`,
  });
  const data = await res.json();
  if (!data.access_token) throw new Error(`Token error: ${JSON.stringify(data)}`);
  return data.access_token;
}

// ---------- GA4 API ----------

interface GA4Metrics {
  sessions: number;
  activeUsers: number;
  screenPageViews: number;
  averageSessionDuration: number;
  sessionsByDay: { date: string; sessions: number }[];
}

async function fetchGA4Data(
  accessToken: string,
  propertyId: string,
  startDate: string,
  endDate: string,
  includeDailyBreakdown = false
): Promise<GA4Metrics> {
  const baseBody = {
    dateRanges: [{ startDate, endDate }],
    metrics: [
      { name: "sessions" },
      { name: "activeUsers" },
      { name: "screenPageViews" },
      { name: "averageSessionDuration" },
    ],
  };

  const res = await fetch(
    `https://analyticsdata.googleapis.com/v1beta/properties/${propertyId}:runReport`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(baseBody),
    }
  );
  const data = await res.json();

  const row = data.rows?.[0]?.metricValues || [];
  const result: GA4Metrics = {
    sessions: parseInt(row[0]?.value || "0"),
    activeUsers: parseInt(row[1]?.value || "0"),
    screenPageViews: parseInt(row[2]?.value || "0"),
    averageSessionDuration: parseFloat(row[3]?.value || "0"),
    sessionsByDay: [],
  };

  if (includeDailyBreakdown) {
    const dailyRes = await fetch(
      `https://analyticsdata.googleapis.com/v1beta/properties/${propertyId}:runReport`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          dateRanges: [{ startDate, endDate }],
          dimensions: [{ name: "date" }],
          metrics: [{ name: "sessions" }],
          orderBys: [{ dimension: { dimensionName: "date" } }],
        }),
      }
    );
    const dailyData = await dailyRes.json();
    result.sessionsByDay = (dailyData.rows || []).map((r: any) => ({
      date: r.dimensionValues[0].value,
      sessions: parseInt(r.metricValues[0].value || "0"),
    }));
  }

  return result;
}

// ---------- GSC API ----------

interface GSCMetrics {
  clicks: number;
  impressions: number;
  ctr: number;
  position: number;
}

interface GSCRow extends GSCMetrics {
  keys: string[];
}

async function fetchGSCData(
  accessToken: string,
  startDate: string,
  endDate: string,
  dimensions: string[] = [],
  rowLimit = 25
): Promise<{ totals: GSCMetrics; rows: GSCRow[] }> {
  const body: any = { startDate, endDate, rowLimit };
  if (dimensions.length > 0) body.dimensions = dimensions;

  const res = await fetch(
    `https://searchconsole.googleapis.com/webmasters/v3/sites/${encodeURIComponent(
      GSC_SITE_URL
    )}/searchAnalytics/query`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    }
  );
  const data = await res.json();

  const rows: GSCRow[] = (data.rows || []).map((r: any) => ({
    keys: r.keys || [],
    clicks: r.clicks || 0,
    impressions: r.impressions || 0,
    ctr: r.ctr || 0,
    position: r.position || 0,
  }));

  // Compute totals from all rows
  const totalClicks = rows.reduce((s, r) => s + r.clicks, 0);
  const totalImpressions = rows.reduce((s, r) => s + r.impressions, 0);
  const weightedPosition = totalImpressions > 0
    ? rows.reduce((s, r) => s + r.position * r.impressions, 0) / totalImpressions
    : 0;

  const totals: GSCMetrics = {
    clicks: totalClicks,
    impressions: totalImpressions,
    ctr: totalImpressions > 0 ? totalClicks / totalImpressions : 0,
    position: weightedPosition,
  };

  // If no dimensions were requested, use the single-row API totals
  if (dimensions.length === 0 && data.rows?.length > 0) {
    const r = data.rows[0];
    return {
      totals: {
        clicks: r.clicks || 0,
        impressions: r.impressions || 0,
        ctr: r.ctr || 0,
        position: r.position || 0,
      },
      rows: [],
    };
  }

  return { totals, rows };
}

// ---------- Date helpers ----------

function formatDate(d: Date): string {
  return d.toISOString().split("T")[0];
}

function daysAgo(n: number): Date {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d;
}

// ---------- Main Handler ----------

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const url = new URL(req.url);
    const forceRefresh = url.searchParams.get("refresh") === "true";

    // Check cache first (1 hour TTL)
    if (!forceRefresh) {
      const { data: cached } = await supabase
        .from("seo_cache")
        .select("data, updated_at")
        .eq("cache_key", "seo_dashboard")
        .single();

      if (cached) {
        const cacheAge = Date.now() - new Date(cached.updated_at).getTime();
        if (cacheAge < 3600000) {
          return new Response(
            JSON.stringify({ ...cached.data, cached: true, updated_at: cached.updated_at }),
            { headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }
      }
    }

    const saJson = Deno.env.get("GOOGLE_SERVICE_ACCOUNT_JSON");
    if (!saJson) {
      return new Response(
        JSON.stringify({ error: "GOOGLE_SERVICE_ACCOUNT_JSON not configured" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const serviceAccount = JSON.parse(saJson);
    const accessToken = await getAccessToken(serviceAccount, [
      "https://www.googleapis.com/auth/webmasters.readonly",
      "https://www.googleapis.com/auth/analytics.readonly",
    ]);

    const ga4PropertyId = Deno.env.get("GA4_PROPERTY_ID") || "530010609";

    // Date ranges
    const gscEnd = formatDate(daysAgo(3));
    const gscStart = formatDate(daysAgo(31));
    const gscPrevEnd = formatDate(daysAgo(32));
    const gscPrevStart = formatDate(daysAgo(60));

    const ga4End = formatDate(daysAgo(1));
    const ga4Start = formatDate(daysAgo(30));
    const ga4PrevEnd = formatDate(daysAgo(31));
    const ga4PrevStart = formatDate(daysAgo(60));

    // Fetch all data in parallel
    const [
      gscCurrent,
      gscPrevious,
      gscTopPages,
      gscTopQueries,
      ga4Current,
      ga4Previous,
    ] = await Promise.all([
      fetchGSCData(accessToken, gscStart, gscEnd),
      fetchGSCData(accessToken, gscPrevStart, gscPrevEnd),
      fetchGSCData(accessToken, gscStart, gscEnd, ["page"], 25),
      fetchGSCData(accessToken, gscStart, gscEnd, ["query"], 10),
      fetchGA4Data(accessToken, ga4PropertyId, ga4Start, ga4End, true),
      fetchGA4Data(accessToken, ga4PropertyId, ga4PrevStart, ga4PrevEnd, false),
    ]);

    const result = {
      ga4: {
        current: ga4Current,
        previous: ga4Previous,
        propertyId: ga4PropertyId,
      },
      gsc: {
        current: gscCurrent.totals,
        previous: gscPrevious.totals,
        topPages: gscTopPages.rows,
        topQueries: gscTopQueries.rows,
      },
      updated_at: new Date().toISOString(),
      cached: false,
    };

    // Cache the result
    await supabase
      .from("seo_cache")
      .upsert(
        {
          cache_key: "seo_dashboard",
          data: result,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "cache_key" }
      );

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("fetch-seo-data error:", error);

    try {
      const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
      const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
      const supabase = createClient(supabaseUrl, supabaseKey);
      const { data: cached } = await supabase
        .from("seo_cache")
        .select("data, updated_at")
        .eq("cache_key", "seo_dashboard")
        .single();

      if (cached) {
        const cacheAge = Date.now() - new Date(cached.updated_at).getTime();
        if (cacheAge < 86400000) {
          return new Response(
            JSON.stringify({
              ...cached.data,
              cached: true,
              stale: true,
              updated_at: cached.updated_at,
              error: "API error, showing cached data",
            }),
            { headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }
      }
    } catch (_) {}

    return new Response(
      JSON.stringify({ error: error.message || "Internal error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
