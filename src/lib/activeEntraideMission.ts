/**
 * Lot X3b (C-04) : besoin d'entraide en cours de son auteur, montré par le
 * bandeau entraide du tableau de bord propriétaire (« Voir les réponses »).
 *
 * Calculé à partir de l'index partagé fetchMySmallMissionsIndex (lot P1b),
 * déjà lu par le tableau de bord : aucune lecture supplémentaire.
 * Priorité : un besoin ouvert ou en cours avec une proposition en attente,
 * puis un besoin en cours, puis le plus récent encore ouvert.
 */
import { projetPath } from "@/lib/projetSeo";

export interface ActiveEntraideMission {
  id: string;
  title?: string | null;
  city?: string | null;
  date_needed?: string | null;
  status?: string | null;
  /** Adresse de la page : /projets/{slug} pour un projet, /petites-missions/{id} sinon. */
  path: string;
  /** Propositions encore en attente sur ce besoin. */
  pendingCount: number;
}

interface IndexRow {
  id: string;
  status?: string | null;
  title?: string | null;
  city?: string | null;
  date_needed?: string | null;
  category?: string | null;
  slug?: string | null;
  created_at?: string | null;
  small_mission_responses?: Array<{ id: string; status?: string | null }> | null;
}

const LIVE = new Set(["open", "in_progress"]);

export function entraideMissionPath(row: { id: string; slug?: string | null; category?: string | null }): string {
  return row.category === "projet" ? projetPath(row) : `/petites-missions/${row.id}`;
}

const pendingOf = (row: IndexRow) =>
  (row.small_mission_responses ?? []).filter((r) => r && r.status === "pending").length;

export function pickActiveEntraideMission(rows: ReadonlyArray<IndexRow> | null | undefined): ActiveEntraideMission | null {
  const live = (rows ?? []).filter((r) => r && r.id && LIVE.has(String(r.status ?? "")));
  if (live.length === 0) return null;
  const rank = (r: IndexRow) => (pendingOf(r) > 0 ? 0 : r.status === "in_progress" ? 1 : 2);
  const recent = (r: IndexRow) => (r.created_at ? Date.parse(r.created_at) || 0 : 0);
  const best = live
    .slice()
    .sort((a, b) => rank(a) - rank(b) || recent(b) - recent(a))[0];
  return {
    id: best.id,
    title: best.title ?? null,
    city: best.city ?? null,
    date_needed: best.date_needed ?? null,
    status: best.status ?? null,
    path: entraideMissionPath(best),
    pendingCount: pendingOf(best),
  };
}
