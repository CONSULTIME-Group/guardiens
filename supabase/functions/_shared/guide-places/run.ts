/**
 * Traitement d'un guide (lots GL1 à GL3), partagé par source-guide-places
 * (file et tâche planifiée) et generate-city-guide (nouveau guide).
 * Voir supabase/functions/source-guide-places/index.ts pour le déroulé.
 */
import {
  ALL_CATEGORIES,
  collectPlaces,
  dbOverpassBatch,
  type OverpassAttempt,
  countryLabel,
  haversineM,
  matchGooglePlaceId,
  normName,
  resolveGuideCenter,
  type GuideCategory,
  type GuideCenter,
  type PlaceKind,
} from "./source.ts";

const sleep = (ms: number): Promise<void> => new Promise((r) => setTimeout(r, ms));

/** Département hérité invalide (« G0 » pour un code postal canadien). */
const looksLikeBadDepartment = (d: string | null | undefined) =>
  !d || !d.trim() || /^(?=.*\d)[A-Z0-9]{1,3}$/i.test(d.trim());

export async function sourceOneGuide(
  supabase: any,
  guide: any,
  opts: { dryRun: boolean; googleKey: string | null; center?: GuideCenter | null; deadline?: number },
) {
  const report: Record<string, unknown> = { slug: guide.slug };
  // Marge sous la limite d'exécution des fonctions (150 s).
  const deadline = opts.deadline ?? Date.now() + 110_000;

  // 1. Centre du guide
  let center: GuideCenter | null = opts.center ??
    (guide.latitude != null && guide.longitude != null
      ? { lat: Number(guide.latitude), lon: Number(guide.longitude), country: guide.country || "FR", region: null }
      : null);

  if (!center) {
    const { data: req } = await supabase
      .from("guide_requests")
      .select("country, latitude, longitude")
      .or(`city_guide_id.eq.${guide.id},slug.eq.${guide.slug}`)
      .limit(1)
      .maybeSingle();
    const hint = req?.latitude != null && req?.longitude != null
      ? { lat: Number(req.latitude), lon: Number(req.longitude) }
      : null;
    const country = (req?.country || guide.country || "FR").toUpperCase();
    center = await resolveGuideCenter(
      { city: guide.city, postalCode: guide.postal_code, country, hint },
      fetch,
    );
    if (!center) {
      report.result = "sans_centre";
      return report;
    }
    const patch: Record<string, unknown> = {
      country: center.country,
      latitude: center.lat,
      longitude: center.lon,
    };
    if (center.country !== "FR" && looksLikeBadDepartment(guide.department)) {
      patch.department = center.region ?? countryLabel(center.country);
    }
    if (!opts.dryRun) await supabase.from("city_guides").update(patch).eq("id", guide.id);
    report.centre = patch;
  }

  // 2. Lieux sourcés déjà en base
  const { data: existing } = await supabase
    .from("city_guide_places")
    .select("id, name, address, category, place_kind, source_url, latitude, longitude, distance_km, google_place_id, google_rating_attempted_at")
    .eq("city_guide_id", guide.id);
  const sourced = (existing ?? []).filter((p: any) => p.source_url);
  const counts: Partial<Record<GuideCategory, number>> = {};
  for (const p of sourced) {
    if (ALL_CATEGORIES.includes(p.category)) counts[p.category as GuideCategory] = (counts[p.category as GuideCategory] ?? 0) + 1;
  }
  const { data: allSources } = await supabase
    .from("city_guide_places")
    .select("source_url")
    .eq("city_guide_id", guide.id)
    .not("source_url", "is", null);
  const known = {
    names: new Set<string>(sourced.map((p: any) => normName(p.name))),
    sources: new Set<string>((allSources ?? []).map((r: any) => String(r.source_url))),
    counts,
  };

  // Distance des lieux sourcés existants (vétérinaires et animaleries du
  // précédent passage) : un lieu hors rayon du nouveau centre est signalé.
  const tooFar: string[] = [];
  for (const p of sourced) {
    if (p.latitude == null || p.longitude == null) continue;
    const km = Math.round(haversineM(center.lat, center.lon, Number(p.latitude), Number(p.longitude)) / 100) / 10;
    if (km > 52) tooFar.push(p.name);
    if (!opts.dryRun && p.distance_km !== km) {
      await supabase.from("city_guide_places").update({ distance_km: km }).eq("id", p.id);
    }
  }
  if (tooFar.length) report.sources_existantes_hors_rayon = tooFar;

  // 3. Collecte
  // Overpass par la base seulement : diagnostic du 13/10/2026, depuis la
  // fonction serveur overpass-api.de répond 406 en 0,5 s et les autres miroirs
  // ne répondent pas en 15 s. Les filtres d'un même rayon partent ensemble.
  const attempts: OverpassAttempt[] = [];
  const onAttempt = (a: OverpassAttempt) => attempts.push(a);
  const batch = dbOverpassBatch((fn, args) => supabase.rpc(fn, args), sleep, onAttempt);
  const collected = await collectPlaces(
    { city: guide.city, postalCode: guide.postal_code, center },
    known,
    fetch,
    sleep,
    deadline,
    undefined,
    batch,
  );
  const summary: Record<string, number> = {};
  for (const a of attempts) summary[`${a.via}:${a.mirror}:${a.outcome}`] = (summary[`${a.via}:${a.mirror}:${a.outcome}`] ?? 0) + 1;
  report.overpass = { essais: attempts.length, par_issue: summary, premiers: attempts.slice(0, 8) };
  report.rayons = collected.radiiUsed;
  report.rejetes_distance = collected.rejectedDistance;
  report.rejetes_adresse = collected.rejectedAddress;

  if (collected.overpassFailed && collected.rows.length === 0) {
    report.centre_final = center;
    report.noms = sourced.map((p: any) => p.name);
    report.result = "overpass_indisponible";
    return report;
  }

  const now = new Date().toISOString();
  const rows = collected.rows.map(({ kind, ...r }) => ({
    ...r,
    place_kind: kind,
    city_guide_id: guide.id,
    verified_at: now,
  }));
  report.inseres = rows.length;
  report.par_categorie = rows.reduce((acc: Record<string, number>, r) => {
    acc[r.category] = (acc[r.category] ?? 0) + 1;
    return acc;
  }, {});

  if (opts.dryRun) {
    report.lignes = rows;
    report.result = "dry_run";
    return report;
  }

  let inserted: any[] = [];
  if (rows.length) {
    // Index unique (city_guide_id, source_url) : deux passages simultanés
    // n'ajoutent jamais deux fois le même lieu.
    const { data, error } = await supabase
      .from("city_guide_places")
      .upsert(rows, { onConflict: "city_guide_id,source_url", ignoreDuplicates: true })
      .select("id, name, address, latitude, longitude, place_kind");
    if (error) {
      report.result = "erreur_insertion";
      report.erreur = error.message;
      return report;
    }
    inserted = data ?? [];
  }

  // 4. Identifiant Google (lien itinéraire et avis), jamais la note
  if (opts.googleKey) {
    const google: Record<string, number> = {};
    // Lieux à rapprocher : les nouveaux, puis les sourcés d'un passage
    // précédent jamais tentés (vétérinaires et animaleries d'avant GL).
    const kindOf = (p: any): PlaceKind | null =>
      (p.place_kind as PlaceKind) ?? (p.category === "vet" ? "vet" : p.category === "pet_shop" ? "pet_shop" : null);
    const queue = [
      ...inserted,
      ...sourced.filter((p: any) => !p.google_place_id && !p.google_rating_attempted_at && p.latitude != null && kindOf(p)),
    ];
    for (const p of queue) {
      if (Date.now() + 3000 > deadline) {
        google.reporte = (google.reporte ?? 0) + 1;
        continue;
      }
      const res = await matchGooglePlaceId(
        { name: p.name, address: p.address ?? "", latitude: Number(p.latitude), longitude: Number(p.longitude), kind: kindOf(p)! },
        center.country,
        opts.googleKey,
        fetch,
      );
      google[res.status] = (google[res.status] ?? 0) + 1;
      if (res.status === "hors_perimetre") continue;
      await supabase
        .from("city_guide_places")
        .update({ google_place_id: res.placeId, google_rating_attempted_at: new Date().toISOString() })
        .eq("id", p.id);
      await sleep(120);
    }
    report.google = google;
  }

  const total = sourced.length + inserted.length;
  report.total_sources = total;
  report.noms = [...sourced.map((p: any) => p.name), ...inserted.map((p: any) => p.name)];
  report.centre_final = center;
  // Une panne Overpass en cours de route laisse le guide en file : le passage
  // suivant complète les catégories manquantes sans doubler les lieux.
  const result = collected.incomplete ? "partiel" : total > 0 ? "ok" : "aucun_resultat";
  report.result = result;
  return report;
}

