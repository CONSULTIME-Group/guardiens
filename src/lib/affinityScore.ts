/**
 * Score d'affinité propriétaire ↔ gardien.
 *
 * Principes (dégradation gracieuse) :
 * - Chaque critère absent côté propriétaire OU gardien est NEUTRE (ni bonus, ni pénalité).
 * - Le score est calculé uniquement sur les critères communs renseignés des deux côtés.
 * - Seuil minimum : 3 critères communs. En dessous → renvoie `null` (pas de badge affiché).
 * - Disqualification : si le gardien a une sensibilité incompatible avec une espèce
 *   présente chez le propriétaire (allergie, refus d'espèce…), le score est `null`.
 *
 * Critères évalués (poids égaux, 1 point chacun, sauf adjacence rythme = 0.5) :
 *  1. Animaux : intersection pets.species ↔ sitter.animal_types
 *  2. Rythme de vie : exact = 1, adjacent (calme↔équilibré, équilibré↔actif) = 0.5
 *  3. Langues : au moins 1 commune
 *  4. Intérêts : ≥2 communs = 1, ≥1 = 0.5
 *  5. Présence ↔ travail pendant la garde (table de compatibilité)
 *  6. Profil idéal : sitter matche un des owner.preferred_sitter_types
 *  7. Ambiance foyer ↔ intérêts/rythme du sitter
 *
 * Bonus (non comptés dans le total mais ajoutent au score) :
 *  - Compétence spéciale matchant un besoin spécifique d'un animal.
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
}

const PACE_ORDER = ["calme", "equilibre", "actif"];

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
  const species = (owner.pets ?? []).map((p) => p?.species).filter(Boolean) as string[];
  for (const sp of species) {
    const blockers = SENSITIVITY_BY_SPECIES[sp] ?? [];
    if (blockers.some((b) => sens.includes(b))) return true;
  }
  return false;
}

function presenceCompatibility(presence?: string | null, work?: string | null): number | null {
  if (!presence || !work) return null;
  // Propriétaire 100% sur place : peu importe la dispo du sitter (il prend juste le relais)
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
  // Calme ↔ cocon casanier
  if (tags.includes("Cocon casanier") && sitter.life_pace === "calme") score = Math.max(score, 1);
  if (tags.includes("Calme et posé") && (sitter.life_pace === "calme" || sitter.life_pace === "equilibre"))
    score = Math.max(score, 1);
  // Sportif outdoor ↔ actif / randonnée / course
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
  // Expérience : si owner demande "Gardien·ne expérimenté·e" ou "Débutant·e motivé·e"
  if (prefs.includes("Gardien·ne expérimenté·e") && sitter.experience_years && sitter.experience_years !== "0")
    return 1;
  return 0;
}

export function computeAffinityScore(
  owner: AffinityOwnerInput,
  sitter: AffinitySitterInput,
): AffinityResult | null {
  if (!owner || !sitter) return null;
  if (isDisqualified(owner, sitter)) return null;

  let points = 0;
  let total = 0;
  const matched: string[] = [];

  // 1. Animaux
  const species = (owner.pets ?? []).map((p) => p?.species).filter(Boolean) as string[];
  if (species.length > 0 && (sitter.animal_types?.length ?? 0) > 0) {
    total++;
    const inter = intersectionCount(species, sitter.animal_types ?? []);
    if (inter > 0) {
      const ratio = Math.min(1, inter / species.length);
      points += ratio;
      if (ratio >= 1) matched.push("Tous vos animaux dans son expérience");
      else matched.push("Expérience avec une partie de vos animaux");
    }
  }

  // 2. Rythme
  if (owner.life_pace && sitter.life_pace) {
    total++;
    if (owner.life_pace === sitter.life_pace) {
      points += 1;
      matched.push("Même rythme de vie");
    } else {
      const oi = PACE_ORDER.indexOf(owner.life_pace);
      const si = PACE_ORDER.indexOf(sitter.life_pace);
      if (oi >= 0 && si >= 0 && Math.abs(oi - si) === 1) {
        points += 0.5;
        matched.push("Rythme de vie proche");
      }
    }
  }

  // 3. Langues
  if ((owner.languages?.length ?? 0) > 0 && (sitter.languages?.length ?? 0) > 0) {
    total++;
    if (hasIntersection(owner.languages, sitter.languages)) {
      points += 1;
      matched.push("Langue commune");
    }
  }

  // 4. Intérêts
  if ((owner.interests?.length ?? 0) > 0 && (sitter.interests?.length ?? 0) > 0) {
    total++;
    const c = intersectionCount(owner.interests, sitter.interests);
    if (c >= 2) {
      points += 1;
      matched.push("Plusieurs intérêts partagés");
    } else if (c === 1) {
      points += 0.5;
      matched.push("Un intérêt partagé");
    }
  }

  // 5. Présence
  const presScore = presenceCompatibility(owner.presence_expected, sitter.work_during_sit);
  if (presScore !== null) {
    total++;
    points += presScore;
    if (presScore >= 1) matched.push("Présence compatible");
    else if (presScore >= 0.5) matched.push("Présence plutôt compatible");
  }

  // 6. Profil idéal
  if ((owner.preferred_sitter_types?.length ?? 0) > 0 && sitter.sitter_type) {
    total++;
    const m = idealProfileMatch(owner, sitter);
    if (m > 0) {
      points += m;
      matched.push("Correspond à votre profil idéal");
    }
  }

  // 7. Ambiance foyer
  if ((owner.home_ambiance?.length ?? 0) > 0 && (sitter.life_pace || (sitter.interests?.length ?? 0) > 0)) {
    total++;
    const a = ambianceMatch(owner, sitter);
    if (a > 0) {
      points += a;
      if (a >= 1) matched.push("Ambiance du foyer en phase");
      else matched.push("Ambiance du foyer plutôt en phase");
    }
  }

  if (total < 3) return null;

  // Bonus compétences spéciales (hors comptage)
  const specialNeeds = (owner.pets ?? [])
    .map((p) => p?.special_needs?.trim())
    .filter(Boolean) as string[];
  if (specialNeeds.length > 0 && (sitter.special_animal_skills?.length ?? 0) > 0) {
    points += 0.25;
    matched.push("Compétence spéciale utile pour vos animaux");
  }

  const raw = (points / total) * 100;
  const score = Math.max(0, Math.min(100, Math.round(raw)));
  return { score, matched, total };
}
