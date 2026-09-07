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
  "L'accès à Guardiens est ouvert pendant la phase de lancement. Vous accédez à l'ensemble des fonctionnalités, et vous restez libre à tout moment. Vous serez prévenu à l'avance en cas d'évolution tarifaire.";

export const PRICING_BASELINE_SHORT = "L'accès à Guardiens est ouvert pendant la phase de lancement.";
