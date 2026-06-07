import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export function useAllMissions(currentUserId?: string) {
  return useQuery({
    queryKey: ["small-missions-all"],
    staleTime: 2 * 60 * 1000,
    queryFn: async () => {
      const { data: missions } = await supabase
        .from("small_missions")
        .select("*, mission_type, profiles:user_id(first_name, avatar_url, bio)")
        .in("status", ["open", "in_progress", "completed"] as any[])
        .order("created_at", { ascending: false })
        .limit(200);

      if (!missions || missions.length === 0) return [];

      const missionIds = missions.map((m: any) => m.id);
      const { data: responses } = await supabase
        .from("small_mission_responses")
        .select("mission_id, responder_id")
        .in("mission_id", missionIds);

      const countMap = new Map<string, number>();
      const myResponseSet = new Set<string>();
      (responses || []).forEach((r: any) => {
        countMap.set(r.mission_id, (countMap.get(r.mission_id) || 0) + 1);
        if (r.responder_id === currentUserId) myResponseSet.add(r.mission_id);
      });

      return missions.map((m: any) => ({
        ...m,
        response_count: countMap.get(m.id) || 0,
        already_proposed: myResponseSet.has(m.id),
      }));
    },
  });
}

export function useAvailableHelpers(currentUserId: string | undefined, enabled: boolean) {
  return useQuery({
    queryKey: ["available-helpers"],
    staleTime: 2 * 60 * 1000,
    queryFn: async () => {
      const { data } = await supabase
        .from("profiles")
        .select("id, first_name, avatar_url, city, postal_code, skill_categories, available_for_help, custom_skills, bio, latitude, longitude, identity_verified")
        .eq("available_for_help", true)
        .not("skill_categories", "eq", "{}")
        .limit(200);
      if (!data) return [];

      const helperIds = data.map((h: any) => h.id);

      const { data: sitterProfiles } = await supabase
        .from("sitter_profiles")
        .select("user_id, competences")
        .in("user_id", helperIds);

      const competenceMap = new Map<string, string[]>();
      (sitterProfiles || []).forEach((sp: any) => {
        if (sp.competences?.length) competenceMap.set(sp.user_id, sp.competences);
      });

      const { data: reviews } = await supabase
        .from("reviews")
        .select("reviewee_id, overall_rating")
        .in("reviewee_id", helperIds)
        .eq("published", true);

      const reviewMap = new Map<string, { count: number; total: number }>();
      (reviews || []).forEach((r: any) => {
        const current = reviewMap.get(r.reviewee_id) || { count: 0, total: 0 };
        reviewMap.set(r.reviewee_id, { count: current.count + 1, total: current.total + r.overall_rating });
      });

      const { data: apps } = await supabase
        .from("applications")
        .select("sitter_id")
        .in("sitter_id", helperIds)
        .eq("status", "accepted");

      const sitsMap = new Map<string, number>();
      (apps || []).forEach((a: any) => {
        sitsMap.set(a.sitter_id, (sitsMap.get(a.sitter_id) || 0) + 1);
      });

      return data
        .filter((h: any) => h.id !== currentUserId)
        .map((h: any) => {
          const rev = reviewMap.get(h.id);
          return {
            ...h,
            competences: competenceMap.get(h.id) || [],
            review_avg: rev ? rev.total / rev.count : 0,
            review_count: rev?.count || 0,
            sits_count: sitsMap.get(h.id) || 0,
          };
        });
    },
    enabled,
  });
}
