/**
 * Entraide, fin d'échange : logique pure de la relance « Vous vous êtes rencontrés ? ».
 *
 * Deux règles de date :
 *  - le besoin porte une date : la relance part le lendemain de cette date ;
 *  - le besoin ne porte aucune date : la relance part trois jours après
 *    l'acceptation du « je peux ».
 *
 * Garde-fou : seuls les besoins dont la date de référence tombe après la mise
 * en service du dispositif sont relancés.
 */

/** Mise en service de la relance de fin d'échange. */
export const MEETUP_SERVICE_START = "2026-09-21";

/** Délai de relance après la date du besoin, en jours. */
export const MEETUP_DELAY_DAYS = 1;

/** Délai de relance après l'acceptation, quand aucune date n'est indiquée. */
export const MEETUP_NO_DATE_DELAY_DAYS = 3;

export interface MeetupCandidate {
  end_date?: string | null;
  date_needed?: string | null;
  accepted_at?: string | null;
  response_created_at?: string | null;
}

const DAY_MS = 24 * 60 * 60 * 1000;

const parse = (value?: string | null): Date | null => {
  if (!value) return null;
  const d = new Date(value.length === 10 ? `${value}T12:00:00Z` : value);
  return Number.isNaN(d.getTime()) ? null : d;
};

/** Date de référence du besoin, celle qui commande la relance. */
export function meetupReferenceDate(m: MeetupCandidate): Date | null {
  const dated = parse(m.end_date) ?? parse(m.date_needed);
  if (dated) return dated;
  return parse(m.accepted_at) ?? parse(m.response_created_at);
}

/** Vrai quand la relance de fin d'échange doit partir maintenant. */
export function isMeetupDue(m: MeetupCandidate, now: Date): boolean {
  const reference = meetupReferenceDate(m);
  if (!reference) return false;

  const start = parse(MEETUP_SERVICE_START);
  if (start && reference.getTime() < start.getTime()) return false;

  const hasDate = Boolean(m.end_date || m.date_needed);
  const delay = hasDate ? MEETUP_DELAY_DAYS : MEETUP_NO_DATE_DELAY_DAYS;
  return now.getTime() >= reference.getTime() + delay * DAY_MS;
}

/** Objet et corps courts de la relance, pour l'email et la notification. */
export const MEETUP_PROMPT_TITLE = "Vous vous êtes rencontrés ?";

export function meetupPromptBody(otherFirstName: string | null, missionTitle: string | null): string {
  const who = otherFirstName?.trim() || "la personne du coin";
  const what = missionTitle?.trim();
  return what
    ? `Dites-nous en un clic si le coup de main avec ${who} a eu lieu, pour « ${what} ».`
    : `Dites-nous en un clic si le coup de main avec ${who} a eu lieu.`;
}

/** Ligne de preuve glissée dans l'email de vague, quand une rencontre récente est proche. */
export function proofEmailLine(p: {
  owner_first_name?: string | null;
  helper_first_name?: string | null;
  distance_km?: number | null;
  mission_title?: string | null;
  week_label?: string | null;
}): string {
  const when = p.week_label?.trim() || "Récemment";
  const where = typeof p.distance_km === "number" ? `, à ${Math.round(p.distance_km)} km` : "";
  const owner = p.owner_first_name?.trim() || "Une personne du coin";
  const helper = p.helper_first_name?.trim() || "quelqu'un du coin";
  const what = p.mission_title?.trim() ? ` pour ${p.mission_title.trim()}` : "";
  return `${when}${where} : ${owner} a reçu un coup de main de ${helper}${what}.`;
}

/** Rayon de proximité d'une preuve, en kilomètres. */
export const PROOF_RADIUS_KM = 50;

export interface ProofRow {
  mission_id: string;
  owner_first_name: string | null;
  helper_first_name: string | null;
  city: string | null;
  latitude_approx: number | null;
  longitude_approx: number | null;
  word: string | null;
  happened_at: string | null;
}

function distanceKm(aLat: number, aLon: number, bLat: number, bLon: number): number {
  const toRad = (v: number) => (v * Math.PI) / 180;
  const dLat = toRad(bLat - aLat);
  const dLon = toRad(bLon - aLon);
  const h = Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(aLat)) * Math.cos(toRad(bLat)) * Math.sin(dLon / 2) ** 2;
  return 6371 * 2 * Math.asin(Math.min(1, Math.sqrt(h)));
}

/** La preuve la plus récente à moins de PROOF_RADIUS_KM du point donné. */
export function pickNearestProof(
  proofs: ProofRow[],
  lat: number | null,
  lon: number | null,
  radiusKm: number = PROOF_RADIUS_KM,
): { proof: ProofRow; distance_km: number } | null {
  if (lat === null || lon === null) return null;
  const near = proofs
    .filter((p) => p.latitude_approx !== null && p.longitude_approx !== null)
    .map((p) => ({ proof: p, distance_km: distanceKm(lat, lon, p.latitude_approx as number, p.longitude_approx as number) }))
    .filter((p) => p.distance_km <= radiusKm)
    .sort((a, b) => new Date(b.proof.happened_at ?? 0).getTime() - new Date(a.proof.happened_at ?? 0).getTime());
  return near[0] ?? null;
}

/** Date en semaine, pour la ligne de preuve. */
export function proofWeekLabel(value: string | null, now: Date = new Date()): string {
  if (!value) return "Récemment";
  const then = new Date(value);
  if (Number.isNaN(then.getTime())) return "Récemment";
  const days = Math.max(0, Math.floor((now.getTime() - then.getTime()) / DAY_MS));
  if (days === 0) return "Aujourd'hui";
  if (days === 1) return "Hier";
  if (days < 7) return `Il y a ${days} jours`;
  if (days < 14) return "La semaine dernière";
  const weeks = Math.floor(days / 7);
  if (weeks < 5) return `Il y a ${weeks} semaines`;
  const months = Math.max(1, Math.floor(days / 30));
  return months === 1 ? "Il y a un mois" : `Il y a ${months} mois`;
}
