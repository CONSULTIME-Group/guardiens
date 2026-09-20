import { webcrypto } from "node:crypto";
import * as memberClaim from "../../supabase/functions/_shared/member-email-send-claim";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { runInNewContext } from "node:vm";
import ts from "typescript";
import * as deferredAuthorization from "../../supabase/functions/_shared/deferred-member-email-authorization";
import * as sitEventAuthorization from "../../supabase/functions/_shared/sit-event-email-authorization";
import * as applicationAuthorization from "../../supabase/functions/_shared/application-email-authorization";
import { describe, expect, it, vi } from "vitest";

vi.stubGlobal("crypto", webcrypto);
const callerId = "88888888-8888-4888-8888-888888888888";
const eventId = "55555555-5555-4555-8555-555555555555";
const targetId = "11111111-1111-4111-8111-111111111111";
const reference = `user-${targetId}@notification.guardiens.invalid`;
const appId = "33333333-3333-4333-8333-333333333333";
const sitId = "22222222-2222-4222-8222-222222222222";
const convId = "44444444-4444-4444-8444-444444444444";
const privateAddress = "private@fixture.test";
const ownAddress = "self@fixture.test";
const serviceKey = "fixture-service-secret";
const queueId = "77777777-7777-4777-8777-777777777777";
const boundary = new Error("authorized business boundary");
const forgedJwt = `eyJhbGciOiJIUzI1NiJ9.${Buffer.from('{"role":"service_role"}').toString("base64url")}.invalid`;

type Options = {
  address?: string | null;
  resolutionError?: boolean;
  admin?: boolean;
  roleError?: boolean;
  foreignOwner?: boolean;
  missingEvent?: boolean;
  applicationStatus?: string;
  eventReadError?: boolean;
  duplicateKey?: string;
  duplicateStatus?: string;
  idempotencyError?: boolean;
  recipientError?: boolean;
  profileEmail?: string;
  member?: boolean;
  provider?: "success" | "error";
  deferredSource?: boolean;
  trustedOrigin?: boolean;
  legacyOrigin?: boolean;
  queueReadError?: boolean;
  defer?: boolean;
  claimRpc?: (name: string, args: Record<string, unknown>) => Promise<{ data: unknown; error: unknown }>;
  providerStatus?: number;
  providerThrow?: boolean;
  providerMissingId?: boolean;
  pendingError?: boolean;
};

// Execute the actual Edge handler with inert DB, rendering and provider doubles.
// No network or email is possible. Most cases stop before any business write.
function harness(options: Options = {}) {
  let handler!: (request: Request) => Promise<Response>;
  const getUser = vi.fn(async (token: string) => ({
    data: { user: token === "member-session" ? { id: callerId, email: ownAddress } : null },
  }));
  const rpc = vi.fn(async (name: string, args?: Record<string, unknown>) => {
    if (name === "acquire_member_email_send_claim" || name === "finish_member_email_send_claim") {
      if (options.claimRpc) return options.claimRpc(name, args!);
      return { data: name.startsWith("acquire_") ? "acquired" : true, error: null };
    }
    if (name === "has_role") return { data: options.admin === true, error: options.roleError ? { message: "fixture role failure" } : null };
    if (name === "get_user_email_for_notification") return {
      data: options.address === undefined ? privateAddress : options.address,
      error: options.resolutionError ? { message: `DB error ${privateAddress}` } : null,
    };
    throw new Error(`Unexpected RPC ${name}`);
  });
  let activeTemplate = "application-accepted";
  let activeEventKey = "";
  let activeQueueKey = "";
  let activeTemplateData: Record<string, unknown> = {};
  const createElement = vi.fn(() => ({}));
  const queriedRecipients: string[] = [];
  const recipientPatterns: string[] = [];
  const writes: unknown[] = [];
  const from = vi.fn((table: string) => {
    const chain: Record<string, any> = {};
    const filters: Array<[string, unknown]> = [];
    let keyFilter: string[] = [];
    for (const method of ["select", "eq", "neq", "gte", "ilike", "like", "order", "or", "filter", "in", "insert", "update"]) {
      chain[method] = (...args: unknown[]) => {
        if (method === "eq") filters.push([String(args[0]), args[1]]);
        if (method === "in" && args[0] === "metadata->>idempotency_key") keyFilter = args[1] as string[];
        if (method === "filter" && args[0] === "metadata->>idempotency_key") keyFilter = [String(args[2])];
        if (method === "ilike" && args[0] === "email") recipientPatterns.push(String(args[1]));
        if (["eq", "ilike"].includes(method) && args[0] === "recipient_email") queriedRecipients.push(String(args[1]));
        if (method === "insert" || method === "update") writes.push({ table, method, values: args[0] });
        return chain;
      };
    }
    chain.limit = () => {
      if (table === "messages") return chain;
      if (options.idempotencyError) return { data: null, error: { message: "private dedup error" } };
      if (options.duplicateKey && keyFilter.includes(options.duplicateKey)) return { data: [{ id: "fixture-existing", status: options.duplicateStatus }], error: null };
      if (!options.provider) throw boundary;
      return { data: [], error: null };
    };
    const eventRows: Record<string, Array<Record<string, unknown>>> = {
      applications: [{ id: appId, sit_id: sitId, sitter_id: activeTemplate === "cancellation-by-sitter" ? callerId : targetId, status: options.applicationStatus ?? (activeTemplate.startsWith("cancellation-") ? "cancelled" : activeTemplate === "application-declined" ? "rejected" : "accepted") }],
      sits: [{ id: sitId, user_id: options.foreignOwner ? "other-owner" : activeTemplate === "cancellation-by-sitter" ? targetId : callerId, status: ({ "sit-invitation": "published", "review-received": "completed", "cancellation-by-owner": "cancelled", "cancellation-by-sitter": "published", "help-during-sit": "in_progress", "listing-unpublished-feedback": "draft" } as Record<string, string>)[activeTemplate] ?? "confirmed", cancelled_by: callerId, cancelled_at: "2026-09-20T10:00:00Z", unpublished_at: options.missingEvent ? null : "2026-09-20T10:00:00Z", last_unpublished_reason: "plans_changed", title: "Titre en base", property_id: "fixture-property", start_date: "2026-10-01", end_date: "2026-10-05" }],
      conversations: [{ id: convId, sit_id: sitId, sitter_id: targetId, owner_id: callerId }],
      sit_invitations: options.missingEvent ? [] : [{ id: eventId, sit_id: sitId, owner_id: callerId, sitter_id: targetId, status: "sent", message: "Invitation en base" }],
      reviews: options.missingEvent ? [] : [{ id: eventId, sit_id: sitId, reviewer_id: callerId, reviewee_id: targetId, review_type: activeTemplate.startsWith("cancellation-") ? "annulation" : "garde", cancelled_by_role: activeTemplate === "cancellation-by-sitter" ? "gardien" : "proprio", cancellation_reason: "Motif en base", moderation_status: "en_attente", moderation_hidden_at: null }],
      messages: options.missingEvent ? [] : [{ id: eventId, conversation_id: convId, sender_id: callerId, is_system: false, content: "[URGENCE] Message en base" }],
      pets: [{ property_id: "fixture-property", name: "Animal en base" }],
    };
    const eventResult = () => ({ data: (eventRows[table] ?? []).filter((row) => filters.every(([key, value]) => row[key] === value)), error: options.eventReadError ? { message: "private DB error" } : null });
    chain.maybeSingle = async () => {
      if (table in eventRows) { const result = eventResult(); return { ...result, data: result.data[0] ?? null }; }
      if (table === "profiles") {
        const id = filters.find(([key]) => key === "id")?.[1] ?? targetId;
        return { data: options.member === false ? null : { id, email: options.profileEmail ?? (id === callerId ? ownAddress : privateAddress), first_name: "Prénom en base" }, error: options.recipientError ? { message: "private recipient error" } : null };
      }
      if (table === "email_deferred_queue") {
        const self = ["sit-confirmed", "listing-unpublished-feedback"].includes(activeTemplate);
        return { data: options.deferredSource ? {
          template_name: activeTemplate, recipient_email: self ? ownAddress : privateAddress,
          idempotency_key: activeQueueKey, status: "processing", attempts: 1, first_enqueued_at: new Date().toISOString(),
          template_data: { ...activeTemplateData, ...(options.legacyOrigin ? {} : { [deferredAuthorization.EMAIL_ORIGIN_FIELD]: options.trustedOrigin ? { version: 1, kind: "trusted" } : { version: 1, kind: "member", callerId, recipientId: self ? callerId : targetId, eventKey: activeEventKey } }) },
        } : null, error: options.queueReadError ? { message: "private queue error" } : null };
      }
      if (table === "suppressed_emails") return { data: null, error: null };
      if (table === "email_unsubscribe_tokens") return { data: { token: "fixture-token", used_at: null }, error: null };
      throw new Error(`Unexpected table read ${table}`);
    };
    chain.single = async () => ({ data: options.pendingError ? null : { id: "fixture-log" }, error: options.pendingError ? { message: "pending log unavailable" } : null });
    chain.then = (callback: (value: unknown) => unknown) => Promise.resolve(table in eventRows ? eventResult() : { data: null, error: null }).then(callback);
    return chain;
  });
  const createClient = vi.fn(() => ({ auth: { getUser }, rpc, from }));
  const resendFetch = vi.fn(async () => {
    if (options.providerThrow) throw new Error("Unknown provider outcome");
    return new Response(JSON.stringify(options.provider === "success"
      ? (options.providerMissingId ? {} : { id: "fixture-resend" }) : { message: `Rejected recipient ${privateAddress}` }),
      { status: options.providerStatus ?? (options.provider === "success" ? 200 : 422) });
  });
  const template = { component: () => null, subject: "Fixture" };
  const registrySource = readFileSync(resolve("supabase/functions/_shared/transactional-email-templates/registry.ts"), "utf8");
  const templateNames = Array.from(registrySource.matchAll(/^  '([^']+)':/gm), (match) => match[1]);
  const TEMPLATES = {
    ...Object.fromEntries(templateNames.map((name) => [name, template])),
    "fixture-future-server-template": template,
    "contact-reply": { ...template, to: ownAddress },
  };
  const env = { SUPABASE_URL: "https://fixture.invalid", SUPABASE_SERVICE_ROLE_KEY: serviceKey, RESEND_API_KEY: "fixture-resend-key" };
  const source = readFileSync(resolve("supabase/functions/send-transactional-email/index.ts"), "utf8");
  const { outputText } = ts.transpileModule(source, {
    compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS },
  });
  runInNewContext(outputText, {
    exports: {}, Request, Response, URL, Date, Error,
    crypto: { randomUUID: () => "fixture-message" },
    console: { log: vi.fn(), warn: vi.fn(), error: vi.fn() },
    fetch: () => { throw new Error("Unexpected network call"); },
    Deno: { env: { get: (key: keyof typeof env) => env[key] }, serve: (cb: typeof handler) => { handler = cb; } },
    require: (specifier: string) => {
      if (specifier.includes("member-email-send-claim")) return memberClaim;
      if (specifier.includes("deferred-member-email-authorization")) return deferredAuthorization;
      if (specifier.includes("sit-event-email-authorization")) return sitEventAuthorization;
      if (specifier.includes("application-email-authorization")) return applicationAuthorization;
      if (specifier.includes("supabase-js")) return { createClient };
      if (specifier.includes("registry")) return { TEMPLATES };
      if (specifier.includes("email-categories")) return { getEmailCategory: () => "transactional" };
      if (specifier.includes("email-suppression")) return { bypassesSuppression: () => false };
      if (specifier.includes("sit-alert-guard")) return { isSitStatusGuardedTemplate: () => false };
      if (specifier.includes("email-cap")) return { BYPASS_TEMPLATES: new Set(options.defer ? [] : memberTemplates), NEARBY_SIT_ALERT_TEMPLATES: new Set(),
        decideDeferral: () => ({ action: "defer", reason: "daily_cap", scheduledFor: new Date(Date.now() + 3600000) }),
        resolveDeferral: () => ({ action: "defer" }),
      };
      if (specifier.includes("resend-guard")) return { resendFetch };
      if (specifier.includes("email-link-wrap")) return { wrapEmailLink: (href: string) => href };
      if (specifier.includes("sender-address")) return { REPLY_TO_ADDRESS: "reply@fixture.test" };
      if (specifier.includes("@react-email")) return { render: () => "<body>Fixture</body>" };
      if (specifier.startsWith("npm:react@")) return { createElement };
      throw new Error(`Unexpected import ${specifier}`);
    },
  });
  return {
    getUser, rpc, createClient, queriedRecipients, writes, resendFetch, templateNames, createElement, recipientPatterns,
    invoke: (token: string | null = "member-session", recipient = reference, templateName = "application-accepted", extra: Record<string, unknown> = {}) => {
      activeTemplate = templateName;
      const keys: Record<string, string> = {
        "sit-confirmed": `sit-confirmed-${sitId}`,
        "sit-invitation": `sit-invite-${sitId}-${targetId}`,
        "review-received": `review-received-${sitId}-${targetId}`,
        "cancellation-by-owner": `cancellation-by-owner-${sitId}-${callerId}`,
        "cancellation-by-sitter": `cancellation-by-sitter-${sitId}-${callerId}`,
        "help-during-sit": `help-urgence-${sitId}-1790000000000`,
        "listing-unpublished-feedback": `unpublished-feedback-${sitId}-2026-09-20`,
      };
      const key = keys[templateName] ?? `app-${templateName === "application-declined" ? "declined" : "accepted"}-${appId}`;
      const templateData = templateName === "help-during-sit" ? { category: "urgence", messageExcerpt: "Message en base", conversationHref: `https://guardiens.fr/messages/${convId}` } : {};

      activeEventKey = key;
      activeQueueKey = templateName === "help-during-sit" ? `help-urgence-message-${eventId}` : key;
      activeTemplateData = templateData;
      return handler(new Request("https://fixture.invalid", {
      method: "POST", headers: token ? { authorization: `Bearer ${token}` } : {},
      body: JSON.stringify({ templateName, recipientEmail: recipient, idempotencyKey: key, templateData, ...extra }),
    })); },
    options: () => handler(new Request("https://fixture.invalid", { method: "OPTIONS" })),
  };
}

describe("notification recipient privacy", () => {
  it.each([null, "anon-key", forgedJwt])("rejects invalid caller %s before address resolution", async (token) => {
    const h = harness();
    expect((await h.invoke(token)).status).toBe(401);
    expect(h.rpc).not.toHaveBeenCalled();
    expect(h.writes).toEqual([]);
    expect(h.resendFetch).not.toHaveBeenCalled();
  });
  it.each(["member", "admin", "service"])("resolves reference server-side for %s", async (kind) => {
    const h = harness({ admin: kind === "admin" });
    await expect(h.invoke(kind === "service" ? serviceKey : "member-session")).rejects.toBe(boundary);
    expect(h.rpc).toHaveBeenCalledWith("get_user_email_for_notification", { target_user_id: targetId });
    expect(h.getUser).toHaveBeenCalledTimes(kind === "service" ? 0 : 1);
    expect(h.queriedRecipients).toEqual([privateAddress]);
    expect(h.writes).toEqual([]);
  });
  it("preserves direct email callers without a resolution RPC", async () => {
    const h = harness();
    await expect(h.invoke("member-session", privateAddress)).rejects.toBe(boundary);
    expect(h.rpc.mock.calls.map(([name]) => name)).toEqual(["has_role"]);
    expect(h.queriedRecipients).toEqual([privateAddress]);
  });
  it("preserves fixed template recipient precedence", async () => {
    const h = harness({ admin: true });
    await expect(h.invoke("member-session", reference, "contact-reply")).rejects.toBe(boundary);
    expect(h.rpc.mock.calls.map(([name]) => name)).toEqual(["has_role"]);
    expect(h.queriedRecipients).toEqual([ownAddress]);
  });
  it("refuses sensitive templates for ordinary members", async () => {
    const h = harness();
    const response = await h.invoke("member-session", reference, "identity-verified");
    expect(response.status).toBe(403);
    expect(await response.text()).not.toContain(privateAddress);
    expect(h.writes).toEqual([]);
  });
  it.each(["admin", "service"])("preserves sensitive template access for %s", async (kind) => {
    const h = harness({ admin: kind === "admin" });
    await expect(h.invoke(kind === "service" ? serviceKey : "member-session", reference, "identity-verified")).rejects.toBe(boundary);
  });
  it("still refuses a non-member resolved recipient", async () => {
    const h = harness({ member: false });
    expect((await h.invoke()).status).toBe(403);
    expect(h.writes).toEqual([]);
  });
  it.each([
    [null, false, 400], ["", false, 400], [privateAddress, true, 500],
  ] as const)("fails safely for unavailable resolution %s / %s", async (address, resolutionError, status) => {
    const h = harness({ address, resolutionError });
    const response = await h.invoke();
    expect(response.status).toBe(status);
    expect(await response.json()).toEqual({ error: "Recipient unavailable" });
    expect(h.writes).toEqual([]);
    expect(h.resendFetch).not.toHaveBeenCalled();
  });
  it("keeps CORS preflight free of DB calls", async () => {
    const h = harness();
    expect((await h.options()).status).toBe(200);
    expect(h.createClient).not.toHaveBeenCalled();
  });
  it.each(["success", "error"] as const)("uses real address only server-side on provider %s", async (provider) => {
    const h = harness({ provider });
    const response = await h.invoke();
    expect(response.status).toBe(provider === "success" ? 200 : 422);
    expect(h.resendFetch).toHaveBeenCalledTimes(1);
    const providerArgs = h.resendFetch.mock.calls[0] as unknown as [string, { body: string }];
    expect(JSON.parse(providerArgs[1].body).to).toEqual([privateAddress]);
    const body = await response.text();
    expect(body).not.toContain(privateAddress);
    expect(body).not.toContain(reference);
    if (provider === "error") expect(JSON.parse(body).details).toBeNull();
  });
});


// Current browser callsites, including both cancellation templates selected at runtime.
const memberTemplates = [
  "application-accepted", "application-declined", "sit-confirmed",
  "cancellation-by-owner", "cancellation-by-sitter", "sit-invitation",
  "review-received", "help-during-sit", "listing-unpublished-feedback",
];

describe("transactional sender template and worker authorization", () => {
  it.each(["identity-verified", "subscription-expired", "contact-reply", "admin-signals-digest", "new-message", "account-deleted", "fixture-future-server-template"])("refuses server template %s even to self", async (templateName) => {
    const h = harness();
    const response = await h.invoke("member-session", ownAddress, templateName);
    expect(response.status).toBe(403);
    expect(h.queriedRecipients).toEqual([]);
    expect(h.writes).toEqual([]);
    expect(h.resendFetch).not.toHaveBeenCalled();
    expect(await response.text()).not.toContain(ownAddress);
  });

  it("refuses every registered non-member template to another member", async () => {
    const h = harness();
    const restricted = h.templateNames.filter((name) => !memberTemplates.includes(name));
    expect(restricted.length).toBeGreaterThan(70);
    for (const templateName of restricted) {
      const response = await h.invoke("member-session", privateAddress, templateName);
      expect(response.status, templateName).toBe(403);
    }
    expect(h.queriedRecipients).toEqual([]);
    expect(h.writes).toEqual([]);
    expect(h.resendFetch).not.toHaveBeenCalled();
  });

  it.each(memberTemplates)("preserves the existing member template %s", async (templateName) => {
    const h = harness();
    await expect(h.invoke("member-session", ["sit-confirmed", "listing-unpublished-feedback"].includes(templateName) ? ownAddress : reference, templateName)).rejects.toBe(boundary);
    expect(h.queriedRecipients).toEqual([["sit-confirmed", "listing-unpublished-feedback"].includes(templateName) ? ownAddress : privateAddress]);
    expect(h.writes).toEqual([]);
  });

  it.each(["admin", "service"])("preserves all registered templates for %s", async (kind) => {
    const h = harness({ admin: kind === "admin" });
    for (const templateName of h.templateNames) {
      await expect(h.invoke(kind === "service" ? serviceKey : "member-session", privateAddress, templateName), templateName).rejects.toBe(boundary);
    }
    expect(h.writes).toEqual([]);
    expect(h.resendFetch).not.toHaveBeenCalled();
  });

  it("does not grant admin access on a role lookup error", async () => {
    const h = harness({ admin: true, roleError: true });
    expect((await h.invoke("member-session", ownAddress, "identity-verified")).status).toBe(403);
    expect(h.writes).toEqual([]);
  });

  it.each([
    { sourceQueueId: queueId },
    { source_queue_id: queueId },
    { logMetadata: { idempotency_key: "forged-key", bypass: true } },
  ])("reserves worker fields %j to service role", async (extra) => {
    for (const admin of [false, true]) {
      const h = harness({ admin });
      const response = await h.invoke("member-session", privateAddress, "application-accepted", extra);
      expect(response.status).toBe(403);
      expect(h.queriedRecipients).toEqual([]);
      expect(h.writes).toEqual([]);
      expect(h.resendFetch).not.toHaveBeenCalled();
    }
    const h = harness({ deferredSource: true, trustedOrigin: true });
    await expect(h.invoke(serviceKey, privateAddress, "application-accepted", extra)).rejects.toBe(boundary);
  });

  it("accepts harmless empty optional worker fields from a member", async () => {
    const h = harness();
    await expect(h.invoke("member-session", privateAddress, "application-accepted", {
      sourceQueueId: "", source_queue_id: "", logMetadata: {},
    })).rejects.toBe(boundary);
  });
});


describe("application event authorization in the actual sender", () => {
  it.each([
    { foreignOwner: true }, { applicationStatus: "pending" }, { applicationStatus: "rejected" },
  ])("blocks an unrelated or unaccepted application %j before business writes", async (options) => {
    const h = harness(options);
    expect((await h.invoke()).status).toBe(403);
    expect(h.writes).toEqual([]);
    expect(h.resendFetch).not.toHaveBeenCalled();
  });
  it("cannot notify the owner instead of the accepted sitter", async () => {
    const h = harness();
    expect((await h.invoke("member-session", ownAddress)).status).toBe(403);
    expect(h.writes).toEqual([]);
  });
  it("rejects a random deduplication key instead of trusting the supplied event content", async () => {
    const h = harness();
    expect((await h.invoke("member-session", reference, "application-accepted", { idempotencyKey: "random", templateData: { sitId } })).status).toBe(403);
    expect(h.writes).toEqual([]);
  });
  it("fails closed on an event read error without leaking DB details", async () => {
    const h = harness({ eventReadError: true });
    const response = await h.invoke();
    expect(response.status).toBe(503);
    expect(await response.text()).not.toContain("private DB error");
    expect(h.writes).toEqual([]);
    expect(h.resendFetch).not.toHaveBeenCalled();
  });
  it("replaces forged event content and writes a canonical key", async () => {
    const h = harness({ provider: "success" });
    const response = await h.invoke("member-session", reference, "application-accepted", {
      idempotencyKey: `app-accepted-conv-${convId}-${targetId}`,
      templateData: { sitTitle: "FORGED", ownerFirstName: "FORGED", isUrgent: true, deepLinkUrl: "https://fixture.invalid/forged" },
    });
    expect(response.status).toBe(200);
    expect(h.createElement).toHaveBeenCalledWith(expect.anything(), { sitTitle: "Titre en base", ownerFirstName: "Prénom en base" });
    expect(h.writes).toContainEqual(expect.objectContaining({ table: "email_send_log", method: "insert", values: expect.objectContaining({ metadata: expect.objectContaining({ idempotency_key: `app-accepted-${appId}` }) }) }));
  });
  it("recognizes a previously sent legacy conversation key", async () => {
    const h = harness({ duplicateKey: `app-accepted-conv-${convId}-${targetId}` });
    const response = await h.invoke();
    expect(await response.json()).toMatchObject({ success: true, skipped: true, reason: "duplicate_idempotency_key" });
    expect(h.resendFetch).not.toHaveBeenCalled();
    expect(h.writes.every((entry: any) => entry.table === "email_idempotency_hits")).toBe(true);
  });
});


describe("application sender unavailable verification", () => {
  it.each([{ idempotencyError: true }, { recipientError: true }])("refuses unavailable checks %j without sending", async (options) => {
    const h = harness(options);
    const response = await h.invoke();
    expect(response.status).toBe(503);
    expect(await response.text()).not.toContain("private");
    expect(h.writes).toEqual([]);
    expect(h.resendFetch).not.toHaveBeenCalled();
  });
});


describe("recipient address binding", () => {
  it.each(["private%@fixture.test", "priv_te@fixture.test"])("does not confuse the SQL pattern %s with a member address", async (recipient) => {
    const h = harness();
    expect((await h.invoke("member-session", recipient)).status).toBe(403);
    expect(h.writes).toEqual([]);
    expect(h.resendFetch).not.toHaveBeenCalled();
  });
});


describe("application recipient normalization", () => {
  it("uses a canonical recipient even when the request capitalizes it", async () => {
    const h = harness({ duplicateKey: `app-accepted-conv-${convId}-${targetId}` });
    const response = await h.invoke("member-session", privateAddress.toUpperCase());
    expect(await response.json()).toMatchObject({ skipped: true, reason: "duplicate_idempotency_key" });
    expect(h.queriedRecipients).toEqual([privateAddress]);
  });
  it.each(["private_name@fixture.test", "private%name@fixture.test"])("preserves a real member's literal address %s", async (recipient) => {
    const h = harness({ profileEmail: recipient });
    await expect(h.invoke("member-session", recipient)).rejects.toBe(boundary);
    const escaped = recipient.replace(/[%_]/g, (character) => String.fromCharCode(92) + character);
    expect(h.recipientPatterns).toEqual([escaped]);
    expect(h.queriedRecipients).toEqual([escaped]);
  });
});


const sitEventTemplates = ["sit-invitation", "review-received", "cancellation-by-owner", "cancellation-by-sitter", "help-during-sit", "listing-unpublished-feedback"];
describe("six event checks in the real sender", () => {
  it.each(sitEventTemplates)("refuses a %s request without the real event", async (templateName) => {
    const h = harness({ missingEvent: true });
    const response = await h.invoke("member-session", templateName === "listing-unpublished-feedback" ? ownAddress : reference, templateName);
    expect(response.status).toBe(403);
    // Seule la trace d'observabilité est écrite, jamais un envoi ni un journal métier.
    expect(h.writes.map((w: any) => w.table)).toEqual(["error_logs"]);
    expect(h.resendFetch).not.toHaveBeenCalled();
  });
  it.each(sitEventTemplates)("fails closed on a %s event read failure", async (templateName) => {
    const h = harness({ eventReadError: true });
    const response = await h.invoke("member-session", templateName === "listing-unpublished-feedback" ? ownAddress : reference, templateName);
    expect(response.status).toBe(503);
    expect(h.writes.map((w: any) => w.table)).toEqual(["error_logs"]);
    expect(h.resendFetch).not.toHaveBeenCalled();
  });
  it("removes forged invitation content before rendering", async () => {
    const h = harness({ provider: "success" });
    const response = await h.invoke("member-session", reference, "sit-invitation", { templateData: { message: "FORGED", ownerFirstName: "FORGED", sitId: "FORGED", isUrgent: true } });
    expect(response.status).toBe(200);
    expect(h.createElement).toHaveBeenCalled();
    expect(JSON.stringify(h.createElement.mock.calls)).not.toContain("FORGED");
    expect(h.createElement).toHaveBeenCalledWith(expect.anything(), expect.objectContaining({ message: "Invitation en base", sitId }));
  });
  it("canonicalizes the urgency timestamp to the persisted message ID", async () => {
    const h = harness({ provider: "success" });
    expect((await h.invoke("member-session", reference, "help-during-sit")).status).toBe(200);
    expect(h.writes).toContainEqual(expect.objectContaining({ table: "email_send_log", method: "insert", values: expect.objectContaining({ metadata: expect.objectContaining({ idempotency_key: `help-urgence-message-${eventId}` }) }) }));
  });
});


function deferredRequest(name: string) {
  return { sourceQueueId: queueId, ...(name === "help-during-sit" ? { idempotencyKey: `help-urgence-message-${eventId}` } : {}) };
}
function recipientFor(name: string) { return ["sit-confirmed", "listing-unpublished-feedback"].includes(name) ? ownAddress : privateAddress; }
describe("deferred member authorization in the actual sender", () => {
  it.each(memberTemplates)("revalidates the legitimate %s before sending", async name => {
    const h = harness({ deferredSource: true, provider: "success" });
    const response = await h.invoke(serviceKey, recipientFor(name), name, { ...deferredRequest(name), templateData: { sitTitle: "FORGED QUEUE REQUEST", __urgent: true } });
    expect(response.status).toBe(200);
    expect(h.resendFetch).toHaveBeenCalledTimes(1);
    expect(JSON.stringify(h.createElement.mock.calls)).not.toContain("FORGED QUEUE REQUEST");
    expect(JSON.stringify(h.createElement.mock.calls)).not.toContain(deferredAuthorization.EMAIL_ORIGIN_FIELD);
    expect(h.createElement).toHaveBeenCalledWith(expect.anything(), expect.objectContaining({ sitTitle: "Titre en base" }));
  });
  it.each(memberTemplates)("cancels a legacy %s without trusted provenance", async name => {
    const h = harness({ deferredSource: true, legacyOrigin: true, provider: "success" });
    const response = await h.invoke(serviceKey, recipientFor(name), name, deferredRequest(name));
    expect(await response.json()).toMatchObject({ success: false, cancelled: true, reason: "event_no_longer_authorized" });
    expect(h.writes).toEqual([]); expect(h.resendFetch).not.toHaveBeenCalled();
  });
  it.each(memberTemplates)("retries %s after an unavailable event read", async name => {
    const h = harness({ deferredSource: true, eventReadError: true, provider: "success" });
    const response = await h.invoke(serviceKey, recipientFor(name), name, deferredRequest(name));
    expect(response.status).toBe(503);
    expect(h.writes).toEqual([]); expect(h.resendFetch).not.toHaveBeenCalled();
  });
  it("cancels an accepted application that became withdrawn", async () => {
    const h = harness({ deferredSource: true, applicationStatus: "withdrawn", provider: "success" });
    const response = await h.invoke(serviceKey, privateAddress, "application-accepted", deferredRequest("application-accepted"));
    expect(await response.json()).toMatchObject({ cancelled: true });
    expect(h.writes).toEqual([]); expect(h.resendFetch).not.toHaveBeenCalled();
  });
  it("does not turn a queue read failure into permanent cancellation", async () => {
    const h = harness({ deferredSource: true, queueReadError: true, provider: "success" });
    expect((await h.invoke(serviceKey, privateAddress, "application-accepted", deferredRequest("application-accepted"))).status).toBe(503);
    expect(h.writes).toEqual([]); expect(h.resendFetch).not.toHaveBeenCalled();
  });
  it("preserves trusted original caller privileges without trusting the retry payload", async () => {
    const h = harness({ deferredSource: true, trustedOrigin: true, missingEvent: true, provider: "success" });
    const response = await h.invoke(serviceKey, privateAddress, "sit-invitation", { ...deferredRequest("sit-invitation"), templateData: { message: "FORGED QUEUE REQUEST" } });
    expect(response.status).toBe(200); expect(h.resendFetch).toHaveBeenCalledTimes(1);
    expect(JSON.stringify(h.createElement.mock.calls)).not.toContain("FORGED QUEUE REQUEST");
  });
  it.each(["member", "admin", "service"])("records server-computed provenance on initial %s deferral", async kind => {
    const h = harness({ defer: true, provider: "success", admin: kind === "admin" });
    const response = await h.invoke(kind === "service" ? serviceKey : "member-session", privateAddress, "sit-invitation", {
      templateData: { [deferredAuthorization.EMAIL_ORIGIN_FIELD]: { version: 1, kind: "trusted" }, message: "Server or member input" },
    });
    expect(await response.json()).toMatchObject({ deferred: true });
    expect(h.resendFetch).not.toHaveBeenCalled();
    expect(h.writes).toContainEqual(expect.objectContaining({ table: "email_deferred_queue", method: "insert", values: expect.objectContaining({ template_data: expect.objectContaining({
      [deferredAuthorization.EMAIL_ORIGIN_FIELD]: kind === "member"
        ? { version: 1, kind: "member", callerId, recipientId: targetId, eventKey: `sit-invite-${sitId}-${targetId}` }
        : { version: 1, kind: "trusted" },
    }) }) }));
  });
  it("preserves provenance and refreshed data when re-deferred", async () => {
    const h = harness({ deferredSource: true, defer: true, provider: "success" });
    expect(await (await h.invoke(serviceKey, privateAddress, "sit-invitation", deferredRequest("sit-invitation"))).json()).toMatchObject({ deferred: true });
    expect(h.resendFetch).not.toHaveBeenCalled();
    expect(h.writes).toContainEqual(expect.objectContaining({ table: "email_deferred_queue", method: "update", values: expect.objectContaining({ template_data: expect.objectContaining({
      sitTitle: "Titre en base", [deferredAuthorization.EMAIL_ORIGIN_FIELD]: { version: 1, kind: "member", callerId, recipientId: targetId, eventKey: `sit-invite-${sitId}-${targetId}` },
    }) }) }));
  });
  it("strips caller-supplied origin even from a direct trusted rendering", async () => {
    const h = harness({ provider: "success" });
    await h.invoke(serviceKey, privateAddress, "sit-invitation", { templateData: { [deferredAuthorization.EMAIL_ORIGIN_FIELD]: { version: 1, kind: "trusted" } } });
    expect(JSON.stringify(h.createElement.mock.calls)).not.toContain(deferredAuthorization.EMAIL_ORIGIN_FIELD);
  });
});


function claimLedger() {
  const state = new Map<string, { token: unknown; outcome: string }>();
  const rpc = vi.fn(async (name: string, args: Record<string, unknown>) => {
    const key = String(args.p_claim_key); const current = state.get(key);
    if (name.startsWith("acquire_")) {
      if (!current || current.outcome === "retryable") {
        state.set(key, { token: args.p_owner_token, outcome: "sending" });
        return { data: "acquired", error: null };
      }
      return { data: current.outcome === "sent" ? "sent" : current.outcome === "uncertain" ? "uncertain" : "busy", error: null };
    }
    if (current?.token !== args.p_owner_token || current?.outcome !== "sending") return { data: false, error: null };
    current.outcome = String(args.p_outcome); return { data: true, error: null };
  });
  return { state, rpc };
}
describe("atomic provider submission ownership in the actual sender", () => {
  it("submits once across simultaneous requests even when both duplicate reads return empty", async () => {
    const ledger = claimLedger();
    const a = harness({ provider: "success", claimRpc: ledger.rpc });
    const b = harness({ provider: "success", claimRpc: ledger.rpc });
    const responses = await Promise.all([a.invoke(), b.invoke()]);
    expect(a.resendFetch.mock.calls.length + b.resendFetch.mock.calls.length).toBe(1);
    const bodies = await Promise.all(responses.map(r => r.json()));
    expect(bodies.filter(b => b.sent === true)).toHaveLength(1);
    expect([...ledger.state.values()].map(x => x.outcome)).toEqual(["sent"]);
  });
  it.each(["busy", "uncertain", "unavailable"])("does not send when reservation is %s", async state => {
    const h = harness({ provider: "success", claimRpc: async () => ({ data: state === "unavailable" ? null : state, error: state === "unavailable" ? {} : null }) });
    expect((await h.invoke()).status).toBe(503);
    expect(h.resendFetch).not.toHaveBeenCalled();
    expect(h.writes.filter((w: any) => w.table === "email_send_log" && w.values.status === "pending")).toEqual([]);
  });
  it("recognizes the completed reservation even when send-log reads return empty", async () => {
    const h = harness({ provider: "success", claimRpc: async () => ({ data: "sent", error: null }) });
    expect(await (await h.invoke()).json()).toMatchObject({ skipped: true, reason: "duplicate_idempotency_key" });
    expect(h.resendFetch).not.toHaveBeenCalled();
  });
  it("releases a definite provider rejection for a later legitimate retry", async () => {
    const ledger = claimLedger(); const first = harness({ provider: "error", claimRpc: ledger.rpc });
    expect((await first.invoke()).status).toBe(422);
    expect([...ledger.state.values()][0].outcome).toBe("retryable");
    const retry = harness({ provider: "success", claimRpc: ledger.rpc });
    expect(await (await retry.invoke()).json()).toMatchObject({ sent: true });
    expect(retry.resendFetch).toHaveBeenCalledTimes(1);
  });
  it.each(["network", "5xx", "malformed"])("blocks replay after an ambiguous %s outcome", async outcome => {
    const ledger = claimLedger(); const first = harness({ provider: "success", claimRpc: ledger.rpc,
      providerThrow: outcome === "network", providerStatus: outcome === "5xx" ? 500 : 200, providerMissingId: outcome === "malformed" });
    const response = await first.invoke(); expect(response.status).toBeGreaterThanOrEqual(500);
    expect([...ledger.state.values()][0].outcome).toBe("uncertain");
    const retry = harness({ provider: "success", claimRpc: ledger.rpc });
    expect((await retry.invoke()).status).toBe(503); expect(retry.resendFetch).not.toHaveBeenCalled();
  });
  it("does not call the provider without a durable pending log and releases the unsent reservation", async () => {
    const ledger = claimLedger(); const h = harness({ provider: "success", claimRpc: ledger.rpc, pendingError: true });
    expect((await h.invoke()).status).toBe(503); expect(h.resendFetch).not.toHaveBeenCalled();
    expect([...ledger.state.values()][0].outcome).toBe("retryable");
  });
  it("preserves the direct trusted path outside member-origin reservations", async () => {
    const ledger = claimLedger(); const h = harness({ provider: "success", claimRpc: ledger.rpc });
    expect((await h.invoke(serviceKey)).status).toBe(200);
    expect(ledger.rpc).not.toHaveBeenCalled();
  });
});


describe("claim recovery boundaries", () => {
  it("does not report an existing pending attempt as a successful duplicate", async () => {
    const h = harness({ provider: "success", duplicateKey: `app-accepted-${appId}`, duplicateStatus: "pending" });
    expect((await h.invoke()).status).toBe(503); expect(h.resendFetch).not.toHaveBeenCalled();
  });
  it("keeps a confirmed historical send deduplicated", async () => {
    const h = harness({ provider: "success", duplicateKey: `app-accepted-${appId}`, duplicateStatus: "sent" });
    expect(await (await h.invoke()).json()).toMatchObject({ skipped: true, reason: "duplicate_idempotency_key" });
    expect(h.resendFetch).not.toHaveBeenCalled();
  });
  it("keeps the reservation held when finalization fails after provider success", async () => {
    const ledger = claimLedger();
    const claimRpc = async (name: string, args: Record<string, unknown>) => name.startsWith("finish_") ? { data: false, error: {} } : ledger.rpc(name, args);
    const first = harness({ provider: "success", claimRpc });
    expect(await (await first.invoke()).json()).toMatchObject({ sent: true });
    const retry = harness({ provider: "success", claimRpc });
    expect((await retry.invoke()).status).toBe(503); expect(retry.resendFetch).not.toHaveBeenCalled();
  });
});

// Point 2 du lot observabilité : un refus d'autorisation laissait le serveur
// muet. Il écrit désormais une occurrence agrégeable, sans adresse email.
describe("authorization refusal trace", () => {
  it("logs a refused application email with a stable fingerprint and no address", async () => {
    const h = harness({ missingEvent: true, applicationStatus: "pending" });
    const response = await h.invoke("member-session", reference, "application-accepted");
    expect(response.status).toBe(403);
    const traces = h.writes.filter((w: any) => w.table === "error_logs");
    expect(traces).toHaveLength(1);
    const row = (traces[0] as any).values;
    expect(row.source).toBe("send-transactional-email/authorization");
    expect(row.severity).toBe("warning");
    expect(row.fingerprint).toBe("send-transactional-email/authorization:application-accepted:event_not_authorized");
    expect(row.context).toMatchObject({ template: "application-accepted", status: 403, reason: "event_not_authorized", entity_id: appId });
    const serialized = JSON.stringify(row);
    expect(serialized).not.toContain(privateAddress);
    expect(serialized).not.toContain(ownAddress);
    expect(h.resendFetch).not.toHaveBeenCalled();
  });
  it("separates an unavailable read from a refusal in the fingerprint", async () => {
    const h = harness({ eventReadError: true });
    const response = await h.invoke("member-session", reference, "review-received");
    expect(response.status).toBe(503);
    const row = (h.writes.filter((w: any) => w.table === "error_logs")[0] as any).values;
    expect(row.fingerprint).toBe("send-transactional-email/authorization:review-received:authorization_read_unavailable");
    expect(row.context.status).toBe(503);
  });
});
