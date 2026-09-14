/**
 * Projets participatifs : libellés et mises en forme partagés par la carte,
 * la page de destination et la page de détail. Un projet est une ligne de
 * small_missions avec category = 'projet', mais il se lit comme une annonce.
 */

/** Durées en paliers, lisibles par une personne qui prévoit un déplacement. */
export const PROJET_DURATION_LABELS: Record<string, string> = {
  "1-2h": "1 à 2 heures",
  half_day: "Une demi-journée",
  day: "Une journée",
  weekend: "Un week-end",
  few_days: "3 à 5 jours",
  several: "Plusieurs jours",
  week: "Une semaine",
  two_weeks: "Deux semaines",
  month_plus: "Un mois et plus",
};

export function projetDurationLabel(duration?: string | null): string | null {
  if (!duration) return null;
  return PROJET_DURATION_LABELS[duration] || duration;
}

/** Hébergement proposé sur place. */
export const HEBERGEMENT_LABELS: Record<string, string> = {
  chambre: "Une chambre sur place",
  dortoir: "Un couchage en dortoir",
  camping: "Un emplacement de camping",
  aucun: "Chacun organise son couchage",
};

export function hebergementLabel(value?: string | null): string | null {
  if (!value) return null;
  return HEBERGEMENT_LABELS[value] || value;
}

const MONTHS = [
  "janvier", "février", "mars", "avril", "mai", "juin",
  "juillet", "août", "septembre", "octobre", "novembre", "décembre",
];

function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

/**
 * Période en clair, au mois : « Octobre », « Octobre à novembre ».
 * Renvoie null quand aucune date n'est renseignée.
 */
export function formatProjetPeriod(start?: string | null, end?: string | null): string | null {
  const toMonth = (raw?: string | null): string | null => {
    if (!raw) return null;
    const d = new Date(raw);
    if (isNaN(d.getTime())) return null;
    return MONTHS[d.getMonth()];
  };
  const a = toMonth(start);
  const b = toMonth(end);
  if (a && b && a !== b) return `${capitalize(a)} à ${b}`;
  if (a) return capitalize(a);
  if (b) return capitalize(b);
  return null;
}

/** Ligne de méta d'une carte projet : période puis durée, séparées par un point médian. */
export function projetMetaLine(
  start?: string | null,
  end?: string | null,
  duration?: string | null,
): string | null {
  const parts = [formatProjetPeriod(start, end), projetDurationLabel(duration)].filter(Boolean);
  return parts.length > 0 ? parts.join(" · ") : null;
}
