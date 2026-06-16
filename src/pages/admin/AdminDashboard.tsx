import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { ExternalLink } from "lucide-react";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { useDashboardData } from "./_components/dashboard/useDashboardData";
import { TodoSection } from "./_components/dashboard/TodoSection";
import { RecentActivity } from "./_components/dashboard/RecentActivity";
import { KpiCards } from "./_components/dashboard/KpiCards";
import { DashboardCharts } from "./_components/dashboard/DashboardCharts";
import { OnboardingReminderCard } from "./_components/dashboard/OnboardingReminderCard";
import { AcquisitionPilotCard } from "./_components/dashboard/AcquisitionPilotCard";
import AffinityPilotCard from "./_components/dashboard/AffinityPilotCard";

const AdminDashboard = () => {
  const { loading, stats, actionCards, lateCards, activity, weeklySignups, deptData } = useDashboardData();

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-48" />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3].map(i => <Skeleton key={i} className="h-24 rounded-xl" />)}
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
          {[1, 2, 3, 4, 5, 6].map(i => <Skeleton key={i} className="h-28 rounded-lg" />)}
        </div>
      </div>
    );
  }

  if (!stats) return null;

  return (
    <div className="space-y-8">
      <AdminPageHeader
        title="Vue d'ensemble"
        description="Actions à mener, signaux d'alerte et indicateurs clés de la plateforme."
        actions={
          <Button variant="outline" size="sm" asChild>
            <a href="https://analytics.google.com/analytics/web/#/p/G-9JP4VR1RRP" target="_blank" rel="noopener noreferrer">
              <ExternalLink className="h-4 w-4 mr-2" />
              Google Analytics
            </a>
          </Button>
        }
      />

      <TodoSection actionCards={actionCards} lateCards={lateCards} />
      <RecentActivity activity={activity} />
      <KpiCards stats={stats} />
      <AcquisitionPilotCard />
      <DashboardCharts weeklySignups={weeklySignups} deptData={deptData} />
      <OnboardingReminderCard />
    </div>
  );
};

export default AdminDashboard;
