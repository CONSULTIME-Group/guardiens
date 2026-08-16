import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import DashboardSkeleton from "@/components/skeletons/DashboardSkeleton";
import { useDashboardData } from "./_components/dashboard/useDashboardData";
import { useActivityAnalysis } from "./_components/dashboard/useActivityAnalysis";
import { KpiCards } from "./_components/dashboard/KpiCards";
import { RecentActivity } from "./_components/dashboard/RecentActivity";
import { DashboardCharts } from "./_components/dashboard/DashboardCharts";
import { SignalsSection } from "./_components/dashboard/SignalsSection";
import { ActivityAnalysisCard } from "./_components/dashboard/ActivityAnalysisCard";
import { CronHealthCard } from "./_components/dashboard/CronHealthCard";
import { CollapsibleSection } from "./_components/dashboard/CollapsibleSection";
import { PilotageLinks } from "./_components/dashboard/PilotageLinks";
import { LiquidityBlock } from "./_components/dashboard/LiquidityBlock";

/**
 * Vue d'ensemble admin, six blocs :
 * 1. Liquidité de la place de marché (offre, demande, réponse, conversion)
 * 2. À traiter (narratif IA puis file d'actions fusionnée signaux + IA)
 * 3. État du service (KPI puis santé des crons)
 * 4. Activité récente (repliée)
 * 5. Tendances (repliées)
 * 6. Pilotage (cartes-liens vers les pages dédiées)
 */
const AdminOverview = () => {
  const { loading, stats, activity, weeklySignups, deptData } = useDashboardData();
  const {
    analysis,
    loading: analysisLoading,
    refreshing: analysisRefreshing,
    refresh: refreshAnalysis,
  } = useActivityAnalysis();

  if (loading || !stats) return <DashboardSkeleton />;

  return (
    <div className="space-y-6 p-4 md:p-6 max-w-7xl mx-auto">
      <AdminPageHeader
        title="Vue d'ensemble"
        description="Vue d'ensemble de l'activité Guardiens : membres, annonces, gardes, tendances et signaux."
      />

      {/* 1. Liquidité */}
      <LiquidityBlock />

      {/* 2. À traiter */}
      <ActivityAnalysisCard
        analysis={analysis}
        loading={analysisLoading}
        refreshing={analysisRefreshing}
        onRefresh={refreshAnalysis}
      />
      <SignalsSection
        aiActions={Array.isArray(analysis?.actions) ? analysis.actions : []}
        aiLoading={analysisLoading}
      />

      {/* 3. État du service */}
      <KpiCards stats={stats} />
      <CronHealthCard />

      {/* 4. Activité récente (repliée) */}
      <RecentActivity activity={activity} />

      {/* 5. Tendances (repliées) */}
      <CollapsibleSection title="Tendances">
        <DashboardCharts weeklySignups={weeklySignups} deptData={deptData} />
      </CollapsibleSection>

      {/* 6. Pilotage */}
      <PilotageLinks />
    </div>
  );
};

export default AdminOverview;
