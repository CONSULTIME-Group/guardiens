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
 * Côté edge, ce module remplace l'ancien moteur SQL `calculate_affinity_score_pg`,
 * DÉPRÉCIÉ mais CONSERVÉ en base (commentaire SQL posé sur la fonction, aucun
 * DROP de fonction ni de colonne). Un même couple produit le même score dans
 * l'app et dans les emails. La parité des ENTRÉES (16 champs gardien, 11
 * champs propriétaire, sur chaque surface) est verrouillée par
 * `src/lib/__tests__/affinity-input-parity.test.ts`.
 *
 * RÈGLE DES DEUX CÔTÉS (décision de Jérémie, 20/08/2026) : un critère n'est
 * SCORABLE que s'il existe des DEUX côtés. Ce qui n'existe que d'un côté
 * (préférences « Étudiant·e » / « Indépendant·e », tags d'environnement) est
 * DESCRIPTIF : affiché tel quel, jamais présenté comme un critère de
 * matching, et on n'ajoute PAS un champ au formulaire gardien pour le rendre
 * bilatéral. La classification de chaque valeur (scorable par un chemin
 * identifié, ou explicitement descriptive) est verrouillée par
 * `src/lib/__tests__/affinity-exhaustiveness.test.ts` : aucune valeur
 * persistée ne doit tomber en silence.
 *
 * RÈGLE DES LIBELLÉS (décision de Jérémie, 21/08/2026) : chaque phrase
 * produite par le moteur NOMME LA CHOSE CONCRÈTE issue des données du
 * couple. « Expérience avec vos animaux » est interdit, on écrit « A déjà
 * gardé des chiens et des chats ». « Même rythme de vie » est interdit, on
 * écrit « Rythme calme, comme vous ». Jamais de libellé générique qui
 * pourrait s'appliquer à n'importe quel couple. Verrouillé par
 * `src/lib/__tests__/affinity-labels-concrete.test.ts`, qui injecte des
 * valeurs sentinelles et exige de les retrouver dans les phrases.
 *
 * RÈGLE DE LA DEMI-PORTION (décision de Jérémie, 21/08/2026) : une chip
 * positive n'apparaît que si le critère rapporte au moins la moitié de
 * son poids. En dessous, la phrase passe dans les freins, elle reste
 * affichée mais dite pour ce qu'elle est. Pour la distance, règle plus
 * stricte : au-delà de 60 km, toujours un frein, même au palier 0,5.
 *
 * UNE CHIP PAR CRITÈRE (décision de Jérémie, 21/08/2026) : chaque critère
 * produit au maximum une phrase positive. Ambiance, intérêts et espèces
 * agrègent leurs correspondances en une seule phrase (« Campagne, calme
 * et cocooning, comme vous »). Un critère qui pèse 1 sur 11 n'occupe pas
 * la moitié de l'infobulle.
 */

import {
  PACE_ORDER,
  PRESENCE_100,
  PRESENCE_NO_REQUIREMENT,
  PRESENCE_REMOTE_OK,
  PRESENCE_SHORT_ABSENCES,
  AVAILABILITY_TO_WORK,
  LIFESTYLE_ACTIF_TAGS,
  LIFESTYLE_CALME_TAGS,
  LIFESTYLE_SPORTIF_TAG,
  LIFESTYLE_FAMILLE_TAG,
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
  SPECIES_LABEL_PLURAL,

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
  LANGUAGE_FRENCH_NORMALIZED,
  canonicalAmbianceTag,
  PREF_SITTER_EXP_EXPERIENCED,
  PREF_SITTER_EXP_BEGINNER,
  PREF_SITTER_WORK_REMOTE,
  PREF_SITTER_DESCRIPTIVE,
  PREF_SITTER_NO_PREFERENCE,
  EXPERIENCE_BEGINNER,
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
  /** `properties.car_required` : voiture indispensable sur place (critère dur). */
  car_required?: boolean | null;
  /**
   * Distance réelle du couple en km (9e critère, poids 1, décision du
   * 21/08/2026). Le moteur est pur et ne connaît pas les coordonnées :
   * chaque surface qui a déjà calculé la distance DOIT la passer ici.
   * null ou absent = critère hors dénominateur (jamais pénalisant).
   */
  distance_km?: number | null;
}

export interface AffinitySitterInput {
  animal_types?: string[] | null;
  life_pace?: string | null;
  /** Tags lifestyle (506 profils) : source PRINCIPALE du rythme de vie. */
  lifestyle?: string[] | null;
  languages?: string[] | null;
  interests?: string[] | null;
  work_during_sit?: string | null;
  /** Repli de work_during_sit quand celui-ci est vide (155 profils). */
  availability_during?: string | null;
  sensitivities?: string[] | null;
  /** En base : TEXT singulier ("Solo", "Couple", "Famille"…). Accepte aussi un tableau. */
  sitter_type?: string | string[] | null;
  /**
   * Niveau d'expérience déclaré (« Débutant », « 1-3 ans », « 3-5 ans »,
   * « 5+ ans »). Scoré par le critère profil idéal (chemins « expérimenté »
   * et « débutant motivé », règle des deux côtés, 20/08/2026).
   */
  experience_years?: string | null;
  travels_with_children?: boolean | null;
  travels_with_own_animals?: boolean | null;
  /** Compétences spéciales (médicaments, réactifs, seniors…). */
  special_animal_skills?: string[] | null;
  /**
   * Acceptation explicite chevaux / animaux de ferme. RÈGLE BOOLÉENS : false
   * signifie « jamais répondu » (défaut de schéma), jamais « non ». Ce champ
   * ne peut être qu'un bonus, JAMAIS une porte : la source de vérité pour les
   * espèces est `animal_types` (84 gardiens déclarent Chevaux, 122 Animaux de
   * ferme, contre 39 avec farm_animals_ok à true).
   */
  farm_animals_ok?: boolean | null;
  /** Véhicule déclaré (true = déclaration ; false = non renseigné, neutre). */
  has_vehicle?: boolean | null;
  /** Permis déclaré : compte comme mobilité pour le critère véhicule. */
  has_license?: boolean | null;
}

/**
 * `hiddenReason` est LEGACY : il explique pourquoi le CHIFFRE ou le CONTEXTE
 * ne s'affiche pas, jamais pourquoi un profil serait retiré d'une liste.
 */
/**
 * Phrase positive enrichie de son critère d'origine (poids, points).
 * Permet aux surfaces de classement de choisir les chips les plus
 * significatives (tri par poids) au lieu des premières dans l'ordre fixe
 * d'évaluation. `matched` reste la liste de phrases, inchangée.
 */
export interface MatchedCriterion {
  key: AffinityCriterionKey;
  weight: number;
  points: number;
  phrase: string;
}

export interface AffinityResult {
  score: number;
  total: number;
  /** Raisons positives (chips vertes), en voix produit. */
  matched: string[];
  /** Les mêmes phrases que `matched`, avec le poids de leur critère. */
  matchedDetailed: MatchedCriterion[];
  /** Freins factuels, traduits pour un humain. Jamais d'identifiant technique. */
  explanation: string[];
  /** Notes « à discuter » (ex : animaux accompagnants à convenir). */
  notes: string[];
  /** Affichage contextuel hérité (chip vs anneau…). Ne masque jamais une liste. */
  displayed: boolean;
  hiddenReason:
    | "disqualified"
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
  /**
   * Confiance du score : poids réellement évalué / poids maximal possible
   * pour ce couple (0..1). Un profil qui ne déclare rien a une confiance
   * faible : ses critères défavorables disparaissent du dénominateur au
   * lieu de le pénaliser, la confiance corrige cela au CLASSEMENT.
   */
  confidence: number;
  /**
   * Score de TRI = score brut × confiance (défaut 1b, décision du
   * 20/08/2026). C'est LUI qui ordonne toutes les listes (Top 3, recherche,
   * candidatures, digest). Depuis le 23/08/2026 c'est aussi le chiffre
   * AFFICHÉ côté propriétaire (alignement chiffre/tri) ; côté gardien, le
   * chiffre affiché reste le score brut (règle 11 : pas de chiffre punitif).
   */
  sortScore: number;
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

/** « a et b » / « a, b et c » (règle des libellés : listes lisibles). */
function joinFr(items: string[]): string {
  if (items.length <= 1) return items[0] ?? "";
  return `${items.slice(0, -1).join(", ")} et ${items[items.length - 1]}`;
}

/** Libellés FR pluriels des espèces, dans l'ordre donné. */
function speciesLabels(species: Iterable<string>): string[] {
  return Array.from(species).map((s) => SPECIES_LABEL_PLURAL[s] ?? s);
}

/** Première lettre en capitale, le reste inchangé. */
function capitalizeFirst(s: string): string {
  return s.length === 0 ? s : s[0].toUpperCase() + s.slice(1);
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
    const breedUnknown = pet.breed == null || normalizeFreeText(pet.breed) === "";
    const applicable = (SENSITIVITY_BY_SPECIES[canon] ?? []).filter((sens) => {
      if (!sitterSens.has(sens)) return false;
      if (canon === "dog" && sens === SENS_GRANDS_CHIENS) {
        // Prudence : race non renseignée ⇒ on respecte le refus déclaré.
        return breedUnknown || breedMatches(pet.breed, LARGE_DOG_BREEDS);
      }
      if (canon === "dog" && sens === SENS_CHIENS_CATEGORISES) {
        return breedUnknown || breedMatches(pet.breed, CATEGORIZED_DOG_BREEDS);
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

/** Clés stables des 10 critères, utilisées par le diagnostic de dispersion. */
export type AffinityCriterionKey =
  | "animals"
  | "presence"
  | "vehicle"
  | "ideal_profile"
  | "pace"
  | "languages"
  | "interests"
  | "ambiance"
  | "special_needs"
  | "distance";

interface KeyedCriterion extends CriterionEval {
  key: AffinityCriterionKey;
}

/** Extrait diagnostic d'un critère (poids déclaré, points obtenus). */
export interface AffinityCriterionBreakdown {
  key: AffinityCriterionKey;
  weight: number;
  points: number;
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
): { crit: CriterionEval | null; blockedSensitivities: string[] } {
  const pets = toArray(owner.pets);
  const ownerSpecies = new Set<string>();
  for (const p of pets) {
    const canon = SPECIES_NORMALIZE[normalizeFreeText(p.species)];
    if (canon) ownerSpecies.add(canon);
  }
  // House-sitting sans animaux : garde légitime. Le critère sort du
  // dénominateur, ni bonus ni malus, et le couple reste évaluable.
  if (ownerSpecies.size === 0) {
    return { crit: null, blockedSensitivities: [] };
  }

  // Les refus déclarés (sensibilités) sont remontés même si le gardien n'a
  // pas déclaré ses espèces : un refus reste un refus.
  const { covered, blockedSensitivities } = coveredSpecies(owner, sitter);

  // Gardien sans espèces déclarées : critère non évalué (hors dénominateur,
  // jamais pénalisant). Les sensibilités ci-dessus restent prises en compte.
  const sitterDeclares = toArray(sitter.animal_types).length > 0;
  if (!sitterDeclares) {
    return { crit: null, blockedSensitivities };
  }

  // Pondération par espèce (rareté × contrainte). Source : animal_types,
  // jamais farm_animals_ok (booléen à false par défaut, voir règle booléens).
  let wMatch = 0;
  let wTotal = 0;
  for (const s of ownerSpecies) {
    const w = SPECIES_MATCH_WEIGHT[s] ?? 1;
    wTotal += w;
    if (covered.has(s)) wMatch += w;
  }
  const coverageRatio = wTotal > 0 ? wMatch / wTotal : 0;
  const points = 2 * coverageRatio;

  // RÈGLE DES LIBELLÉS : la phrase nomme les espèces, jamais de générique.
  const coveredOwner = new Set([...ownerSpecies].filter((s) => covered.has(s)));
  const missingOwner = new Set([...ownerSpecies].filter((s) => !covered.has(s)));
  const crit: CriterionEval = { weight: 2, points, matched: [], explanation: [] };
  if (wMatch >= wTotal && wTotal > 0) {
    // « A déjà gardé des chiens et des chats ».
    crit.matched.push(`A déjà gardé ${joinFr(speciesLabels(coveredOwner).map((l) => `des ${l}`))}`);
  } else if (wMatch > 0) {
    // « A déjà gardé vos chats, pas vos chiens ».
    crit.matched.push(
      `A déjà gardé ${joinFr(speciesLabels(coveredOwner).map((l) => `vos ${l}`))}, pas ${joinFr(speciesLabels(missingOwner).map((l) => `vos ${l}`))}`,
    );
  } else {
    // Moins pertinent, pas exclu : le gardien descend dans le tri.
    crit.explanation.push(
      `Ne déclare pas d'expérience avec ${joinFr(speciesLabels(ownerSpecies).map((l) => `les ${l}`))}`,
    );
  }

  return { crit, blockedSensitivities };
}

/**
 * Classement par DISPONIBILITÉ RÉELLE, lue dans le libellé français de
 * `WORK_DURING_SIT_OPTIONS`, jamais dans le nom de variable. Piège corrigé
 * le 23/08/2026 : « on_site » se lit en anglais comme « travaille sur site »
 * (absent), alors que son libellé est « Sur place, congés ou retraite », le
 * profil le PLUS présent de la plateforme (191 gardiens, 2e groupe le plus
 * nombreux). L'inversion lui donnait 0/2 là où un gardien absent en journée
 * obtenait 1/2. Verrou : src/lib/__tests__/presence-work-rank.test.ts, qui
 * compare ce rang à la disponibilité décrite par chaque libellé.
 */
export const WORK_RANK: Record<string, number> = {
  [WORK_OUT_DAYTIME]: 1, // « Absences en journée (travail extérieur) »
  [WORK_PARTIAL_REMOTE]: 2, // « Télétravail partiel, quelques sorties »
  [WORK_FLEXIBLE]: 3, // « Variable selon la garde »
  [WORK_FULL_REMOTE]: 4, // « Télétravail 100 %, présent toute la journée »
  [WORK_ON_SITE]: 4, // « Sur place, congés ou retraite » : présence maximale
};

/**
 * Critère véhicule (dur, opérationnel) : `properties.car_required` vaut true
 * sur 42 % des logements (39/92) et décide réellement de la faisabilité
 * d'une garde en zone isolée. Règle des booléens : true est une déclaration,
 * false est non renseigné (neutre).
 * Barème (décision de Jérémie, 23/08/2026) : véhicule déclaré = 2/2 avec la
 * chip ; permis SEUL sans véhicule = 1/2 avec une phrase honnête en frein
 * (17 gardiens mesurés, la chip « Véhiculé » était factuellement fausse pour
 * eux puisque la voiture est nécessaire SUR PLACE) ; rien de déclaré = critère
 * hors dénominateur (silence neutre), l'explication porte l'information.
 * `vehicle_type` est volontairement ignoré : renseigné sur 0 profil sur 1 029.
 */
function evalVehicle(
  owner: AffinityOwnerInput,
  sitter: AffinitySitterInput,
): { crit: CriterionEval | null; explanation: string[] } {
  if (owner.car_required !== true) return { crit: null, explanation: [] };
  if (sitter.has_vehicle === true) {
    return {
      crit: {
        weight: 2,
        points: 2,
        matched: ["Véhiculé, comme vous le souhaitez"],
        explanation: [],
      },
      explanation: [],
    };
  }
  if (sitter.has_license === true) {
    // Demi-portion honnête : la phrase part dans les freins, JAMAIS en chip
    // positive. Dire « Véhiculé » à un propriétaire dont la garde exige une
    // voiture serait un mensonge produit.
    return {
      crit: {
        weight: 2,
        points: 1,
        matched: [],
        explanation: ["A le permis, sans véhicule déclaré"],
      },
      explanation: [],
    };
  }
  // Doctrine « le silence est neutre » (défaut 3, décision du 20/08/2026),
  // aligné sur evalAnimals : rien de déclaré ⇒ le critère sort du
  // dénominateur, AUCUNE pénalité. L'explication reste affichée, c'est
  // elle qui porte l'information, pas le score.
  return {
    crit: null,
    explanation: ["N'a pas déclaré de véhicule, alors qu'une voiture est nécessaire sur place"],
  };
}

function evalPresence(owner: AffinityOwnerInput, sitter: AffinitySitterInput): CriterionEval | null {
  const need = owner.presence_expected;
  // Colonne principale : work_during_sit (480 profils). Repli sur
  // availability_during (155 profils) quand le premier est vide.
  const work = sitter.work_during_sit
    ?? AVAILABILITY_TO_WORK[normalizeFreeText(sitter.availability_during)]
    ?? null;
  if (!need || !work) return null;
  if (PRESENCE_NO_REQUIREMENT.has(normalizeFreeText(need))) return null;
  // « 100% sur place » = le propriétaire est lui-même présent en continu :
  // le rythme de travail du gardien est sans objet, la présence est
  // compatible par construction POUR TOUT LE MONDE. Un critère satisfait
  // par construction ne discrimine rien : il sort du dénominateur comme un
  // critère non évaluable, et rien ne s'affiche (défaut 1a, 20/08/2026).
  if (need === PRESENCE_100) return null;

  const rank = WORK_RANK[work];
  if (rank == null) return null;

  // RÈGLE DES LIBELLÉS : le fait, pas l'adjectif. La phrase dépend de la
  // façon de travailler déclarée par le gardien, jamais d'une formule
  // générique du type « présence compatible ».
  const presenceFact: Record<string, string> = {
    [WORK_FULL_REMOTE]: "Télétravaille, donc présent en journée",
    [WORK_ON_SITE]: "Sur place toute la journée, en congés ou à la retraite",
    [WORK_PARTIAL_REMOTE]: "Télétravaille une partie de la semaine",
    [WORK_FLEXIBLE]: "En congés ou horaires flexibles pendant la garde",
  };
  // « on_site » n'est PAS une absence : son libellé est « Sur place, congés
  // ou retraite ». Ne jamais le remettre ici (inversion corrigée le
  // 23/08/2026, verrou presence-work-rank.test.ts).
  const absenceFact: Record<string, string> = {
    [WORK_OUT_DAYTIME]: "Absent en journée, présent matin et soir",
  };

  let points = 0;
  let matched: string | null = null;
  let explanation: string | null = null;

  switch (need) {
    case PRESENCE_REMOTE_OK:
      if (rank >= WORK_RANK[WORK_PARTIAL_REMOTE]) { points = 2; matched = presenceFact[work]; }
      else if (work === WORK_OUT_DAYTIME) { points = 1; explanation = absenceFact[work]; }
      else { points = 0; explanation = absenceFact[work] ?? "Absent en journée"; }
      break;
    case PRESENCE_SHORT_ABSENCES:
      // on_site (« Sur place, congés ou retraite ») est au niveau de
      // full_remote : présence maximale, 2/2 dans les deux branches.
      if (work === WORK_FULL_REMOTE || work === WORK_ON_SITE) { points = 2; matched = presenceFact[work]; }
      else if (work === WORK_PARTIAL_REMOTE || work === WORK_FLEXIBLE) { points = 1.5; matched = presenceFact[work]; }
      else if (work === WORK_OUT_DAYTIME) { points = 1; explanation = absenceFact[work]; }
      else { points = 0.5; explanation = absenceFact[work] ?? "Absent en journée"; }
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

/**
 * Critère profil idéal. RÈGLE DES DEUX CÔTÉS : seules les préférences qui
 * ont un équivalent déclarable côté gardien sont scorables. Quatre chemins :
 *  - correspondance souple avec `sitter_type` (Couple, Famille, Retraité·e…) ;
 *  - « Gardien·ne expérimenté·e » via `experience_years` déclaré, hors
 *    « Débutant » (toute autre valeur déclarée qualifie) ;
 *  - « Débutant·e motivé·e » via `experience_years` = « Débutant » EXPLICITE :
 *    le silence n'est pas débutant, on ne récompense pas le vide ;
 *  - « Télétravailleur·euse » via `work_during_sit` (même repli sur
 *    `availability_during` que le critère présence).
 * « Sans préférence » / « no_preference » : le propriétaire n'exprime rien,
 * le critère sort du dénominateur. « Étudiant·e » et « Indépendant·e » sont
 * descriptives (affichées sur la fiche, jamais scorées).
 * Le critère n'entre au dénominateur que si au moins une préférence
 * scorable dispose de son champ gardien renseigné.
 */
function evalIdealProfile(owner: AffinityOwnerInput, sitter: AffinitySitterInput): CriterionEval | null {
  const norm = (s: string) => normalizeFreeText(s);
  const descriptive = new Set(PREF_SITTER_DESCRIPTIVE.map(norm));
  const scorable = toArray(owner.preferred_sitter_types).filter(
    (t) => !PREF_SITTER_NO_PREFERENCE.has(norm(t)) && !descriptive.has(norm(t)),
  );
  if (scorable.length === 0) return null;

  const actual = typeof sitter.sitter_type === "string"
    ? toArray([sitter.sitter_type])
    : toArray(sitter.sitter_type);
  const experience = norm(sitter.experience_years);
  const work = sitter.work_during_sit
    ?? AVAILABILITY_TO_WORK[norm(sitter.availability_during)]
    ?? null;

  const npExperienced = norm(PREF_SITTER_EXP_EXPERIENCED);
  const npBeginner = norm(PREF_SITTER_EXP_BEGINNER);
  const npRemote = norm(PREF_SITTER_WORK_REMOTE);

  // RÈGLE DES LIBELLÉS : la phrase nomme le type de gardien qui matche,
  // jamais « Correspond à votre profil idéal ».
  let anyMaterial = false;
  let satisfied = false;
  let matchedPhrase: string | null = null;
  for (const pref of scorable) {
    const np = norm(pref);
    if (np === npExperienced) {
      if (!experience) continue;
      anyMaterial = true;
      if (experience !== EXPERIENCE_BEGINNER) {
        satisfied = true;
        matchedPhrase = matchedPhrase ?? "Gardien expérimenté, comme vous le demandez";
      }
    } else if (np === npBeginner) {
      if (!experience) continue;
      anyMaterial = true;
      if (experience === EXPERIENCE_BEGINNER) {
        satisfied = true;
        matchedPhrase = matchedPhrase ?? "Débutant motivé, comme vous le demandez";
      }
    } else if (np === npRemote) {
      if (!work) continue;
      anyMaterial = true;
      if (work === WORK_FULL_REMOTE || work === WORK_PARTIAL_REMOTE) {
        satisfied = true;
        matchedPhrase = matchedPhrase ?? "Télétravailleur, comme vous le souhaitez";
      }
    } else {
      // Correspondance souple : « Retraité·e » matche « Retraité·e voyageur·euse ».
      if (actual.length === 0) continue;
      anyMaterial = true;
      const hit = actual.find((a) => {
        const na = norm(a);
        return na === np || na.includes(np) || np.includes(na);
      });
      if (hit) {
        satisfied = true;
        matchedPhrase = matchedPhrase ?? `${hit}, comme vous le souhaitez`;
      }
    }
  }
  if (!anyMaterial) return null;
  return {
    weight: 1,
    points: satisfied ? 1 : 0,
    matched: satisfied && matchedPhrase ? [matchedPhrase] : [],
    explanation: [],
  };
}

/**
 * Rythme de vie du gardien. Colonne principale : `lifestyle` (tags, 506
 * profils) ; repli sur `life_pace` (385 profils). Union réelle : 618.
 * Tags actifs sans tags calmes ⇒ actif ; l'inverse ⇒ calme ; mixte ou autre
 * combinaison non vide ⇒ équilibré.
 */
export function resolveSitterPace(sitter: AffinitySitterInput): string | null {
  const tags = toArray(sitter.lifestyle);
  if (tags.length > 0) {
    const hasActif = tags.some((t) => (LIFESTYLE_ACTIF_TAGS as readonly string[]).includes(t));
    const hasCalme = tags.some((t) => (LIFESTYLE_CALME_TAGS as readonly string[]).includes(t));
    if (hasActif && !hasCalme) return PACE_ACTIF;
    if (hasCalme && !hasActif) return PACE_CALME;
    return PACE_EQUILIBRE;
  }
  return sitter.life_pace ?? null;
}

function evalPace(owner: AffinityOwnerInput, sitter: AffinitySitterInput): CriterionEval | null {
  const o = owner.life_pace;
  const s = resolveSitterPace(sitter);
  if (!o || !s) return null;
  const oi = (PACE_ORDER as readonly string[]).indexOf(o);
  const si = (PACE_ORDER as readonly string[]).indexOf(s);
  if (oi < 0 || si < 0) return null;
  const same = oi === si;
  const adjacent = Math.abs(oi - si) === 1;
  // RÈGLE DES LIBELLÉS : « Rythme calme, comme vous », jamais « Même rythme
  // de vie ».
  const PACE_LABEL: Record<string, string> = {
    [PACE_CALME]: "calme",
    [PACE_EQUILIBRE]: "équilibré",
    [PACE_ACTIF]: "actif",
  };
  return {
    weight: 1,
    points: same ? 1 : adjacent ? 0.5 : 0,
    matched: same ? [`Rythme ${PACE_LABEL[o] ?? o}, comme vous`] : [],
    explanation: [],
  };
}

/**
 * Critère langues. Décision de Jérémie (23/08/2026) : le français ne
 * rapporte plus de points (déclaré par 99,5 % des gardiens et 100 % des
 * propriétaires, il ne discriminiait rien et gonflait tous les scores).
 * Seule une langue SECONDAIRE partagée est valorisée. Si l'intersection
 * hors français est vide, le critère sort du dénominateur (null, neutre,
 * jamais pénalisant) : deux francophones ne sont pas incompatibles, ils
 * sont simplement non discriminés sur ce critère.
 */
function evalLanguages(owner: AffinityOwnerInput, sitter: AffinitySitterInput): CriterionEval | null {
  const o = toArray(owner.languages);
  const s = toArray(sitter.languages);
  if (o.length === 0 || s.length === 0) return null;
  const inter = o.filter(
    (l) => s.includes(l) && normalizeFreeText(l) !== LANGUAGE_FRENCH_NORMALIZED,
  );
  if (inter.length === 0) return null;
  // « Parle espagnol, comme vous », jamais « Langue commune ».
  return {
    weight: 1,
    points: 1,
    matched: [`Parle ${joinFr(inter.map((l) => l.toLowerCase()))}, comme vous`],
    explanation: [],
  };
}

function evalInterests(owner: AffinityOwnerInput, sitter: AffinitySitterInput): CriterionEval | null {
  const o = toArray(owner.interests);
  const s = toArray(sitter.interests);
  if (o.length === 0 || s.length === 0) return null;
  const inter = o.filter((i) => s.includes(i));
  const points = inter.length >= 2 ? 1 : inter.length === 1 ? 0.5 : 0;
  // « Randonnée et cuisine en commun », jamais « 2 intérêts communs ».
  const named = inter.map((x, i) => (i === 0 ? capitalizeFirst(x) : x.toLowerCase()));
  return {
    weight: 1,
    points,
    matched: points > 0 ? [`${joinFr(named)} en commun`] : [],
    explanation: [],
  };
}

/**
 * Libellés courts des tags d'ambiance pour la chip agrégée. UNE CHIP PAR
 * CRITÈRE (défaut d'affichage 2, décision du 21/08/2026) : plusieurs tags
 * qui matchent fondent en une seule phrase, jamais une chip par tag.
 */
const AMBIANCE_CHIP_LABEL: Record<string, string> = {
  [AMBIANCE_COCON]: "cocooning",
  [AMBIANCE_CALME_POSE]: "calme",
  [AMBIANCE_SPORTIF]: "sport",
  [AMBIANCE_CAMPAGNE]: "campagne",
  [AMBIANCE_FAMILLE]: "foyer animé",
};

function evalAmbiance(owner: AffinityOwnerInput, sitter: AffinitySitterInput): CriterionEval | null {
  // Alias orthographiques résolus (Familial, Calme, Cosy) et doublons
  // dédupliqués : « Calme » + « Calme et posé » ne comptent qu'une fois.
  // Les tags d'environnement (HOME_AMBIANCE_DISPLAY_ONLY) sont descriptifs,
  // règle des deux côtés : filtrés ici, jamais scorés.
  const tags = Array.from(new Set(
    toArray(owner.home_ambiance)
      .map(canonicalAmbianceTag)
      .filter((t) => (HOME_AMBIANCE_SCORED_TAGS as readonly string[]).includes(t)),
  ));
  if (tags.length === 0) return null;

  const sitterPace = resolveSitterPace(sitter);
  const lifestyleTags = new Set(toArray(sitter.lifestyle));
  const sitterInterests = new Set(toArray(sitter.interests));
  if (!sitterPace && sitterInterests.size === 0 && lifestyleTags.size === 0) return null;

  const hasOutdoorSport =
    (OUTDOOR_SPORT_INTERESTS as readonly string[]).some((i) => sitterInterests.has(i)) ||
    lifestyleTags.has(LIFESTYLE_SPORTIF_TAG);
  const hasRuralInterest = (RURAL_INTERESTS as readonly string[]).some((i) => sitterInterests.has(i));

  let points = 0;
  let anyGood = false;
  let anyBad = false;
  // RÈGLE DES LIBELLÉS : la phrase nomme les tags d'ambiance qui matchent,
  // jamais « Compatible avec l'ambiance de votre foyer ».
  const chipLabels: string[] = [];

  for (const tag of tags) {
    switch (tag) {
      case AMBIANCE_COCON:
        if (sitterPace === PACE_CALME) { points += 1; anyGood = true; chipLabels.push(AMBIANCE_CHIP_LABEL[tag]); }
        else if (sitterPace === PACE_ACTIF) anyBad = true;
        else points += 0.5;
        break;
      case AMBIANCE_CALME_POSE:
        if (sitterPace === PACE_CALME) { points += 1; anyGood = true; chipLabels.push(AMBIANCE_CHIP_LABEL[tag]); }
        else if (sitterPace === PACE_ACTIF) anyBad = true;
        else points += 0.5;
        break;
      case AMBIANCE_SPORTIF:
        if (sitterPace === PACE_ACTIF || hasOutdoorSport) { points += 1; anyGood = true; chipLabels.push(AMBIANCE_CHIP_LABEL[tag]); }
        else if (sitterPace === PACE_CALME) anyBad = true;
        else points += 0.5;
        break;
      case AMBIANCE_CAMPAGNE:
        // « Campagne » décrit le LIEU, pas le TEMPO (défaut remonté par
        // Jérémie, 23/08/2026) : un gardien calme n'est pas incompatible
        // avec une maison à la campagne. Pas de branche anyBad ici, aligné
        // sur « Famille animée » : l'ensemble des tags qui lèvent anyBad
        // dans ce switch doit rester strictement égal aux clés de
        // HOME_AMBIANCE_CONFLICTS (verrou : ambiance-engine-conflicts.test.ts).
        if (sitterPace === PACE_ACTIF || hasRuralInterest) { points += 1; anyGood = true; chipLabels.push(AMBIANCE_CHIP_LABEL[tag]); }
        else points += 0.5;
        break;
      case AMBIANCE_FAMILLE:
        if (sitterPace === PACE_EQUILIBRE || sitterPace === PACE_ACTIF) { points += 1; anyGood = true; chipLabels.push(AMBIANCE_CHIP_LABEL[tag]); }
        else points += 0.5;
        break;
    }
  }

  const matched =
    anyGood && !anyBad && chipLabels.length > 0
      ? [`${capitalizeFirst(joinFr(chipLabels))}, comme vous`]
      : [];
  // Poids FIXE 1, comme les autres critères mous (défaut 2, décision du
  // 20/08/2026) : un propriétaire qui coche beaucoup de tags exprime une
  // ouverture, pas une exigence plusieurs fois plus forte. Les points sont
  // la MOYENNE des scores par tag, jamais leur somme : l'ambiance ne peut
  // plus peser plus lourd que les animaux.
  return { weight: 1, points: points / tags.length, matched, explanation: [] };
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

  const covered = needed.filter((n) => skillSet.has(n.skill));
  const ratio = covered.length / needed.length;
  const points = ratio === 1 ? 1 : ratio > 0 ? 0.5 : 0;
  // RÈGLE DES LIBELLÉS : la phrase nomme la compétence couverte.
  const lowerFirst = (s: string) => (s.length === 0 ? s : s[0].toLowerCase() + s.slice(1));
  return {
    weight: 1,
    points,
    matched: points > 0
      ? [`Compétent pour : ${joinFr(covered.map((n) => lowerFirst(n.skill)))}`]
      : [],
    explanation: points === 0
      ? [`Ne déclare pas la compétence attendue : ${joinFr(needed.map((n) => lowerFirst(n.skill)))}`]
      : [],
  };
}

/**
 * 9e critère, distance réelle du couple (décision de Jérémie, 21/08/2026).
 * « Près de chez vous » est la promesse du produit : 12 km et 90 km ne sont
 * pas le même service. Poids 1, jamais plus. Jamais 0 point : un gardien
 * qui apparaît à 120 km a déclaré un rayon qui le couvre, il ne triche pas.
 * null (hors dénominateur) si la distance n'est pas connue.
 */
function evalDistance(owner: AffinityOwnerInput): CriterionEval | null {
  const km = owner.distance_km;
  if (km == null || !Number.isFinite(km) || km < 0) return null;
  const points = km <= 30 ? 1 : km <= 60 ? 0.75 : km <= 100 ? 0.5 : 0.25;
  const label = `À ${Math.round(km)} km de chez vous`;
  // RÈGLE DISTANCE (décision du 21/08/2026) : au-delà de 60 km, la distance
  // n'est JAMAIS un point fort, même au palier 0,5 qui atteint la
  // demi-portion. La phrase devient un frein, formulé comme tel.
  if (km > 60) {
    return { weight: 1, points, matched: [], explanation: [`${label}, le trajet est long`] };
  }
  return { weight: 1, points, matched: [label], explanation: [] };
}

/**
 * Poids maximal atteignable pour CE couple, déterminé par les seules
 * données du propriétaire : chaque critère compte s'il POURRAIT être évalué
 * avec un gardien qui aurait tout déclaré. Sert au dénominateur de la
 * confiance (défaut 1b, décision du 20/08/2026). Miroir strict des
 * conditions d'entrée de chaque critère, côté propriétaire uniquement.
 */
export function maxPossibleWeight(owner: AffinityOwnerInput): number {
  let w = 0;
  // Animaux : 2 si le propriétaire a au moins une espèce connue.
  const species = new Set<string>();
  for (const p of toArray(owner.pets)) {
    const canon = SPECIES_NORMALIZE[normalizeFreeText(p.species)];
    if (canon) species.add(canon);
  }
  if (species.size > 0) w += 2;
  // Présence : 2 uniquement si l'exigence est discriminante. « 100% sur
  // place » est exclu : compatible par construction, il ne note rien.
  const need = owner.presence_expected;
  if (need === PRESENCE_REMOTE_OK || need === PRESENCE_SHORT_ABSENCES) w += 2;
  // Véhicule : 2 si la voiture est requise sur place.
  if (owner.car_required === true) w += 2;
  // Profil idéal : 1 uniquement s'il reste une préférence SCORABLE après
  // retrait de « Sans préférence » et des valeurs descriptives (miroir
  // strict de la condition propriétaire d'evalIdealProfile).
  const descriptivePrefs = new Set(PREF_SITTER_DESCRIPTIVE.map((d) => normalizeFreeText(d)));
  const scorablePrefs = toArray(owner.preferred_sitter_types).filter(
    (t) => !PREF_SITTER_NO_PREFERENCE.has(normalizeFreeText(t)) && !descriptivePrefs.has(normalizeFreeText(t)),
  );
  if (scorablePrefs.length > 0) w += 1;
  if (owner.life_pace && (PACE_ORDER as readonly string[]).includes(owner.life_pace)) w += 1;
  // Langues : 1 uniquement si le propriétaire déclare une langue SECONDAIRE
  // (miroir d'evalLanguages, décision du 23/08/2026 : le français seul ne
  // peut jamais produire un critère évaluable, il ne gonfle pas la confiance).
  if (toArray(owner.languages).some((l) => normalizeFreeText(l) !== LANGUAGE_FRENCH_NORMALIZED)) w += 1;
  if (toArray(owner.interests).length > 0) w += 1;
  if (toArray(owner.home_ambiance).map(canonicalAmbianceTag).some((t) => (HOME_AMBIANCE_SCORED_TAGS as readonly string[]).includes(t))) w += 1;
  // Besoins spéciaux : 1 si le texte des besoins matche un signal connu.
  const needsText = toArray(owner.pets).map((p) => p.special_needs).filter(Boolean).join(" ; ");
  if (needsText) {
    const text = normalizeFreeText(needsText);
    if (SPECIAL_NEED_SIGNALS.some((sig) => sig.keywords.some((k) => text.includes(k)))) w += 1;
  }
  // Distance : 1 si la distance du couple est connue (miroir d'evalDistance).
  const km = owner.distance_km;
  if (km != null && Number.isFinite(km) && km >= 0) w += 1;
  return w;
}

// ---------------------------------------------------------------------------
// Moteur
// ---------------------------------------------------------------------------

/**
 * Évaluation unique des 10 critères, factorisée entre le score complet et le
 * diagnostic de dispersion. Toute modification de la liste des critères se
 * fait ICI, jamais en dupliquant.
 */
function evaluateCriteria(
  owner: AffinityOwnerInput,
  sitter: AffinitySitterInput,
): {
  criteria: KeyedCriterion[];
  blockedSensitivities: string[];
  vehicleExplanation: string[];
} {
  const animals = evalAnimals(owner, sitter);
  const presence = evalPresence(owner, sitter);
  const vehicle = evalVehicle(owner, sitter);
  const raw: Array<{ key: AffinityCriterionKey; crit: CriterionEval | null }> = [
    { key: "animals", crit: animals.crit },
    { key: "presence", crit: presence },
    { key: "vehicle", crit: vehicle.crit },
    { key: "ideal_profile", crit: evalIdealProfile(owner, sitter) },
    { key: "pace", crit: evalPace(owner, sitter) },
    { key: "languages", crit: evalLanguages(owner, sitter) },
    { key: "interests", crit: evalInterests(owner, sitter) },
    { key: "ambiance", crit: evalAmbiance(owner, sitter) },
    { key: "special_needs", crit: evalSpecialNeeds(owner, sitter) },
    { key: "distance", crit: evalDistance(owner) },
  ];
  const criteria = raw
    .filter((r): r is { key: AffinityCriterionKey; crit: CriterionEval } => r.crit != null)
    .map((r) => ({ ...r.crit, key: r.key }));
  return {
    criteria,
    blockedSensitivities: animals.blockedSensitivities,
    vehicleExplanation: vehicle.explanation,
  };
}

/**
 * Diagnostic (mesures, jamais l'affichage) : les critères réellement évalués
 * pour ce couple, avec poids déclaré et points obtenus. Un critère absent de
 * la liste est non évaluable sur ce couple (hors dénominateur).
 */
export function computeAffinityCriteriaBreakdown(
  owner: AffinityOwnerInput,
  sitter: AffinitySitterInput,
): AffinityCriterionBreakdown[] {
  return evaluateCriteria(owner, sitter).criteria.map(({ key, weight, points }) => ({
    key,
    weight,
    points,
  }));
}

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
  const { criteria, blockedSensitivities, vehicleExplanation } = evaluateCriteria(owner, sitter);

  const matched: string[] = [];
  const matchedDetailed: MatchedCriterion[] = [];
  const explanation: string[] = [];
  for (const c of criteria) {
    // RÈGLE DE LA DEMI-PORTION (décision du 21/08/2026) : la chip positive
    // exige au moins la moitié du poids du critère. En dessous, la même
    // phrase rejoint les freins : affichée, mais dite pour ce qu'elle est.
    // UNE CHIP PAR CRITÈRE : l'agrégation a lieu dans chaque critère
    // (ambiance, espèces, intérêts), seule la première phrase est retenue.
    const positive = c.points * 2 >= c.weight;
    const phrase = c.matched[0];
    if (phrase) {
      if (positive) {
        matched.push(phrase);
        matchedDetailed.push({ key: c.key, weight: c.weight, points: c.points, phrase });
      } else {
        explanation.push(phrase);
      }
    }
    explanation.push(...c.explanation);
  }
  // Frein véhicule hors critère : quand rien n'est déclaré, le critère sort
  // du dénominateur (silence neutre) mais l'information reste affichée.
  explanation.push(...vehicleExplanation);

  // --- 2. Refus déclarés ---
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

  // --- 3bis. Score de tri (défaut 1b, décision du 20/08/2026) ---
  // Un dénominateur dynamique récompense mécaniquement le profil vide : ses
  // critères défavorables disparaissent du calcul au lieu de le pénaliser,
  // et un 100 % construit sur un seul critère passait devant un 78 %
  // construit sur sept. Le CLASSEMENT utilise le score pondéré par la
  // confiance (poids réellement évalué / poids maximal possible pour ce
  // couple). Personne n'est éliminé : tout le monde reste dans la liste,
  // on trie mieux.
  //
  // ALIGNEMENT CHIFFRE/TRI (décision du 23/08/2026) : côté PROPRIÉTAIRE, le
  // chiffre affiché EST le sortScore, pour que l'ordre de la liste et les
  // pourcentages lus ne se contredisent jamais. Côté GARDIEN (sa propre
  // affinité avec une annonce), le chiffre affiché reste le score brut :
  // le pondéré pénaliserait en permanence un profil peu renseigné, ce que
  // la règle 11 interdit (le silence se signale par invitation, jamais par
  // un chiffre punitif). Le brut reste calculé et disponible partout.
  //
  // DÉFAUT DORMANT, noté pour mémoire (mesure du 20/08/2026) : tant que le
  // vivier du Top 3 filtrait sur identity_verified, un seul profil
  // totalement vide y était éligible, donc le défaut était invisible. Le
  // retrait de ce filtre le matin même a fait entrer 112 profils vides dans
  // le classement : avec l'ancien evalPresence (« 100% sur place » rendait
  // 2/2 à tout le monde), ils auraient tous obtenu 100 % affiché chez un
  // propriétaire à exigence « 100% sur place » et occupé le haut du
  // classement. Les deux changements (retrait du filtre identité et score
  // de tri pondéré par la confiance) devaient partir ensemble. Ne jamais
  // réintroduire l'un sans l'autre.
  const maxWeight = maxPossibleWeight(owner);
  const confidence = maxWeight > 0 ? Math.min(1, maxPoints / maxWeight) : 0;
  const sortScore = Math.round(score * confidence);

  const hardEvaluated = criteria.some((c) => c.key === "animals" || c.key === "presence" || c.key === "vehicle");
  const scoreReliable = evaluated >= thresholds.minCommonCriteria && hardEvaluated;

  // --- 4. Affichage du CHIFFRE (jamais une exclusion de liste) ---
  // Le chiffre ne s'affiche que s'il est fiable, sans incompatibilité
  // déclarée et au-delà du seuil minimum. Une couverture animale à zéro ne
  // masque plus le chiffre : le score bas trie le gardien plus bas,
  // l'explication porte l'information. Aucun de ces cas ne retire le gardien
  // d'une liste : on trie, on n'élimine jamais.
  const displayed =
    scoreReliable &&
    !hasDeclaredIncompatibility &&
    score >= thresholds.minScorePercent;

  let hiddenReason: AffinityResult["hiddenReason"] = null;
  if (!displayed) {
    if (hasDeclaredIncompatibility) {
      hiddenReason = blockedSensitivities.length > 0
        ? "disqualified"
        : petsRefused
          ? "sitter_pets_not_accepted"
          : "sitter_children_not_accepted";
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
    matchedDetailed,
    explanation,
    notes,
    displayed,
    hiddenReason,
    scoreReliable,
    hasDeclaredIncompatibility,
    distributable,
    confidence,
    sortScore,
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
