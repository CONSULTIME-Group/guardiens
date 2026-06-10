// Améliore un titre et une description d'annonce de garde via Lovable AI.
// Entrée : { title?, description, context? } — context = animaux, type logement, ville, dates.
// Sortie : { title, description, suggestions[] }

import { callLovableAI, extractToolArgs, STYLE_GUARDRAILS, CORS_HEADERS } from "../_shared/ai-gateway.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: CORS_HEADERS });

  try {
    const { title, description, context } = await req.json().catch(() => ({}));
    if (typeof description !== "string" || description.trim().length < 20) {
      return new Response(JSON.stringify({ error: "Description trop courte (min 20 caractères)." }), {
        status: 400, headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
      });
    }
    if (description.length > 4000) {
      return new Response(JSON.stringify({ error: "Description trop longue." }), {
        status: 400, headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
      });
    }

    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
      });
    }
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } }, auth: { persistSession: false, autoRefreshToken: false } },
    );
    const { data: u, error: ue } = await supabase.auth.getUser();
    if (ue || !u?.user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
      });
    }

    const system = `Vous êtes éditeur d'annonces de garde de maison et d'animaux pour une plateforme française de confiance.

${STYLE_GUARDRAILS}

Mission :
- Corriger l'orthographe et la grammaire.
- Structurer en phrases courtes, faciles à scanner.
- Conserver tous les faits fournis par l'utilisateur, ne rien inventer (pas d'animaux ni de pièces non mentionnés).
- Si le titre est vide ou faible, en proposer un de 40 à 70 caractères, descriptif et concret.
- La description finale doit faire entre 200 et 600 caractères.`;

    const userPayload = {
      titre_actuel: title ?? "",
      description_brute: description,
      contexte: context ?? null,
    };

    const r = await callLovableAI({
      messages: [
        { role: "system", content: system },
        { role: "user", content: `Améliorez cette annonce et renvoyez le résultat structuré.\n\n${JSON.stringify(userPayload, null, 2)}` },
      ],
      tools: [{
        type: "function",
        function: {
          name: "return_improved_listing",
          description: "Renvoie l'annonce améliorée.",
          parameters: {
            type: "object",
            properties: {
              title: { type: "string", minLength: 20, maxLength: 90 },
              description: { type: "string", minLength: 100, maxLength: 700 },
              suggestions: { type: "array", items: { type: "string" }, minItems: 0, maxItems: 4 },
            },
            required: ["title", "description", "suggestions"],
            additionalProperties: false,
          },
        },
      }],
      tool_choice: { type: "function", function: { name: "return_improved_listing" } },
      temperature: 0.4,
    });

    if (!r.ok) {
      return new Response(JSON.stringify({ error: r.error, code: r.code }), {
        status: r.status, headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
      });
    }

    const parsed = extractToolArgs(r.data);
    if (!parsed) {
      return new Response(JSON.stringify({ error: "Réponse IA invalide" }), {
        status: 502, headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
      });
    }

    // Filet de sécurité : strip tiret cadratin résiduel.
    parsed.title = String(parsed.title || "").replaceAll("—", ",");
    parsed.description = String(parsed.description || "").replaceAll("—", ",");

    return new Response(JSON.stringify(parsed), {
      headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("improve-sit-description error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Erreur" }), {
      status: 500, headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
    });
  }
});
