// Alma Pass 1 — Chantier 8.2
// Génère une lettre de candidature pour un sitter qui postule à une annonce.
// Entrée : { sit_id }
// Sortie : { draft: string, warnings: string[] }
// Rate limit : 3/h. Tutoiement (côté sitter uniquement).

import { callLovableAI, extractToolArgs, STYLE_GUARDRAILS, CORS_HEADERS } from "../_shared/ai-gateway.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const RATE_LIMIT_PER_HOUR = 3;
const PROSCRIBED = /(voisin(e|s|age)?|auvergne-rhône-alpes|\bAURA\b)/i;

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
      .eq("event_type", "alma_application_letter_generated")
      .gte("created_at", oneHourAgo);
    if ((recentCount ?? 0) >= RATE_LIMIT_PER_HOUR) {
      return json({ error: `Vous avez atteint la limite de ${RATE_LIMIT_PER_HOUR} générations Alma par heure.` }, 429);
    }

    const [meRes, sitterRes, sitRes] = await Promise.all([
      supabase.from("profiles").select("first_name, bio, city").eq("id", userId).maybeSingle(),
      supabase.from("sitter_profiles").select("motivation, experience_years, animal_types").eq("user_id", userId).maybeSingle(),
      supabase.from("sits").select("title, city, start_date, end_date, specific_expectations, owner_message, animals").eq("id", sit_id).maybeSingle(),
    ]);

    if (!sitRes) return json({ error: "Annonce introuvable" }, 404);

    const system = `Tu es Alma, narratrice IA de Guardiens.fr. Tu rédiges pour un gardien candidat une LETTRE DE CANDIDATURE (120 à 220 mots) adressée au propriétaire d'une annonce. Utilise le tutoiement dans les phrases où tu me parles, mais rédige la lettre elle-même au VOUVOIEMENT (le sitter s'adresse à un propriétaire qu'il ne connaît pas).

${STYLE_GUARDRAILS}

Structure attendue de la lettre :
1. Une accroche factuelle qui reprend UN élément concret de l'annonce (animaux, ville, dates).
2. 2-3 phrases sur l'expérience concrète du gardien (années, animaux gardés), UNIQUEMENT à partir des données fournies. Aucune invention.
3. Une phrase sur la disponibilité aux dates de l'annonce.
4. Une phrase de clôture qui ouvre l'échange (proposition d'appel, question).
5. Pas de signature, pas de coordonnées.`;

    const payload = {
      sitter: {
        prenom: meRes?.first_name ?? null,
        bio: meRes?.bio ?? null,
        motivation: sitterRes?.motivation ?? null,
        experience_years: sitterRes?.experience_years ?? null,
        animal_types: sitterRes?.animal_types ?? null,
      },
      annonce: sitRes,
    };

    const r = await callLovableAI({
      messages: [
        { role: "system", content: system },
        { role: "user", content: `Contexte :\n${JSON.stringify(payload, null, 2)}\n\nRédige la lettre.` },
      ],
      tools: [{
        type: "function",
        function: {
          name: "return_letter",
          description: "Renvoie la lettre de candidature.",
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

    if (!r.ok) return json({ error: r.error, code: r.code }, r.status);
    const parsed = extractToolArgs(r.data);
    if (!parsed?.draft) return json({ error: "Réponse IA invalide" }, 502);

    let draft = String(parsed.draft).replaceAll("—", ",");
    const warnings: string[] = [];
    if (PROSCRIBED.test(draft)) {
      warnings.push("Un terme sensible a été détecté et neutralisé.");
      draft = draft.replace(PROSCRIBED, "gardien");
    }

    return json({ draft, warnings });
  } catch (e) {
    console.error("draft-application-letter error:", e);
    return json({ error: e instanceof Error ? e.message : "Erreur" }, 500);
  }
});
