import { Skeleton } from "@/components/ui/skeleton";

const DashboardSkeleton = () => (
  <div className="max-w-4xl mx-auto px-4 py-8 space-y-6 animate-in fade-in-0">
    {/* Welcome */}
    <Skeleton className="h-8 w-64" />
    <Skeleton className="h-4 w-48" />
    {/* Stats row */}
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      {Array.from({ length: 4 }).map((_, i) => (
        <Skeleton key={i} className="h-24 rounded-xl" />
      ))}
    </div>
    {/* Action cards */}
    <div className="space-y-4">
      <Skeleton className="h-40 rounded-xl" />
      <Skeleton className="h-40 rounded-xl" />
    </div>
  </div>
);

export default DashboardSkeleton;
