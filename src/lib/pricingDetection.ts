/**
 * Détection d'une proposition tarifaire dans un texte libre.
 *
 * Miroir strict de la fonction SQL public.looks_like_pricing(text), utilisée par les
 * triggers BEFORE INSERT sur messages et applications. Toute évolution du motif doit
 * être répercutée des deux côtés.
 *
 * La détection est volontairement informative, jamais bloquante : un propriétaire peut
 * légitimement parler d'argent (courses, frais vétérinaires, carburant).
 */

const stripAccents = (txt: string): string =>
  txt.normalize("NFD").replace(/[\u0300-\u036f]/g, "");

const AMOUNT_BEFORE = /\d+([.,]\d+)?\s*(€|eur\b|euros?\b)/;
const AMOUNT_AFTER = /(€|eur\b|euros?\b)\s*\d+/;
const PRICING_WORDS = /(tarif|devis|facture|prestation payante|par jour|par nuit|par visite|par passage)/;

export function looksLikePricing(input: string | null | undefined): boolean {
  if (!input || !input.trim()) return false;
  const t = stripAccents(input).toLowerCase();
  if (AMOUNT_BEFORE.test(t)) return true;
  if (AMOUNT_AFTER.test(t)) return true;
  if (PRICING_WORDS.test(t) && /\d/.test(t)) return true;
  return false;
}

/** Un membre déclaré ou vérifié assume sa qualité de professionnel, aucune alerte. */
export function isUndeclaredPro(proStatus: string | null | undefined): boolean {
  return !proStatus || proStatus === "none";
}

/** Faut-il avertir l'auteur du texte saisi ? */
export function shouldWarnPricing(
  text: string | null | undefined,
  proStatus: string | null | undefined,
): boolean {
  return isUndeclaredPro(proStatus) && looksLikePricing(text);
}
