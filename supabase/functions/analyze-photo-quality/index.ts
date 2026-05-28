// Analyse la qualité éditoriale d'une (ou plusieurs) photo(s) de couverture
// via Lovable AI (vision). Renvoie un score 0-100, défauts détectés, résumé.
//
// Garde-fous coût :
//  - MAX_PER_CALL : nb max d'images analysées par appel (cap dur, ignore l'excédent).
//  - MAX_PER_DAY  : quota quotidien par utilisateur, incrémenté côté DB.
//
// Compat : accepte `{ imageUrl }` (mode legacy, 1 image) ou `{ imageUrls: [...] }`.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const MAX_PER_CALL = 6;
const MAX_PER_DAY = 40;

type Scored = {
  url: string;
  score: number;
  verdict: string;
  issues: string[];
  suggestions: string[];
  summary: string;
};

const systemPrompt = `Vous évaluez des photos de couverture d'annonces de garde de maison/animaux.

Objectif : choisir LA photo qui donne le plus envie à un gardien de candidater. La pertinence éditoriale compte BIEN PLUS que la qualité technique pure.

Hiérarchie de scoring (sur 100) :
- 85-100 : animal de compagnie visible (chien, chat, NAC) dans un cadre chaleureux, OU intérieur de vie accueillant (salon, cuisine, terrasse habitée, jardin verdoyant), OU extérieur charmant de la maison.
- 60-84 : pièce correcte mais peu chaleureuse, jardin neutre, façade soignée.
- 30-59 : photo hors-sujet bien cadrée (objet, paysage lointain, véhicule, détail technique).
- 0-29 : photo manifestement inappropriée (selfie/portrait humain frontal, scène privée, rue grise, photo floue/sombre, capture d'écran, document).

Pénalisez fortement (max 40) : visages humains en gros plan, photos de personnes posant, véhicules, rues/parkings, photos administratives.
Bonus implicite : présence d'animal, lumière naturelle, atmosphère « comme à la maison ».

La qualité technique (netteté, exposition) ne départage qu'à pertinence éditoriale égale.

Utilisez le vouvoiement, soyez concret, court, bienveillant.`;

async function analyzeOne(imageUrl: string, apiKey: string): Promise<Scored | null> {
  const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "google/gemini-2.5-flash",
      messages: [
        { role: "system", content: systemPrompt },
        {
          role: "user",
          content: [
            {
              type: "text",
              text: "Évaluez cette photo en tant que candidate à la couverture d'une annonce de garde de maison/animaux. Privilégiez fortement la présence d'un animal et/ou d'un intérieur accueillant plutôt que la seule qualité technique. Notez de 0 à 100, listez les défauts visibles, et proposez 1 à 3 corrections concrètes en vouvoiement.",
            },
            { type: "image_url", image_url: { url: imageUrl } },
          ],
        },
      ],
      tools: [
        {
          type: "function",
          function: {
            name: "report_photo_quality",
            description: "Renvoie l'évaluation de la photo.",
            parameters: {
              type: "object",
              properties: {
                score: { type: "integer", minimum: 0, maximum: 100 },
                verdict: { type: "string", enum: ["excellent", "bon", "moyen", "faible"] },
                issues: {
                  type: "array",
                  items: {
                    type: "string",
                    enum: [
                      "flou",
                      "sombre",
                      "surexposée",
                      "trop_loin",
                      "cadrage_serré",
                      "désordre",
                      "vide",
                      "mauvaise_perspective",
                      "basse_résolution",
                      "hors_sujet",
                    ],
                  },
                },
                suggestions: { type: "array", items: { type: "string" }, minItems: 1, maxItems: 3 },
                summary: { type: "string" },
              },
              required: ["score", "verdict", "issues", "suggestions", "summary"],
              additionalProperties: false,
            },
          },
        },
      ],
      tool_choice: { type: "function", function: { name: "report_photo_quality" } },
    }),
  });

  if (response.status === 429) throw new Response(null, { status: 429 });
  if (response.status === 402) throw new Response(null, { status: 402 });
  if (!response.ok) {
    console.error("AI gateway error:", response.status, await response.text());
    return null;
  }
  const data = await response.json();
  const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];
  if (!toolCall) return null;
  try {
    const parsed = JSON.parse(toolCall.function.arguments);
    return { url: imageUrl, ...parsed };
  } catch {
    return null;
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const body = await req.json().catch(() => ({}));
    const single: string | undefined = body.imageUrl;
    const many: string[] | undefined = Array.isArray(body.imageUrls) ? body.imageUrls : undefined;

    const requested = many ?? (single ? [single] : []);
    if (requested.length === 0) {
      return new Response(JSON.stringify({ error: "imageUrl(s) requis" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Cap dur par appel pour éviter les explosions de coût sur grosses galeries.
    const capped = requested.slice(0, MAX_PER_CALL);
    const ignored = requested.length - capped.length;

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY manquant");

    // Authentication required: anonymous callers must NOT bypass per-user quotas.
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
    const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    const authHeader = req.headers.get("Authorization");
    if (!authHeader || !SUPABASE_URL || !SERVICE_KEY) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const admin = createClient(SUPABASE_URL, SERVICE_KEY, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const userClient = createClient(SUPABASE_URL, SERVICE_KEY, {
      global: { headers: { Authorization: authHeader } },
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const { data: userData } = await userClient.auth.getUser();
    const userId: string | null = userData?.user?.id ?? null;
    if (!userId) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Vérification quota avant d'analyser (lit le compteur du jour).
    {
      const today = new Date().toISOString().slice(0, 10);
      const { data: row } = await admin
        .from("ai_photo_analysis_quota")
        .select("count")
        .eq("user_id", userId)
        .eq("day", today)
        .maybeSingle();
      const used = (row?.count as number) ?? 0;
      if (used >= MAX_PER_DAY) {
        return new Response(
          JSON.stringify({
            error: "Quota quotidien atteint",
            code: "DAILY_QUOTA_REACHED",
            limit: MAX_PER_DAY,
            used,
          }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }
    }

    // Analyse séquentielle (Promise.all garderait la latence basse mais favoriserait
    // les rate-limits du provider ; on reste séquentiel pour les batchs > 1).
    const results: Scored[] = [];
    for (const url of capped) {
      // Stop net si quota explosé en cours de batch.
      const newCount: number = await admin
        .rpc("increment_photo_analysis_quota", { _user_id: userId })
        .then(({ data }) => (data as number) ?? 0)
        .catch(() => 0);
      if (newCount > MAX_PER_DAY) break;
      try {
        const r = await analyzeOne(url, LOVABLE_API_KEY);
        if (r) results.push(r);
      } catch (e) {
        if (e instanceof Response && (e.status === 429 || e.status === 402)) {
          return new Response(
            JSON.stringify({
              error:
                e.status === 429
                  ? "Trop de requêtes IA, réessayez dans un instant."
                  : "Crédits IA épuisés.",
              code: e.status === 429 ? "AI_RATE_LIMITED" : "AI_OUT_OF_CREDITS",
            }),
            { status: e.status, headers: { ...corsHeaders, "Content-Type": "application/json" } },
          );
        }
        // erreurs unitaires : on continue
      }
    }

    // Mode legacy : si l'appel est mono-image, on renvoie l'objet à plat.
    if (single && !many) {
      const r = results[0];
      if (!r) {
        return new Response(JSON.stringify({ error: "Analyse indisponible" }), {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      return new Response(JSON.stringify(r), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(
      JSON.stringify({
        results,
        analyzed: results.length,
        requested: requested.length,
        ignored,
        cap: MAX_PER_CALL,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (e) {
    console.error("analyze-photo-quality error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Erreur inconnue" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
