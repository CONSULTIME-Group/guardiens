/**
 * Etapes restantes avant de pouvoir candidater.
 *
 * Miroir du bareme reel de `public._calculate_sitter_score` (version du
 * 30/08/2026 : photo 20, bio 15, localisation 15, competences 15, style de
 * vie 10, galerie 4 puis 10, identite 5, affinite 0/3/6/10, rayon
 * d'intervention retire du bareme). Meme bareme que
 * `src/lib/profileCompletion.ts`, si le SQL bouge, les deux bougent.
 *
 * Regle produit non negociable : on nomme un seul geste a la fois, mais on
 * dit la verite sur le nombre d'etapes restantes. On ne promet jamais le
 * deblocage quand il en reste plusieurs.
 */

/** Seuil de candidature cote diffusion (parite avec le digest). */
export const APPLY_COMPLETION_THRESHOLD = 60;

export interface CompletionStepInput {
  first_name?: string | null;
  postal_code?: string | null;
  city?: string | null;
  country?: string | null;
  avatar_url?: string | null;
  bio?: string | null;
  identity_verified?: boolean | null;
  competences?: string[] | null;
  lifestyle?: string[] | null;
  interests?: string[] | null;
  languages?: string[] | null;
  life_pace?: string | null;
  animal_types?: string[] | null;
  gallery_count?: number | null;
}

export interface CompletionStep {
  key: string;
  points: number;
  /** Formulation quand c'est la seule etape restante. */
  single: string;
  /** Formulation d'ouverture quand plusieurs etapes restent. */
  opener: string;
  href: string;
}

interface StepDef extends CompletionStep {
  ok: (d: CompletionStepInput) => boolean;
  /** Points reellement acquis meme si l'item n'est pas complet. */
  partial?: (d: CompletionStepInput) => number;
}

const affinityCount = (d: CompletionStepInput): number =>
  [
    (d.interests?.length ?? 0) >= 3,
    (d.languages?.length ?? 0) > 0,
    !!d.life_pace,
    (d.animal_types?.length ?? 0) > 0,
  ].filter(Boolean).length;

const affinityPoints = (n: number): number => (n >= 3 ? 10 : n === 2 ? 6 : n === 1 ? 3 : 0);

/** Ordre de presentation a points egaux : photo, bio, localisation, competences. */
const STEPS: StepDef[] = [
  {
    key: "avatar",
    points: 20,
    single: "une photo de vous",
    opener: "commençons par la photo, c'est celle qui compte le plus pour les propriétaires",
    href: "/profile?section=identite",
    ok: (d) => !!d.avatar_url,
  },
  {
    key: "bio",
    points: 15,
    single: "quelques lignes de présentation, au moins 50 caractères",
    opener: "commençons par votre présentation, quelques lignes suffisent",
    href: "/profile?section=identite",
    ok: (d) => (d.bio?.trim().length ?? 0) >= 50,
  },
  {
    key: "location",
    points: 15,
    single: "votre prénom et votre code postal",
    opener: "commençons par votre prénom et votre code postal",
    href: "/profile?section=identite",
    ok: (d) =>
      !!d.first_name && ((d.country || "FR") === "FR" ? !!d.postal_code : !!d.city),
  },
  {
    key: "competences",
    points: 15,
    single: "vos compétences",
    opener: "commençons par vos compétences",
    href: "/profile?section=competences",
    ok: (d) => (d.competences?.length ?? 0) > 0,
  },
  {
    key: "lifestyle",
    points: 10,
    single: "votre style de vie",
    opener: "commençons par votre style de vie",
    href: "/profile?section=profil",
    ok: (d) => (d.lifestyle?.length ?? 0) > 0,
  },
  {
    key: "gallery",
    points: 10,
    single: "trois photos dans votre galerie",
    opener: "commençons par votre galerie, trois photos suffisent",
    href: "/profile?section=galerie",
    ok: (d) => (d.gallery_count ?? 0) >= 3,
    partial: (d) => ((d.gallery_count ?? 0) >= 1 ? 4 : 0),
  },
  {
    key: "affinity",
    points: 10,
    single: "votre profil d'affinité, au moins trois réponses",
    opener: "commençons par votre profil d'affinité",
    href: "/profile?section=profil",
    ok: (d) => affinityCount(d) >= 3,
    partial: (d) => affinityPoints(affinityCount(d)),
  },
  {
    key: "identity",
    points: 5,
    single: "l'envoi de vos documents d'identité",
    opener: "commençons par vos documents d'identité",
    href: "/profile?section=identite",
    ok: (d) => !!d.identity_verified,
  },
];

/** Score courant selon le bareme, borne a 100. */
export const completionScoreFor = (d: CompletionStepInput): number => {
  const total = STEPS.reduce(
    (sum, s) => sum + (s.ok(d) ? s.points : s.partial ? s.partial(d) : 0),
    0,
  );
  return Math.min(100, total);
};

/**
 * Etapes strictement necessaires pour atteindre le seuil de candidature,
 * les plus rentables en premier. Une seule etape suffit souvent : la photo.
 */
export const remainingCompletionSteps = (
  d: CompletionStepInput,
  threshold: number = APPLY_COMPLETION_THRESHOLD,
): CompletionStep[] => {
  let score = completionScoreFor(d);
  if (score >= threshold) return [];
  const missing = STEPS.filter((s) => !s.ok(d)).sort((a, b) => b.points - a.points);
  const chosen: CompletionStep[] = [];
  for (const s of missing) {
    if (score >= threshold) break;
    const already = s.partial ? s.partial(d) : 0;
    score += s.points - already;
    chosen.push({ key: s.key, points: s.points, single: s.single, opener: s.opener, href: s.href });
  }
  return chosen;
};

const NUMBER_WORDS = [
  "zéro",
  "une",
  "deux",
  "trois",
  "quatre",
  "cinq",
  "six",
  "sept",
  "huit",
  "neuf",
  "dix",
];

export const stepCountWord = (n: number): string =>
  n >= 0 && n < NUMBER_WORDS.length ? NUMBER_WORDS[n] : String(n);

export interface CompletionMessage {
  sentence: string;
  href: string;
  stepCount: number;
}

/**
 * Message de complétion, deux variantes.
 * Une seule etape : on promet le deblocage, il est vrai.
 * Plusieurs etapes : on annonce le nombre reel, on nomme un seul geste, on ne
 * promet jamais que ce geste debloque la candidature.
 */
export const completionMessageFor = (
  completion: number,
  steps: CompletionStep[],
): CompletionMessage | null => {
  if (steps.length === 0) return null;
  const first = steps[0];
  if (steps.length === 1) {
    return {
      sentence: `Il vous reste une étape pour pouvoir candidater : ${first.single}.`,
      href: first.href,
      stepCount: 1,
    };
  }
  return {
    sentence:
      `Votre profil est rempli à ${Math.max(0, Math.round(completion))} %. ` +
      `Il vous reste ${stepCountWord(steps.length)} étapes pour pouvoir candidater, ${first.opener}.`,
    href: first.href,
    stepCount: steps.length,
  };
};
