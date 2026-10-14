/**
 * Lot A3 (audit Alma du 14/10/2026) : aucun test n'écrit en production.
 * 548 des 609 événements alma_conversation_message_sent en 30 jours venaient
 * des tests (src/test/lot-j2b-alma.test.ts, src/__tests__/alma-conversation.test.ts).
 *
 * Ce fichier ne pose AUCUN vi.mock("@/lib/analytics") : il vérifie que le mock
 * global de src/test/setup.ts s'applique bien à tout fichier de test.
 */
import { describe, expect, it, vi } from "vitest";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import * as analytics from "@/lib/analytics";
import { openAlmaConversation, resetAlmaConversation, sendAlmaMessage } from "@/lib/alma/conversation-store";

const read = (p: string) => readFileSync(p, "utf8");

function testFiles(dir: string, out: string[] = []): string[] {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) testFiles(p, out);
    else if (/\.(test|spec)\.(ts|tsx)$/.test(name)) out.push(p);
  }
  return out;
}

describe("A3, la mesure est un mock dans tous les tests", () => {
  it("trackEvent et ses variantes sont des mocks sans vi.mock local", () => {
    expect(vi.isMockFunction(analytics.trackEvent)).toBe(true);
    expect(vi.isMockFunction(analytics.trackEventBeacon)).toBe(true);
    expect(vi.isMockFunction(analytics.trackCtaClick)).toBe(true);
    expect(vi.isMockFunction(analytics.trackEventWithUserId)).toBe(true);
    expect(vi.isMockFunction(analytics.trackFirstAction)).toBe(true);
    // Les fonctions pures restent réelles.
    expect(analytics.mapSignupError("User already registered")).toBe("already_registered");
  });

  it("le fichier de setup de vitest pose le mock global", () => {
    expect(read("vitest.config.ts")).toContain('setupFiles: ["./src/test/setup.ts"]');
    expect(read("src/test/setup.ts")).toContain('vi.mock("@/lib/analytics"');
  });

  it("les deux fichiers fautifs portent aussi un mock explicite", () => {
    for (const f of ["src/test/lot-j2b-alma.test.ts", "src/__tests__/alma-conversation.test.ts"]) {
      expect(read(f), f).toContain('vi.mock("@/lib/analytics"');
    }
  });

  it("aucun test ne réimporte le vrai module de mesure", () => {
    const offenders = testFiles("src").filter((f) => {
      const s = read(f);
      return /importActual[^)]*["']@\/lib\/analytics["']/.test(s)
        || /(?:vi\.unmock|vi\.doUnmock)\(\s*["']@\/lib\/analytics["']/.test(s);
    });
    expect(offenders).toEqual([]);
  });
});

describe("A3, sendAlmaMessage n'émet aucun appel réseau de mesure", () => {
  it("l'envoi passe par le mock, aucune requête vers analytics_events", async () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch");
    const track = vi.mocked(analytics.trackEvent);
    track.mockClear();
    resetAlmaConversation();
    openAlmaConversation("Bonjour.");
    const invoke = vi.fn().mockResolvedValue({ data: { answer: "Réponse." }, error: null });
    await sendAlmaMessage({ text: "Question", surface: "owner_dashboard", activeRole: "owner", invoke: invoke as any });
    expect(track).toHaveBeenCalledWith("alma_conversation_message_sent", expect.objectContaining({
      metadata: expect.objectContaining({ surface: "owner_dashboard" }),
    }));
    expect(invoke).toHaveBeenCalledTimes(1);
    expect(fetchSpy).not.toHaveBeenCalled();
    fetchSpy.mockRestore();
  });
});

describe("A3, filet réseau : écriture vers Supabase refusée en test", () => {
  it("un POST vers analytics_events est refusé et noté", async () => {
    const url = `${import.meta.env.VITE_SUPABASE_URL || "https://exemple.supabase.co"}/rest/v1/analytics_events`;
    const log = (globalThis as any).__A3_BLOCKED_SUPABASE_WRITES__ as Array<{ method: string; url: string }>;
    const before = log.length;
    await expect(fetch(url, { method: "POST", body: "{}" })).rejects.toThrow(/Lot A3/);
    expect(log.length).toBe(before + 1);
    expect(log.at(-1)).toEqual({ method: "POST", url });
  });

  it("seules les sondes de src/integration passent, et aucune n'écrit une mesure", () => {
    expect(read("src/test/setup.ts")).toContain("/[\\\\/]src[\\\\/]integration[\\\\/]/.test(path)");
    for (const f of testFiles("src/integration")) {
      const s = read(f);
      expect(s, f).not.toContain("analytics_events");
      expect(s, f).not.toContain("@/lib/analytics");
      expect(s, f).not.toContain("functions/v1");
    }
  });

  it("un appel de fonction (POST) vers un projet Supabase est refusé aussi", async () => {
    await expect(fetch("https://abc.supabase.co/functions/v1/alma-chat", { method: "POST" })).rejects.toThrow(/Lot A3/);
  });
});
