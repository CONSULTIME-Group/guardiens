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
 *  3. Rythme de vie (poids 1) : exact = 1, adjacent = 0.5
 *  4. Langues (poids 1) : au moins 1 commune
 *  5. Intérêts (poids 1) : ≥2 communs = 1, ≥1 = 0.5
 *  6. Profil idéal (poids 1) : sitter matche un des owner.preferred_sitter_types
 *  7. Ambiance foyer (poids 1) : ↔ intérêts/rythme du sitter
 *
 * Rationnel : animaux et présence sont des critères "durs" (incompatibilité = échec
 * de garde). Langues/intérêts/ambiance sont des "nice-to-have" qui affinent.
 */

export interface AffinityOwnerInput {
  preferred_sitter_types?: string[] | null;
  home_ambiance?: string[] | null;
  languages?: string[] | null;
  interests?: string[] | null;
  life_pace?: string | null;
  presence_expected?: string | null;
  pets?: { species?: string | null; special_needs?: string | null }[] | null;
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
  hiddenReason?: "below_threshold" | "too_few_criteria" | "disqualified";
}

const PACE_ORDER = ["calme", "equilibre", "actif"];

/** Seuil sous lequel on n'affiche pas le badge (signal trop faible). */
const MIN_DISPLAY_SCORE = 40;

/** Pondération par critère (poids supérieur = critère "dur"). */
const W = {
  animals: 2,
  presence: 2,
  pace: 1,
  languages: 1,
  interests: 1,
  ideal: 1,
  ambiance: 1,
} as const;

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

  let points = 0;
  let weightSum = 0;
  let total = 0;
  const matched: string[] = [];

  // 1. Animaux (poids 2)
  const species = (owner.pets ?? []).map((p) => p?.species).filter(Boolean) as string[];
  if (species.length > 0 && (sitter.animal_types?.length ?? 0) > 0) {
    total++;
    weightSum += W.animals;
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
    total++;
    weightSum += W.presence;
    points += presScore * W.presence;
    if (presScore >= 1) matched.push("Présence compatible");
    else if (presScore >= 0.5) matched.push("Présence plutôt compatible");
  }

  // 3. Rythme (poids 1)
  if (owner.life_pace && sitter.life_pace) {
    total++;
    weightSum += W.pace;
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
    total++;
    weightSum += W.languages;
    if (hasIntersection(owner.languages, sitter.languages)) {
      points += W.languages;
      matched.push("Langue commune");
    }
  }

  // 5. Intérêts (poids 1)
  if ((owner.interests?.length ?? 0) > 0 && (sitter.interests?.length ?? 0) > 0) {
    total++;
    weightSum += W.interests;
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
    total++;
    weightSum += W.ideal;
    const m = idealProfileMatch(owner, sitter);
    if (m > 0) {
      points += m * W.ideal;
      matched.push("Correspond à votre profil idéal");
    }
  }

  // 7. Ambiance foyer (poids 1)
  if ((owner.home_ambiance?.length ?? 0) > 0 && (sitter.life_pace || (sitter.interests?.length ?? 0) > 0)) {
    total++;
    weightSum += W.ambiance;
    const a = ambianceMatch(owner, sitter);
    if (a > 0) {
      points += a * W.ambiance;
      if (a >= 1) matched.push("Ambiance du foyer en phase");
      else matched.push("Ambiance du foyer plutôt en phase");
    }
  }

  if (weightSum === 0) return null;

  const raw = (points / weightSum) * 100;
  const score = Math.max(0, Math.min(100, Math.round(raw)));

  if (total < 3) {
    return { score, matched, total, displayed: false, hiddenReason: "too_few_criteria" };
  }
  if (score < MIN_DISPLAY_SCORE) {
    return { score, matched, total, displayed: false, hiddenReason: "below_threshold" };
  }
  return { score, matched, total, displayed: true };
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

