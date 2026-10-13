import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { requireAdminOrServiceRole } from "../_shared/require-admin.ts";
import {
  baseSlug,
  countryLabel,
  haversineM,
  homonymSlug,
  resolveGuideCenter,
} from "../_shared/guide-places/source.ts";

/**
 * generate-city-guide (lots GL1 à GL4, 13/10/2026)
 *
 * Crée la fiche d'un guide sur son centre réel (pays, coordonnées ; un
 * homonyme éloigné reçoit son propre slug), sans lieu ni texte. Le guide suit
 * ensuite le protocole de génération (supabase/functions/_shared/guide-places/
 * pipeline.ts) par la file source-guide-places : lieux sourcés, contrôles,
 * rédaction vérifiée, publication dès qu'il a des lieux.
 *
 * Avant le 13/10/2026 : l'IA inventait les lieux « de [ville] en France » ; le
 * guide de Saint-Ludger (Québec) a été publié avec 20 lieux fictifs en France.
 */

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authFail = await requireAdminOrServiceRole(req, corsHeaders);
    if (authFail) return authFail;
    const { city, postal_code, department, country, latitude, longitude } = await req.json();
    if (!city || !String(city).trim()) return json({ error: "city required" }, 400);

    const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const cityName = String(city).trim();
    const slug0 = baseSlug(cityName);

    // Demande d'origine : pays et lieu du propriétaire pour départager les homonymes.
    const { data: request } = await supabase
      .from("guide_requests")
      .select("country, latitude, longitude")
      .eq("slug", slug0)
      .maybeSingle();
    const num = (v: unknown) => (v === null || v === undefined || v === "" ? NaN : Number(v));
    const hintLat = Number.isFinite(num(latitude)) ? num(latitude) : num(request?.latitude);
    const hintLon = Number.isFinite(num(longitude)) ? num(longitude) : num(request?.longitude);
    const hint = Number.isFinite(hintLat) && Number.isFinite(hintLon) ? { lat: hintLat, lon: hintLon } : null;
    const cc = String(country || request?.country || "FR").toUpperCase();

    const center = await resolveGuideCenter(
      { city: cityName, postalCode: postal_code || null, country: cc, hint },
      fetch,
    );
    if (!center) {
      return json({ error: `Commune introuvable : ${cityName} (${countryLabel(cc)}). Vérifiez le nom et le pays.`, code: "CENTER" }, 422);
    }

    // Guide existant au même slug : même lieu (moins de 25 km) = on le rend,
    // homonyme éloigné = slug suffixé.
    let slug = slug0;
    const { data: existing } = await supabase.from("city_guides").select("*").eq("slug", slug0).maybeSingle();
    if (existing) {
      const sameCountry = (existing.country || "FR") === center.country;
      const near = existing.latitude != null && existing.longitude != null
        ? haversineM(center.lat, center.lon, Number(existing.latitude), Number(existing.longitude)) < 25000
        : sameCountry && (!postal_code || existing.postal_code === postal_code);
      if (near) return json(existing);
      slug = homonymSlug(slug0, center, postal_code || null);
      const { data: again } = await supabase.from("city_guides").select("*").eq("slug", slug).maybeSingle();
      if (again) return json(again);
    }

    const dept = center.country === "FR"
      ? String(department || "")
      : center.region ?? countryLabel(center.country);

    const { data: guide, error: guideErr } = await supabase
      .from("city_guides")
      .insert({
        city: cityName,
        postal_code: postal_code || "",
        slug,
        department: dept,
        country: center.country,
        latitude: center.lat,
        longitude: center.lon,
        intro: "",
        ideal_for: "",
        published: false,
        publish_when_sourced: true,
      })
      .select()
      .single();
    if (guideErr) throw guideErr;

    // La file prend en premier les guides jamais tentés : le protocole démarre
    // au prochain passage (deux minutes au plus).
    return json({ ...guide, places_count: 0, sourcing: "pending" });
  } catch (error) {
    console.error("City guide generation error:", error);
    const message = error instanceof Error ? error.message : String(error);
    return json({ error: message, code: "INTERNAL" }, 500);
  }
});
