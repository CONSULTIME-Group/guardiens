/**
 * Lot Z2, audit C-19 (13/10/2026) : « mission_response_submitted_from_modal »
 * n'est compté que pour une réponse enregistrée (23 envois comptés pour 14
 * ouvertures de la fenêtre en 60 jours, échecs compris).
 */
import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";

const SRC = readFileSync("src/pages/SmallMissionDetail.tsx", "utf8");

function handleRespondBody(): string {
  const start = SRC.indexOf("const handleRespond = async");
  const end = SRC.indexOf("// Ouvre la conversation liée à la réponse", start);
  expect(start).toBeGreaterThan(0);
  expect(end).toBeGreaterThan(start);
  return SRC.slice(start, end);
}

describe("C-19, issue de l'envoi", () => {
  it("handleRespond renvoie true après l'enregistrement, false sinon", () => {
    const body = handleRespondBody();
    expect(body).toContain("Promise<boolean>");
    expect(body).toContain("if (!user || !id || submitting) return false;");
    expect(body.match(/return true;/g)?.length).toBe(1);
    expect(body).not.toMatch(/\breturn;\s/);
    expect(body.trimEnd()).toMatch(/return false;\s*};$/);
  });

  it("le succès se lit après l'issue « sent » seulement", () => {
    const body = handleRespondBody();
    expect(body.indexOf("return true;")).toBeGreaterThan(body.indexOf('title: "Réponse envoyée !"'));
  });

  it("la fenêtre de réponse ne mesure que les envois réussis", () => {
    expect(SRC).toMatch(
      /const sent = await handleRespond\(msg\);\s+if \(sent\) \{\s+trackEvent\("mission_response_submitted_from_modal"/,
    );
  });
});
