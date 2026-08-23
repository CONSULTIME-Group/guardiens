/**
 * Rapprochement code postal / code département, règle STRICTEMENT identique
 * à la fonction SQL recalc_seo_city_page_counts (corrigée le 23/08/2026) :
 *
 *  - le code département d'un profil se déduit de son code postal : les 3
 *    premiers caractères si le code postal commence par 97 ou 98 (DOM), les
 *    2 premiers sinon ;
 *  - un code postal absent ou vide ne produit aucun code : le profil est
 *    CONSERVÉ (286 gardiens sont dans ce cas, les exclure les ferait
 *    disparaître à tort) ;
 *  - tolérance Corse : un code postal 20xxx correspond aux départements 2A
 *    et 2B ;
 *  - si la page n'a pas de code département résolu, aucun profil n'est
 *    exclu (repli identique au SQL : d.code IS NULL).
 *
 * Cette tolérance est volontaire et partagée par le badge de comptage
 * (sitter_count en base) et la grille de gardiens, pour que les deux
 * affichent toujours des nombres cohérents entre eux.
 */
export function departmentCodeFromPostal(
  postal: string | null | undefined,
): string | null {
  const p = (postal ?? "").trim();
  if (p === "") return null;
  if (p.startsWith("97") || p.startsWith("98")) return p.slice(0, 3);
  return p.slice(0, 2);
}

export function postalMatchesDepartment(
  postal: string | null | undefined,
  departmentCode: string | null | undefined,
): boolean {
  const dcode = departmentCodeFromPostal(postal);
  const page = (departmentCode ?? "").trim().toUpperCase();
  if (dcode === null || page === "") return true;
  if (dcode === page) return true;
  if (dcode === "20" && (page === "2A" || page === "2B")) return true;
  return false;
}
