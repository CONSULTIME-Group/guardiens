// Miroir Deno de src/config/articles-post-pivot.ts
// Toute modification doit être répliquée des deux côtés.
export const STRATEGIC_PILLARS: readonly string[] = [
  "nouveaux-tarifs-2026",
  "premiers-pas-sur-guardiens",
  "comment-fonctionne-guardiens-et-le-house-sitting-entre-particuliers",
  "petites-missions-entraide-guardiens",
] as const;

export function isStrategicPillar(slug: string): boolean {
  return STRATEGIC_PILLARS.includes(slug);
}

export const PRICING_BASELINE_LONG =
  "Guardiens reste gratuit tant que nous ne sommes pas satisfaits du service que nous vous offrons. Vous avez accès à tout, sans limite, sans engagement. Vous serez prévenu à l'avance quand cela changera.";

export const PRICING_BASELINE_SHORT = "Guardiens est gratuit aujourd'hui, sans engagement.";
