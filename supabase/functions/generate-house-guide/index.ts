// Alma Pass 2 — Chantier 1 (guide maison génératif)
// Génère 2 trames de texte libre pour le guide maison à partir du profil owner.
// Entrée : { owner_id? } (owner_id optionnel, défaut = utilisateur authentifié)
// Sortie : { drafts: { wifi_info, neighborhood }, warnings: string[], already }
// Rate limit : 2 générations/jour par owner, comptées sur l'événement
// alma_house_guide_call que la fonction écrit elle-même.
//
// Lot GUIDE1 (22/11/2026, audit claude/audit-generateurs-guides-22-novembre-2026.md) :
// - les trames « vétérinaire » et « urgences » disparaissent : elles rangeaient
//   un paragraphe à accolades dans « Adresse du vétérinaire » et « Nom du
//   contact », deux champs courts déjà couverts par les champs structurés
//   (17 guides sur 45 gardaient des accolades, 3 publiés) ;
// - le plafond se comptait sur un événement écrit par le navigateur ;
// - un terme proscrit ou un numéro de téléphone écrit par l'IA donne la trame
//   générique (avant : remplacement mot à mot, « voisinage » devenait
//   « personne de confiance »).
// Vouvoiement, guardrails Guardiens, tiret cadratin proscrit.

import { callLovableAI, extractToolArgs, STYLE_GUARDRAILS, CORS_HEADERS } from "../_shared/ai-gateway.ts";
import { isLlmRefusal, logRefusalFallback } from "../_shared/refusal-guard.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const RATE_LIMIT_PER_DAY = 2;
// Numéro de téléphone hors accolades (les trames n'en portent aucun).
const INVENTED_PHONE = /(?:\+33|\b0)[1-9](?:[ .-]?\d{2}){4}\b/;
const PROSCRIBED = /(voisin(e|s|age)?|gratuit à vie|pour toujours|période d'essai|programme fondateur|auvergne-rhône-alpes|\bAURA\b)/i;

const FALLBACK_DRAFTS = {
  wifi_info: "Bienvenue à la maison. Le nom du réseau WiFi et son mot de passe figurent dans ce guide. La box internet se trouve {emplacement de la box}. En cas de coupure, un simple redémarrage de la box (couper l'alimentation 30 secondes, puis rallumer) résout la plupart des soucis. La télévision se rallume avec {télécommande / nom de l'appli}. N'hésitez pas à me demander si un point n'est pas clair.",
  neighborhood: "Voici quelques repères pratiques du coin. La boulangerie la plus proche se trouve {rue et distance}, ouverte {horaires}. Pour les courses du quotidien, {nom du commerce} est à {distance à pied ou en voiture}. Un joli coin de balade avec les animaux : {parc ou sentier}. Si vous cherchez un endroit calme pour souffler, {café ou lieu conseillé} est très apprécié. La pharmacie de garde est indiquée sur la vitrine de {pharmacie du coin}.",
};


function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: CORS_HEADERS });

  try {
    const body = await req.json().catch(() => ({}));

    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) return json({ error: "Unauthorized" }, 401);

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } }, auth: { persistSession: false, autoRefreshToken: false } },
    );
    const { data: u, error: ue } = await supabase.auth.getUser();
    if (ue || !u?.user) return json({ error: "Unauthorized" }, 401);

    const userId = u.user.id;
    const ownerId = typeof body?.owner_id === "string" ? body.owner_id : userId;
    if (ownerId !== userId) return json({ error: "Forbidden" }, 403);

    // Plafond 2/jour : l'appel est compté par la fonction, avant l'IA. Une
    // lecture en échec refuse l'appel (jamais de plafond muet).
    const dayAgo = new Date(Date.now() - 86_400_000).toISOString();
    const { count, error: countErr } = await supabase
      .from("analytics_events")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId)
      .in("event_type", ["alma_house_guide_call", "alma_house_guide_generated"])
      .gte("created_at", dayAgo);
    if (countErr) return json({ error: "Alma est momentanément indisponible. Réessayez dans un instant." }, 503);
    // Le navigateur écrit encore alma_house_guide_generated après chaque
    // réussite : une génération laisse donc deux lignes.
    if ((count ?? 0) >= RATE_LIMIT_PER_DAY * 2) {
      return json(
        { error: `Vous avez atteint la limite de ${RATE_LIMIT_PER_DAY} générations Alma par jour pour le guide maison.` },
        429,
      );
    }

    await supabase.from("analytics_events").insert({
      user_id: userId,
      event_type: "alma_house_guide_call",
      source: "generate-house-guide",
    });

    // Contexte : profil, owner_profile, propriété, animaux, guide existant.
    // Colonnes RÉELLES : owner_profiles n'a ni property_type, ni environment
    // (singulier), ni city, ni postal_code. Ces infos vivent sur properties
    // et profiles.
    const [profileRes, ownerRes, propRes, guideRes] = await Promise.all([
      supabase.from("profiles").select("first_name, city, postal_code").eq("id", userId).maybeSingle(),
      supabase.from("owner_profiles").select("environments, welcome_notes, rules_notes, presence_expected").eq("user_id", userId).maybeSingle(),
      supabase.from("properties").select("id, type, environment, pets(species, name)").eq("user_id", userId).limit(1).maybeSingle(),
      supabase.from("house_guides").select("wifi_instructions, detailed_instructions").eq("user_id", userId).maybeSingle(),
    ]);

    const city = profileRes.data?.city || null;
    const postalCode = profileRes.data?.postal_code || null;
    const propertyType = (propRes.data as any)?.type || null;
    const environments = (ownerRes.data as any)?.environments
      || ((propRes.data as any)?.environment ? [(propRes.data as any).environment] : []);
    const pets = ((propRes.data as any)?.pets ?? []).map((p: any) => ({ species: p.species, name: p.name }));


    const system = `Vous êtes Alma, narratrice IA de Guardiens.fr. Vous rédigez, pour un propriétaire (vouvoiement), 2 trames courtes destinées à son "guide maison" (document confidentiel remis à son gardien pendant la garde).

${STYLE_GUARDRAILS}

Règles spécifiques :
- Chaque trame fait 40 à 120 mots.
- Le ton est pratique, chaleureux, factuel, jamais commercial.
- Utilisez des placeholders entre accolades pour les informations que seul le propriétaire connaît. Exemples : {emplacement de la box}, {nom du commerce}, {parc ou sentier}, {horaires}.
- Pas d'invention de noms d'établissements, de numéros ou d'adresses. Uniquement des placeholders.
- Aucun numéro de téléphone, aucun mot de passe : ces informations ont leurs propres champs dans le guide.
- Adaptez le ton aux animaux présents (chien, chat, etc.) et à l'environnement (campagne, ville).
- Les 2 sections attendues :
  1. wifi_info : précisions pratiques autour du WiFi et du numérique (emplacement de la box, redémarrage, télévision).
  2. neighborhood : repères du coin (commerces utiles, coin de balade, particularités). Interdit d'utiliser le mot "voisin".`;

    const context = { city, postal_code: postalCode, property_type: propertyType, environments, pets };

    const r = await callLovableAI({
      messages: [
        { role: "system", content: system },
        { role: "user", content: `Contexte propriétaire :\n${JSON.stringify(context, null, 2)}\n\nGénérez les 2 trames.` },
      ],
      tools: [{
        type: "function",
        function: {
          name: "return_house_guide_drafts",
          description: "Renvoie les 2 trames de guide maison.",
          parameters: {
            type: "object",
            properties: {
              wifi_info: { type: "string", minLength: 80, maxLength: 900 },
              neighborhood: { type: "string", minLength: 80, maxLength: 900 },
            },
            required: ["wifi_info", "neighborhood"],
            additionalProperties: false,
          },
        },
      }],
      tool_choice: { type: "function", function: { name: "return_house_guide_drafts" } },
      temperature: 0.4,
    });

    // Sur 402/429 on remonte l'erreur (crédits/quota), sinon on peut basculer
    // sur les fallbacks statiques plutôt que d'échouer durement.
    if (!r.ok && (r.status === 402 || r.status === 429)) {
      return json({ error: r.error, code: r.code }, r.status);
    }
    const parsed = r.ok ? extractToolArgs(r.data) : null;



    const warnings: string[] = [];
    const clean = (s: string) => String(s || "").replaceAll("—", ",").replaceAll("–", ",").trim();

    const applyGuard = (raw: unknown, fallback: string, key: string) => {
      const cleaned = clean(String(raw ?? ""));
      // Terme proscrit ou numéro écrit par l'IA : la trame générique, entière.
      if (PROSCRIBED.test(cleaned) || INVENTED_PHONE.test(cleaned)) {
        warnings.push(`Trame « ${key} » remplacée par un modèle générique.`);
        return fallback;
      }
      if (isLlmRefusal(cleaned, 60)) {
        console.warn(`generate-house-guide: refusal on ${key}, using fallback`);
        warnings.push(`Trame « ${key} » remplacée par un modèle générique.`);
        return fallback;
      }
      return cleaned;
    };

    let usedFallback = false;
    if (!r.ok || !parsed) {
      usedFallback = true;
      warnings.push("Assistant IA momentanément indisponible, trames génériques proposées.");
    }

    const drafts = parsed ? {
      wifi_info: applyGuard(parsed.wifi_info, FALLBACK_DRAFTS.wifi_info, "wifi_info"),
      neighborhood: applyGuard(parsed.neighborhood, FALLBACK_DRAFTS.neighborhood, "neighborhood"),
    } : { ...FALLBACK_DRAFTS };

    if (usedFallback || warnings.some((w) => w.startsWith("Trame «"))) {
      await logRefusalFallback(supabase, {
        user_id: userId,
        surface: "alma_house_guide",
        reason: usedFallback ? "gateway_error" : "llm_refusal",
      });
    }


    // hint : le guide existant (info : on aurait pu skipper les champs déjà remplis, on laisse le client décider)
    const already = {
      wifi_info: !!guideRes.data?.wifi_instructions,
      neighborhood: !!guideRes.data?.detailed_instructions,
    };

    return json({ drafts, warnings, already });
  } catch (e) {
    console.error("generate-house-guide error:", e);
    return json({ error: e instanceof Error ? e.message : "Erreur" }, 500);
  }
});
