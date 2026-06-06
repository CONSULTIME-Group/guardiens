// Helper partagé pour les appels Lovable AI Gateway depuis les edge functions.
// Centralise gestion d'erreurs 429/402 et entête API key.

export const AI_GATEWAY_URL = "https://ai.gateway.lovable.dev/v1/chat/completions";

export type GatewayCallOptions = {
  model?: string;
  messages: Array<{ role: "system" | "user" | "assistant"; content: unknown }>;
  tools?: unknown[];
  tool_choice?: unknown;
  temperature?: number;
};

export type GatewayResult =
  | { ok: true; data: any }
  | { ok: false; status: number; error: string; code?: string };

export async function callLovableAI(opts: GatewayCallOptions): Promise<GatewayResult> {
  const key = Deno.env.get("LOVABLE_API_KEY");
  if (!key) return { ok: false, status: 500, error: "LOVABLE_API_KEY manquant" };

  const response = await fetch(AI_GATEWAY_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: opts.model ?? "google/gemini-2.5-flash",
      messages: opts.messages,
      ...(opts.tools ? { tools: opts.tools } : {}),
      ...(opts.tool_choice ? { tool_choice: opts.tool_choice } : {}),
      ...(opts.temperature !== undefined ? { temperature: opts.temperature } : {}),
    }),
  });

  if (response.status === 429) {
    return { ok: false, status: 429, code: "AI_RATE_LIMITED", error: "Trop de requêtes IA, réessayez dans un instant." };
  }
  if (response.status === 402) {
    return { ok: false, status: 402, code: "AI_OUT_OF_CREDITS", error: "Crédits IA épuisés." };
  }
  if (!response.ok) {
    const t = await response.text().catch(() => "");
    console.error("AI gateway error", response.status, t);
    return { ok: false, status: response.status, error: "Erreur fournisseur IA" };
  }

  const data = await response.json();
  return { ok: true, data };
}

export function extractToolArgs(data: any): any | null {
  const tc = data?.choices?.[0]?.message?.tool_calls?.[0];
  if (!tc) return null;
  try {
    return JSON.parse(tc.function.arguments);
  } catch {
    return null;
  }
}

export const STYLE_GUARDRAILS = `Règles éditoriales strictes (à respecter sans exception) :
- Vouvoiement obligatoire. Jamais de tutoiement.
- Ton factuel, chaleureux, sans superlatifs commerciaux.
- INTERDIT : les mots « voisin », « voisine », « voisins », « voisinage ». Remplacez par « gardien », « personne de confiance », « membre du coin », « proche ».
- INTERDIT : mention de région (« AURA », « Auvergne-Rhône-Alpes »).
- INTERDIT : caractère tiret cadratin « — » (U+2014). Utilisez virgule, deux-points, parenthèses, point ou tiret demi-cadratin « – ».
- Pas d'emoji, pas d'icônes décoratives, pas de hashtags.
- Pas de coordonnées de contact (téléphone, email, adresse postale, réseaux sociaux).
- Pas d'incitation à sortir de la plateforme pour transiger.`;

export const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};
