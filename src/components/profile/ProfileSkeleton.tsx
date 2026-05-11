/**
 * Skeleton de la page « Mon profil » (sitter ou owner).
 * Reproduit la structure sidebar + contenu pour éviter le layout shift
 * pendant le chargement initial du profil.
 */
const ProfileSkeleton = () => {
  return (
    <div className="min-h-screen bg-background">
      <div className="p-4 sm:p-6 md:p-10 max-w-5xl mx-auto animate-fade-in">
        <div className="flex flex-col lg:flex-row gap-8">
          {/* Sidebar skeleton */}
          <aside className="w-full lg:w-[280px] shrink-0 space-y-5">
            {/* Avatar + name */}
            <div className="flex flex-col items-center space-y-2">
              <div className="h-16 w-16 rounded-full bg-muted animate-pulse" />
              <div className="h-4 w-24 rounded bg-muted animate-pulse" />
              <div className="h-3 w-16 rounded bg-muted animate-pulse" />
            </div>
            {/* Completion */}
            <div className="space-y-2">
              <div className="h-3 w-32 rounded bg-muted animate-pulse" />
              <div className="h-2 rounded-full bg-muted animate-pulse" />
              <div className="h-3 w-20 rounded bg-muted animate-pulse" />
            </div>
            {/* Sections nav */}
            <div className="flex lg:flex-col gap-1.5 overflow-hidden">
              {Array.from({ length: 6 }).map((_, i) => (
                <div
                  key={i}
                  className="h-12 rounded-lg bg-muted/60 animate-pulse shrink-0 w-full lg:w-auto min-w-[140px]"
                />
              ))}
            </div>
          </aside>

          {/* Content skeleton */}
          <div className="flex-1 min-w-0">
            <div className="bg-card rounded-2xl border border-border p-5 md:p-8 space-y-6">
              <div className="h-6 w-1/3 rounded bg-muted animate-pulse" />
              <div className="h-4 w-2/3 rounded bg-muted animate-pulse" />
              <div className="grid sm:grid-cols-2 gap-4 pt-4">
                {Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className="space-y-2">
                    <div className="h-3 w-20 rounded bg-muted animate-pulse" />
                    <div className="h-10 rounded-lg bg-muted/60 animate-pulse" />
                  </div>
                ))}
              </div>
              <div className="h-32 rounded-lg bg-muted/60 animate-pulse" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProfileSkeleton;
