import { describe, expect, it } from 'vitest';
import { authorizeApplicationEmail } from '../../supabase/functions/_shared/application-email-authorization';

const owner = '10000000-0000-4000-8000-000000000001';
const sitter = '20000000-0000-4000-8000-000000000002';
const other = '30000000-0000-4000-8000-000000000003';
const app = '40000000-0000-4000-8000-000000000004';
const sit = '50000000-0000-4000-8000-000000000005';
const conv = '60000000-0000-4000-8000-000000000006';
const property = '70000000-0000-4000-8000-000000000007';

type Row = Record<string, unknown>;
function fixture(status = 'accepted') {
  const rows: Record<string, Row[]> = {
    applications: [{ id: app, sit_id: sit, sitter_id: sitter, status, decline_reason: 'dates_changed', decline_variant: 1 }],
    sits: [{ id: sit, user_id: owner, status: 'confirmed', title: 'La garde en base', city: 'Lyon', property_id: property, start_date: '2026-10-01', end_date: '2026-10-07' }],
    conversations: [{ id: conv, sit_id: sit, owner_id: owner, sitter_id: sitter }],
    profiles: [{ id: owner, first_name: 'Camille' }, { id: sitter, first_name: 'Lou' }],
    pets: [{ property_id: property, name: 'Mina' }, { property_id: property, name: 'Tao' }, { property_id: other, name: 'Unrelated' }],
  };
  const failures = new Set<string>();
  const thrown = new Set<string>();
  const reads: string[] = [];
  const db = {
    from(table: string) {
      reads.push(table);
      if (thrown.has(table)) throw new Error('private failure');
      const filters: Array<[string, unknown]> = [];
      const result = () => ({ data: rows[table].filter(row => filters.every(([key, value]) => row[key] === value)), error: failures.has(table) ? { message: 'private database detail' } : null });
      const chain = {
        select: (_columns: string) => chain,
        eq: (key: string, value: unknown) => { filters.push([key, value]); return chain; },
        maybeSingle: async () => {
          const r = result();
          return r.data.length > 1 ? { data: null, error: { message: 'multiple rows' } } : { ...r, data: r.data[0] ?? null };
        },
        then: (callback: (value: unknown) => unknown) => Promise.resolve(result()).then(callback),
      };
      return chain;
    },
  };
  return { db, rows, reads, failures, thrown };
}

function request(templateName = 'application-accepted', idempotencyKey: unknown = `app-accepted-${app}`) {
  return { templateName, idempotencyKey, callerId: owner, recipientId: templateName === 'sit-confirmed' ? owner : sitter };
}

const acceptedKeys = [`app-accepted-${app}`, `app-accepted-conv-${conv}-${sitter}`];
const declinedKeys = [`app-declined-${app}`, `app-declined-conv-${conv}-${sitter}`, `app-declined-auto-${sit}-${sitter}`];

describe('application email read-only authorization', () => {
  it.each(acceptedKeys)('accepts the existing acceptance path %s and canonicalizes it', async (key) => {
    const h = fixture();
    const result = await authorizeApplicationEmail(h.db, request('application-accepted', key));
    expect(result).toEqual({ ok: true, idempotencyKey: `app-accepted-${app}`, dedupeKeys: acceptedKeys, templateData: { sitTitle: 'La garde en base', ownerFirstName: 'Camille' } });
  });
  it.each(declinedKeys)('accepts the existing rejection path %s and canonicalizes it', async (key) => {
    const h = fixture('rejected');
    const result = await authorizeApplicationEmail(h.db, request('application-declined', key));
    expect(result).toEqual({ ok: true, idempotencyKey: `app-declined-${app}`, dedupeKeys: declinedKeys, templateData: { sitTitle: 'La garde en base', sitterFirstName: 'Lou', sitCity: 'Lyon', declineReason: 'dates_changed', declineVariant: 1, locale: 'fr' } });
  });
  it('builds a confirmation only for the owner with the selected sitter and property pets', async () => {
    const h = fixture();
    expect(await authorizeApplicationEmail(h.db, request('sit-confirmed', `sit-confirmed-${sit}`))).toEqual({
      ok: true, idempotencyKey: `sit-confirmed-${sit}`, dedupeKeys: [`sit-confirmed-${sit}`],
      templateData: { sitId: sit, sitTitle: 'La garde en base', sitterFirstName: 'Lou', startDate: '1 octobre 2026', endDate: '7 octobre 2026', petNames: 'Mina, Tao' },
    });
  });
  it.each(['published', 'confirmed', 'in_progress'])('allows an accepted application on a %s sit', async (status) => {
    const h = fixture(); h.rows.sits[0].status = status;
    expect((await authorizeApplicationEmail(h.db, request())).ok).toBe(true);
  });
  it.each(['draft', 'cancelled', 'completed'])('refuses an acceptance for a %s sit', async (status) => {
    const h = fixture(); h.rows.sits[0].status = status;
    expect(await authorizeApplicationEmail(h.db, request())).toEqual({ ok: false, status: 403 });
  });
  it.each(['pending', 'viewed', 'rejected', 'cancelled'])('refuses acceptance with application status %s', async (status) => {
    expect(await authorizeApplicationEmail(fixture(status).db, request())).toEqual({ ok: false, status: 403 });
  });
  it.each(['pending', 'viewed', 'accepted', 'cancelled'])('refuses rejection with application status %s', async (status) => {
    expect(await authorizeApplicationEmail(fixture(status).db, request('application-declined', declinedKeys[0]))).toEqual({ ok: false, status: 403 });
  });
  it.each(['published', 'draft', 'cancelled', 'completed'])('refuses confirmation with sit status %s', async (status) => {
    const h = fixture(); h.rows.sits[0].status = status;
    expect(await authorizeApplicationEmail(h.db, request('sit-confirmed', `sit-confirmed-${sit}`))).toEqual({ ok: false, status: 403 });
  });
  it('allows confirmation after transition to in_progress', async () => {
    const h = fixture(); h.rows.sits[0].status = 'in_progress';
    expect((await authorizeApplicationEmail(h.db, request('sit-confirmed', `sit-confirmed-${sit}`))).ok).toBe(true);
  });
  it.each(['applications', 'sits'])('refuses a missing %s row', async (table) => {
    const h = fixture(); h.rows[table] = [];
    expect(await authorizeApplicationEmail(h.db, request())).toEqual({ ok: false, status: 403 });
  });
  it.each(['application-accepted', 'application-declined', 'sit-confirmed'])('refuses another owner for %s', async (template) => {
    const h = fixture(template === 'application-declined' ? 'rejected' : 'accepted'); h.rows.sits[0].user_id = other;
    const key = template === 'sit-confirmed' ? `sit-confirmed-${sit}` : template === 'application-declined' ? declinedKeys[0] : acceptedKeys[0];
    expect(await authorizeApplicationEmail(h.db, request(template, key))).toEqual({ ok: false, status: 403 });
  });
  it.each([owner, other])('refuses the wrong acceptance recipient %s', async (recipientId) => {
    expect(await authorizeApplicationEmail(fixture().db, { ...request(), recipientId })).toEqual({ ok: false, status: 403 });
  });
  it('cannot send the owner confirmation to a sitter', async () => {
    expect(await authorizeApplicationEmail(fixture().db, { ...request('sit-confirmed', `sit-confirmed-${sit}`), recipientId: sitter })).toEqual({ ok: false, status: 403 });
  });
  it.each(['owner_id', 'sitter_id', 'sit_id'])('refuses an unrelated conversation %s', async (column) => {
    const h = fixture(); h.rows.conversations[0][column] = other;
    expect(await authorizeApplicationEmail(h.db, request('application-accepted', acceptedKeys[1]))).toEqual({ ok: false, status: 403 });
  });
  it('refuses a missing conversation', async () => {
    const h = fixture(); h.rows.conversations = [];
    expect(await authorizeApplicationEmail(h.db, request('application-accepted', acceptedKeys[1]))).toEqual({ ok: false, status: 403 });
  });
  it.each([`app-accepted-conv-${conv}-${other}`, `app-declined-auto-${sit}-${other}`])('refuses mismatched recipient encoded in %s without a read', async (key) => {
    const h = fixture();
    expect(await authorizeApplicationEmail(h.db, request(key.includes('declined') ? 'application-declined' : 'application-accepted', key))).toEqual({ ok: false, status: 403 });
    expect(h.reads).toEqual([]);
  });
  it.each(['', null, undefined, 3, {}, `app-accepted-${app}-replay`, `app-declined-${app}`, `app-accepted-${other}`, `app-accepted-auto-${sit}-${sitter}`])('does not authorize a malformed, wrong-action or unknown event key %j', async (key) => {
    expect(await authorizeApplicationEmail(fixture().db, { ...request(), idempotencyKey: key })).toEqual({ ok: false, status: 403 });
  });
  it('does not accept a template outside this policy', async () => {
    expect(await authorizeApplicationEmail(fixture().db, request('new-message'))).toEqual({ ok: false, status: 403 });
  });
  it('refuses confirmation without an accepted application', async () => {
    expect(await authorizeApplicationEmail(fixture('pending').db, request('sit-confirmed', `sit-confirmed-${sit}`))).toEqual({ ok: false, status: 403 });
  });
  it('fails closed on multiple accepted applications', async () => {
    const h = fixture(); h.rows.applications.push({ ...h.rows.applications[0], id: other, sitter_id: other });
    expect(await authorizeApplicationEmail(h.db, request('sit-confirmed', `sit-confirmed-${sit}`))).toEqual({ ok: false, status: 503 });
  });
  it.each(['applications', 'sits', 'conversations', 'profiles', 'pets'])('fails closed on a %s read failure with no private details', async (table) => {
    const h = fixture(); h.failures.add(table);
    const input = table === 'pets' ? request('sit-confirmed', `sit-confirmed-${sit}`) : request();
    expect(await authorizeApplicationEmail(h.db, input)).toEqual({ ok: false, status: 503 });
  });
  it('fails closed on a thrown transport error', async () => {
    const h = fixture(); h.thrown.add('applications');
    expect(await authorizeApplicationEmail(h.db, request())).toEqual({ ok: false, status: 503 });
  });
  it('retains all historical conversation aliases without changing the canonical key', async () => {
    const h = fixture(); h.rows.conversations.push({ ...h.rows.conversations[0], id: other });
    const result = await authorizeApplicationEmail(h.db, request());
    expect(result.ok && result.dedupeKeys).toEqual([...acceptedKeys, `app-accepted-conv-${other}-${sitter}`]);
  });
  it('keeps an absent display name harmless without trusting a browser fallback', async () => {
    const h = fixture(); h.rows.profiles = [];
    const result = await authorizeApplicationEmail(h.db, request());
    expect(result.ok && result.templateData).toEqual({ sitTitle: 'La garde en base', ownerFirstName: '' });
  });
});
