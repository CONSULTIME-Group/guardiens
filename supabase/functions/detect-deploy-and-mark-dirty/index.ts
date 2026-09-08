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
 * Intervalle minimal entre deux vagues de marquage, en heures.
 *
 * Valeur retenue le 08/09/2026 : 24 h. Seuls les robots lisent la version en
 * cache, jamais les visiteurs, qui recoivent toujours l'application. Google
 * repasse sur une page ville toutes les quelques jours, pas toutes les douze
 * heures. Descendre a 12 h doublait donc la consommation de renders sans
 * avancer la date a laquelle un robot voit le changement.
 *
 * Pour changer la valeur : modifier la constante ci-dessous, rien d'autre.
 * La baisser augmente proportionnellement la consommation mensuelle, elle doit
 * donc etre revue avec MONTHLY_RENDER_BUDGET.
 */
const MIN_MARK_INTERVAL_HOURS = 24;


/**
 * Plafond mensuel de renders Prerender inities par nous, toutes sources
 * confondues (vagues de deploiement, triggers de contenu, fiches gardien).
 *
 * Le quota du compte Prerender est de 25 000 renders par mois et il est
 * partage avec un autre domaine. Les robots declenchent en plus leurs propres
 * renders a l'expiration naturelle du cache, de l'ordre de 2 800 par mois pour
 * 646 URLs a 7 jours. Plafonner nos propres renders a 18 000 laisse environ
 * 7 000 renders de marge pour ces deux postes, tout en autorisant environ
 * 41 vagues de 436 pages par mois, soit plus d'une par jour.
 *
 * Pour changer la valeur : modifier la constante ci-dessous. Le detecteur
 * compte les lignes de public.prerender_recache_log du mois calendaire en
 * cours et refuse de marquer une vague qui ferait franchir ce plafond.
 */
const MONTHLY_RENDER_BUDGET = 18_000;

/** Identifiant d'entite fixe du signal admin "plafond mensuel atteint". */
const BUDGET_SIGNAL_ENTITY_ID = "9e0b6f2a-7c41-4d2e-9a55-5b1f2c3d4e5f";


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

    // Option de test : forcer une empreinte donnee sans dependre du reseau,
    // et abaisser temporairement le plafond mensuel pour verifier le refus.
    let forced: string | null = null;
    let budgetOverride: number | null = null;
    let ignoreDebounce = false;
    if (req.method === "POST") {
      try {
        const body = await req.json();
        if (typeof body?.fingerprint === "string" && body.fingerprint.length > 0) {
          forced = body.fingerprint;
        }
        if (typeof body?.monthly_budget_override === "number" && body.monthly_budget_override >= 0) {
          budgetOverride = body.monthly_budget_override;
        }
        // Test uniquement : ignorer le delai minimal entre deux vagues.
        if (body?.ignore_debounce === true) ignoreDebounce = true;
      } catch { /* corps absent ou invalide, comportement normal */ }
    }
    const monthlyBudget = budgetOverride ?? MONTHLY_RENDER_BUDGET;


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
    else if (!ignoreDebounce && hoursSinceLastMark < MIN_MARK_INTERVAL_HOURS) reason = "debounced";

    let marked = 0;
    const perTable: Record<string, number> = {};

    const targets: Array<{ table: string; indexable: boolean }> = [
      { table: "seo_city_pages", indexable: true },
      { table: "city_guides", indexable: false },
      { table: "seo_department_pages", indexable: true },
      { table: "articles", indexable: true },
    ];

    // Compte des renders deja inities ce mois calendaire, toutes sources
    // confondues, et taille de la vague a venir. On ne marque que si la somme
    // tient sous le plafond.
    let monthlyUsed = 0;
    let waveSize = 0;
    if (reason === "deploy_detected") {
      const monthStart = new Date();
      monthStart.setUTCDate(1);
      monthStart.setUTCHours(0, 0, 0, 0);

      const { count: usedCount, error: usedError } = await sb
        .from("prerender_recache_log")
        .select("id", { count: "exact", head: true })
        .gte("created_at", monthStart.toISOString());
      if (usedError) throw usedError;
      monthlyUsed = usedCount ?? 0;

      for (const t of targets) {
        let q = sb
          .from(t.table)
          .select("id", { count: "exact", head: true })
          .eq("published", true)
          .is("seo_dirty_at", null);
        if (t.indexable) q = q.or("noindex.is.null,noindex.eq.false");
        const { count, error } = await q;
        if (error) throw error;
        waveSize += count ?? 0;
      }

      if (monthlyUsed + waveSize > monthlyBudget) {
        reason = "monthly_budget_exceeded";
      }
    }

    if (reason === "deploy_detected") {
      const now = new Date().toISOString();
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

    if (reason === "monthly_budget_exceeded") {
      const monthTag = new Date().toISOString().slice(0, 7);
      // Un seul signal ouvert par mois : le cron passe toutes les 10 minutes.
      const { data: openSignal } = await sb
        .from("admin_signals")
        .select("id, metadata")
        .eq("signal_type", "prerender_monthly_budget_reached")
        .is("resolved_at", null)
        .limit(20);
      const already = (openSignal ?? []).some(
        (s) => ((s.metadata ?? {}) as { month?: string }).month === monthTag,
      );
      if (!already) {
        const { error: signalError } = await sb.from("admin_signals").insert({
          signal_type: "prerender_monthly_budget_reached",
          severity: "critical",
          entity_type: "system",
          // admin_signals.entity_id est obligatoire : identifiant fixe du
          // poste "budget Prerender", la deduplication se fait sur le mois.
          entity_id: BUDGET_SIGNAL_ENTITY_ID,
          metadata: {
            nature: "seo",
            month: monthTag,
            renders_used: monthlyUsed,
            monthly_budget: monthlyBudget,
            wave_size: waveSize,
            detail:
              "Plafond mensuel de renders atteint, le rafraichissement du cache est suspendu jusqu'au mois prochain, guardiens.fr peut servir du contenu perime aux robots.",
          },
        });
        if (signalError && signalError.code !== "23505") {
          console.error("admin_signals insert failed", signalError);
        }
      }
      console.warn(
        `[detect-deploy-and-mark-dirty] refus de marquage : ${monthlyUsed}/${monthlyBudget} renders ce mois, vague de ${waveSize} pages refusee`,
      );
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
      ok: reason !== "monthly_budget_exceeded",
      detail:
        reason === "monthly_budget_exceeded"
          ? `monthly_budget_exceeded, ${monthlyUsed}/${monthlyBudget} renders ce mois, vague de ${waveSize} pages refusee`
          : `${reason}, ${marked} lignes marquees ${JSON.stringify(perTable)}`,
      source: "deploy-detector",
    });

    const payload = {
      fingerprint,
      fingerprint_id: inserted?.id ?? null,
      changed: true,
      reason,
      marked,
      per_table: perTable,
      monthly_used: monthlyUsed,
      monthly_budget: monthlyBudget,
      wave_size: waveSize,
    };

    console.log(`[detect-deploy-and-mark-dirty] ${JSON.stringify(payload)}`);
    await run.finish("success", payload);
    return json(200, payload);
  } catch (e) {
    await run.fail(e);
    return json(500, { error: e instanceof Error ? e.message : String(e) });
  }
});
