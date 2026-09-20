import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { runInNewContext } from 'node:vm';
import ts from 'typescript';
import { describe, expect, it, vi } from 'vitest';

// Run the unchanged worker against inert doubles to verify how the sender's
// cancellation/retry contract affects queue status and business counters.
function worker(result: Record<string, unknown>, httpStatus = 200) {
  let handler!: (request: Request) => Promise<Response>;
  const row = { id: 'fixture-queue', template_name: 'application-accepted', recipient_email: 'recipient@fixture.test', template_data: {}, idempotency_key: 'fixture-key', attempts: 0 };
  const writes: Array<{ table: string; value: any }> = [];
  const from = (table: string) => {
    let operation = 'read';
    let columns = '';
    const query: Record<string, any> = {};
    for (const name of ['eq', 'lt', 'lte', 'gte', 'filter', 'order', 'limit', 'is']) query[name] = () => query;
    query.update = (value: unknown) => { operation = 'update'; writes.push({ table, value }); return query; };
    query.insert = (value: unknown) => { writes.push({ table, value }); return query; };
    query.select = (value: string) => { columns = value; return query; };
    query.then = (resolve: (value: unknown) => unknown) => Promise.resolve({
      data: table === 'email_deferred_queue' && columns.startsWith('id, template_name') ? [row]
        : table === 'email_deferred_queue' && operation === 'update' && columns === 'id' ? [{ id: row.id }] : [],
      error: null, count: 0,
    }).then(resolve);
    return query;
  };
  const fetch = vi.fn(async () => new Response(JSON.stringify(result), { status: httpStatus }));
  const env: Record<string, string> = { SUPABASE_URL: 'https://fixture.invalid', SUPABASE_SERVICE_ROLE_KEY: 'fixture-service' };
  const source = readFileSync(resolve('supabase/functions/flush-deferred-emails/index.ts'), 'utf8');
  runInNewContext(ts.transpileModule(source, { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS } }).outputText, {
    exports: {}, Request, Response, Date, Error, fetch,
    console: { log: vi.fn(), warn: vi.fn(), error: vi.fn() },
    Deno: { env: { get: (name: string) => env[name] }, serve: (fn: typeof handler) => { handler = fn; } },
    require: (name: string) => { if (name.includes('supabase-js')) return { createClient: () => ({ from }) }; throw new Error(name); },
  });
  return { writes, fetch, invoke: () => handler(new Request('https://fixture.invalid', { method: 'POST', headers: { authorization: 'Bearer fixture-service' } })) };
}

describe('worker handling of deferred event authorization', () => {
  it('closes revoked authorization without counting a send or retry', async () => {
    const h = worker({ success: false, cancelled: true, reason: 'event_no_longer_authorized' });
    const response = await h.invoke();
    expect(await response.json()).toMatchObject({ sent: 0, failed: 0, closed: 1, redeferred: 0 });
    expect(h.writes).toContainEqual({ table: 'email_deferred_queue', value: expect.objectContaining({ status: 'abandoned' }) });
    expect(h.writes).toContainEqual({ table: 'email_send_log', value: expect.objectContaining({ status: 'cancelled' }) });
    expect(h.writes.some(w => w.value.status === 'sent')).toBe(false);
    expect(h.fetch).toHaveBeenCalledTimes(1);
  });
  it('retries a temporary authorization read failure instead of closing or counting sent', async () => {
    const h = worker({ error: 'Notification authorization unavailable' }, 503);
    expect(await (await h.invoke()).json()).toMatchObject({ sent: 0, failed: 1, closed: 0 });
    expect(h.writes).toContainEqual({ table: 'email_deferred_queue', value: expect.objectContaining({ status: 'pending', attempts: 1, scheduled_for: expect.any(String) }) });
    expect(h.writes.some(w => ['sent', 'abandoned', 'cancelled'].includes(w.value.status))).toBe(false);
  });
  it('keeps a new deferral pending without counting an email', async () => {
    const h = worker({ success: true, deferred: true, reason: 'daily_cap' });
    expect(await (await h.invoke()).json()).toMatchObject({ sent: 0, failed: 0, redeferred: 1 });
    expect(h.writes.some(w => w.value.status === 'sent')).toBe(false);
  });
});
