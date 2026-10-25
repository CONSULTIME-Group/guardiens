/**
 * Règle unique d'indexabilité d'une page ville d'entraide
 * /petites-missions/<ville> (lot SEO-E, arène entraide du 25/10/2026,
 * décision 5 validée par Jérémie).
 *
 * Partagée par :
 *  - src/pages/MissionsCityPage.tsx (meta robots, via src/lib/entraideCityIndexability.js)
 *  - supabase/functions/_shared/sitemap-data.js (sitemap du build et sitemap en direct)
 *  - scripts/generate-sitemap.mjs (bloc des villes de public/llms.txt)
 *  - src/components/missions/PublicMissionView.tsx (fil d'Ariane et lien garde d'une fiche)
 *
 * Une page ville entre dans l'index dès qu'au moins un besoin a été déposé
 * dans son rayon au cours des 90 derniers jours, quel que soit son statut
 * actuel (ouvert, pourvu, annulé), hors besoin masqué. Sinon elle reste
 * consultable et suivie en liens (noindex, follow), hors sitemap et hors
 * llms.txt. Source : la vue publique public_entraide_need_activity
 * (drizzle 0101), positions arrondies au centième, sans identifiant.
 *
 * Les centres et le rayon doivent rester égaux à ceux de
 * src/data/missionsCityContent.ts (verrou src/__tests__/seoe/).
 */

export const ENTRAIDE_CITY_WINDOW_DAYS = 90;
export const ENTRAIDE_CITY_RADIUS_KM = 30;
export const ENTRAIDE_ACTIVITY_VIEW = "public_entraide_need_activity";

/** Centres des 14 pages villes d'entraide, ordre de src/data/missionsCityContent.ts. */
export const ENTRAIDE_CITY_CENTERS = [
  { slug: "lyon", name: "Lyon", lat: 45.764, lng: 4.8357 },
  { slug: "marseille", name: "Marseille", lat: 43.2965, lng: 5.3698 },
  { slug: "strasbourg", name: "Strasbourg", lat: 48.5734, lng: 7.7521 },
  { slug: "paris", name: "Paris", lat: 48.8566, lng: 2.3522 },
  { slug: "toulouse", name: "Toulouse", lat: 43.6047, lng: 1.4442 },
  { slug: "lille", name: "Lille", lat: 50.6292, lng: 3.0573 },
  { slug: "annecy", name: "Annecy", lat: 45.8992, lng: 6.1294 },
  { slug: "nice", name: "Nice", lat: 43.7102, lng: 7.262 },
  { slug: "nantes", name: "Nantes", lat: 47.2184, lng: -1.5536 },
  { slug: "saint-etienne", name: "Saint-Étienne", lat: 45.4397, lng: 4.3872 },
  { slug: "rennes", name: "Rennes", lat: 48.1173, lng: -1.6778 },
  { slug: "montpellier", name: "Montpellier", lat: 43.6108, lng: 3.8767 },
  { slug: "grenoble", name: "Grenoble", lat: 45.1885, lng: 5.7245 },
  { slug: "bordeaux", name: "Bordeaux", lat: 44.8378, lng: -0.5792 },
];

const CITY_BY_SLUG = new Map(ENTRAIDE_CITY_CENTERS.map((c) => [c.slug, c]));
const CITY_PATH_RE = /^\/petites-missions\/([a-z0-9-]+)$/;

export function entraideCityPath(slug) {
  return `/petites-missions/${slug}`;
}

/** Vrai pour l'adresse d'une des 14 pages villes d'entraide. */
export function isEntraideCityPath(loc) {
  const m = typeof loc === "string" ? loc.match(CITY_PATH_RE) : null;
  return Boolean(m && CITY_BY_SLUG.has(m[1]));
}

export function entraideCityBySlug(slug) {
  return CITY_BY_SLUG.get(slug) || null;
}

export function haversineKm(lat1, lng1, lat2, lng2) {
  const toRad = (d) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return 2 * 6371 * Math.asin(Math.sqrt(a));
}

const finite = (v) => (v === null || v === undefined || v === "" ? null : Number.isFinite(Number(v)) ? Number(v) : null);

/** Ville d'entraide la plus proche dont le rayon contient le point, sinon null. */
export function entraideCityForPoint(latitude, longitude) {
  const lat = finite(latitude);
  const lng = finite(longitude);
  if (lat === null || lng === null) return null;
  let best = null;
  let bestKm = Infinity;
  for (const c of ENTRAIDE_CITY_CENTERS) {
    const km = haversineKm(c.lat, c.lng, lat, lng);
    if (km <= ENTRAIDE_CITY_RADIUS_KM && km < bestKm) {
      best = c;
      bestKm = km;
    }
  }
  return best;
}

/**
 * Une ligne d'activité compte si elle date de moins de 90 jours.
 * Date lue dans created_on (vue publique) ou created_at.
 */
export function isRecentNeedRow(row, now = new Date()) {
  const raw = row ? row.created_on ?? row.created_at : null;
  if (!raw) return false;
  const created = new Date(raw);
  if (Number.isNaN(created.getTime())) return false;
  const limit = new Date(now.getTime() - ENTRAIDE_CITY_WINDOW_DAYS * 24 * 3600 * 1000);
  // created_on est une date sans heure : la journée entière de la borne compte.
  limit.setUTCHours(0, 0, 0, 0);
  return created.getTime() >= limit.getTime();
}

/**
 * Ensemble des slugs de villes dont le rayon contient au moins un besoin
 * déposé au cours des 90 derniers jours.
 * @param {Array<{ latitude?: number | string | null, longitude?: number | string | null, created_on?: string | null, created_at?: string | null }>} rows
 * @returns {Set<string>}
 */
export function entraideCitiesWithRecentNeed(rows, now = new Date()) {
  const out = new Set();
  for (const row of rows || []) {
    if (!isRecentNeedRow(row, now)) continue;
    const lat = finite(row.latitude);
    const lng = finite(row.longitude);
    if (lat === null || lng === null) continue;
    for (const c of ENTRAIDE_CITY_CENTERS) {
      if (haversineKm(c.lat, c.lng, lat, lng) <= ENTRAIDE_CITY_RADIUS_KM) out.add(c.slug);
    }
  }
  return out;
}

/** Une page ville est indexable si au moins un besoin récent tombe dans son rayon. */
export function isEntraideCityIndexable(slug, rows, now = new Date()) {
  if (!CITY_BY_SLUG.has(slug)) return false;
  return entraideCitiesWithRecentNeed(rows, now).has(slug);
}

/** Ligne llms.txt d'une page ville d'entraide indexable. */
export function entraideCityLlmsLine(slug) {
  const c = CITY_BY_SLUG.get(slug);
  if (!c) return null;
  const around = /^[aeiouyàâéèêîôû]/i.test(c.name) ? `d'${c.name}` : `de ${c.name}`;
  return `- [Entraide à ${c.name}](${entraideCityPath(c.slug)}): coups de main près de chez soi autour ${around}, besoins déposés et personnes qui disent « Je peux ».`;
}

export const LLMS_ENTRAIDE_CITIES_RE = /<!-- entraide-villes:start -->[\s\S]*?<!-- entraide-villes:end -->/;

/** Bloc llms.txt des villes indexables, dans l'ordre des centres. */
export function entraideCitiesLlmsBlock(indexableSlugs) {
  const set = indexableSlugs instanceof Set ? indexableSlugs : new Set(indexableSlugs || []);
  const lines = ENTRAIDE_CITY_CENTERS.filter((c) => set.has(c.slug)).map((c) => entraideCityLlmsLine(c.slug));
  return ["<!-- entraide-villes:start -->", ...lines, "<!-- entraide-villes:end -->"].join("\n");
}

/** Slug de page ville /house-sitting/<slug> dérivé d'un nom de ville. */
export function houseSittingSlugFromCity(city) {
  if (typeof city !== "string") return null;
  const slug = city
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/œ/g, "oe")
    .replace(/æ/g, "ae")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return slug.length > 0 ? slug : null;
}
