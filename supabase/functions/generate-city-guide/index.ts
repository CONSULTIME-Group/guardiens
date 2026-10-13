import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { requireAdminOrServiceRole } from "../_shared/require-admin.ts";
import { sourceOneGuide } from "../_shared/guide-places/run.ts";
import {
  baseSlug,
  countryLabel,
  haversineM,
  homonymSlug,
  introPrompt,
  resolveGuideCenter,
  stripDashes,
  type GuideCenter,
} from "../_shared/guide-places/source.ts";

/**
 * generate-city-guide (refonte GL2, 13/10/2026)
 *
 * Avant : l'IA inventait les lieux « de [ville] en France ». Le 10/10/2026, le
 * guide de Saint-Ludger (Québec) a été publié avec 20 lieux fictifs en France.
 * Maintenant :
 * - le centre réel du guide est résolu d'abord (pays, coordonnées), un
 *   homonyme éloigné reçoit son propre slug ;
 * - les lieux viennent d'OpenStreetMap (sourceOneGuide), jamais de l'IA ;
 * - l'IA n'écrit que l'introduction, avec le vrai pays et les seuls noms de
 *   lieux trouvés ;
 * - le guide est publié une fois sourcé, en arrière-plan.
 */

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const LOVABLE_API_URL = "https://ai.gateway.lovable.dev/v1/chat/completions";

class AiGatewayError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

async function callAI(apiKey: string, prompt: string, maxTokens = 500) {
  const res = await fetch(LOVABLE_API_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify({
      model: "google/gemini-2.5-flash",
      messages: [{ role: "user", content: prompt }],
      max_tokens: maxTokens,
      temperature: 0.4,
    }),
  });
  if (res.status === 402) throw new AiGatewayError(402, "Crédits IA épuisés. Rechargez les crédits de l'espace de travail pour générer un guide.");
  if (res.status === 429) throw new AiGatewayError(429, "Trop de requêtes IA, réessayez dans un instant.");
  if (!res.ok) throw new AiGatewayError(res.status, `Erreur fournisseur IA (statut ${res.status}).`);
  const data = await res.json();
  const content = data.choices?.[0]?.message?.content || "";
  const match = content.match(/\{[\s\S]*\}/);
  if (!match) throw new Error("Could not parse AI JSON response");
  return JSON.parse(match[0]);
}

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });

async function finishInBackground(supabase: any, guide: any, center0: GuideCenter, apiKey: string | null) {
  const googleKey = Deno.env.get("GOOGLE_PLACES_API_KEY") || null;
  let report: Record<string, unknown> = {};
  try {
    report = await sourceOneGuide(supabase, guide, { dryRun: false, googleKey, center: center0 });
  } catch (e) {
    report = { result: "erreur", erreur: String(e) };
  }
  const center = (report.centre_final as GuideCenter | undefined) ?? center0;
  const names = Array.isArray(report.noms) ? (report.noms as string[]) : [];
  let intro = "";
  let ideal = "";
  if (apiKey) {
    try {
      const data = await callAI(apiKey, introPrompt(guide.city, center, names));
      intro = stripDashes(String(data.intro ?? ""));
      ideal = stripDashes(String(data.ideal_for ?? ""));
    } catch (e) {
      console.error("[generate-city-guide] intro:", e);
    }
  }
  // Publié seulement avec des lieux sourcés ; sinon la file le publiera
  // dès que ses lieux seront trouvés (publish_when_sourced).
  const hasPlaces = Number(report.total_sources ?? 0) > 0;
  const patch: Record<string, unknown> = {
    places_source_attempted_at: new Date().toISOString(),
    places_source_result: String(report.result ?? "erreur"),
    published: hasPlaces,
    publish_when_sourced: !hasPlaces,
  };
  if (report.result === "ok") patch.places_sourced_at = new Date().toISOString();
  if (intro) patch.intro = intro;
  if (ideal) patch.ideal_for = ideal;
  await supabase.from("city_guides").update(patch).eq("id", guide.id);
  console.log(`[generate-city-guide] ${guide.slug} : ${String(report.result)}, ${names.length} lieux`);
}

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
        // Réservé par ce traitement : la tâche planifiée ne le prend pas en même temps.
        places_source_attempted_at: new Date().toISOString(),
      })
      .select()
      .single();
    if (guideErr) throw guideErr;

    const task = finishInBackground(supabase, guide, center, Deno.env.get("LOVABLE_API_KEY") || null);
    const runtime = (globalThis as any).EdgeRuntime;
    if (runtime?.waitUntil) runtime.waitUntil(task);
    else task.catch((e) => console.error("[generate-city-guide] arrière-plan:", e));

    return json({ ...guide, places_count: 0, sourcing: "pending" });
  } catch (error) {
    console.error("City guide generation error:", error);
    const isGateway = error instanceof AiGatewayError;
    const message = error instanceof Error ? error.message : String(error);
    return json({ error: message, code: isGateway ? "AI_GATEWAY" : "INTERNAL" }, isGateway ? error.status : 500);
  }
});
