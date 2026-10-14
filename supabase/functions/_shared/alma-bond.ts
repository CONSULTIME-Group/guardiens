/**
 * Lot A7 (14/10/2026) : le lien avec Alma.
 *
 * Module pur, partagé par alma-chat (serveur) et le site (chemin relatif,
 * comme alma-page-labels.ts). Aucune requête ici : l'appelant fournit les
 * signaux lus en base, le module rend le stade, sa date quand un moment la
 * porte, les moments datés et le prochain pas.
 *
 * Règles :
 *  - un moment n'existe que si sa date est lue en base, jamais déduite au hasard ;
 *  - la « première rencontre » est le premier échange réel avec Alma ;
 *  - le lien grandit par ce que la personne fait avec la communauté, et le
 *    prochain pas mène toujours vers un échange réel entre membres.
 */

export type BondStage = "nouvelle" | "eveillee" | "complice" | "fidele";

export const BOND_STAGES: BondStage[] = ["nouvelle", "eveillee", "complice", "fidele"];

/** Libellés publics. La clé « complice » reste en base, l'écran dit « Proche ». */
export const BOND_STAGE_LABEL: Record<BondStage, string> = {
  nouvelle: "Nouvelle rencontre",
  eveillee: "Éveillée",
  complice: "Proche",
  fidele: "Fidèle",
};

/** Libellé court du dock et de l'en-tête. */
export const BOND_STAGE_SHORT: Record<BondStage, string> = {
  nouvelle: "Nouvelle",
  eveillee: "Éveillée",
  complice: "Proche",
  fidele: "Fidèle",
};

/** Seuils du lien. Profil aligné sur la doctrine Y3 (40 %). */
export const BOND_THRESHOLDS = {
  profileCompletionMin: 40,
  helpForFidele: 3,
  badgesForFidele: 1,
  completedSitsForFidele: 1,
} as const;

export type MomentKey =
  | "premiere_rencontre"
  | "premiere_annonce"
  | "premiere_candidature"
  | "premiere_garde_confirmee"
  | "premiere_garde_realisee"
  | "premier_coup_de_main"
  | "premier_avis"
  | "premier_ecusson";

export const MOMENT_KEYS: MomentKey[] = [
  "premiere_rencontre",
  "premiere_annonce",
  "premiere_candidature",
  "premiere_garde_confirmee",
  "premiere_garde_realisee",
  "premier_coup_de_main",
  "premier_avis",
  "premier_ecusson",
];

export interface BondMoment {
  key: MomentKey;
  /** Jour du moment, AAAA-MM-JJ (heure de Paris). */
  date: string;
  /** Libellé du carnet, dans la voix d'Alma. */
  label: string;
  /** Page utile liée au moment, quand elle existe. */
  href: string | null;
  /** Coup de main : demandé (publié) ou rendu. */
  variant?: "demande" | "rendu";
}

export interface BondSitRow {
  id: string;
  status: string;
  published_at?: string | null;
  created_at?: string | null;
  start_date?: string | null;
  end_date?: string | null;
  applications?: Array<{ status: string }> | null;
}

export interface BondApplicationRow {
  sit_id?: string | null;
  status: string;
  created_at: string;
  sit?: { id?: string | null; status?: string | null; start_date?: string | null; end_date?: string | null } | null;
}

export interface BondMissionRow {
  id: string;
  status: string;
  created_at?: string | null;
}

/** Signaux lus côté serveur par my_alma_bond_signals (ou par alma-chat). */
export interface BondServerSignals {
  member_since?: string | null;
  alma_first_at?: string | null;
  alma_exchanges?: number | null;
  first_confirmed_at?: string | null;
  first_confirmed_sit_id?: string | null;
  completed_count?: number | null;
  first_completed_end?: string | null;
  first_completed_sit_id?: string | null;
  reviews_received?: number | null;
  first_review_at?: string | null;
  help_given?: number | null;
  first_help_at?: string | null;
  badges?: number | null;
  first_badge_at?: string | null;
  emergency_since?: string | null;
}

export interface BondSignals {
  /** Jour de référence, AAAA-MM-JJ. */
  today: string;
  activeRole: "owner" | "sitter";
  /** Complétion du profil ; null quand elle n'est pas connue (rejeu). */
  profileCompletion: number | null;
  ownSits: BondSitRow[];
  sentApplications: BondApplicationRow[];
  missions: BondMissionRow[];
  badges?: Array<{ created_at: string | null }>;
  isEmergencySitter?: boolean;
  server?: BondServerSignals | null;
}

export interface BondNextStep {
  milestone: string;
  label: string;
  href: string;
}

export interface AlmaBond {
  stage: BondStage;
  stageLabel: string;
  /** Jour d'entrée dans le stade, quand un moment le porte. */
  stageSince: string | null;
  /** Jour d'inscription. */
  memberSince: string | null;
  /** Jour du premier échange avec Alma. */
  firstMeeting: string | null;
  /** Jours depuis le premier échange, null sans échange. */
  daysKnown: number | null;
  exchanges: number;
  /** Moments datés, du plus ancien au plus récent. */
  moments: BondMoment[];
  next: BondNextStep | null;
  counts: {
    publishedSits: number;
    applications: number;
    confirmedSits: number;
    completedSits: number;
    missionsPublished: number;
    helpGiven: number;
    reviewsReceived: number;
    badges: number;
  };
}

// ---------------------------------------------------------------------------
// Dates
// ---------------------------------------------------------------------------

const DAY_RE = /^\d{4}-\d{2}-\d{2}$/;
const MONTHS_FR = ["janvier", "février", "mars", "avril", "mai", "juin", "juillet", "août", "septembre", "octobre", "novembre", "décembre"];

/** Jour de Paris d'un horodatage, ou le jour tel quel. null si illisible. */
export function parisDay(value: string | null | undefined): string | null {
  if (typeof value !== "string" || !value) return null;
  if (DAY_RE.test(value)) return value;
  const t = Date.parse(value);
  if (Number.isNaN(t)) return null;
  try {
    const parts = new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Paris", year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(new Date(t));
    const get = (k: string) => parts.find((p) => p.type === k)?.value ?? "";
    const out = `${get("year")}-${get("month")}-${get("day")}`;
    return DAY_RE.test(out) ? out : new Date(t).toISOString().slice(0, 10);
  } catch {
    return new Date(t).toISOString().slice(0, 10);
  }
}

/** « 3 septembre » ou « 3 septembre 2026 ». */
export function bondDateLabel(day: string | null, withYear = true): string {
  if (!day || !DAY_RE.test(day)) return "";
  const [y, m, d] = day.split("-").map(Number);
  return `${d === 1 ? "1er" : d} ${MONTHS_FR[m - 1]}${withYear ? ` ${y}` : ""}`;
}

export function daysBetween(fromDay: string, toDay: string): number {
  return Math.round((Date.parse(`${toDay}T00:00:00Z`) - Date.parse(`${fromDay}T00:00:00Z`)) / 86_400_000);
}

function earliest<T extends { day: string | null }>(rows: T[]): T | null {
  let best: T | null = null;
  for (const r of rows) {
    if (!r.day) continue;
    if (!best || r.day < (best.day as string)) best = r;
  }
  return best;
}

// ---------------------------------------------------------------------------
// Calcul du lien
// ---------------------------------------------------------------------------

const PUBLISHED_MISSION = new Set(["open", "in_progress", "completed"]);
const CONFIRMED_SIT = new Set(["confirmed", "in_progress", "completed"]);

const MOMENT_LABEL: Record<Exclude<MomentKey, "premier_coup_de_main">, string> = {
  premiere_rencontre: "Notre première conversation",
  premiere_annonce: "Votre première annonce en ligne",
  premiere_candidature: "Votre première candidature envoyée",
  premiere_garde_confirmee: "Votre première garde confirmée",
  premiere_garde_realisee: "Votre première garde réalisée",
  premier_avis: "Votre premier avis reçu",
  premier_ecusson: "Votre premier écusson",
};

export function computeAlmaBond(s: BondSignals): AlmaBond {
  const srv = s.server ?? {};
  const today = s.today;
  const moments: BondMoment[] = [];

  // Première rencontre : le premier échange réel avec Alma, rien d'autre.
  const exchanges = Math.max(0, Number(srv.alma_exchanges ?? 0) || 0);
  const firstMeeting = exchanges > 0 ? parisDay(srv.alma_first_at) : null;
  if (firstMeeting) moments.push({ key: "premiere_rencontre", date: firstMeeting, label: MOMENT_LABEL.premiere_rencontre, href: null });

  // Première annonce : la plus ancienne date de publication lue en base.
  const published = s.ownSits.filter((x) => !!x.published_at);
  const firstSit = earliest(published.map((x) => ({ id: x.id, day: parisDay(x.published_at) })));
  if (firstSit) moments.push({ key: "premiere_annonce", date: firstSit.day!, label: MOMENT_LABEL.premiere_annonce, href: `/sits/${firstSit.id}` });

  // Première candidature envoyée.
  const firstApp = earliest(s.sentApplications.map((a) => ({ day: parisDay(a.created_at) })));
  if (firstApp) moments.push({ key: "premiere_candidature", date: firstApp.day!, label: MOMENT_LABEL.premiere_candidature, href: "/mes-candidatures" });

  // Première garde confirmée : date du passage à « confirmée » (historique).
  const confirmedDay = parisDay(srv.first_confirmed_at);
  if (confirmedDay) {
    moments.push({
      key: "premiere_garde_confirmee",
      date: confirmedDay,
      label: MOMENT_LABEL.premiere_garde_confirmee,
      href: srv.first_confirmed_sit_id ? `/sits/${srv.first_confirmed_sit_id}` : null,
    });
  }

  // Première garde réalisée : jour de fin de la première garde terminée.
  const completedCandidates: Array<{ day: string | null; sitId: string | null }> = [];
  if (srv.first_completed_end) completedCandidates.push({ day: parisDay(srv.first_completed_end), sitId: srv.first_completed_sit_id ?? null });
  for (const x of s.ownSits) {
    if (x.status === "completed" && (x.applications ?? []).some((a) => a.status === "accepted")) {
      completedCandidates.push({ day: parisDay(x.end_date), sitId: x.id });
    }
  }
  for (const a of s.sentApplications) {
    if (a.status === "accepted" && a.sit?.status === "completed") {
      completedCandidates.push({ day: parisDay(a.sit?.end_date ?? null), sitId: a.sit?.id ?? a.sit_id ?? null });
    }
  }
  const firstCompleted = earliest(completedCandidates.filter((c) => c.day && c.day <= today));
  if (firstCompleted) {
    moments.push({
      key: "premiere_garde_realisee",
      date: firstCompleted.day!,
      label: MOMENT_LABEL.premiere_garde_realisee,
      href: firstCompleted.sitId ? `/review/${firstCompleted.sitId}` : null,
    });
  }

  // Premier coup de main : demandé (publié) ou rendu (proposition retenue).
  const missionDays = s.missions
    .filter((m) => PUBLISHED_MISSION.has(m.status))
    .map((m) => ({ id: m.id, day: parisDay(m.created_at) }))
    .filter((m) => m.day) as Array<{ id: string; day: string }>;
  missionDays.sort((a, b) => a.day.localeCompare(b.day));
  const helpDay = Number(srv.help_given ?? 0) > 0 ? parisDay(srv.first_help_at) : null;
  const firstAsked = missionDays[0] ?? null;
  if (firstAsked || helpDay) {
    const given = helpDay && (!firstAsked || helpDay < firstAsked.day);
    moments.push(given
      ? { key: "premier_coup_de_main", date: helpDay!, label: "Votre premier coup de main rendu", href: "/petites-missions", variant: "rendu" }
      : { key: "premier_coup_de_main", date: firstAsked!.day, label: "Votre premier coup de main demandé", href: `/petites-missions/${firstAsked!.id}`, variant: "demande" });
  }

  // Premier avis reçu (publié).
  const reviewsReceived = Math.max(0, Number(srv.reviews_received ?? 0) || 0);
  const reviewDay = reviewsReceived > 0 ? parisDay(srv.first_review_at) : null;
  if (reviewDay) moments.push({ key: "premier_avis", date: reviewDay, label: MOMENT_LABEL.premier_avis, href: "/mes-avis" });

  // Premier écusson.
  const badgeRows = s.badges ?? [];
  const badgeCandidates = badgeRows.map((b) => ({ day: parisDay(b.created_at) }));
  if (Number(srv.badges ?? 0) > 0 && srv.first_badge_at) badgeCandidates.push({ day: parisDay(srv.first_badge_at) });
  const firstBadge = earliest(badgeCandidates);
  if (firstBadge) moments.push({ key: "premier_ecusson", date: firstBadge.day!, label: MOMENT_LABEL.premier_ecusson, href: null });

  moments.sort((a, b) => a.date.localeCompare(b.date) || MOMENT_KEYS.indexOf(a.key) - MOMENT_KEYS.indexOf(b.key));

  // Compteurs.
  const publishedSits = s.ownSits.filter((x) => !!x.published_at || ["published", "confirmed", "in_progress", "completed"].includes(x.status)).length;
  const confirmedSits = s.ownSits.filter((x) => CONFIRMED_SIT.has(x.status)).length
    + s.sentApplications.filter((a) => a.status === "accepted" && CONFIRMED_SIT.has(a.sit?.status ?? "")).length;
  const completedSits = Math.max(Number(srv.completed_count ?? 0) || 0, completedCandidates.filter((c) => c.day && c.day <= today).length > 0 ? 1 : 0);
  const helpGiven = Math.max(0, Number(srv.help_given ?? 0) || 0);
  const badges = Math.max(badgeRows.length, Number(srv.badges ?? 0) || 0);
  const isEmergency = Boolean(s.isEmergencySitter) || Boolean(srv.emergency_since);
  const counts = {
    publishedSits,
    applications: s.sentApplications.length,
    confirmedSits,
    completedSits,
    missionsPublished: missionDays.length || s.missions.filter((m) => PUBLISHED_MISSION.has(m.status)).length,
    helpGiven,
    reviewsReceived,
    badges,
  };

  // Stade.
  const T = BOND_THRESHOLDS;
  const profileOk = s.profileCompletion === null || s.profileCompletion >= T.profileCompletionMin;
  const helpTotal = counts.missionsPublished + helpGiven;
  const isFidele = completedSits >= T.completedSitsForFidele || helpTotal >= T.helpForFidele || badges >= T.badgesForFidele || isEmergency;
  const hasEngagement = publishedSits > 0 || counts.applications > 0 || helpTotal > 0 || confirmedSits > 0 || completedSits > 0 || badges > 0;
  const stage: BondStage = !profileOk ? "nouvelle" : isFidele ? "fidele" : hasEngagement ? "complice" : "eveillee";

  // Date d'entrée dans le stade, seulement quand un moment la porte.
  const dayOf = (k: MomentKey) => moments.find((m) => m.key === k)?.date ?? null;
  let stageSince: string | null = null;
  if (stage === "complice") {
    stageSince = minDay([dayOf("premiere_annonce"), dayOf("premiere_candidature"), dayOf("premier_coup_de_main"), dayOf("premiere_garde_confirmee")]);
  } else if (stage === "fidele") {
    const third = helpGiven === 0 && missionDays.length >= T.helpForFidele ? missionDays[T.helpForFidele - 1].day : null;
    stageSince = minDay([dayOf("premiere_garde_realisee"), dayOf("premier_ecusson"), parisDay(srv.emergency_since), third]);
  }

  const daysKnown = firstMeeting ? Math.max(0, daysBetween(firstMeeting, today)) : null;

  return {
    stage,
    stageLabel: BOND_STAGE_LABEL[stage],
    stageSince,
    memberSince: parisDay(srv.member_since),
    firstMeeting,
    daysKnown,
    exchanges,
    moments,
    next: nextStep(stage, s, counts),
    counts,
  };
}

function minDay(days: Array<string | null>): string | null {
  const ok = days.filter((d): d is string => !!d).sort();
  return ok[0] ?? null;
}

function nextStep(stage: BondStage, s: BondSignals, c: AlmaBond["counts"]): BondNextStep {
  const owner = s.activeRole === "owner";
  if (stage === "nouvelle") {
    return {
      milestone: `Un profil rempli à ${BOND_THRESHOLDS.profileCompletionMin} % ouvre l'étape suivante : les autres membres savent alors qui vous êtes.`,
      label: "Compléter mon profil",
      href: owner ? "/owner-profile" : "/profile",
    };
  }
  if (stage === "eveillee") {
    return owner
      ? { milestone: "Une première annonce ou un premier coup de main demandé, et notre lien passe au stade Proche.", label: "Publier une annonce", href: "/sits/create" }
      : { milestone: "Une première candidature ou un coup de main proposé, et notre lien passe au stade Proche.", label: "Trouver une garde", href: "/annonces" };
  }
  if (stage === "complice") {
    const upcoming = s.sentApplications.find((a) => a.status === "accepted" && (a.sit?.status === "confirmed" || a.sit?.status === "in_progress") && (a.sit?.id || a.sit_id));
    if (upcoming) {
      return {
        milestone: "Votre garde confirmée, une fois réalisée, fera passer notre lien au stade Fidèle.",
        label: "Voir ma garde",
        href: `/sits/${upcoming.sit?.id ?? upcoming.sit_id}`,
      };
    }
    if (owner) {
      return c.publishedSits > 0
        ? { milestone: "Une garde réalisée, trois coups de main ou un écusson, et notre lien passe au stade Fidèle.", label: "Voir mes annonces", href: "/sits" }
        : { milestone: "Une garde réalisée, trois coups de main ou un écusson, et notre lien passe au stade Fidèle.", label: "Publier une annonce", href: "/sits/create" };
    }
    return { milestone: "Une garde réalisée, trois coups de main ou un écusson, et notre lien passe au stade Fidèle.", label: "Trouver une garde", href: "/annonces" };
  }
  return {
    milestone: "Notre lien est au stade Fidèle. Il continue de grandir avec chaque échange que vous faites près de chez vous.",
    label: "Voir l'entraide près de chez vous",
    href: "/petites-missions",
  };
}

// ---------------------------------------------------------------------------
// En-tête du dock
// ---------------------------------------------------------------------------

/** « Avec vous depuis le 3 septembre · Proche » ; l'année s'ajoute hors de l'année en cours. */
export function bondHeaderLine(bond: AlmaBond | null, today: string): string | null {
  if (!bond) return null;
  const short = BOND_STAGE_SHORT[bond.stage];
  if (!bond.memberSince) return short;
  const sameYear = bond.memberSince.slice(0, 4) === today.slice(0, 4);
  return `Avec vous depuis le ${bondDateLabel(bond.memberSince, !sameYear)} · ${short}`;
}

// ---------------------------------------------------------------------------
// Conversation : bloc transmis au modèle
// ---------------------------------------------------------------------------

export const BOND_RECENT_DAYS = 7;

/** Moments du bloc : récents d'abord, puis les plus récents, 3 au plus, première rencontre à part. */
export function bondPromptMoments(bond: AlmaBond, today: string, max = 3): Array<BondMoment & { recent: boolean }> {
  const pool = bond.moments
    .filter((m) => m.key !== "premiere_rencontre")
    .map((m) => ({ ...m, recent: daysBetween(m.date, today) >= 0 && daysBetween(m.date, today) < BOND_RECENT_DAYS }));
  pool.sort((a, b) => Number(b.recent) - Number(a.recent) || b.date.localeCompare(a.date));
  return pool.slice(0, max);
}

/** Bloc « VOTRE LIEN AVEC CETTE PERSONNE ». Ne contient que les moments fournis. */
export function formatBondBlock(bond: AlmaBond, today: string): string {
  const lines = ["VOTRE LIEN AVEC CETTE PERSONNE (lu en base, tu ne te souviens de rien d'autre) :"];
  lines.push(`- Stade du lien : ${bond.stageLabel}${bond.stageSince ? `, depuis le ${bondDateLabel(bond.stageSince)}` : ""}.`);
  if (bond.memberSince) lines.push(`- Membre depuis le ${bondDateLabel(bond.memberSince)}.`);
  if (bond.firstMeeting && bond.exchanges > 0) {
    lines.push(`- Vous vous parlez depuis le ${bondDateLabel(bond.firstMeeting)} (${bond.exchanges} échange${bond.exchanges > 1 ? "s" : ""} avant celui-ci).`);
  } else {
    lines.push("- Premier échange avec toi : c'est votre première conversation.");
  }
  const picked = bondPromptMoments(bond, today);
  if (picked.length) {
    lines.push("- Moments partagés :");
    for (const m of picked) lines.push(`  · ${m.label}, le ${bondDateLabel(m.date)}${m.recent ? " (RÉCENT, moins de 7 jours)" : ""}.`);
  } else {
    lines.push("- Aucun moment partagé pour l'instant.");
  }
  return lines.join("\n");
}

// ---------------------------------------------------------------------------
// Filet de sortie : moment évoqué sans fait correspondant
// ---------------------------------------------------------------------------

export type BondClaimKind = "garde" | "annonce" | "candidature" | "coup_de_main" | "avis" | "ecusson";

/** Phrases au passé (ou d'accomplissement) qui affirment un moment. Texte replié sans accents. */
export const BOND_CLAIM_PATTERNS: Record<BondClaimKind, RegExp> = {
  garde: /\bvotre (premiere |derniere |precedente )?garde (s'est|a ete|etait|avait|est (terminee|realisee|confirmee|passee|finie))|\bvous avez (deja )?(realise|termine|assure|fait|vecu) (une|votre|vos|des|deux|trois) (premieres? )?gardes?\b|\b(depuis|lors de|apres) votre (premiere |derniere )?garde\b/,
  annonce: /\bvotre (premiere |derniere |precedente )?annonce (a ete|etait|avait|a (bien |deja )?(plu|attire|recu|trouve|seduit)|est partie)|\bvous avez (deja )?publie (votre|une|vos|des) (premieres? )?annonces?\b|\bdepuis votre premiere annonce\b/,
  candidature: /\bvotre premiere candidature (a ete|etait|est partie)|\bvous avez (deja )?(postule|envoye (une|votre|vos|des) (premieres? )?candidatures?)|\bdepuis votre premiere candidature\b/,
  coup_de_main: /\bvous avez (deja )?(rendu|donne|publie|demande|propose|offert) (un|votre|des|vos) (premiers? )?coups? de main\b|\bvotre premier coup de main (a ete|est|etait)\b/,
  avis: /\bvotre premier avis (a ete|est arrive|etait|est publie)|\bvous avez (deja )?recu (un|votre|des|vos) (premiers? )?avis\b|\bdepuis votre premier avis\b/,
  ecusson: /\bvous avez (deja )?(recu|obtenu|gagne|decroche) (un|votre|des|vos) (premiers? )?ecussons?\b|\bvotre premier ecusson (a ete|est arrive|est la)\b/,
};

const foldB = (s: string): string =>
  (s || "").normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[’‘]/g, "'").toLowerCase().replace(/\s+/g, " ").trim();

/** Moments que la phrase affirme. */
export function bondClaimsIn(sentence: string): BondClaimKind[] {
  const f = foldB(sentence);
  return (Object.keys(BOND_CLAIM_PATTERNS) as BondClaimKind[]).filter((k) => BOND_CLAIM_PATTERNS[k].test(f));
}

/**
 * Moments qu'Alma peut évoquer : ceux du bloc du lien, plus ceux que les
 * faits vérifiés portent (garde confirmée, annonce publiée, candidature,
 * coup de main publié).
 */
export function allowedBondClaims(bond: AlmaBond | null, facts?: {
  gardes_confirmees?: unknown[];
  annonces_publiees?: unknown[];
  candidatures_envoyees?: Record<string, number>;
  missions_publiees?: unknown[];
} | null): BondClaimKind[] {
  const out = new Set<BondClaimKind>();
  const has = (k: MomentKey) => Boolean(bond?.moments.some((m) => m.key === k));
  if (has("premiere_garde_confirmee") || has("premiere_garde_realisee") || (facts?.gardes_confirmees?.length ?? 0) > 0) out.add("garde");
  if (has("premiere_annonce") || (facts?.annonces_publiees?.length ?? 0) > 0) out.add("annonce");
  if (has("premiere_candidature") || Object.values(facts?.candidatures_envoyees ?? {}).some((n) => Number(n) > 0)) out.add("candidature");
  if (has("premier_coup_de_main") || (facts?.missions_publiees?.length ?? 0) > 0) out.add("coup_de_main");
  if (has("premier_avis")) out.add("avis");
  if (has("premier_ecusson")) out.add("ecusson");
  return [...out];
}

// ---------------------------------------------------------------------------
// Moments célébrés dans le dock
// ---------------------------------------------------------------------------

/** Un moment se célèbre s'il date de moins de 14 jours ; plus ancien, il reste au carnet. */
export const CELEBRATION_WINDOW_DAYS = 14;
/** Catégorie que le membre peut rendre muette dans ses réglages d'Alma. */
export const ALMA_MOMENT_CATEGORY = "alma_moment";

export const momentRuleKey = (k: MomentKey) => `moment:${k}`;
export const stageRuleKey = (s: BondStage) => `stade:${s}`;
/** Toutes les clés suivies dans alma_journal_shown, pour une lecture unique. */
export const BOND_RULE_KEYS: string[] = [...MOMENT_KEYS.map(momentRuleKey), ...BOND_STAGES.map(stageRuleKey)];

export interface Celebration {
  ruleKey: string;
  kind: "moment" | "stade";
  key: MomentKey | BondStage;
  text: string;
  action: { label: string; href: string };
}

const CARNET_ACTION = { label: "Ouvrir notre carnet", href: "/alma#carnet" };

/** Texte et bouton d'un moment, dans la voix d'Alma. Aucune bulle pour la première rencontre. */
export function momentCelebration(m: BondMoment, role: "owner" | "sitter"): Celebration | null {
  const base = { ruleKey: momentRuleKey(m.key), kind: "moment" as const, key: m.key };
  switch (m.key) {
    case "premiere_annonce":
      return { ...base, text: "Votre première annonce est en ligne. Je la note dans notre carnet.", action: { label: "Voir mon annonce", href: m.href ?? "/sits" } };
    case "premiere_candidature":
      return { ...base, text: "Votre première candidature est partie. Je la note dans notre carnet.", action: { label: "Suivre mes candidatures", href: "/mes-candidatures" } };
    case "premiere_garde_confirmee":
      return { ...base, text: "Votre première garde est confirmée. Une belle page de notre carnet.", action: m.href ? { label: "Voir la garde", href: m.href } : CARNET_ACTION };
    case "premiere_garde_realisee":
      return { ...base, text: "Votre première garde est réalisée. Votre avis aidera la prochaine personne à se décider.", action: m.href ? { label: "Laisser mon avis", href: m.href } : CARNET_ACTION };
    case "premier_coup_de_main":
      return m.variant === "rendu"
        ? { ...base, text: "Votre premier coup de main est rendu. C'est ainsi que l'entraide prend racine.", action: { label: "Voir l'entraide près de chez vous", href: "/petites-missions" } }
        : { ...base, text: "Votre premier coup de main est publié. Les personnes à proximité peuvent vous répondre.", action: { label: "Voir mon besoin", href: m.href ?? "/petites-missions" } };
    case "premier_avis":
      return { ...base, text: "Votre premier avis est publié. Je le range dans notre carnet.", action: { label: "Lire l'avis", href: "/mes-avis" } };
    case "premier_ecusson":
      return { ...base, text: "Votre premier écusson est arrivé. Je le range dans notre carnet.", action: CARNET_ACTION };
    default:
      void role;
      return null;
  }
}

/** Texte d'un passage de stade ; le bouton mène au prochain pas réel. */
export function stageCelebration(bond: AlmaBond): Celebration | null {
  const base = { ruleKey: stageRuleKey(bond.stage), kind: "stade" as const, key: bond.stage };
  const action = bond.next ? { label: bond.next.label, href: bond.next.href } : CARNET_ACTION;
  switch (bond.stage) {
    case "eveillee":
      return { ...base, text: "Votre profil est prêt. Notre lien passe au stade Éveillée, place au premier geste.", action };
    case "complice":
      return { ...base, text: "Premier geste vers la communauté : notre lien passe au stade Proche.", action };
    case "fidele":
      return { ...base, text: "Notre lien passe au stade Fidèle. Ce que vous faites avec la communauté compte.", action };
    default:
      return null;
  }
}

export interface CelebrationInput {
  bond: AlmaBond | null;
  today: string;
  /** Clés déjà présentes dans alma_journal_shown (toutes dates). */
  shownKeys: string[];
  frequency: "silent" | "low" | "balanced" | "talkative" | string;
  mutedCategories?: string[] | null;
  /** Un moment a déjà été montré pendant cette session. */
  sessionUsed: boolean;
  role: "owner" | "sitter";
}

export interface CelebrationPlan {
  celebrate: Celebration | null;
  /** Stade relevé sans bulle (premier passage, sert de point de départ). */
  recordSilently: string[];
}

const STAGE_RANK: Record<BondStage, number> = { nouvelle: 0, eveillee: 1, complice: 2, fidele: 3 };

/**
 * Décide la bulle du jour. Une seule par session, jamais en silence ni en
 * catégorie muette, jamais un moment déjà montré, jamais un moment de plus de
 * 14 jours. Un passage de stade se salue seulement si un stade inférieur a
 * déjà été relevé ; le tout premier relevé se fait sans bulle.
 */
export function planCelebration(i: CelebrationInput): CelebrationPlan {
  const plan: CelebrationPlan = { celebrate: null, recordSilently: [] };
  const bond = i.bond;
  if (!bond) return plan;
  const shown = new Set(i.shownKeys);
  const stageRows = BOND_STAGES.filter((st) => shown.has(stageRuleKey(st)));
  const currentStageKey = stageRuleKey(bond.stage);
  const stageIsNew = !shown.has(currentStageKey);
  const baselineMissing = stageRows.length === 0;
  if (stageIsNew && baselineMissing) plan.recordSilently.push(currentStageKey);

  const quiet = i.frequency === "silent"
    || (i.mutedCategories ?? []).includes(ALMA_MOMENT_CATEGORY)
    || i.sessionUsed;
  if (quiet) return plan;

  const fresh = bond.moments
    .filter((m) => !shown.has(momentRuleKey(m.key)))
    .filter((m) => {
      const d = daysBetween(m.date, i.today);
      return d >= 0 && d < CELEBRATION_WINDOW_DAYS;
    })
    .sort((a, b) => b.date.localeCompare(a.date));
  for (const m of fresh) {
    const c = momentCelebration(m, i.role);
    if (c) { plan.celebrate = c; return plan; }
  }

  if (stageIsNew && !baselineMissing) {
    const maxSeen = Math.max(...stageRows.map((st) => STAGE_RANK[st]));
    if (STAGE_RANK[bond.stage] > maxSeen) plan.celebrate = stageCelebration(bond);
  }
  return plan;
}
