import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const LOVABLE_API_URL = "https://ai.gateway.lovable.dev/v1/chat/completions";

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

    const prompt = `Tu es un expert animalier. Génère une fiche descriptive GÉNÉRALE pour : ${breedPrompt}.

IMPORTANT : Cette fiche décrit la RACE en général. Ne mentionne AUCUNE ville, région ou lieu géographique. Le contenu doit être universel.

Réponds UNIQUEMENT en JSON valide avec cette structure exacte :
{
  "temperament": "Caractère général typique de cette race en 2-3 phrases",
  "exercise_needs": "Besoins en exercice quotidien : durée, intensité, type d'activités recommandées en 2-3 phrases",
  "grooming": "Entretien du pelage/plumage, fréquence de toilettage, mue en 1-2 phrases",
  "alimentation": "Besoins alimentaires spécifiques, quantités indicatives, aliments à éviter en 2-3 phrases",
  "health_notes": "Points d'attention santé : maladies fréquentes de la race, prédispositions génétiques, signes à surveiller en 2-3 phrases",
  "stranger_behavior": "Comportement avec les inconnus et réaction face à un gardien qui n'est pas son maître en 1-2 phrases",
  "compatibility": "Compatibilité avec d'autres animaux (chiens, chats, petits animaux) en 1-2 phrases",
  "sitter_tips": "Conseils pratiques pour un gardien : ce qu'il doit absolument savoir, les erreurs à éviter, comment gagner la confiance de l'animal en 2-3 phrases",
  "difficulty_level": "Niveau de difficulté pour un gardien débutant : Facile / Modéré / Exigeant — avec une justification en 1 phrase",
  "ideal_for": "Idéal pour un gardien qui... (1 phrase décrivant le profil de gardien compatible)"
}
Ton : chaleureux et pratique, orienté gardien. En français.`;

    const aiResponse = await fetch(LOVABLE_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${LOVABLE_API_KEY}`,
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [{ role: "user", content: prompt }],
        max_tokens: 800,
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
      species: normalizedSpecies,
      breed: normalizedBreed,
      temperament: profile.temperament || "",
      exercise_needs: profile.exercise_needs || "",
      grooming: profile.grooming || "",
      alimentation: profile.alimentation || "",
      health_notes: profile.health_notes || "",
      stranger_behavior: profile.stranger_behavior || "",
      compatibility: profile.compatibility || "",
      sitter_tips: profile.sitter_tips || "",
      difficulty_level: profile.difficulty_level || "",
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
