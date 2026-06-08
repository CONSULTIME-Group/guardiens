/**
 * Source unique de vérité pour les auteurs Guardiens.
 * Utilisé par : /auteurs/:slug, bloc bio en pied d'article, Schema.org Person.
 *
 * Note : on n'expose volontairement que le prénom (pas de nom de famille
 * en H1, breadcrumb ou Schema.org).
 */
import jeremiePhoto from "@/assets/auteur-jeremie.jpg";
import elisaPhoto from "@/assets/auteur-elisa.jpg";

export interface Author {
  /** Slug de la page : /auteurs/{slug} */
  slug: string;
  /** Prénom seul, affiché en H1 et dans Schema.org */
  firstName: string;
  /** Bio courte affichée sur la page auteur ET en pied d'article */
  shortBio: string;
  /** Bio plus longue affichée uniquement sur la page auteur */
  longBio: string;
  /** Chemin de la photo (importée) */
  photo: string;
  /** Toutes les variantes orthographiques du champ articles.author_name
   *  qui doivent être attribuées à cet auteur */
  authorNameVariants: string[];
  /** URLs publiques de l'auteur (LinkedIn, X, site perso…) pour Schema.org `sameAs`.
   *  Renforce l'E-E-A-T signalé aux moteurs et aux LLM. */
  sameAs?: string[];

export const AUTHORS: Author[] = [
  {
    slug: "jeremie",
    firstName: "Jérémie",
    shortBio:
      "Co-fondateur de Guardiens. 5 ans de house-sitting personnel avec Elisa. 37 maisons gardées, 234 animaux accompagnés en France.",
    longBio:
      "Co-fondateur de Guardiens. 5 ans de house-sitting personnel avec Elisa. 37 maisons gardées, 234 animaux accompagnés partout en France. Écrit sur le terrain, pas depuis un bureau.",
    photo: jeremiePhoto,
    authorNameVariants: [
      "Jérémie",
      "Jérémie Martinot",
    ],
  },
  {
    slug: "elisa",
    firstName: "Elisa",
    shortBio:
      "Co-fondatrice de Guardiens. 5 ans de house-sitting à deux avec Jérémie. Sensibilité particulière à l'expérience humaine et à l'attention portée aux animaux.",
    longBio:
      "Co-fondatrice de Guardiens. 5 ans de house-sitting à deux avec Jérémie. Sensibilité particulière à l'expérience humaine et à l'attention portée aux animaux. Veille à ce que chaque garde soit une rencontre, pas seulement un service.",
    photo: elisaPhoto,
    authorNameVariants: [
      "Elisa",
      "Élisa C.",
      "Elisa C.",
      "Elisa, co-fondatrice de Guardiens",
    ],
  },
];

/** Variantes d'`author_name` correspondant à un article cosigné Jérémie + Elisa. */
export const COSIGNED_AUTHOR_VARIANTS = [
  "Jérémie & Elisa",
  "Elisa & Jérémie",
  "Elisa & Jérémie, fondateurs de Guardiens",
];

export function getAuthorBySlug(slug: string): Author | undefined {
  return AUTHORS.find((a) => a.slug === slug);
}

/**
 * Renvoie les auteurs associés à une valeur d'`author_name`.
 * - "Jérémie Martinot" → [Jérémie]
 * - "Jérémie & Elisa"  → [Jérémie, Elisa]
 * - "Guardiens" / "L'équipe Guardiens" → [] (article éditorial collectif)
 */
export function resolveAuthors(authorName: string | null | undefined): Author[] {
  if (!authorName) return [];
  if (COSIGNED_AUTHOR_VARIANTS.includes(authorName)) return AUTHORS;
  return AUTHORS.filter((a) => a.authorNameVariants.includes(authorName));
}

/**
 * Construit le filtre `or(...)` Supabase pour récupérer les articles
 * d'un auteur (toutes variantes orthographiques + cosignés).
 */
export function buildAuthorNameFilter(author: Author): string[] {
  return [...author.authorNameVariants, ...COSIGNED_AUTHOR_VARIANTS];
}
