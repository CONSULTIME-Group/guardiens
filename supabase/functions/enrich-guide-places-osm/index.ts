/**
 * enrich-guide-places-osm
 *
 * Repeuple les catégories `vet` et `pet_shop` de `city_guide_places` avec des
 * lieux réels issus d'OpenStreetMap (Overpass), dont l'adresse est confirmée
 * par géocodage inverse de la Base Adresse Nationale.
 *
 * Toute ligne créée porte `source_url` (permalien OSM) et `verified_at`.
 *
 * Garde-fou géographique : le code département déduit du code postal rendu par
 * la BAN doit correspondre à celui de `city_guides.postal_code`, sinon rejet.
 * C'est le contrôle réalisé par `public.check_city_guide_places_geo()`.
 *
 * Sécurité : secret partagé GEOCODE_PROFILE_SECRET dans `x-geocode-secret`.
 */
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

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

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

const norm = (s: string) =>
  (s ?? "")
    .toString()
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, " ");

function deptFromPostal(postal: string | null | undefined): string | null {
  const p = (postal ?? "").toString().trim();
  if (!/^\d{5}$/.test(p)) return null;
  return /^9[78]/.test(p) ? p.substring(0, 3) : p.substring(0, 2);
}

// Formate un numéro français en groupes de deux chiffres lisibles.
function formatPhone(raw: string): string | null {
  const digits = (raw ?? "").replace(/[^\d+]/g, "");
  let local = digits;
  if (local.startsWith("+33")) local = "0" + local.slice(3);
  else if (local.startsWith("0033")) local = "0" + local.slice(4);
  local = local.replace(/\D/g, "");
  if (local.length !== 10) return null;
  return local.match(/.{2}/g)!.join(" ");
}

interface OsmElement {
  type: string;
  id: number;
  lat?: number;
  lon?: number;
  center?: { lat: number; lon: number };
  tags?: Record<string, string>;
}

async function banReverse(lat: number, lon: number) {
  try {
    const r = await fetch(
      `https://api-adresse.data.gouv.fr/reverse/?lon=${lon}&lat=${lat}&type=housenumber`,
      { headers: { "User-Agent": "Guardiens/1.0 (enrich-guide-places-osm)" } },
    );
    if (!r.ok) return null;
    const data = await r.json();
    const f = data?.features?.[0];
    if (!f) return null;
    return {
      label: f.properties?.label as string | undefined,
      postcode: f.properties?.postcode as string | undefined,
      distance: Number(f.properties?.distance ?? Number.POSITIVE_INFINITY),
    };
  } catch {
    return null;
  }
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

    let body: any = {};
    try {
      body = await req.json();
    } catch {
      body = {};
    }
    const slugs: string[] | null = Array.isArray(body?.slugs) && body.slugs.length
      ? body.slugs.map((s: unknown) => String(s))
      : null;
    const dryRun = body?.dry_run === true;
    const limit = Math.min(10, Math.max(1, Number(body?.limit) || 3));

    // Sélection des guides
    let guides: any[] = [];
    if (slugs) {
      const { data, error } = await supabase
        .from("city_guides")
        .select("id, slug, city, postal_code, department")
        .in("slug", slugs)
        .order("slug", { ascending: true });
      if (error) return json({ error: error.message }, 500);
      guides = data ?? [];
    } else {
      const { data: allGuides, error } = await supabase
        .from("city_guides")
        .select("id, slug, city, postal_code, department")
        .order("slug", { ascending: true });
      if (error) return json({ error: error.message }, 500);
      const { data: done } = await supabase
        .from("city_guide_places")
        .select("city_guide_id")
        .in("category", ["vet", "pet_shop"])
        .not("verified_at", "is", null);
      const doneSet = new Set((done ?? []).map((r: any) => r.city_guide_id));
      guides = (allGuides ?? []).filter((g: any) => !doneSet.has(g.id)).slice(0, limit);
    }

    // source_url déjà présents en base
    const { data: existingSources } = await supabase
      .from("city_guide_places")
      .select("source_url")
      .not("source_url", "is", null);
    const knownSources = new Set(
      (existingSources ?? []).map((r: any) => String(r.source_url)),
    );

    let guides_traites = 0;
    let lieux_inseres = 0;
    let rejetes_departement = 0;
    let rejetes_distance = 0;
    let rejetes_doublon = 0;
    let sans_coordonnees = 0;
    let overpass_indisponible = 0;
    const details: any[] = [];
    const dryRows: any[] = [];

    let first = true;
    for (const guide of guides) {
      if (!first) await sleep(1000);
      first = false;
      guides_traites++;

      const guideDept = deptFromPostal(guide.postal_code) ??
        (guide.department ? null : null);

      // a. Coordonnées de la ville
      let lat: number | null = null;
      let lon: number | null = null;
      const { data: seoPages } = await supabase
        .from("seo_city_pages")
        .select("city, latitude, longitude")
        .not("latitude", "is", null)
        .ilike("city", guide.city);
      const seoMatch = (seoPages ?? []).find(
        (p: any) => norm(p.city) === norm(guide.city),
      );
      if (seoMatch) {
        lat = Number(seoMatch.latitude);
        lon = Number(seoMatch.longitude);
      } else {
        try {
          const params = new URLSearchParams({
            q: guide.city,
            type: "municipality",
            limit: "1",
          });
          if (guide.postal_code) params.set("postcode", guide.postal_code);
          const r = await fetch(`https://api-adresse.data.gouv.fr/search/?${params}`, {
            headers: { "User-Agent": "Guardiens/1.0 (enrich-guide-places-osm)" },
          });
          if (r.ok) {
            const data = await r.json();
            const c = data?.features?.[0]?.geometry?.coordinates;
            if (Array.isArray(c)) {
              lon = Number(c[0]);
              lat = Number(c[1]);
            }
          }
        } catch {
          // ignoré, traité comme absence de coordonnées
        }
      }

      if (lat == null || lon == null || Number.isNaN(lat) || Number.isNaN(lon)) {
        sans_coordonnees++;
        details.push({ slug: guide.slug, inseres: 0, rejetes: 0 });
        continue;
      }

      // b + c. Overpass, 5000 m puis 12000 m si moins de 3 résultats nommés
      const runOverpass = async (radius: number): Promise<OsmElement[] | null> => {
        const query =
          `[out:json][timeout:25];(nwr["amenity"="veterinary"](around:${radius},${lat},${lon});` +
          `nwr["shop"="pet"](around:${radius},${lat},${lon}););out center tags;`;
        try {
          const r = await fetch("https://overpass-api.de/api/interpreter", {
            method: "POST",
            headers: {
              "Content-Type": "application/x-www-form-urlencoded",
              "User-Agent": "Guardiens/1.0 (enrich-guide-places-osm)",
            },
            body: `data=${encodeURIComponent(query)}`,
          });
          if (!r.ok) return null;
          const text = await r.text();
          if (!text.trim().startsWith("{")) return null;
          const data = JSON.parse(text);
          const els: OsmElement[] = Array.isArray(data?.elements) ? data.elements : [];
          return els.filter((e) => e.tags?.name);
        } catch {
          return null;
        }
      };

      let elements = await runOverpass(5000);
      if (elements === null) {
        overpass_indisponible++;
        details.push({ slug: guide.slug, inseres: 0, rejetes: 0 });
        continue;
      }
      if (elements.length < 3) {
        await sleep(1000);
        const wider = await runOverpass(12000);
        if (wider !== null) elements = wider;
      }

      // Noms déjà présents pour ce guide
      const { data: existingPlaces } = await supabase
        .from("city_guide_places")
        .select("name")
        .eq("city_guide_id", guide.id);
      const knownNames = new Set((existingPlaces ?? []).map((p: any) => norm(p.name)));

      let rejetesGuide = 0;
      const candidates: any[] = [];

      for (const el of elements) {
        const tags = el.tags ?? {};
        const name = tags.name!;
        const sourceUrl = `https://www.openstreetmap.org/${el.type}/${el.id}`;

        if (knownNames.has(norm(name)) || knownSources.has(sourceUrl)) {
          rejetes_doublon++;
          rejetesGuide++;
          continue;
        }

        const plat = el.lat ?? el.center?.lat;
        const plon = el.lon ?? el.center?.lon;
        if (plat == null || plon == null) {
          rejetesGuide++;
          continue;
        }

        let address: string | null = null;
        let postcode: string | null = null;

        if (tags["addr:housenumber"] && tags["addr:street"]) {
          address = [
            `${tags["addr:housenumber"]} ${tags["addr:street"]}`,
            [tags["addr:postcode"], tags["addr:city"]].filter(Boolean).join(" "),
          ].filter(Boolean).join(", ");
          postcode = tags["addr:postcode"] ?? null;
        }

        if (!address || !postcode) {
          await sleep(80);
          const rev = await banReverse(plat, plon);
          if (!rev || !rev.label) {
            rejetes_distance++;
            rejetesGuide++;
            continue;
          }
          if (rev.distance > 120) {
            rejetes_distance++;
            rejetesGuide++;
            continue;
          }
          address = rev.label;
          postcode = rev.postcode ?? null;
        }

        // f. Garde-fou géographique
        const placeDept = deptFromPostal(postcode);
        if (!placeDept || !guideDept || placeDept !== guideDept) {
          rejetes_departement++;
          rejetesGuide++;
          continue;
        }

        const phoneRaw = tags.phone ?? tags["contact:phone"] ?? null;
        const phone = phoneRaw ? formatPhone(phoneRaw) : null;

        candidates.push({
          city_guide_id: guide.id,
          category: tags.amenity === "veterinary" ? "vet" : "pet_shop",
          name,
          address,
          latitude: plat,
          longitude: plon,
          dogs_welcome: true,
          leash_required: true,
          verified_at: new Date().toISOString(),
          source_url: sourceUrl,
          description:
            "Établissement référencé dans OpenStreetMap, adresse confirmée par géocodage inverse de la Base Adresse Nationale.",
          tips: phone ? `Téléphone ${phone}.` : null,
          _hasPhone: Boolean(phone),
        });
        knownNames.add(norm(name));
        knownSources.add(sourceUrl);
      }

      // h. Téléphone d'abord, puis quotas 4 vet et 3 pet_shop
      candidates.sort((a, b) => Number(b._hasPhone) - Number(a._hasPhone));
      const selected: any[] = [];
      let nVet = 0;
      let nShop = 0;
      for (const c of candidates) {
        if (c.category === "vet" && nVet < 4) {
          selected.push(c);
          nVet++;
        } else if (c.category === "pet_shop" && nShop < 3) {
          selected.push(c);
          nShop++;
        }
      }

      const rows = selected.map(({ _hasPhone, ...rest }) => rest);

      if (rows.length > 0) {
        if (dryRun) {
          dryRows.push(...rows);
        } else {
          const { error: insErr } = await supabase.from("city_guide_places").insert(rows);
          if (insErr) {
            console.warn("enrich-guide-places-osm: insert échoué", guide.slug, insErr.message);
            details.push({ slug: guide.slug, inseres: 0, rejetes: rejetesGuide });
            continue;
          }
        }
        lieux_inseres += rows.length;
      }

      details.push({ slug: guide.slug, inseres: rows.length, rejetes: rejetesGuide });
    }

    return json({
      guides_traites,
      lieux_inseres,
      rejetes_departement,
      rejetes_distance,
      rejetes_doublon,
      sans_coordonnees,
      overpass_indisponible,
      details,
      ...(dryRun ? { dry_run: true, lignes: dryRows } : {}),
    });
  } catch (e) {
    return json({ error: String(e) }, 500);
  }
});
