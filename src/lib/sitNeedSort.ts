/**
 * Lot ANN1 (11/11/2026) : lecture de la réponse de draft-sit-from-prompt et
 * passage vers l'Entraide. Alma trie le besoin avant de rédiger : une garde
 * (le gardien s'installe au domicile) devient un brouillon d'annonce, un
 * service ponctuel part vers /petites-missions/creer avec son brouillon.
 */
export type SortedNeed = "coup_de_main" | "incertain";

export type SitDraftReply =
  | { kind: "draft"; draftId: string; confidence: number | null; generatedLength: number | null }
  | { kind: "sorted"; need: SortedNeed }
  | { kind: "error"; message: string };

const FALLBACK = "Réessayez dans un instant, ou remplissez le formulaire ci-dessous.";

export function readSitDraftReply(body: unknown): SitDraftReply {
  const d = (body ?? {}) as Record<string, unknown>;
  if (typeof d.draftId === "string" && d.draftId.length > 0) {
    return {
      kind: "draft",
      draftId: d.draftId,
      confidence: typeof d.confidence === "number" ? d.confidence : null,
      generatedLength: typeof d.generated_length === "number" ? d.generated_length : null,
    };
  }
  if (d.needKind === "coup_de_main" || d.needKind === "incertain") return { kind: "sorted", need: d.needKind };
  return { kind: "error", message: typeof d.error === "string" && d.error.trim() ? d.error.trim() : FALLBACK };
}

/** Adresse du formulaire d'Entraide, titre et description préremplis, relus avant publication. */
export function entraidePrefillHref(draft: { title: string; description: string }): string {
  const params = new URLSearchParams();
  const title = draft.title.trim().slice(0, 100);
  const description = draft.description.trim().slice(0, 900);
  if (title) params.set("titre", title);
  if (description) params.set("description", description);
  params.set("via", "alma");
  params.set("from", "sit_create");
  return `/petites-missions/creer?${params.toString()}`;
}
