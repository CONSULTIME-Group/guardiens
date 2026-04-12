import { Skeleton } from "@/components/ui/skeleton";

const ProfileSkeleton = () => (
  <div className="max-w-4xl mx-auto px-4 py-8 space-y-6 animate-in fade-in-0">
    {/* Avatar + name */}
    <div className="flex items-center gap-4">
      <Skeleton className="h-20 w-20 rounded-full" />
      <div className="space-y-2">
        <Skeleton className="h-6 w-40" />
        <Skeleton className="h-4 w-24" />
      </div>
    </div>
    {/* Bio */}
    <div className="space-y-2">
      <Skeleton className="h-4 w-full" />
      <Skeleton className="h-4 w-3/4" />
    </div>
    {/* Cards */}
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <Skeleton className="h-32 rounded-xl" />
      <Skeleton className="h-32 rounded-xl" />
    </div>
    {/* Gallery */}
    <div className="grid grid-cols-3 gap-2">
      {Array.from({ length: 3 }).map((_, i) => (
        <Skeleton key={i} className="aspect-square rounded-lg" />
      ))}
    </div>
  </div>
);

export default ProfileSkeleton;
