import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

/**
 * Garde-fou : le footer doit utiliser EXCLUSIVEMENT le token `bg-footer`
 * (défini dans index.css + tailwind.config.ts comme valeur figée identique
 * en light/dark, immunisée contre l'inversion de --foreground).
 *
 * Sont interdits dans tout fichier de footer :
 *  - `bg-foreground`        → cassé en dark mode (devient blanc)
 *  - `bg-[hsl(...)]`        → couleur hardcodée, viole le design system
 *  - `bg-[#...]`            → idem
 *
 * Voir mem://style/footer-token
 */

const FOOTER_FILE_PATTERN = /Footer.*\.(tsx|ts)$/i;
const FORBIDDEN_PATTERNS: Array<{ regex: RegExp; label: string }> = [
  { regex: /\bbg-foreground\b/, label: 'bg-foreground (s\'inverse en dark mode)' },
  { regex: /\bbg-\[hsl\(/, label: 'bg-[hsl(...)] (couleur hardcodée)' },
  { regex: /\bbg-\[#[0-9a-fA-F]/, label: 'bg-[#...] (couleur hardcodée)' },
];

function walk(dir: string, acc: string[] = []): string[] {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    const st = statSync(full);
    if (st.isDirectory()) {
      if (entry === 'node_modules' || entry.startsWith('.')) continue;
      walk(full, acc);
    } else if (FOOTER_FILE_PATTERN.test(entry)) {
      acc.push(full);
    }
  }
  return acc;
}

describe('Footer background token guard', () => {
  const footerFiles = walk('src');

  it('detects at least one footer file', () => {
    expect(footerFiles.length).toBeGreaterThan(0);
  });

  for (const file of footerFiles) {
    it(`${file} uses bg-footer and no forbidden background`, () => {
      const content = readFileSync(file, 'utf8');
      const violations: string[] = [];
      for (const { regex, label } of FORBIDDEN_PATTERNS) {
        const lines = content.split('\n');
        lines.forEach((line, i) => {
          if (regex.test(line)) {
            violations.push(`  L${i + 1}: ${label}\n    > ${line.trim()}`);
          }
        });
      }
      if (violations.length > 0) {
        throw new Error(
          `Footer ${file} contient des backgrounds interdits — utilisez bg-footer :\n${violations.join('\n')}`
        );
      }
    });
  }
});
