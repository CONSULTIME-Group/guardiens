/**
 * Lot P4 : lectures groupées de l'espace propriétaire, hors du fichier
 * d'entrée (dashboardShared est lu par la page d'accueil).
 */
import { supabase } from "@/integrations/supabase/client";
import { getAppQueryClient, onAppQueryCacheClear } from "@/lib/appQueryClient";
import { cached } from "@/lib/dashboardShared";

/**
 * Lot P4 : avis du tableau de bord propriétaire en une lecture. Avis
 * publiés reçus par le membre (note moyenne), avis déposés par lui (repère
 * « avis déjà laissé ») et avis publiés des gardiens candidats. Le chargeur
 * d'avis publiés est amorcé pour le membre et les candidats.
 */
export function fetchMyReviewsBothWays(
  userId: string,
  candidateIds: string[] = [],
  opts?: { fresh?: boolean },
): Promise<{ received: any[]; written: any[]; candidates: any[] }> {
  const ids = Array.from(new Set(candidateIds.filter((id) => id && id !== userId))).sort();
  const key = ["my-reviews-both-ways", userId, ids.join(",")] as const;
  if (opts?.fresh) getAppQueryClient()?.removeQueries({ queryKey: key, exact: true });
  return cached(key, async () => {
    const reviewees = [userId, ...ids].join(",");
    const { data, error } = await supabase
      .from("reviews")
      .select("reviewee_id, reviewer_id, overall_rating, published, sit_id")
      .or(`reviewer_id.eq.${userId},and(published.eq.true,reviewee_id.in.(${reviewees}))`);
    if (error) throw error;
    const rows = (data ?? []) as any[];
    const pub = (r: any) => ({ reviewee_id: r.reviewee_id, overall_rating: r.overall_rating });
    const received = rows.filter((r) => r.reviewee_id === userId && r.published === true).map(pub);
    const idSet = new Set(ids);
    const candidates = rows.filter((r) => idSet.has(r.reviewee_id) && r.published === true).map(pub);
    const written = rows.filter((r) => r.reviewer_id === userId).map((r) => ({ sit_id: r.sit_id }));
    const { publishedReviewsLoader } = await import("@/lib/batchedReads");
    publishedReviewsLoader.prime([...received, ...candidates], [userId, ...ids]);
    return { received, written, candidates };
  });
}

/**
 * Lot P4 : lectures groupées des données d'autres gardiens pour l'espace
 * propriétaire, en deux salves.
 *
 * 1. `fetchOwnerSpaceSitterReads` : affinité de tous les gardiens dont les
 *    blocs auront besoin (600 scorés de « Pour vous », candidats de « Près de
 *    chez vous », candidats des annonces), identifiants calculés avec les
 *    MÊMES fonctions pures que les blocs.
 * 2. `fetchOwnerSpaceDetailReads` : avis et compétences, une fois le Top 3
 *    connu (annoncé par useOwnerTopAffinitySitters), pour le Top 3, les
 *    candidats de proximité et les candidats des annonces.
 * Les blocs attendent la salve utile puis lisent leurs chargeurs, servis
 * depuis le cache. Aucun filtre ajouté, aucun calcul modifié.
 */
type OwnerSpaceIds = { nearby: string[]; apps: string[] };
const EMPTY_IDS: OwnerSpaceIds = { nearby: [], apps: [] };

export function fetchOwnerSpaceSitterReads(userId: string): Promise<OwnerSpaceIds> {
  // Hors application (tests unitaires) : aucun cache à amorcer.
  if (!getAppQueryClient()) return Promise.resolve(EMPTY_IDS);
  return cached(["owner-space-sitter-reads", userId], async () => {
    const [{ fetchSitterPoolShared }, pool, batched, { fetchMyProfile }] = await Promise.all([
      import("@/lib/fetchSitterPool"),
      import("@/lib/ownerSitterPool"),
      import("@/lib/batchedReads"),
      import("@/lib/myProfile"),
    ]);
    const [poolRes, me] = await Promise.all([
      fetchSitterPoolShared(userId),
      fetchMyProfile(userId),
    ]);
    // Candidatures : seulement si le tableau de bord les a déjà lues (aucune
    // lecture ajoutée ici) ; sinon le bloc lit leur affinité lui-même.
    const apps = (getAppQueryClient()?.getQueryData(["applications-on-my-sits", userId]) as any[] | undefined) ?? [];
    const appSitters = Array.from(new Set(apps.map((a: any) => a.sitter_id).filter(Boolean))) as string[];
    const rows = poolRes.rows ?? [];
    const scoped = rows.length > 0 ? pool.scopeOwnerPoolByDistance(rows, me.data as any).scoped.map((p: any) => p.id as string) : [];
    const nearby = rows.length > 0 ? pool.selectNearbyCandidates(rows, me.data as any).candidates.map((c) => c.id) : [];
    await batched.sitterAffinityLoader.load([...scoped, ...nearby, ...appSitters]);
    return { nearby, apps: appSitters };
  });
}

const topWaiters = new Map<string, { promise: Promise<string[]>; resolve: (ids: string[]) => void }>();
function topWaiter(userId: string) {
  let w = topWaiters.get(userId);
  if (!w) {
    let resolve!: (ids: string[]) => void;
    const promise = new Promise<string[]>((r) => { resolve = r; });
    w = { promise, resolve };
    topWaiters.set(userId, w);
  }
  return w;
}
onAppQueryCacheClear(() => topWaiters.clear());

/** Appelé par useOwnerTopAffinitySitters dès que son Top 3 est calculé. */
export function announceOwnerTopIds(userId: string, ids: string[]): void {
  topWaiter(userId).resolve(ids);
}

/** Délai maximal d'attente du Top 3 : au-delà, la salve part sans lui. */
const TOP_WAIT_MS = 4000;

export function fetchOwnerSpaceDetailReads(userId: string): Promise<true> {
  if (!getAppQueryClient()) return Promise.resolve(true as const);
  return cached(["owner-space-detail-reads", userId], async () => {
    const [ids, top, batched] = await Promise.all([
      fetchOwnerSpaceSitterReads(userId).catch(() => EMPTY_IDS),
      Promise.race([
        topWaiter(userId).promise,
        new Promise<string[]>((r) => setTimeout(() => r([]), TOP_WAIT_MS)),
      ]),
      import("@/lib/batchedReads"),
    ]);
    await Promise.all([
      batched.publishedReviewsLoader.load([...top, ...ids.nearby, ...ids.apps]),
      batched.sitterCompetencesLoader.load([...top, ...ids.nearby]),
      batched.publicProfilesLoader.load(top),
    ]);
    return true as const;
  });
}
