/**
 * Lot A3 (audit Alma du 14/10/2026) : consommation d'un tour d'Alma,
 * journalisée dans alma_conversations.classification.usage.
 *
 * Le gateway répond au format OpenAI : `usage.prompt_tokens` et
 * `usage.completion_tokens` (lus aussi par refresh-articles-post-pivot).
 * `input_tokens` et `output_tokens` sont acceptés en secours. Un champ absent
 * reste null : aucun chiffre n'est estimé.
 */

export interface AlmaTurnUsage {
  /** Appels au modèle pendant le tour, relance de relecture comprise. */
  model_calls: number;
  /** Somme des jetons d'entrée renvoyés par le gateway, null si jamais fournis. */
  input_tokens: number | null;
  /** Somme des jetons de sortie renvoyés par le gateway, null si jamais fournis. */
  output_tokens: number | null;
}

export function emptyAlmaUsage(): AlmaTurnUsage {
  return { model_calls: 0, input_tokens: null, output_tokens: null };
}

function tokenCount(v: unknown): number | null {
  return typeof v === "number" && Number.isFinite(v) && v >= 0 ? Math.round(v) : null;
}

/** Jetons d'une réponse du gateway, null quand le champ manque. */
export function readGatewayUsage(data: unknown): { input: number | null; output: number | null } {
  const u = (data as { usage?: Record<string, unknown> } | null | undefined)?.usage;
  if (!u || typeof u !== "object") return { input: null, output: null };
  return {
    input: tokenCount(u.prompt_tokens ?? u.input_tokens),
    output: tokenCount(u.completion_tokens ?? u.output_tokens),
  };
}

/** Ajoute un appel au modèle (réussi ou non) au compte du tour. */
export function recordModelCall(
  usage: AlmaTurnUsage,
  result: { ok: boolean; data?: unknown },
): AlmaTurnUsage {
  usage.model_calls += 1;
  if (!result.ok) return usage;
  const { input, output } = readGatewayUsage(result.data);
  if (input !== null) usage.input_tokens = (usage.input_tokens ?? 0) + input;
  if (output !== null) usage.output_tokens = (usage.output_tokens ?? 0) + output;
  return usage;
}
