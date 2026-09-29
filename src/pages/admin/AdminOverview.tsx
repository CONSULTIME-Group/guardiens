import { useState } from "react";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import DashboardSkeleton from "@/components/skeletons/DashboardSkeleton";
import { useDashboardData, useDashboardTrends } from "./_components/dashboard/useDashboardData";
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
import { AnimateCard } from "./_components/dashboard/AnimateCard";
import { VolunteerAvailabilityCard } from "./_components/dashboard/VolunteerAvailabilityCard";


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
  const { loading, error, stats, activity } = useDashboardData();
  const [trendsOpened, setTrendsOpened] = useState(false);
  const trends = useDashboardTrends(trendsOpened);
  const {
    analysis,
    loading: analysisLoading,
    refreshing: analysisRefreshing,
    refresh: refreshAnalysis,
  } = useActivityAnalysis();

  if (loading) return <DashboardSkeleton />;

  return (
    <div className="space-y-6">
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
      <AnimateCard />

      {/* 3. État du service */}
      {stats ? (
        <KpiCards stats={stats} />
      ) : (
        <p role="alert" className="rounded-xl border border-destructive/40 bg-destructive/5 p-4 text-sm text-destructive">
          {error ?? "Chiffre indisponible"} : les chiffres clés n'ont pas pu être lus.
        </p>
      )}
      <CronHealthCard />
      <VolunteerAvailabilityCard />


      {/* 4. Activité récente (repliée) */}
      <RecentActivity activity={activity} />

      {/* 5. Tendances (repliées) */}
      <CollapsibleSection title="Tendances" onOpenChange={(o) => o && setTrendsOpened(true)}>
        {trends.loading && <p className="text-sm text-muted-foreground">Chargement des tendances…</p>}
        {trends.error && <p role="alert" className="text-sm text-destructive">{trends.error}</p>}
        {trends.partial && (
          <p className="text-xs text-warning mb-2">Données partielles : plafond de 50 000 lignes atteint.</p>
        )}
        {!trends.loading && !trends.error && trendsOpened && (
          <DashboardCharts weeklySignups={trends.weeklySignups} deptData={trends.deptData} />
        )}
      </CollapsibleSection>

      {/* 6. Pilotage */}
      <PilotageLinks />
    </div>
  );
};

export default AdminOverview;


