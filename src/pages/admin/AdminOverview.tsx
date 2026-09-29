import { Suspense, useEffect, useState } from "react";
import { lazyWithRetry as lazy } from "@/lib/lazyWithRetry";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { LoadingState } from "@/components/admin/ui";
import { useKeyFigures, useRecentActivity } from "./_components/dashboard/useDashboardData";
import { useActivityAnalysis } from "./_components/dashboard/useActivityAnalysis";
import { KeyFiguresRow } from "./_components/dashboard/KeyFiguresRow";
import { RecentActivity } from "./_components/dashboard/RecentActivity";
import { SignalsSection } from "./_components/dashboard/SignalsSection";
import { ActivityAnalysisCard } from "./_components/dashboard/ActivityAnalysisCard";
import { CronHealthCard } from "./_components/dashboard/CronHealthCard";
import { CollapsibleSection } from "./_components/dashboard/CollapsibleSection";
import { AnimateCard } from "./_components/dashboard/AnimateCard";

// Import différé : recharts ne se charge qu'à l'ouverture de Tendances.
const TrendsPanel = lazy(() => import("./_components/dashboard/TrendsPanel"), "TrendsPanel");

/**
 * Vue d'ensemble admin (lot A13), lisible en 30 secondes, sans squelette
 * global : chaque bloc charge et s'affiche seul.
 * 1. Chiffres clés (membres, annonces, gardes, liquidité)
 * 2. À traiter  3. À animer
 * 4. Activité récente (dépliée)  5. Tendances (repliée, chargement différé)
 * 6. Santé des crons (une ligne, lecture différée)
 * 7. Analyse IA (repliée, lecture en base, génération au clic)
 */
const AdminOverview = () => {
  const [trendsOpened, setTrendsOpened] = useState(false);
  const keyFigures = useKeyFigures();
  const activity = useRecentActivity();
  const { analysis, loading: analysisLoading, error: analysisError, refreshing, refresh } = useActivityAnalysis();

  // Crons : lecture lancée après l'affichage des chiffres clés, jamais bloquante.
  const [cronReady, setCronReady] = useState(false);
  useEffect(() => {
    if (cronReady) return;
    if (!keyFigures.isLoading) setCronReady(true);
  }, [keyFigures.isLoading, cronReady]);

  const merged = [...(keyFigures.data?.recentSignups ?? []), ...(activity.data ?? [])]
    .sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime())
    .slice(0, 12);

  return (
    <div className="space-y-6">
      <AdminPageHeader
        title="Vue d'ensemble"
        description="Chiffres clés, actions à traiter et activité récente de Guardiens."
      />

      <div data-block="chiffres"><KeyFiguresRow /></div>

      <div data-block="a-traiter">
        <SignalsSection aiActions={Array.isArray(analysis?.actions) ? analysis!.actions : []} aiLoading={analysisLoading} />
      </div>

      <div data-block="a-animer"><AnimateCard /></div>

      <div data-block="activite">
        <RecentActivity activity={merged} loading={activity.isLoading} error={!!activity.error} />
      </div>

      <div data-block="tendances">
        <CollapsibleSection title="Tendances" onOpenChange={(o) => o && setTrendsOpened(true)}>
          {trendsOpened && (
            <Suspense fallback={<LoadingState label="Chargement des tendances…" />}>
              <TrendsPanel />
            </Suspense>
          )}
        </CollapsibleSection>
      </div>

      <div data-block="crons"><CronHealthCard enabled={cronReady} /></div>

      <div data-block="analyse">
        <ActivityAnalysisCard
          collapsible
          analysis={analysis}
          loading={analysisLoading}
          error={analysisError}
          refreshing={refreshing}
          onRefresh={refresh}
        />
      </div>
    </div>
  );
};

export default AdminOverview;
