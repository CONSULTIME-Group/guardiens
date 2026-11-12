/**
 * Lot SORT1 (12/11/2026) : sorties à places comptées de la rubrique
 * « Entraide & sorties ». Règles pures et textes membres, sans lecture réseau.
 * Les lectures et écritures vivent dans src/lib/outingsData.ts.
 */
import spotJeux from "@/assets/missions/spot-jeux-480.webp";
import spotChien from "@/assets/missions/spot-chien-480.webp";
import spotJardin from "@/assets/missions/spot-jardin-480.webp";
import spotBienetre from "@/assets/missions/spot-bienetre-480.webp";
import spotCourses from "@/assets/missions/spot-courses-480.webp";
import spotTrajet from "@/assets/missions/spot-trajet-480.webp";
import spotBricolage from "@/assets/missions/spot-bricolage-480.webp";
import spotVerger from "@/assets/missions/spot-verger-480.webp";

export { OUTINGS_FLAG } from "@/lib/outingsFlag";

export const OUTING_CAPACITY_MIN = 2;
export const OUTING_CAPACITY_MAX = 20;
export const OUTING_TITLE_MIN = 4;
export const OUTING_TITLE_MAX = 80;
export const OUTING_DESCRIPTION_MAX = 1500;
export const OUTING_FEE_MAX = 200;

export type OutingCategory = "jeux" | "balades" | "chiens" | "velo" | "jardin" | "repas" | "culture" | "ateliers" | "autre";
export type OutingPlaceKind = "home" | "public" | "online";
export type OutingSetting = "indoor" | "outdoor";
export type OutingSource = "site" | "lien" | "alerte" | "garde";

/** Catégories validées par Jérémie le 11/11/2026, dans l'ordre d'affichage. */
export const OUTING_CATEGORIES: ReadonlyArray<{ value: OutingCategory; label: string; art: string; alt: string }> = [
  { value: "jeux", label: "Jeux", art: spotJeux, alt: "Deux personnes jouent aux cartes" },
  { value: "balades", label: "Balades et randonnées", art: spotBienetre, alt: "Deux personnes partagent un moment dehors" },
  { value: "chiens", label: "Avec les chiens", art: spotChien, alt: "Une personne promène un chien" },
  { value: "velo", label: "Vélo", art: spotTrajet, alt: "Un trajet sur une petite route" },
  { value: "jardin", label: "Jardin et potager", art: spotJardin, alt: "Une personne jardine" },
  { value: "repas", label: "Repas et cuisine", art: spotCourses, alt: "Un panier de courses" },
  { value: "culture", label: "Culture", art: spotBienetre, alt: "Deux personnes partagent un moment" },
  { value: "ateliers", label: "Ateliers", art: spotBricolage, alt: "Une personne bricole" },
  { value: "autre", label: "Autre", art: spotVerger, alt: "Un verger" },
];

export function outingCategory(value: string | null | undefined) {
  return OUTING_CATEGORIES.find((c) => c.value === value) ?? OUTING_CATEGORIES[OUTING_CATEGORIES.length - 1];
}

export const OUTING_PLACE_KINDS: ReadonlyArray<{ value: OutingPlaceKind; label: string; help: string }> = [
  { value: "public", label: "Lieu public", help: "Un parc, un café, une place : la fiche affiche le lieu." },
  { value: "home", label: "Chez moi", help: "La fiche affiche votre quartier. Vous donnez l'adresse par message aux inscrits." },
  { value: "online", label: "En ligne", help: "Vous envoyez le lien par message aux inscrits." },
];

/** Ligne de la vue public_outings. */
export interface PublicOuting {
  id: string;
  slug: string;
  organizer_id: string;
  title: string;
  description: string;
  category: OutingCategory;
  starts_at: string;
  place_kind: OutingPlaceKind;
  place_label: string;
  setting: OutingSetting | null;
  city: string;
  postal_code: string;
  capacity: number;
  reserved: number;
  participation_eur: number | null;
  status: "open" | "cancelled";
  cancel_note: string | null;
  cancelled_at: string | null;
  created_at: string;
  taken: number;
  organizer_first_name: string | null;
  organizer_member_since: string | null;
  organizer_identity_verified: boolean;
}

export type OutingState = "open" | "full" | "cancelled" | "past";

export function placesLeft(outing: Pick<PublicOuting, "capacity" | "taken">): number {
  return Math.max(0, outing.capacity - outing.taken);
}

export function outingState(outing: Pick<PublicOuting, "status" | "starts_at" | "capacity" | "taken">, now: Date = new Date()): OutingState {
  if (outing.status === "cancelled") return "cancelled";
  if (new Date(outing.starts_at).getTime() <= now.getTime()) return "past";
  return placesLeft(outing) === 0 ? "full" : "open";
}

/** « 1 place sur 4 », « 3 places sur 8 », « Complet, 4 sur 4 ». */
export function placesLine(outing: Pick<PublicOuting, "capacity" | "taken">): string {
  const left = placesLeft(outing);
  if (left === 0) return `Complet, ${outing.capacity} sur ${outing.capacity}`;
  return `${left} ${left > 1 ? "places" : "place"} sur ${outing.capacity}`;
}

/** « 3 personnes déjà là ». */
export function takenLine(taken: number): string {
  return `${taken} ${taken > 1 ? "personnes" : "personne"} déjà là`;
}

/** « Gratuit » ou « Participation : 3 € » (« 3,50 € » avec des centimes). */
export function feeLabel(participationEur: number | null | undefined): string {
  if (participationEur === null || participationEur === undefined || !(participationEur > 0)) return "Gratuit";
  const euros = Number.isInteger(participationEur)
    ? String(participationEur)
    : participationEur.toFixed(2).replace(".", ",");
  return `Participation : ${euros} €`;
}

const DAY_FORMAT = new Intl.DateTimeFormat("fr-FR", { weekday: "long", day: "numeric", month: "long", timeZone: "Europe/Paris" });
const HOUR_FORMAT = new Intl.DateTimeFormat("fr-FR", { hour: "numeric", minute: "2-digit", hour12: false, timeZone: "Europe/Paris" });

/** « Samedi 12 décembre, 18 h » ou « Samedi 12 décembre, 18 h 30 », à l'heure de Paris. */
export function outingDateLabel(startsAt: string): string {
  const date = new Date(startsAt);
  if (Number.isNaN(date.getTime())) return "";
  const day = DAY_FORMAT.format(date);
  const parts = HOUR_FORMAT.formatToParts(date);
  const hour = Number(parts.find((p) => p.type === "hour")?.value ?? "0");
  const minute = parts.find((p) => p.type === "minute")?.value ?? "00";
  const time = minute === "00" ? `${hour} h` : `${hour} h ${minute}`;
  return `${day.charAt(0).toUpperCase()}${day.slice(1)}, ${time}`;
}

/** Lieu affiché sur la fiche : jamais une adresse de domicile. */
export function outingPlaceLine(outing: Pick<PublicOuting, "place_kind" | "place_label" | "city" | "organizer_first_name">): string {
  const label = outing.place_label.trim();
  if (outing.place_kind === "online") return "En ligne";
  if (outing.place_kind === "home") {
    const where = label || outing.city;
    return outing.organizer_first_name ? `${where}, chez ${outing.organizer_first_name}` : where;
  }
  return label && outing.city && !label.toLowerCase().includes(outing.city.toLowerCase()) ? `${label}, ${outing.city}` : label || outing.city;
}

export function settingLabel(setting: OutingSetting | null): string | null {
  if (setting === "indoor") return "En intérieur";
  if (setting === "outdoor") return "En extérieur";
  return null;
}

export interface OutingDraft {
  title: string;
  description: string;
  category: OutingCategory | "";
  date: string;
  time: string;
  placeKind: OutingPlaceKind | "";
  placeLabel: string;
  city: string;
  postalCode: string;
  setting: OutingSetting | "";
  capacity: number;
  reserved: number;
  free: boolean;
  fee: string;
  agendaConsent: boolean;
}

export const EMPTY_OUTING_DRAFT: OutingDraft = {
  title: "",
  description: "",
  category: "",
  date: "",
  time: "",
  placeKind: "",
  placeLabel: "",
  city: "",
  postalCode: "",
  setting: "",
  capacity: 4,
  reserved: 1,
  free: true,
  fee: "",
  agendaConsent: false,
};

export type OutingDraftField = "title" | "category" | "date" | "time" | "placeKind" | "placeLabel" | "city" | "capacity" | "fee" | "description";

/** Montant saisi (« 3 », « 3,50 ») lu en euros, ou null. */
export function parseFee(input: string): number | null {
  const value = Number(input.trim().replace(",", "."));
  if (!Number.isFinite(value) || value <= 0) return null;
  return Math.round(value * 100) / 100;
}

/** Jour et heure saisis, lus à l'heure de l'appareil. */
export function draftStartsAt(draft: Pick<OutingDraft, "date" | "time">): Date | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(draft.date) || !/^\d{2}:\d{2}$/.test(draft.time)) return null;
  const [y, m, d] = draft.date.split("-").map(Number);
  const [hh, mm] = draft.time.split(":").map(Number);
  const date = new Date(y, m - 1, d, hh, mm, 0, 0);
  return Number.isNaN(date.getTime()) ? null : date;
}

/** Ce qui manque avant de publier, un message affirmatif par champ. */
export function outingDraftErrors(draft: OutingDraft, now: Date = new Date()): Partial<Record<OutingDraftField, string>> {
  const errors: Partial<Record<OutingDraftField, string>> = {};
  const title = draft.title.trim();
  if (title.length < OUTING_TITLE_MIN) errors.title = "Donnez un titre à votre sortie.";
  else if (title.length > OUTING_TITLE_MAX) errors.title = `Gardez un titre de ${OUTING_TITLE_MAX} caractères au plus.`;
  if (draft.description.length > OUTING_DESCRIPTION_MAX) errors.description = `Gardez un texte de ${OUTING_DESCRIPTION_MAX} caractères au plus.`;
  if (!draft.category) errors.category = "Choisissez une activité.";
  if (!draft.date) errors.date = "Choisissez un jour.";
  if (!draft.time) errors.time = "Choisissez une heure.";
  const startsAt = draftStartsAt(draft);
  if (draft.date && draft.time && (!startsAt || startsAt.getTime() <= now.getTime())) errors.date = "Choisissez un jour à venir.";
  if (!draft.placeKind) errors.placeKind = "Choisissez un lieu.";
  if (draft.placeKind === "public" && draft.placeLabel.trim().length < 2) errors.placeLabel = "Indiquez le lieu du rendez-vous.";
  if (draft.placeKind && draft.placeKind !== "online" && draft.city.trim().length < 2) errors.city = "Indiquez la commune.";
  if (!Number.isInteger(draft.capacity) || draft.capacity < OUTING_CAPACITY_MIN || draft.capacity > OUTING_CAPACITY_MAX) {
    errors.capacity = `Choisissez entre ${OUTING_CAPACITY_MIN} et ${OUTING_CAPACITY_MAX} places.`;
  } else if (!Number.isInteger(draft.reserved) || draft.reserved < 1 || draft.reserved >= draft.capacity) {
    errors.capacity = "Gardez au moins une place à prendre.";
  }
  if (!draft.free) {
    const fee = parseFee(draft.fee);
    if (fee === null) errors.fee = "Indiquez le montant par personne.";
    else if (fee > OUTING_FEE_MAX) errors.fee = `Gardez une participation de ${OUTING_FEE_MAX} € au plus.`;
  }
  return errors;
}

/** Ligne à insérer dans public.outings. */
export function outingInsertFromDraft(draft: OutingDraft, organizerId: string) {
  const startsAt = draftStartsAt(draft);
  if (!startsAt || !draft.category || !draft.placeKind) throw new Error("outing_draft_incomplete");
  return {
    organizer_id: organizerId,
    title: draft.title.trim().replace(/\s+/g, " "),
    description: draft.description.trim(),
    category: draft.category,
    starts_at: startsAt.toISOString(),
    place_kind: draft.placeKind,
    place_label: draft.placeKind === "online" ? "" : draft.placeLabel.trim(),
    city: draft.placeKind === "online" ? "" : draft.city.trim(),
    postal_code: draft.placeKind === "online" ? "" : draft.postalCode.trim(),
    setting: draft.placeKind === "online" ? null : draft.setting || null,
    capacity: draft.capacity,
    reserved: draft.reserved,
    participation_eur: draft.free ? null : parseFee(draft.fee),
    agenda_consent: draft.agendaConsent,
  };
}

const pad = (n: number) => String(n).padStart(2, "0");

/**
 * Lot SORT2 : brouillon repris d'une sortie existante. « Modifier » garde le
 * jour et l'heure, « Reproposer » les laisse à choisir.
 */
export function draftFromOuting(outing: PublicOuting, opts: { keepDate: boolean }): OutingDraft {
  const start = new Date(outing.starts_at);
  const validDate = opts.keepDate && !Number.isNaN(start.getTime());
  return {
    title: outing.title,
    description: outing.description,
    category: outing.category,
    date: validDate ? `${start.getFullYear()}-${pad(start.getMonth() + 1)}-${pad(start.getDate())}` : "",
    time: validDate ? `${pad(start.getHours())}:${pad(start.getMinutes())}` : "",
    placeKind: outing.place_kind,
    placeLabel: outing.place_label,
    city: outing.city,
    postalCode: outing.postal_code,
    setting: outing.setting ?? "",
    capacity: outing.capacity,
    reserved: outing.reserved,
    free: outing.participation_eur === null,
    fee: outing.participation_eur === null ? "" : String(outing.participation_eur).replace(".", ","),
    agendaConsent: false,
  };
}

/** Champs qu'un organisateur modifie sur une sortie publiée (l'accord d'agenda reste celui de la publication). */
export function outingUpdateFromDraft(draft: OutingDraft) {
  const { organizer_id: _organizer, agenda_consent: _agenda, ...row } = outingInsertFromDraft(draft, "");
  return row;
}

/** Places déjà prises par des inscrits : le total ne descend jamais dessous. */
export function minCapacityForEdit(outing: Pick<PublicOuting, "taken" | "reserved">, reserved: number): number {
  const attendees = Math.max(0, outing.taken - outing.reserved);
  return Math.max(OUTING_CAPACITY_MIN, reserved + Math.max(attendees, 1));
}

/** Adresse de partage, avec la marque de provenance « lien d'un proche ». */
export const SHARE_SOURCE_PARAM = "via";
export const SHARE_SOURCE_VALUE = "proche";

export function outingPath(slug: string): string {
  return `/sorties/${slug}`;
}

export function outingShareUrl(slug: string, origin: string): string {
  return `${origin.replace(/\/$/, "")}${outingPath(slug)}?${SHARE_SOURCE_PARAM}=${SHARE_SOURCE_VALUE}`;
}

export function joinSourceFromSearch(search: string): OutingSource {
  const via = new URLSearchParams(search).get(SHARE_SOURCE_PARAM);
  if (via === SHARE_SOURCE_VALUE) return "lien";
  if (via === "alerte") return "alerte";
  if (via === "garde") return "garde";
  return "site";
}

/** Texte prêt à envoyer à ses proches. */
export function outingShareText(outing: Pick<PublicOuting, "title" | "starts_at" | "capacity" | "taken">): string {
  const left = placesLeft(outing);
  const places = left > 1 ? `il reste ${left} places` : "il reste une place";
  return `${outing.title}, ${outingDateLabel(outing.starts_at).toLowerCase()} : ${places}. Vous venez ?`;
}

/** Réponses de outing_join traduites pour le membre. */
export const JOIN_REFUSAL: Record<string, string> = {
  full: "Cette sortie vient de se remplir. D'autres sorties vous attendent près de chez vous.",
  cancelled: "Cette sortie est annulée.",
  past: "Cette sortie a déjà eu lieu.",
  removed: "Votre place a été libérée par l'organisateur.",
  organizer: "Vous organisez cette sortie, votre place est déjà comptée.",
  not_found: "Cette sortie est indisponible pour le moment.",
  auth: "Connectez-vous pour prendre une place.",
};

export const OUTING_COPY = {
  tabs: { entraide: "Entraide", sorties: "Sorties" },
  hubTitle: "Entraide & sorties",
  sortiesTitle: "Sorties et parties près de chez vous",
  sortiesIntro: "Une belote à quatre, une balade à vélo, une randonnée, des échecs en ligne. Des moments à quelques-uns, avec des places comptées. Guardiens est gratuit.",
  propose: "Proposer une sortie",
  join: "Je viens",
  leave: "Libérer ma place",
  write: "Écrire",
  going: "Votre place est réservée",
  how: "Vous dites « Je viens », votre place est réservée. L'organisateur vous donne le rendez-vous par message, en personne ou en ligne. Un empêchement ? « Libérer ma place » la rend aux gens du coin.",
  emptyTitle: (city: string | null) => (city ? `La première sortie à ${city}, c'est la vôtre` : "La première sortie près de chez vous, c'est la vôtre"),
  emptyBody: "Une balade, une belote, un café au marché : vous fixez le jour et le nombre de places. Vous recevez un lien à envoyer à vos proches.",
  formIntro: "Choisissez l'activité, le jour, le lieu et le nombre de places. Vous recevez un lien à envoyer à vos proches, et chaque « Je viens » prend une place.",
  placeHome: "La fiche affiche votre quartier, et vous donnez l'adresse par message aux inscrits.",
  feeHelp: "Gratuit, ou un montant par personne pour partager les frais (location, boissons, essence). Chacun règle sur place.",
  rules: "Une sortie réunit des adultes autour d'un moment partagé. Les ventes, les prestations payées et la garde d'enfants ont leur place ailleurs.",
  agenda: "J'accepte que Guardiens relaie cette sortie sur des agendas locaux gratuits.",
  published: "Votre sortie est en ligne.",
  updated: "Votre sortie est à jour.",
  edit: "Modifier",
  editTitle: "Modifier ma sortie",
  editIntro: "Un changement de jour, d'heure ou de lieu est signalé aux inscrits dans leur cloche.",
  repropose: "Reproposer cette sortie",
  reproposeIntro: "Tout est repris de votre sortie précédente : choisissez le nouveau jour.",
  capacityFloor: "Des inscrits comptent sur leur place : gardez un total au moins égal aux places prises.",
  shareTitle: "Le lien à envoyer à vos proches",
  shareBody: "Vos proches voient la fiche sans compte. Un compte gratuit suffit pour prendre une place.",
  guest: "Un compte gratuit suffit pour prendre une place : prénom, email, code postal.",
} as const;
