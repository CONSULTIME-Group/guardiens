/**
 * Rapprochement conservateur entre un nom de race déclaré (saisie libre dans
 * une fiche animal) et les fiches éditoriales `breed_profiles`.
 *
 * Règles, dans l'ordre :
 * 1. Normalisation partagée des deux côtés (`normalizeBreedName`) : minuscules,
 *    accents retirés, espaces de bordure retirés, espaces multiples réduits.
 *    La clé de comparaison neutralise en plus le singulier et le féminin mot
 *    par mot (« européenne » et « européen » partagent la même clé).
 * 2. Correspondance exacte sur la clé normalisée, dans la même espèce.
 * 3. Alias explicites (`BREED_ALIASES`) pour les variantes réelles que la
 *    seule normalisation ne résout pas (« gouttière » → « européen »).
 *    Si la fiche cible d'un alias n'existe pas, aucun lien n'est affiché.
 * 4. Une saisie préfixée par « croisé » ou « x » retombe sur la fiche de la
 *    race citée (« croisé labrador » → « labrador retriever »), sauf si la
 *    race citée est ambiguë (« x berger » ne matche rien).
 * 5. Préfixe bidirectionnel à frontière de mot : le nom déclaré est un
 *    préfixe du nom de fiche (« labrador » → « labrador retriever ») ou
 *    l'inverse (« européen poils courts » → « européen »). Les clés de moins
 *    de 5 caractères côté court sont exclues du préfixe.
 * 6. Ambiguïté → aucun lien : si les candidats mènent à des fiches
 *    différentes, on préfère ne rien afficher. Un lien vers la mauvaise race
 *    est pire que pas de lien.
 *
 * GARDE-FOU ABSOLU : aucune correspondance approximative. Pas de distance de
 * Levenshtein, pas de « ça ressemble à ». Normalisation exacte et alias
 * explicites uniquement.
 *
 * Les slugs d'URL des fiches existantes ne changent jamais : ce sont les
 * saisies utilisateur qu'on normalise avant comparaison.
 */
import { normalizeStrict } from "./normalize";
import { mergedBreedTarget } from "./breedFicheMerges";

export interface BreedFicheCandidate {
  species: string;
  breed: string;
}

/**
 * Normalisation partagée des noms de race, appliquée aux saisies libres
 * comme aux noms de fiches : minuscules, accents et ligatures retirés,
 * espaces de bordure retirés, espaces multiples réduits à un seul.
 */
export const normalizeBreedName = (raw: string): string =>
  normalizeStrict(raw).replace(/\s+/g, " ");

/** Clé de comparaison normalisée (singulier et féminin neutralisés). */
export const breedFicheKey = (raw: string): string =>
  normalizeBreedName(raw)
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .split("-")
    .map((w) => {
      if (w.endsWith("enne")) return `${w.slice(0, -4)}en`;
      if (w.endsWith("euse")) return `${w.slice(0, -4)}eux`;
      if (w.endsWith("ette")) return `${w.slice(0, -4)}et`;
      if (w.length > 3 && w.endsWith("s") && !w.endsWith("ss")) return w.slice(0, -1);
      return w;
    })
    .join("-");

/**
 * Alias explicites, construits à partir des saisies réellement observées en
 * base. Clé : breedFicheKey de la saisie déclarée. Valeur : nom officiel de
 * la fiche cible. Un alias dont la fiche cible n'existe pas ne produit
 * aucun lien.
 */
const BREED_ALIASES: Record<string, Record<string, string>> = {
  cat: {
    // « Gouttière », « goutière » (faute réelle, un seul t), « chat de
    // gouttière » : le chat de gouttière n'est pas une race, la fiche de
    // référence est l'européen.
    gouttiere: "européen",
    goutiere: "européen",
    "chat-de-gouttiere": "européen",
    // « Chat » seul : même renvoi vers la fiche du chat européen.
    chat: "européen",
    // « Européenne black smoke » : robe de l'européen, pas une race.
    "europeen-black-smoke": "européen",
    // Faute de frappe fréquente.
    charteux: "chartreux",
  },
  dog: {
    // Fautes et abréviations observées en base.
    yorshire: "yorkshire terrier",
    rotweiler: "rottweiler",
    staf: "staffordshire bull terrier",
    // « Amstaff » : abréviation courante de l'AMERICAN staffordshire
    // terrier, dont la fiche existe. À ne pas confondre avec « staf »
    // (une f) qui désigne le staffordshire bull terrier.
    amstaff: "american staffordshire terrier",
    westie: "west highland white terrier",
    border: "border collie",
    golden: "golden retriever",
    "american-stafford-terrier": "american staffordshire terrier",
    // « Staff » (deux f) : abréviation courante de l'american staffordshire
    // terrier. À ne pas confondre avec « staf » (une f) qui désigne le
    // staffordshire bull terrier.
    staff: "american staffordshire terrier",
    roumain: "berger roumain",
    // Coquille réelle : la race s'écrit Jack Russell (deux l). La fiche
    // absorbée « jack russel » redirige vers la fiche canonique.
    "jack-russel": "jack russell",
  },
  bird: {
    // « Gris du Gabon » seul : le nom courant du perroquet gris du gabon.
    "gri-du-gabon": "perroquet gris du gabon",
  },
};

/** Préfixe strict à frontière de mot : « labrador » est préfixe de
 *  « labrador-retriever », mais « chat » n'est pas préfixe de « chartreux ». */
const isWordPrefix = (short: string, long: string): boolean =>
  long.startsWith(`${short}-`);

/** Sous cette longueur, le côté court d'un préfixe est trop flou pour être sûr. */
const MIN_PREFIX_KEY_LENGTH = 5;

/** « croisé … » / « x … » : la fiche visée est celle de la race citée. */
const CROISE_PREFIX = /^(croise|x)-/;

/** Retourne le candidat uniquement si tous mènent à la même fiche. */
const uniqueMatch = <T extends BreedFicheCandidate>(
  matches: { candidate: T; key: string }[],
): T | null => {
  const slugs = new Set(matches.map((m) => m.candidate.breed.toLowerCase()));
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
  const scoped = candidates
    .filter((c) => c.species === species)
    .map((candidate) => ({ candidate, key: breedFicheKey(candidate.breed) }));

  /** Exact puis alias. L'alias ne vaut que si sa fiche cible existe. */
  const exactOrAlias = (key: string): T | null => {
    if (key.length < 2) return null;
    const exact = scoped.filter((x) => x.key === key);
    if (exact.length > 0) return uniqueMatch(exact);
    const aliasTarget = BREED_ALIASES[species]?.[key];
    if (!aliasTarget) return null;
    const targetKey = breedFicheKey(aliasTarget);
    const aliased = scoped.filter((x) => x.key === targetKey);
    return aliased.length > 0 ? aliased[0].candidate : null;
  };

  const prefixMatch = (key: string): T | null => {
    if (key.length < MIN_PREFIX_KEY_LENGTH) return null;
    const prefix = scoped.filter(
      (x) =>
        x.key.length >= MIN_PREFIX_KEY_LENGTH &&
        (isWordPrefix(key, x.key) || isWordPrefix(x.key, key)),
    );
    return prefix.length > 0 ? uniqueMatch(prefix) : null;
  };

  const key = breedFicheKey(declaredBreed);
  if (key.length < 2) return null;

  // Fiches fusionnées (doublons éditoriaux) : une correspondance sur la
  // fiche absorbée (« jack russel ») renvoie la fiche conservée
  // (« jack russell ») quand elle existe dans les candidats.
  const withMerge = (candidate: T | null): T | null => {
    if (!candidate) return null;
    const target = mergedBreedTarget(candidate.species, candidate.breed);
    if (!target) return candidate;
    const targetKey = breedFicheKey(target);
    const hit = scoped.find((x) => x.key === targetKey);
    return hit ? hit.candidate : candidate;
  };

  // 1. Exact puis alias sur la saisie complète (« croisé bichon » est une
  //    fiche exacte, elle prime sur la règle du croisement).
  const direct = exactOrAlias(key);
  if (direct) return withMerge(direct);

  // 2. « croisé X » / « x X » retombent sur la fiche de la race citée.
  const stripped = key.replace(CROISE_PREFIX, "");
  if (stripped !== key && stripped.length >= 2) {
    const fromStripped = exactOrAlias(stripped) ?? prefixMatch(stripped);
    if (fromStripped) return withMerge(fromStripped);
  }

  // 3. Préfixe conservateur à frontière de mot.
  return withMerge(prefixMatch(key));
};

/**
 * slugifyBreedName — « Berger Australien » → « berger-australien ».
 * Source unique du slug de fiche race (utilisée pour construire les
 * URLs /races/{espèce}-{slug}). Même règle partout : minuscules sans
 * accents, tout caractère non alphanumérique devient un tiret simple.
 */
export const slugifyBreedName = (raw: string): string =>
  raw
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
