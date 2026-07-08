import { lazy, Suspense, useEffect, useState } from "react";

// Trackers non essentiels au premier rendu. Chargés après le premier paint
// via requestIdleCallback (fallback setTimeout) pour ne pas alourdir le
// bundle initial ni retarder le LCP. GA4 et Facebook restent fonctionnels,
// simplement déclenchés juste après le premier rendu.
const PageViewTracker = lazy(() => import("./PageViewTracker"));
const FacebookReferralTracker = lazy(() => import("./FacebookReferralTracker"));
const FacebookReferralFeedback = lazy(() => import("./FacebookReferralFeedback"));
const NetworkErrorMonitor = lazy(() => import("@/components/layout/NetworkErrorMonitor"));

export const DeferredTrackers = () => {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const schedule =
      (window as any).requestIdleCallback?.bind(window) ??
      ((cb: () => void) => window.setTimeout(cb, 200));
    const cancel =
      (window as any).cancelIdleCallback?.bind(window) ??
      ((id: number) => window.clearTimeout(id));
    const handle = schedule(() => setReady(true), { timeout: 2000 });
    return () => cancel(handle);
  }, []);

  if (!ready) return null;

  return (
    <Suspense fallback={null}>
      <PageViewTracker />
      <FacebookReferralTracker />
      <NetworkErrorMonitor />
      <FacebookReferralFeedback />
    </Suspense>
  );
};

export default DeferredTrackers;
