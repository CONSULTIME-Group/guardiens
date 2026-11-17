/**
 * Lot ANN-6 (17/11/2026) : synthèse des brouillons jamais publiés, au-dessus
 * de la liste des filtres « En préparation » et « Prêtes à publier ».
 * Une seule logique : draftReadiness (la même que le bouton « Publier à sa
 * place »). Chaque brouillon tombe dans exactement une case.
 */
import { draftReadiness, type DraftLike, type OwnerDraftContext } from "./draftReadiness";

export type DraftSummaryKey = "ready" | "noCity" | "past" | "toComplete";

export interface DraftSummary {
  /** Brouillons jamais publiés ni retirés. */
  total: number;
  ready: number;
  noCity: number;
  past: number;
  toComplete: number;
}

export function summarizeDrafts(
  listings: DraftLike[],
  ctxByOwner: Map<string, OwnerDraftContext>,
  today: string,
): DraftSummary {
  const s: DraftSummary = { total: 0, ready: 0, noCity: 0, past: 0, toComplete: 0 };
  for (const l of listings) {
    if (l.status !== "draft" || l.published_at || l.unpublished_at) continue;
    s.total += 1;
    const r = draftReadiness(l, l.user_id ? ctxByOwner.get(l.user_id) : undefined, today);
    if (r.blocked === "past") s.past += 1;
    else if (r.blocked === "no_city") s.noCity += 1;
    else if (r.ready) s.ready += 1;
    else s.toComplete += 1;
  }
  return s;
}

/** Tête de phrase : « 31 brouillons jamais publiés ». */
export function draftSummaryHead(total: number): string {
  return `${total} brouillon${total > 1 ? "s" : ""} jamais publié${total > 1 ? "s" : ""}`;
}

/** Les cases non vides, dans l'ordre de lecture, avec leur libellé accordé. */
export function draftSummaryParts(s: DraftSummary): Array<{ key: DraftSummaryKey; count: number; label: string }> {
  const parts: Array<{ key: DraftSummaryKey; count: number; label: string }> = [
    { key: "ready", count: s.ready, label: s.ready > 1 ? "prêts à publier" : "prêt à publier" },
    { key: "noCity", count: s.noCity, label: "sans commune" },
    { key: "past", count: s.past, label: s.past > 1 ? "avec dates dépassées" : "avec date dépassée" },
    { key: "toComplete", count: s.toComplete, label: "à compléter" },
  ];
  return parts.filter((p) => p.count > 0);
}
