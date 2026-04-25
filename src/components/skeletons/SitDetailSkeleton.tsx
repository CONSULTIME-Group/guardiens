/**
 * Skeleton de chargement pour SitDetail / PublicSitDetail.
 * Reproduit la structure visuelle pour éviter le flash de mise en page.
 */
const SitDetailSkeleton = () => {
  return (
    <div className="p-6 md:p-10 max-w-4xl mx-auto pb-44 md:pb-40 animate-fade-in">
      {/* Back link */}
      <div className="h-4 w-40 bg-muted rounded mb-6 animate-pulse" />

      {/* Hero */}
      <div className="w-full h-72 md:h-96 bg-muted rounded-xl mb-2 animate-pulse" />
      <div className="flex gap-1.5 mb-6">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="w-16 h-12 bg-muted rounded-md animate-pulse" />
        ))}
      </div>

      {/* Title */}
      <div className="h-8 md:h-10 w-2/3 bg-muted rounded mb-3 animate-pulse" />

      {/* Meta line */}
      <div className="flex flex-wrap gap-3 mb-6">
        <div className="h-5 w-32 bg-muted rounded animate-pulse" />
        <div className="h-5 w-48 bg-muted rounded animate-pulse" />
        <div className="h-5 w-20 bg-muted rounded-full animate-pulse" />
      </div>

      {/* Owner card */}
      <div className="flex items-center gap-3 mb-6 p-4 bg-card rounded-xl border border-border">
        <div className="w-14 h-14 rounded-full bg-muted animate-pulse" />
        <div className="flex-1 space-y-2">
          <div className="h-4 w-32 bg-muted rounded animate-pulse" />
          <div className="h-3 w-2/3 bg-muted rounded animate-pulse" />
        </div>
        <div className="h-9 w-28 bg-muted rounded-md animate-pulse" />
      </div>

      {/* Tabs */}
      <div className="flex gap-4 border-b border-border mb-6">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-10 w-24 bg-muted rounded animate-pulse" />
        ))}
      </div>

      {/* Content cards */}
      <div className="space-y-4">
        <div className="h-32 bg-card border border-border rounded-xl animate-pulse" />
        <div className="h-24 bg-card border border-border rounded-xl animate-pulse" />
      </div>
    </div>
  );
};

export default SitDetailSkeleton;
