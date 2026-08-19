import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { requireAdminOrServiceRole } from "../_shared/require-admin.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const LOVABLE_API_URL = "https://ai.gateway.lovable.dev/v1/chat/completions";

/**
 * Wikimedia exige un User-Agent descriptif (politique robots). Sans lui,
 * et depuis des IP de sortie mutualisées, ses serveurs répondent 403/429
 * avec un corps TEXTE (« You are making too many requests… »), jamais du
 * JSON. Constaté en production le 19/08/2026 : 6 fiches générées sans
 * image, en silence.
 */
const WIKI_HEADERS = {
  "User-Agent": "Guardiens/1.0 (https://guardiens.fr; contact@guardiens.fr)",
  "Api-User-Agent": "Guardiens/1.0 (contact@guardiens.fr)",
};

/**
 * Trace explicite du pipeline image. Chaque génération journalise cet
 * objet et le renvoie dans la réponse : l'admin voit à l'écran si la
 * fiche a une image, et les journaux disent exactement quelle étape a
 * échoué le cas échéant. Fini le silence.
 */
interface ImageTrace {
  candidate: string | null;
  wiki_status: number | null;
  fetch_status: number | null;
  upload_ok: boolean;
  stored_url: string | null;
  detail: string;
}

const newTrace = (): ImageTrace => ({
  candidate: null,
  wiki_status: null,
  fetch_status: null,
  upload_ok: false,
  stored_url: null,
  detail: "",
});

/** Étape 1 du pipeline image : trouver un candidat Wikimedia. */
const findWikiImage = async (
  breed: string,
  trace: ImageTrace,
): Promise<{ url: string; credit: string } | null> => {
  const cap = (s: string) =>
    s.split(/\s+/).map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(" ");
  const queries = [cap(breed), breed, breed.replace(/é/g, "e").replace(/è/g, "e")];
  for (const q of queries) {
    try {
      // Miniature 1200px (déjà redimensionnée par Wikimedia) en priorité,
      // l'originale en repli : moins de poids à stocker.
      const wikiUrl = `https://fr.wikipedia.org/w/api.php?action=query&format=json&prop=pageimages&piprop=original|thumbnail&titles=${encodeURIComponent(q)}&redirects=1&pithumbsize=1200`;
      const wr = await fetch(wikiUrl, { headers: WIKI_HEADERS });
      trace.wiki_status = wr.status;
      if (!wr.ok) {
        // Réponse non JSON (429/403) : on trace code + extrait, on ne
        // parse pas à l'aveugle.
        const body = (await wr.text()).slice(0, 120);
        console.error(`[image] wiki search HTTP ${wr.status} for "${q}": ${body}`);
        continue;
      }
      const wj: any = await wr.json();
      const pages = wj?.query?.pages || {};
      for (const p of Object.values<any>(pages)) {
        const src = p?.thumbnail?.source ?? p?.original?.source;
        if (src && /\.(jpg|jpeg|png|webp)/i.test(src)) {
          trace.candidate = src;
          return { url: src, credit: `Wikipédia, ${p.title}` };
        }
      }
      console.log(`[image] wiki search "${q}": page trouvée mais sans image exploitable`);
    } catch (e) {
      console.error(`[image] wiki search failed for "${q}"`, e);
    }
  }
  if (!trace.detail) {
    trace.detail = trace.wiki_status && trace.wiki_status !== 200
      ? `recherche Wikimedia refusée (HTTP ${trace.wiki_status})`
      : "aucun candidat image Wikimedia";
  }
  return null;
};

/** Étapes 2 et 3 : télécharger le candidat et le déposer dans notre stockage. */
const storeImage = async (
  supabase: ReturnType<typeof createClient>,
  imageUrl: string,
  species: string,
  normalizedBreed: string,
  trace: ImageTrace,
): Promise<string | null> => {
  if (imageUrl.includes("/storage/v1/object/public/property-photos/")) {
    // Déjà dans notre stockage (appel manuel) : rien à rapatrier.
    trace.upload_ok = true;
    trace.stored_url = imageUrl;
    trace.detail = "déjà dans notre stockage";
    return imageUrl;
  }
  try {
    const imgRes = await fetch(imageUrl, { headers: WIKI_HEADERS });
    trace.fetch_status = imgRes.status;
    if (!imgRes.ok) {
      trace.detail = `téléchargement refusé (HTTP ${imgRes.status})`;
      console.error("[image] download failed", imgRes.status, imageUrl);
      return null;
    }
    const contentType = (imgRes.headers.get("content-type") || "image/jpeg").split(";")[0];
    const ext = contentType.includes("png") ? "png" : contentType.includes("webp") ? "webp" : "jpg";
    const slug = normalizedBreed
      .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
    if (!slug) {
      trace.detail = "slug de fichier vide";
      console.error("[image] empty slug for breed", normalizedBreed);
      return null;
    }
    const path = `breeds/${species}-${slug}.${ext}`;
    const buf = await imgRes.arrayBuffer();
    const { error: upErr } = await supabase.storage
      .from("property-photos")
      .upload(path, buf, { contentType, upsert: true });
    if (upErr) {
      trace.detail = `dépôt stockage refusé : ${upErr.message}`;
      console.error("[image] storage upload failed", path, upErr);
      return null;
    }
    trace.upload_ok = true;
    trace.stored_url = supabase.storage.from("property-photos").getPublicUrl(path).data.publicUrl;
    trace.detail = "image rapatriée dans property-photos";
    return trace.stored_url;
  } catch (e) {
    trace.detail = `exception : ${String(e)}`;
    console.error("[image] migration failed", e);
    return null;
  }
};

/**
 * Pipeline image complet et tracé : candidat (fourni ou Wikimedia) puis
 * rapatriement. Retourne l'URL stockée ou null, et remplit la trace.
 */
const resolveAndStoreImage = async (
  supabase: ReturnType<typeof createClient>,
  args: { species: string; breed: string; image_url?: string | null },
): Promise<{ stored: string | null; credit: string | null; trace: ImageTrace }> => {
  const trace = newTrace();
  let credit: string | null = null;
  let candidateUrl = args.image_url ?? null;
  if (candidateUrl) {
    trace.candidate = candidateUrl;
  } else {
    const found = await findWikiImage(args.breed, trace);
    if (found) {
      candidateUrl = found.url;
      credit = found.credit;
    }
  }
  const stored = candidateUrl
    ? await storeImage(supabase, candidateUrl, args.species, args.breed, trace)
    : null;
  if (!stored && !trace.detail) {
    trace.detail = candidateUrl ? "rapatriement impossible" : "aucune image candidate";
  }
  console.log("[image]", JSON.stringify({ species: args.species, breed: args.breed, ...trace }));
  return { stored, credit, trace };
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authFail = await requireAdminOrServiceRole(req, corsHeaders);
    if (authFail) return authFail;

    const { species, breed, force, image_url, image_credit, image_alt, image_only } = await req.json();
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

    // Mode rapatriement d'image SEUL : aucune regénération de texte. Sert
    // à réparer une fiche existante sans image (ou à changer son image)
    // sans toucher au contenu éditorial.
    if (image_only) {
      if (!cached) {
        return new Response(
          JSON.stringify({ error: `fiche introuvable : ${normalizedSpecies}/${normalizedBreed}` }),
          { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }
      const { stored, credit, trace } = await resolveAndStoreImage(supabase, {
        species: normalizedSpecies,
        breed: normalizedBreed,
        image_url: image_url ?? null,
      });
      if (stored) {
        const update: Record<string, unknown> = { image_url: stored };
        update.image_credit = image_credit ?? credit ?? cached.image_credit;
        update.image_alt = image_alt ?? `Photo, ${breed}`;
        await supabase
          .from("breed_profiles")
          .update(update)
          .eq("species", normalizedSpecies)
          .eq("breed", normalizedBreed);
      }
      return new Response(
        JSON.stringify({
          ...cached,
          image_url: stored ?? cached.image_url,
          image_status: stored ? "stored" : "none",
          image_detail: trace.detail,
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    if (cached && !force) {
      return new Response(
        JSON.stringify({
          ...cached,
          image_status: cached.image_url ? "stored" : "none",
          image_detail: cached.image_url ? "image déjà en place" : "aucune image (fiche en cache)",
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
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
  "difficulty_level": "Niveau de difficulté pour un gardien débutant. FORMAT STRICT : un seul mot parmi Facile, Modéré ou Exigeant, suivi OBLIGATOIREMENT d'un point (jamais de virgule, jamais de deux-points), puis 2-3 phrases de justification concrète. Exemple attendu : « Exigeant. La garde de cette race demande… ».",
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

    // Niveau de garde : le séparateur après le niveau est TOUJOURS un point.
    // Filet de sécurité code (la consigne du prompt peut être ignorée par le
    // modèle) : « Exigeant, … » devient « Exigeant. … ». La pastille de la
    // page /races dépend de ce premier mot isolé.
    const difficultyLevel = String(profile.difficulty_level || "")
      .replace(/^(\s*(?:facile|modéré|modere|exigeant))\s*,/i, "$1.");

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
      difficulty_level: difficultyLevel,
      ideal_for: profile.ideal_for || "",
      rich_content: profile.rich_content || "",
    };

    // Rapatriement systématique dans notre stockage : toute fiche générée
    // stocke le fichier dans property-photos/breeds/ (format déjà en place),
    // jamais de lien chaud externe. Si le rapatriement échoue, la fiche est
    // créée SANS image : la carte de repli publique prend le relais, mieux
    // vaut ça qu'une URL fragile. La trace est journalisée et renvoyée.
    const { stored, credit, trace } = await resolveAndStoreImage(supabase, {
      species: normalizedSpecies,
      breed: normalizedBreed,
      image_url: image_url ?? null,
    });
    if (stored) {
      record.image_url = stored;
      const finalCredit = image_credit ?? credit;
      const finalAlt = image_alt ?? `Photo, ${breed}`;
      if (finalCredit) record.image_credit = finalCredit;
      if (finalAlt) record.image_alt = finalAlt;
    }

    const { data: inserted } = await supabase
      .from("breed_profiles")
      .upsert(record, { onConflict: "species,breed" })
      .select()
      .single();

    return new Response(
      JSON.stringify({
        ...(inserted || record),
        image_status: record.image_url ? "stored" : "none",
        image_detail: trace.detail,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  } catch (error) {
    console.error("Breed profile error:", error);
    return new Response(JSON.stringify({ error: String(error) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
