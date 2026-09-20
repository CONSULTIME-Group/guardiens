import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { runInNewContext } from "node:vm";
import ts from "typescript";
import { describe, expect, it, vi } from "vitest";
type Row = Record<string, any>;
function terms(value: string): string[] {
  let depth = 0;
  let start = 0;
  const result: string[] = [];
  for (let i = 0; i < value.length; i++) {
    if (value[i] === "(") depth++;
    if (value[i] === ")") depth--;
    if (value[i] === "," && depth === 0) {
      result.push(value.slice(start, i));
      start = i + 1;
    }
  }
  result.push(value.slice(start));
  return result;
}

function matches(row: Row, filter: string): boolean {
  for (const operation of ["and", "or"]) {
    if (filter.startsWith(`${operation}(`) && filter.endsWith(")")) {
      const values = terms(filter.slice(operation.length + 1, -1)).map((term) => matches(row, term));
      return operation === "and" ? values.every(Boolean) : values.some(Boolean);
    }
  }
  const match = filter.match(/^(.+?)\.(eq|in)\.(.*)$/);
  if (!match) throw new Error(`Unsupported fixture filter: ${filter}`);
  const [, field, operator, expected] = match;
  const actual = field.split("->>").reduce((value, part) => value?.[part], row);
  return operator === "eq" ? actual === expected : terms(expected.slice(1, -1)).includes(actual);
}

const fixture = { application_id: "fixture-app", sit_id: "fixture-sit", sitter_id: "fixture-sitter", owner_id: "fixture-owner", owner_email: "fixture@example.invalid", hours_since_last_message: 96, hours_since_created: 96, msg_count: 2, sit_title: "Fixture" };
function harness(logs: Row[], options: { signalError?: string; sendStatus?: number; suppressed?: boolean } = {}) {
  let handler: (req: Request) => Promise<Response>;
  const finish = vi.fn();
  const fetch = vi.fn(async (_url: string, _init: RequestInit) => new Response(JSON.stringify({ success: true }), { status: options.sendStatus ?? 200 }));
  const client = {
    rpc: vi.fn(async (name: string) => ({ data: name === "detect_stalled_discussions" ? [fixture] : name === "detect_pending_applications" ? [] : null, error: null })),
    from: (table: string) => {
      const predicates: Array<(row: Row) => boolean> = [];
      const chain: Row = {};
      chain.select = chain.limit = () => chain;
      chain.eq = (field: string, value: unknown) => { predicates.push(row => row[field] === value); return chain; };
      chain.or = (filter: string) => { predicates.push(row => matches(row, `or(${filter})`)); return chain; };
      chain.insert = async () => ({ error: options.signalError ? { code: options.signalError, message: "fixture private message" } : null });
      chain.maybeSingle = async () => ({ data: table === "feature_flags" ? { enabled: true } : table === "suppressed_emails" ? (options.suppressed ? { email: "fixture@example.invalid" } : null) : logs.find(row => predicates.every(p => p(row))) ?? null, error: null });
      return chain;
    },
  };
  const source = readFileSync(resolve("supabase/functions/nudge-owner-pending-application/index.ts"), "utf8") + "\nexport { sendReminderEmail, sendStalledDiscussionEmail };";
  const { outputText } = ts.transpileModule(source, { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS } });
  const exports: Row = {};
  const Deno = { env: { get: () => "fixture-key" }, serve: (fn: typeof handler) => { handler = fn; } };
  runInNewContext(outputText, { exports, Deno, Request, Response, Date, fetch, console: { error: vi.fn() }, require: (name: string) => {
    if(name.includes("supabase-js")) return { createClient: () => client };
    if(name.includes("require-admin")) return { requireAdminOrServiceRole: async () => null };
    if(name.includes("cron-run-log")) return { startCronRun: async () => ({ finish, fail: vi.fn() }) };
    throw new Error(name);
  } });
  return { fetch, finish, invoke: () => handler(new Request("https://fixture.invalid", {method:"POST",body:"{}"})),
    send: (kind: string) => kind === "pending" ? exports.sendReminderEmail({serviceClient:client,app:fixture,messageId:"stable-fixture-key",templateName:"pending_application_reminder"}) : exports.sendStalledDiscussionEmail({serviceClient:client,disc:fixture,messageId:"stable-fixture-key"}) };
}
describe.each(["pending", "stalled"])("owner nudge %s deduplication", kind => {
  const template = kind === "pending" ? "owner-pending-application-nudge" : "discussion-stalled-nudge";
  const modern = (status: string, extra: Row = {}) => ({message_id:"random-id",template_name:template,status,metadata:{idempotency_key:"stable-fixture-key"},...extra});
  it.each(["sent","pending","deferred"])("skips modern %s before issuing tokens or calling sender", async status => {
    const h=harness([modern(status)]); expect(await h.send(kind)).toMatchObject({outcome:"skipped"}); expect(h.fetch).not.toHaveBeenCalled();
  });
  it("retains historical message ids", async () => { const h=harness([{message_id:"stable-fixture-key"}]); expect(await h.send(kind)).toMatchObject({outcome:"skipped"}); expect(h.fetch).not.toHaveBeenCalled(); });
  it.each(["failed","cancelled","abandoned","suppressed"])("does not block a modern %s entry", async status => { const h=harness([modern(status)]); expect(await h.send(kind)).toMatchObject({outcome:"sent"}); expect(h.fetch).toHaveBeenCalledTimes(1); });
  it.each([{template_name:"other"},{metadata:{idempotency_key:"other"}},{metadata:{}}])("ignores unrelated log %j", async extra => { const h=harness([modern("sent",extra)]); expect(await h.send(kind)).toMatchObject({outcome:"sent"}); });
  it("preserves suppression", async () => { const h=harness([],{suppressed:true}); expect(await h.send(kind)).toMatchObject({outcome:"skipped"}); expect(h.fetch).not.toHaveBeenCalled(); });
  it("keeps stable idempotency and template for new sends", async () => { const h=harness([]); await h.send(kind); expect(JSON.parse(String(h.fetch.mock.calls[0][1].body))).toMatchObject({templateName:template,idempotencyKey:"stable-fixture-key"}); });
});
describe("safe stalled error diagnostics", () => {
  it("records SQL stage/code without private messages", async () => { const h=harness([],{signalError:"42501"}); await h.invoke(); expect(h.finish).toHaveBeenCalledWith("partial",expect.objectContaining({stalled_error_counts:{"signal_insert:42501":1}})); expect(JSON.stringify(h.finish.mock.calls)).not.toContain("fixture private message"); });
  it("records sender HTTP stage/code", async () => { const h=harness([],{sendStatus:429}); await h.invoke(); expect(h.finish).toHaveBeenCalledWith("partial",expect.objectContaining({stalled_error_counts:{"send:429":1}})); });
  it("does not persist arbitrary error codes", async () => { const h=harness([],{signalError:"private@example.invalid"}); await h.invoke(); expect(h.finish).toHaveBeenCalledWith("partial",expect.objectContaining({stalled_error_counts:{"signal_insert:unknown":1}})); });
});
