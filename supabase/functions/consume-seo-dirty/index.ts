/**
 * consume-seo-dirty
 *
 * Cron horaire : consomme le flag `articles.seo_dirty_at` posé par le trigger
 * `articles_recache_prerender`. Pour chaque article publié marqué sale (50 max
 * par exécution, les plus anciens d'abord), appelle l'API Prerender.io recache
 * sur l'URL canonique FR. Guardiens est monolingue français depuis le
 * 17/08/2026 : il n'existe plus aucune variante de langue à recacher.
 *
 * Depuis le 07/09/2026, la même passe consomme aussi `profiles.seo_dirty_at`,
 * posé par les triggers `profiles_mark_seo_dirty` et
 * `sitter_profiles_mark_seo_dirty`, pour les fiches gardien `/gardiens/{id}`.
 * Le compte Prerender est partagé avec un autre domaine, quota mensuel de
 * 25 000 renders : le nombre de fiches réellement recachées par passage est
 * plafonné à SITTER_RENDER_BUDGET. Les fiches non indexables au sens de
 * `isSitterProfileIndexable` voient leur flag effacé sans consommer de render.
 *
 * Le flag n'est effacé que si TOUS les recaches de l'article ont réussi.
 * Chaque tentative est journalisée dans public.prerender_recache_log.
 * En cas d'échec, la fonction renvoie un statut non-2xx.
 */
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import { startCronRun } from "../_shared/cron-run-log.ts";
import { isSitterProfileIndexable } from "../_shared/sitterProfileIndexability.js";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SITE = "https://guardiens.fr";
const BATCH = 50;
/** Fiches gardien examinées par passage (lecture seule, non facturée). */
const SITTER_SCAN_BATCH = 300;
/** Renders Prerender réellement dépensés par passage pour les fiches gardien. */
const SITTER_RENDER_BUDGET = 25;

interface ArticleRow {
  id: string;
  slug: string;
  canonical_url: string | null;
  seo_dirty_at: string;
}


async function recache(url: string, token: string): Promise<{ ok: boolean; status: number | null; detail: string }> {
  try {
    const r = await fetch("https://api.prerender.io/recache", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ prerenderToken: token, url }),
    });
    const text = (await r.text()).slice(0, 500);
    return { ok: r.ok, status: r.status, detail: text };
  } catch (e) {
    return { ok: false, status: null, detail: e instanceof Error ? e.message : String(e) };
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const run = await startCronRun("consume-seo-dirty");

  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SERVICE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const PRERENDER_TOKEN = Deno.env.get("PRERENDER_TOKEN");

    if (!PRERENDER_TOKEN) {
      await run.fail(new Error("PRERENDER_TOKEN not configured"));
      return new Response(JSON.stringify({ error: "PRERENDER_TOKEN not configured" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const sb = createClient(SUPABASE_URL, SERVICE);

    const { data, error } = await sb
      .from("articles")
      .select("id, slug, canonical_url, seo_dirty_at")
      .eq("published", true)
      .not("seo_dirty_at", "is", null)
      .order("seo_dirty_at", { ascending: true })
      .limit(BATCH);

    if (error) {
      await run.fail(error);
      return new Response(JSON.stringify({ error: "DB read failed", details: error.message }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const articles = (data ?? []) as ArticleRow[];
    if (articles.length === 0) {
      await run.finish("success", { dirty_before: 0, cleared: 0, urls_ok: 0, urls_failed: 0 });
      return new Response(
        JSON.stringify({ dirty_before: 0, cleared: 0, urls_ok: 0, urls_failed: 0 }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const logRows: Array<Record<string, unknown>> = [];
    const clearedIds: string[] = [];
    let urlsOk = 0;
    let urlsFailed = 0;

    for (const a of articles) {
      const base = a.canonical_url && a.canonical_url.startsWith("http")
        ? a.canonical_url
        : `${SITE}/actualites/${a.slug}`;
      // Monolingue français : seule l'URL canonique est recachée, jamais de
      // variante `?lang=`.
      const urls = [base];

      let allOk = true;
      for (const url of urls) {
        const res = await recache(url, PRERENDER_TOKEN);
        if (res.ok) urlsOk += 1;
        else { urlsFailed += 1; allOk = false; }
        logRows.push({
          article_id: a.id,
          url,
          status_code: res.status,
          ok: res.ok,
          detail: res.detail,
          source: "consume-seo-dirty",
        });
        console.log(`[consume-seo-dirty] ${url} -> ${res.status ?? "network_error"}`);
      }

      if (allOk) clearedIds.push(a.id);
    }

    if (logRows.length > 0) {
      await sb.from("prerender_recache_log").insert(logRows);
    }
    if (clearedIds.length > 0) {
      await sb.from("articles").update({ seo_dirty_at: null }).in("id", clearedIds);
    }

    const payload = {
      dirty_before: articles.length,
      cleared: clearedIds.length,
      urls_ok: urlsOk,
      urls_failed: urlsFailed,
    };

    if (urlsFailed > 0) {
      if (urlsOk > 0) await run.finish("partial", payload);
      else await run.fail(new Error(`All ${urlsFailed} recache calls failed`), payload);

      return new Response(JSON.stringify({ ...payload, ok: false }), {
        status: urlsOk > 0 ? 207 : 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    await run.finish("success", payload);
    return new Response(JSON.stringify({ ...payload, ok: true }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    await run.fail(e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : String(e) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
