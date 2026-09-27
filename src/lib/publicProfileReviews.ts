/**
 * Avis d'une fiche publique : répartition par rôle (fournie par la fonction
 * serveur public_profile_reviews) et titre de la section Avis.
 */
export type ReviewRole = "garde" | "proprio" | "entraide";

export interface RoleReview {
  review_role: ReviewRole | string | null;
  overall_rating?: number | null;
}

export function splitReviewsByRole<T extends RoleReview>(reviews: T[]) {
  return {
    gardeReviews: reviews.filter((r) => r.review_role === "garde"),
    ownerReviews: reviews.filter((r) => r.review_role === "proprio"),
    missionReviews: reviews.filter((r) => r.review_role === "entraide"),
  };
}

export function averageRating(reviews: RoleReview[]): number {
  if (reviews.length === 0) return 0;
  const sum = reviews.reduce((s, r) => s + (Number(r.overall_rating) || 0), 0);
  return Math.round((sum / reviews.length) * 10) / 10;
}

export function sitterReviewsHeading(count: number, avg: number, firstName: string) {
  return count > 0
    ? { title: "Ce que les propriétaires racontent.", summary: `${count} retour${count > 1 ? "s" : ""} · moyenne ${avg.toFixed(1)}★` }
    : { title: `${firstName} prépare sa première garde.`, summary: null };
}
