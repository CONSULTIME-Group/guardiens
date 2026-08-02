/**
 * Source de vérité unique des règles de publication d'une annonce de garde.
 *
 * Consommée par `src/pages/CreateSit.tsx`, `src/components/sits/owner/DraftChecklist.tsx`,
 * `src/components/sits/views/OwnerSitView.tsx` et `src/hooks/useAccessLevel.ts`.
 * Aucune de ces sources ne doit porter sa propre règle.
 *
 * Doctrine retenue :
 *  - aucun seuil de pourcentage de complétion de profil (non actionnable),
 *    remplacé par ses composantes concrètes : logement décrit, une photo, un animal ;
 *  - descriptions rétrocompatibles : deux sous-champs de 30 caractères minimum
 *    quand le séparateur est présent, sinon un bloc unique de 50 caractères minimum ;
 *  - date de début ET date de fin toujours exigées, la case dates flexibles
 *    enrichit l'annonce mais ne dispense jamais de dates ;
 *  - photos comptées sur la galerie du profil ET sur les photos du logement ;
 *  - identité vérifiée non bloquante.
 */

export const MIN_SUB_DESCRIPTION = 30;
export const MIN_SINGLE_DESCRIPTION = 50;
export const EXPECTATIONS_SEPARATOR = "\n\n";

export type PublishBlocker = {
  id: string;
  /** Libellé utilisateur, affichable tel quel. */
  label: string;
  /** Ancre DOM à faire défiler dans le formulaire de création. */
  anchor?: string;
  /** Route de correction quand l'élément se règle ailleurs. */
  action?: string;
};

export interface SitPublishInput {
  title?: string | null;
  startDate?: string | null;
  endDate?: string | null;
  flexibleDates?: boolean | null;
  /** Erreur de cohérence des dates déjà calculée par le formulaire. */
  dateError?: string | null;
  /** Descriptions séparées, prioritaires si fournies. */
  absenceReason?: string | null;
  sitterExpectations?: string | null;
  /** Texte concaténé (colonne `specific_expectations`), utilisé en repli. */
  specificExpectations?: string | null;
  /** Logement renseigné sur le profil propriétaire. */
  hasProperty?: boolean | null;
  /** Photos de la galerie du profil. */
  galleryPhotoCount?: number | null;
  /** Photos du logement (`properties.photos`). */
  propertyPhotoCount?: number | null;
  /** Photo de couverture choisie sur l'annonce. */
  hasCoverPhoto?: boolean | null;
  /** Animaux enregistrés sur le profil propriétaire. */
  petCount?: number | null;
}

/** Répartit un texte concaténé sur les deux sous-champs de description. */
export const splitExpectations = (raw?: string | null) => {
  const text = raw || "";
  const idx = text.indexOf(EXPECTATIONS_SEPARATOR);
  return {
    absenceReason: idx >= 0 ? text.slice(0, idx) : text,
    sitterExpectations: idx >= 0 ? text.slice(idx + EXPECTATIONS_SEPARATOR.length) : "",
  };
};

export const joinExpectations = (a: string, b: string) =>
  [a.trim(), b.trim()].filter(Boolean).join(EXPECTATIONS_SEPARATOR);

const len = (v?: string | null) => (v || "").trim().length;

/**
 * Renvoie la liste ordonnée des éléments manquants pour publier.
 * Liste vide, la publication est possible.
 */
export const getSitPublishBlockers = (input: SitPublishInput): PublishBlocker[] => {
  const fallback = splitExpectations(input.specificExpectations);
  const reason = input.absenceReason ?? fallback.absenceReason;
  const expectations = input.sitterExpectations ?? fallback.sitterExpectations;

  const hasDates = Boolean(input.flexibleDates) || Boolean(input.startDate && input.endDate);
  const photoCount =
    (input.galleryPhotoCount || 0) + (input.propertyPhotoCount || 0) + (input.hasCoverPhoto ? 1 : 0);

  const blockers: (PublishBlocker | null)[] = [
    !input.hasProperty
      ? { id: "property", label: "Logement décrit sur votre profil", action: "/owner-profile" }
      : null,
    !len(input.title)
      ? { id: "title", label: "Titre de l'annonce", anchor: "title-field" }
      : null,
    !hasDates
      ? {
          id: "dates",
          label: "Dates de garde, ou case dates flexibles cochée",
          anchor: "dates-field",
        }
      : null,
    input.dateError ? { id: "date-error", label: input.dateError, anchor: "dates-field" } : null,
    len(reason) < MIN_SUB_DESCRIPTION
      ? {
          id: "desc-reason",
          label: `Raison de votre besoin de garde (${MIN_SUB_DESCRIPTION} caractères minimum, actuellement ${len(reason)})`,
          anchor: "description-field",
        }
      : null,
    len(expectations) < MIN_SUB_DESCRIPTION
      ? {
          id: "desc-expectations",
          label: `Attentes envers le gardien (${MIN_SUB_DESCRIPTION} caractères minimum, actuellement ${len(expectations)})`,
          anchor: "description-field",
        }
      : null,
    photoCount === 0
      ? {
          id: "photo",
          label: "Au moins une photo de votre logement ou de votre galerie",
          action: "/owner-profile",
        }
      : null,
    (input.petCount || 0) === 0
      ? { id: "pets", label: "Au moins un animal à faire garder", anchor: "pets-field" }
      : null,
  ];

  return blockers.filter(Boolean) as PublishBlocker[];
};

export const canPublishSit = (input: SitPublishInput): boolean =>
  getSitPublishBlockers(input).length === 0;

/** Libellés affichables de tous les prérequis, dans l'ordre de la checklist. */
export const SIT_PUBLISH_REQUIREMENTS: { id: string; label: string }[] = [
  { id: "property", label: "Logement décrit sur votre profil" },
  { id: "title", label: "Titre de l'annonce" },
  { id: "dates", label: "Dates de garde, ou case dates flexibles cochée" },
  { id: "desc-reason", label: `Raison de votre besoin de garde (${MIN_SUB_DESCRIPTION} caractères minimum)` },
  { id: "desc-expectations", label: `Attentes envers le gardien (${MIN_SUB_DESCRIPTION} caractères minimum)` },
  { id: "photo", label: "Au moins une photo de votre logement ou de votre galerie" },
  { id: "pets", label: "Au moins un animal à faire garder" },
];
