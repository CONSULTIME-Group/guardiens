/**
 * Ligne de gratuité sous le bouton « Publier mon annonce de garde » des guides
 * propriétaires (lot SEO1, 19/10/2026).
 *
 * Doctrine X3c et Y3 : « Guardiens est gratuit », dit simplement, sans durée.
 * Exception décidée par Jérémie le 17/10/2026 : les quatre refontes expatriés,
 * La Réunion, Tahiti et Nouvelle-Calédonie gardent leur engagement de gratuité
 * actuelle (participation possible au plus tôt au second semestre 2027, avec
 * 30 jours de préavis, écrit dans leur texte en base).
 */

/**
 * Slugs dont l'engagement tarifaire daté reste tel quel (décision du
 * 17/10/2026). Mêmes valeurs que EXPAT_, REUNION_, TAHITI_ et
 * CALEDONIE_OWNER_ARTICLE_SLUG de ArticleRenderer.tsx (parité verrouillée par
 * src/__tests__/seo1/), écrites ici pour ne pas charger le rendu d'article.
 */
export const DATED_PRICING_COMMITMENT_SLUGS: ReadonlySet<string> = new Set([
  "expat-proprietaire-faire-garder-maison-etranger",
  "garde-kaz-house-sitting-la-reunion",
  "garde-maison-animaux-tahiti",
  "garde-maison-animaux-nouvelle-caledonie",
]);

export const FREE_LINE = "Guardiens est gratuit.";
export const DATED_FREE_LINE = "Plateforme actuellement 100 % gratuite.";

export function ownerGuideFreeLine(slug: string): string {
  return DATED_PRICING_COMMITMENT_SLUGS.has(slug) ? DATED_FREE_LINE : FREE_LINE;
}
