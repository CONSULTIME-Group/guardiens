import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface CityStats {
  guardiansCount: number;
  activeListings: number;
  loading: boolean;
}

export function useCityStats(
  departmentCode: string,
  cityName: string
): CityStats {
  const [stats, setStats] = useState<CityStats>({
    guardiansCount: 0,
    activeListings: 0,
    loading: true,
  });

  useEffect(() => {
    let cancelled = false;

    async function fetchStats() {
      try {
        // Count verified sitters in same city or nearby
        const { count: sitterCount } = await supabase
          .from("profiles")
          .select("id", { count: "exact", head: true })
          .in("role", ["sitter", "both"])
          .ilike("city", `%${cityName}%`);

        // Count active sits
        const { count: sitCount } = await supabase
          .from("sits")
          .select("id", { count: "exact", head: true })
          .eq("status", "published");

        if (!cancelled) {
          setStats({
            guardiansCount: sitterCount || 0,
            activeListings: sitCount || 0,
            loading: false,
          });
        }
      } catch {
        if (!cancelled) {
          setStats({ guardiansCount: 0, activeListings: 0, loading: false });
        }
      }
    }

    fetchStats();
    return () => { cancelled = true; };
  }, [departmentCode, cityName]);

  return stats;
}
