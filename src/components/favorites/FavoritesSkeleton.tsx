import { Skeleton } from "@/components/ui/skeleton";

/** Squelette de chargement pour la page Favoris.
 *  Reflète la structure réelle (tabs sticky + liste de cartes)
 *  pour éviter tout décalage de mise en page. */
const CardSkeleton = () => (
  <div className="flex items-center gap-3 p-3 border border-border rounded-xl min-h-[60px]">
    <Skeleton className="h-10 w-10 rounded-full shrink-0" />
    <div className="flex-1 space-y-2 min-w-0">
      <Skeleton className="h-3.5 w-2/3" />
      <Skeleton className="h-3 w-1/3" />
    </div>
    <Skeleton className="h-8 w-8 rounded-full shrink-0" />
  </div>
);

const FavoritesSkeleton = ({ count = 4 }: { count?: number }) => (
  <div className="space-y-3 animate-pulse" aria-hidden="true">
    {Array.from({ length: count }).map((_, i) => (
      <CardSkeleton key={i} />
    ))}
  </div>
);

export default FavoritesSkeleton;
