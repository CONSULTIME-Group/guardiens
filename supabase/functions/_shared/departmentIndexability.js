/**
 * Règle unique d'indexabilité d'une page département (lot SEO1, 19/10/2026).
 *
 * Partagée par :
 *  - supabase/functions/_shared/sitemap-data.js (sitemap du build et sitemap en direct)
 *  - src/pages/DepartmentPage.tsx (meta robots)
 *
 * Une page département entre dans l'index dès sa première ville publiée.
 * Avant, elle reste consultable et suivie en liens (noindex, follow).
 * « Ville publiée » suit la liste affichée sur la page : seo_city_pages
 * publiée, même département, slug hors pages de test (test-*).
 */

/** Une ligne seo_city_pages compte comme ville publiée de son département. */
export function isPublishedCityRow(row) {
  if (!row || row.published === false) return false;
  const slug = typeof row.slug === "string" ? row.slug : "";
  return slug.length > 0 && !slug.startsWith("test-");
}

/**
 * Ensemble des noms de département qui portent au moins une ville publiée.
 * @param {Array<{ department?: string | null, slug?: string | null, published?: boolean | null }>} cityRows
 * @returns {Set<string>}
 */
export function departmentsWithPublishedCity(cityRows) {
  const out = new Set();
  for (const row of cityRows || []) {
    if (isPublishedCityRow(row) && typeof row.department === "string" && row.department.length > 0) {
      out.add(row.department);
    }
  }
  return out;
}

/**
 * @param {{ noindex?: boolean | null } | null | undefined} page
 * @param {number} publishedCityCount
 * @returns {boolean}
 */
export function isDepartmentIndexable(page, publishedCityCount) {
  if (!page || page.noindex === true) return false;
  return Number(publishedCityCount) > 0;
}
