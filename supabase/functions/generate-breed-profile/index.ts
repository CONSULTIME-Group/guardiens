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
    // Require authentication: un-cached breeds consume paid AI credits.
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

    const { species, breed, force } = await req.json();
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

    if (cached && !force) {
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

    const prompt = `Vous êtes vétérinaire-comportementaliste expert et rédacteur pour Guardiens (plateforme française de garde d'animaux entre particuliers). Rédigez une fiche descriptive RICHE et FACTUELLE pour : ${breedPrompt}.

RÈGLES :
- Vouvoiement systématique.
- Ton chaleureux, pratique, orienté gardien débutant.
- Pas d'emoji, pas de tiret cadratin « — » (utilisez virgule, deux-points, parenthèses).
- Pas de superlatif marketing. Soyez concret, donnez des chiffres quand pertinent (poids, durée d'exercice, fréquence de brossage).
- Aucune mention de race ou pays comme stéréotype négatif. La fiche décrit la race en général, sans lieu géographique.

Répondez UNIQUEMENT en JSON valide avec cette structure exacte (chaque champ doit être SUBSTANTIEL, 4-6 phrases pleines sauf indication contraire) :
{
  "temperament": "Caractère général de la race en 4-6 phrases : tempérament dominant, niveau d'énergie, sensibilité, attachement au maître, comportement habituel à la maison.",
  "exercise_needs": "Besoins en exercice en 4-6 phrases : durée quotidienne précise (ex 1h, 2h), intensité, types d'activités recommandées (balade, course, jeu de pistage, agility…), signes de sous-stimulation.",
  "grooming": "Entretien en 3-5 phrases : type de poil/pelage, fréquence de brossage, périodes de mue, bains, oreilles/yeux/griffes, toilettage professionnel utile ou non.",
  "alimentation": "Alimentation en 4-6 phrases : quantité indicative selon poids adulte, qualité de croquettes recommandée, fréquence de repas, sensibilités digestives connues, aliments à éviter spécifiques.",
  "health_notes": "Santé en 4-6 phrases : maladies fréquentes / prédispositions génétiques de la race, espérance de vie moyenne, signes d'alerte à surveiller chez un gardien, importance des suivis vétérinaires.",
  "stranger_behavior": "Comportement avec les inconnus en 3-5 phrases : réaction face à un gardien non-maître, méfiance naturelle ou non, temps d'adaptation typique, ce qu'il faut éviter les premiers jours.",
  "compatibility": "Compatibilité avec d'autres animaux en 3-5 phrases : autres chiens (même sexe / sexe opposé), chats, petits animaux (rongeurs, lapins), enfants en bas âge.",
  "sitter_tips": "Conseils pratiques pour le gardien en 5-7 phrases : routine à respecter, signaux d'apaisement à reconnaître, erreurs classiques à éviter (laisse trop courte, surstimulation…), comment instaurer la confiance dès la première heure, quoi demander au propriétaire avant la garde.",
  "difficulty_level": "Niveau de difficulté pour un gardien débutant : Facile, Modéré ou Exigeant, suivi de 2-3 phrases de justification concrète.",
  "ideal_for": "1 paragraphe de 3-5 phrases décrivant le profil de gardien idéal : niveau d'expérience attendu, mode de vie compatible, contraintes à anticiper."
}`;

    const aiResponse = await fetch(LOVABLE_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${LOVABLE_API_KEY}`,
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-pro",
        messages: [{ role: "user", content: prompt }],
        max_tokens: 3500,
        temperature: 0.7,
        response_format: { type: "json_object" },
      }),
    });

    if (!aiResponse.ok) {
      const errText = await aiResponse.text();
      throw new Error(`AI API call failed [${aiResponse.status}]: ${errText}`);
    }

    const aiData = await aiResponse.json();
    const content = aiData.choices?.[0]?.message?.content || aiData.content || "";

    let profile: any = null;
    try { profile = JSON.parse(content); } catch {
      const m = content.match(/\{[\s\S]*\}/);
      if (m) {
        try { profile = JSON.parse(m[0]); } catch {
          const repaired = m[0].replace(/,\s*([}\]])/g, "$1").replace(/[\x00-\x1F\x7F]/g, " ");
          try { profile = JSON.parse(repaired); } catch {}
        }
      }
    }
    if (!profile) throw new Error("Could not parse AI response as JSON");

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
