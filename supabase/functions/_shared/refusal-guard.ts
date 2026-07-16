// Détection partagée d'un refus / dégénérescence LLM à la sortie d'un appel
// Lovable AI Gateway. Aligné sur `public.is_llm_refusal_text` (Postgres) et
// `src/lib/detectLlmRefusal.ts` (client). Toute divergence est un bug.
//
// À utiliser dans TOUTES les edge functions qui produisent du texte destiné
// à finir en contenu utilisateur (annonce, message, avis, guide, bio…) :
// on ne laisse JAMAIS un "Je suis désolé, mais je ne peux pas rédiger…"
// se retrouver dans la base ou dans un email.

const REFUSAL_PATTERNS: RegExp[] = [
  /je ne peux pas (rédiger|écrire|produire|générer|vous aider)/i,
  /je suis (désolée?|navrée?),? mais/i,
  /je suis incapable de/i,
  /je ne suis pas en mesure de/i,
  /informations? (sur (l'|la |le )[a-zéèêà '']+ )?(sont|est) manquantes?/i,
  /(pourrais|pourriez|peux)-(tu|vous) me fournir/i,
  /pourrais-tu me fournir les détails/i,
  /je n'ai pas (assez )?(d'|de )?(éléments|informations|détails|contexte)/i,
  /impossible de rédiger/i,
];

export function isLlmRefusal(text: string | null | undefined, minLength = 60): boolean {
  const t = (text || "").trim();
  if (t.length < minLength) return true;
  return REFUSAL_PATTERNS.some((re) => re.test(t));
}

/**
 * Log analytics d'un fallback (best-effort — n'échoue jamais).
 * Utilise le service_role si dispo, sinon le client user passé en argument.
 */
export async function logRefusalFallback(
  client: { from: (t: string) => any },
  params: { user_id: string; surface: string; reason: string; extra?: Record<string, unknown> },
): Promise<void> {
  try {
    await client.from("analytics_events").insert({
      user_id: params.user_id,
      event_type: `${params.surface}_fallback`,
      metadata: {
        reason: params.reason,
        surface: params.surface,
        ...(params.extra ?? {}),
      },
    });
  } catch (e) {
    console.warn("logRefusalFallback failed", params.surface, e);
  }
}
