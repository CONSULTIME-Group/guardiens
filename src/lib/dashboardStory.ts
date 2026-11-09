/**
 * Lot L3 (08/11/2026, arène tableau de bord v2, direction B « Votre garde,
 * racontée ») : le récit de l'accueil, en logique pure.
 *
 * À partir des données déjà lues par les tableaux de bord (aucune lecture de
 * plus), resolveStory dit le chapitre de la garde du membre, la phrase qui le
 * raconte, l'unique action, et l'étape de la frise. Les écrans (lots L4 et L7)
 * ne font que l'afficher.
 *
 * Règles de la décision du 08/11/2026 :
 *  - une seule action pleine par récit ;
 *  - propriétaire : frise dès l'annonce publiée, la question seule avant ;
 *  - la rencontre est une étape facultative, jamais une condition ;
 *  - Alma et le récit ne citent que des faits déclarés (noms des animaux,
 *    commune, dates enregistrées) ;
 *  - le gardien garde la recherche nationale à portée (« Voir les N gardes
 *    ouvertes ») ;
 *  - double rôle : le récit le plus urgent s'ouvre d'abord (candidatures à
 *    lire, garde sous 45 jours, réponse attendue, brouillon, première annonce).
 */
import { daysBetween, calendarDate } from "@/lib/calendarDate";
import { capitalizePetName, finishUrl, type DeparturePeriod } from "@/lib/ownerDeparture";

export type StorySpace = "owner" | "sitter";

export type OwnerChapter =
  | "ongoing"
  | "applications"
  | "choose"
  | "confirmed"
  | "review"
  | "listed"
  | "draft"
  | "first_listing";

export type SitterChapter =
  | "ongoing"
  | "guide_open"
  | "confirmed"
  | "review"
  | "second_application"
  | "applied"
  | "opening"
  | "discover";

export type StoryArt = "porte" | "animal" | "lettre" | "depart" | "cles" | "matin";

export interface StoryLink {
  label: string;
  href: string;
}

export interface StoryFrieze {
  labels: readonly string[];
  /** Étape en cours (0 à 4). Les étapes avant sont faites. */
  current: number;
}

export interface Story {
  space: StorySpace;
  chapter: OwnerChapter | SitterChapter;
  eyebrow: string;
  title: string;
  lead?: string;
  cta: StoryLink;
  secondary?: StoryLink;
  frieze: StoryFrieze | null;
  art: StoryArt;
  /** Rang d'urgence pour le double rôle : plus petit = plus urgent. */
  urgency: number;
}

export const OWNER_FRIEZE = ["Annonce", "Candidats", "Rencontre", "Garde", "Avis"] as const;
export const SITTER_FRIEZE = ["Proposer", "Réponse", "Rencontre", "Garde", "Avis"] as const;

/** Index de l'étape « Rencontre », toujours facultative. */
export const FRIEZE_MEETING_STEP = 2;

/** Jours d'attente après lesquels le gardien se voit proposer une deuxième candidature. */
export const SECOND_APPLICATION_AFTER_DAYS = 5;
/** Le guide de la maison s'ouvre au gardien 7 jours avant la garde (RLS). */
export const GUIDE_OPENS_DAYS_BEFORE = 7;
/** Une garde confirmée compte comme urgente sous 45 jours (double rôle). */
export const CONFIRMED_URGENT_DAYS = 45;

/** Événements de mesure du récit (lots L4 et L7). */
export const STORY_EVENTS = {
  seen: "dashboard_story_seen",
  ctaClicked: "dashboard_story_cta_clicked",
  friezeStepClicked: "dashboard_frieze_step_clicked",
} as const;

// Urgence, du plus pressant au moins pressant (double rôle).
const URGENCY = {
  applications: 1,
  ongoing: 2,
  confirmedSoon: 3,
  choose: 4,
  awaitingReply: 5,
  guideOpen: 3,
  review: 6,
  confirmedLater: 7,
  listed: 8,
  draft: 9,
  opening: 10,
  firstListing: 11,
  discover: 12,
} as const;

const DATE_FMT = new Intl.DateTimeFormat("fr-FR", { day: "numeric", month: "long" });

/** « 19 décembre » à partir de « 2026-12-19 », null si illisible. */
export function storyDate(value: string | null | undefined): string | null {
  if (!value) return null;
  const d = calendarDate(value);
  return Number.isNaN(d.getTime()) ? null : DATE_FMT.format(d);
}

function cap(s: string): string {
  return s ? s.charAt(0).toLocaleUpperCase("fr-FR") + s.slice(1) : s;
}

function clean(s: string | null | undefined): string {
  return (s ?? "").trim();
}

/**
 * « Caramel », « Caramel et Noisette », « Mila, Rex et Nala » (noms déclarés
 * seulement, première lettre en majuscule : « resa » devient « Resa », lot L4b).
 */
export function joinNames(names: ReadonlyArray<string | null | undefined>): string {
  const list = names.map(capitalizePetName).filter(Boolean);
  if (list.length === 0) return "";
  if (list.length === 1) return list[0];
  return `${list.slice(0, -1).join(", ")} et ${list[list.length - 1]}`;
}

function rangePhrase(start: string | null | undefined, end: string | null | undefined): string | null {
  const a = storyDate(start);
  const b = storyDate(end);
  if (a && b) return a === b ? `le ${a}` : `du ${a} au ${b}`;
  return a ? `à partir du ${a}` : null;
}

function inDays(today: string, date: string | null | undefined): number | null {
  return date ? daysBetween(today, date) : null;
}

function countdown(n: number | null): string | null {
  if (n === null) return null;
  if (n <= 0) return "Aujourd'hui";
  if (n === 1) return "Demain";
  return `Dans ${n} jours`;
}

const PERIOD_PHRASE: Record<DeparturePeriod, string> = {
  noel: "pour Noël",
  hiver: "cet hiver",
  printemps: "ce printemps",
  ete: "cet été",
  plus_tard: "pendant votre absence",
};

const SIT_CANDIDATES_HREF = (sitId: string) => `/sits/${sitId}#candidatures`;
/** Lot L6 : une candidature précise s'ouvre sur sa page. */
const APPLICATION_HREF = (first: { sitId: string; applicationId?: string | null }) =>
  first.applicationId ? `/candidatures/${first.applicationId}` : SIT_CANDIDATES_HREF(first.sitId);

/* ───────────────────────────── Propriétaire ───────────────────────────── */

export interface OwnerStoryInput {
  /** Jour de l'appareil, AAAA-MM-JJ. */
  today: string;
  /** Période proposée à l'accueil (question « Vous partez quand ? »). */
  period?: DeparturePeriod | null;
  city?: string | null;
  /** Noms des animaux déclarés (fiche du logement). */
  petNames?: ReadonlyArray<string | null | undefined>;
  ongoingSit?: { id: string; end_date?: string | null; sitterFirstName?: string | null } | null;
  confirmedSit?: { id: string; start_date?: string | null; end_date?: string | null; sitterFirstName?: string | null } | null;
  /** Candidatures en attente sur les annonces ouvertes (pending, viewed, discussing). */
  awaiting?: {
    total: number;
    /** Nouvelles (pending). */
    unread: number;
    /** La plus ancienne à lire, sinon la plus ancienne en attente. */
    first?: { sitId: string; applicationId?: string | null; sitterFirstName?: string | null } | null;
  } | null;
  activeSit?: { id: string; start_date?: string | null; end_date?: string | null } | null;
  latestDraft?: { id: string; end_date?: string | null; cancellation_reason?: string | null } | null;
  reviewDue?: { sitId: string; sitterFirstName?: string | null } | null;
  nearbySittersCount?: number;
}

function draftAlive(d: OwnerStoryInput["latestDraft"], today: string): boolean {
  if (!d) return false;
  if (d.cancellation_reason === "archived") return false;
  if (d.end_date && d.end_date < today) return false;
  return true;
}

export function resolveOwnerStory(i: OwnerStoryInput): Story {
  const names = joinNames(i.petNames ?? []);
  const petCount = (i.petNames ?? []).map(clean).filter(Boolean).length;
  const who = names || "votre maison";
  const frieze = (current: number): StoryFrieze => ({ labels: OWNER_FRIEZE, current });
  const awaiting = i.awaiting ?? { total: 0, unread: 0, first: null };

  if (i.ongoingSit) {
    const sitter = clean(i.ongoingSit.sitterFirstName);
    const end = storyDate(i.ongoingSit.end_date);
    return {
      space: "owner",
      chapter: "ongoing",
      eyebrow: "Votre garde",
      title: `${sitter || "Votre gardien"} veille sur ${who}.`,
      lead: end ? `Jusqu'au ${end}.` : undefined,
      cta: { label: "Suivre la garde", href: `/sits/${i.ongoingSit.id}` },
      frieze: frieze(3),
      art: "matin",
      urgency: URGENCY.ongoing,
    };
  }

  if (awaiting.unread > 0 && awaiting.first) {
    const first = clean(awaiting.first.sitterFirstName);
    const others = awaiting.total - 1;
    return {
      space: "owner",
      chapter: "applications",
      eyebrow: "Votre garde",
      title: `${first || "Un gardien"} propose de veiller sur ${who}.`,
      lead: others > 0 ? `${others === 1 ? "Une autre candidature vous attend" : `${others} autres candidatures vous attendent`}.` : undefined,
      cta: { label: first ? `Lire la candidature de ${first}` : "Lire sa candidature", href: APPLICATION_HREF(awaiting.first) },
      frieze: frieze(1),
      art: "lettre",
      urgency: URGENCY.applications,
    };
  }

  const confirmedIn = i.confirmedSit ? inDays(i.today, i.confirmedSit.start_date) : null;

  if (i.confirmedSit && confirmedIn !== null && confirmedIn <= CONFIRMED_URGENT_DAYS) {
    return ownerConfirmed(i, names, who, confirmedIn, URGENCY.confirmedSoon, frieze);
  }

  if (awaiting.total > 0 && awaiting.first) {
    return {
      space: "owner",
      chapter: "choose",
      eyebrow: "Votre garde",
      title: "Prenez le temps de choisir.",
      lead: awaiting.total === 1 ? "Une candidature lue attend votre réponse." : `${awaiting.total} candidatures lues attendent votre réponse.`,
      cta: { label: "Choisir mon gardien", href: SIT_CANDIDATES_HREF(awaiting.first.sitId) },
      frieze: frieze(1),
      art: "lettre",
      urgency: URGENCY.choose,
    };
  }

  if (i.reviewDue) {
    const sitter = clean(i.reviewDue.sitterFirstName);
    return {
      space: "owner",
      chapter: "review",
      eyebrow: "Votre garde est terminée",
      title: sitter ? `Comment s'est passée la garde avec ${sitter} ?` : "Comment s'est passée la garde ?",
      lead: "Votre avis aide les prochains propriétaires à choisir.",
      cta: { label: "Laisser un avis", href: `/review/${i.reviewDue.sitId}` },
      frieze: frieze(4),
      art: "cles",
      urgency: URGENCY.review,
    };
  }

  if (i.confirmedSit) {
    return ownerConfirmed(i, names, who, confirmedIn, URGENCY.confirmedLater, frieze);
  }

  if (i.activeSit) {
    const range = rangePhrase(i.activeSit.start_date, i.activeSit.end_date);
    const waits = names ? `${names} ${petCount > 1 ? "attendent leur" : "attend son"} gardien` : "votre maison attend son gardien";
    const nearby = i.nearbySittersCount ?? 0;
    return {
      space: "owner",
      chapter: "listed",
      eyebrow: "Votre annonce est en ligne",
      title: range ? `${cap(range)}, ${waits}.` : `${cap(waits)}.`,
      lead: "Les candidatures arrivent ici et dans vos messages.",
      cta: { label: "Voir mon annonce", href: `/sits/${i.activeSit.id}` },
      secondary: nearby > 0
        ? { label: `${nearby} gardien${nearby > 1 ? "s" : ""} à proximité`, href: "/recherche-gardiens" }
        : undefined,
      frieze: frieze(1),
      art: "porte",
      urgency: URGENCY.listed,
    };
  }

  if (draftAlive(i.latestDraft, i.today) && i.latestDraft) {
    return {
      space: "owner",
      chapter: "draft",
      eyebrow: "Votre annonce",
      title: "Votre annonce vous attend.",
      lead: "Reprenez-la là où vous l'avez laissée.",
      cta: { label: "Reprendre mon annonce", href: `/sits/create?draftId=${i.latestDraft.id}` },
      frieze: null,
      art: "porte",
      urgency: URGENCY.draft,
    };
  }

  const period: DeparturePeriod = i.period ?? "plus_tard";
  const city = clean(i.city);
  return {
    space: "owner",
    chapter: "first_listing",
    eyebrow: city ? `Votre maison à ${city}` : "Votre maison",
    title: `Qui veillera sur ${who} ${PERIOD_PHRASE[period]} ?`,
    lead: "Guardiens est gratuit. Les gardiens à proximité voient votre annonce dès sa publication.",
    cta: { label: "Commencer mon annonce", href: finishUrl(period) },
    frieze: null,
    art: "porte",
    urgency: URGENCY.firstListing,
  };
}

function ownerConfirmed(
  i: OwnerStoryInput,
  names: string,
  who: string,
  inDaysN: number | null,
  urgency: number,
  frieze: (n: number) => StoryFrieze,
): Story {
  const c = i.confirmedSit!;
  const sitter = clean(c.sitterFirstName);
  const date = storyDate(c.start_date);
  return {
    space: "owner",
    chapter: "confirmed",
    eyebrow: countdown(inDaysN) ?? "Votre garde",
    title: date
      ? `${sitter || "Votre gardien"} veillera sur ${who} à partir du ${date}.`
      : `${sitter || "Votre gardien"} veillera sur ${who}.`,
    lead: "Se rencontrer avant, si vous le souhaitez : une visite ou un appel.",
    cta: { label: sitter ? `Écrire à ${sitter}` : "Écrire à votre gardien", href: `/sits/${c.id}` },
    frieze: frieze(FRIEZE_MEETING_STEP),
    art: names ? "animal" : "cles",
    urgency,
  };
}

/* ─────────────────────────────── Gardien ─────────────────────────────── */

export interface SitterOpening {
  id: string;
  slug?: string | null;
  ownerFirstName?: string | null;
  city?: string | null;
  distanceKm?: number | null;
  start_date?: string | null;
  end_date?: string | null;
  petNames?: ReadonlyArray<string | null | undefined>;
}

export interface SitterStoryInput {
  today: string;
  ongoingSit?: { id: string; end_date?: string | null; ownerFirstName?: string | null; petNames?: ReadonlyArray<string | null | undefined> } | null;
  confirmedSit?: {
    id: string;
    propertyId?: string | null;
    start_date?: string | null;
    city?: string | null;
    ownerFirstName?: string | null;
    petNames?: ReadonlyArray<string | null | undefined>;
  } | null;
  reviewDue?: { sitId: string; ownerFirstName?: string | null } | null;
  /** Candidature en attente la plus récente (pending, viewed, discussing). */
  pendingApplication?: { sitId: string; ownerFirstName?: string | null; created_at?: string | null } | null;
  /** Garde ouverte mise en avant (la plus proche, aux dates libres). */
  opening?: SitterOpening | null;
  /** Gardes ouvertes en France, pour l'accès à la recherche nationale. */
  openCount?: number;
}

function openLink(n: number | undefined): StoryLink {
  const count = n ?? 0;
  return {
    label: count > 1 ? `Voir les ${count} gardes ouvertes` : "Voir les gardes ouvertes",
    href: "/search",
  };
}

function openingTitle(o: SitterOpening): string {
  const names = joinNames(o.petNames ?? []);
  const plural = (o.petNames ?? []).map(clean).filter(Boolean).length > 1;
  const city = clean(o.city);
  const where = city ? ` à ${city}` : "";
  if (names) return `${names} ${plural ? "attendent leur" : "attend son"} gardien${where}.`;
  return `Une maison attend son gardien${where}.`;
}

function openingLead(o: SitterOpening): string | undefined {
  const owner = clean(o.ownerFirstName);
  const range = rangePhrase(o.start_date, o.end_date);
  const parts = [owner ? `Chez ${owner}` : null, range].filter(Boolean);
  return parts.length ? `${parts.join(", ")}.` : undefined;
}

function discoverLabel(o: SitterOpening): string {
  const owner = clean(o.ownerFirstName);
  return owner ? `Découvrir chez ${owner}` : "Découvrir cette garde";
}

export function resolveSitterStory(i: SitterStoryInput): Story {
  const frieze = (current: number): StoryFrieze => ({ labels: SITTER_FRIEZE, current });

  if (i.ongoingSit) {
    const names = joinNames(i.ongoingSit.petNames ?? []);
    const owner = clean(i.ongoingSit.ownerFirstName);
    const end = storyDate(i.ongoingSit.end_date);
    return {
      space: "sitter",
      chapter: "ongoing",
      eyebrow: "Votre garde",
      title: names ? `Vous veillez sur ${names}.` : owner ? `Vous veillez sur la maison de ${owner}.` : "Vous veillez sur la maison.",
      lead: end ? `Jusqu'au ${end}.` : undefined,
      cta: { label: "Ouvrir la garde", href: `/sits/${i.ongoingSit.id}` },
      frieze: frieze(3),
      art: "matin",
      urgency: URGENCY.ongoing,
    };
  }

  if (i.confirmedSit) {
    const c = i.confirmedSit;
    const n = inDays(i.today, c.start_date);
    const names = joinNames(c.petNames ?? []);
    const plural = (c.petNames ?? []).map(clean).filter(Boolean).length > 1;
    const owner = clean(c.ownerFirstName);
    const date = storyDate(c.start_date);
    const city = clean(c.city);
    const eyebrow = [city || null, countdown(n)?.toLocaleLowerCase("fr-FR") ?? null].filter(Boolean).join(" · ") || "Votre garde";
    const title = names
      ? `${names} vous ${plural ? "attendent" : "attend"}${date ? ` le ${date}` : ""}.`
      : `${owner ? `La maison de ${owner}` : "La maison"} vous attend${date ? ` le ${date}` : ""}.`;
    if (n !== null && n <= GUIDE_OPENS_DAYS_BEFORE && c.propertyId) {
      return {
        space: "sitter",
        chapter: "guide_open",
        eyebrow: cap(eyebrow),
        title,
        lead: owner ? `Le guide de la maison de ${owner} est ouvert.` : "Le guide de la maison est ouvert.",
        cta: { label: "Lire le guide de la maison", href: `/house-guide/${c.propertyId}` },
        secondary: { label: owner ? `Écrire à ${owner}` : "Écrire au propriétaire", href: `/sits/${c.id}` },
        frieze: frieze(FRIEZE_MEETING_STEP),
        art: "cles",
        urgency: URGENCY.guideOpen,
      };
    }
    const guideDate = c.start_date ? storyDate(shiftDays(c.start_date, -GUIDE_OPENS_DAYS_BEFORE)) : null;
    return {
      space: "sitter",
      chapter: "confirmed",
      eyebrow: cap(eyebrow),
      title,
      lead: guideDate
        ? `Se rencontrer avant, si vous le souhaitez. Le guide de la maison s'ouvre le ${guideDate}.`
        : "Se rencontrer avant, si vous le souhaitez.",
      cta: { label: owner ? `Écrire à ${owner}` : "Écrire au propriétaire", href: `/sits/${c.id}` },
      frieze: frieze(FRIEZE_MEETING_STEP),
      art: names ? "animal" : "cles",
      urgency: n !== null && n <= CONFIRMED_URGENT_DAYS ? URGENCY.confirmedSoon : URGENCY.confirmedLater,
    };
  }

  if (i.reviewDue) {
    const owner = clean(i.reviewDue.ownerFirstName);
    return {
      space: "sitter",
      chapter: "review",
      eyebrow: "Votre garde est terminée",
      title: owner ? `Comment s'est passée la garde chez ${owner} ?` : "Comment s'est passée la garde ?",
      lead: "Votre avis aide les prochains gardiens à se projeter.",
      cta: { label: "Laisser un avis", href: `/review/${i.reviewDue.sitId}` },
      frieze: frieze(4),
      art: "cles",
      urgency: URGENCY.review,
    };
  }

  if (i.pendingApplication) {
    const p = i.pendingApplication;
    const owner = clean(p.ownerFirstName);
    const waited = p.created_at ? daysBetween(p.created_at.slice(0, 10), i.today) : null;
    if (waited !== null && waited >= SECOND_APPLICATION_AFTER_DAYS && i.opening && i.opening.id !== p.sitId) {
      const o = i.opening;
      const where = clean(o.city) ? ` à ${clean(o.city)}` : "";
      const names = joinNames(o.petNames ?? []);
      const plural = (o.petNames ?? []).map(clean).filter(Boolean).length > 1;
      const subject = names ? `${names} vous ${plural ? "attendent" : "attend"}` : "une autre maison vous attend";
      return {
        space: "sitter",
        chapter: "second_application",
        eyebrow: "Votre prochaine garde",
        title: owner ? `Pendant que ${owner} choisit, ${subject}${where}.` : `${cap(subject)}${where}.`,
        lead: openingLead(o),
        cta: { label: discoverLabel(o), href: `/sits/${o.slug || o.id}` },
        secondary: openLink(i.openCount),
        frieze: frieze(1),
        art: "animal",
        urgency: URGENCY.awaitingReply,
      };
    }
    return {
      space: "sitter",
      chapter: "applied",
      eyebrow: "Candidature envoyée",
      title: owner ? `Votre mot est chez ${owner}.` : "Votre candidature est envoyée.",
      lead: "La réponse arrive dans vos messages.",
      cta: { label: "Découvrir une autre garde", href: "/search" },
      secondary: { label: "Voir mes candidatures", href: "/mes-candidatures" },
      frieze: frieze(1),
      art: "lettre",
      urgency: URGENCY.awaitingReply,
    };
  }

  if (i.opening) {
    const o = i.opening;
    const km = typeof o.distanceKm === "number" && Number.isFinite(o.distanceKm) ? Math.max(1, Math.round(o.distanceKm)) : null;
    return {
      space: "sitter",
      chapter: "opening",
      eyebrow: km ? `Nouvelle garde, à ${km} km` : "Nouvelle garde",
      title: openingTitle(o),
      lead: openingLead(o),
      cta: { label: discoverLabel(o), href: `/sits/${o.slug || o.id}` },
      secondary: openLink(i.openCount),
      frieze: frieze(0),
      art: "animal",
      urgency: URGENCY.opening,
    };
  }

  const count = i.openCount ?? 0;
  return {
    space: "sitter",
    chapter: "discover",
    eyebrow: "Votre prochaine garde",
    title: count > 1 ? `${count} gardes ouvertes vous attendent en France.` : "Des gardes vous attendent en France.",
    lead: "Choisissez la maison et les animaux qui vous ressemblent.",
    cta: openLink(i.openCount),
    frieze: frieze(0),
    art: "depart",
    urgency: URGENCY.discover,
  };
}

/** Jour décalé de n jours, AAAA-MM-JJ. */
export function shiftDays(ymd: string, n: number): string {
  const d = calendarDate(ymd);
  d.setDate(d.getDate() + n);
  const p = (x: number) => String(x).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

/* ───────────────────────────── Double rôle ───────────────────────────── */

/**
 * Récit ouvert en premier pour un membre à double rôle : le dernier choix du
 * membre s'il existe, sinon le plus urgent ; à égalité, l'espace propriétaire.
 */
export function pickFirstStory(owner: Story, sitter: Story, lastChoice?: StorySpace | null): Story {
  if (lastChoice === "owner") return owner;
  if (lastChoice === "sitter") return sitter;
  return sitter.urgency < owner.urgency ? sitter : owner;
}

/** Point d'entrée : récit d'un espace. */
export function resolveStory(
  input: ({ space: "owner" } & OwnerStoryInput) | ({ space: "sitter" } & SitterStoryInput),
): Story {
  return input.space === "owner" ? resolveOwnerStory(input) : resolveSitterStory(input);
}
