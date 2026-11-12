import { useFeatureFlag } from "@/hooks/useFeatureFlag";
import { useAdmin } from "@/hooks/useAdmin";
import { OUTINGS_FLAG } from "@/lib/outings";

/**
 * Lot SORT1 : les sorties sont visibles quand le drapeau est allumé. Tant
 * qu'il est éteint, seuls les comptes admin les voient, pour la recette en
 * production avant l'ouverture.
 */
export function useOutingsEnabled(): { enabled: boolean; loading: boolean; preview: boolean } {
  const flag = useFeatureFlag(OUTINGS_FLAG);
  const admin = useAdmin();
  const flagOn = flag.enabled === true;
  const isAdmin = admin.isAdmin === true;
  return {
    enabled: flagOn || isAdmin,
    loading: flag.loading === true || admin.loading === true,
    preview: !flagOn && isAdmin,
  };
}
