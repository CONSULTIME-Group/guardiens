/**
 * Guard : le workflow d'acceptation d'une candidature DOIT passer par
 * la RPC atomique `accept_application` et NON par un double UPDATE
 * séquentiel (applications puis sits). C'est la garantie que le sit
 * bascule bien en `confirmed` en même temps que la candidature.
 *
 * Ce test est un garde-fou statique : il inspecte le source de
 * `ApplicationsList.tsx` pour empêcher toute régression.
 */
import { describe, it, expect } from "vitest";
import fs from "node:fs";
import path from "node:path";

const FILE = path.join(process.cwd(), "src/components/sits/ApplicationsList.tsx");

describe("ApplicationsList - acceptance workflow", () => {
  const src = fs.readFileSync(FILE, "utf8");

  it("appelle la RPC accept_application", () => {
    expect(src).toMatch(/supabase\.rpc\(\s*["']accept_application["']/);
  });

  it("n'exécute plus le double UPDATE séquentiel legacy", () => {
    // L'ancien code faisait deux UPDATE consécutifs sur applications puis sits.
    // On vérifie qu'aucun update direct sur `sits` avec status='confirmed' ne
    // subsiste dans le handler d'acceptation.
    const hasLegacyUpdate =
      /supabase\s*\.from\(\s*["']sits["']\s*\)\s*\.update\([^)]*status:\s*["']confirmed["']/.test(src);
    expect(hasLegacyUpdate).toBe(false);
  });

  it("émet les événements analytics du workflow", () => {
    expect(src).toContain('"application_accepted"');
    expect(src).toContain('"sit_confirmed"');
    expect(src).toContain('"application_accept_failed"');
  });

  it("passe explicitement role=proprio à AccordDeGarde", () => {
    expect(src).toMatch(/role=\{?\s*["']proprio["']/);
  });
});
