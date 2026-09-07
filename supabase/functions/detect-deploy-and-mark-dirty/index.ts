/**
 * detect-deploy-and-mark-dirty
 *
 * Cron toutes les 10 minutes. Detecte une mise en ligne du frontend et remplit
 * la file d'invalidation Prerender, SANS jamais appeler Prerender elle-meme.
 * Le decouplage est volontaire : cette fonction remplit la file, la fonction
 * `consume-seo-dirty` la vide a budget plafonne, ce qui protege le quota
 * mensuel de 25 000 renders du compte partage.
 *
 * Principe :
 *  1. recuperer le HTML de https://guardiens.fr/ ;
 *  2. en extraire l'empreinte du bundle d'entree (`/assets/index-XXXX.js`) ;
 *  3. la comparer a la derniere empreinte connue dans `deploy_fingerprints` ;
 *  4. si elle a change, poser `seo_dirty_at = now()` sur toutes les lignes
 *     indexables de `seo_city_pages`, `city_guides`, `seo_department_pages`
 *     et `articles`.
 *
 * `profiles` est volontairement exclue : 1 000 fiches gardien dont le contenu
 * ne depend pas du gabarit, le cout ne serait pas tenable.
 *
 * Deux garde-fous :
 *  - premier passage a table vide : l'empreinte est enregistree, RIEN n'est
 *    marque, sinon la mise en service declencherait un marquage massif ;
 *  - `MIN_MARK_INTERVAL_HOURS` : deux mises en ligne rapprochees ne produisent
 *    qu'un seul marquage massif, la seconde est enregistree et journalisee
 *    comme differee.
 */
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import { startCronRun } from "../_shared/cron-run-log.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SITE = "https://guardiens.fr";

/**
 * Intervalle minimal entre deux marquages massifs. A 436 pages indexables,
 * un marquage coute 436 renders : une fois par 24 h plafonne le poste
 * "deploiement" a environ 13 000 renders par mois, soit la moitie du quota
 * partage.
 */
const MIN_MARK_INTERVAL_HOURS = 24;

/** Extrait le nom de fichier du bundle d'entree du HTML servi. */
export function extractBundleFingerprint(html: string): string | null {
  const m = html.match(/\/assets\/(index-[A-Za-z0-9_-]+\.js)/);
  return m ? m[1] : null;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const run = await startCronRun("detect-deploy-and-mark-dirty");

  const json = (status: number, body: unknown) =>
    new Response(JSON.stringify(body), {
      status,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  try {
    const sb = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    // Option de test : forcer une empreinte donnee sans dependre du reseau.
    let forced: string | null = null;
    if (req.method === "POST") {
      try {
        const body = await req.json();
        if (typeof body?.fingerprint === "string" && body.fingerprint.length > 0) {
          forced = body.fingerprint;
        }
      } catch { /* corps absent ou invalide, comportement normal */ }
    }

    let fingerprint = forced;
    if (!fingerprint) {
      const res = await fetch(`${SITE}/?deploy-probe=${Date.now()}`, {
        headers: { "Cache-Control": "no-cache", "User-Agent": "guardiens-deploy-detector" },
      });
      if (!res.ok) {
        await run.fail(new Error(`fetch ${SITE} -> HTTP ${res.status}`));
        return json(502, { error: "site fetch failed", status: res.status });
      }
      fingerprint = extractBundleFingerprint(await res.text());
    }

    if (!fingerprint) {
      await run.fail(new Error("bundle fingerprint not found in HTML"));
      return json(500, { error: "fingerprint not found" });
    }

    const { data: known, error: knownError } = await sb
      .from("deploy_fingerprints")
      .select("id, fingerprint, seen_count, marked_at")
      .order("first_seen_at", { ascending: false })
      .limit(50);
    if (knownError) throw knownError;

    const rows = (known ?? []) as Array<{
      id: string;
      fingerprint: string;
      seen_count: number;
      marked_at: string | null;
    }>;

    const existing = rows.find((r) => r.fingerprint === fingerprint);
    const isFirstEverRun = rows.length === 0;

    if (existing) {
      await sb
        .from("deploy_fingerprints")
        .update({ last_seen_at: new Date().toISOString(), seen_count: existing.seen_count + 1 })
        .eq("id", existing.id);
      const payload = { fingerprint, changed: false, marked: 0, reason: "unchanged" };
      await run.finish("success", payload);
      return json(200, payload);
    }

    // Empreinte inconnue : on l'enregistre toujours, on ne marque pas toujours.
    const lastMarkedAt = rows
      .map((r) => r.marked_at)
      .filter((d): d is string => !!d)
      .sort()
      .pop();
    const hoursSinceLastMark = lastMarkedAt
      ? (Date.now() - new Date(lastMarkedAt).getTime()) / 3_600_000
      : Number.POSITIVE_INFINITY;

    let reason = "deploy_detected";
    if (isFirstEverRun) reason = "bootstrap";
    else if (hoursSinceLastMark < MIN_MARK_INTERVAL_HOURS) reason = "debounced";

    let marked = 0;
    const perTable: Record<string, number> = {};

    if (reason === "deploy_detected") {
      const now = new Date().toISOString();
      const targets: Array<{ table: string; indexable: boolean }> = [
        { table: "seo_city_pages", indexable: true },
        { table: "city_guides", indexable: false },
        { table: "seo_department_pages", indexable: true },
        { table: "articles", indexable: true },
      ];

      for (const t of targets) {
        let q = sb
          .from(t.table)
          .update({ seo_dirty_at: now })
          .eq("published", true)
          .is("seo_dirty_at", null);
        if (t.indexable) q = q.or("noindex.is.null,noindex.eq.false");
        const { data: updated, error } = await q.select("id");
        if (error) throw error;
        perTable[t.table] = (updated ?? []).length;
        marked += perTable[t.table];
      }
    }

    const { data: inserted, error: insertError } = await sb
      .from("deploy_fingerprints")
      .insert({
        fingerprint,
        marked_at: reason === "deploy_detected" ? new Date().toISOString() : null,
        marked_rows: marked,
      })
      .select("id")
      .maybeSingle();
    if (insertError) throw insertError;

    await sb.from("prerender_recache_log").insert({
      article_id: null,
      url: `${SITE}/?fingerprint=${fingerprint}`,
      status_code: null,
      ok: true,
      detail: `${reason}, ${marked} lignes marquees ${JSON.stringify(perTable)}`,
      source: "deploy-detector",
    });

    const payload = {
      fingerprint,
      fingerprint_id: inserted?.id ?? null,
      changed: true,
      reason,
      marked,
      per_table: perTable,
    };
    console.log(`[detect-deploy-and-mark-dirty] ${JSON.stringify(payload)}`);
    await run.finish("success", payload);
    return json(200, payload);
  } catch (e) {
    await run.fail(e);
    return json(500, { error: e instanceof Error ? e.message : String(e) });
  }
});
