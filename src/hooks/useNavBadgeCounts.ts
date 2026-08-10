import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

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

      const { data: convs } = await supabase
        .from("conversations")
        .select("id, small_mission_id")
        .or(`owner_id.eq.${userId},sitter_id.eq.${userId}`);

      const convIds = (convs ?? []).map((c: any) => c.id);
      if (convIds.length > 0) {
        const { count } = await supabase
          .from("messages")
          .select("id", { count: "exact", head: true })
          .in("conversation_id", convIds)
          .neq("sender_id", userId)
          .is("read_at", null);
        result.unreadCount = count || 0;

        const missionConvIds = (convs ?? [])
          .filter((c: any) => c.small_mission_id)
          .map((c: any) => c.id);
        if (missionConvIds.length > 0) {
          const { count: mCount } = await supabase
            .from("messages")
            .select("id", { count: "exact", head: true })
            .in("conversation_id", missionConvIds)
            .neq("sender_id", userId)
            .is("read_at", null);
          result.missionBadgeCount = mCount || 0;
        }
      }

      const { data: userSits } = await supabase
        .from("sits")
        .select("id")
        .eq("user_id", userId);
      if (userSits?.length) {
        const { count: appCount } = await supabase
          .from("applications")
          .select("id", { count: "exact", head: true })
          .in("sit_id", userSits.map((s: any) => s.id))
          .eq("status", "pending");
        result.ownerInboxCount = appCount || 0;
      }

      const { count: myAppsCount } = await supabase
        .from("applications")
        .select("id", { count: "exact", head: true })
        .eq("sitter_id", userId)
        .eq("status", "pending");
      result.sitterActionCount = myAppsCount || 0;

      return result;
    },
  });

  return data ?? EMPTY;
}
