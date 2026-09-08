/**
 * detect-deploy-and-mark-dirty
 *
 * Cron toutes les 10 minutes. Detecte une mise en ligne du frontend et remplit
 * la file d'invalidation Prerender, SANS jamais appeler Prerender elle-meme.
 * Le decouplage est volontaire : cette fonction remplit la file, la fonction
 * `consume-seo-dirty` la vide a budget plafonne, ce qui protege le quota
 * mensuel de 25 000 renders du compte partage.
 *
 * Marquage PAR FAMILLE depuis le 08/09/2026 : le detecteur lit
 * /route-hashes.json (emis au build par scripts/vite-plugin-route-hashes.mjs)
 * et ne marque que les familles (villes, departements, guides, articles) dont
 * l'empreinte a change, plus toutes les familles si l'empreinte GLOBALE
 * (index.html, siteRoutes.ts, sync-index-html.mjs, dictionnaire fr) a change,
 * plus toute famille non rafraichie depuis FAMILY_MAX_AGE_DAYS.
 * Chaque decision est journalisee dans public.prerender_mark_decisions.
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


/**
 * Filet de securite temporel, en jours.
 *
 * Une famille non marquee depuis plus longtemps que cette valeur est marquee
 * quoi qu'il arrive, meme si son empreinte n'a pas bouge. L'expiration du
 * cache Prerender est a 7 jours : marquer a 5 jours garantit un
 * rafraichissement avant expiration, avec deux jours de marge pour
 * l'ecoulement de la file (50 pages par passage).
 */
const FAMILY_MAX_AGE_DAYS = 5;

/** Fichier d'empreintes emis au build par scripts/vite-plugin-route-hashes.mjs. */
const ROUTE_HASHES_URL = `${SITE}/route-hashes.json`;

/**
 * Famille de pages pre-rendues -> table portant seo_dirty_at.
 * Les cles doivent correspondre a FAMILY_ROOTS du greffon de build.
 */
const FAMILY_TABLES: Record<string, { table: string; indexable: boolean }> = {
  cities: { table: "seo_city_pages", indexable: true },
  departments: { table: "seo_department_pages", indexable: true },
  guides: { table: "city_guides", indexable: false },
  articles: { table: "articles", indexable: true },
};

type RouteHashes = { global: string; families: Record<string, string> };

async function fetchRouteHashes(): Promise<RouteHashes | null> {
  try {
    const r = await fetch(`${ROUTE_HASHES_URL}?ts=${Date.now()}`, {
      headers: { "Cache-Control": "no-cache" },
    });
    if (!r.ok) return null;
    const j = await r.json();
    if (typeof j?.global !== "string" || typeof j?.families !== "object") return null;
    return { global: j.global, families: j.families };
  } catch {
    return null;
  }
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

    // Options de test.
    let forced: string | null = null;
    let budgetOverride: number | null = null;
    let ignoreDebounce = false;
    let forcedHashes: RouteHashes | null = null;
    if (req.method === "POST") {
      try {
        const body = await req.json();
        if (typeof body?.fingerprint === "string" && body.fingerprint.length > 0) {
          forced = body.fingerprint;
        }
        if (typeof body?.monthly_budget_override === "number" && body.monthly_budget_override >= 0) {
          budgetOverride = body.monthly_budget_override;
        }
        if (body?.ignore_debounce === true) ignoreDebounce = true;
        if (body?.route_hashes && typeof body.route_hashes.global === "string") {
          forcedHashes = body.route_hashes as RouteHashes;
        }
      } catch { /* corps absent ou invalide */ }
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

    const hashes = forcedHashes ?? (await fetchRouteHashes());

    const { data: known, error: knownError } = await sb
      .from("deploy_fingerprints")
      .select("id, fingerprint, seen_count, marked_at")
      .order("first_seen_at", { ascending: false })
      .limit(50);
    if (knownError) throw knownError;
    const rows = (known ?? []) as Array<{
      id: string; fingerprint: string; seen_count: number; marked_at: string | null;
    }>;
    const existing = rows.find((r) => r.fingerprint === fingerprint);
    const isFirstEverRun = rows.length === 0;

    const { data: stateRows, error: stateError } = await sb
      .from("prerender_family_state")
      .select("family, last_hash, last_global_hash, last_marked_at");
    if (stateError) throw stateError;
    const state = new Map(
      (stateRows ?? []).map((r) => [r.family as string, r as {
        family: string; last_hash: string | null; last_global_hash: string | null; last_marked_at: string | null;
      }]),
    );

    const nowMs = Date.now();
    const lastMarkedAt = rows.map((r) => r.marked_at).filter((d): d is string => !!d).sort().pop();
    const hoursSinceLastMark = lastMarkedAt
      ? (nowMs - new Date(lastMarkedAt).getTime()) / 3_600_000
      : Number.POSITIVE_INFINITY;

    const bundleChanged = !existing;
    const globalHash = hashes?.global ?? null;

    // 1. Decision par famille, avant tout marquage.
    type Decision = {
      family: string; reason: string; previous_hash: string | null; new_hash: string | null;
      previous_global_hash: string | null; new_global_hash: string | null;
      days_since_last_mark: number | null; detail: string;
    };
    const decisions: Decision[] = [];
    for (const family of Object.keys(FAMILY_TABLES)) {
      const st = state.get(family);
      const prevHash = st?.last_hash ?? null;
      const newHash = hashes?.families?.[family] ?? null;
      const prevGlobal = st?.last_global_hash ?? null;
      const days = st?.last_marked_at
        ? (nowMs - new Date(st.last_marked_at).getTime()) / 86_400_000
        : null;

      let reason: string;
      let detail: string;
      if (!hashes) {
        reason = "hashes_unavailable";
        detail = "route-hashes.json illisible, marquage de securite de toutes les familles";
      } else if (!st) {
        reason = "bootstrap";
        detail = "premier passage pour cette famille, empreintes enregistrees sans marquage";
      } else if (globalHash && prevGlobal && globalHash !== prevGlobal) {
        reason = "global_changed";
        detail = `empreinte globale (index.html, siteRoutes.ts, sync-index-html.mjs, dictionnaire fr) ${prevGlobal} -> ${globalHash}`;
      } else if (newHash && prevHash && newHash !== prevHash) {
        reason = "hash_changed";
        detail = `empreinte de famille ${prevHash} -> ${newHash}`;
      } else if (days === null || days >= FAMILY_MAX_AGE_DAYS) {
        reason = "time_safety_net";
        detail = `derniere vague il y a ${days === null ? "jamais" : days.toFixed(1) + " j"}, filet a ${FAMILY_MAX_AGE_DAYS} j`;
      } else {
        reason = "unchanged";
        detail = `empreinte inchangee (${newHash ?? "?"}), derniere vague il y a ${days.toFixed(1)} j`;
      }
      decisions.push({
        family, reason, previous_hash: prevHash, new_hash: newHash,
        previous_global_hash: prevGlobal, new_global_hash: globalHash,
        days_since_last_mark: days, detail,
      });
    }

    // 2. Garde-fous globaux : bootstrap, debounce, plafond mensuel.
    const MARKING_REASONS = new Set(["global_changed", "hash_changed", "time_safety_net", "hashes_unavailable"]);
    let toMark = decisions.filter((d) => MARKING_REASONS.has(d.reason));
    let globalReason = bundleChanged ? "deploy_detected" : "no_new_bundle";
    if (isFirstEverRun) {
      globalReason = "bootstrap";
      toMark = [];
    } else if (!hashes && !bundleChanged) {
      // Sans fichier d'empreintes lisible, on retombe sur l'ancien comportement
      // (marquage complet), mais uniquement quand un nouveau bundle apparait :
      // sinon le repli marquerait 436 pages a chaque fenetre de 24 h.
      globalReason = "no_new_bundle";
      toMark = [];
    } else if (!ignoreDebounce && hoursSinceLastMark < MIN_MARK_INTERVAL_HOURS && toMark.length > 0) {
      globalReason = "debounced";
      toMark = [];
    }

    let monthlyUsed = 0;
    let waveSize = 0;
    const perTable: Record<string, number> = {};
    let marked = 0;

    if (toMark.length > 0) {
      const monthStart = new Date();
      monthStart.setUTCDate(1);
      monthStart.setUTCHours(0, 0, 0, 0);
      const { count: usedCount, error: usedError } = await sb
        .from("prerender_recache_log")
        .select("id", { count: "exact", head: true })
        .gte("created_at", monthStart.toISOString());
      if (usedError) throw usedError;
      monthlyUsed = usedCount ?? 0;

      for (const d of toMark) {
        const t = FAMILY_TABLES[d.family];
        let q = sb.from(t.table).select("id", { count: "exact", head: true })
          .eq("published", true).is("seo_dirty_at", null);
        if (t.indexable) q = q.or("noindex.is.null,noindex.eq.false");
        const { count, error } = await q;
        if (error) throw error;
        waveSize += count ?? 0;
      }

      if (monthlyUsed + waveSize > monthlyBudget) {
        globalReason = "monthly_budget_exceeded";
        for (const d of toMark) {
          d.detail = `refuse, plafond mensuel : ${monthlyUsed}/${monthlyBudget} renders, vague de ${waveSize} pages. Motif initial : ${d.reason}`;
          d.reason = "monthly_budget_exceeded";
        }
        toMark = [];
      }
    }

    // 3. Marquage effectif.
    const markedRowsByFamily: Record<string, number> = {};
    if (toMark.length > 0) {
      const now = new Date().toISOString();
      for (const d of toMark) {
        const t = FAMILY_TABLES[d.family];
        let q = sb.from(t.table).update({ seo_dirty_at: now })
          .eq("published", true).is("seo_dirty_at", null);
        if (t.indexable) q = q.or("noindex.is.null,noindex.eq.false");
        const { data: updated, error } = await q.select("id");
        if (error) throw error;
        const n = (updated ?? []).length;
        markedRowsByFamily[d.family] = n;
        perTable[t.table] = n;
        marked += n;
      }
      if (globalReason !== "monthly_budget_exceeded") globalReason = "marked";
    }

    // 4. Alerte plafond, un signal ouvert par mois.
    if (globalReason === "monthly_budget_exceeded") {
      const monthTag = new Date().toISOString().slice(0, 7);
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

    // 5. Journal des decisions, une ligne par famille et par passage decisif.
    // Les passages sans changement d'empreinte ET sans marquage ne sont pas
    // journalises (le cron passe toutes les 10 minutes), sauf refus de plafond.
    const worthLogging =
      marked > 0 ||
      globalReason === "monthly_budget_exceeded" ||
      bundleChanged;
    if (worthLogging) {
      await sb.from("prerender_mark_decisions").insert(
        decisions.map((d) => ({
          family: d.family,
          reason: d.reason,
          previous_hash: d.previous_hash,
          new_hash: d.new_hash,
          previous_global_hash: d.previous_global_hash,
          new_global_hash: d.new_global_hash,
          days_since_last_mark: d.days_since_last_mark,
          marked_rows: markedRowsByFamily[d.family] ?? 0,
          bundle_fingerprint: fingerprint,
          detail: d.detail,
        })),
      );
    }

    // 6. Etat par famille : empreintes toujours enregistrees, date de vague
    // seulement si la famille a ete marquee.
    if (hashes) {
      const nowIso = new Date().toISOString();
      const upserts = decisions.map((d) => {
        const st = state.get(d.family);
        return {
          family: d.family,
          last_hash: d.new_hash ?? st?.last_hash ?? null,
          last_global_hash: globalHash ?? st?.last_global_hash ?? null,
          last_marked_at: markedRowsByFamily[d.family] !== undefined
            ? nowIso
            : st?.last_marked_at ?? null,
          updated_at: nowIso,
        };
      });
      const { error: upsertError } = await sb
        .from("prerender_family_state")
        .upsert(upserts, { onConflict: "family" });
      if (upsertError) throw upsertError;
    }

    // 7. Empreinte de bundle.
    if (existing) {
      await sb.from("deploy_fingerprints")
        .update({ last_seen_at: new Date().toISOString(), seen_count: existing.seen_count + 1 })
        .eq("id", existing.id);
    } else {
      const { error: insertError } = await sb.from("deploy_fingerprints").insert({
        fingerprint,
        marked_at: marked > 0 ? new Date().toISOString() : null,
        marked_rows: marked,
      });
      if (insertError) throw insertError;
    }

    if (bundleChanged || marked > 0 || globalReason === "monthly_budget_exceeded") {
      await sb.from("prerender_recache_log").insert({
        article_id: null,
        url: `${SITE}/?fingerprint=${fingerprint}`,
        status_code: null,
        ok: globalReason !== "monthly_budget_exceeded",
        detail: `${globalReason}, ${marked} lignes marquees ${JSON.stringify(markedRowsByFamily)}`,
        source: "deploy-detector",
      });
    }

    const payload = {
      fingerprint,
      changed: bundleChanged,
      reason: globalReason,
      global_hash: globalHash,
      marked,
      per_family: markedRowsByFamily,
      per_table: perTable,
      decisions: decisions.map((d) => ({ family: d.family, reason: d.reason, detail: d.detail })),
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
