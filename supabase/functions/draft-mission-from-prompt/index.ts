// Lot ALMA2 (10/11/2026, arène « Alma vivante », lot L2) : écrire un besoin
// d'entraide avec Alma.
// Entrée : { prompt: string } (la phrase du membre, 10 à 800 caractères)
// Sortie : { title, description, warnings } ou { available: false, reason, message }
//
// Le membre relit et modifie titre et description dans le formulaire avant de
// publier ; rien n'est enregistré ici. Rate limit : 5 brouillons par heure
// (alma_cowrite_used, moment besoin, écrit par le site après réception).

import { callLovableAI, extractToolArgs, STYLE_GUARDRAILS, CORS_HEADERS } from "../_shared/ai-gateway.ts";
import { DECLARED_FACTS_RULE, stripUndeclaredSlots } from "../_shared/alma-declared-facts.ts";
import { isLlmRefusal } from "../_shared/refusal-guard.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const RATE_LIMIT_PER_HOUR = 5;
const TITLE_MAX = 100;
const DESCRIPTION_MAX = 900;
const PROSCRIBED = /(voisin(e|s|age)?|gratuit à vie|pour toujours|période d'essai|programme fondateur|auvergne-rhône-alpes|\bAURA\b)/i;

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
  });
}

function unavailable(reason: string) {
  return json({
    available: false,
    reason,
    message: "Je n'arrive pas à vous aider à rédiger là tout de suite. Écrivez votre besoin avec vos mots, c'est ce qui marche le mieux.",
  });
}

/** Retire les tirets longs et coupe proprement au dernier mot entier. */
export function tidy(text: string, max: number): string {
  const clean = text.replaceAll("—", ",").replaceAll("–", "-").replace(/\s+\n/g, "\n").trim();
  if (clean.length <= max) return clean;
  const cut = clean.slice(0, max);
  const lastSpace = cut.lastIndexOf(" ");
  return (lastSpace > max * 0.6 ? cut.slice(0, lastSpace) : cut).trim();
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: CORS_HEADERS });

  try {
    const { prompt } = await req.json().catch(() => ({}));
    if (typeof prompt !== "string" || prompt.trim().length < 10) {
      return json({ error: "Dites votre besoin en au moins 10 caractères." }, 400);
    }
    if (prompt.length > 800) {
      return json({ error: "Votre phrase est trop longue (800 caractères au plus)." }, 400);
    }

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

    const oneHourAgo = new Date(Date.now() - 3600_000).toISOString();
    const { count: recentCount } = await supabase
      .from("analytics_events")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId)
      .eq("event_type", "alma_cowrite_used")
      .eq("metadata->>moment", "besoin")
      .gte("created_at", oneHourAgo);
    if ((recentCount ?? 0) >= RATE_LIMIT_PER_HOUR) {
      return json({ error: `Vous avez atteint la limite de ${RATE_LIMIT_PER_HOUR} brouillons par heure.` }, 429);
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select("first_name, city")
      .eq("id", userId)
      .maybeSingle();

    const system = `Vous êtes Alma, compagne IA de Guardiens.fr. Un membre vous dit en une phrase le coup de main qu'il cherche près de chez lui. Vous mettez son besoin en forme : un titre et une description, écrits à la première personne, comme s'il les écrivait lui-même. Il relit et modifie avant de publier.

${STYLE_GUARDRAILS}

${DECLARED_FACTS_RULE}

L'entraide sur Guardiens : coups de main entre particuliers près de chez soi, par exemple jardinage, potager, courses, trajets, jeux de société, nourrir ou promener un animal. L'échange se fait en temps et en savoir-faire. Une rencontre reste toujours facultative.

Règles :
- Titre : une phrase courte et concrète, ${TITLE_MAX} caractères au plus, qui dit le coup de main cherché.
- Description : 2 à 4 phrases, entre 80 et 600 caractères : ce dont il s'agit, quand si la phrase le dit, ce qui aiderait la personne qui propose son aide.
- Reprenez seulement ce que la phrase dit (lieu, jour, animal, durée) ; un point absent reste absent.
- Aucun montant, aucun prix, aucune rémunération.
- La garde d'un enfant ou d'un mineur est en dehors de l'entraide : si la phrase la demande, décrivez seulement la partie qui relève de l'entraide.
- Vouvoiement si vous vous adressez au lecteur ; sinon première personne.
- Ne signez pas « Alma ».

RÈGLE ABSOLUE : vous produisez TOUJOURS un titre et une description exploitables, sans refus ni demande d'informations.`;

    const userPayload = {
      phrase: prompt.trim(),
      prenom: (profile as { first_name?: string } | null)?.first_name ?? null,
      commune: (profile as { city?: string } | null)?.city ?? null,
    };

    const r = await callLovableAI({
      messages: [
        { role: "system", content: system },
        { role: "user", content: `Contexte (un champ null est à ignorer) :\n${JSON.stringify(userPayload, null, 2)}\n\nMettez ce besoin en forme.` },
      ],
      tools: [{
        type: "function",
        function: {
          name: "return_mission",
          description: "Renvoie le titre et la description du besoin, prêts à relire.",
          parameters: {
            type: "object",
            properties: {
              title: { type: "string", minLength: 8, maxLength: 140 },
              description: { type: "string", minLength: 60, maxLength: 1200 },
            },
            required: ["title", "description"],
            additionalProperties: false,
          },
        },
      }],
      tool_choice: { type: "function", function: { name: "return_mission" } },
      temperature: 0.3,
    });

    if (!r.ok) {
      if (r.status === 402 || r.status === 429) return json({ error: r.error, code: r.code }, r.status);
      return unavailable("ai_unavailable");
    }

    const parsed = extractToolArgs(r.data);
    let title = tidy(typeof parsed?.title === "string" ? parsed.title : "", TITLE_MAX);
    let description = tidy(typeof parsed?.description === "string" ? parsed.description : "", DESCRIPTION_MAX);
    const warnings: string[] = [];

    if (PROSCRIBED.test(title) || PROSCRIBED.test(description)) {
      title = title.replace(PROSCRIBED, "près de chez moi");
      description = description.replace(PROSCRIBED, "près de chez moi");
      warnings.push("Une formule a été ajustée : relisez le texte.");
    }

    const stripped = stripUndeclaredSlots(description, JSON.stringify(userPayload));
    if (stripped.removed > 0) {
      description = stripped.text;
      warnings.push("Une précision de jour ou d'heure a été retirée : ajoutez la vôtre si vous le souhaitez.");
    }

    if (!title || description.length < 40) return unavailable("empty_draft");
    if (isLlmRefusal(title) || isLlmRefusal(description)) return unavailable("llm_refusal");

    return json({ title, description, warnings });
  } catch (e) {
    console.error("draft-mission-from-prompt error:", e);
    return json({ error: e instanceof Error ? e.message : "Erreur" }, 500);
  }
});
