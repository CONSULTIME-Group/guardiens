/** Deux relances au plus. La seconde attend sept jours et une activité récente.
 * Une intention en file bloque un nouvel envoi ; un échec ne consomme pas de relance.
 * Module pur : lu par send-sit-draft-reminder, nudge-stale-draft,
 * send-transactional-email (contrôle au moment de l'envoi) et l'admin.
 */
export interface DraftReminderLog { status: string; created_at: string; metadata?: Record<string, unknown> | null }

export const DRAFT_REMINDER_MAX = 2;
export const DRAFT_REMINDER_SPACING_MS = 7 * 86400000;
export const DRAFT_REMINDER_ACTIVITY_MS = 30 * 86400000;

export type DraftReminderStageReason = 'send_in_progress' | 'reminder_cap' | 'reminder_spacing' | 'owner_inactive';
export type DraftReminderSkipReason =
  | 'draft_no_longer_relevant' | 'too_recent' | 'owner_already_published' | 'no_email' | 'suppressed'
  | 'product_emails_off' | 'departure_hold' | 'journey_spacing' | 'already_sent_today' | DraftReminderStageReason

/** Libellés lisibles, partagés par la réponse admin et le tableau de bord. */
export const DRAFT_REMINDER_SKIP_LABELS: Record<DraftReminderSkipReason, string> = {
  draft_no_longer_relevant: 'Annonce publiée, retirée, supprimée ou date de début dépassée',
  too_recent: 'Brouillon de moins de 24 heures',
  owner_already_published: 'Le propriétaire a déjà publié une annonce',
  no_email: 'Aucune adresse email sur le compte',
  suppressed: 'Adresse en liste de suppression',
  product_emails_off: 'Relances désactivées par le propriétaire',
  departure_hold: 'Départ annoncé plus tard, relance en attente',
  journey_spacing: 'Un autre email propriétaire est parti il y a moins de 48 heures',
  already_sent_today: 'Une relance de brouillon est déjà partie aujourd’hui',
  send_in_progress: 'Une relance est déjà en file d’envoi',
  reminder_cap: 'Deux relances déjà envoyées',
  reminder_spacing: 'Dernière relance il y a moins de 7 jours',
  owner_inactive: 'Propriétaire sans visite depuis 30 jours',
}


/** Dernier état connu de chaque clé d'envoi, dans l'ordre chronologique. */
function latestByKey(logs: DraftReminderLog[]): DraftReminderLog[] {
  // Les logs de report restent dans l'historique après drainage. Seul le
  // dernier état de chaque clé compte, sinon un ancien report bloque à vie.
  const byKey = new Map<string, DraftReminderLog>();
  for (const [index, log] of [...logs].sort((a, b) => Date.parse(a.created_at) - Date.parse(b.created_at)).entries()) {
    byKey.set(String(log.metadata?.idempotency_key ?? `legacy-${index}`), log);
  }
  return [...byKey.values()];
}

export function draftReminderStageDecision(logs: DraftReminderLog[], lastSeen: string | null, now = Date.now()):
  { stage: 1 | 2; reason: null } | { stage: null; reason: DraftReminderStageReason } {
  const current = latestByKey(logs);
  if (current.some(l => l.status === 'pending' || l.status === 'deferred')) return { stage: null, reason: 'send_in_progress' };
  const sent = current.filter(l => l.status === 'sent');
  if (!sent.length) return { stage: 1, reason: null };
  if (sent.length >= DRAFT_REMINDER_MAX || sent.some(l => Number(l.metadata?.reminder_stage) === 2)) return { stage: null, reason: 'reminder_cap' };
  const latest = Math.max(...sent.map(l => Date.parse(l.created_at)));
  const activity = lastSeen ? Date.parse(lastSeen) : NaN;
  if (!Number.isFinite(latest) || now - latest < DRAFT_REMINDER_SPACING_MS) return { stage: null, reason: 'reminder_spacing' };
  if (!Number.isFinite(activity) || now - activity > DRAFT_REMINDER_ACTIVITY_MS) return { stage: null, reason: 'owner_inactive' };
  return { stage: 2, reason: null };
}

export function nextDraftReminderStage(logs: DraftReminderLog[], lastSeen: string | null, now = Date.now()): 1 | 2 | null {
  return draftReminderStageDecision(logs, lastSeen, now).stage;
}

/** Clé d'envoi unique par annonce et par rang, quel que soit le chemin (automatique ou admin). */
export function draftReminderKey(sitId: string, stage: 1 | 2): string {
  return `sit-draft-reminder-${sitId}${stage === 2 ? '-2' : ''}`;
}

/** Filtre PostgREST de l'historique d'une annonce, clés anciennes comprises
 * (reports sans sit_id, relances admin « stale-draft-manual-<id>-<horodatage> »). */
export function draftReminderHistoryFilter(sitId: string): string {
  if (!/^[0-9a-f-]{36}$/i.test(sitId)) throw new Error('draft_id_invalid');
  return [
    `metadata->>sit_id.eq.${sitId}`,
    `metadata->>idempotency_key.like.sit-draft-reminder-${sitId}*`,
    `metadata->>idempotency_key.like.stale-draft-manual-${sitId}*`,
  ].join(',');
}

/** Contrôle au moment réel de l'envoi (après un report compris) : la clé en
 * cours est exclue, les autres envois réussis bornent le nombre et l'espacement. */
export function draftReminderSendTimeBlock(logs: DraftReminderLog[], currentKey: string, now = Date.now()): 'reminder_cap' | 'reminder_spacing' | null {
  const others = latestByKey(logs).filter(l => l.status === 'sent' && String(l.metadata?.idempotency_key ?? '') !== currentKey);
  if (others.length >= DRAFT_REMINDER_MAX) return 'reminder_cap';
  if (others.some(l => now - Date.parse(l.created_at) < DRAFT_REMINDER_SPACING_MS)) return 'reminder_spacing';
  return null;
}

export function draftReminderStillRelevant(sit: { status?: string; published_at?: string | null; unpublished_at?: string | null; start_date?: string | null } | null, today: string): boolean {
  return Boolean(sit && sit.status === 'draft' && !sit.published_at && !sit.unpublished_at && (!sit.start_date || sit.start_date >= today));
}
