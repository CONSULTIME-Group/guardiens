import { Suspense, useState } from "react";
import { lazyWithRetry as lazy } from "@/lib/lazyWithRetry";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { LoadingState } from "@/components/admin/ui";
import { useKeyFigures, useRecentActivity } from "./_components/dashboard/useDashboardData";
import { freshAiActions, useActivityAnalysis } from "./_components/dashboard/useActivityAnalysis";
import { KeyFiguresRow } from "./_components/dashboard/KeyFiguresRow";
import { RecentActivity } from "./_components/dashboard/RecentActivity";
import { SignalsSection } from "./_components/dashboard/SignalsSection";
import { ActivityAnalysisCard } from "./_components/dashboard/ActivityAnalysisCard";
import { CronHealthCard } from "./_components/dashboard/CronHealthCard";
import { CollapsibleSection } from "./_components/dashboard/CollapsibleSection";
import { AnimateCard } from "./_components/dashboard/AnimateCard";
import { SiteHealthStrip } from "./_components/dashboard/SiteHealthStrip";

// Import différé : recharts ne se charge qu'à l'ouverture de Tendances.
const TrendsPanel = lazy(() => import("./_components/dashboard/TrendsPanel"), "TrendsPanel");

/**
 * Vue d'ensemble admin. Lot ADM2 : l'accueil ouvre sur l'action.
 * 1. À traiter : membres qui attendent, puis la file d'actions
 * 2. Chiffres clés  3. Activité récente
 * 4. « Plus », replié : À animer, Tendances, Santé des crons, Analyse IA,
 *    chargés seulement à l'ouverture.
 * Les suggestions IA de plus de 24 h quittent la file.
 */
const AdminOverview = () => {
  const [moreOpened, setMoreOpened] = useState(false);
  const keyFigures = useKeyFigures();
  const activity = useRecentActivity();
  const { analysis, loading: analysisLoading, error: analysisError, refreshing, refresh } = useActivityAnalysis();

  const merged = [...(keyFigures.data?.recentSignups ?? []), ...(activity.data ?? [])]
    .sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime())
    .slice(0, 12);

  return (
    <div className="space-y-6">
      <AdminPageHeader
        title="Vue d'ensemble"
        description="L'état du site, ce qui attend une action, puis les chiffres clés et l'activité récente."
      />

      {/* Lot ADM6 : six voyants, rien à lire quand tout est vert. */}
      <div data-block="etat-du-site"><SiteHealthStrip /></div>

      <div data-block="a-traiter">
        <SignalsSection aiActions={freshAiActions(analysis)} aiLoading={analysisLoading} />
      </div>

      <div data-block="chiffres"><KeyFiguresRow /></div>

      <div data-block="activite">
        <RecentActivity activity={merged} loading={activity.isLoading} error={!!activity.error} />
      </div>

      <div data-block="plus">
        <CollapsibleSection
          title="Plus : animation, tendances, santé des crons, analyse IA"
          testId="overview-more"
          onOpenChange={(o) => o && setMoreOpened(true)}
        >
          {moreOpened && (
            <div className="space-y-6">
              <AnimateCard />
              <Suspense fallback={<LoadingState label="Chargement des tendances…" />}>
                <TrendsPanel />
              </Suspense>
              <CronHealthCard />
              <ActivityAnalysisCard
                analysis={analysis}
                loading={analysisLoading}
                error={analysisError}
                refreshing={refreshing}
                onRefresh={refresh}
              />
            </div>
          )}
        </CollapsibleSection>
      </div>
    </div>
  );
};

export default AdminOverview;
