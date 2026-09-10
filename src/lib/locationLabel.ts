/**
 * Libellé de localisation d'une carte d'annonce : « VILLE, DÉPARTEMENT ».
 *
 * Règles de repli, volontairement strictes :
 * - département inconnu ou absent : la ville seule, jamais de virgule orpheline
 * - ville absente : le département seul
 * - les deux absents : chaîne vide, l'appelant choisit son propre repli
 *
 * Le nom de département vient de `departements.nom` (jamais `nom_region`,
 * qui rend « Outre-mer » pour la Polynésie française).
 */
export const formatCityDepartement = (
  city: string | null | undefined,
  departementName: string | null | undefined,
): string => {
  const c = typeof city === "string" ? city.trim() : "";
  const d = typeof departementName === "string" ? departementName.trim() : "";
  if (c && d) return `${c}, ${d}`;
  return c || d || "";
};

/**
 * Résout le nom de département depuis la table `departements` chargée en Map,
 * en tolérant les codes numériques non normalisés (9 pour 09).
 */
export const departementNameFromCode = (
  code: string | null | undefined,
  names: Map<string, string> | null | undefined,
): string | null => {
  if (!code || !names) return null;
  const raw = String(code).trim();
  if (!raw) return null;
  return names.get(raw) ?? names.get(raw.padStart(2, "0")) ?? null;
};
