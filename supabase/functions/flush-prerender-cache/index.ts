/**
 * flush-prerender-cache
 *
 * Cron toutes les 15 minutes : consomme le flag `seo_dirty_at` posé par
 * les triggers sur articles, seo_city_pages et city_guides, appelle
 * l'API Prerender.io recache pour chaque URL, puis efface le flag sur
 * les rangs recachés avec succès.
 *
 * Batch de 50 par table par run pour rester sous le timeout edge.
 * Trace chaque exécution dans public.cron_run_log.
 */
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import { startCronRun } from "../_shared/cron-run-log.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const SITE = "https://guardiens.fr";
const BATCH = 50;

interface Row { id: string; slug: string | null }

async function recache(url: string, token: string): Promise<boolean> {
  try {
    const r = await fetch("https://api.prerender.io/recache", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ prerenderToken: token, url }),
    });
    await r.text();
    return r.ok;
  } catch {
    return false;
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const run = await startCronRun("flush-prerender-cache");

  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SERVICE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const PRERENDER_TOKEN = Deno.env.get("PRERENDER_TOKEN");

    if (!PRERENDER_TOKEN) {
      await run.fail(new Error("PRERENDER_TOKEN not configured"));
      return new Response(
        JSON.stringify({ error: "PRERENDER_TOKEN not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const sb = createClient(SUPABASE_URL, SERVICE);

    const [articles, cityPages, guides] = await Promise.all([
      sb.from("articles").select("id, slug").not("seo_dirty_at", "is", null).limit(BATCH),
      sb.from("seo_city_pages").select("id, slug").not("seo_dirty_at", "is", null).limit(BATCH),
      sb.from("city_guides").select("id, slug").not("seo_dirty_at", "is", null).limit(BATCH),
    ]);

    if (articles.error || cityPages.error || guides.error) {
      const err = articles.error ?? cityPages.error ?? guides.error;
      await run.fail(err ?? new Error("DB read failed"));
      return new Response(JSON.stringify({ error: "DB read failed" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const rowsA = (articles.data ?? []) as Row[];
    const rowsC = (cityPages.data ?? []) as Row[];
    const rowsG = (guides.data ?? []) as Row[];
    const dirtyBefore = rowsA.length + rowsC.length + rowsG.length;

    if (dirtyBefore === 0) {
      await run.finish("success", { dirty_before: 0, purged: 0, failed: 0, remaining: 0 });
      return new Response(
        JSON.stringify({ dirty_before: 0, purged: 0, failed: 0, remaining: 0 }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const tasks: Array<{ table: string; id: string; url: string }> = [];
    for (const r of rowsA) if (r.slug) tasks.push({ table: "articles", id: r.id, url: `${SITE}/actualites/${r.slug}` });
    for (const r of rowsC) if (r.slug) tasks.push({ table: "seo_city_pages", id: r.id, url: `${SITE}/house-sitting/${r.slug}` });
    for (const r of rowsG) if (r.slug) tasks.push({ table: "city_guides", id: r.id, url: `${SITE}/guides/${r.slug}` });

    const okIdsByTable: Record<string, string[]> = { articles: [], seo_city_pages: [], city_guides: [] };
    let purged = 0;
    let failed = 0;

    for (const t of tasks) {
      const ok = await recache(t.url, PRERENDER_TOKEN);
      if (ok) { okIdsByTable[t.table].push(t.id); purged += 1; }
      else { failed += 1; }
    }

    await Promise.all(
      Object.entries(okIdsByTable).map(([table, ids]) =>
        ids.length > 0
          ? sb.from(table).update({ seo_dirty_at: null }).in("id", ids)
          : Promise.resolve(),
      ),
    );

    // Remaining : ce qui reste marqué dirty (approximatif : sur les batchs suivants)
    const remaining = Math.max(0, dirtyBefore - purged);

    const status = failed === 0 ? "success" : (purged > 0 ? "partial" : "failed");
    if (status === "failed") {
      await run.fail(new Error(`All ${failed} recache calls failed`), {
        dirty_before: dirtyBefore, purged, failed, remaining,
      });
    } else {
      await run.finish(status, { dirty_before: dirtyBefore, purged, failed, remaining });
    }

    console.log(`[flush-prerender-cache] dirty=${dirtyBefore} purged=${purged} failed=${failed}`);

    return new Response(
      JSON.stringify({ dirty_before: dirtyBefore, purged, failed, remaining }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (e) {
    await run.fail(e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : String(e) }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
