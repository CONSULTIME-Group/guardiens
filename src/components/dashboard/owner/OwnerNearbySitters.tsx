import { publicProfilesLoader, publishedReviewsLoader, sitterAffinityLoader, sitterCompetencesLoader } from "@/lib/batchedReads";
/**
 * « Près de chez vous » (lot D1) : remplace OwnerSitterSpotlight sur le
 * tableau de bord propriétaire. Trois lignes séparées par un filet, sans
 * carte, dans l'ordre du classement d'affinité (useOwnerTopAffinitySitters).
 *
 * Règles :
 *  - pourcentage masqué tant que le propriétaire n'a aucune annonce publiée ;
 *    ensuite règle des 4 critères (lot D0), chiffre = sortScore (ordre = chiffre) ;
 *  - porte de sortie toujours visible, compte exact (règle 1 bis) ;
 *  - ligne distinctive par gardien (sitterDistinctLine), jamais deux lignes identiques.
 */
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useOwnerTopAffinitySitters } from "@/hooks/useOwnerTopAffinitySitters";
import { canShowAffinityPercent, AFFINITY_AFTER_PUBLISH_LINE } from "@/lib/affinityDisplay";
import { sitterDistinctLines, type DistinctSitterInput } from "@/lib/sitterDistinctLine";
import { formatCityLabel } from "@/lib/cityLabel";
import { avatarImageUrl } from "@/lib/storageImage";
import DashEyebrow from "./DashEyebrow";
import { useAuth } from "@/contexts/AuthContext";
import { useNearbyOwnerSitters } from "@/hooks/useNearbyOwnerSitters";
import { fetchOwnerSpaceDetailReads } from "@/lib/dashboardShared";
import { nearbyPlaceLabel, nearbyExitLabel } from "@/lib/ownerNearbyLabels";

function useDistinctDetails(ids: string[], userId: string | undefined) {
  return useQuery({
    queryKey: ["owner-nearby-distinct", ids.join(",")],
    enabled: ids.length > 0,
    staleTime: 5 * 60 * 1000,
    queryFn: async (): Promise<Record<string, DistinctSitterInput>> => {
      // Lot D3 : même source que le classement (vivier complet), compétences
      // fusionnées depuis la vue publique quand la ligne existe.
      // Lot P4 : avis et compétences du Top 3 lus dans la salve groupée.
      if (userId) await fetchOwnerSpaceDetailReads(userId).catch(() => undefined);
      const [sp, pc, pp, rv] = await Promise.all([
        // Lot P1b : chargeurs partagés, aucune relecture des profils déjà lus.
        // Lecture sitter_profiles_affinity et select("user_id, competences")
        // via src/lib/batchedReads.ts.
        sitterAffinityLoader.rows(ids),
        sitterCompetencesLoader.rows(ids),
        publicProfilesLoader.rows(ids),
        publishedReviewsLoader.rows(ids),
      ]);
      const out: Record<string, DistinctSitterInput> = {};
      for (const id of ids) out[id] = {};
      for (const r of ((sp.data as any[]) ?? [])) Object.assign(out[r.user_id] ?? {}, r);
      for (const r of ((pc.data as any[]) ?? [])) if (out[r.user_id]) out[r.user_id].competences = r.competences;
      for (const r of ((pp.data as any[]) ?? [])) if (out[r.id]) out[r.id].completed_sits_count = r.completed_sits_count;
      const ratings: Record<string, number[]> = {};
      for (const r of ((rv.data as any[]) ?? [])) {
        if (typeof r.overall_rating === "number") (ratings[r.reviewee_id] ??= []).push(r.overall_rating);
      }
      for (const [id, list] of Object.entries(ratings)) {
        if (!out[id]) continue;
        out[id].reviews_count = list.length;
        out[id].reviews_avg = list.reduce((a, b) => a + b, 0) / list.length;
      }
      return out;
    },
  });
}

export default function OwnerNearbySitters() {
  const { topSitters, hasPublishedSit, isLoading } = useOwnerTopAffinitySitters();
  const { user } = useAuth();
  const { data: nearby } = useNearbyOwnerSitters(user?.id);
  const ids = topSitters.map((s) => s.id);
  const { data: details } = useDistinctDetails(ids, user?.id);

  if (isLoading) return <div aria-hidden="true" className="min-h-[320px]" />;

  const lines = sitterDistinctLines(ids.map((id) => details?.[id] ?? {}));
  const exitLabel = nearbyExitLabel(nearby && {
    totalCount: nearby.totalCount,
    radiusUsed: nearby.radiusUsed,
    hasGeo: nearby.hasGeo,
    isBeyond: (nearby.sitters ?? []).some((x) => x.is_beyond),
  });

  return (
    <section aria-label="Près de chez vous" data-testid="owner-nearby-sitters" className="min-w-0">
      <DashEyebrow>Près de chez vous</DashEyebrow>
      <h2 className="font-heading text-foreground mt-[8px] text-[23px] md:text-[26px] font-semibold leading-tight">
        Des gardiens à quelques kilomètres.
      </h2>

      {topSitters.length > 0 && (
        <ul className="mt-[22px] divide-y divide-border border-y border-border">
          {topSitters.map((s, i) => {
            const initial = (s.first_name || "?").charAt(0).toUpperCase();
            const place = nearbyPlaceLabel(s.city ? formatCityLabel(s.city) : null, s.distance_km);
            const showPercent = hasPublishedSit && canShowAffinityPercent(s.affinity);
            return (
              <li key={s.id} className="flex items-center gap-[14px] py-[14px]">
                <div className="w-[42px] h-[42px] shrink-0 rounded-full overflow-hidden bg-secondary/15 flex items-center justify-center">
                  {s.avatar_url ? (
                    <img src={avatarImageUrl(s.avatar_url, 42)} alt="" width={42} height={42} loading="lazy" className="w-full h-full object-cover" />
                  ) : (
                    <span className="font-heading font-semibold text-secondary">{initial}</span>
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-foreground text-[14.5px] font-semibold truncate">
                    {s.first_name ?? "Gardien"}
                    {place && <span className="font-normal text-muted-foreground"> · {place}</span>}
                  </p>
                  {lines[i] && <p className="text-muted-foreground text-[13px] leading-snug mt-[2px]">{lines[i]}</p>}
                </div>
                {showPercent && (
                  <span data-testid="affinity-percent" className="shrink-0 rounded-full bg-primary/10 text-primary px-[10px] py-[3px] text-[12px] font-semibold">
                    {s.affinity.sortScore} %
                  </span>
                )}
                <Link to={`/gardiens/${s.id}`} className="shrink-0 text-primary text-[13px] font-semibold hover:underline underline-offset-4">
                  Voir son profil
                </Link>
              </li>
            );
          })}
        </ul>
      )}

      <div className="mt-[14px] flex flex-col sm:flex-row sm:items-center sm:justify-between gap-[8px]">
        {!hasPublishedSit ? (
          <p className="text-muted-foreground text-[13px]">{AFFINITY_AFTER_PUBLISH_LINE}</p>
        ) : <span />}
        <Link to="/search?role=sitter" className="text-primary text-[13px] font-semibold hover:underline underline-offset-4">
          {exitLabel}
        </Link>
      </div>
    </section>
  );
}
