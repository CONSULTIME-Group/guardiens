import { Skeleton } from "@/components/ui/skeleton";

interface Props {
  count?: number;
}

const ListSkeleton = ({ count = 4 }: Props) => (
  <div className="max-w-4xl mx-auto px-4 py-8 space-y-4 animate-in fade-in-0">
    <Skeleton className="h-8 w-48 mb-2" />
    {Array.from({ length: count }).map((_, i) => (
      <div key={i} className="flex items-center gap-4 p-4 border rounded-xl">
        <Skeleton className="h-12 w-12 rounded-full shrink-0" />
        <div className="flex-1 space-y-2">
          <Skeleton className="h-4 w-3/4" />
          <Skeleton className="h-3 w-1/2" />
        </div>
        <Skeleton className="h-8 w-20 rounded-md" />
      </div>
    ))}
  </div>
);

export default ListSkeleton;
