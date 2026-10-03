import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const SITE = "https://guardiens.fr";

export function normalizeQueuedRecacheUrl(input: unknown): string | null {
  if (typeof input !== "string" || !input.trim()) return null;
  try {
    const parsed = new URL(input.startsWith("/") ? input : input.includes("://") ? input : `/${input}`, SITE);
    if (parsed.protocol !== "https:" || !["guardiens.fr", "www.guardiens.fr"].includes(parsed.hostname)
      || parsed.port || parsed.username || parsed.password) return null;
    const path = parsed.pathname.replace(/\/{2,}/g, "/").replace(/\/+$/, "") || "/";
    if (!/^\/[a-zA-Z0-9_/-]*$/.test(path)) return null;
    return `${SITE}${path}`;
  } catch { return null; }
}

/** Appeler seulement apres le controle admin/service de la fonction exposee. */
export async function queuePrerenderRefresh(req: Request, corsHeaders: Record<string, string>, limit = 200): Promise<Response> {
  const json = (status: number, data: unknown) => new Response(JSON.stringify(data), {
    status, headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
  if (req.method !== "POST") return json(405, { error: "Method not allowed" });
  let body: { urls?: unknown[] };
  try { const text = await req.text(); body = text ? JSON.parse(text) : {}; }
  catch { return json(400, { error: "Invalid JSON" }); }
  if (!body || typeof body !== "object") return json(400, { error: "Invalid request" });
  const site = Deno.env.get("SUPABASE_URL")!;
  if (body.urls === undefined) {
    // Le traitement des marqueurs reste dans le consommateur unique, borne et journalise.
    return await fetch(`${site}/functions/v1/consume-seo-dirty`, {
      method: "POST", signal: AbortSignal.timeout(120_000),
      headers: { Authorization: req.headers.get("Authorization")!, "Content-Type": "application/json" },
      body: "{}",
    });
  }
  if (!Array.isArray(body.urls) || !body.urls.length || body.urls.length > limit) {
    return json(400, { error: `Provide between 1 and ${limit} URLs` });
  }
  const normalized = body.urls.map(normalizeQueuedRecacheUrl);
  if (normalized.some((u) => !u)) return json(400, { error: "Invalid public site URL" });
  const urls = [...new Set(normalized as string[])];
  const sb = createClient(site, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, { auth: { persistSession: false } });
  const { error } = await sb.rpc("seo_enqueue_urls", { p_paths: urls.map((u) => new URL(u).pathname) });
  if (error) return json(500, { error: "Queue write failed" });
  return json(202, { ok: true, mode: "queued", queued: urls.length, total: urls.length,
    results: urls.map((url) => ({ url, ok: true, status: 202, queued: true })) });
}
