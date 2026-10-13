/**
 * source-guide-places (lots GL1 à GL3, 13/10/2026)
 *
 * Pour chaque guide traité :
 * 1. fixe le centre réel du guide (pays, coordonnées) : BAN en France,
 *    Nominatim ailleurs, en départageant les homonymes par le lieu du
 *    propriétaire qui a fait naître la demande de guide ;
 * 2. collecte des lieux OpenStreetMap pour toutes les catégories, en élargissant
 *    le rayon (5, 15, 30 puis 50 km) tant qu'une catégorie manque ;
 * 3. rapproche chaque lieu ponctuel de sa fiche Google (identifiant seul) ;
 * 4. date `places_sourced_at` : à partir de là, la page n'affiche plus que les
 *    lieux sourcés de ce guide.
 *
 * Les lieux sans source restent en base (rien n'est supprimé), ils ne sont
 * plus affichés une fois le guide sourcé.
 *
 * Appel : secret GEOCODE_PROFILE_SECRET dans `x-geocode-secret` (tâche
 * planifiée), ou session admin, ou clé service.
 * Corps : { slugs?: string[], limit?: number (1 à 3), dry_run?: boolean,
 *           force?: boolean }
 */
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { requireAdminOrServiceRole } from "../_shared/require-admin.ts";
import { sourceOneGuide } from "../_shared/guide-places/run.ts";

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

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const secret = Deno.env.get("GEOCODE_PROFILE_SECRET");
  const bySecret = !!secret && req.headers.get("x-geocode-secret") === secret;
  if (!bySecret) {
    const fail = await requireAdminOrServiceRole(req, corsHeaders);
    if (fail) return fail;
  }

  try {
    const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    let body: any = {};
    try {
      body = await req.json();
    } catch {
      body = {};
    }
    const slugs: string[] | null = Array.isArray(body?.slugs) && body.slugs.length ? body.slugs.map(String) : null;
    const dryRun = body?.dry_run === true;
    const force = body?.force === true;
    const limit = Math.min(3, Math.max(1, Number(body?.limit) || 1));
    const cols = "id, slug, city, postal_code, department, country, latitude, longitude, published, publish_when_sourced, places_sourced_at, places_source_attempted_at";
    const sixHoursAgo = new Date(Date.now() - 6 * 3600 * 1000).toISOString();

    let guides: any[] = [];
    if (slugs) {
      const { data, error } = await supabase.from("city_guides").select(cols).in("slug", slugs);
      if (error) return json({ error: error.message }, 500);
      guides = (data ?? []).filter((g: any) => force || !g.places_sourced_at).slice(0, 3);
    } else {
      // File : jamais tentés d'abord, puis tentés il y a plus de 6 heures.
      const { data, error } = await supabase
        .from("city_guides")
        .select(cols)
        .is("places_sourced_at", null)
        .or(`places_source_attempted_at.is.null,places_source_attempted_at.lt.${sixHoursAgo}`)
        .order("places_source_attempted_at", { ascending: true, nullsFirst: true })
        .order("slug", { ascending: true })
        .limit(limit);
      if (error) return json({ error: error.message }, 500);
      guides = data ?? [];
    }

    const googleKey = Deno.env.get("GOOGLE_PLACES_API_KEY") || null;
    const details: unknown[] = [];
    for (const g of guides) {
      // Réservation : un guide pris par un autre passage (tâche planifiée,
      // nouveau guide en cours) est laissé de côté.
      if (!dryRun && !slugs) {
        const { data: claimed } = await supabase
          .from("city_guides")
          .update({ places_source_attempted_at: new Date().toISOString() })
          .eq("id", g.id)
          .is("places_sourced_at", null)
          .or(`places_source_attempted_at.is.null,places_source_attempted_at.lt.${sixHoursAgo}`)
          .select("id");
        if (!claimed || claimed.length === 0) {
          details.push({ slug: g.slug, result: "deja_pris" });
          continue;
        }
      }
      let report: Record<string, unknown>;
      try {
        report = await sourceOneGuide(supabase, g, { dryRun, googleKey });
      } catch (e) {
        report = { slug: g.slug, result: "erreur", erreur: String(e) };
      }
      details.push(report);
      if (!dryRun) {
        const patch: Record<string, unknown> = {
          places_source_attempted_at: new Date().toISOString(),
          places_source_result: String(report.result),
        };
        if (report.result === "ok") patch.places_sourced_at = new Date().toISOString();
        // Nouveau guide resté sans lieu à sa création : publié dès qu'il est sourcé.
        if (report.result === "ok" && g.publish_when_sourced && Number(report.total_sources) > 0) {
          patch.published = true;
          patch.publish_when_sourced = false;
        }
        await supabase.from("city_guides").update(patch).eq("id", g.id);
      }
    }

    const { count: restants } = await supabase
      .from("city_guides")
      .select("id", { count: "exact", head: true })
      .is("places_sourced_at", null);

    return json({ traites: guides.length, restants: restants ?? null, dry_run: dryRun, details });
  } catch (e) {
    return json({ error: String(e) }, 500);
  }
});
