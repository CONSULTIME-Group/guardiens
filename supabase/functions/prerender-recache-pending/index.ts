// Flush pending Prerender re-cache requests.
// Called after a successful frontend publish (Vite closeBundle hook in prod build).
// Reads rows where seo_dirty_at IS NOT NULL across articles / seo_city_pages / city_guides,
// invalidates Prerender cache for the matching public URLs, then clears the flag.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const SITE = "https://guardiens.fr";
const PRERENDER_TOKEN = Deno.env.get("PRERENDER_TOKEN");
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const json = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

async function recache(url: string): Promise<{ url: string; ok: boolean; status?: number; error?: string }> {
  try {
    const r = await fetch("https://api.prerender.io/recache", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ prerenderToken: PRERENDER_TOKEN, url }),
    });
    await r.text();
    return { url, ok: r.ok, status: r.status };
  } catch (e) {
    return { url, ok: false, error: e instanceof Error ? e.message : String(e) };
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") return json(405, { error: "Method not allowed" });
  if (!PRERENDER_TOKEN) return json(500, { error: "PRERENDER_TOKEN not configured" });

  const sb = createClient(SUPABASE_URL, SERVICE_ROLE);

  // 1. Collect dirty rows from each table (cap to 200 per table to stay safe).
  const [articles, cityPages, guides] = await Promise.all([
    sb.from("articles").select("id, slug").not("seo_dirty_at", "is", null).limit(200),
    sb.from("seo_city_pages").select("id, slug").not("seo_dirty_at", "is", null).limit(200),
    sb.from("city_guides").select("id, slug").not("seo_dirty_at", "is", null).limit(200),
  ]);

  if (articles.error || cityPages.error || guides.error) {
    return json(500, {
      error: "DB read failed",
      details: { articles: articles.error, cityPages: cityPages.error, guides: guides.error },
    });
  }

  type Row = { id: string; slug: string };
  const tasks: Array<{ table: string; id: string; url: string }> = [];

  for (const r of (articles.data ?? []) as Row[]) {
    if (r.slug) tasks.push({ table: "articles", id: r.id, url: `${SITE}/actualites/${r.slug}` });
  }
  for (const r of (cityPages.data ?? []) as Row[]) {
    if (r.slug) tasks.push({ table: "seo_city_pages", id: r.id, url: `${SITE}/house-sitting/${r.slug}` });
  }
  for (const r of (guides.data ?? []) as Row[]) {
    if (r.slug) tasks.push({ table: "city_guides", id: r.id, url: `${SITE}/guides/${r.slug}` });
  }

  if (tasks.length === 0) {
    return json(200, { ok: true, flushed: 0, message: "No dirty rows" });
  }

  // 2. Recache sequentially to respect Prerender's 1-URL-per-call API.
  const results: Array<{ url: string; ok: boolean; status?: number; error?: string }> = [];
  for (const t of tasks) {
    results.push(await recache(t.url));
  }

  // 3. Clear seo_dirty_at only on the rows we successfully recached.
  const okIdsByTable: Record<string, string[]> = { articles: [], seo_city_pages: [], city_guides: [] };
  tasks.forEach((t, i) => {
    if (results[i].ok) okIdsByTable[t.table].push(t.id);
  });

  await Promise.all(
    Object.entries(okIdsByTable).map(([table, ids]) =>
      ids.length > 0
        ? sb.from(table).update({ seo_dirty_at: null }).in("id", ids)
        : Promise.resolve(),
    ),
  );

  const flushed = results.filter((r) => r.ok).length;
  console.log(`[prerender-recache-pending] flushed ${flushed}/${tasks.length}`);

  return json(flushed === tasks.length ? 200 : 207, {
    ok: flushed === tasks.length,
    total: tasks.length,
    flushed,
    results,
  });
});
