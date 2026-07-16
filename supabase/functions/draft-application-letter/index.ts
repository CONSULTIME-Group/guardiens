// Alma Pass 1 — Chantier 8.2 (patch P0 : refus IA envoyés comme messages)
// Génère une lettre de candidature pour un gardien qui postule à une annonce.
// Entrée : { sit_id }
// Sortie : { draft: string, warnings: string[], fallback?: boolean }
// Rate limit : 3/h. Vouvoiement (lettre adressée au propriétaire).
//
// Root cause corrigé :
//   1) L'ancien code sélectionnait des colonnes inexistantes (`animals`,
//      `owner_id`) sur `sits` → la requête échouait, `sitRes.data` était null,
//      MAIS le code passait `sitRes` (le wrapper Postgrest complet) au LLM,
//      qui recevait alors `{ data: null, error: {...} }` et répondait par un
//      refus poli inséré tel quel comme message de candidature.
//   2) Aucun garde-fou sur la sortie : un refus IA était accepté et envoyé.
//
// Correctifs :
//   - Contexte reconstruit côté serveur avec le client service_role (bypass RLS)
//     à partir des vraies colonnes (sits.user_id, property_id → pets).
//   - Validation stricte des données avant appel LLM (fallback statique sinon).
//   - Détection de refus / sortie trop courte → fallback statique propre.
//   - Log analytics des fallbacks pour monitoring.

import { callLovableAI, extractToolArgs, STYLE_GUARDRAILS, CORS_HEADERS } from "../_shared/ai-gateway.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const RATE_LIMIT_PER_HOUR = 3;
const PROSCRIBED = /(voisin(e|s|age)?|auvergne-rhône-alpes|\bAURA\b)/i;

// Motifs de refus / dégénérescence LLM. Volontairement large : tout ce qui
// ressemble à un refus doit basculer sur le fallback statique.
const REFUSAL_PATTERNS: RegExp[] = [
  /je ne peux pas/i,
  /je suis désolé/i,
  /je suis incapable/i,
  /je ne suis pas en mesure/i,
  /informations? (sont )?manquantes?/i,
  /informations? (et|ou) (le|la|les) [\wéèêà]+ (sont|est) manquantes?/i,
  /(pourrais|pourriez|peux)-(tu|vous) me fournir/i,
  /pourrais-tu/i,
  /je n'ai pas (assez )?(d'|de )?(éléments|informations|détails|contexte)/i,
  /impossible de rédiger/i,
];

function isRefusal(text: string): boolean {
  const t = (text || "").trim();
  if (t.length < 60) return true;
  return REFUSAL_PATTERNS.some((re) => re.test(t));
}

function fmtDate(d?: string | null): string | null {
  if (!d) return null;
  try {
    return new Date(d).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" });
  } catch { return null; }
}

function buildFallbackDraft(ctx: {
  ownerFirstName?: string | null;
  city?: string | null;
  petsLabel?: string | null;
  startDate?: string | null;
  endDate?: string | null;
  sitterFirstName?: string | null;
  sitterExperienceYears?: number | null;
}): string {
  const salut = `Bonjour${ctx.ownerFirstName ? ` ${ctx.ownerFirstName}` : ""},`;
  const l1Parts: string[] = ["Votre annonce"];
  if (ctx.petsLabel) l1Parts.push(`pour ${ctx.petsLabel}`);
  if (ctx.city) l1Parts.push(`à ${ctx.city}`);
  l1Parts.push("a retenu mon attention.");
  const l1 = l1Parts.join(" ");

  const l2 = ctx.sitterExperienceYears && ctx.sitterExperienceYears > 0
    ? `Je pratique le house-sitting depuis ${ctx.sitterExperienceYears} an${ctx.sitterExperienceYears > 1 ? "s" : ""} et prends soin des animaux comme des miens, en respectant leurs habitudes.`
    : `Je prends soin des animaux comme des miens, en respectant leurs habitudes et le rythme du foyer.`;

  const start = fmtDate(ctx.startDate);
  const end = fmtDate(ctx.endDate);
  const l3 = start && end
    ? `Je serais disponible du ${start} au ${end}.`
    : `Je suis disponible sur les dates de votre annonce.`;

  const l4 = `Je serais ravi${ctx.sitterFirstName ? "" : "(e)"} d'échanger avec vous, par message ou en visio, pour vous rassurer et vérifier que nos attentes se rejoignent.`;
  const l5 = `Belle journée,`;

  return [salut, "", l1, "", l2, l3, "", l4, "", l5].join("\n");
}

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: CORS_HEADERS });

  try {
    const { sit_id } = await req.json().catch(() => ({}));
    if (typeof sit_id !== "string" || !sit_id) return json({ error: "sit_id requis" }, 400);

    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) return json({ error: "Unauthorized" }, 401);

    // Client 1 : userClient (avec JWT du gardien) — sert uniquement à valider
    // l'identité et à écrire l'analytics event de rate-limit sous auth.uid().
    const userClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } }, auth: { persistSession: false, autoRefreshToken: false } },
    );
    const { data: u, error: ue } = await userClient.auth.getUser();
    if (ue || !u?.user) return json({ error: "Unauthorized" }, 401);
    const userId = u.user.id;

    // Client 2 : adminClient (service_role) — bypass RLS pour reconstruire
    // le contexte complet de l'annonce (propriétaire, animaux, dates, ville).
    const adminClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
      { auth: { persistSession: false, autoRefreshToken: false } },
    );

    // Rate limit (3/h)
    const oneHourAgo = new Date(Date.now() - 3600_000).toISOString();
    const { count: recentCount } = await adminClient
      .from("analytics_events")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId)
      .eq("event_type", "alma_application_letter_generated")
      .gte("created_at", oneHourAgo);
    if ((recentCount ?? 0) >= RATE_LIMIT_PER_HOUR) {
      return json({ error: `Vous avez atteint la limite de ${RATE_LIMIT_PER_HOUR} générations Alma par heure.` }, 429);
    }

    // Contexte annonce (service_role, colonnes réelles)
    const { data: sit, error: sitErr } = await adminClient
      .from("sits")
      .select("id, user_id, property_id, title, city, start_date, end_date, specific_expectations, owner_message")
      .eq("id", sit_id)
      .maybeSingle();

    if (sitErr || !sit) {
      console.error("draft-application-letter: sit not found", { sit_id, sitErr });
      return json({ error: "Annonce introuvable" }, 404);
    }

    // Propriétaire + animaux + profils gardien (service_role, en parallèle)
    const [ownerRes, petsRes, meRes, sitterRes] = await Promise.all([
      adminClient.from("profiles").select("first_name").eq("id", sit.user_id).maybeSingle(),
      sit.property_id
        ? adminClient.from("pets").select("name, species, breed, age").eq("property_id", sit.property_id)
        : Promise.resolve({ data: [], error: null } as any),
      adminClient.from("profiles").select("first_name, bio, city").eq("id", userId).maybeSingle(),
      adminClient.from("sitter_profiles").select("motivation, experience_years, animal_types").eq("user_id", userId).maybeSingle(),
    ]);

    const owner = ownerRes.data || {};
    const pets = (petsRes.data || []) as Array<{ name?: string; species?: string; breed?: string; age_years?: number }>;
    const me = meRes.data || {};
    const sitter = sitterRes.data || {};

    // Label animaux lisible pour le fallback
    const petsLabel = pets.length > 0
      ? pets.map((p) => p.name || p.species || "un animal").join(", ")
      : null;

    const fallbackCtx = {
      ownerFirstName: (owner as any).first_name ?? null,
      city: sit.city ?? null,
      petsLabel,
      startDate: sit.start_date ?? null,
      endDate: sit.end_date ?? null,
      sitterFirstName: (me as any).first_name ?? null,
      sitterExperienceYears: (sitter as any).experience_years ?? null,
    };

    // Contexte suffisant ? (au moins ville OU animaux OU dates)
    const hasMinimumContext = !!(sit.city || pets.length > 0 || (sit.start_date && sit.end_date));
    if (!hasMinimumContext) {
      console.warn("draft-application-letter: minimal context missing, returning static fallback", { sit_id });
      const draft = buildFallbackDraft(fallbackCtx);
      await adminClient.from("analytics_events").insert({
        user_id: userId,
        event_type: "alma_application_letter_fallback",
        metadata: { sit_id, reason: "insufficient_context" },
      });
      return json({ draft, warnings: ["Contexte de l'annonce limité, brouillon générique proposé."], fallback: true });
    }

    const system = `Tu es Alma, narratrice IA de Guardiens.fr. Tu rédiges une LETTRE DE CANDIDATURE (120 à 220 mots) qu'un gardien envoie au propriétaire d'une annonce de garde à domicile. La lettre est adressée au propriétaire au VOUVOIEMENT.

${STYLE_GUARDRAILS}

RÈGLE ABSOLUE : tu produis TOUJOURS une lettre exploitable, même si certaines infos manquent. Tu ne dois JAMAIS répondre par un refus, une excuse, ni demander plus d'informations. Si un champ manque, tu l'ignores simplement et t'appuies sur ceux disponibles.

Structure attendue :
1. Salutation ("Bonjour {prénom du propriétaire}," si connu, sinon "Bonjour,").
2. Accroche factuelle reprenant UN élément concret disponible (animaux, ville OU dates).
3. 2-3 phrases sur l'expérience concrète du gardien, à partir des données fournies. Aucune invention.
4. Une phrase sur la disponibilité si les dates sont connues.
5. Une phrase de clôture ouvrant l'échange (proposition d'appel, question).
6. Pas de signature, pas de coordonnées, pas d'emoji.`;

    const payload = {
      annonce: {
        titre: sit.title ?? null,
        ville: sit.city ?? null,
        date_debut: sit.start_date ?? null,
        date_fin: sit.end_date ?? null,
        attentes: sit.specific_expectations ?? null,
        message_proprietaire: sit.owner_message ?? null,
        animaux: pets.map((p) => ({
          nom: p.name ?? null,
          espece: p.species ?? null,
          race: p.breed ?? null,
          age_annees: p.age_years ?? null,
        })),
      },
      proprietaire: {
        prenom: (owner as any).first_name ?? null,
      },
      gardien: {
        prenom: (me as any).first_name ?? null,
        ville: (me as any).city ?? null,
        bio: (me as any).bio ?? null,
        motivation: (sitter as any).motivation ?? null,
        experience_annees: (sitter as any).experience_years ?? null,
        types_animaux: (sitter as any).animal_types ?? null,
      },
    };

    const r = await callLovableAI({
      messages: [
        { role: "system", content: system },
        { role: "user", content: `Contexte disponible (certains champs peuvent être null, ignore-les) :\n${JSON.stringify(payload, null, 2)}\n\nRédige la lettre maintenant. Tu ne demandes rien, tu produis directement la lettre.` },
      ],
      tools: [{
        type: "function",
        function: {
          name: "return_letter",
          description: "Renvoie la lettre de candidature finale, prête à envoyer.",
          parameters: {
            type: "object",
            properties: { draft: { type: "string", minLength: 200, maxLength: 1600 } },
            required: ["draft"],
            additionalProperties: false,
          },
        },
      }],
      tool_choice: { type: "function", function: { name: "return_letter" } },
      temperature: 0.3,
    });

    if (!r.ok) {
      // Fallback plutôt que 402/429 dur : on préserve l'UX
      if (r.status === 402 || r.status === 429) return json({ error: r.error, code: r.code }, r.status);
      console.error("draft-application-letter: gateway error", r.status, r.error);
      const draft = buildFallbackDraft(fallbackCtx);
      return json({ draft, warnings: ["Assistant IA momentanément indisponible, brouillon générique proposé."], fallback: true });
    }

    const parsed = extractToolArgs(r.data);
    let draft = typeof parsed?.draft === "string" ? String(parsed.draft) : "";

    // Nettoyage éditorial
    draft = draft.replaceAll("—", ",").replaceAll("–", "-");
    const warnings: string[] = [];
    if (PROSCRIBED.test(draft)) {
      warnings.push("Un terme sensible a été détecté et neutralisé.");
      draft = draft.replace(PROSCRIBED, "gardien");
    }

    // GARDE-FOU : sortie vide, trop courte ou refus → fallback statique
    if (isRefusal(draft)) {
      console.warn("draft-application-letter: LLM refusal detected, using static fallback", {
        sit_id,
        userId,
        rawStart: draft.slice(0, 120),
      });
      await adminClient.from("analytics_events").insert({
        user_id: userId,
        event_type: "alma_application_letter_fallback",
        metadata: { sit_id, reason: "llm_refusal", raw_preview: draft.slice(0, 200) },
      });
      const fb = buildFallbackDraft(fallbackCtx);
      return json({ draft: fb, warnings: ["Brouillon générique proposé, personnalisez-le avant envoi."], fallback: true });
    }

    return json({ draft, warnings });
  } catch (e) {
    console.error("draft-application-letter error:", e);
    return json({ error: e instanceof Error ? e.message : "Erreur" }, 500);
  }
});
