/**
 * Règle unique d'indexabilité d'une fiche pro animalier.
 *
 * Utilisée des deux côtés :
 *  - scripts/generate-sitemap.mjs (exclusion du sitemap)
 *  - src/pages/ProDetail.tsx (meta robots noindex, nofollow)
 *
 * L'annuaire est en bêta et contient des fiches de démonstration destinées
 * à illustrer le produit. Elles restent visibles côté produit, mais ne
 * doivent jamais être soumises au crawl : coordonnées fictives, tarifs
 * fictifs, mention explicite de démo.
 *
 * La détection est automatique, sans liste à maintenir :
 *   - slug préfixé `demo-` ;
 *   - raison sociale marquée « démo » ou « demo » ;
 *   - champ `is_demo` vrai si la colonne existe un jour en base.
 */

/** Préfixe de slug réservé aux fiches de démonstration. */
export const DEMO_SLUG_PREFIX = "demo-";

const DEMO_NAME_RE = /\(\s*d[ée]mo\s*\)/i;

/**
 * @param {{ slug?: string | null, raison_sociale?: string | null, is_demo?: boolean | null }} pro
 * @returns {boolean}
 */
export function isDemoPro(pro) {
  if (!pro) return false;
  if (pro.is_demo === true) return true;
  const slug = (pro.slug || "").toLowerCase();
  if (slug.startsWith(DEMO_SLUG_PREFIX)) return true;
  return DEMO_NAME_RE.test(pro.raison_sociale || "");
}

/**
 * Une fiche est indexable si elle est approuvée et n'est pas une démo.
 * @param {{ slug?: string | null, raison_sociale?: string | null, is_demo?: boolean | null, status?: string | null }} pro
 * @returns {boolean}
 */
export function isProIndexable(pro) {
  if (!pro) return false;
  if (pro.status !== "approved") return false;
  return !isDemoPro(pro);
}
