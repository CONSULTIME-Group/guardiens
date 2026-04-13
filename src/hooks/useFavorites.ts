import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export function useFavorites(targetType?: "sitter" | "sit") {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["favorites", user?.id, targetType],
    queryFn: async () => {
      let query = (supabase as any)
        .from("favorites")
        .select("*")
        .eq("user_id", user!.id)
        .order("created_at", { ascending: false });
      if (targetType) query = query.eq("target_type", targetType);
      const { data, error } = await query;
      if (error) throw error;
      return (data || []) as { id: string; user_id: string; target_type: string; target_id: string; created_at: string }[];
    },
    enabled: !!user,
  });
}

export function useIsFavorite(targetType: "sitter" | "sit", targetId: string | undefined) {
  const { user } = useAuth();

  const { data: favorites } = useQuery({
    queryKey: ["favorites", user?.id],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("favorites")
        .select("target_id, target_type")
        .eq("user_id", user!.id);
      if (error) throw error;
      return (data || []) as { target_id: string; target_type: string }[];
    },
    enabled: !!user,
    staleTime: 30_000,
  });

  return favorites?.some(f => f.target_type === targetType && f.target_id === targetId) ?? false;
}

export function useToggleFavorite() {
  const { user } = useAuth();
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async ({ targetType, targetId, isFavorite }: { targetType: "sitter" | "sit"; targetId: string; isFavorite: boolean }) => {
      if (!user) throw new Error("Not authenticated");
      if (isFavorite) {
        await (supabase as any)
          .from("favorites")
          .delete()
          .eq("user_id", user.id)
          .eq("target_type", targetType)
          .eq("target_id", targetId);
      } else {
        await (supabase as any)
          .from("favorites")
          .insert({ user_id: user.id, target_type: targetType, target_id: targetId });
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["favorites", user?.id] });
    },
  });
}
