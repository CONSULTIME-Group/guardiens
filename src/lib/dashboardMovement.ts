/**
 * Lot D4 (09/11/2026, arène claude/arene/2026-11-09-dashboards-desktop, lots 2
 * et 3 réunis) : bandeau « Depuis votre dernière visite » de l'accueil
 * ordinateur, en logique pure.
 *
 * Source : get_dashboard_movement (drizzle/migrations/0124_d4_mouvement_accueil.sql),
 * lecture seule, deux fenêtres (depuis la dernière visite ordinateur, et
 * 7 jours). Règles :
 *  - une tuile à zéro ne s'affiche jamais ;
 *  - « Depuis votre dernière visite, {jour} » si la visite précédente date
 *    d'une heure au moins et qu'un chiffre a bougé depuis ;
 *  - sinon « Cette semaine près de chez vous » si un chiffre a bougé en 7 jours ;
 *  - sinon rien (l'accueil garde sa phrase).
 * Pourquoi : relevé du 09/11/2026, 15 % des sessions ordinateur auraient un
 * chiffre non nul depuis la visite précédente ; le repli sur 7 jours évite un
 * bandeau vide.
 */

export type MovementKey =
  | "new_sits_50"
  | "new_sits_30"
  | "new_needs_30"
  | "new_sitters_30"
  | "new_members_30"
  | "new_applications"
  | "applications_viewed";

export type MovementCounts = Partial<Record<MovementKey, number>>;

export interface MovementData {
  since?: string | null;
  located?: boolean;
  windows?: { since?: MovementCounts | null; week?: MovementCounts | null } | null;
  nearest_sit?: { sit_id: string; city?: string | null; start_date?: string | null; distance_km?: number | string | null } | null;
  community?: {
    departments?: number | null;
    new_members_7d?: number | null;
    identities_verified?: number | null;
    reviews_count?: number | null;
    reviews_avg?: number | string | null;
  } | null;
}

export interface MovementTile {
  key: MovementKey;
  value: number;
  label: string;
  href: string;
}

export interface MovementBand {
  mode: "since" | "week";
  title: string;
  tiles: MovementTile[];
}

const LABELS: Record<MovementKey, [string, string]> = {
  new_sits_50: ["nouvelle garde à moins de 50 km", "nouvelles gardes à moins de 50 km"],
  new_sits_30: ["annonce publiée à moins de 30 km", "annonces publiées à moins de 30 km"],
  new_needs_30: ["coup de main demandé à moins de 30 km", "coups de main demandés à moins de 30 km"],
  new_sitters_30: ["nouveau gardien à moins de 30 km", "nouveaux gardiens à moins de 30 km"],
  new_members_30: ["nouveau membre à moins de 30 km", "nouveaux membres à moins de 30 km"],
  new_applications: ["nouvelle candidature", "nouvelles candidatures"],
  applications_viewed: ["candidature lue", "candidatures lues"],
};

const HREFS: Record<MovementKey, string> = {
  new_sits_50: "/search",
  new_sits_30: "/annonces",
  new_needs_30: "/petites-missions",
  new_sitters_30: "/recherche-gardiens",
  new_members_30: "/petites-missions",
  new_applications: "/sits",
  applications_viewed: "/mes-candidatures",
};

/** Ordre de priorité, trois tuiles au plus. */
export const SITTER_MOVEMENT_KEYS: MovementKey[] = ["applications_viewed", "new_sits_50", "new_needs_30", "new_members_30"];
export const OWNER_MOVEMENT_KEYS: MovementKey[] = ["new_applications", "new_sitters_30", "new_sits_30", "new_needs_30"];

export const MOVEMENT_WEEK_TITLE = "Cette semaine près de chez vous";
const MIN_GAP_MS = 60 * 60 * 1000;
const DAY_FMT = new Intl.DateTimeFormat("fr-FR", { weekday: "long", day: "numeric", month: "long" });

export function movementTileLabel(key: MovementKey, n: number): string {
  const [one, many] = LABELS[key];
  return n > 1 ? many : one;
}

const sameLocalDay = (a: Date, b: Date) =>
  a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();

/** « Depuis votre dernière visite, hier », « …, jeudi 5 novembre », ou sans jour le jour même. */
export function sinceTitle(since: Date, now: Date): string {
  if (sameLocalDay(since, now)) return "Depuis votre dernière visite";
  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  if (sameLocalDay(since, yesterday)) return "Depuis votre dernière visite, hier";
  return `Depuis votre dernière visite, ${DAY_FMT.format(since)}`;
}

function tilesFor(counts: MovementCounts | null | undefined, keys: MovementKey[]): MovementTile[] {
  if (!counts) return [];
  return keys
    .map((key) => ({ key, value: Math.max(0, Math.floor(Number(counts[key] ?? 0))) }))
    .filter((t) => t.value > 0)
    .slice(0, 3)
    .map((t) => ({ ...t, label: movementTileLabel(t.key, t.value), href: HREFS[t.key] }));
}

export function buildMovementBand(
  space: "owner" | "sitter",
  data: MovementData | null | undefined,
  opts: { previousVisit: string | null; now?: Date },
): MovementBand | null {
  if (!data?.windows) return null;
  const keys = space === "owner" ? OWNER_MOVEMENT_KEYS : SITTER_MOVEMENT_KEYS;
  const now = opts.now ?? new Date();
  const prev = opts.previousVisit ? new Date(opts.previousVisit) : null;
  const usableSince = !!prev && !Number.isNaN(prev.getTime()) && now.getTime() - prev.getTime() >= MIN_GAP_MS;

  if (usableSince) {
    const tiles = tilesFor(data.windows.since, keys);
    if (tiles.length > 0) {
      // La base borne la fenêtre à 30 jours : le titre dit la date réellement comptée.
      const counted = data.since ? new Date(data.since) : prev!;
      return { mode: "since", title: sinceTitle(counted > prev! ? counted : prev!, now), tiles };
    }
  }
  const week = tilesFor(data.windows.week, keys);
  if (week.length > 0) return { mode: "week", title: MOVEMENT_WEEK_TITLE, tiles: week };
  return null;
}

/**
 * État G3 (gardien loin de tout) : quand la garde ouverte la plus proche est à
 * plus de 50 km, l'accueil dit où et quand elle commence.
 */
export function nearestSitLine(
  nearest: MovementData["nearest_sit"],
  formatCity: (c: string) => string,
  formatDay: (iso: string) => string | null,
): string | null {
  if (!nearest) return null;
  const km = Math.round(Number(nearest.distance_km ?? NaN));
  if (!Number.isFinite(km) || km <= 50) return null;
  const city = nearest.city ? formatCity(nearest.city) : "";
  const day = nearest.start_date ? formatDay(nearest.start_date) : null;
  const parts = [day ? `commence le ${day}` : null, city ? `à ${city}` : null, `à ${km} km de chez vous`].filter(Boolean);
  return `La garde ouverte la plus proche ${parts.join(", ")}.`;
}

/** Repère de la dernière visite de l'accueil ordinateur, gardé dans ce navigateur. */
export const LAST_DESKTOP_VISIT_KEY = (userId: string) => `guardiens_dash_desktop_seen:${userId}`;
export const SESSION_SINCE_KEY = (userId: string) => `guardiens_dash_desktop_since:${userId}`;

/**
 * Lit le repère de la visite précédente une fois par session d'onglet (un
 * rechargement garde le même), puis pose l'heure actuelle pour la prochaine.
 * Navigateur sans stockage : aucun repère, la fenêtre de 7 jours s'applique.
 */
export function takePreviousDesktopVisit(userId: string, nowIso: string = new Date().toISOString()): string | null {
  try {
    const kept = sessionStorage.getItem(SESSION_SINCE_KEY(userId));
    if (kept !== null) return kept || null;
    const prev = localStorage.getItem(LAST_DESKTOP_VISIT_KEY(userId));
    sessionStorage.setItem(SESSION_SINCE_KEY(userId), prev ?? "");
    localStorage.setItem(LAST_DESKTOP_VISIT_KEY(userId), nowIso);
    return prev;
  } catch {
    return null;
  }
}
