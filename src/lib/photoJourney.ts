/**
 * Parcours photo guidé du propriétaire (décision produit du 12/08/2026).
 *
 * Doctrine :
 *  - cinq écrans, une photo par écran, chacun avec son texte de « pourquoi » ;
 *  - strictement facultatif : aucun écran ne conditionne la publication d'une
 *   annonce. Les règles de `sitPublishRules.ts` ne sont pas touchées ;
 *  - chaque photo rejoint la galerie du propriétaire (source unique lue par les
 *    annonces et les pages publiques) ET la colonne `properties.photos`, qui
 *    était restée vide sur les 85 logements en base ;
 *  - ton des écrans : tutoiement, direct, sans emoji.
 */

export type PhotoJourneyStepId =
  | "exterior"
  | "living"
  | "bedroom"
  | "pets"
  | "surroundings";

export type OwnerGalleryCategory =
  | "home_life"
  | "animals_life"
  | "garden"
  | "neighborhood"
  | "seasonal";

export interface PhotoJourneyStep {
  id: PhotoJourneyStepId;
  /** Titre de l'écran. */
  title: string;
  /** Texte de « pourquoi », affiché sous le titre. */
  why: string;
  /** Aide courte sur le cadrage attendu. */
  hint: string;
  /** Catégorie de galerie attribuée à la photo de cet écran. */
  category: OwnerGalleryCategory;
  /** Légende pré-remplie de la photo. */
  caption: string;
  /** Écran sauté d'office si le propriétaire n'a aucun animal enregistré. */
  requiresPets?: boolean;
}

export const PHOTO_JOURNEY_INTRO =
  "On vient prendre soin de vos animaux. On vient aussi vivre chez vous quelques jours, comme vous y vivez. Quelqu'un qui voit votre maison, votre quartier et vos habitudes sait s'il s'y sent bien. C'est comme ça que vous recevez des candidatures qui vous ressemblent, au lieu de candidatures au hasard.";

export const PHOTO_JOURNEY_STEPS: PhotoJourneyStep[] = [
  {
    id: "exterior",
    title: "La maison vue de l'extérieur",
    why: "C'est la première chose qu'on cherche quand on imagine y vivre.",
    hint: "Recule de quelques pas, prends la façade en entier.",
    category: "home_life",
    caption: "La maison vue de l'extérieur",
  },
  {
    id: "living",
    title: "Une pièce de vie",
    why: "Le salon, la cuisine, là où la personne passera ses soirées.",
    hint: "Ouvre les rideaux, photographie depuis l'angle de la pièce.",
    category: "home_life",
    caption: "Une pièce de vie",
  },
  {
    id: "bedroom",
    title: "La chambre",
    why: "Elle dort chez vous, elle veut savoir où.",
    hint: "Le lit fait, la lumière du jour, rien à ranger d'autre.",
    category: "home_life",
    caption: "La chambre",
  },
  {
    id: "pets",
    title: "Vos animaux",
    why: "Ce sont eux qu'on vient retrouver.",
    hint: "Une photo récente, au niveau de leurs yeux.",
    category: "animals_life",
    caption: "Vos animaux",
    requiresPets: true,
  },
  {
    id: "surroundings",
    title: "Les environs",
    why: "Le village, le chemin, la vue. On vient aussi pour ça.",
    hint: "Ce que tu montrerais en premier à quelqu'un qui arrive.",
    category: "neighborhood",
    caption: "Les environs",
  },
];

/** Écrans réellement présentés, selon que le propriétaire a des animaux ou non. */
export function getPhotoJourneySteps(hasPets: boolean): PhotoJourneyStep[] {
  return PHOTO_JOURNEY_STEPS.filter((s) => (s.requiresPets ? hasPets : true));
}

/** Progression affichée, bornée aux écrans présentés. */
export function photoJourneyProgress(index: number, total: number): number {
  if (total <= 0) return 0;
  const clamped = Math.min(Math.max(index, 0), total);
  return Math.round((clamped / total) * 100);
}
