import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const LOVABLE_API_URL = "https://ai.gateway.lovable.dev/v1/chat/completions";

/**
 * Helper : renvoie une erreur "soft" en 200 avec un payload `{ error }`.
 *
 * Le client (LocationProfileCard) traite déjà `data?.error` comme un
 * cas non-bloquant et masque simplement la carte. Renvoyer un 5xx pour
 * une dégradation IA tierce (rate-limit, crédits épuisés, JSON cassé)
 * pollue le moniteur d'erreurs réseau et inquiète inutilement.
 *
 * Les vraies erreurs serveur (bug de code, DB down) restent en 500.
 */
function softError(message: string, code: string) {
  return new Response(JSON.stringify({ error: message, code }), {
    status: 200,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Require authentication: un-cached locations consume paid AI credits.
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const anonClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
    );
    const { data: { user } } = await anonClient.auth.getUser(authHeader.replace("Bearer ", ""));
    if (!user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { city, postal_code } = await req.json();
    if (!city || !postal_code) {
      return new Response(JSON.stringify({ error: "city and postal_code required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Cache hit
    const { data: cached } = await supabase
      .from("location_profiles")
      .select("*")
      .eq("postal_code", postal_code.trim())
      .maybeSingle();

    if (cached) {
      return new Response(JSON.stringify(cached), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      console.error("LOVABLE_API_KEY missing");
      return softError("Génération indisponible", "no_api_key");
    }

    const prompt = `Tu es un guide local expert de la France. Génère une fiche descriptive pour cette localité.
Ville : ${city}
Code postal : ${postal_code}

Réponds UNIQUEMENT en JSON valide :
{
  "neighborhood_type": "Type de quartier/village en 1-2 phrases",
  "nature_access": "Forêts, sentiers, lacs, parcs à proximité avec distances approximatives, 2-3 phrases",
  "amenities": "Commerces, services, vétérinaire à proximité, 1-2 phrases",
  "transport": "Gare, bus, accès autoroute, facilité sans voiture, 1-2 phrases",
  "activities": "Randonnées, marchés, restos, vignobles, visites, 2-3 phrases",
  "ideal_for": "Lieu idéal pour ceux qui... (1 phrase enthousiasmante)"
}
Ton : chaleureux et vendeur (c'est pour donner envie à un gardien de venir). En français.
Si tu ne connais pas précisément cette localité, base-toi sur le département et la région.`;

    const aiResponse = await fetch(LOVABLE_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [{ role: "user", content: prompt }],
        max_tokens: 500,
        temperature: 0.7,
      }),
    });

    // Gestion explicite des erreurs upstream connues : on dégrade
    // proprement sans 500. Le moniteur d'erreurs réseau ne se déclenche
    // que pour un vrai incident côté Guardiens.
    if (!aiResponse.ok) {
      const errText = await aiResponse.text().catch(() => "");
      console.warn(`AI gateway ${aiResponse.status}: ${errText.slice(0, 200)}`);
      if (aiResponse.status === 429) return softError("Trop de requêtes IA", "rate_limited");
      if (aiResponse.status === 402) return softError("Crédits IA épuisés", "no_credits");
      return softError(`Service IA indisponible (${aiResponse.status})`, "ai_upstream");
    }

    const aiData = await aiResponse.json().catch(() => null);
    const content: string = aiData?.choices?.[0]?.message?.content ?? aiData?.content ?? "";

    // Tolérance : l'IA peut entourer le JSON de ```json ... ``` ou de prose.
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      console.warn("AI returned no JSON-like content:", content.slice(0, 200));
      return softError("Réponse IA non exploitable", "bad_ai_format");
    }

    let profile: Record<string, string>;
    try {
      profile = JSON.parse(jsonMatch[0]);
    } catch (e) {
      console.warn("AI JSON parse error:", String(e), "raw:", jsonMatch[0].slice(0, 200));
      return softError("Réponse IA non exploitable", "bad_ai_json");
    }

    const record = {
      city: city.trim(),
      postal_code: postal_code.trim(),
      neighborhood_type: profile.neighborhood_type || "",
      nature_access: profile.nature_access || "",
      amenities: profile.amenities || "",
      transport: profile.transport || "",
      activities: profile.activities || "",
      ideal_for: profile.ideal_for || "",
    };

    const { data: inserted, error: insertError } = await supabase
      .from("location_profiles")
      .upsert(record, { onConflict: "postal_code" })
      .select()
      .single();

    if (insertError) {
      console.error("Upsert error:", insertError);
      // On renvoie quand même le record généré au client : le cache rate
      // mais l'utilisateur voit la fiche.
    }

    return new Response(JSON.stringify(inserted || record), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Location profile fatal error:", error);
    return new Response(JSON.stringify({ error: String(error) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
