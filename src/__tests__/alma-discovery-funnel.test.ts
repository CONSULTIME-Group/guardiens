/**
 * Verrous N6 et N4 : les quatre évènements de l'entonnoir existent dans le
 * dock, la pilule d'entrée est présente, et l'envoi de message est mesuré.
 */
import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { ALMA_FUNNEL_STEPS } from "@/pages/admin/_components/alma/DiscoveryFunnelCard";

const dock = readFileSync("src/components/ai/alma/AlmaDock.tsx", "utf8");
const store = readFileSync("src/lib/alma/conversation-store.ts", "utf8");

describe("entonnoir de découvrabilité d'Alma", () => {
  it("le dock émet les quatre évènements", () => {
    for (const e of [
      "alma_dock_expanded",
      "alma_composer_seen",
      "alma_composer_focused",
      "alma_composer_typed",
    ]) {
      expect(dock).toContain(`trackEvent("${e}"`);
    }
  });

  it("le store mesure l'envoi du message", () => {
    expect(store).toContain('trackEvent("alma_conversation_message_sent"');
  });

  it("l'entonnoir admin liste les cinq étapes dans l'ordre", () => {
    expect(ALMA_FUNNEL_STEPS.map((s) => s.event)).toEqual([
      "alma_dock_expanded",
      "alma_composer_seen",
      "alma_composer_focused",
      "alma_composer_typed",
      "alma_conversation_message_sent",
    ]);
  });

  it("la pilule d'entrée est présente avec son libellé court", () => {
    expect(dock).toContain("Posez moi une question");
    expect(dock).toContain('data-testid="alma-ask-pill"');
    expect(dock).toContain(">Question<");
  });

  it("le compte à rebours est suspendu sans reprise au blur", () => {
    expect(dock).toContain("suspendAutoDismiss");
    expect(dock).toContain("if (suspendedRef.current) return;");
  });
});
