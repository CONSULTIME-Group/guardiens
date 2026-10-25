// Moteur de vagues de l'Entraide, logique pure et testable.
//
// Modèle : un besoin, dix personnes du coin, un « je peux ».
// Chaque vague prévient les dix membres disponibles les plus proches encore
// jamais prévenus. Sans « je peux » au bout de 48 heures, la vague suivante
// part. Aucune donnée personnelle ne sort d'ici : prénom, ville et distance
// arrondie, rien d'autre.

import { entraideDurationLabel, needHeadline } from "./entraideCopy.ts";
import { NEED_EXCERPT_EMAIL_MAX, needExcerpt } from "./needExcerpt.ts";

export const WAVE_SIZE = 10;
export const WAVE_INTERVAL_HOURS = 48;
/** Au plus cinq vagues par besoin, soit cinquante personnes prévenues. */
export const WAVE_MAX_COUNT = 5;
/** Une réponse « pending » plus ancienne que ce délai cesse de geler la diffusion. */
export const PENDING_RESPONSE_GRACE_DAYS = 5;

export interface WaveResponseRow {
  status: string;
  created_at: string;
}

/**
 * Réponses qui gèlent la diffusion : toutes les « accepted », plus les
 * « pending » de moins de PENDING_RESPONSE_GRACE_DAYS jours. Les autres
 * statuts (withdrawn, declined) sont ignorés.
 */
export function countFreezingResponses(rows: WaveResponseRow[], now: Date): number {
  const graceMs = PENDING_RESPONSE_GRACE_DAYS * 24 * 3600 * 1000;
  let n = 0;
  for (const r of rows) {
    if (r.status === "accepted") n++;
    else if (r.status === "pending" && now.getTime() - new Date(r.created_at).getTime() < graceMs) n++;
  }
  return n;
}
/** En deçà de ce rayon, personne de disponible signifie vraiment personne. */
export const WAVE_MIN_RADIUS_KM = 30;

/**
 * Lot E20 « Vague proche » (décision de Jérémie du 25/10/2026) : 30 km au
 * plus, 15 km de préférence, les plus proches d'abord, par groupes de 10.
 * Même règle que enqueue_mission_wave (migration 0098).
 */
export const WAVE_MAX_RADIUS_KM = 30;
export const WAVE_PREFERRED_RADIUS_KM = 15;

/**
 * Rayon effectif d'un aidant : son rayon déclaré peut seulement réduire le
 * plafond de 30 km, jamais l'étendre. Sans préférence, 30 km.
 */
export function effectiveHelperRadiusKm(declaredKm: number | null | undefined): number {
  if (declaredKm == null || !Number.isFinite(declaredKm) || declaredKm <= 0) return WAVE_MAX_RADIUS_KM;
  return Math.min(declaredKm, WAVE_MAX_RADIUS_KM);
}

/** Palier atteint par une vague : 15 km quand toutes les personnes y sont, 30 sinon. */
export function waveTierKm(picked: Array<{ distance_km: number | null }>): number {
  return picked.every((c) => c.distance_km != null && c.distance_km <= WAVE_PREFERRED_RADIUS_KM)
    ? WAVE_PREFERRED_RADIUS_KM
    : WAVE_MAX_RADIUS_KM;
}

/**
 * Message affirmatif au demandeur, une seule fois, quand toutes les personnes
 * disponibles à 30 km au plus ont reçu son besoin.
 */
export function waveExhaustedMessage(count: number): string {
  return `Toutes les personnes disponibles à moins de ${WAVE_MAX_RADIUS_KM} km ont reçu votre besoin (${count}). Partagez-le autour de vous :`;
}

/**
 * Vivier épuisé après cette vague ? Seulement quand plus personne ne reste à
 * prévenir et qu'aucun envoi n'attend encore (report sur limite de débit).
 */
export function waveExhaustedAfterRun(remaining: number | null | undefined, deferred: number): boolean {
  return remaining === 0 && deferred === 0;
}

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
    // Lot E20 : rien au-delà de 30 km.
    .filter((c) => c.distance_km == null || c.distance_km <= WAVE_MAX_RADIUS_KM)
    .slice()
    .sort((a, b) => {
      const da = a.distance_km ?? Number.POSITIVE_INFINITY;
      const db = b.distance_km ?? Number.POSITIVE_INFINITY;
      if (da !== db) return da - db;
      return a.helper_id.localeCompare(b.helper_id);
    })
    .slice(0, Math.max(0, Math.min(size, WAVE_SIZE)));
}

export interface WaveMissionState {
  status: string;
  wave_count: number | null;
  last_wave_at: string | null;
  /** Nombre de réponses « je peux » déjà reçues. */
  response_count: number;
  /** Lot E20 : toutes les personnes disponibles à 30 km au plus ont été prévenues. */
  wave_exhausted_at?: string | null;
}

/**
 * Vague suivante due ? Seulement pour un besoin encore ouvert, sans aucune
 * réponse, dont la dernière vague date de plus de 48 heures, et dont le
 * vivier à 30 km n'est pas encore épuisé (lot E20).
 */
export function shouldSendNextWave(m: WaveMissionState, now: Date): boolean {
  if (m.status !== "open") return false;
  if (m.wave_exhausted_at) return false;
  if (m.response_count > 0) return false;
  if ((m.wave_count ?? 0) >= WAVE_MAX_COUNT) return false;
  if (!m.last_wave_at) return true;
  const elapsed = now.getTime() - new Date(m.last_wave_at).getTime();
  return elapsed >= WAVE_INTERVAL_HOURS * 3600 * 1000;
}

/**
 * Ligne d'annonce envoyée à chaque personne prévenue.
 * Lot E18 (25/10/2026) : accroche partagée avec le site (needHeadline,
 * _shared/entraideCopy.ts), le titre cité entre guillemets ; l'ancienne
 * phrase « a besoin de quelqu'un pour {titre} » était bancale pour 18 titres
 * sur 22 (n° 50 du registre de l'arène).
 */
export function waveHeadline(
  ownerFirstName: string | null | undefined,
  distanceKm: number | null,
  title: string,
  dateLabel: string | null,
): string {
  return needHeadline(ownerFirstName, distanceKm, title, dateLabel);
}

/**
 * Lot E18 : détails du besoin pour l'email aux aidants (deux lignes
 * d'extrait, date, durée). À passer dans templateData de mission-help-needed
 * avec la distance déjà transmise.
 */
export function waveEmailDetails(mission: {
  title?: string | null;
  description?: string | null;
  duration_estimate?: string | null;
  date_needed?: string | null;
  end_date?: string | null;
}): { missionExcerpt: string | null; durationLabel: string | null; dateLabel: string | null } {
  return {
    missionExcerpt: needExcerpt(mission.description, mission.title, NEED_EXCERPT_EMAIL_MAX),
    durationLabel: entraideDurationLabel(mission.duration_estimate),
    dateLabel: frenchDateLabel(mission.date_needed ?? mission.end_date),
  };
}

/** Message au demandeur quand une nouvelle vague part, au nombre réel d'emails partis. */
export function waveRelaunchMessage(count: number): string {
  return count === 1
    ? "On prévient une autre personne du coin."
    : `On prévient ${count} autres personnes du coin.`;
}

/** Titre de la notification de relance, au nombre réel. */
export function waveRelaunchTitle(count: number): string {
  return count === 1 ? "On prévient une autre personne" : `On prévient ${count} autres personnes`;
}

/**
 * Message au demandeur quand il n'y a vraiment personne de disponible autour
 * de lui. Ton du bloc « quand la personne touche le vide » : on dit la vérité,
 * on ne promet rien, on laisse la porte ouverte.
 */
export const WAVE_EMPTY_MESSAGE =
  "Votre besoin est visible sur la page Entraide. Dès qu'une personne disponible rejoint votre secteur, elle le découvre et peut vous répondre.";

/**
 * Lot X3b (C-08) : « Votre demande reste visible » au plus une fois par
 * besoin et par semaine. Le cron passe chaque heure ; sans ce garde-fou, la
 * même notification était recréée à chaque passage (53 en 4 jours pour un
 * même auteur). Une date illisible compte comme récente : on s'abstient.
 */
export const WAVE_EMPTY_NOTIFY_INTERVAL_DAYS = 7;

export function waveEmptyNotificationDue(lastCreatedAt: string | null | undefined, now: Date): boolean {
  if (!lastCreatedAt) return true;
  const last = Date.parse(lastCreatedAt);
  if (!Number.isFinite(last)) return false;
  return now.getTime() - last >= WAVE_EMPTY_NOTIFY_INTERVAL_DAYS * 86400_000;
}

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

/** Déroulement déclaré du besoin, quand la question l'a déterminé. */
export type MissionSitMode = "at_home" | "visits" | "at_helper";

export const isMissionSitMode = (value: unknown): value is MissionSitMode =>
  value === "at_home" || value === "visits" || value === "at_helper";

/** Ligne d'affichage du déroulement, email de vague. */
export function sitModeEmailLine(mode: MissionSitMode, firstName: string | null | undefined): string {
  const first = (firstName || "").trim();
  switch (mode) {
    case "at_home":
      return first ? `Présence chez ${first} pendant son absence` : "Présence chez vous pendant votre absence";
    case "visits":
      return first ? `Passages chez ${first}` : "Passages chez vous";
    case "at_helper":
      return "L'animal vient chez vous";
  }
}
