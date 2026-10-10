import { describe, expect, it, vi } from "vitest";
vi.mock("@/integrations/supabase/client", () => ({ supabase: {} }));
import { errorViewStats, expectedRefusal, filterErrors, presentError, type ErrorRecord } from "./errorPresentation";

const fixture = (overrides: Partial<ErrorRecord> = {}): ErrorRecord => ({
  id: "one", user_id: null, user_email: null, message: "Incident", stack: null,
  source: "NetworkErrorMonitor", line_no: null, col_no: null, url: null, user_agent: null,
  severity: "error", context: {}, fingerprint: "one", occurrences: 1,
  first_seen_at: "2026-10-10T12:00:00Z", last_seen_at: "2026-10-10T12:00:00Z",
  resolved_at: null, resolved_by: null, admin_notes: null, created_at: "2026-10-10T12:00:00Z",
  ...overrides,
});

describe("Présentation admin des dossiers JS et réseau", () => {
  it("reconnaît seulement les deux refus attendus prouvés", () => {
    expect(expectedRefusal(fixture({ context: { pg_code: "P0001", pg_hint: "duplicate_small_mission" } }))).toContain("identique");
    expect(expectedRefusal(fixture({ context: { status: 410, url: "https://example.test/functions/v1/send-owner-activation-campaign", response_body: '{"retired":true}' } }))).toContain("retirée");
    expect(expectedRefusal(fixture({ context: { pg_code: "P0001", pg_hint: "another_refusal" } }))).toBeNull();
    expect(expectedRefusal(fixture({ context: { status: 410, url: "https://example.test/other", response_body: '{"retired":true}' } }))).toBeNull();
    expect(expectedRefusal(fixture({ context: { status: 410, url: "https://example.test/send-owner-activation-campaign", response_body: '{}' } }))).toBeNull();
  });

  it("masque les secrets historiques récursivement et neutralise le lien sans mutation", () => {
    const row = fixture({
      url: "https://example.test/go?code=old-sensitive-value",
      message: "Failure https://example.test/?access_token=old-sensitive-value",
      source: "https://example.test/?password=old-sensitive-value",
      stack: "https://example.test/#refresh_token=old-sensitive-value",
      context: { pg_code: "P0001", nested: [{ authorization: "old-sensitive-value", password: "old-sensitive-value", oauth_code: "old-sensitive-value" }], response_body: '{"token":"old-sensitive-value","code":"57014"}' },
    });
    const before = JSON.stringify(row);
    const safe = presentError(row);
    expect(JSON.stringify(safe)).not.toContain("old-sensitive-value");
    expect(safe.context.pg_code).toBe("P0001");
    expect(safe.context.response_body).toContain("57014");
    expect(safe.safeHref).toBeNull();
    expect(JSON.stringify(row)).toBe(before);
    expect(presentError(fixture({ url: "https://example.test/admin" })).safeHref).toBe("https://example.test/admin");
    expect(presentError(fixture({ url: "javascript:alert(1)" })).safeHref).toBeNull();
  });

  it("compte les mêmes neuf dossiers et treize occurrences dans les deux listes puis suit la recherche", () => {
    const rows = Array.from({ length: 9 }, (_, index) => presentError(fixture({
      id: String(index), source: index === 0 ? "app" : "NetworkErrorMonitor",
      occurrences: index < 4 ? 2 : 1, message: index < 4 ? "refus" : "incident",
      user_id: index < 2 ? "account" : null, user_email: index < 3 ? "person@example.test" : null,
    })));
    rows.push(presentError(fixture({ severity: "ignored_third_party" })));
    const filters = { state: "unresolved", severity: "all", period: "all" as const, search: "" };
    const view = filterErrors(rows, filters);
    expect(errorViewStats(view)).toMatchObject({ unresolved: 9, totalOcc: 13, app: 1, network: 8, affected: 1 });
    expect(errorViewStats(filterErrors(rows, { ...filters, search: "incident" })).unresolved).toBe(5);
    expect(filterErrors(rows, { ...filters, state: "resolved" })).toHaveLength(0);
    expect(filterErrors(rows, { ...filters, period: "24h" }, Date.parse("2026-10-12T12:00:00Z"))).toHaveLength(0);
  });
});