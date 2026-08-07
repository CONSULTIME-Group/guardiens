// Non-regression : l'adresse d'expedition des campagnes ne doit exister qu'en
// un seul endroit, la constante partagee `_shared/sender-address.ts`.
//
// Historique : `bonjour@guardiens.fr` etait duplique en dur dans quatre
// fonctions d'envoi, sans boite reelle derriere, ce qui envoyait les reponses
// des membres dans le vide. Ce test echoue si une adresse d'expedition en dur
// reapparait ailleurs que dans la constante.

import { describe, it, expect } from "vitest";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";

const FUNCTIONS_DIR = join(process.cwd(), "supabase", "functions");
const CONSTANT_FILE = join(FUNCTIONS_DIR, "_shared", "sender-address.ts");

// Adresses d'expedition Guardiens interdites en dur dans les appelants.
const FORBIDDEN = ["bonjour@guardiens.fr", "contact@guardiens.fr"];

function listTsFiles(dir: string): string[] {
  const out: string[] = [];
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) out.push(...listTsFiles(full));
    else if (full.endsWith(".ts")) out.push(full);
  }
  return out;
}

describe("adresse d'expedition centralisee", () => {
  it("expose la constante partagee sur contact@guardiens.fr", () => {
    const src = readFileSync(CONSTANT_FILE, "utf8");
    expect(src).toContain('export const SENDER_ADDRESS = "contact@guardiens.fr"');
    expect(src).toContain("export const REPLY_TO_ADDRESS");
  });

  it("n'a aucune adresse d'expedition en dur hors de la constante", () => {
    const offenders: string[] = [];
    for (const file of listTsFiles(FUNCTIONS_DIR)) {
      if (file === CONSTANT_FILE) continue;
      const src = readFileSync(file, "utf8");
      src.split("\n").forEach((line, i) => {
        if (line.trim().startsWith("//")) return;
        if (FORBIDDEN.some((addr) => line.includes(addr))) {
          offenders.push(`${file}:${i + 1}: ${line.trim()}`);
        }
      });
    }
    expect(offenders).toEqual([]);
  });

  it("associe un reply_to a chaque from des fonctions de campagne", () => {
    const senders = [
      "process-mass-email-queue",
      "send-mass-email",
      "send-mass-email-proximity",
      "admin-send-test-email",
    ];
    for (const name of senders) {
      const src = readFileSync(join(FUNCTIONS_DIR, name, "index.ts"), "utf8");
      expect(src, name).toContain("from: SENDER_FROM");
      expect(src, name).toContain("reply_to: REPLY_TO_ADDRESS");
    }
  });
});
