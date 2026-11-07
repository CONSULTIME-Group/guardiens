/**
 * Lot PUB1 (07/11/2026) : bouton collant de « Mes annonces » sur téléphone.
 * Un brouillon jamais publié se reprend en un geste, par son identifiant ;
 * sinon le bouton propose une nouvelle annonce.
 */
export interface CtaSitLike {
  id: string;
  status?: string | null;
  published_at?: string | null;
  unpublished_at?: string | null;
  updated_at?: string | null;
  created_at?: string | null;
}

export function ownerCreateCta(sits: CtaSitLike[]): { label: string; to: string; resumeId: string | null } {
  const drafts = sits
    .filter((s) => s.status === "draft" && !s.published_at && !s.unpublished_at)
    .sort((a, b) => (b.updated_at ?? b.created_at ?? "").localeCompare(a.updated_at ?? a.created_at ?? ""));
  const d = drafts[0];
  if (d) return { label: "Reprendre mon brouillon", to: `/sits/create?resume=${d.id}`, resumeId: d.id };
  return { label: "Publier une annonce", to: "/sits/create", resumeId: null };
}
