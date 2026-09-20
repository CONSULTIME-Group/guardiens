import { webcrypto } from 'node:crypto';
import { describe, expect, it, vi } from 'vitest';
import { acquireMemberSendClaim, finishMemberSendClaim, memberSendOutcome } from '../../supabase/functions/_shared/member-email-send-claim';
vi.stubGlobal('crypto', webcrypto);
const input = { templateName: 'sit-invitation', recipientEmail: 'recipient@fixture.test', idempotencyKey: 'canonical-event' };
const fixture = () => ({ rpc: vi.fn(async () => ({ data: 'acquired', error: null })) });
describe('member send reservation identity and failures', () => {
  it('uses a stable digest for the same intent and fresh ownership per attempt', async () => {
    const db = fixture(); const a = await acquireMemberSendClaim(db, input); const b = await acquireMemberSendClaim(db, input);
    expect(a.status).toBe('acquired'); expect(b.status).toBe('acquired');
    if (a.status === 'acquired' && b.status === 'acquired') {
      expect(a.claim.key).toMatch(/^[a-f0-9]{64}$/); expect(a.claim.key).toBe(b.claim.key); expect(a.claim.token).not.toBe(b.claim.token);
    }
    expect(JSON.stringify(db.rpc.mock.calls)).not.toContain(input.recipientEmail);
    expect(JSON.stringify(db.rpc.mock.calls)).not.toContain(input.idempotencyKey);
  });
  it('normalizes address case', async () => {
    const db = fixture(); await acquireMemberSendClaim(db, input); await acquireMemberSendClaim(db, { ...input, recipientEmail: input.recipientEmail.toUpperCase() });
    expect((db.rpc.mock.calls[0] as any)[1].p_claim_key).toBe((db.rpc.mock.calls[1] as any)[1].p_claim_key);
  });
  it.each(['templateName', 'recipientEmail', 'idempotencyKey'])('keeps a different %s intent independent', async field => {
    const db = fixture(); await acquireMemberSendClaim(db, input); await acquireMemberSendClaim(db, { ...input, [field]: 'different' });
    expect((db.rpc.mock.calls[0] as any)[1].p_claim_key).not.toBe((db.rpc.mock.calls[1] as any)[1].p_claim_key);
  });
  it.each(['sent', 'busy', 'uncertain'])('preserves database verdict %s', async data => {
    expect(await acquireMemberSendClaim({ rpc: async () => ({ data, error: null }) }, input)).toEqual({ status: data });
  });
  it.each([null, 'unexpected', {}, []])('fails closed on malformed RPC result %j', async data => {
    expect(await acquireMemberSendClaim({ rpc: async () => ({ data, error: null }) }, input)).toEqual({ status: 'unavailable' });
  });
  it('does not accept an acquired flag with a DB error', async () => {
    expect(await acquireMemberSendClaim({ rpc: async () => ({ data: 'acquired', error: {} }) }, input)).toEqual({ status: 'unavailable' });
  });
  it('handles thrown RPC failure without leaking details', async () => {
    expect(await acquireMemberSendClaim({ rpc: async () => { throw new Error('private detail'); } }, input)).toEqual({ status: 'unavailable' });
  });
  it.each([400, 401, 403, 422, 429])('allows retry after definite rejection %i', status => expect(memberSendOutcome(status)).toBe('retryable'));
  it.each([408, 409, 500, 502, 503, 504, 200])('keeps ambiguous status %i reserved', status => expect(memberSendOutcome(status)).toBe('uncertain'));
  it('fails closed when finalization is not confirmed', async () => {
    const claim = { key: 'a'.repeat(64), token: 'fixture-owner' };
    expect(await finishMemberSendClaim({ rpc: async () => ({ data: true, error: {} }) }, claim, 'retryable')).toBe(false);
    expect(await finishMemberSendClaim({ rpc: async () => ({ data: false, error: null }) }, claim, 'sent')).toBe(false);
    expect(await finishMemberSendClaim({ rpc: async () => { throw new Error('private detail'); } }, claim, 'uncertain')).toBe(false);
  });
});
