/**
 * Skeleton de chargement pour la liste de conversations.
 * Imite la structure visuelle réelle pour éviter le layout shift.
 */
const MessagesListSkeleton = ({ rows = 6 }: { rows?: number }) => (
  <div className="flex flex-col" aria-hidden="true" role="presentation">
    {/* Header skeleton */}
    <div className="p-4 border-b border-border space-y-3">
      <div className="h-6 w-32 bg-muted rounded animate-pulse" />
      <div className="flex gap-2">
        {[60, 70, 80, 90].map((w, i) => (
          <div key={i} className="h-6 rounded-full bg-muted animate-pulse" style={{ width: w }} />
        ))}
      </div>
      <div className="h-3 w-48 bg-muted/70 rounded animate-pulse" />
    </div>

    {/* Search skeleton */}
    <div className="px-3 py-2 border-b border-border">
      <div className="h-8 w-full bg-muted rounded-lg animate-pulse" />
    </div>

    {/* Group title */}
    <div className="bg-muted/40 px-4 py-2">
      <div className="h-3 w-40 bg-muted rounded animate-pulse" />
    </div>

    {/* Conversation rows */}
    {Array.from({ length: rows }).map((_, i) => (
      <div key={i} className="flex items-start gap-3 p-3.5 pl-6 pr-10 border-b border-border/50">
        <div className="w-11 h-11 rounded-full bg-muted shrink-0 animate-pulse" />
        <div className="flex-1 space-y-2 py-1">
          <div className="flex items-center justify-between gap-2">
            <div className="h-3.5 w-24 bg-muted rounded animate-pulse" />
            <div className="h-3 w-10 bg-muted/60 rounded animate-pulse" />
          </div>
          <div className="h-3 w-32 bg-muted/60 rounded animate-pulse" />
          <div className="h-3 w-full max-w-[200px] bg-muted/50 rounded animate-pulse" />
        </div>
      </div>
    ))}
  </div>
);

export default MessagesListSkeleton;
