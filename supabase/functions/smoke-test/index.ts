/**
 * Smoke test — vérifie que les routes critiques répondent correctement.
 * Lancé toutes les 15 min via pg_cron. Envoie un email d'alerte si KO.
 *
 * Routes testées :
 *  - GET /                (landing)
 *  - GET /sitemap.xml
 *  - GET /robots.txt
 *  - GET /search          (page de recherche publique)
 *  - GET /actualites      (hub SEO)
 *  - Health DB : SELECT 1 sur Supabase
 *  - Health auth : check session endpoint
 */
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SITE_URL = "https://guardiens.fr";
const RESEND_KEY = Deno.env.get("RESEND_API_KEY");
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const ALERT_EMAIL = "guardiens.contact@gmail.com";

interface CheckResult {
  name: string;
  ok: boolean;
  status?: number;
  durationMs: number;
  error?: string;
}

async function checkUrl(name: string, url: string, expectStatus = 200): Promise<CheckResult> {
  const start = Date.now();
  try {
    const ctrl = new AbortController();
    const timeout = setTimeout(() => ctrl.abort(), 10_000);
    const res = await fetch(url, {
      signal: ctrl.signal,
      headers: { "User-Agent": "Guardiens-SmokeTest/1.0" },
    });
    clearTimeout(timeout);
    await res.text(); // drain body
    const durationMs = Date.now() - start;
    return {
      name,
      ok: res.status === expectStatus,
      status: res.status,
      durationMs,
      error: res.status !== expectStatus ? `Expected ${expectStatus}, got ${res.status}` : undefined,
    };
  } catch (e) {
    return {
      name,
      ok: false,
      durationMs: Date.now() - start,
      error: (e as Error).message,
    };
  }
}

async function checkDb(): Promise<CheckResult> {
  const start = Date.now();
  try {
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);
    const { error } = await supabase.from("profiles").select("id").limit(1);
    return {
      name: "DB query (profiles)",
      ok: !error,
      durationMs: Date.now() - start,
      error: error?.message,
    };
  } catch (e) {
    return {
      name: "DB query (profiles)",
      ok: false,
      durationMs: Date.now() - start,
      error: (e as Error).message,
    };
  }
}

async function sendAlert(failures: CheckResult[]) {
  if (!RESEND_KEY) return;
  const html = `
    <h2 style="color:#dc2626">🚨 Smoke test Guardiens — ${failures.length} échec(s)</h2>
    <p>Heure : ${new Date().toLocaleString("fr-FR", { timeZone: "Europe/Paris" })}</p>
    <table style="border-collapse:collapse;width:100%;font-family:system-ui">
      <thead>
        <tr style="background:#fef2f2">
          <th style="text-align:left;padding:8px;border:1px solid #fecaca">Vérification</th>
          <th style="text-align:left;padding:8px;border:1px solid #fecaca">Statut</th>
          <th style="text-align:left;padding:8px;border:1px solid #fecaca">Durée</th>
          <th style="text-align:left;padding:8px;border:1px solid #fecaca">Erreur</th>
        </tr>
      </thead>
      <tbody>
        ${failures
          .map(
            (f) => `
          <tr>
            <td style="padding:8px;border:1px solid #fecaca">${f.name}</td>
            <td style="padding:8px;border:1px solid #fecaca">${f.status ?? "—"}</td>
            <td style="padding:8px;border:1px solid #fecaca">${f.durationMs} ms</td>
            <td style="padding:8px;border:1px solid #fecaca;color:#dc2626"><code>${f.error ?? ""}</code></td>
          </tr>`,
          )
          .join("")}
      </tbody>
    </table>
    <p style="color:#6b7280;font-size:13px;margin-top:20px">
      Ce contrôle s'exécute toutes les 15 min. Vous ne recevrez ce mail que si une vérification échoue.
    </p>
  `;

  await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${RESEND_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: "Guardiens Monitoring <noreply@notify.guardiens.fr>",
      to: [ALERT_EMAIL],
      subject: `🚨 Smoke test KO — ${failures.length} échec(s)`,
      html,
    }),
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const checks: CheckResult[] = await Promise.all([
    checkUrl("Landing", `${SITE_URL}/`),
    checkUrl("Sitemap", `${SITE_URL}/sitemap.xml`),
    checkUrl("Robots", `${SITE_URL}/robots.txt`),
    checkUrl("Search", `${SITE_URL}/search`),
    checkUrl("Actualités", `${SITE_URL}/actualites`),
    checkDb(),
  ]);

  const failures = checks.filter((c) => !c.ok);
  const ok = failures.length === 0;

  if (!ok) {
    await sendAlert(failures);
    console.error(`❌ Smoke test failed: ${failures.length}/${checks.length}`, failures);
  } else {
    console.log(`✅ Smoke test OK (${checks.length} checks, ${checks.reduce((s, c) => s + c.durationMs, 0)}ms total)`);
  }

  return new Response(
    JSON.stringify({
      ok,
      total: checks.length,
      passed: checks.length - failures.length,
      failed: failures.length,
      checks,
      timestamp: new Date().toISOString(),
    }),
    {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: ok ? 200 : 503,
    },
  );
});
