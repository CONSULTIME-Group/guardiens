import { describe, it, expect } from 'vitest';
import { execSync } from 'child_process';

/**
 * Garde anti-régression : le tiret cadratin « — » (U+2014) est PROSCRIT
 * dans tout le contenu user-visible (UI, copy, SEO, articles, emails, alt, OG, toasts).
 * Le demi-cadratin « – » (U+2013) est proscrit lui aussi en ponctuation de phrase.
 * Remplacer par virgule, deux-points, parenthèses ou point.
 * cf. mem://style/no-em-dash
 *
 * Tests, logs techniques et fichiers utilitaires non-visibles sont exclus.
 */

const SCAN_PATHS = 'src/pages src/components src/data src/i18n/locales index.html';

const EXCLUDE = [
  '--glob=!**/*.test.*',
  '--glob=!**/__tests__/**',
  '--glob=!src/test/**',
  '--glob=!src/lib/logger.ts',
  '--glob=!src/lib/errorLogger.ts',
  '--glob=!src/lib/seoDebugLog.ts',
  '--glob=!src/lib/analytics.ts',
  '--glob=!src/lib/heroBank.ts',
  '--glob=!src/lib/fatalErrorOverlay.ts',
  '--glob=!src/lib/campaignAttribution.ts',
  '--glob=!src/lib/sendTransactionalEmail.ts',
  '--glob=!src/lib/normalize.ts',
  '--glob=!src/lib/sanitize*.ts',
  '--glob=!src/lib/imageDimensions.ts',
  '--glob=!src/lib/backfillGalleryDimensions.ts',
  '--glob=!src/lib/queryKeys.ts',
  '--glob=!src/lib/conversation.ts',
  '--glob=!src/lib/ogImages.ts',
  '--glob=!src/lib/skills/tokenize.ts',
  '--glob=!src/lib/departments.ts',
  '--glob=!src/lib/countries.ts',
  '--glob=!src/__tests__/no-em-dash-guard.test.ts',
];

function search(pattern: string): string[] {
  let output = '';
  try {
    output = execSync(`rg -n '${pattern}' ${SCAN_PATHS} ${EXCLUDE.join(' ')}`, {
      encoding: 'utf8',
    });
  } catch (e: any) {
    // rg exit 1 = aucun résultat = conforme
    if (e.status === 1) output = '';
    else throw e;
  }
  return output.split('\n').filter(Boolean);
}

describe('Tirets longs', () => {
  it("le cadratin « — » (U+2014) n'apparaît jamais dans le contenu user-visible", () => {
    const lines = search('\\x{2014}');

    if (lines.length > 0) {
      throw new Error(
        `${lines.length} tiret(s) cadratin « — » détecté(s) dans le contenu user-visible.\n` +
          `Remplacer par virgule, deux-points, parenthèses ou point.\n` +
          `cf. mem://style/no-em-dash\n\nExemples :\n${lines.slice(0, 10).join('\n')}`
      );
    }
    expect(lines.length).toBe(0);
  });

  it("le demi-cadratin « – » (U+2013) n'est jamais utilisé en ponctuation de phrase", () => {
    // Seul cas toléré : séparateur de plage numérique collé, du type « 10–12 » ou
    // « 2024–2026 ». Toute occurrence non encadrée par deux chiffres est de la
    // ponctuation de phrase.
    const lines = search('\\x{2013}').filter((line) =>
      /(?<!\d)\u2013|\u2013(?!\d)/.test(line)
    );
    if (lines.length > 0) {
      throw new Error(
        `${lines.length} tiret(s) demi-cadratin « – » utilisé(s) en ponctuation.\n` +
          `Remplacer par virgule, deux-points, parenthèses ou point. ` +
          `Seules les plages numériques collées (10–12) sont tolérées.\n` +
          `cf. mem://style/no-em-dash\n\nExemples :\n${lines.slice(0, 10).join('\n')}`
      );
    }
    expect(lines.length).toBe(0);
  });
});
