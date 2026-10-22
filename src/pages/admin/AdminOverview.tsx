import { Suspense, useState } from "react";
import { lazyWithRetry as lazy } from "@/lib/lazyWithRetry";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { LoadingState } from "@/components/admin/ui";
import { useKeyFigures, useRecentActivity } from "./_components/dashboard/useDashboardData";
import { useActivityAnalysis } from "./_components/dashboard/useActivityAnalysis";
import { RecentActivity } from "./_components/dashboard/RecentActivity";
import { ActivityAnalysisCard } from "./_components/dashboard/ActivityAnalysisCard";
import { CronHealthCard } from "./_components/dashboard/CronHealthCard";
import { CollapsibleSection } from "./_components/dashboard/CollapsibleSection";
import { AnimateCard } from "./_components/dashboard/AnimateCard";
import { SiteHealthStrip } from "./_components/dashboard/SiteHealthStrip";
import { ProgressSection, SystemSection, TechnicalSignalsLine, TodaySection } from "./_components/dashboard/PilotageBlocks";

// Import différé : recharts ne se charge qu'à l'ouverture de Tendances.
const TrendsPanel = lazy(() => import("./_components/dashboard/TrendsPanel"), "TrendsPanel");

/** Contenu du bloc replié, lu seulement à l'ouverture (activité, IA, crons, tendances). */
const MoreContent = () => {
  const keyFigures = useKeyFigures();
  const activity = useRecentActivity();
  const { analysis, loading, error, refreshing, refresh } = useActivityAnalysis();
  const merged = [...(keyFigures.data?.recentSignups ?? []), ...(activity.data ?? [])]
    .sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime())
    .slice(0, 12);
  return (
    <div className="space-y-6">
      <RecentActivity activity={merged} loading={activity.isLoading} error={!!activity.error} />
      <AnimateCard />
      <Suspense fallback={<LoadingState label="Chargement des tendances…" />}>
        <TrendsPanel />
      </Suspense>
      <CronHealthCard />
      <ActivityAnalysisCard analysis={analysis} loading={loading} error={error} refreshing={refreshing} onRefresh={refresh} />
    </div>
  );
};

/**
 * Vue d'ensemble admin. Lot ADM10 (22/10/2026, maquette Claude Design
 * validée par Jérémie) : trois questions, dans l'ordre.
 * 1. Le site fonctionne ?  (voyants, puis signaux techniques repliés)
 * 2. Ce qui vous attend aujourd'hui  (départ sous 7 jours, puis ce que seul
 *    un fondateur peut faire ; chaque ligne ouvre ses cartes d'action)
 * 3. Guardiens avance ?  (quatre chiffres reliés à l'objectif)
 * Puis « Le système s'en charge » (relances automatiques, synthèse du lundi)
 * et, replié, activité récente, animation, tendances, tâches planifiées, IA.
 */
const AdminOverview = () => {
  const [moreOpened, setMoreOpened] = useState(false);
  return (
    <div className="mx-auto max-w-[1080px] space-y-10">
      <AdminPageHeader
        title="Vue d'ensemble"
        description="Le site fonctionne, ce qui attend votre main, puis ce qui avance."
      />

      <section data-block="site" aria-labelledby="pilotage-site" className="space-y-2">
        <h2 id="pilotage-site" className="text-[13px] font-semibold text-muted-foreground">Le site fonctionne ?</h2>
        <SiteHealthStrip />
        <TechnicalSignalsLine />
      </section>

      <div data-block="a-faire"><TodaySection /></div>

      <div data-block="avance"><ProgressSection /></div>

      <div data-block="systeme"><SystemSection /></div>

      <div data-block="plus">
        <CollapsibleSection
          title="Pour aller plus loin : activité récente, animation, tendances, tâches planifiées, analyse IA"
          testId="overview-more"
          onOpenChange={(o) => o && setMoreOpened(true)}
        >
          {moreOpened && <MoreContent />}
        </CollapsibleSection>
      </div>
    </div>
  );
};

export default AdminOverview;
