import { describe, expect, it } from 'vitest';
import { authorizeSitEventEmail } from '../../supabase/functions/_shared/sit-event-email-authorization';

const owner = '10000000-0000-4000-8000-000000000001';
const sitter = '20000000-0000-4000-8000-000000000002';
const other = '30000000-0000-4000-8000-000000000003';
const sit = '40000000-0000-4000-8000-000000000004';
const conv = '50000000-0000-4000-8000-000000000005';
const event = '60000000-0000-4000-8000-000000000006';
const names = ['sit-invitation', 'review-received', 'cancellation-by-owner', 'cancellation-by-sitter', 'help-during-sit', 'listing-unpublished-feedback'];
type Row = Record<string, any>;
function fixture(name = 'sit-invitation') {
  const isSitter = name === 'cancellation-by-sitter';
  const callerId = isSitter ? sitter : owner;
  const recipientId = name === 'listing-unpublished-feedback' ? owner : isSitter ? owner : sitter;
  const status = name === 'sit-invitation' || isSitter ? 'published' : name === 'review-received' ? 'completed' : name === 'cancellation-by-owner' ? 'cancelled' : name === 'help-during-sit' ? 'in_progress' : 'draft';
  const rows: Record<string, Row[]> = {
    sits: [{ id: sit, user_id: owner, title: 'Garde réelle', city: 'Lyon', status, start_date: '2026-10-01', end_date: '2026-10-05', cancelled_by: callerId, cancelled_at: '2026-09-20T10:00:00Z', unpublished_at: '2026-09-20T10:00:00Z', last_unpublished_reason: 'plans_changed' }],
    applications: [{ id: event, sit_id: sit, sitter_id: sitter, status: name.startsWith('cancellation-') ? 'cancelled' : 'accepted' }],
    profiles: [{ id: owner, first_name: 'Camille', city: 'Paris' }, { id: sitter, first_name: 'Lou' }],
    sit_invitations: [{ id: event, sit_id: sit, owner_id: owner, sitter_id: sitter, status: 'sent', message: 'Invitation en base' }],
    reviews: [{ id: event, sit_id: sit, reviewer_id: callerId, reviewee_id: recipientId, review_type: name.startsWith('cancellation-') ? 'annulation' : 'garde', published: false, moderation_status: 'en_attente', moderation_hidden_at: null, cancelled_by_role: isSitter ? 'gardien' : 'proprio', cancellation_reason: 'Motif réel de l’annulation' }],
    conversations: [{ id: conv, sit_id: sit, owner_id: owner, sitter_id: sitter }],
    messages: [{ id: event, conversation_id: conv, sender_id: callerId, is_system: false, content: '[URGENCE] Besoin d’aide', created_at: '2026-09-20T10:00:00Z' }],
  };
  const input = { templateName: name, callerId, recipientId,
    idempotencyKey: name === 'sit-invitation' ? `sit-invite-${sit}-${sitter}` : name === 'review-received' ? `review-received-${sit}-${sitter}` : name.startsWith('cancellation-') ? `${name}-${sit}-${callerId}` : name === 'help-during-sit' ? `help-urgence-${sit}-1790000000000` : `unpublished-feedback-${sit}-2026-09-20`,
    templateData: { category: 'urgence', messageExcerpt: 'Besoin d’aide', conversationHref: `https://guardiens.fr/messages/${conv}`, sitTitle: 'FORGED', firstName: 'FORGED', reason: 'FORGED', deepLinkUrl: 'https://fixture.invalid/forged' } as Record<string, unknown>,
  };
  const failures = new Set<string>();
  const reads: Array<{ table: string; columns?: string; pattern?: string }> = [];
  const db = { from(table: string) {
    const trace: typeof reads[number] = { table }; reads.push(trace);
    const filters: Array<(r: Row) => boolean> = [];
    let limit: number | undefined;
    const result = () => {
      let data = rows[table].filter(row => filters.every(fn => fn(row)));
      if (limit !== undefined) data = data.slice(0, limit);
      return { data: data[0] ?? null, error: failures.has(table) || data.length > 1 ? { message: 'private detail' } : null };
    };
    const chain = {
      select: (columns: string) => { trace.columns = columns; return chain; },
      eq: (key: string, value: unknown) => { filters.push(row => row[key] === value); return chain; },
      like: (key: string, pattern: string) => {
        trace.pattern = pattern;
        // The query uses an escaped literal prefix and a single final wildcard.
        const prefix = pattern.slice(0, -1).replace(/\\(.)/g, '$1');
        filters.push(row => typeof row[key] === 'string' && row[key].startsWith(prefix)); return chain;
      },
      order: (_key: string, _options: unknown) => chain,
      limit: (n: number) => { limit = n; return chain; },
      maybeSingle: async () => result(),
    };
    return chain;
  } };
  return { db, input, rows, reads, failures };
}

describe('six sit event authorizations', () => {
  it.each(names)('preserves the legitimate %s path and reconstructs content', async (name) => {
    const h = fixture(name); const result = await authorizeSitEventEmail(h.db, h.input);
    expect(result.ok).toBe(true);
    expect(JSON.stringify(result)).not.toContain('FORGED');
    expect(JSON.stringify(result)).not.toContain('fixture.invalid');
  });
  it.each(names)('rejects an unrelated actor for %s', async (name) => {
    const h = fixture(name); h.input.callerId = other;
    expect(await authorizeSitEventEmail(h.db, h.input)).toEqual({ ok: false, status: 403 });
  });
  it.each(names)('rejects an unrelated recipient for %s', async (name) => {
    const h = fixture(name); h.input.recipientId = other;
    expect(await authorizeSitEventEmail(h.db, h.input)).toEqual({ ok: false, status: 403 });
  });
  it.each(names)('rejects a missing sit for %s', async (name) => {
    const h = fixture(name); h.rows.sits = [];
    expect(await authorizeSitEventEmail(h.db, h.input)).toEqual({ ok: false, status: 403 });
  });
  it.each(names)('rejects an incompatible sit state for %s', async (name) => {
    const h = fixture(name); h.rows.sits[0].status = 'archived';
    expect(await authorizeSitEventEmail(h.db, h.input)).toEqual({ ok: false, status: 403 });
  });
  it.each(names)('fails closed on a sit read failure for %s', async (name) => {
    const h = fixture(name); h.failures.add('sits');
    expect(await authorizeSitEventEmail(h.db, h.input)).toEqual({ ok: false, status: 503 });
  });
  it.each(names)('rejects an arbitrary key for %s without reading', async (name) => {
    const h = fixture(name); h.input.idempotencyKey = 'arbitrary';
    expect(await authorizeSitEventEmail(h.db, h.input)).toEqual({ ok: false, status: 403 });
    expect(h.reads).toEqual([]);
  });
  it.each(['sent', 'viewed'])('allows invitation status %s', async (status) => {
    const h = fixture(); h.rows.sit_invitations[0].status = status;
    expect((await authorizeSitEventEmail(h.db, h.input)).ok).toBe(true);
  });
  it.each(['applied', 'declined'])('refuses an already answered invitation %s', async (status) => {
    const h = fixture(); h.rows.sit_invitations[0].status = status;
    expect(await authorizeSitEventEmail(h.db, h.input)).toEqual({ ok: false, status: 403 });
  });
  it('does not rely only on the invitation owner if the real sit owner differs', async () => {
    const h = fixture(); h.rows.sits[0].user_id = other;
    expect(await authorizeSitEventEmail(h.db, h.input)).toEqual({ ok: false, status: 403 });
  });
  it.each(['sit-invitation', 'review-received', 'cancellation-by-owner', 'cancellation-by-sitter', 'help-during-sit'])('requires a persisted %s event', async (name) => {
    const h = fixture(name); h.rows[name === 'sit-invitation' ? 'sit_invitations' : name === 'help-during-sit' ? 'messages' : 'reviews'] = [];
    expect(await authorizeSitEventEmail(h.db, h.input)).toEqual({ ok: false, status: 403 });
  });
  it('does not select or reveal a blind review text or rating', async () => {
    const h = fixture('review-received'); h.rows.reviews[0].comment = 'PRIVATE REVIEW'; h.rows.reviews[0].overall_rating = 2;
    const result = await authorizeSitEventEmail(h.db, h.input);
    expect(result.ok).toBe(true);
    expect(h.reads.find(r => r.table === 'reviews')?.columns).not.toMatch(/comment|rating/);
    expect(JSON.stringify(result)).not.toContain('PRIVATE REVIEW');
  });
  it('also permits a review from the sitter to the owner', async () => {
    const h = fixture('review-received'); h.input.callerId = sitter; h.input.recipientId = owner;
    h.input.idempotencyKey = `review-received-${sit}-${owner}`;
    h.rows.reviews[0].reviewer_id = sitter; h.rows.reviews[0].reviewee_id = owner;
    expect((await authorizeSitEventEmail(h.db, h.input)).ok).toBe(true);
  });
  it.each(['rejete', 'rejected'])('refuses a moderated-away review %s', async (status) => {
    const h = fixture('review-received'); h.rows.reviews[0].moderation_status = status;
    expect(await authorizeSitEventEmail(h.db, h.input)).toEqual({ ok: false, status: 403 });
  });
  it('refuses a hidden review', async () => {
    const h = fixture('review-received'); h.rows.reviews[0].moderation_hidden_at = '2026-09-20';
    expect(await authorizeSitEventEmail(h.db, h.input)).toEqual({ ok: false, status: 403 });
  });
  it.each(['review-received', 'cancellation-by-owner', 'cancellation-by-sitter', 'help-during-sit'])('requires the actual participating application for %s', async (name) => {
    const h = fixture(name); h.rows.applications[0].status = 'pending';
    expect(await authorizeSitEventEmail(h.db, h.input)).toEqual({ ok: false, status: 403 });
  });
  it.each(['cancellation-by-owner', 'cancellation-by-sitter'])('requires the real cancellation actor for %s', async (name) => {
    const h = fixture(name); h.rows.sits[0].cancelled_by = other;
    expect(await authorizeSitEventEmail(h.db, h.input)).toEqual({ ok: false, status: 403 });
  });
  it.each(['cancellation-by-owner', 'cancellation-by-sitter'])('requires the correct cancellation role for %s', async (name) => {
    const h = fixture(name); h.rows.reviews[0].cancelled_by_role = 'wrong-role';
    expect(await authorizeSitEventEmail(h.db, h.input)).toEqual({ ok: false, status: 403 });
  });
  it.each(['cancelled', 'published'])('preserves sitter cancellation after sit state becomes %s', async (status) => {
    const h = fixture('cancellation-by-sitter'); h.rows.sits[0].status = status;
    expect((await authorizeSitEventEmail(h.db, h.input)).ok).toBe(true);
  });
  it('normalizes unpublished feedback to the persisted event day', async () => {
    const h = fixture('listing-unpublished-feedback'); h.input.idempotencyKey = `unpublished-feedback-${sit}-2099-12-31`;
    const result = await authorizeSitEventEmail(h.db, h.input);
    expect(result.ok && result.idempotencyKey).toBe(`unpublished-feedback-${sit}-2026-09-20`);
    expect(result.ok && result.templateData.reason).toBe('plans_changed');
  });
  it('uses a neutral other branch for a free-text unpublish reason', async () => {
    const h = fixture('listing-unpublished-feedback'); h.rows.sits[0].last_unpublished_reason = 'PRIVATE FREE TEXT';
    const result = await authorizeSitEventEmail(h.db, h.input);
    expect(result.ok && result.templateData.reason).toBe('other');
    expect(JSON.stringify(result)).not.toContain('PRIVATE FREE TEXT');
  });
  it.each([null, 'invalid'])('requires an actual unpublish timestamp %s', async (timestamp) => {
    const h = fixture('listing-unpublished-feedback'); h.rows.sits[0].unpublished_at = timestamp;
    expect(await authorizeSitEventEmail(h.db, h.input)).toEqual({ ok: false, status: 403 });
  });
  it('uses a real message ID for urgency regardless of caller timestamp', async () => {
    const h = fixture('help-during-sit');
    for (const timestamp of ['1790000000000', '1799999999999']) {
      h.input.idempotencyKey = `help-urgence-${sit}-${timestamp}`;
      const result = await authorizeSitEventEmail(h.db, h.input);
      expect(result.ok && result.idempotencyKey).toBe(`help-urgence-message-${event}`);
    }
  });
  it.each(['https://fixture.invalid/messages/'+conv, 'https://guardiens.fr/review/'+sit, 'invalid'])('refuses an invalid conversation locator %s', async (href) => {
    const h = fixture('help-during-sit'); h.input.templateData.conversationHref = href;
    expect(await authorizeSitEventEmail(h.db, h.input)).toEqual({ ok: false, status: 403 });
  });
  it.each(['owner_id', 'sitter_id', 'sit_id'])('refuses an unrelated urgency conversation %s', async (column) => {
    const h = fixture('help-during-sit'); h.rows.conversations[0][column] = other;
    expect(await authorizeSitEventEmail(h.db, h.input)).toEqual({ ok: false, status: 403 });
  });
  it.each(['sender_id', 'conversation_id', 'is_system'])('refuses a message with invalid %s', async (column) => {
    const h = fixture('help-during-sit'); h.rows.messages[0][column] = column === 'is_system' ? true : other;
    expect(await authorizeSitEventEmail(h.db, h.input)).toEqual({ ok: false, status: 403 });
  });
  it('does not treat SQL wildcard characters in an excerpt as a match', async () => {
    const h = fixture('help-during-sit'); h.input.templateData.messageExcerpt = '%';
    expect(await authorizeSitEventEmail(h.db, h.input)).toEqual({ ok: false, status: 403 });
    expect(h.reads.find(r => r.table === 'messages')?.pattern).toBe('[URGENCE] \\%%');
  });
  it('preserves a real message containing SQL wildcard characters', async () => {
    const h = fixture('help-during-sit'); h.input.templateData.messageExcerpt = 'Besoin 10%_aide'; h.rows.messages[0].content = '[URGENCE] Besoin 10%_aide';
    expect((await authorizeSitEventEmail(h.db, h.input)).ok).toBe(true);
  });
  it.each(['applications', 'conversations', 'messages', 'profiles'])('fails closed on urgency %s read errors', async (table) => {
    const h = fixture('help-during-sit'); h.failures.add(table);
    expect(await authorizeSitEventEmail(h.db, h.input)).toEqual({ ok: false, status: 503 });
  });
  it('fails closed on ambiguous invitation records', async () => {
    const h = fixture(); h.rows.sit_invitations.push({ ...h.rows.sit_invitations[0] });
    expect(await authorizeSitEventEmail(h.db, h.input)).toEqual({ ok: false, status: 503 });
  });
});
