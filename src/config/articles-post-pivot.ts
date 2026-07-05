/**
 * Configuration des articles concernés par le refresh post-pivot pricing.
 *
 * Les piliers stratégiques ne sont JAMAIS sortis du noindex automatiquement.
 * Ils exigent une double confirmation admin après relecture intégrale.
 *
 * Cette liste DOIT rester synchronisée avec le miroir Deno dans
 * `supabase/functions/refresh-articles-post-pivot/pillars.ts`.
 */
export const STRATEGIC_PILLARS: readonly string[] = [
  "nouveaux-tarifs-2026",
  "premiers-pas-sur-guardiens",
  "comment-fonctionne-guardiens-et-le-house-sitting-entre-particuliers",
  "petites-missions-entraide-guardiens",
] as const;

export function isStrategicPillar(slug: string): boolean {
  return STRATEGIC_PILLARS.includes(slug);
}

/**
 * Baseline éditorial court à utiliser dans les articles.
 */
export const PRICING_BASELINE_LONG =
  "Guardiens reste gratuit tant que nous ne sommes pas satisfaits du service que nous vous offrons. Vous avez accès à tout, sans limite, sans engagement. Vous serez prévenu à l'avance quand cela changera.";

export const PRICING_BASELINE_SHORT = "Guardiens est gratuit aujourd'hui, sans engagement.";
