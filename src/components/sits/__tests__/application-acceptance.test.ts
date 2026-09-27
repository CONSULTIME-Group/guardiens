/**
 * Guard : toute acceptation de candidature passe par le hook partagé
 * `useAcceptApplication`, qui appelle la RPC atomique `accept_application`.
 * Aucun UPDATE direct vers `accepted` n'est admis dans le front : le trigger
 * `enforce_application_status_transitions` le refuse (must_use_accept_rpc).
 */
import { describe, it, expect } from "vitest";
import fs from "node:fs";
import path from "node:path";

const read = (p: string) => fs.readFileSync(path.join(process.cwd(), p), "utf8");
const HOOK = read("src/hooks/useAcceptApplication.tsx");
const LIST = read("src/components/sits/ApplicationsList.tsx");
const HEADER = read("src/components/messages/ConversationHeader.tsx");
const OWNER = read("src/components/sits/views/OwnerSitView.tsx");

describe("acceptation, chemin unique", () => {
  it("le hook appelle la RPC accept_application", () => {
    expect(HOOK).toMatch(/supabase\.rpc\(\s*["']accept_application["']/);
  });

  it("le hook émet les événements analytics du workflow", () => {
    expect(HOOK).toContain('"application_accepted"');
    expect(HOOK).toContain('"sit_confirmed"');
    expect(HOOK).toContain('"application_accept_failed"');
  });

  it("le hook ouvre AccordDeGarde avec role=proprio", () => {
    expect(HOOK).toMatch(/role=\{?\s*["']proprio["']/);
  });

  it.each([
    ["ApplicationsList", LIST],
    ["ConversationHeader", HEADER],
    ["OwnerSitView", OWNER],
  ])("%s utilise useAcceptApplication", (_n, src) => {
    expect(src).toContain("useAcceptApplication(");
  });

  it("aucun UPDATE direct vers accepted ni vers sits confirmed dans ces fichiers", () => {
    for (const src of [LIST, HEADER, OWNER, HOOK]) {
      expect(/\.from\(\s*["']applications["']\s*\)\s*\.update\(\s*\{\s*status:\s*["']accepted["']/.test(src)).toBe(false);
      expect(/\.from\(\s*["']sits["']\s*\)\s*\.update\([^)]*status:\s*["']confirmed["']/.test(src)).toBe(false);
    }
  });

  it("le bouton Accepter de la messagerie passe par acceptApplication", () => {
    const fn = HEADER.slice(HEADER.indexOf("const handleAcceptApplication"), HEADER.indexOf("const handleDeclineApplication"));
    expect(fn).toContain("acceptApplication(");
    expect(fn).not.toMatch(/\.update\(/);
  });

  it("la messagerie reprend le texte de confirmation d'ApplicationsList", () => {
    expect(HEADER).toContain("Accepter la candidature de {sitterName} ?");
    expect(HEADER).toContain("Les autres candidats seront automatiquement déclinés. Cette action confirme la garde.");
    expect(HEADER).toContain("Confirmer l'acceptation");
    expect(HEADER).not.toContain('toast.error("Erreur")');
  });

  it("aucun .update({ status: \"accepted\" }) sur applications dans tout src", () => {
    const hits: string[] = [];
    const walk = (dir: string) => {
      for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
        const p = path.join(dir, e.name);
        if (e.isDirectory()) { if (e.name !== "__tests__") walk(p); continue; }
        if (!/\.(ts|tsx)$/.test(e.name)) continue;
        const src = fs.readFileSync(p, "utf8");
        if (/\.from\(\s*["']applications["']\s*\)\s*\.update\(\s*\{\s*status:\s*["']accepted["']/.test(src)) hits.push(p);
      }
    };
    walk(path.join(process.cwd(), "src"));
    expect(hits).toEqual([]);
  });
});
