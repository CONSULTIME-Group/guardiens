import { describe, it, expect } from 'vitest';
import { execSync } from 'child_process';

/**
 * Garde anti-régression : le tiret cadratin « — » (U+2014) est PROSCRIT
 * dans tout le contenu user-visible (UI, copy, SEO, articles, emails, alt, OG, toasts).
 * Remplacer par virgule, deux-points, parenthèses, point, ou demi-cadratin « – » pour les plages.
 * cf. mem://style/no-em-dash
 *
 * Tests, logs techniques et fichiers utilitaires non-visibles sont exclus.
 */
describe('Tiret cadratin « — » (U+2014)', () => {
  it("ne doit jamais apparaître dans le contenu user-visible", () => {
    const exclude = [
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
      '--glob=!src/data/siteRoutes.ts',
      '--glob=!src/__tests__/no-em-dash-guard.test.ts',
    ];

    let output = '';
    try {
      output = execSync(
        `rg -n "\\xE2\\x80\\x94" src/pages src/components src/data ${exclude.join(' ')}`,
        { encoding: 'utf8' }
      );
    } catch (e: any) {
      // rg exit 1 = no match = OK
      if (e.status === 1) output = '';
      else throw e;
    }

    const lines = output.split('\n').filter(Boolean);
    if (lines.length > 0) {
      const preview = lines.slice(0, 10).join('\n');
      throw new Error(
        `${lines.length} tiret(s) cadratin « — » détecté(s) dans le contenu user-visible.\n` +
        `Remplacer par virgule, deux-points, parenthèses, point, ou « – » pour les plages.\n` +
        `cf. mem://style/no-em-dash\n\nExemples :\n${preview}`
      );
    }
    expect(lines.length).toBe(0);
  });
});
