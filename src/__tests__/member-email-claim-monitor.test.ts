import { describe, expect, it, vi } from 'vitest'
import { monitorMemberEmailClaims } from '../../supabase/functions/_shared/member-email-claim-monitor'

const now = new Date('2026-09-20T10:00:00.000Z')
const prefix = 'email_pipeline:member_email_claims_'
type Row = { state: string; updated_at: string }
function fixture(rows: Row[] = [], options: { count?: unknown; readError?: boolean; throws?: boolean; writeError?: boolean; resolveError?: boolean; writeThrows?: boolean; resolveThrows?: boolean } = {}) {
  const reads: any[] = [], resolutions: any[] = []
  const rpc = vi.fn(async () => { if (options.writeThrows) throw new Error('sensitive'); return { error: options.writeError ? { message: 'sensitive' } : null } })
  const from = vi.fn((table: string) => {
    const filters: any[] = []
    const query: any = {}
    for (const method of ['eq', 'is', 'lt']) query[method] = (...args: any[]) => { filters.push([method, ...args]); return query }
    query.select = (...args: any[]) => { reads.push({ table, args, filters }); return query }
    query.update = (patch: any) => { resolutions.push({ table, patch, filters }); return query }
    query.then = (resolve: any, reject: any) => {
      if (table === 'error_logs' && options.resolveThrows) return Promise.reject(new Error('sensitive')).then(resolve, reject)
      if (table === 'error_logs') return Promise.resolve({ error: options.resolveError ? {} : null }).then(resolve, reject)
      if (options.throws) return Promise.reject(new Error('sensitive')).then(resolve, reject)
      const count = 'count' in options ? options.count : rows.filter(row => filters.every(([op, col, value]) => op === 'eq' ? row[col as keyof Row] === value : row[col as keyof Row] < value)).length
      return Promise.resolve({ count, error: options.readError ? { message: 'sensitive' } : null }).then(resolve, reject)
    }
    return query
  })
  return { from, rpc, reads, resolutions }
}

describe('member email claim monitor', () => {
  it('counts only uncertain and strictly older than ten minutes sending claims', async () => {
    const db = fixture([
      { state: 'uncertain', updated_at: now.toISOString() },
      { state: 'sending', updated_at: '2026-09-20T09:49:59.999Z' },
      { state: 'sending', updated_at: '2026-09-20T09:50:00.000Z' },
      { state: 'sending', updated_at: now.toISOString() },
      { state: 'sent', updated_at: '2026-09-19T00:00:00.000Z' },
      { state: 'retryable', updated_at: '2026-09-19T00:00:00.000Z' },
    ])
    expect(await monitorMemberEmailClaims(db, now)).toEqual({ checked_at: now.toISOString(), uncertain: 1, stale_sending: 1 })
    expect(db.rpc).toHaveBeenCalledTimes(2)
    expect(db.resolutions).toHaveLength(1)
    expect(db.resolutions[0].filters).toContainEqual(['eq', 'fingerprint', prefix + 'unavailable'])
    for (const read of db.reads) expect(read.args).toEqual(['state', { count: 'exact', head: true }])
  })
  it('resolves only its own older unresolved diagnostics after confirmed zero counts', async () => {
    const db = fixture()
    await monitorMemberEmailClaims(db, now)
    expect(db.rpc).not.toHaveBeenCalled()
    expect(db.resolutions).toHaveLength(3)
    for (const r of db.resolutions) {
      expect(r.table).toBe('error_logs')
      expect(r.patch).toEqual({ resolved_at: now.toISOString() })
      expect(r.filters).toContainEqual(['eq', 'source', 'email-pipeline-watchdog'])
      expect(r.filters).toContainEqual(['is', 'resolved_at', null])
      expect(r.filters).toContainEqual(['lt', 'last_seen_at', now.toISOString()])
      expect(r.filters.find((f: any) => f[1] === 'fingerprint')[2]).toMatch(/^email_pipeline:member_email_claims_(uncertain|stale_sending|unavailable)$/)
    }
  })
  it.each([null, undefined, -1, 0.5, '0', NaN, Infinity])('rejects an incomplete/invalid count (%s) without resolving diagnostics', async count => {
    const db = fixture([], { count })
    await expect(monitorMemberEmailClaims(db, now)).rejects.toThrow('monitoring unavailable')
    expect(db.resolutions).toHaveLength(0)
    expect(db.rpc).toHaveBeenCalledExactlyOnceWith('log_client_error', expect.objectContaining({ _fingerprint: prefix + 'unavailable' }))
  })
  it.each([{ readError: true }, { throws: true }])('handles read failure privately and retains existing signals: %j', async options => {
    const db = fixture([], options)
    await expect(monitorMemberEmailClaims(db, now)).rejects.toThrow('monitoring unavailable')
    expect(db.resolutions).toHaveLength(0)
    expect(JSON.stringify(db.rpc.mock.calls)).not.toContain('sensitive')
  })
  it.each([{ writeError: true }, { writeThrows: true }])('does not equate a failed diagnostic write with success: %j', async options => {
    const db = fixture([{ state: 'uncertain', updated_at: now.toISOString() }], options)
    await expect(monitorMemberEmailClaims(db, now)).rejects.toThrow('diagnostic write failed')
    expect(db.resolutions).toHaveLength(0)
  })
  it.each([{ resolveError: true }, { resolveThrows: true }])('does not equate a failed diagnostic resolution with success: %j', async options => {
    await expect(monitorMemberEmailClaims(fixture([], options), now)).rejects.toThrow('diagnostic resolution failed')
  })
  it('uses full counts rather than a page of claim records and never invokes a claim mutation', async () => {
    const db = fixture([], { count: 1201 })
    expect(await monitorMemberEmailClaims(db, now)).toMatchObject({ uncertain: 1201, stale_sending: 1201 })
    for (const [name, args] of db.rpc.mock.calls as any) {
      expect(name).toBe('log_client_error')
      expect(Object.keys(args._context).sort()).toEqual(args._context.stale_before ? ['checked_at', 'code', 'stale_before', 'stale_sending', 'uncertain'] : ['checked_at', 'code', 'stale_sending', 'uncertain'])
    }
    expect(db.from.mock.calls.every(([table]) => ['error_logs', 'member_email_send_claims'].includes(table))).toBe(true)
  })
})
