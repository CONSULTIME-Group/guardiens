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
    const { species, breed } = await req.json();
    if (!species || !breed) {
      return new Response(JSON.stringify({ error: "species and breed required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Normalize for lookup
    const normalizedBreed = breed.trim().toLowerCase();
    const normalizedSpecies = species.trim().toLowerCase();

    // Check cache
    const { data: cached } = await supabase
      .from("breed_profiles")
      .select("*")
      .eq("species", normalizedSpecies)
      .eq("breed", normalizedBreed)
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

    const speciesLabels: Record<string, string> = {
      dog: "Chien", cat: "Chat", horse: "Cheval", bird: "Oiseau",
      rodent: "Rongeur", fish: "Poisson", reptile: "Reptile",
      farm_animal: "Animal de ferme", nac: "NAC",
    };
    const speciesLabel = speciesLabels[normalizedSpecies] || species;

    const isGeneric = ["bâtard", "croisé", "croisee", "batard", "mixte", "sans race", "inconnu", "gouttière", "gouttiere", "europeen", "européen"]
      .some(term => normalizedBreed.includes(term));

    const breedPrompt = isGeneric
      ? `${speciesLabel} croisé / sans race définie`
      : `${speciesLabel} de race ${breed}`;

    const prompt = `Tu es un expert en animaux de compagnie. Génère une fiche descriptive pour : ${breedPrompt}.

Réponds UNIQUEMENT en JSON valide avec cette structure exacte :
{
  "temperament": "Description du caractère typique en 2-3 phrases",
  "exercise_needs": "Besoins d'exercice quotidien en 2-3 phrases",
  "grooming": "Entretien et toilettage en 1-2 phrases",
  "stranger_behavior": "Comportement avec les inconnus en 1-2 phrases",
  "sitter_tips": "Ce qu'un gardien doit savoir avant de s'occuper de cette race, en 2-3 phrases",
  "ideal_for": "Idéal pour un gardien qui... (1 phrase)"
}
Ton : chaleureux et pratique, pas encyclopédique. En français.`;

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

    // Extract JSON from response
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error("Could not parse AI response as JSON");
    }

    const profile = JSON.parse(jsonMatch[0]);

    // Store in cache
    const record = {
      species: normalizedSpecies,
      breed: normalizedBreed,
      temperament: profile.temperament || "",
      exercise_needs: profile.exercise_needs || "",
      grooming: profile.grooming || "",
      stranger_behavior: profile.stranger_behavior || "",
      sitter_tips: profile.sitter_tips || "",
      ideal_for: profile.ideal_for || "",
    };

    const { data: inserted } = await supabase
      .from("breed_profiles")
      .upsert(record, { onConflict: "species,breed" })
      .select()
      .single();

    return new Response(JSON.stringify(inserted || record), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Breed profile error:", error);
    return new Response(JSON.stringify({ error: String(error) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
