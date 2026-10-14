/**
 * Protocole de génération d'un guide local (lot GL4, 13/10/2026).
 *
 * Chaque guide passe, dans l'ordre, par huit étapes. Une étape qui échoue
 * laisse le guide en file ; rien n'est publié tant que les contrôles ne sont
 * pas passés. Le rapport de chaque passage est écrit dans
 * city_guides.places_source_report.
 *
 *  1. Centre vérifié : pays et coordonnées réels (BAN en France, Nominatim
 *     ailleurs, homonymes départagés par le lieu du propriétaire).
 *  2. Collecte sourcée : requêtes OpenStreetMap envoyées par la base (pg_net),
 *     sans attente dans la fonction ; réponses relues au passage suivant.
 *  3. Élargissement : 5, 15, 30 puis 50 km pour les seules catégories qui
 *     manquent.
 *  4. Contrôles : distance au centre, noms écartés, doublons, adresse.
 *  5. Insertion des seuls lieux sourcés (index unique guide et source).
 *  6. Rapprochement Google : identifiant de lieu seul (liens itinéraire, avis).
 *  7. Rédaction : introduction par l'IA à partir des seuls noms vérifiés,
 *     contrôlée (aucun lieu inventé, aucun tiret long), sinon texte factuel.
 *     Les guides refondus à la main gardent leur texte.
 *  8. Publication et signal SEO : places_sourced_at, publication d'un nouveau
 *     guide, file SEO (prérendu, sitemap) par les déclencheurs existants. Le
 *     maillage (guides voisins par distance) se calcule à l'affichage depuis
 *     les coordonnées vérifiées à l'étape 1.
 *
 * Pourquoi par la base et en plusieurs passages : mesures du 13/10/2026,
 * Overpass refuse les appels des fonctions serveur (406 ou aucune réponse) et
 * pg_net n'expédie les requêtes qu'une fois terminé l'appel qui les a
 * déposées.
 */
import {
  ALL_CATEGORIES,
  CATEGORY_RULES,
  CURATED_SLUGS,
  RADII_M,
  buildRows,
  categoriesToWiden,
  compactElements,
  countryLabel,
  factualIntro,
  haversineM,
  introProblems,
  introPrompt,
  matchGooglePlaceId,
  normName,
  overpassFilters,
  placeLabel,
  resolveGuideCenter,
  nominatimParams,
  usesBan,
  selectByCategory,
  stripDashes,
  toCandidates,
  type Candidate,
  type GuideCategory,
  type GuideCenter,
  type OsmElement,
  type PlaceKind,
} from "./source.ts";

const sleep = (ms: number): Promise<void> => new Promise((r) => setTimeout(r, ms));

/**
 * Miroirs (indices de guide_osm_enqueue) par essai : openstreetmap.fr deux
 * fois, puis mail.ru. Mesure du 14/10/2026 (00 h 20) : depuis la base,
 * openstreetmap.fr répond à toutes les requêtes (données mondiales : Montréal,
 * Marrakech), mail.ru et overpass-api.de dépassent 28 s.
 */
export const MIRROR_BY_TRY = [1, 1, 2];
/** Trois essais par requête au plus. */
export const MAX_TRIES = MIRROR_BY_TRY.length;
/**
 * Requêtes en vol en même temps, tous guides confondus : 18 requêtes
 * simultanées le 14/10/2026 donnaient 11 délais dépassés sur le même serveur.
 */
export const IN_FLIGHT_MAX = 6;
/** Requête sans réponse au-delà : comptée comme échouée. */
export const REQUEST_STALE_MS = 6 * 60 * 1000;
/** Passages partiels au-delà desquels le guide est sourcé avec ce qui a répondu. */
export const MAX_PARTIAL_PASSES = 3;

const LOVABLE_API_URL = "https://ai.gateway.lovable.dev/v1/chat/completions";

/** Département hérité invalide (« G0 » pour un code postal canadien). */
const looksLikeBadDepartment = (d: string | null | undefined) =>
  !d || !d.trim() || /^(?=.*\d)[A-Z0-9]{1,3}$/i.test(d.trim());

export interface StepReport {
  slug: string;
  etape: string;
  [k: string]: unknown;
}

export interface OsmRequestRow {
  id: number;
  round: number;
  radius: number;
  statement: string;
  mirror: number;
  net_id: number | null;
  tries: number;
  status: "sent" | "done" | "failed";
  elements: OsmElement[] | null;
  outcome: string | null;
  dry_run: boolean;
  updated_at: string;
}

/** Lecture d'une réponse pg_net : éléments, ou motif d'échec. */
export function parseOsmResponse(row: any): { elements: OsmElement[] } | { failure: string } | null {
  if (!row) return null;
  if (row.timed_out) return { failure: "pg_net_timeout" };
  if (Number(row.status_code) !== 200) return { failure: `http_${row.status_code ?? "sans_statut"}` };
  const text = String(row.content ?? "");
  if (!text.trim().startsWith("{")) return { failure: "non_json" };
  try {
    const parsed = JSON.parse(text);
    if (/runtime (error|remark)|timed out|out of memory/i.test(String(parsed?.remark ?? ""))) {
      return { failure: "remark_timeout" };
    }
    return { elements: Array.isArray(parsed?.elements) ? parsed.elements : [] };
  } catch {
    return { failure: "json_invalide" };
  }
}

/** Miroir de l'essai suivant (tries = essais déjà faits). */
export const mirrorForTry = (tries: number) => MIRROR_BY_TRY[Math.min(tries, MIRROR_BY_TRY.length - 1)];

/** Requêtes envoyées sans réponse relue, tous guides confondus. */
async function inFlight(supabase: any): Promise<number> {
  const { count } = await supabase
    .from("guide_osm_requests")
    .select("id", { count: "exact", head: true })
    .eq("status", "sent")
    .not("net_id", "is", null);
  return Number(count ?? 0);
}

/** Catégories à chercher au premier rayon : celles qui n'ont pas atteint leur maximum. */
export function initialCategories(counts: Partial<Record<GuideCategory, number>>): GuideCategory[] {
  return ALL_CATEGORIES.filter((c) => (counts[c] ?? 0) < CATEGORY_RULES[c].max);
}

/** Requêtes d'un rayon pour des catégories, sans doublon de filtre. */
export function statementsFor(categories: GuideCategory[], radius: number, center: { lat: number; lon: number }): string[] {
  return [...new Set(categories.flatMap((c) => overpassFilters(c, radius, center.lat, center.lon)))];
}

/** Candidats de toutes les réponses reçues, sans doublon de source. */
export function poolFrom(
  rows: Pick<OsmRequestRow, "status" | "elements" | "radius">[],
  center: { lat: number; lon: number },
  known: { names: Set<string>; sources: Set<string> },
): { pool: Candidate[]; rejectedDistance: number; radiiUsed: Partial<Record<GuideCategory, number>> } {
  const pool: Candidate[] = [];
  const seen = new Set<string>();
  const radiiUsed: Partial<Record<GuideCategory, number>> = {};
  let rejectedDistance = 0;
  const done = rows.filter((r) => r.status === "done" && Array.isArray(r.elements)).sort((a, b) => a.radius - b.radius);
  for (const r of done) {
    const { candidates, rejectedDistance: rd } = toCandidates(r.elements!, center, known);
    rejectedDistance += rd;
    for (const c of candidates) {
      if (seen.has(c.sourceUrl)) continue;
      seen.add(c.sourceUrl);
      pool.push(c);
      radiiUsed[c.category] = radiiUsed[c.category] ?? r.radius;
    }
  }
  return { pool, rejectedDistance, radiiUsed };
}

/** Comptes par catégorie : lieux déjà sourcés plus sélection du réservoir. */
export function countsWith(pool: Candidate[], known: Partial<Record<GuideCategory, number>>) {
  const c: Partial<Record<GuideCategory, number>> = { ...known };
  for (const x of selectByCategory(pool, known)) c[x.category] = (c[x.category] ?? 0) + 1;
  return c;
}

// ---------------------------------------------------------------------------
// Étapes avec la base
// ---------------------------------------------------------------------------

/**
 * Range les requêtes d'un rayon. Au-delà de IN_FLIGHT_MAX en vol, une requête
 * attend son tour (net_id vide, tries 0) et part à un passage suivant.
 */
async function enqueue(supabase: any, guideId: string, round: number, radius: number, statements: string[], dryRun: boolean) {
  const rows: Record<string, unknown>[] = [];
  let room = IN_FLIGHT_MAX - (await inFlight(supabase));
  for (const st of statements) {
    const base = { city_guide_id: guideId, round, radius, statement: st, dry_run: dryRun };
    if (room <= 0) {
      rows.push({ ...base, mirror: mirrorForTry(0), net_id: null, tries: 0, status: "sent", outcome: "en_file" });
      continue;
    }
    const mirror = mirrorForTry(0);
    const query = `[out:json][timeout:25];${st}out center tags;`;
    const { data: netId, error } = await supabase.rpc("guide_osm_enqueue", { p_query: query, p_mirror: mirror });
    if (!error) room--;
    rows.push({
      ...base,
      mirror,
      net_id: error ? null : netId,
      tries: error ? 0 : 1,
      status: "sent",
      outcome: error ? `enqueue_${error.code ?? "erreur"}` : null,
    });
  }
  if (rows.length) await supabase.from("guide_osm_requests").insert(rows);
  return rows.length;
}

/** Réponse Nominatim attendue au-delà : nouvelle recherche. */
export const GEOCODE_STALE_MS = 10 * 60 * 1000;

/**
 * Hors BAN (étranger, Polynésie, Nouvelle-Calédonie), la recherche Nominatim
 * part de la base (guide_geocode_enqueue) et se relit au passage suivant :
 * mesure du 14/10/2026, Nominatim ne répond pas aux fonctions serveur.
 * Rend un fetch qui sert les réponses relues, ou "pending" tant qu'elles manquent.
 */
async function geocodeViaBase(
  supabase: any,
  guide: any,
  report: StepReport,
  country: string,
): Promise<typeof fetch | "pending" | null> {
  const prev = guide.places_source_report?.centre_requetes as { city?: number; q?: number; at?: string } | undefined;
  const read = async (id?: number) => {
    if (id == null) return null;
    const { data } = await supabase.rpc("guide_osm_result", { p_id: id });
    const row = Array.isArray(data) ? data[0] ?? null : data ?? null;
    return row && row.status_code != null ? row : null;
  };
  if (prev?.city != null || prev?.q != null) {
    const [cityRes, qRes] = [await read(prev.city), await read(prev.q)];
    const fresh = Date.now() - Date.parse(prev.at ?? "") < GEOCODE_STALE_MS;
    if (cityRes || qRes || !fresh) {
      report.centre_reponses = { city: cityRes?.status_code ?? null, q: qRes?.status_code ?? null };
      const serve = (res: any) =>
        new Response(res && res.status_code === 200 ? String(res.content ?? "[]") : "[]", { status: res?.status_code ?? 503 });
      // Nominatim servi depuis les réponses relues, la BAN reste appelée en direct.
      return (async (url: string, init?: RequestInit) =>
        String(url).includes("nominatim.openstreetmap.org")
          ? serve(String(url).includes("city=") ? cityRes : qRes)
          : fetch(url, init)) as typeof fetch;
    }
    report.centre_requetes = prev;
    return "pending";
  }
  const ids: { city?: number; q?: number; at: string } = { at: new Date().toISOString() };
  for (const mode of ["city", "q"] as const) {
    const { data, error } = await supabase.rpc("guide_geocode_enqueue", {
      p_params: nominatimParams(guide.city, country, guide.postal_code, mode),
    });
    if (!error && data != null) ids[mode] = Number(data);
  }
  // Base indisponible : recherche directe (peut échouer, le lieu indiqué sert alors de repli).
  if (ids.city == null && ids.q == null) return null;
  report.centre_requetes = ids;
  return "pending";
}

async function ensureCenter(supabase: any, guide: any, report: StepReport, dryRun: boolean): Promise<GuideCenter | "pending" | null> {
  if (guide.latitude != null && guide.longitude != null) {
    return { lat: Number(guide.latitude), lon: Number(guide.longitude), country: guide.country || "FR", region: guide.places_source_report?.centre_final?.region ?? null };
  }
  const { data: req } = await supabase
    .from("guide_requests")
    .select("country, latitude, longitude")
    .or(`city_guide_id.eq.${guide.id},slug.eq.${guide.slug}`)
    .limit(1)
    .maybeSingle();
  const hint = req?.latitude != null && req?.longitude != null ? { lat: Number(req.latitude), lon: Number(req.longitude) } : null;
  const country = (req?.country || guide.country || "FR").toUpperCase();
  let fetchFn: typeof fetch = fetch;
  if (!usesBan(country, guide.postal_code)) {
    const viaBase = await geocodeViaBase(supabase, guide, report, country);
    if (viaBase === "pending") return "pending";
    if (viaBase) fetchFn = viaBase;
  }
  const center = await resolveGuideCenter({ city: guide.city, postalCode: guide.postal_code, country, hint }, fetchFn);
  if (!center) return null;
  const patch: Record<string, unknown> = { country: center.country, latitude: center.lat, longitude: center.lon };
  if (center.country !== "FR" && looksLikeBadDepartment(guide.department)) {
    patch.department = center.region ?? countryLabel(center.country);
  }
  if (!dryRun) await supabase.from("city_guides").update(patch).eq("id", guide.id);
  report.centre = { ...patch, region: center.region };
  return center;
}

async function knownPlaces(supabase: any, guideId: string) {
  const { data: existing } = await supabase
    .from("city_guide_places")
    .select("id, name, address, category, place_kind, source_url, latitude, longitude, distance_km, google_place_id, google_rating_attempted_at")
    .eq("city_guide_id", guideId);
  const sourced = (existing ?? []).filter((p: any) => p.source_url);
  const counts: Partial<Record<GuideCategory, number>> = {};
  for (const p of sourced) {
    if ((ALL_CATEGORIES as string[]).includes(p.category)) counts[p.category as GuideCategory] = (counts[p.category as GuideCategory] ?? 0) + 1;
  }
  return {
    sourced,
    known: {
      names: new Set<string>(sourced.map((p: any) => normName(p.name))),
      sources: new Set<string>(sourced.map((p: any) => String(p.source_url))),
      counts,
    },
  };
}

/** Étape 2 : relit les réponses arrivées, renvoie les échecs sur le miroir suivant. */
async function pollRequests(supabase: any, rows: OsmRequestRow[], center: GuideCenter) {
  const now = Date.now();
  let waiting = 0;
  const outcomes: Record<string, number> = {};
  let room = IN_FLIGHT_MAX - (await inFlight(supabase));
  const send = async (r: OsmRequestRow, failure: string | null) => {
    const mirror = mirrorForTry(r.tries);
    const { data: netId, error } = await supabase.rpc("guide_osm_enqueue", {
      p_query: `[out:json][timeout:25];${r.statement}out center tags;`,
      p_mirror: mirror,
    });
    if (error) {
      // Dépôt refusé par la base : compte comme un essai, la requête reste en file.
      r.tries += 1;
      r.outcome = `enqueue_${error.code ?? "erreur"}`;
      await supabase.from("guide_osm_requests").update({
        net_id: null, tries: r.tries, outcome: r.outcome, updated_at: new Date().toISOString(),
      }).eq("id", r.id);
      return false;
    }
    await supabase.from("guide_osm_requests").update({
      net_id: netId, mirror, tries: r.tries + 1, outcome: failure, updated_at: new Date().toISOString(),
    }).eq("id", r.id);
    room--;
    return true;
  };
  for (const r of rows) {
    if (r.status !== "sent") continue;
    // Requête en file : part dès qu'une place se libère.
    if (r.net_id == null) {
      if (r.tries >= MAX_TRIES) {
        await supabase.from("guide_osm_requests").update({ status: "failed", updated_at: new Date().toISOString() }).eq("id", r.id);
        r.status = "failed";
        outcomes[r.outcome ?? "enqueue_erreur"] = (outcomes[r.outcome ?? "enqueue_erreur"] ?? 0) + 1;
        continue;
      }
      if (room > 0) await send(r, r.outcome);
      waiting++;
      continue;
    }
    const { data } = await supabase.rpc("guide_osm_result", { p_id: r.net_id });
    const res = parseOsmResponse(Array.isArray(data) ? data[0] ?? null : data ?? null);
    const stale = now - Date.parse(r.updated_at) > REQUEST_STALE_MS;
    if (!res && !stale) {
      waiting++;
      continue;
    }
    // Réponse relue (ou abandonnée) : sa place en vol se libère.
    room++;
    const failure = !res ? "sans_reponse" : "failure" in res ? res.failure : null;
    outcomes[failure ?? "ok"] = (outcomes[failure ?? "ok"] ?? 0) + 1;
    if (!failure && res && "elements" in res) {
      const elements = compactElements(res.elements, center);
      await supabase.from("guide_osm_requests").update({ status: "done", elements, outcome: "ok", updated_at: new Date().toISOString() }).eq("id", r.id);
      r.status = "done";
      r.elements = elements;
      continue;
    }
    if (r.tries < MAX_TRIES) {
      if (room > 0 && (await send(r, failure))) {
        waiting++;
        continue;
      }
      // Plus de place en vol : la requête repasse en file pour l'essai suivant.
      await supabase.from("guide_osm_requests").update({ net_id: null, outcome: failure, updated_at: new Date().toISOString() }).eq("id", r.id);
      waiting++;
      continue;
    }
    await supabase.from("guide_osm_requests").update({ status: "failed", outcome: failure, updated_at: new Date().toISOString() }).eq("id", r.id);
    r.status = "failed";
  }
  return { waiting, outcomes };
}

async function callAI(prompt: string): Promise<{ intro?: string; ideal_for?: string } | null> {
  const key = (globalThis as any).Deno?.env?.get("LOVABLE_API_KEY") as string | undefined;
  if (!key) return null;
  try {
    const res = await fetch(LOVABLE_API_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}` },
      body: JSON.stringify({ model: "google/gemini-3.8-flash", messages: [{ role: "user", content: prompt }], max_tokens: 2000, temperature: 0.4 }),
      signal: AbortSignal.timeout(20000),
    });
    if (!res.ok) return null;
    const content = (await res.json())?.choices?.[0]?.message?.content ?? "";
    const m = String(content).match(/\{[\s\S]*\}/);
    return m ? JSON.parse(m[0]) : null;
  } catch {
    return null;
  }
}

/** Étape 7 : rédaction vérifiée, ou texte factuel. */
export async function writeIntro(
  guide: { city: string; slug: string },
  center: GuideCenter,
  places: { category: string; name: string; distance_km: number | null }[],
  ai: (prompt: string) => Promise<{ intro?: string; ideal_for?: string } | null> = callAI,
): Promise<{ intro: string; ideal_for: string; source: "ia" | "factuel"; problemes: string[] }> {
  const label = placeLabel(guide.city, center.country, center.region);
  const fallback = factualIntro(guide.city, label, places);
  const names = places.map((p) => p.name);
  const data = await ai(introPrompt(guide.city, center, names));
  if (!data?.intro) return { ...fallback, source: "factuel", problemes: ["ia_indisponible"] };
  const intro = stripDashes(String(data.intro)).trim();
  const ideal = stripDashes(String(data.ideal_for ?? "")).trim();
  const problems = [...introProblems(intro, [...names, guide.city]), ...introProblems(ideal, [...names, guide.city])];
  if (problems.length) return { ...fallback, source: "factuel", problemes: problems };
  return { intro, ideal_for: ideal || fallback.ideal_for, source: "ia", problemes: [] };
}

/**
 * Fait avancer un guide d'une étape. Sans attente : chaque appel envoie,
 * relit ou termine, puis rend la main. Appelée par la file toutes les deux
 * minutes.
 */
export async function advanceGuide(
  supabase: any,
  guide: any,
  opts: { dryRun: boolean; googleKey: string | null; deadline?: number; explicit?: boolean },
): Promise<StepReport> {
  const deadline = opts.deadline ?? Date.now() + 100_000;

  // Requêtes en cours : leur mode (essai à blanc ou réel) fait foi pour tout le passage.
  const { data: reqData } = await supabase
    .from("guide_osm_requests")
    .select("id, round, radius, statement, mirror, net_id, tries, status, elements, outcome, dry_run, updated_at")
    .eq("city_guide_id", guide.id)
    .order("id");
  const requests = (reqData ?? []) as OsmRequestRow[];
  const dryRun = requests.length ? requests[0].dry_run : opts.dryRun;
  const report: StepReport = { slug: guide.slug, etape: "centre", at: new Date().toISOString(), dry_run: dryRun };
  if (requests.length && opts.explicit && opts.dryRun !== dryRun) {
    return { ...report, etape: "refus", result: "mode_different", detail: "Un passage est déjà en cours dans l'autre mode." };
  }

  // 1. Centre
  const center = await ensureCenter(supabase, guide, report, dryRun);
  if (center === "pending") return { ...report, etape: "centre", result: "en_cours", detail: "geocodage_en_attente" };
  if (!center) return { ...report, etape: "centre", result: "sans_centre" };
  report.centre_final = center;

  const { sourced, known } = await knownPlaces(supabase, guide.id);

  // Lieux sourcés existants : distance au nouveau centre.
  for (const p of sourced) {
    if (p.latitude == null || p.longitude == null) continue;
    const d = Math.round(haversineM(center.lat, center.lon, Number(p.latitude), Number(p.longitude)) / 100) / 10;
    if (!dryRun && Number(p.distance_km) !== d) {
      await supabase.from("city_guide_places").update({ distance_km: d }).eq("id", p.id);
    }
  }

  // 2. Collecte
  if (requests.length === 0) {
    const cats = initialCategories(known.counts);
    if (cats.length === 0) return finalize(supabase, guide, center, [], sourced, known, report, { ...opts, dryRun, deadline });
    const n = await enqueue(supabase, guide.id, 0, RADII_M[0], statementsFor(cats, RADII_M[0], center), dryRun);
    return { ...report, etape: "collecte", rayon: RADII_M[0], requetes: n, result: "en_cours" };
  }

  const { waiting, outcomes } = await pollRequests(supabase, requests, center);
  report.reponses = outcomes;
  if (waiting > 0) return { ...report, etape: "attente", en_attente: waiting, result: "en_cours" };

  // 3. Élargissement
  const round = Math.max(...requests.map((r) => r.round));
  // Aucune réponse sur tout le guide : panne d'OpenStreetMap. Le passage ne
  // compte pas, le guide garde son affichage et repasse plus tard. Un rayon
  // élargi qui échoue seul (une catégorie, ex. vétérinaire à 80 km) garde les
  // réponses des rayons précédents : le guide termine en partiel.
  if (!requests.some((r) => r.status === "done")) {
    await supabase.from("guide_osm_requests").delete().eq("city_guide_id", guide.id);
    return { ...report, etape: "collecte", rayon: RADII_M[round], result: "overpass_indisponible" };
  }
  const { pool, rejectedDistance, radiiUsed } = poolFrom(requests, center, known);
  report.rayons = radiiUsed;
  report.rejetes_distance = rejectedDistance;
  const next = RADII_M[round + 1];
  if (next) {
    const widen = categoriesToWiden(countsWith(pool, known.counts), next);
    if (widen.length) {
      const n = await enqueue(supabase, guide.id, round + 1, next, statementsFor(widen, next, center), dryRun);
      return { ...report, etape: "elargissement", rayon: next, categories: widen, requetes: n, result: "en_cours" };
    }
  }

  const failed = requests.filter((r) => r.status === "failed").length;
  report.requetes_echouees = failed;
  // Fin trop proche de la limite d'exécution : le passage suivant termine.
  if (Date.now() + 30_000 > deadline) return { ...report, etape: "attente", result: "en_cours", detail: "fin_au_passage_suivant" };
  const selected = selectByCategory(pool, known.counts);
  return finalize(supabase, guide, center, selected, sourced, known, report, { ...opts, dryRun, deadline }, failed > 0);
}

async function finalize(
  supabase: any,
  guide: any,
  center: GuideCenter,
  selected: Candidate[],
  sourced: any[],
  known: { names: Set<string>; sources: Set<string>; counts: Partial<Record<GuideCategory, number>> },
  report: StepReport,
  opts: { dryRun: boolean; googleKey: string | null; deadline: number },
  hadFailures = false,
): Promise<StepReport> {
  // 4. Contrôles et lignes
  const built = await buildRows(selected, { city: guide.city, postalCode: guide.postal_code, center }, fetch, sleep, opts.deadline);
  report.rejetes_adresse = built.rejectedAddress;
  const now = new Date().toISOString();
  const rows = built.rows.map(({ kind, ...r }) => ({ ...r, place_kind: kind, city_guide_id: guide.id, verified_at: now }));
  report.par_categorie = rows.reduce((acc: Record<string, number>, r) => ((acc[r.category] = (acc[r.category] ?? 0) + 1), acc), {});

  const facts = [
    ...sourced.map((p: any) => ({ category: p.category, name: p.name, distance_km: p.distance_km == null ? null : Number(p.distance_km) })),
    ...rows.map((r) => ({ category: r.category, name: r.name, distance_km: r.distance_km })),
  ];

  // 7. Rédaction (aussi en essai à blanc, pour la relire)
  const curated = (CURATED_SLUGS as readonly string[]).includes(guide.slug);
  // Sans lieu sourcé, le texte existant reste (aucun « 0 lieu » publié).
  const text = curated || facts.length === 0 ? null : await writeIntro(guide, center, facts);
  if (text) report.redaction = { source: text.source, problemes: text.problemes, intro: text.intro };

  if (opts.dryRun) {
    await supabase.from("guide_osm_requests").delete().eq("city_guide_id", guide.id);
    return { ...report, etape: "termine", lignes: rows, result: "dry_run" };
  }

  // 5. Insertion
  let inserted: any[] = [];
  if (rows.length) {
    const { data, error } = await supabase
      .from("city_guide_places")
      .upsert(rows, { onConflict: "city_guide_id,source_url", ignoreDuplicates: true })
      .select("id, name, address, latitude, longitude, place_kind, category");
    if (error) {
      await supabase.from("guide_osm_requests").delete().eq("city_guide_id", guide.id);
      return { ...report, etape: "insertion", result: "erreur_insertion", erreur: error.message };
    }
    inserted = data ?? [];
  }
  await supabase.from("guide_osm_requests").delete().eq("city_guide_id", guide.id);

  // 6. Google
  if (opts.googleKey) {
    const google: Record<string, number> = {};
    const kindOf = (p: any): PlaceKind | null =>
      (p.place_kind as PlaceKind) ?? (p.category === "vet" ? "vet" : p.category === "pet_shop" ? "pet_shop" : null);
    const queue = [
      ...inserted,
      ...sourced.filter((p: any) => !p.google_place_id && !p.google_rating_attempted_at && p.latitude != null && kindOf(p)),
    ];
    for (const p of queue) {
      if (!kindOf(p)) continue;
      if (Date.now() + 5000 > opts.deadline) {
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
      await supabase.from("city_guide_places").update({ google_place_id: res.placeId, google_rating_attempted_at: new Date().toISOString() }).eq("id", p.id);
      await sleep(120);
    }
    report.google = google;
  }

  // 8. Publication
  const passes = Number(guide.places_source_passes ?? 0) + 1;
  const incomplete = hadFailures || built.incomplete;
  const sourcedNow = !incomplete || passes >= MAX_PARTIAL_PASSES;
  const total = sourced.length + inserted.length;
  const patch: Record<string, unknown> = {
    places_source_passes: passes,
    places_source_attempted_at: new Date().toISOString(),
    places_source_result: sourcedNow ? (total > 0 ? "ok" : "aucun_resultat") : "partiel",
  };
  if (sourcedNow) patch.places_sourced_at = new Date().toISOString();
  if (text) {
    patch.intro = text.intro;
    patch.ideal_for = text.ideal_for;
  }
  if (sourcedNow && guide.publish_when_sourced && total > 0) {
    patch.published = true;
    patch.publish_when_sourced = false;
  }
  const final = { ...report, etape: "termine", total_sources: total, passages: passes, result: String(patch.places_source_result) };
  patch.places_source_report = final;
  await supabase.from("city_guides").update(patch).eq("id", guide.id);
  return final;
}
