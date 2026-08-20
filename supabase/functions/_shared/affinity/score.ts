/**
 * Moteur d'affinité owner ↔ gardien — MOTEUR UNIQUE PARTAGÉ.
 *
 * Ce module vit dans `supabase/functions/_shared/affinity/` parce qu'il est
 * exécuté par DEUX runtimes : le client (Vite) et les fonctions edge (Deno).
 * `src/lib/affinityScore.ts` n'est qu'une ré-exportation de ce fichier.
 * Il ne doit importer AUCUNE API navigateur ou Node.
 *
 * DOCTRINE (lot affinité, août 2026) : ON TRIE PAR PERTINENCE, ON N'ÉLIMINE JAMAIS.
 * Le score n'exclut personne d'une liste de résultats. La seule exception est
 * la DISTRIBUTION (notifications, emails) : on respecte les refus déclarés du
 * gardien (sensibilités) et de l'annonce (animaux / enfants accompagnants),
 * et seulement ça.
 *
 * SEUILS : les seuils `minCommonCriteria` / `minScorePercent` servent à
 * décider si le CHIFFRE est fiable (scoreReliable) et si un CONTEXTE
 * l'affiche (displayed). Ils ne retirent jamais un gardien d'une liste.
 * Les seuils de MISE EN AVANT (Alma, Star) vivent chez leurs consommateurs
 * sous des constantes nommées AFFINITY_HIGHLIGHT_*.
 *
 * Côté edge, ce module remplace l'ancien moteur SQL `calculate_affinity_score_pg`
 * (supprimé dans la même passe) : un même couple produit le même score dans
 * l'app et dans les emails, garanti par `affinity-single-engine.test.ts`.
 */

import {
  PACE_ORDER,
  PRESENCE_100,
  PRESENCE_NO_REQUIREMENT,
  PRESENCE_REMOTE_OK,
  PRESENCE_SHORT_ABSENCES,
  WORK_FULL_REMOTE,
  WORK_PARTIAL_REMOTE,
  WORK_ON_SITE,
  WORK_OUT_DAYTIME,
  WORK_FLEXIBLE,
  HOME_AMBIANCE_SCORED_TAGS,
  AMBIANCE_COCON,
  AMBIANCE_CALME_POSE,
  AMBIANCE_SPORTIF,
  AMBIANCE_CAMPAGNE,
  AMBIANCE_FAMILLE,
  PACE_CALME,
  PACE_ACTIF,
  PACE_EQUILIBRE,
  OUTDOOR_SPORT_INTERESTS,
  RURAL_INTERESTS,
  SPECIES_NORMALIZE,
  NAC_UMBRELLA,
  SPECIES_MATCH_WEIGHT,
  SPECIES_REMARKABLE_THRESHOLD,
  SPECIES_MATCH_PHRASE,
  SENSITIVITY_BY_SPECIES,
  SENSITIVITY_EXPLANATION,
  SENS_ALLERGIE_CHAT,
  SENS_ALLERGIE_CHIEN,
  SENS_GRANDS_CHIENS,
  SENS_CHIENS_CATEGORISES,
  breedMatches,
  LARGE_DOG_BREEDS,
  CATEGORIZED_DOG_BREEDS,
  SPECIAL_NEED_SIGNALS,
  normalizeFreeText,
} from "./vocab.ts";

export interface AffinityOwnerInput {
  pets?: { species?: string | null; special_needs?: string | null; breed?: string | null }[] | null;
  life_pace?: string | null;
  languages?: string[] | null;
  interests?: string[] | null;
  presence_expected?: string | null;
  preferred_sitter_types?: string[] | null;
  home_ambiance?: string[] | null;
  accepts_sitter_pets?: string | null;
  accepts_sitter_children?: string | null;
}

export interface AffinitySitterInput {
  animal_types?: string[] | null;
  life_pace?: string | null;
  languages?: string[] | null;
  interests?: string[] | null;
  work_during_sit?: string | null;
  sensitivities?: string[] | null;
  /** En base : TEXT singulier ("Solo", "Couple", "Famille"…). Accepte aussi un tableau. */
  sitter_type?: string | string[] | null;
  /** Conservé pour compat des appelants ; non scoré. */
  experience_years?: string | null;
  travels_with_children?: boolean | null;
  travels_with_own_animals?: boolean | null;
  /** Compétences spéciales (médicaments, réactifs, seniors…). */
  special_animal_skills?: string[] | null;
  /** Acceptation explicite chevaux / animaux de ferme. */
  farm_animals_ok?: boolean | null;
}

/**
 * `hiddenReason` est LEGACY : il explique pourquoi le CHIFFRE ou le CONTEXTE
 * ne s'affiche pas, jamais pourquoi un profil serait retiré d'une liste.
 */
export interface AffinityResult {
  score: number;
  total: number;
  /** Raisons positives (chips vertes), en voix produit. */
  matched: string[];
  /** Freins factuels, traduits pour un humain. Jamais d'identifiant technique. */
  explanation: string[];
  /** Notes « à discuter » (ex : animaux accompagnants à convenir). */
  notes: string[];
  /** Affichage contextuel hérité (chip vs anneau…). Ne masque jamais une liste. */
  displayed: boolean;
  hiddenReason:
    | "disqualified"
    | "no_animal_species_match"
    | "sitter_pets_not_accepted"
    | "sitter_children_not_accepted"
    | "too_few_criteria"
    | "no_hard_criterion"
    | "below_threshold"
    | null;
  /** Le chiffre est assez informé pour être montré. */
  scoreReliable: boolean;
  /** Refus déclaré (sensibilité, animaux/enfants accompagnants refusés). */
  hasDeclaredIncompatibility: boolean;
  /** Vrai s'il est responsable de notifier/emailer ce couple. */
  distributable: boolean;
}

export interface AffinityThresholds {
  minCommonCriteria: number;
  minScorePercent: number;
}

/**
 * Seuils réglables (feature_flags). Valeurs par défaut codées ici pour que le
 * moteur soit utilisable sans bootstrap (edge functions, tests).
 * `minCommonCriteria` : fiabilité du chiffre. `minScorePercent` : contexte
 * d'affichage uniquement ; AUCUN retrait de liste ne s'appuie dessus.
 */
const DEFAULT_THRESHOLDS: AffinityThresholds = {
  minCommonCriteria: 3,
  minScorePercent: 35,
};

let runtimeThresholds: AffinityThresholds = { ...DEFAULT_THRESHOLDS };

/** Bootstrap client (navigateur mono-utilisateur). Les edge functions doivent
 * passer les seuils explicitement dans `options.thresholds`. */
export function setAffinityThresholds(patch: Partial<AffinityThresholds>) {
  runtimeThresholds = { ...runtimeThresholds, ...patch };
}

export function getAffinityThresholds(): AffinityThresholds {
  return { ...runtimeThresholds };
}

export interface ComputeOptions {
  /** "list" (défaut) : aucune élimination. "distribution" : respecte les refus déclarés. */
  mode?: "list" | "distribution";
  /** Seuils explicites (prioritaires sur le bootstrap module). */
  thresholds?: Partial<AffinityThresholds>;
}

/**
 * Seuils de MISE EN AVANT (highlight), PAS des seuils d'affichage :
 * un score sous ces barres reste affiché, trié et partagé. Ils servent
 * uniquement à choisir un ton visuel fort ou une recommandation proactive
 * (badge « Très compatible », whisper Alma). Ne jamais s'en servir pour
 * retirer un profil d'une liste.
 */
export const AFFINITY_HIGHLIGHT_SCORE_PERCENT = 60;
export const AFFINITY_HIGHLIGHT_STRONG_SCORE_PERCENT = 80;

// ---------------------------------------------------------------------------
// Helpers purs
// ---------------------------------------------------------------------------

function toArray<T>(v: T[] | null | undefined): T[] {
  return Array.isArray(v) ? v.filter((x) => x != null && x !== "") : [];
}

function normalizeSpeciesList(list: (string | null | undefined)[] | null | undefined): Set<string> {
  const out = new Set<string>();
  for (const raw of toArray(list)) {
    const key = normalizeFreeText(raw);
    const canon = SPECIES_NORMALIZE[key];
    if (canon) out.add(canon);
  }
  return out;
}

/** Espèces couvertes par le gardien, ombrelle NAC expansée. */
function expandSitterCoverage(set: Set<string>): Set<string> {
  const out = new Set(set);
  if (out.has("nac")) for (const s of NAC_UMBRELLA) out.add(s);
  return out;
}

/**
 * Espèces owner effectivement couvertes par le gardien, en tenant compte des
 * sensibilités déclarées (ex : allergie aux chats ⇒ chat non couvert même si
 * « Chats » est coché) et du croisement par race pour les chiens.
 */
function coveredSpecies(
  owner: AffinityOwnerInput,
  sitter: AffinitySitterInput,
): { covered: Set<string>; blockedSensitivities: string[] } {
  const pets = toArray(owner.pets);
  const sitterSens = new Set(toArray(sitter.sensitivities));
  const coverage = expandSitterCoverage(normalizeSpeciesList(sitter.animal_types));
  const all = coverage.has("all");
  const covered = new Set<string>();
  const blocked = new Set<string>();

  for (const pet of pets) {
    const canon = SPECIES_NORMALIZE[normalizeFreeText(pet.species)];
    if (!canon) continue;

    // Sensibilités bloquantes applicables à cette espèce / cet animal.
    const applicable = (SENSITIVITY_BY_SPECIES[canon] ?? []).filter((sens) => {
      if (!sitterSens.has(sens)) return false;
      if (canon === "dog" && sens === SENS_GRANDS_CHIENS) {
        return breedMatches(pet.breed, LARGE_DOG_BREEDS);
      }
      if (canon === "dog" && sens === SENS_CHIENS_CATEGORISES) {
        return breedMatches(pet.breed, CATEGORIZED_DOG_BREEDS);
      }
      return true;
    });

    if (applicable.length > 0) {
      applicable.forEach((s) => blocked.add(s));
      continue; // espèce refusée ⇒ jamais couverte, même si déclarée
    }
    if (all || coverage.has(canon)) covered.add(canon);
  }
  return { covered, blockedSensitivities: Array.from(blocked) };
}

interface CriterionEval {
  weight: number;
  points: number;
  /** Phrases positives (chips). */
  matched: string[];
  /** Phrases de frein, humaines. */
  explanation: string[];
}

/** Une phrase par critère au plus (matched prioritaire, sinon premier frein). */
function pickPhrase(c: CriterionEval): string | null {
  return c.matched[0] ?? c.explanation[0] ?? null;
}

/**
 * Utilitaire historique (SearchOwner, tests) : nombre d'espèces de l'owner
 * couvertes par les types déclarés du gardien, ombrelle NAC expansée.
 * Ne tient PAS compte des sensibilités : c'est un comptage brut.
 */
export function speciesIntersects(ownerSpecies: string[], sitterTypes: string[]): number {
  const owners = Array.from(normalizeSpeciesList(ownerSpecies));
  // « Tous » / « all » (toute casse) couvre toutes les espèces.
  const rawTypes = sitterTypes.map((t) => normalizeFreeText(t));
  if (rawTypes.some((t) => t === "tous" || t === "all")) return owners.length;
  const coverage = expandSitterCoverage(normalizeSpeciesList(sitterTypes));
  if (coverage.has("all")) return owners.length;
  return owners.reduce((acc, s) => acc + (coverage.has(s) ? 1 : 0), 0);
}

// ---------------------------------------------------------------------------
// Critères (chacun retourne null s'il n'est pas évaluable)
// ---------------------------------------------------------------------------

function evalAnimals(
  owner: AffinityOwnerInput,
  sitter: AffinitySitterInput,
): { crit: CriterionEval | null; blockedSensitivities: string[]; noCoverage: boolean } {
  const pets = toArray(owner.pets);
  const ownerSpecies = new Set<string>();
  for (const p of pets) {
    const canon = SPECIES_NORMALIZE[normalizeFreeText(p.species)];
    if (canon) ownerSpecies.add(canon);
  }
  const sitterDeclares = toArray(sitter.animal_types).length > 0;
  if (ownerSpecies.size === 0 || !sitterDeclares) {
    return { crit: null, blockedSensitivities: [], noCoverage: false };
  }

  const { covered, blockedSensitivities } = coveredSpecies(owner, sitter);

  // Pondération par espèce (rareté × contrainte).
  let wMatch = 0;
  let wTotal = 0;
  for (const s of ownerSpecies) {
    const w = SPECIES_MATCH_WEIGHT[s] ?? 1;
    wTotal += w;
    if (covered.has(s)) wMatch += w;
  }
  const coverageRatio = wTotal > 0 ? wMatch / wTotal : 0;
  const points = 2 * coverageRatio;

  const crit: CriterionEval = { weight: 2, points, matched: [], explanation: [] };
  if (wMatch >= wTotal && wTotal > 0) {
    crit.matched.push("Expérience avec vos animaux");
  } else if (wMatch > 0) {
    crit.matched.push("Expérience avec une partie de vos animaux");
  } else {
    crit.explanation.push("Ne déclare pas d'expérience avec vos animaux");
  }

  // Espèces remarquables couvertes (rares / contraignantes) : chips emphatiques.
  for (const s of covered) {
    const w = SPECIES_MATCH_WEIGHT[s] ?? 1;
    const phrase = SPECIES_MATCH_PHRASE[s];
    if (w > SPECIES_REMARKABLE_THRESHOLD && phrase) crit.matched.push(phrase);
  }

  return { crit, blockedSensitivities, noCoverage: wMatch === 0 && wTotal > 0 };
}

const WORK_RANK: Record<string, number> = {
  [WORK_ON_SITE]: 0,
  [WORK_OUT_DAYTIME]: 1,
  [WORK_PARTIAL_REMOTE]: 2,
  [WORK_FLEXIBLE]: 3,
  [WORK_FULL_REMOTE]: 4,
};

function evalPresence(owner: AffinityOwnerInput, sitter: AffinitySitterInput): CriterionEval | null {
  const need = owner.presence_expected;
  const work = sitter.work_during_sit;
  if (!need || !work) return null;
  if (PRESENCE_NO_REQUIREMENT.has(normalizeFreeText(need))) return null;

  const rank = WORK_RANK[work];
  if (rank == null) return null;

  let points = 0;
  let matched: string | null = null;
  let explanation: string | null = null;

  switch (need) {
    case PRESENCE_100:
      // « 100% sur place » = le propriétaire est lui-même présent en
      // continu : le rythme de travail du gardien est sans objet, la
      // présence est compatible par construction.
      points = 2;
      matched = "Présence compatible";
      break;
    case PRESENCE_REMOTE_OK:
      if (rank >= WORK_RANK[WORK_PARTIAL_REMOTE]) { points = 2; matched = "Peut télétravailler chez vous"; }
      else if (work === WORK_OUT_DAYTIME) { points = 1; explanation = "Absent dans la journée"; }
      else { points = 0; explanation = "Absent dans la journée"; }
      break;
    case PRESENCE_SHORT_ABSENCES:
      if (work === WORK_FULL_REMOTE) { points = 2; matched = "Présence compatible avec vos absences"; }
      else if (work === WORK_PARTIAL_REMOTE || work === WORK_FLEXIBLE) { points = 1.5; matched = "Présence compatible avec vos absences"; }
      else if (work === WORK_OUT_DAYTIME) { points = 1; explanation = "Absent dans la journée"; }
      else { points = 0.5; explanation = "Absent dans la journée"; }
      break;
    default:
      return null;
  }
  return {
    weight: 2,
    points,
    matched: matched ? [matched] : [],
    explanation: explanation ? [explanation] : [],
  };
}

function evalIdealProfile(owner: AffinityOwnerInput, sitter: AffinitySitterInput): CriterionEval | null {
  const preferred = toArray(owner.preferred_sitter_types);
  const actual = typeof sitter.sitter_type === "string"
    ? toArray([sitter.sitter_type])
    : toArray(sitter.sitter_type);
  if (preferred.length === 0 || actual.length === 0) return null;
  // Correspondance souple : « Retraité·e » matche « Retraité·e voyageur·euse ».
  const norm = (s: string) => normalizeFreeText(s);
  const inter = preferred.filter((t) =>
    actual.some((a) => {
      const na = norm(a);
      const nt = norm(t);
      return na === nt || na.includes(nt) || nt.includes(na);
    }),
  );
  return {
    weight: 1,
    points: inter.length > 0 ? 1 : 0,
    matched: inter.length > 0 ? ["Correspond à votre profil idéal"] : [],
    explanation: [],
  };
}

function evalPace(owner: AffinityOwnerInput, sitter: AffinitySitterInput): CriterionEval | null {
  const o = owner.life_pace;
  const s = sitter.life_pace;
  if (!o || !s) return null;
  const oi = (PACE_ORDER as readonly string[]).indexOf(o);
  const si = (PACE_ORDER as readonly string[]).indexOf(s);
  if (oi < 0 || si < 0) return null;
  const same = oi === si;
  const adjacent = Math.abs(oi - si) === 1;
  return {
    weight: 1,
    points: same ? 1 : adjacent ? 0.5 : 0,
    matched: same ? ["Même rythme de vie"] : [],
    explanation: [],
  };
}

function evalLanguages(owner: AffinityOwnerInput, sitter: AffinitySitterInput): CriterionEval | null {
  const o = toArray(owner.languages);
  const s = toArray(sitter.languages);
  if (o.length === 0 || s.length === 0) return null;
  const inter = o.filter((l) => s.includes(l));
  return {
    weight: 1,
    points: inter.length > 0 ? 1 : 0,
    matched: inter.length > 0 ? ["Langue commune"] : [],
    explanation: [],
  };
}

function evalInterests(owner: AffinityOwnerInput, sitter: AffinitySitterInput): CriterionEval | null {
  const o = toArray(owner.interests);
  const s = toArray(sitter.interests);
  if (o.length === 0 || s.length === 0) return null;
  const inter = o.filter((i) => s.includes(i));
  const points = inter.length >= 2 ? 1 : inter.length === 1 ? 0.5 : 0;
  return {
    weight: 1,
    points,
    matched: points > 0 ? [`${inter.length} intérêt${inter.length > 1 ? "s" : ""} commun${inter.length > 1 ? "s" : ""}`] : [],
    explanation: [],
  };
}

function evalAmbiance(owner: AffinityOwnerInput, sitter: AffinitySitterInput): CriterionEval | null {
  const tags = toArray(owner.home_ambiance).filter((t) =>
    (HOME_AMBIANCE_SCORED_TAGS as readonly string[]).includes(t)
  );
  if (tags.length === 0) return null;
  if (!sitter.life_pace && toArray(sitter.interests).length === 0) return null;

  const sitterPace = sitter.life_pace;
  const sitterInterests = new Set(toArray(sitter.interests));
  const hasOutdoorSport = (OUTDOOR_SPORT_INTERESTS as readonly string[]).some((i) => sitterInterests.has(i));
  const hasRuralInterest = (RURAL_INTERESTS as readonly string[]).some((i) => sitterInterests.has(i));

  let points = 0;
  let weight = 0;
  let anyGood = false;
  let anyBad = false;

  for (const tag of tags) {
    weight += 1;
    switch (tag) {
      case AMBIANCE_COCON:
      case AMBIANCE_CALME_POSE:
        if (sitterPace === PACE_CALME) { points += 1; anyGood = true; }
        else if (sitterPace === PACE_ACTIF) anyBad = true;
        else points += 0.5;
        break;
      case AMBIANCE_SPORTIF:
        if (sitterPace === PACE_ACTIF || hasOutdoorSport) { points += 1; anyGood = true; }
        else if (sitterPace === PACE_CALME) anyBad = true;
        else points += 0.5;
        break;
      case AMBIANCE_CAMPAGNE:
        if (sitterPace === PACE_ACTIF || hasRuralInterest) { points += 1; anyGood = true; }
        else if (sitterPace === PACE_CALME) anyBad = true;
        else points += 0.5;
        break;
      case AMBIANCE_FAMILLE:
        if (sitterPace === PACE_EQUILIBRE || sitterPace === PACE_ACTIF) { points += 1; anyGood = true; }
        else points += 0.5;
        break;
    }
  }

  const matched = anyGood && !anyBad ? ["Compatible avec l'ambiance de votre foyer"] : [];
  return { weight, points, matched, explanation: [] };
}

function evalSpecialNeeds(owner: AffinityOwnerInput, sitter: AffinitySitterInput): CriterionEval | null {
  const pets = toArray(owner.pets);
  const needsText = pets.map((p) => p.special_needs).filter(Boolean).join(" ; ");
  const skills = toArray(sitter.special_animal_skills);
  if (!needsText || skills.length === 0) return null;

  const text = normalizeFreeText(needsText);
  const skillSet = new Set(skills);
  const needed: typeof SPECIAL_NEED_SIGNALS = [];
  for (const sig of SPECIAL_NEED_SIGNALS) {
    if (sig.keywords.some((k) => text.includes(k))) needed.push(sig);
  }
  if (needed.length === 0) return null;

  const coveredCount = needed.filter((n) => skillSet.has(n.skill)).length;
  const ratio = coveredCount / needed.length;
  const points = ratio === 1 ? 1 : ratio > 0 ? 0.5 : 0;
  return {
    weight: 1,
    points,
    matched: points > 0 ? ["Compétent pour les besoins de vos animaux"] : [],
    explanation: points === 0 ? ["Ne déclare pas les compétences attendues par vos animaux"] : [],
  };
}

// ---------------------------------------------------------------------------
// Moteur
// ---------------------------------------------------------------------------

/**
 * Score d'affinité complet. Retourne TOUJOURS un résultat (jamais null) :
 * l'élimination n'existe pas ; `scoreReliable` et `displayed` informent
 * l'affichage du chiffre et du contexte, pas la présence dans une liste.
 */
export function computeAffinityResultFull(
  owner: AffinityOwnerInput,
  sitter: AffinitySitterInput,
  options?: ComputeOptions,
): AffinityResult {
  const thresholds: AffinityThresholds = {
    ...runtimeThresholds,
    ...(options?.thresholds ?? {}),
  };
  const mode = options?.mode ?? "list";

  // --- 1. Évaluer tous les critères ---
  const animals = evalAnimals(owner, sitter);
  const presence = evalPresence(owner, sitter);

  const criteria: CriterionEval[] = [
    animals.crit,
    presence,
    evalIdealProfile(owner, sitter),
    evalPace(owner, sitter),
    evalLanguages(owner, sitter),
    evalInterests(owner, sitter),
    evalAmbiance(owner, sitter),
    evalSpecialNeeds(owner, sitter),
  ].filter((c): c is CriterionEval => c != null);

  const matched: string[] = [];
  const explanation: string[] = [];
  for (const c of criteria) {
    const phrase = pickPhrase(c);
    if (phrase) {
      if (c.matched.includes(phrase)) matched.push(phrase);
      else explanation.push(phrase);
    }
    // Chips emphatiques espèces remarquables (2e phrase du critère animaux).
    for (const extra of c.matched.slice(1)) matched.push(extra);
  }

  // --- 2. Refus déclarés ---
  const blockedSensitivities = animals.blockedSensitivities;
  for (const sens of blockedSensitivities) {
    const phrase = SENSITIVITY_EXPLANATION[sens];
    if (phrase) explanation.push(phrase);
  }

  const notes: string[] = [];
  const acceptsPets = owner.accepts_sitter_pets;
  const acceptsChildren = owner.accepts_sitter_children;
  const petsRefused = acceptsPets === "no" && sitter.travels_with_own_animals === true;
  const childrenRefused = acceptsChildren === "no" && sitter.travels_with_children === true;
  if (petsRefused) explanation.push("Voyage avec ses animaux, que vous n'acceptez pas");
  if (childrenRefused) explanation.push("Voyage avec ses enfants, que vous n'acceptez pas");
  if (acceptsPets === "discuss" && sitter.travels_with_own_animals) {
    notes.push("Voyage avec ses animaux : à discuter");
  }
  if (acceptsChildren === "discuss" && sitter.travels_with_children) {
    notes.push("Voyage avec ses enfants : à discuter");
  }

  const hasDeclaredIncompatibility =
    blockedSensitivities.length > 0 || petsRefused || childrenRefused;

  // --- 3. Score normalisé (dénominateur dynamique) ---
  let points = 0;
  let maxPoints = 0;
  for (const c of criteria) {
    points += c.points;
    maxPoints += c.weight;
  }
  const evaluated = criteria.length;
  const score = maxPoints > 0 ? Math.round((points / maxPoints) * 100) : 0;

  const hardEvaluated = animals.crit != null || presence != null;
  const scoreReliable = evaluated >= thresholds.minCommonCriteria && hardEvaluated;

  // --- 4. Affichage du CHIFFRE (jamais une exclusion de liste) ---
  // Le chiffre ne s'affiche que s'il est fiable, sans incompatibilité
  // déclarée, sans zéro couverture animale et au-delà du seuil minimum.
  // Aucun de ces cas ne retire le gardien d'une liste : on trie, on
  // n'élimine jamais.
  const displayed =
    scoreReliable &&
    !hasDeclaredIncompatibility &&
    !animals.noCoverage &&
    score >= thresholds.minScorePercent;

  let hiddenReason: AffinityResult["hiddenReason"] = null;
  if (!displayed) {
    if (hasDeclaredIncompatibility) {
      hiddenReason = blockedSensitivities.length > 0
        ? "disqualified"
        : petsRefused
          ? "sitter_pets_not_accepted"
          : "sitter_children_not_accepted";
    } else if (animals.noCoverage) {
      // Pas un refus : absence d'expérience déclarée. Reste listé,
      // l'explication porte l'information.
      hiddenReason = "no_animal_species_match";
    } else if (!scoreReliable) {
      hiddenReason = hardEvaluated ? "too_few_criteria" : "no_hard_criterion";
    } else {
      hiddenReason = "below_threshold";
    }
  }

  // --- 5. Distribution : on respecte les refus déclarés, et seulement ça ---
  const distributable = mode === "list" ? true : !hasDeclaredIncompatibility;

  return {
    score,
    total: evaluated,
    matched,
    explanation,
    notes,
    displayed,
    hiddenReason,
    scoreReliable,
    hasDeclaredIncompatibility,
    distributable,
  };
}

/**
 * Compat historique. Avant le lot affinité, cette fonction retournait `null`
 * quand le score était masqué, ce qui retirait le gardien de plusieurs listes.
 * Doctrine actuelle : ON TRIE, ON N'ÉLIMINE JAMAIS ⇒ elle retourne désormais
 * toujours le résultat. Les consommateurs qui doivent respecter des refus
 * déclarés lisent `result.distributable` / `result.hasDeclaredIncompatibility`.
 */
export function computeAffinityScore(
  owner: AffinityOwnerInput,
  sitter: AffinitySitterInput,
  options?: ComputeOptions,
): AffinityResult {
  return computeAffinityResultFull(owner, sitter, options);
}
