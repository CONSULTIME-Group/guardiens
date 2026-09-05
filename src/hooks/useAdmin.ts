import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

/**
 * Vérifie le rôle admin via la RPC has_role.
 * Passé sous React Query pour dédupliquer les appels : plusieurs montages
 * simultanés (en-têtes, menus) partagent la même queryKey et le même cache.
 */
export const useAdmin = () => {
  const { user } = useAuth();
  const userId = user?.id;

  const { data, isFetching } = useQuery({
    queryKey: ["is-admin", userId],
    enabled: !!userId,
    staleTime: 10 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
    refetchOnWindowFocus: false,
    queryFn: async () => {
      const { data, error } = await supabase.rpc("has_role", {
        _user_id: userId as string,
        _role: "admin",
      });
      if (error) return false;
      return data === true;
    },
  });

  if (!userId) {
    return { isAdmin: false, loading: false };
  }

  return {
    isAdmin: data === true,
    loading: data === undefined && isFetching,
  };
};
