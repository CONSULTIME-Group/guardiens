import { describe, it, expect } from "vitest";
import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();
const FUNCTIONS_DIR = path.join(ROOT, "supabase/functions");

// Outlook ne sait pas lire la notation hsl() dans les styles en ligne. Le fond
// tombe alors en transparent et un texte blanc devient invisible. Toutes les
// couleurs des gabarits doivent donc etre en hexadecimal.

function collectFiles(dir: string): string[] {
  const out: string[] = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      out.push(...collectFiles(full));
    } else if (/\.(tsx?|html|mjs)$/.test(entry.name)) {
      out.push(full);
    }
  }
  return out;
}

describe("gabarits email, aucune notation hsl()", () => {
  it("aucun fichier de supabase/functions ne contient hsl(", () => {
    const offenders: string[] = [];
    for (const file of collectFiles(FUNCTIONS_DIR)) {
      const src = fs.readFileSync(file, "utf8");
      if (src.includes("hsl(")) {
        offenders.push(path.relative(ROOT, file));
      }
    }
    expect(offenders).toEqual([]);
  });
});
