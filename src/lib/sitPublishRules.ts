/**
 * Source de vérité unique des règles de publication d'une annonce de garde.
 *
 * Consommée par `src/pages/CreateSit.tsx`, `src/pages/EditSit.tsx`,
 * `src/components/sits/views/OwnerSitView.tsx`, `src/components/sits/owner/DraftChecklist.tsx`
 * et `src/hooks/useAccessLevel.ts`. Aucune de ces sources ne doit porter sa propre règle.
 *
 * Doctrine retenue :
 *  - le mode de description est DÉCLARÉ par l'appelant, jamais deviné. Chercher
 *    un double saut de ligne dans un texte rédigé par un humain est faux : les
 *    gens sautent des lignes et signent leurs annonces ;
 *  - mode "two-fields" (formulaire à deux zones de saisie) : deux textes
 *    obligatoires, 30 caractères minimum chacun ;
 *  - mode "single-block" (une seule zone de saisie, texte concaténé) :
 *    50 caractères minimum au total, jamais de découpe ;
 *  - aucun seuil de pourcentage de complétion de profil (non actionnable),
 *    remplacé par ses composantes concrètes : logement décrit, une photo, un animal ;
 *  - date de début ET date de fin toujours exigées, la case dates flexibles
 *    enrichit l'annonce mais ne dispense jamais de dates ;
 *  - photos comptées sur la galerie du profil ET sur les photos du logement ;
 *  - identité vérifiée non bloquante.
 */

export const MIN_SUB_DESCRIPTION = 30;
export const MIN_SINGLE_DESCRIPTION = 50;
export const EXPECTATIONS_SEPARATOR = "\n\n";

/** Mode de saisie de la description, déclaré par l'appelant. */
export type DescriptionMode = "two-fields" | "single-block";

export type PublishBlocker = {
  id: string;
  /** Libellé utilisateur, affichable tel quel. */
  label: string;
  /** Ancre DOM à faire défiler dans le formulaire de création. */
  anchor?: string;
  /** Route de correction quand l'élément se règle ailleurs. */
  action?: string;
};

interface SitPublishBase {
  title?: string | null;
  startDate?: string | null;
  endDate?: string | null;
  flexibleDates?: boolean | null;
  /** Erreur de cohérence des dates déjà calculée par le formulaire. */
  dateError?: string | null;
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

export interface SitPublishTwoFieldsInput extends SitPublishBase {
  descriptionMode: "two-fields";
  absenceReason?: string | null;
  sitterExpectations?: string | null;
}

export interface SitPublishSingleBlockInput extends SitPublishBase {
  descriptionMode: "single-block";
  /** Texte concaténé (colonne `specific_expectations`), jamais découpé. */
  specificExpectations?: string | null;
}

export type SitPublishInput = SitPublishTwoFieldsInput | SitPublishSingleBlockInput;

/**
 * Recompose un texte concaténé depuis deux sous-champs de saisie.
 * Utilitaire de formulaire uniquement : les règles ne l'utilisent jamais.
 */
export const joinExpectations = (a: string, b: string) =>
  [a.trim(), b.trim()].filter(Boolean).join(EXPECTATIONS_SEPARATOR);

const len = (v?: string | null) => (v || "").trim().length;

/**
 * Date du jour au format ISO court, en temps universel.
 *
 * Les formulaires comparent des chaînes de dates produites en UTC : utiliser
 * l'heure locale ici faisait diverger les deux entre minuit et deux heures du
 * matin à Paris, les règles déclarant passée une date que le formulaire
 * acceptait encore.
 */
const todayIso = (): string => new Date().toISOString().slice(0, 10);



/** Bloquants de description en mode deux champs, les deux étant obligatoires. */
export const getTwoFieldsDescriptionBlockers = (
  reason?: string | null,
  expectations?: string | null,
): PublishBlocker[] => {
  const out: PublishBlocker[] = [];
  if (len(reason) < MIN_SUB_DESCRIPTION) {
    out.push({
      id: "desc-reason",
      label: `Raison de votre besoin de garde (${MIN_SUB_DESCRIPTION} caractères minimum, actuellement ${len(reason)})`,
      anchor: "description-field",
    });
  }
  if (len(expectations) < MIN_SUB_DESCRIPTION) {
    out.push({
      id: "desc-expectations",
      label: `Attentes envers le gardien (${MIN_SUB_DESCRIPTION} caractères minimum, actuellement ${len(expectations)})`,
      anchor: "description-field",
    });
  }
  return out;
};

/** Bloquant de description en mode bloc unique, sans jamais découper le texte. */
export const getSingleBlockDescriptionBlockers = (text?: string | null): PublishBlocker[] =>
  len(text) < MIN_SINGLE_DESCRIPTION
    ? [
        {
          id: "desc-reason",
          label: `Description de la garde (${MIN_SINGLE_DESCRIPTION} caractères minimum, actuellement ${len(text)})`,
          anchor: "description-field",
        },
      ]
    : [];

/** Bloquants de description selon le mode déclaré. */
export const getDescriptionBlockers = (input: SitPublishInput): PublishBlocker[] =>
  input.descriptionMode === "two-fields"
    ? getTwoFieldsDescriptionBlockers(input.absenceReason, input.sitterExpectations)
    : getSingleBlockDescriptionBlockers(input.specificExpectations);

/**
 * Renvoie la liste ordonnée des éléments manquants pour publier.
 * Liste vide, la publication est possible.
 */
export const getSitPublishBlockers = (input: SitPublishInput): PublishBlocker[] => {
  /**
   * Une date de début et une date de fin sont toujours exigées. La case dates
   * flexibles enrichit l'annonce, elle ne dispense jamais de dates : sans elles
   * la publication envoie une chaîne vide sur une colonne de type date et
   * l'annonce diffusée affiche « Dates non renseignées ».
   */
  const hasDates = Boolean(len(input.startDate) && len(input.endDate));
  const photoCount =
    (input.galleryPhotoCount || 0) + (input.propertyPhotoCount || 0) + (input.hasCoverPhoto ? 1 : 0);

  /**
   * Cohérence des dates, calculée ici pour que les trois écrans l'appliquent :
   * une date de début déjà passée, ou une date de fin antérieure ou égale à la
   * date de début, interdisent la publication. L'erreur transmise par un
   * formulaire ne sert que de repli quand aucune incohérence n'est détectée.
   */
  const start = (input.startDate || "").trim();
  const end = (input.endDate || "").trim();
  const computedDateError = !hasDates
    ? null
    : start < todayIso()
      ? "La date de début ne peut pas être dans le passé."
      : end <= start
        ? "La date de fin doit être après la date de début."
        : null;
  const dateError = computedDateError || input.dateError || null;

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
          label: "Date de début et date de fin de la garde",
          anchor: "dates-field",
        }
      : null,
    dateError ? { id: "date-error", label: dateError, anchor: "dates-field" } : null,

    ...getDescriptionBlockers(input),
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

/**
 * Libellés affichables de tous les prérequis, dans l'ordre de la checklist.
 * Les lignes de description suivent le mode déclaré : une annonce en bloc
 * unique n'affiche pas de ligne « Attentes envers le gardien » qu'elle n'a pas.
 */
export const getSitPublishRequirements = (
  mode: DescriptionMode,
): { id: string; label: string }[] => [
  { id: "property", label: "Logement décrit sur votre profil" },
  { id: "title", label: "Titre de l'annonce" },
  { id: "dates", label: "Date de début et date de fin de la garde" },
  ...(mode === "two-fields"
    ? [
        {
          id: "desc-reason",
          label: `Raison de votre besoin de garde (${MIN_SUB_DESCRIPTION} caractères minimum)`,
        },
        {
          id: "desc-expectations",
          label: `Attentes envers le gardien (${MIN_SUB_DESCRIPTION} caractères minimum)`,
        },
      ]
    : [
        {
          id: "desc-reason",
          label: `Description de la garde (${MIN_SINGLE_DESCRIPTION} caractères minimum)`,
        },
      ]),
  { id: "photo", label: "Au moins une photo de votre logement ou de votre galerie" },
  { id: "pets", label: "Au moins un animal à faire garder" },
];

/**
 * Annonce brute, telle que lue en base ou tenue par un formulaire.
 * Les noms de colonnes sont conservés pour éviter toute recomposition manuelle.
 */
export interface SitPublishSit {
  title?: string | null;
  start_date?: string | null;
  end_date?: string | null;
  flexible_dates?: boolean | null;
  specific_expectations?: string | null;
  cover_photo_url?: string | null;
  published_at?: string | null;
}

export interface BuildSitPublishInputOptions {
  sit: SitPublishSit;
  /** Logement du propriétaire, tel que chargé par l'écran. */
  property?: { photos?: unknown } | null;
  /** Photos de la galerie du profil propriétaire. */
  galleryPhotos?: unknown[] | null;
  /** Animaux du propriétaire. */
  pets?: unknown[] | null;
  /**
   * Deux sous-champs de saisie, quand l'écran en dispose. Leur présence
   * déclare le mode deux champs, leur absence le mode bloc unique.
   */
  twoFields?: { absenceReason?: string | null; sitterExpectations?: string | null };
  /** Erreur de dates déjà calculée par un formulaire, en repli. */
  dateError?: string | null;
  /** Neutralisations, pour un écran qui ne détient pas ces champs. */
  overrides?: {
    hasProperty?: boolean;
    galleryPhotoCount?: number;
    propertyPhotoCount?: number;
    petCount?: number;
    /** Texte réellement écrit en base, quand il diffère de l'affichage. */
    specificExpectations?: string | null;
  };
}

const count = (v?: unknown[] | null) => (Array.isArray(v) ? v.length : 0);

/**
 * Adaptateur unique : construit l'entrée des règles depuis une annonce et son
 * propriétaire. Aucun écran ne compose cette entrée à la main, sans quoi les
 * écarts entre le formulaire de création et la fiche annonce réapparaissent.
 */
export const buildSitPublishInput = (o: BuildSitPublishInputOptions): SitPublishInput => {
  const ov = o.overrides || {};
  const base: SitPublishBase = {
    title: o.sit.title,
    startDate: o.sit.start_date,
    endDate: o.sit.end_date,
    flexibleDates: o.sit.flexible_dates,
    dateError: o.dateError,
    hasProperty: ov.hasProperty ?? !!o.property,
    galleryPhotoCount: ov.galleryPhotoCount ?? count(o.galleryPhotos),
    propertyPhotoCount:
      ov.propertyPhotoCount ?? count((o.property as { photos?: unknown[] } | null)?.photos),
    hasCoverPhoto: !!o.sit.cover_photo_url,
    petCount: ov.petCount ?? count(o.pets),
  };

  if (o.twoFields) {
    return {
      ...base,
      descriptionMode: "two-fields",
      absenceReason: o.twoFields.absenceReason,
      sitterExpectations: o.twoFields.sitterExpectations,
    };
  }
  return {
    ...base,
    descriptionMode: "single-block",
    specificExpectations: ov.specificExpectations ?? o.sit.specific_expectations,
  };
};

/**
 * Une annonce déjà publiée une fois a été validée par le formulaire de
 * création. Un brouillon qui ne l'a jamais été doit repasser par le formulaire
 * en deux champs plutôt que d'être publié directement depuis la fiche.
 */
export const wasValidatedByCreateForm = (sit: SitPublishSit): boolean => !!sit.published_at;
