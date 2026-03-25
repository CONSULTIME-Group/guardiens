import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const LOVABLE_API_URL = "https://api.lovable.dev/api/ai/chat";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
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

    // Check cache
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

    // Generate via Lovable AI
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
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
        "Authorization": `Bearer ${LOVABLE_API_KEY}`,
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [{ role: "user", content: prompt }],
        max_tokens: 500,
        temperature: 0.7,
      }),
    });

    if (!aiResponse.ok) {
      const errText = await aiResponse.text();
      throw new Error(`AI API call failed [${aiResponse.status}]: ${errText}`);
    }

    const aiData = await aiResponse.json();
    const content = aiData.choices?.[0]?.message?.content || aiData.content || "";

    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error("Could not parse AI response as JSON");
    }

    const profile = JSON.parse(jsonMatch[0]);

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

    const { data: inserted } = await supabase
      .from("location_profiles")
      .upsert(record, { onConflict: "postal_code" })
      .select()
      .single();

    return new Response(JSON.stringify(inserted || record), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Location profile error:", error);
    return new Response(JSON.stringify({ error: String(error) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
