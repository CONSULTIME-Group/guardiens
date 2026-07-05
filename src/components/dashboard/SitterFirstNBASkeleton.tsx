const SitterFirstNBASkeleton = () => (
  <section className="px-4 sm:px-5 md:px-8 mb-6 md:mb-8" aria-hidden="true">
    <div className="h-6 w-64 bg-muted rounded mb-2 animate-pulse" />
    <div className="h-4 w-96 max-w-full bg-muted rounded mb-4 animate-pulse" />
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      {[0, 1, 2].map((i) => (
        <div key={i} className="rounded-2xl border border-border bg-card overflow-hidden">
          <div className="w-full aspect-[16/10] bg-muted animate-pulse" />
          <div className="p-4 space-y-2">
            <div className="h-4 w-32 bg-muted rounded animate-pulse" />
            <div className="h-3 w-24 bg-muted rounded animate-pulse" />
            <div className="h-8 w-full bg-muted rounded animate-pulse mt-3" />
          </div>
        </div>
      ))}
    </div>
  </section>
);

export default SitterFirstNBASkeleton;
