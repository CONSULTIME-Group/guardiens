import { describe, expect, it } from 'vitest';
import { authorizeDeferredMemberEmail, EMAIL_ORIGIN_FIELD, MEMBER_EMAIL_TEMPLATES } from '../../supabase/functions/_shared/deferred-member-email-authorization';

const owner = '10000000-0000-4000-8000-000000000001';
const sitter = '20000000-0000-4000-8000-000000000002';
const other = '30000000-0000-4000-8000-000000000003';
const sit = '40000000-0000-4000-8000-000000000004';
const conv = '50000000-0000-4000-8000-000000000005';
const event = '60000000-0000-4000-8000-000000000006';
const queue = '70000000-0000-4000-8000-000000000007';
const address = 'recipient@fixture.test';
const names = [...MEMBER_EMAIL_TEMPLATES];
type Row = Record<string, any>;
function fixture(name = 'sit-invitation') {
  const callerId = name === 'cancellation-by-sitter' ? sitter : owner;
  const recipientId = ['sit-confirmed', 'listing-unpublished-feedback'].includes(name) ? owner : name === 'cancellation-by-sitter' ? owner : sitter;
  const key = name === 'application-accepted' ? `app-accepted-${event}` : name === 'application-declined' ? `app-declined-${event}`
    : name === 'sit-confirmed' ? `sit-confirmed-${sit}` : name === 'sit-invitation' ? `sit-invite-${sit}-${sitter}`
    : name === 'review-received' ? `review-received-${sit}-${sitter}` : name.startsWith('cancellation-') ? `${name}-${sit}-${callerId}`
    : name === 'help-during-sit' ? `help-urgence-${sit}-1790000000000` : `unpublished-feedback-${sit}-2026-09-20`;
  const canonical = name === 'help-during-sit' ? `help-urgence-message-${event}` : key;
  const origin = { version: 1, kind: 'member', callerId, recipientId, eventKey: key };
  const rows: Record<string, Row[]> = {
    email_deferred_queue: [{ id: queue, template_name: name, recipient_email: address, idempotency_key: canonical, status: 'processing', template_data: {
      [EMAIL_ORIGIN_FIELD]: origin, category: 'urgence', messageExcerpt: 'Besoin d’aide', conversationHref: `https://guardiens.fr/messages/${conv}`,
      sitTitle: 'STALE', firstName: 'STALE', __urgent: true,
    } }],
    profiles: [{ id: owner, first_name: 'Camille', email: recipientId === owner ? address : 'owner@fixture.test' }, { id: sitter, first_name: 'Lou', email: recipientId === sitter ? address : 'sitter@fixture.test' }],
    sits: [{ id: sit, user_id: owner, title: 'Titre actuel', city: 'Lyon', property_id: sit,
      status: ({ 'sit-invitation': 'published', 'review-received': 'completed', 'cancellation-by-owner': 'cancelled', 'cancellation-by-sitter': 'published', 'help-during-sit': 'in_progress', 'listing-unpublished-feedback': 'draft' } as Record<string, string>)[name] ?? 'confirmed',
      start_date: '2026-10-01', end_date: '2026-10-05', cancelled_by: callerId, cancelled_at: '2026-09-20T10:00:00Z', unpublished_at: '2026-09-20T10:00:00Z', last_unpublished_reason: 'plans_changed' }],
    applications: [{ id: event, sit_id: sit, sitter_id: sitter, status: name.startsWith('cancellation-') ? 'cancelled' : name === 'application-declined' ? 'rejected' : 'accepted' }],
    sit_invitations: [{ id: event, sit_id: sit, owner_id: owner, sitter_id: sitter, status: 'sent', message: 'Message actuel' }],
    reviews: [{ id: event, sit_id: sit, reviewer_id: callerId, reviewee_id: recipientId, review_type: name.startsWith('cancellation-') ? 'annulation' : 'garde', moderation_status: 'en_attente', moderation_hidden_at: null, cancelled_by_role: name === 'cancellation-by-sitter' ? 'gardien' : 'proprio', cancellation_reason: 'Motif actuel' }],
    conversations: [{ id: conv, sit_id: sit, owner_id: owner, sitter_id: sitter }],
    messages: [{ id: event, conversation_id: conv, sender_id: callerId, is_system: false, content: '[URGENCE] Besoin d’aide', created_at: '2026-09-20T10:00:00Z' }],
    pets: [{ property_id: sit, name: 'Animal' }],
  };
  const failures = new Set<string>();
  const reads: string[] = [];
  const db = { from(table: string) {
    reads.push(table);
    const filters: Array<(row: Row) => boolean> = [];
    let limit: number | undefined;
    let sort: string | undefined;
    const result = (single = false) => {
      let data = (rows[table] ?? []).filter(row => filters.every(fn => fn(row)));
      if (sort) data = [...data].sort((a, b) => String(b[sort!]).localeCompare(String(a[sort!])));
      if (limit !== undefined) data = data.slice(0, limit);
      return { data: single ? data[0] ?? null : data, error: failures.has(table) || (single && data.length > 1) ? { message: 'PRIVATE DB DETAIL' } : null };
    };
    const chain = {
      select: (_columns: string) => chain,
      eq: (key: string, value: unknown) => { filters.push(row => row[key] === value); return chain; },
      like: (key: string, pattern: string) => { const prefix = pattern.slice(0, -1).replace(/\\(.)/g, '$1'); filters.push(row => typeof row[key] === 'string' && row[key].startsWith(prefix)); return chain; },
      order: (key: string) => { sort = key; return chain; },
      limit: (n: number) => { limit = n; return chain; },
      maybeSingle: async () => result(true),
      then: (resolve: (value: unknown) => unknown) => Promise.resolve(result()).then(resolve),
    };
    return chain;
  } };
  const input = { sourceQueueId: queue, templateName: name, recipientEmail: address, idempotencyKey: canonical };
  return { db, input, rows, origin, failures, reads };
}

describe('member notification authorization on deferred retry', () => {
  it.each(names)('revalidates %s and replaces old content', async name => {
    const h = fixture(name); const result = await authorizeDeferredMemberEmail(h.db, h.input);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.templateData.sitTitle).toBe('Titre actuel');
      expect(result.templateData).not.toHaveProperty(EMAIL_ORIGIN_FIELD);
      expect(result.templateData).not.toHaveProperty('__urgent');
      expect(result.dedupeKeys).toContain(h.input.idempotencyKey);
    }
    expect(JSON.stringify(result)).not.toContain('STALE');
  });
  it.each(names)('cancels %s when its event has disappeared', async name => {
    const h = fixture(name); h.rows.sits = [];
    expect(await authorizeDeferredMemberEmail(h.db, h.input)).toEqual({ ok: false, status: 403 });
  });
  it.each(names)('retries %s when its event read is unavailable', async name => {
    const h = fixture(name); h.failures.add('sits');
    expect(await authorizeDeferredMemberEmail(h.db, h.input)).toEqual({ ok: false, status: 503 });
  });
  it.each(names)('does not guess an actor for a legacy %s row', async name => {
    const h = fixture(name); delete h.rows.email_deferred_queue[0].template_data[EMAIL_ORIGIN_FIELD];
    expect(await authorizeDeferredMemberEmail(h.db, h.input)).toEqual({ ok: false, status: 403 });
  });
  it.each(['pending', 'sent', 'failed', 'superseded', 'abandoned'])('refuses queue status %s', async status => {
    const h = fixture(); h.rows.email_deferred_queue[0].status = status;
    expect(await authorizeDeferredMemberEmail(h.db, h.input)).toEqual({ ok: false, status: 403 });
  });
  it.each(['template_name', 'recipient_email', 'idempotency_key'])('refuses a mismatched %s', async field => {
    const h = fixture(); h.rows.email_deferred_queue[0][field] = 'unrelated';
    expect(await authorizeDeferredMemberEmail(h.db, h.input)).toEqual({ ok: false, status: 403 });
  });
  it.each([null, [], {}, { version: 2, kind: 'trusted' }, { version: 1, kind: 'unknown' }, { version: 1, kind: 'member' }])('refuses invalid persisted origin %j', async origin => {
    const h = fixture(); h.rows.email_deferred_queue[0].template_data[EMAIL_ORIGIN_FIELD] = origin;
    expect(await authorizeDeferredMemberEmail(h.db, h.input)).toEqual({ ok: false, status: 403 });
  });
  it.each(['email_deferred_queue', 'profiles'])('does not hide read failure for %s', async table => {
    const h = fixture(); h.failures.add(table);
    expect(await authorizeDeferredMemberEmail(h.db, h.input)).toEqual({ ok: false, status: 503 });
  });
  it('refuses a missing queue row', async () => {
    const h = fixture(); h.rows.email_deferred_queue = [];
    expect(await authorizeDeferredMemberEmail(h.db, h.input)).toEqual({ ok: false, status: 403 });
  });
  it('refuses an ambiguous recipient', async () => {
    const h = fixture(); h.rows.profiles.push({ ...h.rows.profiles[1] });
    expect(await authorizeDeferredMemberEmail(h.db, h.input)).toEqual({ ok: false, status: 503 });
  });
  it.each([owner, sitter])('cancels when a participant has disappeared: %s', async id => {
    const h = fixture(); h.rows.profiles = h.rows.profiles.filter(row => row.id !== id);
    expect(await authorizeDeferredMemberEmail(h.db, h.input)).toEqual({ ok: false, status: 403 });
  });
  it('cancels when the recipient email has changed', async () => {
    const h = fixture(); h.rows.profiles[1].email = 'changed@fixture.test';
    expect(await authorizeDeferredMemberEmail(h.db, h.input)).toEqual({ ok: false, status: 403 });
  });
  it('preserves case-insensitive equality for the same recipient', async () => {
    const h = fixture(); h.rows.profiles[1].email = address.toUpperCase(); h.input.recipientEmail = address.toUpperCase();
    expect((await authorizeDeferredMemberEmail(h.db, h.input)).ok).toBe(true);
  });
  it('does not follow a new unpublication event', async () => {
    const h = fixture('listing-unpublished-feedback'); h.rows.sits[0].unpublished_at = '2026-09-21T10:00:00Z';
    expect(await authorizeDeferredMemberEmail(h.db, h.input)).toEqual({ ok: false, status: 403 });
  });
  it('refuses an accepted application now withdrawn', async () => {
    const h = fixture('application-accepted'); h.rows.applications[0].status = 'withdrawn';
    expect(await authorizeDeferredMemberEmail(h.db, h.input)).toEqual({ ok: false, status: 403 });
  });
  it('refuses an invitation now declined', async () => {
    const h = fixture(); h.rows.sit_invitations[0].status = 'declined';
    expect(await authorizeDeferredMemberEmail(h.db, h.input)).toEqual({ ok: false, status: 403 });
  });
  it('refuses a review now hidden', async () => {
    const h = fixture('review-received'); h.rows.reviews[0].moderation_hidden_at = '2026-09-20T11:00:00Z';
    expect(await authorizeDeferredMemberEmail(h.db, h.input)).toEqual({ ok: false, status: 403 });
  });
  it('pins urgency to the original message even if a newer message has identical text', async () => {
    const h = fixture('help-during-sit'); h.rows.messages.push({ ...h.rows.messages[0], id: other, created_at: '2026-09-20T11:00:00Z' });
    const result = await authorizeDeferredMemberEmail(h.db, h.input);
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.dedupeKeys).toContain(`help-urgence-message-${event}`);
  });
  it('does not substitute a newer urgency when the original message disappeared', async () => {
    const h = fixture('help-during-sit'); h.rows.messages[0].id = other;
    expect(await authorizeDeferredMemberEmail(h.db, h.input)).toEqual({ ok: false, status: 403 });
  });
  it('refuses an edited urgency excerpt', async () => {
    const h = fixture('help-during-sit'); h.rows.messages[0].content = '[URGENCE] Autre contenu';
    expect(await authorizeDeferredMemberEmail(h.db, h.input)).toEqual({ ok: false, status: 403 });
  });
  it('preserves explicitly recorded trusted origin', async () => {
    const h = fixture(); h.rows.email_deferred_queue[0].template_data[EMAIL_ORIGIN_FIELD] = { version: 1, kind: 'trusted' };
    h.rows.sits = [];
    const result = await authorizeDeferredMemberEmail(h.db, h.input);
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.templateData).not.toHaveProperty(EMAIL_ORIGIN_FIELD);
    expect(h.reads).toEqual(['email_deferred_queue']);
  });
  it('rejects other templates without reading', async () => {
    const h = fixture(); h.input.templateName = 'new-message';
    expect(await authorizeDeferredMemberEmail(h.db, h.input)).toEqual({ ok: false, status: 403 });
    expect(h.reads).toEqual([]);
  });
});
