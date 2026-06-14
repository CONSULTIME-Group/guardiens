import { Skeleton } from "@/components/ui/skeleton";

/**
 * Skeleton fidèle au layout réel du SitterDashboard.
 * Évite le layout shift et respecte le précepte #3 (jamais de spinner générique).
 */
const SitterDashboardSkeleton = () => (
  <div className="space-y-6 pb-24 md:pb-8 animate-in fade-in-0" role="status" aria-busy="true" aria-label="Chargement de votre espace gardien">
    {/* Cockpit : avatar + greeting + priority action */}
    <div className="px-4 sm:px-5 md:px-8 pt-4 space-y-4">
      <div className="flex items-center gap-3">
        <Skeleton className="h-12 w-12 rounded-full shrink-0" />
        <div className="flex-1 space-y-2">
          <Skeleton className="h-5 w-40" />
          <Skeleton className="h-3 w-56" />
        </div>
      </div>
      <Skeleton className="h-32 w-full rounded-2xl" />
    </div>

    {/* Checklist activation */}
    <div className="px-4 sm:px-5 md:px-8 space-y-3">
      <Skeleton className="h-4 w-44" />
      <Skeleton className="h-2 w-full rounded-full" />
      <Skeleton className="h-24 w-full rounded-2xl" />
    </div>

    {/* Découverte : 2 zones colorées */}
    <div className="px-4 sm:px-5 md:px-8 space-y-4">
      <Skeleton className="h-48 w-full rounded-2xl" />
      <Skeleton className="h-48 w-full rounded-2xl" />
    </div>

    <span className="sr-only">Chargement en cours…</span>
  </div>
);

export default SitterDashboardSkeleton;
