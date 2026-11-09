/**
 * Lot D6 (09/11/2026, audit « Tableaux de bord ordinateur », état P2) : un
 * propriétaire qui a déjà publié et n'a plus rien en cours se voit proposer
 * de republier sa dernière annonce avec de nouvelles dates, par le parcours
 * de republication existant (RepublishAlmaDialog, copie ou adaptation).
 *
 * Règle pure : la dernière annonce passée qui se republie (terminée,
 * archivée, arrivée à échéance, dépubliée, annulée), jamais une annonce
 * supprimée par le propriétaire, jamais une annonce sans titre.
 */
import { isDeletedByOwner } from "@/lib/removeSit";

export const REPUBLISHABLE_STATUSES = ["completed", "archived", "expired", "unpublished", "cancelled"] as const;

export interface RepublishCandidate {
  id: string;
  status?: string | null;
  title?: string | null;
  city?: string | null;
  end_date?: string | null;
  created_at?: string | null;
  cancellation_reason?: string | null;
}

export interface RepublishSource {
  id: string;
  title: string;
  city: string | null;
}

const isRepublishable = (s: RepublishCandidate): boolean =>
  (REPUBLISHABLE_STATUSES as readonly string[]).includes(String(s.status)) &&
  !isDeletedByOwner(s) &&
  !!(s.title ?? "").trim();

/** Dernière annonce passée qui se republie : date de fin la plus récente, puis création. */
export function pickRepublishSource(sits: readonly RepublishCandidate[] | null | undefined): RepublishSource | null {
  const rows = (sits ?? []).filter(isRepublishable);
  if (rows.length === 0) return null;
  const key = (s: RepublishCandidate) => `${s.end_date ?? ""}|${s.created_at ?? ""}`;
  const best = rows.reduce((a, b) => (key(b) > key(a) ? b : a));
  const city = (best.city ?? "").trim();
  return { id: best.id, title: (best.title ?? "").trim(), city: city || null };
}

/** Textes de la vedette « Republier », sans tournure négative. */
export function republishStarCopy(source: RepublishSource): { eyebrow: string; title: string; subtitle: string } {
  return {
    eyebrow: "Une nouvelle absence en vue ?",
    title: `Reprenez « ${source.title} » avec de nouvelles dates.`,
    subtitle: "Logement, animaux et consignes sont déjà écrits. Les gardiens à proximité sont prévenus dès la publication.",
  };
}

export const REPUBLISH_CTA_LABEL = "Republier pour de nouvelles dates";
export const REPUBLISH_OTHER_LABEL = "Publier une autre annonce";
