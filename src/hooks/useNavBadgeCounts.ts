import { fetchMySitsIndex, fetchMyApplicationsIndex, fetchMyConversationsIndex, fetchApplicationsOnMySits } from "@/lib/dashboardShared";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { messagesUnreadExclusive } from "@/lib/navModel";

export interface NavBadgeCounts {
  unreadCount: number;
  ownerInboxCount: number;
  sitterActionCount: number;
  missionBadgeCount: number;
}

const EMPTY: NavBadgeCounts = {
  unreadCount: 0,
  ownerInboxCount: 0,
  sitterActionCount: 0,
  missionBadgeCount: 0,
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
              .then((rows) => ({ count: rows.filter((a: any) => a.status === "pending").length }))
              .catch(() => ({ count: 0 }))
          : Promise.resolve({ count: 0 } as any),
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

      return result;
    },

  });

  return data ?? EMPTY;
}
