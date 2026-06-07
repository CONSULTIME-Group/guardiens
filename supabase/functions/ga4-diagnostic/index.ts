// GA4 diagnostic: Measurement ID, property ID, realtime users, last event date.
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const MEASUREMENT_ID = "G-9JP4VR1RRP"; // sync with src/lib/cookieConsent.ts

async function importPrivateKey(pem: string): Promise<CryptoKey> {
  const b = pem
    .replace(/-----BEGIN PRIVATE KEY-----/, "")
    .replace(/-----END PRIVATE KEY-----/, "")
    .replace(/\s/g, "");
  const bin = Uint8Array.from(atob(b), (c) => c.charCodeAt(0));
  return crypto.subtle.importKey(
    "pkcs8",
    bin,
    { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
    false,
    ["sign"],
  );
}

function b64url(d: Uint8Array | string): string {
  const s = typeof d === "string" ? btoa(d) : btoa(String.fromCharCode(...d));
  return s.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

async function getAccessToken(sa: { client_email: string; private_key: string }): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  const header = b64url(JSON.stringify({ alg: "RS256", typ: "JWT" }));
  const payload = b64url(JSON.stringify({
    iss: sa.client_email,
    scope: "https://www.googleapis.com/auth/analytics.readonly",
    aud: "https://oauth2.googleapis.com/token",
    exp: now + 3600,
    iat: now,
  }));
  const key = await importPrivateKey(sa.private_key);
  const sig = new Uint8Array(await crypto.subtle.sign(
    "RSASSA-PKCS1-v1_5", key, new TextEncoder().encode(`${header}.${payload}`),
  ));
  const jwt = `${header}.${payload}.${b64url(sig)}`;
  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: `grant_type=urn%3Aietf%3Aparams%3Aoauth%3Agrant-type%3Ajwt-bearer&assertion=${jwt}`,
  });
  const j = await res.json();
  if (!j.access_token) throw new Error(`Token error: ${JSON.stringify(j)}`);
  return j.access_token;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const json = (status: number, data: unknown) =>
    new Response(JSON.stringify(data), {
      status,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  try {
    const saRaw = Deno.env.get("GOOGLE_SERVICE_ACCOUNT_JSON");
    const propertyId = (Deno.env.get("GA4_PROPERTY_ID") || "530010609").trim();

    const out: Record<string, unknown> = {
      measurement_id: MEASUREMENT_ID,
      property_id: propertyId,
      service_account_configured: !!saRaw,
      checked_at: new Date().toISOString(),
    };

    if (!saRaw) return json(200, { ...out, error: "GOOGLE_SERVICE_ACCOUNT_JSON not configured" });

    const sa = JSON.parse(saRaw);
    const token = await getAccessToken(sa);
    out.service_account_email = sa.client_email;

    // Realtime: active users in last 30 minutes
    try {
      const rt = await fetch(
        `https://analyticsdata.googleapis.com/v1beta/properties/${propertyId}:runRealtimeReport`,
        {
          method: "POST",
          headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
          body: JSON.stringify({ metrics: [{ name: "activeUsers" }] }),
        },
      );
      const rtJson = await rt.json();
      if (!rt.ok) {
        out.realtime_error = rtJson?.error?.message || `HTTP ${rt.status}`;
      } else {
        const v = rtJson?.rows?.[0]?.metricValues?.[0]?.value;
        out.realtime_active_users = v ? parseInt(v, 10) : 0;
      }
    } catch (e) {
      out.realtime_error = (e as Error).message;
    }

    // Last day with events (look back 30 days)
    try {
      const last = await fetch(
        `https://analyticsdata.googleapis.com/v1beta/properties/${propertyId}:runReport`,
        {
          method: "POST",
          headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
          body: JSON.stringify({
            dateRanges: [{ startDate: "30daysAgo", endDate: "today" }],
            dimensions: [{ name: "date" }],
            metrics: [{ name: "eventCount" }, { name: "sessions" }],
            orderBys: [{ dimension: { dimensionName: "date" }, desc: true }],
            limit: 30,
          }),
        },
      );
      const lastJson = await last.json();
      if (!last.ok) {
        out.last_event_error = lastJson?.error?.message || `HTTP ${last.status}`;
      } else {
        const rows: any[] = lastJson?.rows || [];
        const series = rows.map((r) => ({
          date: r.dimensionValues?.[0]?.value as string,
          events: parseInt(r.metricValues?.[0]?.value || "0", 10),
          sessions: parseInt(r.metricValues?.[1]?.value || "0", 10),
        })).sort((a, b) => a.date.localeCompare(b.date));
        out.daily_series = series;
        const withEvents = [...series].reverse().find((r) => r.events > 0);
        out.last_event_date = withEvents?.date || null;
        out.last_event_count = withEvents?.events ?? 0;
        out.total_events_30d = series.reduce((s, r) => s + r.events, 0);
        out.total_sessions_30d = series.reduce((s, r) => s + r.sessions, 0);
      }
    } catch (e) {
      out.last_event_error = (e as Error).message;
    }

    return json(200, out);
  } catch (e) {
    return json(500, { error: (e as Error).message });
  }
});
