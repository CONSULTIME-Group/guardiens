/**
 * Lot Z2, audit C-21 (13/10/2026) : « Proposer mon aide » sur la page Entraide
 * ne confirme qu'une écriture réussie de profiles.available_for_help.
 */
import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";

const SRC = readFileSync("src/pages/EntraideHub.tsx", "utf8");

function goHelpBody(): string {
  const start = SRC.indexOf("const goHelp = async");
  const end = SRC.indexOf("const needState", start);
  expect(start).toBeGreaterThan(0);
  expect(end).toBeGreaterThan(start);
  return SRC.slice(start, end);
}

describe("C-21, confirmation après écriture", () => {
  it("l'erreur de l'écriture est lue", () => {
    expect(goHelpBody()).toContain(
      'const { error } = await supabase.from("profiles").update({ available_for_help: true }).eq("id", user.id);',
    );
  });

  it("en cas d'erreur : message d'échec, état et mesure inchangés", () => {
    const body = goHelpBody();
    const err = body.indexOf("if (error) {");
    const ret = body.indexOf("return;", err);
    expect(err).toBeGreaterThan(0);
    expect(body.indexOf("toast.error(", err)).toBeLessThan(ret);
    expect(body.indexOf("setProfile(")).toBeGreaterThan(ret);
    expect(body.indexOf("toast.success(")).toBeGreaterThan(ret);
    expect(body.indexOf('trackEvent("mission_can_help"')).toBeGreaterThan(ret);
  });

  it("message d'échec sans tiret", () => {
    const body = goHelpBody();
    const msg = body.slice(body.indexOf("toast.error("), body.indexOf(");", body.indexOf("toast.error(")));
    expect(msg).not.toMatch(/[–—]/);
  });
});
