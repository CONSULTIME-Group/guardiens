import { describe, it, expect } from "vitest";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, extname } from "node:path";

/**
 * Garde-fou : bloque la réintroduction de mentions pricing obsolètes dans
 * les composants et pages TSX visibles utilisateur.
 *
 * Pivot pricing du 5 juillet 2026 : Guardiens est gratuit sans deadline.
 * Toutes les mentions de dates de bascule (30 sept / 1er oct 2026, etc.),
 * de prix chiffrés (6,99 €/mois, 65 €/an, 10/12 € oneshot) et le tour de
 * passe-passe « à 0 € » doivent être remplacés par les helpers de
 * `src/lib/pricing.ts` (getSitterMonthlyLabel, getOwnerPriceLabel,
 * getPricingBaseline).
 */

// Fichiers exclus : structure interne pricing (source de vérité), tests,
// admin (surfaces internes), dev-tools, composants de prix gated par
// PRICING_IS_ACTIVE, commentaires de code (constants, hooks) qui ne
// s'affichent jamais côté utilisateur.
const EXCLUDED = new Set([
  "src/lib/pricing.ts",
  "src/lib/refreshArticleValidator.ts",
  "src/config/pricing.ts",
  "src/lib/constants.ts",
  "src/hooks/useSubscriptionAccess.ts",
  "src/pages/AuditTarifs.tsx",
  "src/pages/Pricing.tsx",
  "src/pages/MySubscription.tsx",
  "src/pages/Cgs.tsx", // doc légale, section 3.2 baseline explicite
  "src/pages/Parrainage.tsx",
  "src/components/subscription/PricingCards.tsx",
  "src/components/subscription/PricingCardsCheckout.tsx",
  "src/components/subscription/FreeAccountSection.tsx",
  "src/components/marketing/FreeTickerChip.tsx",
  "src/components/marketing/FreePeriodBanner.tsx",
]);

const EXCLUDED_PREFIXES = [
  "src/pages/admin/",
  "src/__tests__/",
  "src/test/",
];

const PATTERNS: Array<{ label: string; regex: RegExp }> = [
  { label: "date 1er octobre 2026", regex: /1er\s+octobre\s+2026/i },
  { label: "date 30 septembre 2026", regex: /30\s+septembre\s+2026/i },
  { label: "date 14/07/2026", regex: /14\/07\/2026/i },
  { label: "date 14 juillet 2026", regex: /14\s+juillet\s+2026/i },
  { label: "prix 6,99 €", regex: /6[,.]99\s*[\u00A0 ]?€/i },
  { label: "prix 65 €/an", regex: /65\s*[\u00A0 ]?€\s*\/?\s*an/i },
  { label: "prix 10/12 € oneshot", regex: /(10|12)\s*[\u00A0 ]?€\s*(oneshot|one-shot|un\s+mois|le\s+mois|pour\s+un\s+mois)/i },
  { label: "« à 0 € »", regex: /à\s*[\u00A0 ]?0\s*[\u00A0 ]?€/i },
  { label: "gratuit jusqu'au", regex: /gratuit\s+jusqu['’]au/i },
  { label: "période gratuite", regex: /période\s+gratuite/i },
  { label: "profitez de la gratuité", regex: /profitez\s+de\s+la\s+gratuité/i },
];

function walk(dir: string, out: string[] = []): string[] {
  for (const name of readdirSync(dir)) {
    const full = join(dir, name);
    const st = statSync(full);
    if (st.isDirectory()) walk(full, out);
    else if ([".ts", ".tsx"].includes(extname(name))) out.push(full);
  }
  return out;
}

const SRC = "src";

describe("Garde-fou pricing : aucune mention obsolète dans les .tsx/.ts", () => {
  it("Aucun composant/page ne contient de date/prix obsolète", () => {
    const files = walk(SRC).filter((f) => {
      const rel = f.replace(/\\/g, "/");
      if (EXCLUDED.has(rel)) return false;
      if (EXCLUDED_PREFIXES.some((p) => rel.startsWith(p))) return false;
      if (rel.endsWith(".test.ts") || rel.endsWith(".test.tsx")) return false;
      if (rel.endsWith(".spec.ts") || rel.endsWith(".spec.tsx")) return false;
      return true;
    });

    const findings: string[] = [];
    for (const file of files) {
      const lines = readFileSync(file, "utf-8").split("\n");
      lines.forEach((line, i) => {
        // Ignore les commentaires purs
        const trimmed = line.trimStart();
        if (trimmed.startsWith("//") || trimmed.startsWith("*")) return;
        for (const { label, regex } of PATTERNS) {
          if (regex.test(line)) {
            findings.push(`${file}:${i + 1}  [${label}]  ${line.trim().slice(0, 140)}`);
          }
        }
      });
    }

    if (findings.length > 0) {
      const msg =
        "Un pattern pricing obsolète a été introduit. Utilisez les helpers de src/lib/pricing.ts (getSitterMonthlyLabel, getOwnerPriceLabel, getPricingBaseline).\n\n" +
        findings.join("\n");
      expect.fail(msg);
    }
    expect(findings).toEqual([]);
  });
});
