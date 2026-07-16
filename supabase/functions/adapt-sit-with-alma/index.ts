// Adapter une annonce existante avec Alma.
// Entrée : { sourceSitId: string, prompt: string }
// Sortie : { title, specific_expectations, daily_routine, owner_message, open_to, environments }
//
// Ne fait AUCUN insert : le client applique le résultat au formulaire /sits/create?from=&mode=adapt.
// Rate limit 5/heure/user via analytics_events.

import { callLovableAI, extractToolArgs, STYLE_GUARDRAILS, CORS_HEADERS } from "../_shared/ai-gateway.ts";
import { isLlmRefusal } from "../_shared/refusal-guard.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const RATE_LIMIT_PER_HOUR = 5;
const ALLOWED_ENVIRONMENTS = ["ville", "campagne", "montagne", "lac", "vignes", "foret"] as const;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: CORS_HEADERS });

  try {
    const { sourceSitId, prompt } = await req.json().catch(() => ({}));
    if (typeof sourceSitId !== "string" || sourceSitId.length < 8) {
      return json({ error: "Annonce source invalide." }, 400);
    }
    if (typeof prompt !== "string" || prompt.trim().length < 10) {
      return json({ error: "Précisez en au moins 10 caractères ce qui change." }, 400);
    }
    if (prompt.length > 1500) {
      return json({ error: "Description trop longue (1500 caractères max)." }, 400);
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

    // Rate limit
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
    const { count: recentCount } = await supabase
      .from("analytics_events")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId)
      .eq("event_type", "alma_republish_adapted")
      .gte("created_at", oneHourAgo);
    if ((recentCount ?? 0) >= RATE_LIMIT_PER_HOUR) {
      return json({ error: "Limite d'adaptations horaire atteinte, réessayez plus tard." }, 429);
    }

    // Charger l'annonce source (propriété du user)
    const { data: source, error: sErr } = await supabase
      .from("sits")
      .select("title, specific_expectations, daily_routine, owner_message, open_to, environments, city")
      .eq("id", sourceSitId)
      .eq("user_id", userId)
      .maybeSingle();
    if (sErr || !source) return json({ error: "Annonce source introuvable." }, 404);

    const system = `Vous êtes rédacteur pour Guardiens.fr. Un propriétaire souhaite republier une annonce existante en l'adaptant. Vous recevez l'annonce d'origine ET les modifications qu'il demande. Réécrivez UNIQUEMENT les champs texte pour refléter ses ajustements, en gardant la voix, la ville et les contraintes cohérentes avec l'original quand elles ne sont pas explicitement modifiées.

${STYLE_GUARDRAILS}

Contraintes :
- Ne supprimez pas d'information essentielle de l'original (animaux, ville, contexte) sauf si l'ajustement le demande explicitement.
- Ne recopiez pas mot pour mot : reformulez pour intégrer les changements de façon naturelle.
- environments : 0 à 3 valeurs STRICTEMENT parmi { ville, campagne, montagne, lac, vignes, foret }. Ne renvoyez cette clé que si vous êtes sûr d'un changement pertinent, sinon renvoyez la liste d'origine.
- open_to : gardez les valeurs de l'original sauf si l'ajustement demande de les modifier.`;

    const originalCtx = `Annonce d'origine :
- title : ${source.title ?? ""}
- ville : ${source.city ?? ""}
- specific_expectations : ${source.specific_expectations ?? ""}
- daily_routine : ${source.daily_routine ?? ""}
- owner_message : ${source.owner_message ?? ""}
- open_to : ${JSON.stringify(source.open_to ?? [])}
- environments : ${JSON.stringify(source.environments ?? [])}

Modifications demandées par le propriétaire :
${prompt.trim()}`;

    const r = await callLovableAI({
      model: "google/gemini-2.5-flash",
      temperature: 0.4,
      messages: [
        { role: "system", content: system },
        { role: "user", content: originalCtx },
      ],
      tools: [{
        type: "function",
        function: {
          name: "return_adapted_sit",
          description: "Renvoie l'annonce adaptée.",
          parameters: {
            type: "object",
            properties: {
              title: { type: "string", minLength: 20, maxLength: 90 },
              specific_expectations: { type: "string", minLength: 60, maxLength: 900 },
              daily_routine: { type: "string", minLength: 60, maxLength: 900 },
              owner_message: { type: "string", minLength: 60, maxLength: 700 },
              open_to: { type: "array", items: { type: "string" }, minItems: 0, maxItems: 4 },
              environments: { type: "array", items: { type: "string", enum: [...ALLOWED_ENVIRONMENTS] }, minItems: 0, maxItems: 3 },
            },
            required: ["title", "specific_expectations", "daily_routine", "owner_message"],
            additionalProperties: false,
          },
        },
      }],
      tool_choice: { type: "function", function: { name: "return_adapted_sit" } },
    });

    if (!r.ok) return json({ error: r.error, code: r.code }, r.status);
    const parsed = extractToolArgs(r.data);
    if (!parsed) return json({ error: "Impossible d'adapter le brouillon automatiquement." }, 502);

    const clean = (s: unknown) => String(s ?? "").replaceAll("—", ",").replaceAll("–", ",");
    const result = {
      title: clean(parsed.title),
      specific_expectations: clean(parsed.specific_expectations),
      daily_routine: clean(parsed.daily_routine),
      owner_message: clean(parsed.owner_message),
      open_to: Array.isArray(parsed.open_to)
        ? parsed.open_to.map(clean).filter(Boolean).slice(0, 4)
        : (source.open_to ?? []),
      environments: Array.isArray(parsed.environments)
        ? parsed.environments.map((v: unknown) => String(v ?? "").toLowerCase().trim())
            .filter((v: string) => (ALLOWED_ENVIRONMENTS as readonly string[]).includes(v)).slice(0, 3)
        : (source.environments ?? []),
    };

    return json(result, 200);
  } catch (e) {
    console.error("adapt-sit-with-alma error:", e);
    return json({ error: e instanceof Error ? e.message : "Erreur" }, 500);
  }
});

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
  });
}
