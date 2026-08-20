import { describe, it, expect } from "vitest";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, extname } from "node:path";

/**
 * Garde-fou structurel : un conteneur de mise en page ne doit JAMAIS porter
 * à la fois une position collante (`sticky`) et un défilement interne
 * (`overflow-y-auto`, `overflow-auto`, `overflow-y-scroll`, `overflow-scroll`).
 *
 * Ce couple crée une seconde barre de défilement, distincte de celle de la
 * page : une partie du contenu reste sous la ligne de flottaison du
 * conteneur, inatteignable sans deviner l'existence de cette seconde barre
 * (bug du rail des dashboards, août 2026 : 400 px de contenu cachés).
 *
 * La règle produit : si le contenu tient dans la fenêtre, le rail reste
 * collant ; sinon il défile avec la page (voir DashboardRail).
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

// className="...", className='...', className={`...`} (multi-lignes incluses)
const CLASSNAME_REGEX = /className\s*=\s*(?:"([^"]*)"|'([^']*)'|\{`([^`]*)`\})/g;

// `sticky` seul ou préfixé responsive (lg:sticky, md:sticky...).
const STICKY = /(^|\s)([a-z-]+:)*sticky(\s|$)/;
// Défilement interne : overflow auto/scroll (overflow-x-clip exclu).
const INTERNAL_SCROLL = /(^|\s)([a-z-]+:)*overflow-(y-)?(auto|scroll)(\s|$)/;

describe("Structural guard — jamais sticky + défilement interne sur un même conteneur", () => {
  const files = walk(ROOT);

  for (const file of files) {
    const content = readFileSync(file, "utf8");
    if (!content.includes("sticky")) continue;

    it(`${file.replace(ROOT, "src")} — aucun conteneur collant avec défilement interne`, () => {
      const offenders: string[] = [];
      let m: RegExpExecArray | null;
      while ((m = CLASSNAME_REGEX.exec(content)) !== null) {
        const classes = m[1] ?? m[2] ?? m[3] ?? "";
        if (STICKY.test(classes) && INTERNAL_SCROLL.test(classes)) {
          offenders.push(m[0].slice(0, 160));
        }
      }
      expect(
        offenders,
        `Un conteneur collant ne doit pas porter de défilement interne (double scrollbar). Laisser le contenu défiler avec la page. Offenders:\n${offenders.join("\n")}`,
      ).toEqual([]);
    });
  }
});
