import type { OwnerPriorityAction } from "@/hooks/useOwnerPriorityAction";

/**
 * Articles de conseil affichés dans le dashboard propriétaire, choisis
 * selon l'étape du parcours (variant de useOwnerPriorityAction, calculé
 * sans fetch dans OwnerDashboard).
 *
 * Garde-fou : src/__tests__/owner-stage-articles.test.ts vérifie que chaque
 * slug existe parmi les articles publiés (npm run test:data). Tout
 * renommage d'article en base doit être répercuté ici.
 */
export interface OwnerStageArticles {
  eyebrow: string;
  title: string;
  slugs: string[];
}

export const OWNER_STAGE_ARTICLES: Record<OwnerPriorityAction["variant"], OwnerStageArticles> = {
  publish: {
    eyebrow: "Avant de publier",
    title: "Ce qui fait une annonce à laquelle on répond.",
    slugs: [
      "rediger-bonne-annonce-house-sitting",
      "premiers-pas-sur-guardiens",
      "garder-une-maison-ce-n-est-pas-garder-un-animal",
    ],
  },
  stalled: {
    eyebrow: "Votre annonce",
    title: "Attirer les bons gardiens.",
    slugs: [
      "rediger-bonne-annonce-house-sitting",
      "choisir-gardien-bons-criteres",
      "s-absenter-avec-animal-guide-solutions-2026",
    ],
  },
  applications: {
    eyebrow: "Choisir",
    title: "Comment départager les candidatures.",
    slugs: [
      "choisir-gardien-bons-criteres",
      "confier-sa-maison-absence-risques",
      "accueillir-gardien-bonnes-pratiques",
    ],
  },
  "next-sit": {
    eyebrow: "Avant la garde",
    title: "Préparer la maison et les habitudes.",
    slugs: [
      "preparer-maison-avant-garde",
      "accueillir-gardien-bonnes-pratiques",
      "checklist-partir-vacances-animaux",
    ],
  },
  ongoing: {
    eyebrow: "Pendant la garde",
    title: "Si quelque chose ne se passe pas comme prévu.",
    slugs: [
      "gerer-imprevu-pendant-garde",
      "securiser-maison-absence-prolongee",
      "commodat-garde-guardiens",
    ],
  },
  review: {
    eyebrow: "Après la garde",
    title: "Pour que la prochaine soit encore plus simple.",
    slugs: [
      "accueillir-gardien-bonnes-pratiques",
      "vacances-longues-garde-animal-2-semaines",
      "securite-confiance-house-sitting",
    ],
  },
  verify: {
    eyebrow: "La confiance",
    title: "Ce qui rassure vraiment un gardien.",
    slugs: [
      "securite-confiance-house-sitting",
      "commodat-garde-guardiens",
      "confier-sa-maison-absence-risques",
    ],
  },
  pets: {
    eyebrow: "Vos animaux",
    title: "Bien décrire ceux dont on va s'occuper.",
    slugs: [
      "bien-etre-animal-pendant-absence",
      "gerer-animaux-difficiles-garde",
      "preparer-maison-avant-garde",
    ],
  },
  explore: {
    eyebrow: "Pour aller plus loin",
    title: "Trois lectures utiles.",
    slugs: [
      "comment-fonctionne-guardiens-et-le-house-sitting-entre-particuliers",
      "house-sitting-vs-pension-comparatif",
      "petites-missions-entraide-guardiens",
    ],
  },
};
