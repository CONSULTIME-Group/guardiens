const SkeletonLine = ({ w }: { w: string }) => (
  <span className={`block h-3 rounded-full bg-muted animate-pulse ${w}`} />
);

export const NotificationSkeleton = () => (
  <div className="space-y-2">
    {/* Label de groupe */}
    <div className="px-1 mb-3">
      <span className="block h-3 w-24 rounded-full bg-muted animate-pulse" />
    </div>
    {[1, 2, 3, 4, 5].map((i) => (
      <div
        key={i}
        className="rounded-xl border border-border bg-card p-4 flex items-start gap-3"
        style={{ opacity: 1 - i * 0.12 }}
      >
        <span className="shrink-0 h-9 w-9 rounded-full bg-muted animate-pulse" />
        <div className="flex-1 space-y-2 py-0.5">
          <div className="flex justify-between gap-4">
            <SkeletonLine w="w-2/5" />
            <SkeletonLine w="w-16" />
          </div>
          <SkeletonLine w="w-3/4" />
          <SkeletonLine w="w-1/2" />
        </div>
      </div>
    ))}
  </div>
);
