/**
 * Score d'affinité propriétaire ↔ gardien.
 *
 * Principes (dégradation gracieuse) :
 * - Chaque critère absent côté propriétaire OU gardien est NEUTRE (ni bonus, ni pénalité).
 * - Le score est calculé uniquement sur les critères communs renseignés des deux côtés.
 * - Seuil minimum : 3 critères communs. En dessous → renvoie `null` (pas de badge).
 * - Seuil de confiance : score < 40 % → renvoie `null` (un score faible n'a pas de
 *   valeur informative, mieux vaut masquer que décourager).
 * - Disqualification : si le gardien a une sensibilité incompatible avec une espèce
 *   présente chez le propriétaire (allergie, refus d'espèce…), le score est `null`.
 *
 * Critères évalués (pondération différenciée) :
 *  1. Animaux (poids 2) : intersection pets.species ↔ sitter.animal_types
 *  2. Présence ↔ travail pendant la garde (poids 2)
 *  3. Profil idéal (poids 1) : sitter matche un des owner.preferred_sitter_types
 *  4. Rythme de vie (poids 0.5) : exact = 1, adjacent = 0.5
 *  5. Langues (poids 0.5) : au moins 1 commune
 *  6. Intérêts (poids 0.5) : ≥2 communs = 1, ≥1 = 0.5
 *  7. Ambiance foyer (poids 0.5) : ↔ intérêts/rythme du sitter
 *
 * Rationnel : animaux, présence et profil idéal sont des critères "durs".
 * Rythme, langues, intérêts et ambiance sont des "soft" (peu renseignés en base),
 * pondérés à 0.5 pour ne pas écraser le score des profils qui matchent l'essentiel.
 */

export interface AffinityOwnerInput {
  preferred_sitter_types?: string[] | null;
  home_ambiance?: string[] | null;
  languages?: string[] | null;
  interests?: string[] | null;
  life_pace?: string | null;
  presence_expected?: string | null;
  pets?: { species?: string | null; special_needs?: string | null }[] | null;
  /** Contexte annonce (optionnel) : politique accompagnants du sit. */
  accepts_sitter_pets?: "yes" | "no" | "discuss" | null;
  accepts_sitter_children?: "yes" | "no" | "discuss" | null;
}

export interface AffinitySitterInput {
  animal_types?: string[] | null;
  life_pace?: string | null;
  languages?: string[] | null;
  interests?: string[] | null;
  work_during_sit?: string | null;
  sensitivities?: string[] | null;
  special_animal_skills?: string[] | null;
  sitter_type?: string | null;
  experience_years?: string | null;
  /** Le gardien voyage habituellement avec ses propres animaux. */
  travels_with_own_animals?: boolean | null;
  /** Le gardien voyage habituellement avec ses enfants. */
  travels_with_children?: boolean | null;
}

export interface AffinityResult {
  /** Score arrondi 0–100. */
  score: number;
  /** Libellés des critères matchés (pour tooltip). */
  matched: string[];
  /** Nombre de critères communs évalués. */
  total: number;
  /** Faut-il afficher le badge ? Optionnel pour rétro-compat. */
  displayed?: boolean;
  /** Si displayed === false, raison du masquage. */
  hiddenReason?:
    | "below_threshold"
    | "too_few_criteria"
    | "no_hard_criterion"
    | "disqualified"
    | "no_animal_species_match"
    | "sitter_pets_not_accepted"
    | "sitter_children_not_accepted";
  /** Notes contextuelles (ex: "accompagnants à discuter"). */
  notes?: string[];
}

const PACE_ORDER = ["calme", "equilibre", "actif"];

/**
 * Seuils pilotables via feature_flags (affinity_min_common_criteria +
 * affinity_min_score_percent). Bootstrap au démarrage via
 * useAffinityThresholdsBootstrap ; par défaut : 2 critères / 35 %.
 */
const thresholds = {
  minCommonCriteria: 2,
  minScorePercent: 35,
};

export function setAffinityThresholds(next: { minCommonCriteria?: number; minScorePercent?: number }) {
  if (typeof next.minCommonCriteria === "number" && Number.isFinite(next.minCommonCriteria)) {
    thresholds.minCommonCriteria = Math.max(1, Math.min(5, Math.round(next.minCommonCriteria)));
  }
  if (typeof next.minScorePercent === "number" && Number.isFinite(next.minScorePercent)) {
    thresholds.minScorePercent = Math.max(0, Math.min(100, Math.round(next.minScorePercent)));
  }
}

export function getAffinityThresholds() {
  return { ...thresholds };
}

/**
 * Pondération par critère. Animaux et présence pèsent 2 (critères durs),
 * les 5 autres pèsent 1. MAX_WEIGHT = 9 correspond à un profil qui a
 * renseigné les 7 critères de la formule.
 *
 * Normalisation (juillet 2026) : le score est calculé sur le poids
 * effectivement évalué (somme des poids des critères comparables des deux
 * côtés), pas sur MAX_WEIGHT. Un critère absent d'un côté sort simplement
 * du dénominateur — il n'est ni bonus ni pénalité. Cela garantit qu'un
 * même couple owner/gardien obtient le même score quel que soit le nombre
 * de champs récupérés par la vue appelante (cohérence /annonces ↔ détail).
 */
const W = {
  animals: 2,
  presence: 2,
  ideal: 1,
  pace: 1,
  languages: 1,
  interests: 1,
  ambiance: 1,
} as const;

const MAX_WEIGHT = 9;

/**
 * Normalise une espèce vers un code canonique en anglais.
 * pets.species utilise des codes EN (dog, cat, …) ; sitter_profiles.animal_types
 * utilise des libellés FR pluriels ("Chiens", "Chats", "NAC"…). On ramène
 * tout au code EN pour pouvoir intersecter.
 */
const SPECIES_NORMALIZE: Record<string, string> = {
  dog: "dog", chien: "dog", chiens: "dog",
  cat: "cat", chat: "cat", chats: "cat",
  bird: "bird", oiseau: "bird", oiseaux: "bird",
  rodent: "rodent", rongeur: "rodent", rongeurs: "rodent",
  reptile: "reptile", reptiles: "reptile",
  nac: "nac",
  horse: "horse", cheval: "horse", chevaux: "horse",
  farm_animal: "farm_animal",
  "animal de ferme": "farm_animal",
  "animaux de ferme": "farm_animal",
  tous: "all", all: "all",
};

function normalizeSpecies(value?: string | null): string | null {
  if (!value) return null;
  const k = value.trim().toLowerCase();
  return SPECIES_NORMALIZE[k] ?? k;
}

function speciesIntersects(ownerSpecies: string[], sitterTypes: string[]): number {
  const owners = ownerSpecies.map(normalizeSpecies).filter(Boolean) as string[];
  const sitters = sitterTypes.map(normalizeSpecies).filter(Boolean) as string[];
  if (sitters.includes("all")) return owners.length;
  const set = new Set(sitters);
  return owners.reduce((acc, s) => acc + (set.has(s) ? 1 : 0), 0);
}

const SENSITIVITY_BY_SPECIES: Record<string, string[]> = {
  cat: ["Allergie aux chats"],
  dog: ["Allergie aux chiens", "Pas de très grands chiens", "Pas de chiens catégorisés"],
  reptile: ["Pas de reptiles", "Pas de NAC"],
  rodent: ["Pas de NAC"],
  bird: ["Pas de NAC"],
  nac: ["Pas de NAC"],
  horse: ["Pas de chevaux ou animaux de ferme"],
  farm_animal: ["Pas de chevaux ou animaux de ferme"],
};

function hasIntersection<T>(a?: T[] | null, b?: T[] | null): boolean {
  if (!a || !b || a.length === 0 || b.length === 0) return false;
  const setB = new Set(b);
  return a.some((x) => setB.has(x));
}

function intersectionCount<T>(a?: T[] | null, b?: T[] | null): number {
  if (!a || !b) return 0;
  const setB = new Set(b);
  return a.reduce((acc, x) => acc + (setB.has(x) ? 1 : 0), 0);
}

function isDisqualified(owner: AffinityOwnerInput, sitter: AffinitySitterInput): boolean {
  const sens = sitter.sensitivities ?? [];
  if (sens.length === 0) return false;
  const species = (owner.pets ?? [])
    .map((p) => normalizeSpecies(p?.species))
    .filter(Boolean) as string[];
  for (const sp of species) {
    const blockers = SENSITIVITY_BY_SPECIES[sp] ?? [];
    if (blockers.some((b) => sens.includes(b))) return true;
  }
  return false;
}

function presenceCompatibility(presence?: string | null, work?: string | null): number | null {
  if (!presence || !work) return null;
  if (presence === "100% sur place") return 1;
  if (presence === "Télétravail OK") {
    if (work === "full_remote" || work === "partial_remote" || work === "on_site") return 1;
    if (work === "flexible") return 0.5;
    return 0;
  }
  if (presence === "Absences courtes OK") {
    if (work === "full_remote" || work === "on_site") return 1;
    if (work === "partial_remote" || work === "flexible") return 0.5;
    return 0;
  }
  return null;
}

function ambianceMatch(owner: AffinityOwnerInput, sitter: AffinitySitterInput): number {
  const tags = owner.home_ambiance ?? [];
  if (tags.length === 0) return 0;
  let score = 0;
  if (tags.includes("Cocon casanier") && sitter.life_pace === "calme") score = Math.max(score, 1);
  if (tags.includes("Calme et posé") && (sitter.life_pace === "calme" || sitter.life_pace === "equilibre"))
    score = Math.max(score, 1);
  if (tags.includes("Sportif outdoor")) {
    if (sitter.life_pace === "actif") score = Math.max(score, 1);
    if (hasIntersection(sitter.interests, ["Randonnée", "Course à pied", "Vélo", "Ski", "Sports nautiques"]))
      score = Math.max(score, 1);
  }
  if (tags.includes("Campagne") && hasIntersection(sitter.interests, ["Randonnée", "Jardinage"]))
    score = Math.max(score, 0.5);
  if (tags.includes("Famille animée") && sitter.sitter_type && /famille|couple/i.test(sitter.sitter_type))
    score = Math.max(score, 1);
  return score;
}

function idealProfileMatch(owner: AffinityOwnerInput, sitter: AffinitySitterInput): number {
  const prefs = owner.preferred_sitter_types ?? [];
  if (prefs.length === 0 || prefs.includes("Sans préférence")) return 0;
  const st = sitter.sitter_type ?? "";
  for (const p of prefs) {
    if (st && st.toLowerCase().includes(p.toLowerCase().split("·")[0])) return 1;
  }
  if (prefs.includes("Gardien·ne expérimenté·e") && sitter.experience_years && sitter.experience_years !== "0")
    return 1;
  return 0;
}

/**
 * Calcule le résultat complet (affiché OU masqué).
 * Utile pour piloter le seuil via les analytics : on track aussi les
 * impressions « théoriques » des scores faibles pour décider plus tard
 * de relever ou abaisser le seuil.
 */
export function computeAffinityResultFull(
  owner: AffinityOwnerInput,
  sitter: AffinitySitterInput,
): AffinityResult | null {
  if (!owner || !sitter) return null;
  if (isDisqualified(owner, sitter)) {
    return { score: 0, matched: [], total: 0, displayed: false, hiddenReason: "disqualified" };
  }

  // Garde-fou accompagnants (annonce ↔ gardien).
  if (owner.accepts_sitter_pets === "no" && sitter.travels_with_own_animals === true) {
    return { score: 0, matched: [], total: 0, displayed: false, hiddenReason: "sitter_pets_not_accepted" };
  }
  if (owner.accepts_sitter_children === "no" && sitter.travels_with_children === true) {
    return { score: 0, matched: [], total: 0, displayed: false, hiddenReason: "sitter_children_not_accepted" };
  }

  // Garde-fou espèces : si l'owner a des animaux ET le gardien déclare une expérience
  // mais qu'aucune espèce ne matche, on masque plutôt que d'afficher un faux positif.
  const ownerSpeciesRaw = (owner.pets ?? []).map((p) => p?.species).filter(Boolean) as string[];
  if (ownerSpeciesRaw.length > 0 && (sitter.animal_types?.length ?? 0) > 0) {
    if (speciesIntersects(ownerSpeciesRaw, sitter.animal_types ?? []) === 0) {
      return { score: 0, matched: [], total: 0, displayed: false, hiddenReason: "no_animal_species_match" };
    }
  }

  let points = 0;
  let evaluated = 0; // nombre de critères réellement comparables (X / 7)
  let evaluatedWeight = 0; // somme des poids des critères comparables (dénominateur dynamique)
  const matched: string[] = [];
  const notes: string[] = [];

  // 1. Animaux (poids 2)
  const species = ownerSpeciesRaw;
  if (species.length > 0 && (sitter.animal_types?.length ?? 0) > 0) {
    evaluated++;
    evaluatedWeight += W.animals;
    const inter = speciesIntersects(species, sitter.animal_types ?? []);
    if (inter > 0) {
      const ratio = Math.min(1, inter / species.length);
      points += ratio * W.animals;
      if (ratio >= 1) matched.push("Tous vos animaux dans son expérience");
      else matched.push("Expérience avec une partie de vos animaux");
    }
  }


  // 2. Présence (poids 2)
  const presScore = presenceCompatibility(owner.presence_expected, sitter.work_during_sit);
  if (presScore !== null) {
    evaluated++;
    evaluatedWeight += W.presence;
    points += presScore * W.presence;
    if (presScore >= 1) matched.push("Présence compatible");
    else if (presScore >= 0.5) matched.push("Présence plutôt compatible");
  }

  // 3. Rythme (poids 1)
  if (owner.life_pace && sitter.life_pace) {
    evaluated++;
    evaluatedWeight += W.pace;
    if (owner.life_pace === sitter.life_pace) {
      points += W.pace;
      matched.push("Même rythme de vie");
    } else {
      const oi = PACE_ORDER.indexOf(owner.life_pace);
      const si = PACE_ORDER.indexOf(sitter.life_pace);
      if (oi >= 0 && si >= 0 && Math.abs(oi - si) === 1) {
        points += 0.5 * W.pace;
        matched.push("Rythme de vie proche");
      }
    }
  }

  // 4. Langues (poids 1)
  if ((owner.languages?.length ?? 0) > 0 && (sitter.languages?.length ?? 0) > 0) {
    evaluated++;
    evaluatedWeight += W.languages;
    if (hasIntersection(owner.languages, sitter.languages)) {
      points += W.languages;
      matched.push("Langue commune");
    }
  }

  // 5. Intérêts (poids 1)
  if ((owner.interests?.length ?? 0) > 0 && (sitter.interests?.length ?? 0) > 0) {
    evaluated++;
    evaluatedWeight += W.interests;
    const c = intersectionCount(owner.interests, sitter.interests);
    if (c >= 2) {
      points += W.interests;
      matched.push("Plusieurs intérêts partagés");
    } else if (c === 1) {
      points += 0.5 * W.interests;
      matched.push("Un intérêt partagé");
    }
  }

  // 6. Profil idéal (poids 1)
  if ((owner.preferred_sitter_types?.length ?? 0) > 0 && sitter.sitter_type) {
    evaluated++;
    evaluatedWeight += W.ideal;
    const m = idealProfileMatch(owner, sitter);
    if (m > 0) {
      points += m * W.ideal;
      matched.push("Correspond à votre profil idéal");
    }
  }

  // 7. Ambiance foyer (poids 1)
  if ((owner.home_ambiance?.length ?? 0) > 0 && (sitter.life_pace || (sitter.interests?.length ?? 0) > 0)) {
    evaluated++;
    evaluatedWeight += W.ambiance;
    const a = ambianceMatch(owner, sitter);
    if (a > 0) {
      points += a * W.ambiance;
      if (a >= 1) matched.push("Ambiance du foyer en phase");
      else matched.push("Ambiance du foyer plutôt en phase");
    }
  }

  // Note "à discuter" (accompagnants) : n'impacte pas le score.
  if (owner.accepts_sitter_pets === "discuss" && sitter.travels_with_own_animals === true) {
    notes.push("Vos animaux accompagnants sont à discuter avec le propriétaire");
  }
  if (owner.accepts_sitter_children === "discuss" && sitter.travels_with_children === true) {
    notes.push("Vos enfants accompagnants sont à discuter avec le propriétaire");
  }

  // Dénominateur dynamique : on normalise sur les poids réellement évalués.
  // Un critère absent d'un côté ne pénalise plus le score, il en sort.
  const raw = evaluatedWeight > 0 ? (points / evaluatedWeight) * 100 : 0;
  const score = Math.max(0, Math.min(100, Math.round(raw)));
  const total = evaluated;

  if (evaluated < thresholds.minCommonCriteria) {
    return { score, matched, total, notes, displayed: false, hiddenReason: "too_few_criteria" };
  }
  if (score < thresholds.minScorePercent) {
    return { score, matched, total, notes, displayed: false, hiddenReason: "below_threshold" };
  }
  return { score, matched, total, notes, displayed: true };
}



/**
 * API legacy : ne renvoie que les résultats affichables (rétro-compat).
 * Préférer `computeAffinityResultFull` quand on veut piloter le tracking.
 */
export function computeAffinityScore(
  owner: AffinityOwnerInput,
  sitter: AffinitySitterInput,
): AffinityResult | null {
  const r = computeAffinityResultFull(owner, sitter);
  if (!r || r.displayed === false) return null;
  return r;
}

