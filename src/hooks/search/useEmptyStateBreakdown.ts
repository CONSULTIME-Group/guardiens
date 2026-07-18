import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { getDeptCode, DEPT_NAMES } from "@/lib/departments";
import { getRegionCode, getRegionName, getDeptsInRegion } from "@/lib/regions";

export interface NearbyZone {
  deptCode: string;
  deptName: string;
  regionCode: string;
  regionName: string;
  count: number;
}

export interface NearbyRegion {
  regionCode: string;
  regionName: string;
  count: number;
}

interface Params {
  loading: boolean;
  hasResults: boolean;
  tab: "sits" | "missions";
  cityPostalCode: string | null;
  userPostalCode: string | null;
}

/**
 * Calcule les compteurs d'EmptyState (cross-tab, lancement global,
 * départements/régions voisins) quand aucun résultat n'est trouvé.
 */
export function useEmptyStateBreakdown({
  loading,
  hasResults,
  tab,
  cityPostalCode,
  userPostalCode,
}: Params) {
  const [crossTabCount, setCrossTabCount] = useState<number | null>(null);
  const [launchModeCount, setLaunchModeCount] = useState<number | null>(null);
  const [nearbyZones, setNearbyZones] = useState<NearbyZone[]>([]);
  const [nearbyRegions, setNearbyRegions] = useState<NearbyRegion[]>([]);

  useEffect(() => {
    if (loading || hasResults) {
      setCrossTabCount(null);
      setLaunchModeCount(null);
      setNearbyZones([]);
      setNearbyRegions([]);
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const refPostal = cityPostalCode ?? userPostalCode;
        const refDept = getDeptCode(refPostal);
        const refRegion = getRegionCode(refDept);

        const [otherTabRes, sitsAllRes, missionsAllRes, breakdownRes] = await Promise.all([
          tab === "sits"
            ? supabase.from("small_missions").select("id", { count: "exact", head: true }).eq("status", "open")
            : supabase.from("sits").select("id", { count: "exact", head: true }).eq("status", "published"),
          supabase.from("sits").select("id", { count: "exact", head: true }).eq("status", "published"),
          supabase.from("small_missions").select("id", { count: "exact", head: true }).eq("status", "open"),
          tab === "sits"
            ? supabase.from("sits").select("user_id").in("status", ["published", "confirmed", "in_progress"]).limit(500)
            : supabase.from("small_missions").select("postal_code").eq("status", "open").limit(500),
        ]);
        if (cancelled) return;
        setCrossTabCount(otherTabRes.count ?? 0);
        setLaunchModeCount((sitsAllRes.count ?? 0) + (missionsAllRes.count ?? 0));

        const deptAgg = new Map<string, number>();
        const regionAgg = new Map<string, number>();
        for (const row of (breakdownRes.data || []) as any[]) {
          const cp = row?.postal_code || row?.owner?.postal_code || null;
          const dept = getDeptCode(cp);
          if (!dept) continue;
          const region = getRegionCode(dept);
          if (!region) continue;
          if (refDept && dept === refDept) continue;
          deptAgg.set(dept, (deptAgg.get(dept) || 0) + 1);
          regionAgg.set(region, (regionAgg.get(region) || 0) + 1);
        }

        const topDepts = Array.from(deptAgg.entries())
          .map(([deptCode, count]) => {
            const regionCode = getRegionCode(deptCode) || "";
            return {
              deptCode,
              deptName: DEPT_NAMES[deptCode] || deptCode,
              regionCode,
              regionName: getRegionName(deptCode) || "",
              count,
            };
          })
          .sort((a, b) => b.count - a.count)
          .slice(0, 4);

        const topRegions = Array.from(regionAgg.entries())
          .filter(([code]) => !refRegion || code !== refRegion)
          .map(([regionCode, count]) => ({
            regionCode,
            regionName: getRegionName(getDeptsInRegion(regionCode)[0] || null) || regionCode,
            count,
          }))
          .sort((a, b) => b.count - a.count)
          .slice(0, 4);

        setNearbyZones(topDepts);
        setNearbyRegions(topRegions);
      } catch {
        if (!cancelled) {
          setCrossTabCount(0);
          setLaunchModeCount(0);
          setNearbyZones([]);
          setNearbyRegions([]);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [loading, hasResults, tab, cityPostalCode, userPostalCode]);

  return { crossTabCount, launchModeCount, nearbyZones, nearbyRegions };
}
