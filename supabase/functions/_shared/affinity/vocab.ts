/**
 * Vocabulaire d'affinité — SOURCE UNIQUE PARTAGÉE.
 *
 * Ce module vit dans `supabase/functions/_shared/affinity/` parce qu'il est
 * exécuté par DEUX runtimes : le client (Vite) et les fonctions edge (Deno).
 * `src/lib/affinityVocab.ts` n'est qu'une ré-exportation de ce fichier.
 * Il ne doit importer AUCUNE API navigateur ou Node.
 *
 * Toutes les chaînes magiques utilisées par le moteur de score
 * (`./score.ts`) sont déclarées ici, une seule fois.
 * Objectif : casser le couplage implicite entre le scoring et les
 * formulaires (onboarding, édition de profil) qui utilisent les mêmes
 * libellés. Si un jour une valeur de formulaire dérive, le test
 * `src/lib/__tests__/affinityVocab.test.ts` casse au lieu que le score
 * se dégrade en silence.
 *
 * RÈGLE : ne JAMAIS renommer ces valeurs sans mettre à jour à la fois
 * les formulaires (`src/lib/profileMatchingOptions.ts`) et la donnée
 * déjà persistée en base.
 */

// -------------------- Rythme de vie --------------------

export const PACE_CALME = "calme";
export const PACE_EQUILIBRE = "equilibre";
export const PACE_ACTIF = "actif";

/** Ordre canonique du rythme de vie (utilisé pour détecter l'adjacence). */
export const PACE_ORDER = [PACE_CALME, PACE_EQUILIBRE, PACE_ACTIF] as const;

// -------------------- Présence attendue (owner) --------------------

export const PRESENCE_100 = "100% sur place";
export const PRESENCE_REMOTE_OK = "Télétravail OK";
export const PRESENCE_SHORT_ABSENCES = "Absences courtes OK";

/** Valeurs de `owner.presence_expected` prises en compte par le scoring. */
export const PRESENCE_EXPECTED_VALUES = [
  PRESENCE_100,
  PRESENCE_REMOTE_OK,
  PRESENCE_SHORT_ABSENCES,
] as const;

/**
 * Valeurs persistées qui signifient « aucune exigence » : le critère
 * présence n'est alors pas évalué du tout (ni bonus, ni pénalité).
 * La chaîne vide est un résidu historique (132 lignes en base au 20/08/2026).
 */
export const PRESENCE_NO_REQUIREMENT = new Set(["", "absent", "none", "null"]);

// -------------------- Rythme de travail (sitter) --------------------

export const WORK_FULL_REMOTE = "full_remote";
export const WORK_PARTIAL_REMOTE = "partial_remote";
export const WORK_ON_SITE = "on_site";
export const WORK_OUT_DAYTIME = "out_daytime";
export const WORK_FLEXIBLE = "flexible";

/** Valeurs de `sitter.work_during_sit` prises en compte par le scoring. */
export const WORK_DURING_SIT_VALUES = [
  WORK_FULL_REMOTE,
  WORK_PARTIAL_REMOTE,
  WORK_ON_SITE,
  WORK_OUT_DAYTIME,
  WORK_FLEXIBLE,
] as const;

// -------------------- Ambiance du foyer (owner) --------------------

export const AMBIANCE_COCON = "Cocon casanier";
export const AMBIANCE_CALME_POSE = "Calme et posé";
export const AMBIANCE_SPORTIF = "Sportif outdoor";
export const AMBIANCE_CAMPAGNE = "Campagne";
export const AMBIANCE_FAMILLE = "Famille animée";

/** Tags d'ambiance dont le scoring sait tirer de l'information. */
export const HOME_AMBIANCE_SCORED_TAGS = [
  AMBIANCE_COCON,
  AMBIANCE_CALME_POSE,
  AMBIANCE_SPORTIF,
  AMBIANCE_CAMPAGNE,
  AMBIANCE_FAMILLE,
] as const;

/**
 * RÈGLE DES DEUX CÔTÉS (voir score.ts) : ces tags n'existent que côté
 * propriétaire, ils sont DESCRIPTIFS. Affichés sur la fiche pour que les
 * gardiens se projettent, JAMAIS scorés, jamais présentés comme un critère
 * de matching. Registre consommé par le test d'exhaustivité
 * (`src/lib/__tests__/affinity-exhaustiveness.test.ts`).
 */
export const HOME_AMBIANCE_DISPLAY_ONLY = [
  "Urbain",
  "Montagne",
  "Bord de mer",
  "Maison de vacances",
  "Invités fréquents",
] as const;

/**
 * Alias orthographiques persistés en base (mesurés le 20/08/2026 : Familial,
 * Calme, Cosy, 1 déclaration chacun). Clés normalisées via normalizeFreeText.
 * Même mécanisme que les alias de races.
 */
export const HOME_AMBIANCE_ALIASES: Record<string, string> = {
  familial: AMBIANCE_FAMILLE,
  calme: AMBIANCE_CALME_POSE,
  cosy: AMBIANCE_COCON,
};

/** Ramène un tag d'ambiance persisté à sa forme canonique (alias résolus). */
export function canonicalAmbianceTag(tag: string): string {
  return HOME_AMBIANCE_ALIASES[normalizeFreeText(tag)] ?? tag;
}

// -------------------- Profil idéal (owner) --------------------

/** Satisfait via `experience_years` déclaré, hors « Débutant ». */
export const PREF_SITTER_EXP_EXPERIENCED = "Gardien·ne expérimenté·e";
/** Satisfait UNIQUEMENT via `experience_years` = « Débutant » explicite. */
export const PREF_SITTER_EXP_BEGINNER = "Débutant·e motivé·e";
/** Satisfait via `work_during_sit` full_remote / partial_remote. */
export const PREF_SITTER_WORK_REMOTE = "Télétravailleur·euse";

/**
 * Valeur normalisée de « Débutant » dans `sitter_profiles.experience_years`.
 * Valeurs en base au 20/08/2026 : Débutant (37), 1-3 ans (52), 3-5 ans (26),
 * 5+ ans (48), vide (868).
 */
export const EXPERIENCE_BEGINNER = "debutant";

/**
 * RÈGLE DES DEUX CÔTÉS : ces préférences n'ont aucun équivalent côté gardien
 * (`sitter_type` ne connaît que Solo, Couple, Famille, Retraité). Elles sont
 * DESCRIPTIVES : visibles sur la fiche publique du propriétaire, jamais
 * scorées, et on ne crée PAS de champ gardien pour les rendre bilatérales
 * (45 déclarations en base au 20/08/2026, conservées).
 */
export const PREF_SITTER_DESCRIPTIVE = ["Étudiant·e", "Indépendant·e"] as const;

/**
 * « Sans préférence » (55 propriétaires) et le résidu technique
 * « no_preference » (1) : le propriétaire n'exprime rien, le critère profil
 * idéal sort du dénominateur ET de maxPossibleWeight. Clés normalisées.
 */
export const PREF_SITTER_NO_PREFERENCE = new Set(["sans preference", "no preference"]);

// -------------------- Langues --------------------

/**
 * Français, clé normalisée via normalizeFreeText. Décision de Jérémie
 * (23/08/2026) : le français ne rapporte plus de points au critère langues.
 * Mesuré : 393/395 gardiens et 101/101 propriétaires le déclarent, le
 * critère ne discriminiait rien et produisait une chip creuse
 * (« Parle français, comme vous », interdite par la règle des libellés).
 * Seule une langue SECONDAIRE partagée est valorisée. Question à rouvrir
 * quand le produit sera international.
 */
export const LANGUAGE_FRENCH_NORMALIZED = "francais";

// -------------------- Intérêts (sitter) --------------------

/** Intérêts "sportif outdoor" utilisés par le matching d'ambiance. */
export const OUTDOOR_SPORT_INTERESTS = [
  "Randonnée",
  "Course à pied",
  "Vélo",
  "Ski",
  "Sports nautiques",
] as const;

/** Intérêts "campagne" utilisés par le matching d'ambiance. */
export const RURAL_INTERESTS = ["Randonnée", "Jardinage"] as const;

// -------------------- Espèces animales --------------------

/**
 * Normalisation des libellés d'espèce vers un code canonique EN.
 * `pets.species` utilise des codes EN (dog, cat…) ; `sitter_profiles.animal_types`
 * utilise des libellés FR pluriels ("Chiens", "NAC"…). On ramène tout au
 * code EN pour intersecter.
 */
export const SPECIES_NORMALIZE: Record<string, string> = {
  dog: "dog", chien: "dog", chiens: "dog",
  cat: "cat", chat: "cat", chats: "cat",
  bird: "bird", oiseau: "bird", oiseaux: "bird",
  rodent: "rodent", rongeur: "rodent", rongeurs: "rodent",
  fish: "fish", poisson: "fish", poissons: "fish",
  reptile: "reptile", reptiles: "reptile",
  nac: "nac",
  horse: "horse", cheval: "horse", chevaux: "horse",
  farm_animal: "farm_animal",
  // normalizeFreeText supprime le underscore de "farm_animal" : sans cette
  // clé, l'espèce disparaissait silencieusement du croisement.
  "farm animal": "farm_animal",
  "animal de ferme": "farm_animal",
  "animaux de ferme": "farm_animal",
  tous: "all", all: "all",
};

// -------------------- Disponibilité (repli de la présence) --------------------

/**
 * Repli de `work_during_sit` (480 profils remplis) : `availability_during`
 * (155 profils, union réelle 492 au 20/08/2026). Clés normalisées via
 * normalizeFreeText (minuscules, sans accents, signes retirés).
 */
export const AVAILABILITY_TO_WORK: Record<string, string> = {
  "100 en conges": WORK_FULL_REMOTE,
  "en teletravail": WORK_FULL_REMOTE,
  flexible: WORK_FLEXIBLE,
};

// -------------------- Lifestyle (source principale du rythme gardien) --------------------

/**
 * `sitter_profiles.lifestyle` est un tableau de tags (506 profils remplis)
 * quand `life_pace` (385 profils) est une échelle à 3 valeurs. Union réelle :
 * 618 profils. Le moteur lit lifestyle en principal et replie sur life_pace
 * quand le tableau est vide.
 */
export const LIFESTYLE_SPORTIF_TAG = "Sportif / grandes balades";
export const LIFESTYLE_FAMILLE_TAG = "Famille";
/** Tags lifestyle qui signalent un rythme actif. */
export const LIFESTYLE_ACTIF_TAGS = [LIFESTYLE_SPORTIF_TAG, "Joueur"] as const;
/** Tags lifestyle qui signalent un rythme calme. */
export const LIFESTYLE_CALME_TAGS = ["Tranquille / casanier"] as const;

/** Ombrelle NAC : un gardien "NAC" couvre toutes ces espèces owner. */
export const NAC_UMBRELLA = ["rodent", "reptile", "bird", "nac"] as const;

/**
 * Pondération par espèce, fondée sur la rareté de l'offre et le niveau de
 * contrainte de la garde (lot affinité, août 2026) :
 *  - chien, chat (1) : socle, gestes universels ;
 *  - oiseau, rongeur, poisson (1,5) : contraintes réelles, protocoles simples ;
 *  - reptile, nac (2) : offre rare, matériel spécifique ;
 *  - cheval, animal de ferme (3) : manipulation, offre la plus rare.
 * Ces poids pondèrent le ratio de couverture du critère Animaux, pas le
 * poids du critère lui-même (qui reste 2).
 */
export const SPECIES_MATCH_WEIGHT: Record<string, number> = {
  dog: 1,
  cat: 1,
  bird: 1.5,
  rodent: 1.5,
  fish: 1.5,
  reptile: 2,
  nac: 2,
  horse: 3,
  farm_animal: 3,
};

/** Une espèce est « remarquable » (chip emphatique) si son poids dépasse le socle. */
export const SPECIES_REMARKABLE_THRESHOLD = 1.5;

/**
 * Libellés FR pluriels des espèces canoniques. RÈGLE DES LIBELLÉS
 * (21/08/2026) : chaque phrase du moteur nomme la chose concrète, ces
 * libellés servent à construire « A déjà gardé des chiens et des chats ».
 */
export const SPECIES_LABEL_PLURAL: Record<string, string> = {
  dog: "chiens",
  cat: "chats",
  bird: "oiseaux",
  rodent: "rongeurs",
  fish: "poissons",
  reptile: "reptiles",
  nac: "NAC",
  horse: "chevaux",
  farm_animal: "animaux de ferme",
};

/**
 * DÉPRÉCIÉ (21/08/2026) : le moteur ne l'utilise plus, la phrase principale
 * du critère animaux nomme désormais les espèces couvertes. Conservé pour
 * référence, ne pas réintroduire dans score.ts.
 *
 * Phrases de mise en avant par espèce remarquable (voix produit, côté owner).
 */
export const SPECIES_MATCH_PHRASE: Record<string, string> = {
  bird: "À l'aise avec les oiseaux",
  rodent: "À l'aise avec les rongeurs",
  fish: "À l'aise avec les poissons",
  reptile: "À l'aise avec les reptiles",
  nac: "À l'aise avec les NAC",
  horse: "A déjà gardé des chevaux",
  farm_animal: "A déjà gardé des animaux de ferme",
};

// -------------------- Sensibilités bloquantes --------------------

export const SENS_ALLERGIE_CHAT = "Allergie aux chats";
export const SENS_ALLERGIE_CHIEN = "Allergie aux chiens";
export const SENS_GRANDS_CHIENS = "Pas de très grands chiens";
export const SENS_CHIENS_CATEGORISES = "Pas de chiens catégorisés";
export const SENS_REPTILES = "Pas de reptiles";
export const SENS_NAC = "Pas de NAC";
export const SENS_CHEVAUX_FERME = "Pas de chevaux ou animaux de ferme";

/**
 * Libellés de sensibilités bloquantes par espèce (code canonique EN).
 * Si le gardien coche l'un des libellés listés pour une espèce présente
 * chez l'owner, c'est une incompatibilité DÉCLARÉE : jamais masquante en
 * liste (on trie, on n'élimine pas), toujours respectée en distribution.
 * Pour le chien, le croisement par race est fait dans le moteur :
 * SENS_GRANDS_CHIENS et SENS_CHIENS_CATEGORISES ne bloquent que si la
 * race déclarée de l'animal appartient à la liste correspondante.
 */
export const SENSITIVITY_BY_SPECIES: Record<string, string[]> = {
  cat: [SENS_ALLERGIE_CHAT],
  dog: [SENS_ALLERGIE_CHIEN, SENS_GRANDS_CHIENS, SENS_CHIENS_CATEGORISES],
  reptile: [SENS_REPTILES, SENS_NAC],
  rodent: [SENS_NAC],
  bird: [SENS_NAC],
  fish: [SENS_NAC],
  nac: [SENS_NAC],
  horse: [SENS_CHEVAUX_FERME],
  farm_animal: [SENS_CHEVAUX_FERME],
};

/** Ensemble plat de toutes les sensibilités bloquantes (utile pour tests). */
export const ALL_BLOCKING_SENSITIVITIES = Array.from(
  new Set(Object.values(SENSITIVITY_BY_SPECIES).flat()),
);

/**
 * Traduction produit de chaque sensibilité, lisible par un propriétaire.
 * JAMAIS d'identifiant technique à l'écran.
 */
export const SENSITIVITY_EXPLANATION: Record<string, string> = {
  [SENS_ALLERGIE_CHAT]: "A déclaré une allergie aux chats",
  [SENS_ALLERGIE_CHIEN]: "A déclaré une allergie aux chiens",
  [SENS_GRANDS_CHIENS]: "N'accepte pas les très grands chiens",
  [SENS_CHIENS_CATEGORISES]: "N'accepte pas les chiens catégorisés",
  [SENS_REPTILES]: "N'accepte pas les reptiles",
  [SENS_NAC]: "N'accepte pas les NAC",
  [SENS_CHEVAUX_FERME]: "N'accepte pas les chevaux ni les animaux de ferme",
};

// -------------------- Races de chiens (croisement sensibilités) --------------------

/** Normalise un texte libre (race) : minuscules, sans accents, espaces simples. */
export function normalizeFreeText(value?: string | null): string {
  if (!value) return "";
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9 ]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Races géantes / très grandes (« Pas de très grands chiens »).
 * Liste curée, normalisée (minuscules, sans accents). Le croisement se fait
 * par inclusion de sous-chaîne sur la race normalisée déclarée par l'owner.
 */
export const LARGE_DOG_BREEDS = [
  "dogue allemand",
  "grand danois",
  "saint-bernard",
  "saint bernard",
  "terre-neuve",
  "terre neuve",
  "leonberg",
  "mastiff",
  "bullmastiff",
  "dogue de bordeaux",
  "cane corso",
  "montagne des pyrenees",
  "patou",
  "berger du caucase",
  "kangal",
  "levrier irlandais",
  "irish wolfhound",
  "dogo argentin",
  "dogue du tibet",
] as const;

/**
 * Races catégorisées au sens de la loi française (catégories 1 et 2).
 * Inclut les variantes orthographiques courantes constatées en base
 * (ex : "American stafford terrier").
 */
export const CATEGORIZED_DOG_BREEDS = [
  "american stafford",
  "amstaff",
  "staffordshire terrier",
  "pitbull",
  "pit bull",
  "staffie",
  "mastiff",
  "boerbull",
  "tosa",
  "rottweiler",
] as const;

/** Vrai si la race déclarée appartient à la liste (inclusion normalisée). */
export function breedMatches(breed: string | null | undefined, list: readonly string[]): boolean {
  const b = normalizeFreeText(breed);
  if (!b) return false;
  return list.some((key) => b.includes(key));
}

// -------------------- Besoins spéciaux × compétences --------------------

/**
 * Signaux textuels reliant `pets.special_needs` (texte libre owner) aux
 * compétences déclarées du gardien (`special_animal_skills`, libellés fixes).
 * 8e critère du moteur (poids 1) : évalué seulement si les deux côtés ont
 * de la matière. Une compétence sans mot-clé fiable (ex : premiers secours)
 * n'entre pas dans cette table et reste neutre.
 */
export const SPECIAL_NEED_SIGNALS: { skill: string; keywords: string[] }[] = [
  {
    skill: "Administration de médicaments",
    keywords: ["medicament", "traitement", "comprime", "cachet", "piqûre", "insuline", "diabete"],
  },
  { skill: "Injection insuline / diabète", keywords: ["insuline", "diabete"] },
  {
    skill: "Animal âgé ou en fin de vie",
    keywords: ["age", "senior", "fin de vie", "vieux", "arthrose"],
  },
  { skill: "Chiot / chaton non propre", keywords: ["propre", "chiot", "chaton"] },
  {
    skill: "Chien réactif ou peureux",
    keywords: ["reactif", "reactive", "peureux", "craintif", "anxieux", "peur", "agressif", "stress"],
  },
  { skill: "Chat FIV / FeLV", keywords: ["fiv", "felv"] },
  {
    skill: "Soin post-opératoire",
    keywords: ["post-op", "post op", "operation", "opere", "convalescence", "suture"],
  },
];

// -------------------- Exposition publique des fiches --------------------

/**
 * Décision de Jérémie (23/08/2026) : la fiche publique expose TOUT ce que le
 * moteur score, pour que chaque partie puisse vérifier sur quoi elle est
 * jugée. Asymétrie mesurée avant correction : le propriétaire exposait six de
 * ses entrées scorées, le gardien aucun de ses champs les plus lourds
 * (`work_during_sit`, poids 2, était invisible).
 * Verrou : `src/lib/__tests__/public-views-affinity-symmetry.test.ts`.
 */

/**
 * Champs lus par le moteur, JAMAIS exposés publiquement, avec justification.
 * Toute nouvelle exclusion doit être ajoutée ici, jamais en silence.
 */
export const ENGINE_NOT_PUBLIC_FIELDS = {
  sitter: {
    sensitivities:
      "Donnée de santé (allergies). Le propriétaire l'apprend par le frein " +
      "du moteur au moment de la candidature, jamais par la fiche publique.",
  },
} as const;

/**
 * Colonnes DESCRIPTIVES des vues publiques : visibles, jamais scorées.
 * `accompanied_by` et `own_animals` détaillent les booléens scorés
 * `travels_with_children` / `travels_with_own_animals` (répartition décidée
 * le 23/08/2026 : booléen scoré, texte descriptif exposé).
 */
export const SITTER_PUBLIC_DESCRIPTIVE_COLUMNS = [
  "motivation",
  "accompanied_by",
  "own_animals",
  "geographic_radius",
  "min_stay_duration",
  "is_available",
  "competences",
  "preferred_frequency",
  "min_notice",
  "preferred_environments",
  "reply_median_minutes",
] as const;

export const OWNER_PUBLIC_DESCRIPTIVE_COLUMNS = [
  "welcome_notes",
  "environments",
  "competences",
  "competences_disponible",
  "created_at",
] as const;
