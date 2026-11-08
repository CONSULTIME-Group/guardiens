/**
 * Lot ONB1 (point 4) : remplissage du profil par semaine d'inscription,
 * gardiens d'un côté, propriétaires et double rôle de l'autre, sur les
 * comptes inscrits depuis au moins 7 jours. Une lecture paginée de profiles.
 */
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { fetchAllRows } from "@/lib/admin/fetchAllRows";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ErrorState, LoadingState } from "@/components/admin/ui";
import {
  COMPLETION_THRESHOLD, MATURE_AFTER_DAYS, cohortsSince, computeCompletionCohorts,
  type CohortWeek, type CompletionRow, type GroupStats,
} from "@/lib/admin/profileCompletionCohorts";

const cell = (g: GroupStats, w: CohortWeek) => {
  if (g.mature > 0) return `${g.shareAbove} % · médiane ${g.median} % (${g.mature})`;
  return w.partial ? `lisible le ${w.completeFrom}` : "0 compte";
};

const ProfileCompletionCohortsCard = () => {
  const q = useQuery({
    queryKey: ["admin", "onb1-completion-cohorts"],
    queryFn: async () => {
      const now = new Date();
      const since = cohortsSince(now).toISOString();
      const { rows, truncated } = await fetchAllRows<CompletionRow>((from, to) =>
        supabase
          .from("profiles")
          .select("role, profile_completion, created_at, id")
          .gte("created_at", since)
          .or("account_status.is.null,account_status.neq.deleted")
          .order("created_at", { ascending: true })
          .order("id", { ascending: true })
          .range(from, to) as unknown as PromiseLike<{ data: CompletionRow[] | null; error: unknown }>,
      );
      return { weeks: computeCompletionCohorts(rows, now), truncated };
    },
    staleTime: 5 * 60_000,
  });

  return (
    <Card data-testid="onb1-completion-cohorts">
      <CardHeader>
        <CardTitle className="text-base">Profils remplis, par rôle et par semaine d'inscription</CardTitle>
      </CardHeader>
      <CardContent>
        {q.isLoading && <LoadingState label="Lecture des profils…" />}
        {q.error && <ErrorState detail={(q.error as Error).message} onRetry={() => q.refetch()} />}
        {q.data && (
          <div className="overflow-x-auto">
            <table className="w-full text-sm whitespace-nowrap">
              <thead>
                <tr className="text-left text-muted-foreground">
                  <th className="py-2 pr-3 font-medium">Semaine du</th>
                  <th className="py-2 pr-3 font-medium">Inscrits</th>
                  <th className="py-2 pr-3 font-medium">Part propriétaires</th>
                  <th className="py-2 pr-3 font-medium">Gardiens à {COMPLETION_THRESHOLD} % ou plus</th>
                  <th className="py-2 font-medium">Propriétaires à {COMPLETION_THRESHOLD} % ou plus</th>
                </tr>
              </thead>
              <tbody>
                {q.data.weeks.map((w) => (
                  <tr key={w.weekStart} className="border-t border-border">
                    <td className="py-2 pr-3">{w.label}{w.partial ? " (provisoire)" : ""}</td>
                    <td className="py-2 pr-3">{w.signups}</td>
                    <td className="py-2 pr-3">{w.ownerShare === null ? "" : `${w.ownerShare} %`}</td>
                    <td className="py-2 pr-3">{cell(w.sitter, w)}</td>
                    <td className="py-2">{cell(w.owner, w)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <p className="text-xs text-muted-foreground mt-3">
          Score actuel des comptes inscrits depuis au moins {MATURE_AFTER_DAYS} jours (entre parenthèses : leur nombre). Les propriétaires comprennent le double rôle. Comparer un rôle d'une semaine à l'autre : la moyenne de tous les comptes bouge avec la part de propriétaires, dont le barème est plus exigeant.
          {q.data?.truncated ? " Données partielles : plafond de lecture atteint." : ""}
        </p>
      </CardContent>
    </Card>
  );
};

export default ProfileCompletionCohortsCard;
