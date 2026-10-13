/**
 * source-guide-places : file du protocole de génération des guides locaux
 * (lots GL1 à GL4). Le déroulé des huit étapes est décrit dans
 * supabase/functions/_shared/guide-places/pipeline.ts.
 *
 * Chaque appel (tâche planifiée toutes les deux minutes) :
 * - fait avancer d'une étape chaque guide en cours (requêtes OpenStreetMap
 *   envoyées, réponses relues, rayon élargi, ou guide terminé) ;
 * - démarre de nouveaux guides tant que moins de ACTIVE_MAX sont en cours.
 * La réponse part tout de suite (202), le travail continue en arrière-plan :
 * pg_net n'expédie les requêtes déposées par la fonction qu'une fois l'appel
 * qui l'a lancée terminé (mesure du 13/10/2026).
 *
 * Les lieux sans source restent en base (rien n'est supprimé) ; un guide
 * sourcé n'affiche plus que ses lieux sourcés.
 *
 * Appel : secret GEOCODE_PROFILE_SECRET dans `x-geocode-secret` (tâche
 * planifiée), ou session admin, ou clé service.
 * Corps : { slugs?: string[] (démarre ou fait avancer ces guides),
 *           dry_run?: boolean (avec slugs : rien n'est écrit sauf le rapport),
 *           force?: boolean (avec slugs : reprend un guide déjà sourcé) }
 */
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { requireAdminOrServiceRole } from "../_shared/require-admin.ts";
import { advanceGuide } from "../_shared/guide-places/pipeline.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-geocode-secret",
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

/** Guides en cours en même temps : limite la charge envoyée à Overpass. */
const ACTIVE_MAX = 3;
/** Un guide terminé en échec repasse une heure plus tard. */
const RETRY_AFTER_MS = 3600 * 1000;
/** Verrou d'un guide pendant son traitement (deux passages ne se chevauchent pas). */
const LOCK_MS = 3 * 60 * 1000;

const COLS =
  "id, slug, city, postal_code, department, country, latitude, longitude, published, publish_when_sourced, places_sourced_at, places_source_attempted_at, places_source_passes, places_source_report, pipeline_lock_until";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const secret = Deno.env.get("GEOCODE_PROFILE_SECRET");
  const bySecret = !!secret && req.headers.get("x-geocode-secret") === secret;
  if (!bySecret) {
    const fail = await requireAdminOrServiceRole(req, corsHeaders);
    if (fail) return fail;
  }

  let body: any = {};
  try {
    body = await req.json();
  } catch {
    body = {};
  }
  const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
  const slugs: string[] | null = Array.isArray(body?.slugs) && body.slugs.length ? body.slugs.map(String).slice(0, 5) : null;
  const dryRun = body?.dry_run === true && !!slugs;
  const force = body?.force === true;
  const googleKey = Deno.env.get("GOOGLE_PLACES_API_KEY") || null;

  const work = async () => {
    const t0 = Date.now();
    const nowIso = () => new Date().toISOString();

    // Guides en cours : ceux qui ont des requêtes dans guide_osm_requests.
    const { data: activeRows } = await supabase.from("guide_osm_requests").select("city_guide_id");
    const activeIds = [...new Set((activeRows ?? []).map((r: any) => r.city_guide_id))];

    let targets: any[] = [];
    if (slugs) {
      const { data } = await supabase.from("city_guides").select(COLS).in("slug", slugs);
      targets = (data ?? []).filter((g: any) => force || dryRun || !g.places_sourced_at || activeIds.includes(g.id));
      // Reprise forcée : le guide garde son affichage sourcé pendant le passage,
      // le compteur de passages repart de zéro.
      if (force && !dryRun) {
        for (const g of targets) {
          if (!activeIds.includes(g.id)) {
            await supabase.from("city_guides").update({ places_source_passes: 0 }).eq("id", g.id);
            g.places_source_passes = 0;
          }
        }
      }
    } else {
      if (activeIds.length) {
        const { data } = await supabase.from("city_guides").select(COLS).in("id", activeIds);
        targets = data ?? [];
      }
      const room = ACTIVE_MAX - targets.length;
      if (room > 0) {
        const retryBefore = new Date(Date.now() - RETRY_AFTER_MS).toISOString();
        const { data } = await supabase
          .from("city_guides")
          .select(COLS)
          .is("places_sourced_at", null)
          .or(`places_source_attempted_at.is.null,places_source_attempted_at.lt.${retryBefore}`)
          .order("places_source_attempted_at", { ascending: true, nullsFirst: true })
          .order("slug", { ascending: true })
          .limit(room + activeIds.length);
        for (const g of data ?? []) {
          if (targets.length >= ACTIVE_MAX) break;
          if (!activeIds.includes(g.id)) targets.push(g);
        }
      }
    }

    for (const g of targets) {
      // Verrou : un passage qui chevauche le précédent laisse le guide de côté.
      const lockUntil = new Date(Date.now() + LOCK_MS).toISOString();
      // Un essai à blanc ne touche pas à la file (aucune date de passage écrite).
      const claim: Record<string, unknown> = { pipeline_lock_until: lockUntil };
      if (!dryRun) claim.places_source_attempted_at = nowIso();
      const { data: claimed } = await supabase
        .from("city_guides")
        .update(claim)
        .eq("id", g.id)
        .or(`pipeline_lock_until.is.null,pipeline_lock_until.lt.${nowIso()}`)
        .select("id");
      if (!claimed || claimed.length === 0) continue;
      let report: Record<string, unknown>;
      try {
        report = await advanceGuide(supabase, g, { dryRun, googleKey, deadline: t0 + 100_000, explicit: !!slugs });
      } catch (e) {
        report = { slug: g.slug, etape: "erreur", result: "erreur", erreur: String(e), at: nowIso() };
        // Erreur inattendue : requêtes retirées, le guide repasse une heure plus tard.
        await supabase.from("guide_osm_requests").delete().eq("city_guide_id", g.id);
      }
      const patch: Record<string, unknown> = { pipeline_lock_until: null };
      // L'étape « termine » écrit son propre rapport ; les autres étapes sont notées ici.
      if (report.etape !== "termine" || report.result === "dry_run") patch.places_source_report = report;
      if (["sans_centre", "erreur", "overpass_indisponible", "erreur_insertion"].includes(String(report.result))) {
        patch.places_source_result = String(report.result);
      }
      await supabase.from("city_guides").update(patch).eq("id", g.id);
      if (Date.now() - t0 > 100_000) break;
    }
  };

  const task = work().catch((e) => console.error("[source-guide-places]", e));
  const runtime = (globalThis as any).EdgeRuntime;
  if (runtime?.waitUntil) runtime.waitUntil(task);
  else await task;
  return json({ lance: true, slugs, dry_run: dryRun }, 202);
});
