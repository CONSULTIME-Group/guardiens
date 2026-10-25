/**
 * Lot E18 (25/10/2026, arène entraide, décision de Jérémie « ok go ça me va ») :
 * lexique unique de l'Entraide, lu par les écrans du site (src/lib/entraideCopy.ts)
 * et par les envois (email aux aidants). Module pur, sans dépendance, importable
 * par Deno et par Vite.
 *
 * Vocabulaire : besoin, coup de main, Je peux, Choisir {prénom},
 * Merci, c'est pourvu, En retour, Le coup de main a eu lieu ?
 */

export const ENTRAIDE_COPY = {
  need: "besoin",
  needs: "besoins",
  help: "coup de main",
  canHelp: "Je peux",
  provided: "Merci, c'est pourvu",
  inReturn: "En retour",
  happened: "Le coup de main a eu lieu ?",
  needOnline: "Votre besoin est en ligne",
  readWholeNeed: "Lire le besoin en entier",
  whenFree: "Quand êtes-vous libre ?",
  send: "Envoyer",
  needOpen: "Besoin ouvert",
  needClosed: "Besoin clos",
} as const;

/** « Choisir {prénom} », bouton de choix d'un répondant. */
export function chooseLabel(firstName: string | null | undefined): string {
  const name = (firstName || "").trim();
  return name ? `Choisir ${name}` : "Choisir cette personne";
}

/**
 * Durées d'un besoin d'entraide, telles que le formulaire les propose
 * (« Plusieurs passages » pour several, n° 38 du registre).
 */
export const ENTRAIDE_DURATION_LABELS: Record<string, string> = {
  "1-2h": "1 à 2 heures",
  half_day: "Une demi-journée",
  full_day: "Une journée",
  day: "Une journée",
  several: "Plusieurs passages",
  weekend: "Un week-end",
  week: "Une semaine",
};

export function entraideDurationLabel(raw: string | null | undefined): string | null {
  const key = typeof raw === "string" ? raw.trim() : "";
  if (!key) return null;
  return ENTRAIDE_DURATION_LABELS[key] ?? null;
}

const NBSP = " ";

/** Titre d'un besoin prêt à citer entre guillemets : espaces, guillemets et ponctuation finale retirés. */
export const HEADLINE_TITLE_MAX = 90;

export function quotableNeedTitle(title: string | null | undefined, max: number = HEADLINE_TITLE_MAX): string {
  let t = typeof title === "string" ? title.replace(/\s+/g, " ").trim() : "";
  t = t.replace(/^[«"“”'\s]+/, "").replace(/[»"“”'\s]+$/, "").trim();
  t = t.replace(/[\s.,;:!?…]+$/, "").trim();
  if (t.length > max) {
    const cut = t.slice(0, max);
    const lastSpace = cut.lastIndexOf(" ");
    t = `${(lastSpace > max * 0.6 ? cut.slice(0, lastSpace) : cut).replace(/[\s.,;:!?]+$/, "")}…`;
  }
  return t;
}

/** Distance écrite pour une personne : entier, « moins d'un km » sous 1 km. */
export function distancePhrase(distanceKm: number | null | undefined): string | null {
  if (typeof distanceKm !== "number" || !Number.isFinite(distanceKm)) return null;
  const d = Math.round(Math.max(0, distanceKm));
  return d < 1 ? "à moins d'un km" : `à ${d}${NBSP}km`;
}

/**
 * Accroche d'un besoin, partagée par le site et l'email aux aidants :
 * « {Prénom}, à {N} km, cherche un coup de main : « {titre} » ».
 * Le titre est cité tel que la personne l'a écrit : la phrase reste correcte
 * quelle que soit sa forme (« D'une personne pour… », « Bonjour… », infinitif).
 */
export function needHeadline(
  ownerFirstName: string | null | undefined,
  distanceKm: number | null | undefined,
  title: string | null | undefined,
  dateLabel?: string | null,
): string {
  const who = (ownerFirstName || "").trim() || "Un membre du coin";
  const where = distancePhrase(distanceKm);
  const quoted = quotableNeedTitle(title);
  const head = where ? `${who}, ${where}, cherche un coup de main` : `${who} cherche un coup de main`;
  const body = quoted ? `${head}${NBSP}: «${NBSP}${quoted}${NBSP}»` : head;
  const when = dateLabel && dateLabel.trim() ? `, le ${dateLabel.trim()}` : "";
  return `${body}${when}.`;
}

/**
 * Ligne de confirmation après publication : vraie, la première vague part
 * tout de suite (CreateSmallMission appelle notify-mission-wave à la publication).
 */
export function publishedReachLine(count: number | null | undefined): string {
  if (typeof count !== "number" || !Number.isFinite(count)) {
    return "Les personnes disponibles les plus proches le reçoivent par email, dix à la fois.";
  }
  if (count <= 0) {
    return "Il est visible sur la page Entraide, et les personnes qui rejoignent votre secteur le découvriront.";
  }
  if (count === 1) return "1 personne à moins de 30 km va le recevoir.";
  if (count <= WAVE_GROUP_SIZE) return `${count} personnes à moins de 30 km vont le recevoir.`;
  return `${count} personnes à moins de 30 km peuvent le recevoir, dix à la fois, les plus proches d'abord.`;
}

/** Taille d'une vague (miroir de WAVE_SIZE de mission-wave.ts). */
export const WAVE_GROUP_SIZE = 10;
