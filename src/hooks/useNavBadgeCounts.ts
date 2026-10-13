import { fetchMySitsIndex, fetchMyApplicationsIndex, fetchMyConversationsIndex, fetchApplicationsOnMySits } from "@/lib/dashboardShared";
import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { syncAppBadge } from "@/lib/appBadge";
import { supabase } from "@/integrations/supabase/client";
import { messagesUnreadExclusive } from "@/lib/navModel";
import { summarizeAwaiting, sitStatusMap } from "@/lib/applicationsAwaiting";

export interface NavBadgeCounts {
  unreadCount: number;
  /**
   * Lot X3a (A-03) : candidatures reçues qui attendent une décision
   * (pending, viewed, discussing) sur des annonces encore ouvertes.
   */
  ownerInboxCount: number;
  sitterActionCount: number;
  missionBadgeCount: number;
  /** Lot X3a (A-07) : annonce de la plus ancienne candidature en attente. */
  ownerInboxSitId?: string | null;
}

const EMPTY: NavBadgeCounts = {
  unreadCount: 0,
  ownerInboxCount: 0,
  sitterActionCount: 0,
  missionBadgeCount: 0,
  ownerInboxSitId: null,
};

/**
 * Compteurs de pastilles de navigation.
 *
 * La barre latérale et la barre basse affichent les mêmes chiffres : sans
 * cache partagé, chaque instance montée relançait la même série de requêtes,
 * ce qui multipliait les appels réseau identiques sur un même écran. Une
 * seule clé de cache, un seul intervalle de rafraîchissement.
 */
export function useNavBadgeCounts(userId: string | undefined): NavBadgeCounts {
  const { data } = useQuery({
    queryKey: ["nav-badge-counts", userId],
    enabled: !!userId,
    staleTime: 30_000,
    refetchInterval: 60_000,
    refetchIntervalInBackground: false,
    refetchOnWindowFocus: true,
    queryFn: async (): Promise<NavBadgeCounts> => {
      if (!userId) return EMPTY;
      const result: NavBadgeCounts = { ...EMPTY };

      // Vague 1 : tout ce qui ne dépend que de userId.
      const [convsRes, userSitsRes, myAppsRes] = await Promise.all([
        fetchMyConversationsIndex(userId).then((data) => ({ data })).catch(() => ({ data: [] as any[] })),
        fetchMySitsIndex(userId).then((data) => ({ data })).catch(() => ({ data: [] as any[] })),
        fetchMyApplicationsIndex(userId)
          .then((rows) => ({ count: rows.filter((r) => r.status === "pending").length }))
          .catch(() => ({ count: 0 })),
      ]);

      const convs = convsRes.data ?? [];
      const convIds = convs.map((c: any) => c.id);
      const missionConvIds = convs
        .filter((c: any) => c.small_mission_id)
        .map((c: any) => c.id);
      const userSits = userSitsRes.data ?? [];
      result.sitterActionCount = myAppsRes.count || 0;

      // Vague 2 : les comptes qui dépendent des listes d'ids ci-dessus.
      const [unreadRes, missionUnreadRes, ownerInboxRes] = await Promise.all([
        convIds.length > 0
          ? supabase
              .from("messages")
              .select("id", { count: "exact", head: true })
              .in("conversation_id", convIds)
              .neq("sender_id", userId)
              .is("read_at", null)
          : Promise.resolve({ count: 0 } as any),
        missionConvIds.length > 0
          ? supabase
              .from("messages")
              .select("id", { count: "exact", head: true })
              .in("conversation_id", missionConvIds)
              .neq("sender_id", userId)
              .is("read_at", null)
          : Promise.resolve({ count: 0 } as any),
        userSits.length > 0
          ? fetchApplicationsOnMySits(userId)
              .then((rows) => {
                // Lot X3a (A-03) : une candidature ouverte une fois attend
                // toujours une décision, elle reste comptée.
                const summary = summarizeAwaiting(rows as any[], sitStatusMap(userSits));
                return { count: summary.count, sitId: summary.oldest?.sitId ?? null };
              })
              .catch(() => ({ count: 0, sitId: null }))
          : Promise.resolve({ count: 0, sitId: null } as any),
      ]);

      if (convIds.length > 0) {
        const totalUnread = unreadRes.count || 0;
        const missionUnread = missionUnreadRes.count || 0;
        // Choix de comptage : un même message non lu ne doit jamais alimenter
        // deux pastilles. La pastille Entraide compte les non lus des
        // conversations de petites missions ; la pastille Messages compte
        // tout le reste (total moins les missions). Voir navModel.ts.
        result.missionBadgeCount = missionUnread;
        result.unreadCount = messagesUnreadExclusive(totalUnread, missionUnread);
      }

      result.ownerInboxCount = ownerInboxRes.count || 0;
      result.ownerInboxSitId = ownerInboxRes.sitId ?? null;

      return result;
    },

  });

  // Lot N2 : pastille de l'icône alignée sur les messages non lus (Messages
  // et Entraide), même total que celui envoyé avec les notifications push.
  // Sans compte (chargement de la session), la pastille posée par le worker reste.
  useEffect(() => {
    if (userId && data) syncAppBadge(data.unreadCount + data.missionBadgeCount);
  }, [userId, data]);

  return data ?? EMPTY;
}
