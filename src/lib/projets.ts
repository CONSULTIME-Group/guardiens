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

/**
 * Nature du projet, liste fermée. Elle qualifie le chantier en un mot,
 * elle est stockée dans small_missions.nature_projet.
 */
export const PROJET_NATURE_LABELS: Record<string, string> = {
  jardin: "Jardin et potager",
  construction: "Construction et bricolage",
  lowtech: "Low tech et récupération",
  renovation: "Rénovation écologique",
  animaux: "Abris et aménagements pour animaux",
  evenement: "Événement",
  autre: "Autre",
};

export const PROJET_NATURE_VALUES = Object.keys(PROJET_NATURE_LABELS);

export function projetNatureLabel(value?: string | null): string | null {
  if (!value) return null;
  return PROJET_NATURE_LABELS[value] || null;
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

/**
 * Savoir-faire d'un chantier, liste fermée en cinq familles. Aucune table,
 * aucune jointure : les clés sont stockées telles quelles dans
 * small_missions.savoir_faire_attendus et savoir_faire_transmis.
 */
export const PROJET_SAVOIR_FAIRE: Array<{
  family: string;
  items: Array<{ key: string; label: string }>;
}> = [
  {
    family: "Jardin et potager",
    items: [
      { key: "permaculture", label: "Permaculture" },
      { key: "taille_greffe", label: "Taille et greffe" },
      { key: "haie", label: "Plantation de haie" },
      { key: "potager", label: "Potager" },
      { key: "compost", label: "Compost" },
    ],
  },
  {
    family: "Construction",
    items: [
      { key: "pierre_seche", label: "Pierre sèche" },
      { key: "maconnerie", label: "Maçonnerie" },
      { key: "bois", label: "Charpente et travail du bois" },
      { key: "toiture", label: "Toiture" },
      { key: "enduits", label: "Enduits terre et chaux" },
    ],
  },
  {
    family: "Low tech",
    items: [
      { key: "reemploi", label: "Récupération et réemploi" },
      { key: "reparation", label: "Réparation" },
      { key: "solaire", label: "Solaire et séchage" },
      { key: "electricite", label: "Électricité de base" },
    ],
  },
  {
    family: "Animaux",
    items: [
      { key: "abri_cloture", label: "Abri et clôture" },
      { key: "poulailler", label: "Poulailler" },
      { key: "soins_animaux", label: "Soins de base aux animaux" },
    ],
  },
  {
    family: "Autour du chantier",
    items: [
      { key: "cuisine", label: "Cuisine et conserves" },
      { key: "organisation", label: "Organiser un chantier" },
      { key: "accueil", label: "Accueillir du monde" },
    ],
  },
];

const SAVOIR_FAIRE_MAP: Record<string, string> = PROJET_SAVOIR_FAIRE.reduce(
  (acc, group) => {
    group.items.forEach((item) => { acc[item.key] = item.label; });
    return acc;
  },
  {} as Record<string, string>,
);

export function savoirFaireLabel(key?: string | null): string | null {
  if (!key) return null;
  return SAVOIR_FAIRE_MAP[key] || null;
}

/** Ce que le porteur met à disposition sur place. */
export const PROJET_OFFRE_LABELS: Record<string, string> = {
  outils: "Outils fournis",
  protection: "Équipement de protection",
  atelier: "Accès à l'atelier",
  gare: "On vient vous chercher à la gare",
};

export function offreLabel(value?: string | null): string | null {
  if (!value) return null;
  return PROJET_OFFRE_LABELS[value] || null;
}

/**
 * Période d'accueil fidèle aux mois cochés, jamais fusionnée en intervalle.
 * Les mois qui se suivent à partir de trois sont regroupés (« Mai à juillet
 * 2027 »), les autres sont listés (« Mai et septembre 2027 »). L'année paraît
 * une seule fois par année, à sa dernière occurrence.
 */
export function formatProjetMonths(mois?: string[] | null): string | null {
  if (!Array.isArray(mois) || mois.length === 0) return null;

  const parsed = Array.from(new Set(mois.filter(Boolean)))
    .map((raw) => {
      const [y, m] = String(raw).split("-").map(Number);
      if (!y || !m || m < 1 || m > 12) return null;
      return { y, m, index: y * 12 + (m - 1) };
    })
    .filter(Boolean) as Array<{ y: number; m: number; index: number }>;
  if (parsed.length === 0) return null;
  parsed.sort((a, b) => a.index - b.index);

  // Regroupement des suites de trois mois et plus.
  type Item = { start: { y: number; m: number }; end: { y: number; m: number }; range: boolean };
  const items: Item[] = [];
  let run: typeof parsed = [];
  const flush = () => {
    if (run.length === 0) return;
    if (run.length >= 3) {
      items.push({ start: run[0], end: run[run.length - 1], range: true });
    } else {
      run.forEach((p) => items.push({ start: p, end: p, range: false }));
    }
    run = [];
  };
  parsed.forEach((p) => {
    if (run.length === 0 || p.index === run[run.length - 1].index + 1) run.push(p);
    else { flush(); run = [p]; }
  });
  flush();

  const parts = items.map((item, i) => {
    const lastOfYear = !items.slice(i + 1).some((next) => next.end.y === item.end.y);
    const endText = `${MONTHS[item.end.m - 1]}${lastOfYear ? ` ${item.end.y}` : ""}`;
    if (!item.range) return endText;
    const startYear = item.start.y !== item.end.y ? ` ${item.start.y}` : "";
    return `${MONTHS[item.start.m - 1]}${startYear} à ${endText}`;
  });

  const text =
    parts.length === 1
      ? parts[0]
      : `${parts.slice(0, -1).join(", ")} et ${parts[parts.length - 1]}`;
  return capitalize(text);
}

/** Ligne de méta d'une carte projet : période puis durée, séparées par un point médian. */
export function projetMetaLine(
  start?: string | null,
  end?: string | null,
  duration?: string | null,
  mois?: string[] | null,
): string | null {
  const period = formatProjetMonths(mois) || formatProjetPeriod(start, end);
  const parts = [period, projetDurationLabel(duration)].filter(Boolean);
  return parts.length > 0 ? parts.join(" · ") : null;
}

