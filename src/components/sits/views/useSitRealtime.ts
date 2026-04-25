/**
 * Synchronise la fiche annonce avec les changements en temps réel :
 *
 * - **`sits`** : si le statut ou `accepting_applications` change (ex. publication
 *   confirmée par un autre onglet, annulation, fermeture auto), la vue locale est
 *   patchée immédiatement sans refetch complet.
 *
 * - **`applications`** : tout INSERT/UPDATE/DELETE déclenche un recalcul léger
 *   (HEAD count, pas de SELECT complet) des compteurs `appCount` et `pendingAppCount`.
 *   Les filtres "non rejected/cancelled" et "pending/viewed/discussing" sont
 *   identiques à ceux du fetch initial dans `SitDetail.tsx`.
 *
 * Sécurité : on filtre côté Postgres (`filter: sit_id=eq.<id>`) pour ne recevoir
 * QUE les events liés à cette annonce. RLS continue de s'appliquer normalement.
 */
import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { SitData } from "./types";

interface UseSitRealtimeArgs {
  sitId: string | undefined;
  onSitChange: (patch: Partial<SitData>) => void;
  onApplicationsChange: (counts: { appCount: number; pendingAppCount: number }) => void;
}

export const useSitRealtime = ({
  sitId,
  onSitChange,
  onApplicationsChange,
}: UseSitRealtimeArgs) => {
  useEffect(() => {
    if (!sitId) return;

    const refreshCounts = async () => {
      const [allRes, pendingRes] = await Promise.all([
        supabase
          .from("applications")
          .select("id", { count: "exact", head: true })
          .eq("sit_id", sitId)
          .not("status", "in", "(rejected,cancelled)"),
        supabase
          .from("applications")
          .select("id", { count: "exact", head: true })
          .eq("sit_id", sitId)
          .in("status", ["pending", "viewed", "discussing"]),
      ]);
      onApplicationsChange({
        appCount: allRes.count || 0,
        pendingAppCount: pendingRes.count || 0,
      });
    };

    const channel = supabase
      .channel(`sit-detail-${sitId}`)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "sits",
          filter: `id=eq.${sitId}`,
        },
        (payload) => {
          // On ne propage QUE les champs susceptibles de changer pendant la session.
          const next = payload.new as Partial<SitData>;
          onSitChange({
            status: next.status,
            accepting_applications: next.accepting_applications,
            max_applications: next.max_applications,
            start_date: next.start_date,
            end_date: next.end_date,
            flexible_dates: next.flexible_dates,
            title: next.title,
            specific_expectations: next.specific_expectations,
            open_to: next.open_to,
          });
        },
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "applications",
          filter: `sit_id=eq.${sitId}`,
        },
        () => {
          void refreshCounts();
        },
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [sitId, onSitChange, onApplicationsChange]);
};
