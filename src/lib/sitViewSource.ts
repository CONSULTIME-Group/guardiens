/**
 * Provenance d'une fiche d'annonce ouverte (lot RCH1, 14/11/2026).
 *
 * La carte de la recherche passe `{ from: "search" }` dans l'état de
 * navigation ; PublicSitDetail le transmet à la redirection vers /sits/:id.
 * sit_view.metadata.from rend la provenance lisible : avant ce lot, aucune
 * fiche ouverte ne disait si elle venait de la recherche.
 */
export const SIT_VIEW_SOURCES = ["search"] as const;
export type SitViewSource = (typeof SIT_VIEW_SOURCES)[number];

export function viewFromState(state: unknown): SitViewSource | null {
  if (!state || typeof state !== "object") return null;
  const from = (state as { from?: unknown }).from;
  return typeof from === "string" && (SIT_VIEW_SOURCES as readonly string[]).includes(from)
    ? (from as SitViewSource)
    : null;
}
