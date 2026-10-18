import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { associationLocalActions, hasActionPoint, missionLocalAction, type LocalAction } from "@/lib/localUsefulActions";

export interface LocalUsefulActionData {
  point: { latitude: number; longitude: number } | null;
  skills: string[];
  interests: string[];
  actions: LocalAction[];
}

export function useLocalUsefulActions(userId: string | undefined) {
  return useQuery({
    queryKey: ["local-useful-actions", userId], enabled: !!userId, staleTime: 60_000,
    queryFn: async (): Promise<LocalUsefulActionData> => {
      // Une lecture pour les trois sources. Le serveur utilise auth.uid(),
      // jamais l'identifiant ni les coordonnées d'un autre membre.
      const { data, error } = await (supabase as any).rpc("local_useful_action_sources");
      if (error) throw error;
      if (!data?.point || !hasActionPoint(data.point)) return { point: null, skills: [], interests: [], actions: [] };
      return {
        point: data.point,
        skills: Array.isArray(data.skills) ? data.skills.filter((s: unknown): s is string => typeof s === "string") : [],
        interests: Array.isArray(data.interests) ? data.interests.filter((s: unknown): s is string => typeof s === "string") : [],
        actions: [
          ...(Array.isArray(data.missions) ? data.missions : []).flatMap((row: any) => { const a = missionLocalAction(row, userId!); return a ? [a] : []; }),
          ...(Array.isArray(data.associations) ? data.associations : []).flatMap((row: any) => associationLocalActions(row)),
        ],
      };
    },
  });
}
