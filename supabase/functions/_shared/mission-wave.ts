// Moteur de vagues de l'Entraide, logique pure et testable.
//
// Modèle : un besoin, dix personnes du coin, un « je peux ».
// Chaque vague prévient les dix membres disponibles les plus proches encore
// jamais prévenus. Sans « je peux » au bout de 48 heures, la vague suivante
// part. Aucune donnée personnelle ne sort d'ici : prénom, ville et distance
// arrondie, rien d'autre.

export const WAVE_SIZE = 10;
export const WAVE_INTERVAL_HOURS = 48;
/** Au plus trois vagues par besoin, soit trente personnes prévenues. */
export const WAVE_MAX_COUNT = 3;
/** En deçà de ce rayon, personne de disponible signifie vraiment personne. */
export const WAVE_MIN_RADIUS_KM = 30;

export interface WaveCandidate {
  helper_id: string;
  distance_km: number | null;
}

/** Distance affichée : entier en kilomètres, jamais de décimale trompeuse. */
export function roundDistanceKm(km: number | null | undefined): number | null {
  if (km == null || !Number.isFinite(km)) return null;
  return Math.max(0, Math.round(km));
}

/**
 * Sélection d'une vague : plus proches d'abord, personnes déjà prévenues
 * écartées, plafond à `size`. Le tri est stable sur l'identifiant pour que
 * deux passages successifs donnent le même résultat.
 */
export function pickNextWave(
  candidates: WaveCandidate[],
  alreadyNotified: Iterable<string>,
  size: number = WAVE_SIZE,
): WaveCandidate[] {
  const seen = new Set(alreadyNotified);
  return candidates
    .filter((c) => !seen.has(c.helper_id))
    .slice()
    .sort((a, b) => {
      const da = a.distance_km ?? Number.POSITIVE_INFINITY;
      const db = b.distance_km ?? Number.POSITIVE_INFINITY;
      if (da !== db) return da - db;
      return a.helper_id.localeCompare(b.helper_id);
    })
    .slice(0, Math.max(0, size));
}

export interface WaveMissionState {
  status: string;
  wave_count: number | null;
  last_wave_at: string | null;
  /** Nombre de réponses « je peux » déjà reçues. */
  response_count: number;
}

/**
 * Vague suivante due ? Seulement pour un besoin encore ouvert, sans aucune
 * réponse, dont la dernière vague date de plus de 48 heures.
 */
export function shouldSendNextWave(m: WaveMissionState, now: Date): boolean {
  if (m.status !== "open") return false;
  if (m.response_count > 0) return false;
  if ((m.wave_count ?? 0) >= WAVE_MAX_COUNT) return false;
  if (!m.last_wave_at) return true;
  const elapsed = now.getTime() - new Date(m.last_wave_at).getTime();
  return elapsed >= WAVE_INTERVAL_HOURS * 3600 * 1000;
}

/** Ligne d'annonce envoyée à chaque personne prévenue. */
export function waveHeadline(
  ownerFirstName: string | null | undefined,
  distanceKm: number | null,
  title: string,
  dateLabel: string | null,
): string {
  const who = ownerFirstName?.trim() || "Un membre du coin";
  const d = roundDistanceKm(distanceKm);
  const where = d == null ? "" : `, à ${d} km,`;
  const when = dateLabel ? `, ${dateLabel}` : "";
  return `${who}${where} a besoin de quelqu'un pour ${title}${when}.`;
}

/** Message au demandeur quand une nouvelle vague part. */
export const WAVE_RELAUNCH_MESSAGE =
  "On prévient dix autres personnes du coin.";

/**
 * Message au demandeur quand il n'y a vraiment personne de disponible autour
 * de lui. Ton du bloc « quand la personne touche le vide » : on dit la vérité,
 * on ne promet rien, on laisse la porte ouverte.
 */
export const WAVE_EMPTY_MESSAGE =
  "Votre besoin est visible sur la page Entraide. Dès qu'une personne disponible rejoint votre secteur, elle le découvre et peut vous répondre.";

/** Date lisible, en français, pour l'annonce. */
export function frenchDateLabel(iso: string | null | undefined): string | null {
  if (!iso) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  return new Intl.DateTimeFormat("fr-FR", {
    day: "numeric",
    month: "long",
    timeZone: "Europe/Paris",
  }).format(d);
}
