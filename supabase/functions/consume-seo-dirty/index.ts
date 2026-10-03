/**
 * Consommateur unique des marqueurs SEO et des anciennes URL persistantes.
 * Cron toutes les 15 minutes, au plus 81 tentatives par passage.
 * Reservation avant le reseau, verrou partage, journal avant acquittement CAS.
 * Une page devenue noindex ou absente doit remplacer son ancienne copie.
 */
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import { startCronRun } from "../_shared/cron-run-log.ts";
import { requireAdminOrServiceRole } from "../_shared/require-admin.ts";
import {
  pickStaticToRecache,
  STATIC_FAMILY,
  STATIC_LOG_SOURCE,
  STATIC_RENDER_BUDGET,
} from "../_shared/static-seo-refresh.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SITE = "https://guardiens.fr";
/** Articles lus par passage. Le budget de renders articles vaut ARTICLE_RENDER_BUDGET. */
const BATCH = 50;
/** Fiches gardien examinées par passage (lecture seule, non facturée). */
const SITTER_SCAN_BATCH = 300;
/** Renders Prerender réellement dépensés par passage pour les fiches gardien. */
const SITTER_RENDER_BUDGET = 25;

/**
 * Budgets de renders par passage, cron toutes les 15 minutes.
 * Ordre de priorité quand la file est pleine : villes, guides, départements,
 * articles, puis fiches gardien.
 *
 * Villes 20 : la famille la plus nombreuse (161) et la plus rentable en SEO,
 *   vidée en 9 passages soit environ 2 h 15.
 * Guides 12 : 87 lignes, vidées en 8 passages, même horizon que les villes.
 * Départements 10 : 98 lignes, pages d'agrégation moins prioritaires, 10 passages.
 * Articles 8 : 90 lignes, contenu déjà bien indexé, 12 passages soit 3 h.
 * Total hors gardiens : 50 renders par passage au maximum, soit une file
 * complète de 436 pages vidée en 3 h après une mise en ligne.
 */
const CITY_RENDER_BUDGET = 20;
const GUIDE_RENDER_BUDGET = 12;
const DEPARTMENT_RENDER_BUDGET = 10;
const ARTICLE_RENDER_BUDGET = 8;
/** Lignes examinées par passage et par famille programmatique (lecture non facturée). */
const PROGRAMMATIC_SCAN_BATCH = 200;
/** Acquittements independants en petites salves, apres journalisation. */
const ACKNOWLEDGEMENT_BATCH = 6;


interface ArticleRow {
  id: string;
  slug: string;
  canonical_url: string | null;
  seo_dirty_at: string;
}

interface DirtyAcknowledgement {
  table: string;
  id: string;
  seo_dirty_at: string;
}


interface RecacheResult { ok: boolean; status: number | null; detail: string; deferred?: boolean; duplicate?: boolean }
type Recacher = (url: string) => Promise<RecacheResult>;

async function requestRecache(url: string, token: string): Promise<RecacheResult> {
  try {
    const r = await fetch("https://api.prerender.io/recache", {
      method: "POST",
      signal: AbortSignal.timeout(20_000),
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ prerenderToken: token, url }),
    });
    const text = (await r.text()).slice(0, 500);
    return { ok: r.ok, status: r.status, detail: text };
  } catch (e) {
    return { ok: false, status: null, detail: e instanceof Error ? e.message : String(e) };
  }
}

interface SitterMetrics {
  sitters_scanned: number;
  sitters_recached: number;
  sitters_skipped_noindex: number;
  sitters_failed: number;
  sitters_deferred: number;
}

/**
 * Consomme `profiles.seo_dirty_at` pour les fiches gardien.
 *
 * Trois garde-fous :
 *  - lecture plafonnée à SITTER_SCAN_BATCH lignes, les plus anciennes d'abord ;
 *  - au plus SITTER_RENDER_BUDGET appels Prerender par passage ;
 *  - toutes les fiches déjà marquées sont traitées, même après un changement
 *    de rôle ou d'indexabilité ; aucune demande n'est effacée sans succès.
 *
 * Les triggers conservent une seule ligne sale par profil, avec la date de
 * sa dernière modification. L'acquittement id + date conserve une demande
 * plus récente apparue pendant le traitement.
 */
async function processSitters(
  // deno-lint-ignore no-explicit-any
  sb: any,
  recache: Recacher,
  logRows: Array<Record<string, unknown>>,
  acknowledgements: DirtyAcknowledgement[],
): Promise<SitterMetrics> {
  const metrics: SitterMetrics = {
    sitters_scanned: 0,
    sitters_recached: 0,
    sitters_skipped_noindex: 0,
    sitters_failed: 0,
    sitters_deferred: 0,
  };

  const { data, error } = await sb
    .from("profiles")
    .select("id, seo_dirty_at")
    .not("seo_dirty_at", "is", null)
    .order("seo_dirty_at", { ascending: true })
    .limit(SITTER_SCAN_BATCH);

  if (error) throw error;

  const rows = (data ?? []) as Array<{ id: string; seo_dirty_at: string }>;
  metrics.sitters_scanned = rows.length;
  if (rows.length === 0) return metrics;

  const toRecache = rows.slice(0, SITTER_RENDER_BUDGET);
  metrics.sitters_deferred = rows.length - toRecache.length;
  for (const row of toRecache) {
    const url = `${SITE}/gardiens/${row.id}`;
    const res = await recache(url);
    if (res.deferred) { metrics.sitters_deferred += 1; continue; }
    if (res.ok) {
      metrics.sitters_recached += 1;
      acknowledgements.push({ table: "profiles", id: row.id, seo_dirty_at: row.seo_dirty_at });
    } else {
      metrics.sitters_failed += 1;
    }
    if (!res.duplicate) logRows.push({
      article_id: null,
      url,
      status_code: res.status,
      ok: res.ok,
      detail: res.detail,
      source: "consume-seo-dirty:sitter",
    });
    console.log(`[consume-seo-dirty] ${url} -> ${res.status ?? "network_error"}`);
  }

  return metrics;
}

interface ProgrammaticSource {
  /** Clé de métriques et suffixe de source dans le journal. */
  key: "city" | "guide" | "department";
  table: string;
  /** Préfixe d'URL publique, le slug est concaténé. */
  pathPrefix: string;
  budget: number;
}

const PROGRAMMATIC_SOURCES: ProgrammaticSource[] = [
  { key: "city", table: "seo_city_pages", pathPrefix: "/house-sitting/", budget: CITY_RENDER_BUDGET },
  { key: "guide", table: "city_guides", pathPrefix: "/guides/", budget: GUIDE_RENDER_BUDGET },
  { key: "department", table: "seo_department_pages", pathPrefix: "/departement/", budget: DEPARTMENT_RENDER_BUDGET },
];

interface ProgrammaticMetrics {
  scanned: number;
  recached: number;
  skipped_noindex: number;
  failed: number;
  deferred: number;
}

/**
 * Consomme `seo_dirty_at` pour une famille de pages programmatiques.
 *
 * Même contrat que les fiches gardien :
 *  - lecture plafonnée, les plus anciennes d'abord ;
 *  - budget de renders propre par passage ;
 *  - une page devenue non indexable est aussi rafraîchie ;
 *  - flag effacé seulement en cas de succès et pour la version lue.
 */
async function processProgrammatic(
  // deno-lint-ignore no-explicit-any
  sb: any,
  recache: Recacher,
  source: ProgrammaticSource,
  logRows: Array<Record<string, unknown>>,
  acknowledgements: DirtyAcknowledgement[],
): Promise<ProgrammaticMetrics> {
  const metrics: ProgrammaticMetrics = {
    scanned: 0,
    recached: 0,
    skipped_noindex: 0,
    failed: 0,
    deferred: 0,
  };

  const { data, error } = await sb
    .from(source.table)
    .select("id, slug, seo_dirty_at")
    .not("seo_dirty_at", "is", null)
    .order("seo_dirty_at", { ascending: true })
    .limit(PROGRAMMATIC_SCAN_BATCH);
  if (error) throw error;

  const rows = (data ?? []) as Array<{
    id: string;
    slug: string | null;
    seo_dirty_at: string;
  }>;
  metrics.scanned = rows.length;
  if (rows.length === 0) return metrics;

  const toRecache: Array<{ id: string; url: string; seo_dirty_at: string }> = [];

  for (const r of rows) {
    // Sans adresse connue, conserver la demande pour diagnostic et reprise.
    if (!r.slug) metrics.failed += 1;
    else if (toRecache.length < source.budget) {
      toRecache.push({ id: r.id, seo_dirty_at: r.seo_dirty_at, url: `${SITE}${source.pathPrefix}${r.slug}` });
    } else metrics.deferred += 1;
  }

  for (const t of toRecache) {
    const res = await recache(t.url);
    if (res.deferred) { metrics.deferred += 1; continue; }
    if (res.ok) {
      metrics.recached += 1;
      acknowledgements.push({ table: source.table, id: t.id, seo_dirty_at: t.seo_dirty_at });
    } else {
      metrics.failed += 1;
    }
    if (!res.duplicate) logRows.push({
      article_id: null,
      url: t.url,
      status_code: res.status,
      ok: res.ok,
      detail: res.detail,
      source: `consume-seo-dirty:${source.key}`,
    });
    console.log(`[consume-seo-dirty] ${t.url} -> ${res.status ?? "network_error"}`);
  }

  return metrics;
}


Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const denied = await requireAdminOrServiceRole(req, corsHeaders);
  if (denied) return denied;



  const run = await startCronRun("consume-seo-dirty");

  const holder = crypto.randomUUID();
  let sb: ReturnType<typeof createClient> | null = null;
  let acquired = false;
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

    sb = createClient(SUPABASE_URL, SERVICE);
    const { data: lock, error: lockError } = await sb.rpc("seo_acquire_consumer", { p_holder: holder });
    if (lockError) throw lockError;
    if (!lock) {
      await run.finish("success", { skipped: "consumer_busy" });
      return new Response(JSON.stringify({ ok: true, skipped: "consumer_busy" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    acquired = true;
    const client = sb;
    const responses = new Map<string, RecacheResult>();
    let monthlyDeferred = 0;
    let runtimeDeferred = 0;
    const deadline = Date.now() + 100_000;
    let budgetExhausted = false;
    const recache: Recacher = async (input) => {
      const url = new URL(input);
      if (url.origin !== SITE || url.search || url.hash || url.username || url.password) {
        throw new Error("Recache URL outside the public site");
      }
      const key = url.href;
      const cached = responses.get(key);
      if (cached) return { ...cached, duplicate: true };
      if (Date.now() >= deadline) {
        runtimeDeferred += 1;
        return { ok: false, status: null, detail: "Runtime deferred", deferred: true };
      }
      if (!budgetExhausted) {
        const { data: allowed, error: reserveError } = await client.rpc("seo_reserve_render", { p_holder: holder });
        if (reserveError) throw reserveError;
        budgetExhausted = !allowed;
      }
      if (budgetExhausted) {
        monthlyDeferred += 1;
        return { ok: false, status: null, detail: "Monthly budget deferred", deferred: true };
      }
      const result = await requestRecache(key, PRERENDER_TOKEN);
      responses.set(key, result);
      return result;
    };

    const { data, error } = await sb
      .from("articles")
      .select("id, slug, canonical_url, seo_dirty_at")
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

    const logRows: Array<Record<string, unknown>> = [];
    const acknowledgements: DirtyAcknowledgement[] = [];
    const clearedRows: ArticleRow[] = [];
    let urlsOk = 0;
    let urlsFailed = 0;
    let articlesDeferred = 0;
    let articlesAttempted = 0;


    const outboxAcks: Array<{ path: string; dirty_at: string }> = [];
    const outboxRetries: Array<{ path: string; dirty_at: string }> = [];
    const { data: pendingUrls, error: outboxError } = await sb.from("seo_url_outbox")
      .select("path, dirty_at").order("first_dirty_at", { ascending: true })
      .order("path", { ascending: true }).lte("next_attempt_at", new Date().toISOString()).limit(STATIC_RENDER_BUDGET);
    if (outboxError) throw outboxError;
    const outboxMetrics = { outbox_recached: 0, outbox_failed: 0, outbox_deferred: 0 };
    const outboxRows = (pendingUrls ?? []) as Array<{ path: string; dirty_at: string }>;
    for (const row of outboxRows) {
      const url = `${SITE}${row.path}`;
      const res = await recache(url);
      if (res.deferred) { outboxMetrics.outbox_deferred += 1; continue; }
      if (res.ok) { urlsOk += 1; outboxMetrics.outbox_recached += 1; outboxAcks.push(row); }
      else { urlsFailed += 1; outboxMetrics.outbox_failed += 1; outboxRetries.push(row); }
      if (!res.duplicate) logRows.push({ article_id: null, url, ok: res.ok,
        status_code: res.status, detail: res.detail, source: "consume-seo-dirty:outbox" });
    }

    // Priorité 1 à 3 : pages villes, guides, départements. Elles passent avant
    // les articles et les fiches gardien quand la file est pleine.
    const programmaticMetrics: Record<string, unknown> = {};
    for (const source of PROGRAMMATIC_SOURCES) {
      const m = await processProgrammatic(sb, recache, source, logRows, acknowledgements);
      urlsOk += m.recached;
      urlsFailed += m.failed;
      programmaticMetrics[`${source.key}_scanned`] = m.scanned;
      programmaticMetrics[`${source.key}_recached`] = m.recached;
      programmaticMetrics[`${source.key}_skipped_noindex`] = m.skipped_noindex;
      programmaticMetrics[`${source.key}_failed`] = m.failed;
      programmaticMetrics[`${source.key}_deferred`] = m.deferred;
    }

    for (const a of articles) {
      if (articlesAttempted >= ARTICLE_RENDER_BUDGET) {
        articlesDeferred += 1;
        continue;
      }
      articlesAttempted += 1;

      if (!a.slug && !a.canonical_url?.startsWith("http")) {
        urlsFailed += 1;
        continue;
      }

      // Rafraichir l'adresse de la page, meme si son canonical pointe ailleurs.
      const base = a.slug ? `${SITE}/actualites/${a.slug}` : a.canonical_url!;
      // Monolingue français : seule l'URL canonique est recachée, jamais de
      // variante `?lang=`.
      const urls = [base];

      let allOk = true;
      for (const url of urls) {
        const res = await recache(url);
        if (res.deferred) { articlesDeferred += 1; allOk = false; continue; }
        if (res.ok) urlsOk += 1;
        else { urlsFailed += 1; allOk = false; }
        if (!res.duplicate) logRows.push({
          article_id: a.id,
          url,
          status_code: res.status,
          ok: res.ok,
          detail: res.detail,
          source: "consume-seo-dirty",
        });
        console.log(`[consume-seo-dirty] ${url} -> ${res.status ?? "network_error"}`);
      }

      if (allOk) {
        clearedRows.push(a);
        acknowledgements.push({ table: "articles", id: a.id, seo_dirty_at: a.seo_dirty_at });
      }
    }

    // Pages statiques (STATIC_SEO_URLS) : recachées si leur dernier succès
    // journalisé précède le repère posé par detect-deploy-and-mark-dirty,
    // au plus STATIC_RENDER_BUDGET renders par passage.
    const staticMetrics = { static_recached: 0, static_failed: 0, static_deferred: 0 };
    {
      const { data: st, error: stErr } = await sb
        .from("prerender_family_state")
        .select("last_marked_at")
        .eq("family", STATIC_FAMILY)
        .maybeSingle();
      if (stErr) throw stErr;
      const markedAt = (st?.last_marked_at as string | null) ?? null;
      if (markedAt) {
        const { data: okRows, error: okErr } = await sb
          .from("prerender_recache_log")
          .select("url, created_at")
          .in("source", [STATIC_LOG_SOURCE, "consume-seo-dirty:outbox"])
          .eq("ok", true)
          .gte("created_at", markedAt)
          .order("created_at", { ascending: false })
          .limit(100);
        if (okErr) throw okErr;
        const lastOk = new Map<string, string>();
        for (const r of (okRows ?? []) as Array<{ url: string; created_at: string }>) {
          if (!lastOk.has(r.url)) lastOk.set(r.url, r.created_at);
        }
        const { toRecache, deferred } = pickStaticToRecache(markedAt, lastOk, STATIC_RENDER_BUDGET - outboxRows.length);
        staticMetrics.static_deferred = deferred;
        for (const url of toRecache) {
          const res = await recache(url);
          if (res.deferred) { staticMetrics.static_deferred += 1; continue; }
          if (res.ok) { urlsOk += 1; staticMetrics.static_recached += 1; }
          else { urlsFailed += 1; staticMetrics.static_failed += 1; }
          if (!res.duplicate) logRows.push({
            article_id: null, url, status_code: res.status, ok: res.ok,
            detail: res.detail, source: STATIC_LOG_SOURCE,
          });
          console.log(`[consume-seo-dirty] ${url} -> ${res.status ?? "network_error"}`);
        }
      }
    }

    // Fiches gardien : même token, même journalisation, budget de renders
    // propre pour ne pas entamer le quota partagé du compte Prerender.
    const sitterMetrics = await processSitters(sb, recache, logRows, acknowledgements);
    urlsFailed += sitterMetrics.sitters_failed;
    urlsOk += sitterMetrics.sitters_recached;


    if (logRows.length > 0) {
      const { error: logError } = await sb.from("prerender_recache_log").insert(logRows);
      if (logError) throw logError;
    }
    // Echec fournisseur : ceder la priorite aux autres URL au prochain passage.
    for (const row of outboxRetries) {
      const { error: retryError } = await sb.from("seo_url_outbox")
        .update({ next_attempt_at: new Date(Date.now() + 30 * 60_000).toISOString() })
        .eq("path", row.path).eq("dirty_at", row.dirty_at);
      if (retryError) throw retryError;
    }
    // Une suppression est acquittee seulement pour la version lue.
    for (const row of outboxAcks) {
      const { error: ackError } = await sb.from("seo_url_outbox").delete()
        .eq("path", row.path).eq("dirty_at", row.dirty_at);
      if (ackError) throw ackError;
    }
    // Journaliser les tentatives avant tout acquittement de la file.
    for (let offset = 0; offset < acknowledgements.length; offset += ACKNOWLEDGEMENT_BATCH) {
      const results = await Promise.all(acknowledgements.slice(offset, offset + ACKNOWLEDGEMENT_BATCH).map((row) =>
        client.from(row.table).update({ seo_dirty_at: null }).eq("id", row.id).eq("seo_dirty_at", row.seo_dirty_at)
      ));
      const failed = results.find((r: { error: unknown }) => r.error);
      if (failed?.error) throw failed.error;
    }

    const payload = {
      dirty_before: articles.length,
      cleared: clearedRows.length,
      urls_ok: urlsOk,
      urls_failed: urlsFailed,
      articles_deferred: articlesDeferred,
      ...programmaticMetrics,
      ...sitterMetrics,
      ...staticMetrics,
      ...outboxMetrics,
      monthly_deferred: monthlyDeferred,
      runtime_deferred: runtimeDeferred,
      requests_attempted: responses.size,
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
  } finally {
    if (acquired && sb) {
      const { error: releaseError } = await sb.rpc("seo_release_consumer", { p_holder: holder });
      if (releaseError) {
        await run.fail(releaseError);
        return new Response(JSON.stringify({ error: "Consumer lease release failed" }), {
          status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }
  }
});
