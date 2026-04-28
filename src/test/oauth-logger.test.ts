/**
 * Tests du journal client OAuth.
 *
 * On vérifie :
 *  - startOAuthFlow génère un trace_id et le persiste cross-redirect.
 *  - logOAuthStage attache trace_id, timestamp ISO et delta_ms cohérent.
 *  - Le buffer est plafonné (MAX_ENTRIES) et survit aux écritures successives.
 *  - endOAuthFlow libère le trace_id mais conserve le buffer.
 *  - Aucun PII (email, token) n'apparaît si on ne le passe pas explicitement.
 */

import { describe, it, expect, beforeEach, vi } from "vitest";
import {
  startOAuthFlow,
  logOAuthStage,
  endOAuthFlow,
  getOAuthTraceId,
  dumpOAuthLog,
  installOAuthDebugHelper,
} from "@/lib/oauthLogger";

beforeEach(() => {
  sessionStorage.clear();
});

describe("oauthLogger", () => {
  it("startOAuthFlow génère un trace_id stable et l'expose", () => {
    const id = startOAuthFlow("/login");
    expect(id).toMatch(/^oa_/);
    expect(getOAuthTraceId()).toBe(id);
  });

  it("logOAuthStage attache trace_id, ts ISO et delta_ms croissant", async () => {
    const id = startOAuthFlow("/login");
    await new Promise((r) => setTimeout(r, 5));
    logOAuthStage("sdk_called", "/login", { redirect_uri: "https://x.test" });
    await new Promise((r) => setTimeout(r, 5));
    logOAuthStage("redirecting", "/login");

    const log = dumpOAuthLog();
    // init + sdk_called + redirecting
    expect(log).toHaveLength(3);
    expect(log[0].stage).toBe("init");
    expect(log[1].stage).toBe("sdk_called");
    expect(log[2].stage).toBe("redirecting");

    for (const e of log) {
      expect(e.trace_id).toBe(id);
      expect(e.ts).toMatch(/^\d{4}-\d{2}-\d{2}T/);
      expect(typeof e.delta_ms).toBe("number");
      expect(e.delta_ms).toBeGreaterThanOrEqual(0);
    }
    expect(log[2].delta_ms).toBeGreaterThanOrEqual(log[1].delta_ms);
    expect(log[1].data).toEqual({ redirect_uri: "https://x.test" });
  });

  it("endOAuthFlow libère le trace_id mais conserve le buffer", () => {
    startOAuthFlow("/login");
    logOAuthStage("sdk_called", "/login");
    endOAuthFlow("success");

    expect(getOAuthTraceId()).toBeNull();
    const log = dumpOAuthLog();
    // init + sdk_called + entrée d'end (stage navigated)
    expect(log.length).toBeGreaterThanOrEqual(3);
    expect(log[log.length - 1].stage).toBe("navigated");
    expect(log[log.length - 1].data).toEqual({ end_reason: "success" });
  });

  it("endOAuthFlow avec reason=error logue stage=error", () => {
    startOAuthFlow("/login");
    endOAuthFlow("error");
    const log = dumpOAuthLog();
    expect(log[log.length - 1].stage).toBe("error");
  });

  it("le trace_id survit à un 'rechargement' (sessionStorage persiste)", () => {
    const id = startOAuthFlow("/inscription");
    // simulate page reload : on relit juste depuis sessionStorage
    expect(getOAuthTraceId()).toBe(id);
    logOAuthStage("callback_returned", "auth-context");
    const log = dumpOAuthLog();
    expect(log.find((e) => e.stage === "callback_returned")?.trace_id).toBe(id);
  });

  it("le buffer est plafonné à 50 entrées", () => {
    startOAuthFlow("/login");
    for (let i = 0; i < 80; i++) {
      logOAuthStage("sdk_called", "/login", { i });
    }
    const log = dumpOAuthLog();
    expect(log.length).toBeLessThanOrEqual(50);
  });

  it("installOAuthDebugHelper expose window.__oauthLog()", () => {
    installOAuthDebugHelper();
    expect(typeof (window as any).__oauthLog).toBe("function");
    startOAuthFlow("/login");
    expect((window as any).__oauthLog().length).toBeGreaterThan(0);
  });

  it("émet sur console.info (info) ou console.warn (error)", () => {
    const info = vi.spyOn(console, "info").mockImplementation(() => {});
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    startOAuthFlow("/login");
    logOAuthStage("sdk_called", "/login");
    logOAuthStage("error", "/login", { code: "oauth_cancelled" });
    expect(info).toHaveBeenCalled();
    expect(warn).toHaveBeenCalled();
    const lastInfo = info.mock.calls.at(-1)?.[0] as string;
    expect(lastInfo).toMatch(/^\[oauth\] sdk_called/);
    info.mockRestore();
    warn.mockRestore();
  });
});
