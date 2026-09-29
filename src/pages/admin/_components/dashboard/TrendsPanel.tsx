import { ErrorState, LoadingState } from "@/components/admin/ui";
import { useDashboardTrends } from "./useDashboardData";
import { DashboardCharts } from "./DashboardCharts";

/**
 * Lot A13 : chargé par import différé à l'ouverture de la section Tendances,
 * pour que la bibliothèque de graphiques et la lecture complète des profils
 * restent hors du premier chargement.
 */
const TrendsPanel = () => {
  const trends = useDashboardTrends(true);
  if (trends.loading) return <LoadingState label="Chargement des tendances…" />;
  if (trends.error) return <ErrorState detail={trends.error} />;
  return (
    <>
      {trends.partial && <p className="text-xs text-warning mb-2">Données partielles : plafond de 50 000 lignes atteint.</p>}
      <DashboardCharts weeklySignups={trends.weeklySignups} deptData={trends.deptData} />
    </>
  );
};

export default TrendsPanel;
