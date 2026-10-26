/**
 * Slug ASCII : minuscules, accents retirés, tout autre caractère en tiret.
 * Sert à rattraper une adresse saisie avec accents (« /departement/isère »).
 */
export function asciiSlug(input: string | null | undefined): string {
  return (input ?? "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/œ/g, "oe")
    .replace(/æ/g, "ae")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}
