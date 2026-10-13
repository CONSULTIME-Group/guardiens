// Plafond et lissage des relances « gardien dormant ».
//
// Constat du 22/09/2026 : 247 envois pour 47 personnes, jusqu'à 9 au même
// membre, pour 0 candidature sur 60 jours. Le cron hebdomadaire renvoyait
// indéfiniment tant que le gardien restait sans candidature.
//
// Lot N2, 23/09/2026 : la règle des jalons J+30 / J+45 / J+75 laissait de côté
// les gardiens inscrits depuis longtemps. Nouvelle règle, plus simple :
//   inscrit depuis 30 jours ou plus, aucune candidature déposée,
//   3 envois au maximum sur la vie du compte,
//   14 jours au moins entre deux envois,
//   comptes administrateurs exclus.
//
// Lissage : 946 gardiens deviennent éligibles d'un coup, juste après la
// campagne Entraide. Les envois démarrent le lundi 5 octobre 2026 et sont
// plafonnés à 150 par passage du cron, les suivants attendent le passage
// d'après. Ce report est un état normal, jamais une erreur.

export const DORMANT_MIN_DAYS_SINCE_SIGNUP = 30;
export const DORMANT_MAX_SENDS = 3;
export const DORMANT_MIN_DAYS_BETWEEN_SENDS = 14;
export const DORMANT_MAX_SENDS_PER_RUN = 150;
/** Premier envoi autorisé : lundi 5 octobre 2026, 00h00 UTC. */
export const DORMANT_START_AT_MS = Date.UTC(2026, 9, 5, 0, 0, 0);

export type DormantSkipReason =
  | "admin_account"
  | "cap_reached"
  | "too_recent_signup"
  | "too_soon_since_last_send"
  | "before_start_date"
  | "run_quota_reached";

export interface DormantDecision {
  send: boolean;
  reason: DormantSkipReason | null;
}

/** Le lissage ouvre-t-il les envois à cet instant ? */
export function dormantWindowOpen(nowMs: number): boolean {
  return nowMs >= DORMANT_START_AT_MS;
}

export function dormantSendDecision(input: {
  daysSinceSignup: number;
  alreadySentCount: number;
  isAdmin: boolean;
  /** Jours écoulés depuis le dernier envoi dormant, null si aucun envoi. */
  daysSinceLastSend?: number | null;
  /** Instant courant, pour la date de démarrage. Défaut : maintenant. */
  nowMs?: number;
}): DormantDecision {
  const now = input.nowMs ?? Date.now();
  if (!dormantWindowOpen(now)) return { send: false, reason: "before_start_date" };
  if (input.isAdmin) return { send: false, reason: "admin_account" };
  if (input.alreadySentCount >= DORMANT_MAX_SENDS) {
    return { send: false, reason: "cap_reached" };
  }
  if (input.daysSinceSignup < DORMANT_MIN_DAYS_SINCE_SIGNUP) {
    return { send: false, reason: "too_recent_signup" };
  }
  const since = input.daysSinceLastSend;
  if (typeof since === "number" && since < DORMANT_MIN_DAYS_BETWEEN_SENDS) {
    return { send: false, reason: "too_soon_since_last_send" };
  }
  return { send: true, reason: null };
}

export const DORMANT_TEMPLATE = "dormant-sitter-nudge";
export const DORMANT_KEY_PREFIX = "dormant-sitter-";
/** Statuts qui comptent comme un envoi (fait, en cours ou différé). */
export const DORMANT_COUNTED_STATUSES = ["sent", "pending", "deferred"] as const;

/**
 * Filtre PostgREST des envois dormants passés. Lot Y1 (P4-01) :
 * send-transactional-email écrit un UUID dans message_id et range la clé
 * `dormant-sitter-{gardien}-{semaine}` dans metadata.idempotency_key ; seules
 * les lignes antérieures au 01/10/2026 portent la clé dans message_id.
 */
export const DORMANT_PAST_SENDS_FILTER =
  `message_id.like.${DORMANT_KEY_PREFIX}%,` +
  `and(template_name.eq.${DORMANT_TEMPLATE},status.in.(${DORMANT_COUNTED_STATUSES.join(",")}))`;

/** Filtre PostgREST du doublon d'une clé, aux deux formats du journal. */
export function dormantDuplicateFilter(key: string): string {
  return `message_id.eq.${key},and(metadata->>idempotency_key.eq.${key},template_name.eq.${DORMANT_TEMPLATE},status.in.(${DORMANT_COUNTED_STATUSES.join(",")}))`;
}

export interface DormantLogRow {
  message_id?: string | null;
  created_at?: string | null;
  status?: string | null;
  metadata?: { idempotency_key?: unknown } | null;
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Clé dormante d'une ligne du journal, aux deux formats, null sinon. */
export function dormantLogKey(row: DormantLogRow): string | null {
  const meta = row.metadata?.idempotency_key;
  if (typeof meta === "string" && meta.startsWith(DORMANT_KEY_PREFIX)) return meta;
  const mid = row.message_id ?? "";
  if (mid.startsWith(DORMANT_KEY_PREFIX)) return mid;
  return null;
}

/**
 * Nombre d'envois distincts et date du dernier envoi par gardien. Une clé
 * (gardien et semaine) compte une fois, même si le journal porte plusieurs
 * lignes pour elle. Les lignes échouées, abandonnées ou supprimées ne
 * comptent pas ; une ligne historique sans statut compte.
 */
export function tallyDormantSends(rows: DormantLogRow[] | null | undefined): {
  sentCounts: Map<string, number>;
  lastSentAt: Map<string, string>;
} {
  const keysBySitter = new Map<string, Set<string>>();
  const lastSentAt = new Map<string, string>();
  for (const row of rows ?? []) {
    const status = row.status ?? null;
    if (status !== null && !(DORMANT_COUNTED_STATUSES as readonly string[]).includes(status)) continue;
    const key = dormantLogKey(row);
    if (!key) continue;
    const sitterId = key.slice(DORMANT_KEY_PREFIX.length, DORMANT_KEY_PREFIX.length + 36);
    if (!UUID_RE.test(sitterId)) continue;
    const keys = keysBySitter.get(sitterId) ?? new Set<string>();
    keys.add(key);
    keysBySitter.set(sitterId, keys);
    const prev = lastSentAt.get(sitterId);
    if (row.created_at && (!prev || row.created_at > prev)) lastSentAt.set(sitterId, row.created_at);
  }
  const sentCounts = new Map<string, number>();
  for (const [id, keys] of keysBySitter) sentCounts.set(id, keys.size);
  return { sentCounts, lastSentAt };
}

export interface DormantCandidate {
  /** Distance de l'annonce ouverte la plus proche, null si inconnue. */
  nearestSitKm: number | null;
  /** Dernière visite, ISO. null si inconnue. */
  lastSeenAt: string | null;
}

/**
 * Ordre d'envoi : annonce ouverte la plus proche d'abord, puis gardiens vus le
 * plus récemment. Une distance inconnue passe après les distances connues, une
 * dernière visite inconnue passe après les visites connues.
 */
export function dormantRunOrder<T extends DormantCandidate>(rows: T[]): T[] {
  return [...rows].sort((a, b) => {
    const da = a.nearestSitKm ?? Number.POSITIVE_INFINITY;
    const db = b.nearestSitKm ?? Number.POSITIVE_INFINITY;
    if (da !== db) return da - db;
    const sa = a.lastSeenAt ? Date.parse(a.lastSeenAt) : Number.NEGATIVE_INFINITY;
    const sb = b.lastSeenAt ? Date.parse(b.lastSeenAt) : Number.NEGATIVE_INFINITY;
    return sb - sa;
  });
}

/** Tri puis plafond du passage. Le reste attend le passage suivant. */
export function dormantRunBatch<T extends DormantCandidate>(
  rows: T[],
  limit: number = DORMANT_MAX_SENDS_PER_RUN,
): { batch: T[]; deferred: T[] } {
  const ordered = dormantRunOrder(rows);
  return { batch: ordered.slice(0, limit), deferred: ordered.slice(limit) };
}
