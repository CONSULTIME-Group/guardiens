/**
 * geocode-city-pages
 *
 * Renseigne latitude / longitude des pages villes SEO (`seo_city_pages`).
 * Appelée par un cron pg_cron toutes les 10 minutes, 30 pages par appel.
 *
 * Point critique : la désambiguïsation par département. Une correspondance
 * par nom seul place Saint-Paul (La Réunion) dans l'Oise. On filtre les
 * réponses BAN par code INSEE (`properties.citycode`) confronté au code du
 * département de la page. Aucun repli sur la première feature, aucun
 * Nominatim en secours (pas de code INSEE, pas de contrôle possible).
 *
 * Sécurité :
 *   - Pas de JWT (verify_jwt = false) car appelée depuis pg_cron.
 *   - Secret partagé GEOCODE_PROFILE_SECRET dans l'en-tête `x-geocode-secret`.
 *   - Service role pour lire/écrire (bypass RLS).
 */
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-geocode-secret",
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

// Un code département outre-mer tient sur 3 caractères et commence par 97 ou 98.
const isOverseasDept = (code: string) => /^9[78]/.test(code);

// Vrai si le code INSEE de la commune appartient au département de la page.
function citycodeMatchesDepartment(citycode: string, deptCode: string): boolean {
  if (!citycode || !deptCode) return false;
  if (isOverseasDept(deptCode)) return citycode.startsWith(deptCode);
  if (deptCode === "2A" || deptCode === "2B") return citycode.startsWith(deptCode);
  return citycode.substring(0, 2) === deptCode;
}

// Garde-fou de cohérence géographique. Métropole : lat 41 à 52. Outre-mer :
// rejeter toute coordonnée tombant dans la bbox métropolitaine.
function isCoherent(lat: number, lng: number, deptCode: string): boolean {
  const inMetroBBox = lat >= 41 && lat <= 52 && lng >= -5 && lng <= 10;
  if (isOverseasDept(deptCode)) return !inMetroBBox;
  return lat >= 41 && lat <= 52;
}

interface BanFeature {
  geometry: { coordinates: [number, number] };
  properties: { citycode?: string };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const secret = Deno.env.get("GEOCODE_PROFILE_SECRET");
    if (!secret || req.headers.get("x-geocode-secret") !== secret) {
      return json({ error: "forbidden" }, 403);
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    // Map nom de département -> code, pour la jointure logique
    // (departements.nom = seo_city_pages.department).
    const { data: depts, error: dErr } = await supabase
      .from("departements")
      .select("nom, code");
    if (dErr) return json({ error: dErr.message }, 500);
    const deptCodeByName = new Map<string, string>(
      (depts ?? []).map((d: { nom: string; code: string }) => [d.nom, d.code]),
    );

    const { data: pages, error: pErr } = await supabase
      .from("seo_city_pages")
      .select("id, slug, city, department, geocode_attempts")
      .is("latitude", null)
      .lt("geocode_attempts", 3)
      .not("slug", "like", "test-%")
      .order("geocode_attempts", { ascending: true })
      .order("slug", { ascending: true })
      .limit(30);
    if (pErr) return json({ error: pErr.message }, 500);

    let traitees = 0;
    let geocodees = 0;
    let rejetees_departement = 0;
    let rejetees_coherence = 0;

    for (const page of pages ?? []) {
      traitees++;
      // Incrément AVANT l'appel réseau : un échec ne doit pas créer de boucle.
      await supabase
        .from("seo_city_pages")
        .update({ geocode_attempts: (page.geocode_attempts ?? 0) + 1 })
        .eq("id", page.id);

      const deptCode = deptCodeByName.get(page.department);
      if (!deptCode) {
        console.warn(`geocode-city-pages: département inconnu`, page.city, page.department);
        rejetees_departement++;
        continue;
      }

      await sleep(120); // respect de l'API BAN

      let features: BanFeature[] = [];
      try {
        const params = new URLSearchParams({
          q: page.city,
          type: "municipality",
          limit: "15",
        });
        const r = await fetch(`https://api-adresse.data.gouv.fr/search/?${params}`, {
          headers: { "User-Agent": "Guardiens/1.0 (geocode-city-pages)" },
        });
        if (r.ok) {
          const data = await r.json();
          features = Array.isArray(data?.features) ? data.features : [];
        }
      } catch (e) {
        console.warn(`geocode-city-pages: réseau`, page.city, String(e));
        continue;
      }

      // Première feature dont le code INSEE matche le département. Jamais de
      // repli sur features[0] : ce serait Saint-Paul (La Réunion) dans l'Oise.
      const match = features.find((f) =>
        citycodeMatchesDepartment(f.properties?.citycode ?? "", deptCode)
      );

      if (!match) {
        console.warn(
          `geocode-city-pages: aucune commune dans le département`,
          page.city,
          page.department,
          deptCode,
        );
        rejetees_departement++;
        continue;
      }

      const [lng, lat] = match.geometry.coordinates;

      if (!isCoherent(lat, lng, deptCode)) {
        console.warn(
          `geocode-city-pages: coordonnées incohérentes rejetées`,
          page.city,
          page.department,
          lat,
          lng,
        );
        rejetees_coherence++;
        continue;
      }

      const { error: uErr } = await supabase
        .from("seo_city_pages")
        .update({ latitude: lat, longitude: lng, geocoded_at: new Date().toISOString() })
        .eq("id", page.id);

      if (uErr) {
        console.warn(`geocode-city-pages: update échoué`, page.city, uErr.message);
        continue;
      }
      geocodees++;
    }

    // Recalcule nearby_sitter_count pour toutes les pages désormais géocodées.
    const { error: rpcErr } = await supabase.rpc("recalc_seo_city_nearby_counts");
    if (rpcErr) console.warn(`geocode-city-pages: recalc échoué`, rpcErr.message);

    const { count: restantes } = await supabase
      .from("seo_city_pages")
      .select("id", { count: "exact", head: true })
      .is("latitude", null)
      .lt("geocode_attempts", 3)
      .not("slug", "like", "test-%");

    return json({ traitees, geocodees, rejetees_departement, rejetees_coherence, restantes: restantes ?? 0 });
  } catch (e) {
    return json({ error: String(e) }, 500);
  }
});
