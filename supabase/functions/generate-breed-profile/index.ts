import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { requireAdminOrServiceRole } from "../_shared/require-admin.ts";

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
    const authFail = await requireAdminOrServiceRole(req, corsHeaders);
    if (authFail) return authFail;

    const { species, breed, force, image_url, image_credit, image_alt } = await req.json();
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

    const richPrompt = `Vous êtes vétérinaire-comportementaliste expert et rédacteur pour Guardiens (plateforme française de garde d'animaux entre particuliers). Rédigez un article long de garde complet en MARKDOWN (1800-2500 mots) pour : ${breedPrompt}.

RÈGLES :
- Vouvoiement systématique.
- Ton chaleureux, pratique, orienté gardien débutant.
- Pas d'emoji, pas de tiret cadratin « — » (utilisez virgule, deux-points, parenthèses).
- Pas de superlatif marketing, soyez concret et chiffré.
- Répondez uniquement avec le markdown, sans bloc de code, sans JSON, sans commentaire.

Structure OBLIGATOIRE avec ces titres H2 exacts :

## Portrait du ${breedPrompt}
(origine brève, morphologie, poids, taille, espérance de vie, personnalité dominante, 3-4 paragraphes)

## Une journée type de garde
(matin, midi, après-midi, soir : routines, repas, sorties, jeux, repos. Concret, horaires indicatifs)

## Alimentation détaillée
(quantités exactes selon poids, marques de croquettes adaptées, friandises OK et à éviter, transitions alimentaires, eau)

## Exercice et stimulation mentale
(durée précise, types d'activités, jeux d'occupation, signaux de fatigue, météo)

## Hygiène et toilettage
(brossage fréquence, bains, oreilles, yeux, dents, griffes, mue saisonnière)

## Santé : ce que tout gardien doit savoir
(pathologies fréquentes, signes d'alerte précis à surveiller, comportements anormaux, quand appeler le véto)

## Comportement et socialisation
(avec gardien inconnu, autres animaux, enfants, bruits, séparation, peurs typiques de la race)

## Conseils pratiques pour le gardien
(checklist arrivée, premières 24h, instaurer la confiance, gestion des laisses/harnais, sécurité maison, urgences)

## Erreurs classiques à éviter
(liste 5-7 erreurs concrètes, expliquer pourquoi et comment corriger)

## Questions à poser au propriétaire avant la garde
(liste 8-12 questions pratiques)

RÈGLES MARKDOWN : utilisez **gras** pour les points clés, listes à puces, sous-sections H3 si pertinent. Pas de tableaux. Pas d'introductions plates type 'Dans cet article…'.`;

    const callAi = async (body: Record<string, unknown>) => {
      const res = await fetch(LOVABLE_API_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${LOVABLE_API_KEY}`,
        },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const errText = await res.text();
        throw new Error(`AI API call failed [${res.status}]: ${errText}`);
      }
      const json = await res.json();
      return {
        content: json.choices?.[0]?.message?.content || json.content || "",
        finishReason: json.choices?.[0]?.finish_reason || null,
      };
    };

    const parseJsonLoose = (content: string) => {
      try { return JSON.parse(content); } catch { /* continue */ }
      const m = content.match(/\{[\s\S]*\}/);
      if (!m) return null;
      try { return JSON.parse(m[0]); } catch { /* continue */ }
      const repaired = m[0].replace(/,\s*([}\]])/g, "$1").replace(/[\x00-\x1F\x7F]/g, " ");
      try { return JSON.parse(repaired); } catch { return null; }
    };

    // Appel 1, champs structurés courts (JSON)
    let profile: any = null;
    let lastFinish: string | null = null;
    for (let attempt = 0; attempt < 2 && !profile; attempt++) {
      const { content, finishReason } = await callAi({
        model: "google/gemini-2.5-flash",
        messages: [{ role: "user", content: prompt }],
        max_tokens: 6000,
        temperature: attempt === 0 ? 0.7 : 0.3,
        response_format: { type: "json_object" },
      });
      lastFinish = finishReason;
      profile = parseJsonLoose(content);
      if (!profile) {
        console.error("JSON parse failed", { attempt, finishReason, preview: String(content).slice(0, 400) });
      }
    }
    if (!profile) {
      throw new Error(`Could not parse AI response as JSON (finish_reason: ${lastFinish})`);
    }

    // Appel 2, article long en markdown brut (aucun parsing JSON, donc pas de troncature fatale)
    let richContent = "";
    try {
      const { content } = await callAi({
        model: "google/gemini-2.5-flash",
        messages: [{ role: "user", content: richPrompt }],
        max_tokens: 12000,
        temperature: 0.7,
      });
      richContent = String(content || "").replace(/^```(?:markdown)?\s*/i, "").replace(/```\s*$/, "").trim();
    } catch (e) {
      console.error("Rich content generation failed", e);
    }
    profile.rich_content = richContent;


    const record: Record<string, unknown> = {
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
      rich_content: profile.rich_content || "",
    };
    // Auto-fetch Wikipedia FR image if not provided
    let finalImage = image_url, finalCredit = image_credit, finalAlt = image_alt;
    if (!finalImage) {
      const cap = (s: string) => s.split(/\s+/).map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(" ");
      const queries = [cap(breed), breed, breed.replace(/é/g, "e").replace(/è/g, "e")];
      for (const q of queries) {
        try {
          const wikiUrl = `https://fr.wikipedia.org/w/api.php?action=query&format=json&prop=pageimages&piprop=original&titles=${encodeURIComponent(q)}&redirects=1&pithumbsize=1200`;
          const wr = await fetch(wikiUrl);
          const wj: any = await wr.json();
          const pages = wj?.query?.pages || {};
          for (const p of Object.values<any>(pages)) {
            const src = p?.original?.source;
            if (src && /\.(jpg|jpeg|png|webp)$/i.test(src)) {
              finalImage = src;
              finalCredit = `Wikipédia, ${p.title}`;
              finalAlt = `Photo, ${breed}`;
              break;
            }
          }
          if (finalImage) break;
        } catch (e) { console.error("wiki fail", q, e); }
      }
    }
    if (finalImage) record.image_url = finalImage;
    if (finalCredit) record.image_credit = finalCredit;
    if (finalAlt) record.image_alt = finalAlt;

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
