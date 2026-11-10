/**
 * missingOpportunities — logique partagée des « occasions manquées ».
 *
 * MÊME SOURCE pour le bloc dashboard gardien et l'appel à l'action du digest
 * quotidien (doctrine du 20/08/2026, règle 11) : le client l'importe via
 * `src/lib/missingOpportunities.ts` (ré-exportation), la fonction edge
 * `send-sitter-daily-digest` l'importe directement.
 *
 * Doctrine : un champ non renseigné est neutre dans le score d'affinité,
 * mais jamais silencieux à l'écran. Au maximum DEUX manques à la fois,
 * formulés en annonces réelles recalculées à l'affichage :
 * « 8 des 11 annonces en ligne demandent un gardien véhiculé, vous n'avez
 * pas répondu. »
 *
 * Interdits : barre de progression en pourcentage, badge permanent,
 * formulation générique sans chiffre.
 *
 * La donnée vient de la RPC `sitter_missing_opportunities` (compteurs sur
 * les annonces publiées, recalculés à chaque appel).
 */

import {
  EFFECTIVE_DEFAULT_RADIUS_KM,
  LEGACY_UNANSWERED_RADIUS_KM,
} from "../search-radius.ts";

export type MissingOpportunityKey =
  | "radius"
  | "vehicle"
  | "species"
  | "work"
  | "sitter_type"
  | "pace"
  | "languages";

export interface MissingOpportunityStat {
  key: MissingOpportunityKey;
  /** Nombre d'annonces publiées concernées par ce sujet. */
  concerned: number;
  /** Le gardien a répondu à la question sur sa fiche. */
  answered: boolean;
}

export interface MissingOpportunitiesStats {
  total_sits: number;
  items: MissingOpportunityStat[];
}

export interface MissingOpportunity {
  key: MissingOpportunityKey;
  /** Phrase chiffrée, voix produit. */
  sentence: string;
  href: string;
  ctaLabel: string;
}

/**
 * Ordre fixe de départage à compteur égal : poids du calcul d'affinité
 * d'abord (véhicule, espèces, présence pèsent 2), puis le rayon, puis les
 * critères de poids 1 (lot SC4, 10/11/2026).
 */
const PRIORITY: readonly MissingOpportunityKey[] = [
  "vehicle",
  "species",
  "work",
  "radius",
  "sitter_type",
  "pace",
  "languages",
];

/** Nombre maximum de manques affichés simultanément (doctrine). */
export const MISSING_OPPORTUNITIES_MAX = 2;

interface KeyWording {
  /** Ce que l'annonce demande ou précise. */
  what: string;
  verbPlural: string;
  verbSingular: string;
  /** Section du profil gardien qui pose la question. */
  section: string;
  /** Champ à mettre en avant à l'ouverture (paramètre focus du profil). */
  focus?: string;
}

const WORDING: Record<MissingOpportunityKey, KeyWording> = {
  radius: {
    what: `entre ${LEGACY_UNANSWERED_RADIUS_KM} et ${EFFECTIVE_DEFAULT_RADIUS_KM} km de chez vous`,
    verbPlural: "se trouvent",
    verbSingular: "se trouve",
    section: "mobilite",
  },
  vehicle: {
    what: "un gardien véhiculé",
    verbPlural: "demandent",
    verbSingular: "demande",
    // Lot SC1 : la question des trajets vit dans « Pendant la garde ».
    section: "profil",
    focus: "trips",
  },
  species: {
    what: "les animaux confiés",
    verbPlural: "précisent",
    verbSingular: "précise",
    section: "experience",
  },
  work: {
    what: "une attente de présence pendant la garde",
    verbPlural: "précisent",
    verbSingular: "précise",
    section: "profil",
    focus: "presence",
  },
  sitter_type: {
    what: "le type de gardien recherché",
    verbPlural: "indiquent",
    verbSingular: "indique",
    section: "profil",
  },
  pace: {
    what: "un rythme de vie",
    verbPlural: "décrivent",
    verbSingular: "décrit",
    section: "profil",
  },
  languages: {
    what: "des langues parlées",
    verbPlural: "mentionnent",
    verbSingular: "mentionne",
    section: "profil",
  },
};

/**
 * Phrase chiffrée pour un sujet. Gère le singulier (« Une des 11 annonces… »)
 * et le cas d'une seule annonce en ligne (« L'annonce en ligne… »).
 */
export const missingOpportunitySentence = (
  key: MissingOpportunityKey,
  concerned: number,
  total: number,
): string => {
  const w = WORDING[key];
  if (concerned <= 0 || total <= 0) return "";
  if (total === 1) {
    return `L'annonce en ligne ${w.verbSingular} ${w.what}, vous n'avez pas répondu.`;
  }
  if (concerned === 1) {
    return `Une des ${total} annonces en ligne ${w.verbSingular} ${w.what}, vous n'avez pas répondu.`;
  }
  return `${concerned} des ${total} annonces en ligne ${w.verbPlural} ${w.what}, vous n'avez pas répondu.`;
};

const focusParam = (key: MissingOpportunityKey): string =>
  WORDING[key].focus ? `&focus=${WORDING[key].focus}` : "";

/** Lien profond vers la question, sans écriture (aussi utilisé par les emails). */
export const missingOpportunityHref = (key: MissingOpportunityKey): string =>
  `/profile?section=${WORDING[key].section}${focusParam(key)}`;

/**
 * Choisit les manques à afficher : uniquement les questions sans réponse qui
 * concernent au moins une annonce en ligne, triées par nombre d'annonces
 * concernées (départage : ordre fixe véhicule > espèces > présence > rayon >
 * type > rythme > langues), au maximum `max` (deux par défaut).
 */
export const pickMissingOpportunities = (
  stats: MissingOpportunitiesStats | null | undefined,
  max: number = MISSING_OPPORTUNITIES_MAX,
): MissingOpportunity[] => {
  if (!stats || stats.total_sits <= 0 || !Array.isArray(stats.items)) return [];
  return stats.items
    .filter((i) => !i.answered && i.concerned > 0)
    .sort(
      (a, b) =>
        b.concerned - a.concerned ||
        PRIORITY.indexOf(a.key) - PRIORITY.indexOf(b.key),
    )
    .slice(0, max)
    .map((i) => ({
      key: i.key,
      sentence: missingOpportunitySentence(i.key, i.concerned, stats.total_sits),
      href: `/profile?section=${WORDING[i.key].section}${focusParam(i.key)}`,
      ctaLabel: "Répondre",
    }));
};
