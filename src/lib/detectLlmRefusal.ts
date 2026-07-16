/**
 * Détection d'un refus / dégénérescence LLM inséré comme message utilisateur.
 * Utilisé côté client (avant envoi de candidature ou message) pour bloquer
 * la publication d'un texte du type
 *   "Je suis désolée, mais je ne peux pas rédiger de lettre..."
 * qui a été historiquement collé dans la messagerie et les candidatures.
 *
 * Aligné sur les patterns de l'edge function `draft-application-letter`.
 */

const REFUSAL_PATTERNS: RegExp[] = [
  /je ne peux pas (rédiger|écrire|produire|générer)/i,
  /je suis (désolée?|navrée?),? mais/i,
  /je suis incapable de/i,
  /je ne suis pas en mesure de/i,
  /informations? (sur (l'|la|le) [\wéèêà']+ )?(sont|est) manquantes?/i,
  /(pourrais|pourriez|peux)-(tu|vous) me fournir/i,
  /pourrais-tu me fournir les détails/i,
  /je n'ai pas (assez )?(d'|de )?(éléments|informations|détails|contexte)/i,
  /impossible de rédiger/i,
];

export function isLlmRefusal(text: string | null | undefined): boolean {
  const t = (text || "").trim();
  if (!t) return false;
  return REFUSAL_PATTERNS.some((re) => re.test(t));
}
