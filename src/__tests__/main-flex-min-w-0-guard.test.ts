import { describe, it, expect } from "vitest";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, extname } from "node:path";

/**
 * Garde-fou structurel : tout `<main>` portant `flex-1` DOIT contenir `min-w-0`.
 *
 * Sans `min-w-0`, un flex item refuse de rétrécir sous la largeur de son
 * contenu → overflow horizontal en mobile (bug récurrent /petites-missions).
 *
 * Cette règle bloque le build à la moindre régression.
 */

const ROOT = join(process.cwd(), "src");
const EXTS = new Set([".tsx", ".jsx"]);

function walk(dir: string, out: string[] = []): string[] {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    const st = statSync(full);
    if (st.isDirectory()) {
      if (entry === "node_modules" || entry.startsWith(".")) continue;
      walk(full, out);
    } else if (EXTS.has(extname(entry))) {
      out.push(full);
    }
  }
  return out;
}

// Match <main ... className="... flex-1 ..."> (avec ou sans guillemets, sur 1 ligne)
const MAIN_REGEX = /<main\b[^>]*className=(["'`])([^"'`]*?)\1[^>]*>/g;

describe("Structural guard — <main className=\"flex-1\"> requires min-w-0", () => {
  const files = walk(ROOT);

  for (const file of files) {
    const content = readFileSync(file, "utf8");
    if (!content.includes("<main")) continue;

    it(`${file.replace(ROOT, "src")} — no <main flex-1> without min-w-0`, () => {
      const offenders: string[] = [];
      let m: RegExpExecArray | null;
      while ((m = MAIN_REGEX.exec(content)) !== null) {
        const classes = m[2];
        const hasFlex1 = /\bflex-1\b/.test(classes);
        const hasMinW0 = /\bmin-w-0\b/.test(classes);
        if (hasFlex1 && !hasMinW0) {
          offenders.push(m[0]);
        }
      }
      expect(
        offenders,
        `Le <main> doit contenir min-w-0 quand il porte flex-1 (sinon overflow horizontal mobile). Offenders:\n${offenders.join("\n")}`,
      ).toEqual([]);
    });
  }
});
