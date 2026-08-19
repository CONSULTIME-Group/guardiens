/**
 * Rapprochement conservateur entre un nom de race déclaré (saisie libre dans
 * une fiche animal) et les fiches éditoriales `breed_profiles`.
 *
 * Règles, dans l'ordre :
 * 1. Normalisation des deux côtés : minuscules, accents retirés, espaces
 *    réduits (slugify), puis singulier et féminin neutralisés mot par mot
 *    (« européenne » et « européen » partagent la même clé).
 * 2. Correspondance exacte sur la clé normalisée, dans la même espèce.
 * 3. À défaut, préfixe bidirectionnel à frontière de mot : le nom déclaré
 *    est un préfixe du nom de fiche (« labrador » → « labrador retriever »)
 *    ou l'inverse (« européen poils courts » → « européen »). Les clés de
 *    moins de 5 caractères côté court sont exclues du préfixe (« chat » ne
 *    doit pas renvoyer vers « chat des forêts norvégiennes »).
 * 4. Ambiguïté → aucun lien : si les candidats mènent à des fiches
 *    différentes, on préfère ne rien afficher. Un lien vers la mauvaise race
 *    est pire que pas de lien.
 */
import { slugify } from "./normalize";

export interface BreedFicheCandidate {
  species: string;
  breed: string;
}

/** Clé de comparaison normalisée (singulier et féminin neutralisés). */
export const breedFicheKey = (raw: string): string =>
  slugify(raw)
    .split("-")
    .map((w) => {
      if (w.endsWith("enne")) return `${w.slice(0, -4)}en`;
      if (w.endsWith("euse")) return `${w.slice(0, -4)}eux`;
      if (w.endsWith("ette")) return `${w.slice(0, -4)}et`;
      if (w.length > 3 && w.endsWith("s") && !w.endsWith("ss")) return w.slice(0, -1);
      return w;
    })
    .join("-");

/** Préfixe strict à frontière de mot : « labrador » est préfixe de
 *  « labrador-retriever », mais « chat » n'est pas préfixe de « chartreux ». */
const isWordPrefix = (short: string, long: string): boolean =>
  long.startsWith(`${short}-`);

/** Sous cette longueur, le côté court d'un préfixe est trop flou pour être sûr. */
const MIN_PREFIX_KEY_LENGTH = 5;

/** Retourne le candidat uniquement si tous mènent à la même fiche. */
const uniqueMatch = <T extends BreedFicheCandidate>(
  matches: { candidate: T; key: string }[],
): T | null => {
  const slugs = new Set(matches.map((m) => slugify(m.candidate.breed)));
  return slugs.size === 1 ? matches[0].candidate : null;
};

/**
 * Résout la fiche éditoriale correspondant à un nom déclaré, ou null.
 * Le candidat retourné porte le nom officiel de la fiche : c'est lui qui doit
 * servir à construire le href `/races/{espèce}-{slugify(fiche)}`, aligné avec
 * la résolution de BreedPage.
 */
export const resolveBreedFiche = <T extends BreedFicheCandidate>(
  species: string,
  declaredBreed: string,
  candidates: T[],
): T | null => {
  const key = breedFicheKey(declaredBreed);
  if (key.length < 2) return null;
  const scoped = candidates
    .filter((c) => c.species === species)
    .map((candidate) => ({ candidate, key: breedFicheKey(candidate.breed) }));

  const exact = scoped.filter((x) => x.key === key);
  if (exact.length > 0) return uniqueMatch(exact);

  if (key.length < MIN_PREFIX_KEY_LENGTH) return null;
  const prefix = scoped.filter(
    (x) =>
      x.key.length >= MIN_PREFIX_KEY_LENGTH &&
      (isWordPrefix(key, x.key) || isWordPrefix(x.key, key)),
  );
  return prefix.length > 0 ? uniqueMatch(prefix) : null;
};
