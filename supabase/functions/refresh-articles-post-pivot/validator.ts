// Validateur post-génération : liste des patterns proscrits dans le contenu final.
// Utilisé côté edge function ET côté test Vitest (re-export TS depuis src/lib).
export const FORBIDDEN_PATTERNS: Array<{ pattern: RegExp; label: string }> = [
  { pattern: /1er\s+octobre\s+2026/i, label: "1er octobre 2026" },
  { pattern: /30\s+septembre\s+2026/i, label: "30 septembre 2026" },
  { pattern: /14\/07\/2026/i, label: "14/07/2026" },
  { pattern: /14\s+juillet\s+2026/i, label: "14 juillet 2026" },
  { pattern: /6[,.]99\s*€\s*\/?\s*mois/i, label: "6,99 €/mois" },
  { pattern: /65\s*€\s*\/?\s*an/i, label: "65 €/an" },
  { pattern: /12\s*€\s*(oneshot|one-shot|un\s+mois)/i, label: "12 € oneshot" },
  { pattern: /gratuit\s+jusqu['’]au/i, label: "gratuit jusqu'au" },
  { pattern: /période\s+gratuite/i, label: "période gratuite" },
  { pattern: /période\s+d['’]essai/i, label: "période d'essai" },
  { pattern: /essai\s+gratuit/i, label: "essai gratuit" },
  { pattern: /—/, label: "tiret cadratin (—)" },
  { pattern: /(?<=\S)\s+–\s+(?=\S)/, label: "tiret demi-cadratin en ponctuation (–)" },
  { pattern: /\bvoisin(e|s|age)?\b/i, label: "voisin/voisinage" },
  { pattern: /à\s+vie\b/i, label: "à vie" },
  { pattern: /gratuitement/i, label: "gratuitement" },
];

export type ValidationResult = {
  ok: boolean;
  violations: string[];
};

export function validateRefreshedContent(content: string): ValidationResult {
  const violations: string[] = [];
  for (const { pattern, label } of FORBIDDEN_PATTERNS) {
    if (pattern.test(content)) violations.push(label);
  }
  return { ok: violations.length === 0, violations };
}
