// Alma Pass 2 — Chantier 1 (guide maison génératif)
// Génère 4 trames de contenu pour le guide maison à partir du profil owner.
// Entrée : { owner_id? } (owner_id optionnel, défaut = utilisateur authentifié)
// Sortie : { drafts: { wifi_info, neighborhood, veterinary, emergency }, warnings: string[] }
// Rate limit : 2 générations/jour par owner.
// Vouvoiement, guardrails Guardiens, tiret cadratin proscrit.

import { callLovableAI, extractToolArgs, STYLE_GUARDRAILS, CORS_HEADERS } from "../_shared/ai-gateway.ts";
import { isLlmRefusal, logRefusalFallback } from "../_shared/refusal-guard.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const RATE_LIMIT_PER_DAY = 2;
const PROSCRIBED = /(voisin(e|s|age)?|auvergne-rhône-alpes|\bAURA\b)/i;

const FALLBACK_DRAFTS = {
  wifi_info: "Bienvenue à la maison. Le réseau WiFi est {nom du réseau} et le mot de passe est {mot de passe}. La box internet se trouve {emplacement de la box}. En cas de coupure, un simple redémarrage de la box (couper l'alimentation 30 secondes, puis rallumer) résout la plupart des soucis. La télévision se rallume avec {télécommande / nom de l'appli}. N'hésitez pas à me demander si un point n'est pas clair.",
  neighborhood: "Voici quelques repères pratiques du coin. La boulangerie la plus proche se trouve {rue et distance}, ouverte {horaires}. Pour les courses du quotidien, {nom du commerce} est à {distance à pied ou en voiture}. Un joli coin de balade avec les animaux : {parc ou sentier}. Si vous cherchez un endroit calme pour souffler, {café ou lieu conseillé} est très apprécié. La pharmacie de garde est indiquée sur la vitrine de {pharmacie du coin}.",
  veterinary: "En cas de besoin vétérinaire, notre praticien habituel est {nom du vétérinaire}, joignable au {téléphone}, cabinet situé {adresse}. Il connaît nos animaux et leur dossier. Pour les urgences en dehors des heures d'ouverture, la clinique de garde la plus proche est {nom et téléphone}. Pensez à emporter le carnet de santé, rangé {emplacement}. Nos animaux prennent {traitement en cours} si applicable, comme précisé dans leur fiche.",
  emergency: "En cas de souci sérieux, contactez d'abord {nom du contact de secours} au {téléphone} : cette personne a la clé et peut se déplacer rapidement. Nous restons également joignables à {notre numéro} pendant notre absence. Les numéros d'urgence utiles : 15 (Samu), 18 (Pompiers), 112 (numéro européen). Le disjoncteur principal se trouve {emplacement}, la vanne d'eau {emplacement}. Merci pour votre vigilance.",
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

    // Rate limit 2/jour via analytics_events
    const dayAgo = new Date(Date.now() - 86_400_000).toISOString();
    const { count } = await supabase
      .from("analytics_events")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId)
      .eq("event_type", "alma_house_guide_generated")
      .gte("created_at", dayAgo);
    if ((count ?? 0) >= RATE_LIMIT_PER_DAY) {
      return json(
        { error: `Vous avez atteint la limite de ${RATE_LIMIT_PER_DAY} générations Alma par jour pour le guide maison.` },
        429,
      );
    }

    // Contexte : profil, owner_profile, propriété, animaux, guide existant.
    // Colonnes RÉELLES : owner_profiles n'a ni property_type, ni environment
    // (singulier), ni city, ni postal_code. Ces infos vivent sur properties
    // et profiles.
    const [profileRes, ownerRes, propRes, guideRes] = await Promise.all([
      supabase.from("profiles").select("first_name, city, postal_code").eq("id", userId).maybeSingle(),
      supabase.from("owner_profiles").select("environments, welcome_notes, rules_notes, presence_expected").eq("user_id", userId).maybeSingle(),
      supabase.from("properties").select("id, type, environment, pets(species, name)").eq("user_id", userId).limit(1).maybeSingle(),
      supabase.from("house_guides").select("wifi_instructions, detailed_instructions, vet_address, emergency_contact_name").eq("user_id", userId).maybeSingle(),
    ]);

    const city = profileRes.data?.city || null;
    const postalCode = profileRes.data?.postal_code || null;
    const propertyType = (propRes.data as any)?.type || null;
    const environments = (ownerRes.data as any)?.environments
      || ((propRes.data as any)?.environment ? [(propRes.data as any).environment] : []);
    const pets = ((propRes.data as any)?.pets ?? []).map((p: any) => ({ species: p.species, name: p.name }));


    const system = `Vous êtes Alma, narratrice IA de Guardiens.fr. Vous rédigez, pour un propriétaire (vouvoiement), 4 trames courtes destinées à son "guide maison" (document confidentiel remis à son gardien pendant la garde).

${STYLE_GUARDRAILS}

Règles spécifiques :
- Chaque trame fait 40 à 120 mots.
- Le ton est pratique, chaleureux, factuel, jamais commercial.
- Utilisez des placeholders entre accolades pour les informations que seul le propriétaire connaît. Exemples : {nom du réseau WiFi}, {mot de passe WiFi}, {nom du vétérinaire}, {téléphone}, {adresse}, {nom du contact de secours}.
- Pas d'invention de noms d'établissements, de numéros ou d'adresses. Uniquement des placeholders.
- Adaptez le ton aux animaux présents (chien, chat, etc.) et à l'environnement (campagne, ville).
- Les 4 sections attendues :
  1. wifi_info : instructions WiFi + tout point pratique numérique (télé, box).
  2. neighborhood : repères du coin (commerces utiles, coin de balade, particularités). Interdit d'utiliser le mot "voisin".
  3. veterinary : coordonnées vétérinaire (placeholders) + rappel des habitudes de soin.
  4. emergency : contact de secours en cas de souci (placeholders) + réflexes de base.`;

    const context = { city, postal_code: postalCode, property_type: propertyType, environments, pets };

    const r = await callLovableAI({
      messages: [
        { role: "system", content: system },
        { role: "user", content: `Contexte propriétaire :\n${JSON.stringify(context, null, 2)}\n\nGénérez les 4 trames.` },
      ],
      tools: [{
        type: "function",
        function: {
          name: "return_house_guide_drafts",
          description: "Renvoie les 4 trames de guide maison.",
          parameters: {
            type: "object",
            properties: {
              wifi_info: { type: "string", minLength: 80, maxLength: 900 },
              neighborhood: { type: "string", minLength: 80, maxLength: 900 },
              veterinary: { type: "string", minLength: 80, maxLength: 900 },
              emergency: { type: "string", minLength: 80, maxLength: 900 },
            },
            required: ["wifi_info", "neighborhood", "veterinary", "emergency"],
            additionalProperties: false,
          },
        },
      }],
      tool_choice: { type: "function", function: { name: "return_house_guide_drafts" } },
      temperature: 0.4,
    });

    const warnings: string[] = [];
    const clean = (s: string) => {
      let out = String(s || "").replaceAll("—", ",").replaceAll("–", "-");
      if (PROSCRIBED.test(out)) {
        warnings.push("Un terme sensible a été détecté et neutralisé.");
        out = out.replace(new RegExp(PROSCRIBED, "gi"), "personne de confiance");
      }
      return out.trim();
    };

    const applyGuard = (raw: unknown, fallback: string, key: string) => {
      const cleaned = clean(String(raw ?? ""));
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
      veterinary: applyGuard(parsed.veterinary, FALLBACK_DRAFTS.veterinary, "veterinary"),
      emergency: applyGuard(parsed.emergency, FALLBACK_DRAFTS.emergency, "emergency"),
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
      veterinary: !!guideRes.data?.vet_address,
      emergency: !!guideRes.data?.emergency_contact_name,
    };

    return json({ drafts, warnings, already });
  } catch (e) {
    console.error("generate-house-guide error:", e);
    return json({ error: e instanceof Error ? e.message : "Erreur" }, 500);
  }
});
