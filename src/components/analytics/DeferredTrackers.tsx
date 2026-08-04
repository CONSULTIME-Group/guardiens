import { lazy, Suspense, useEffect, useState } from "react";

// Trackers non essentiels au premier rendu. Chargés après le premier paint
// via requestIdleCallback (fallback setTimeout) pour ne pas alourdir le
// bundle initial ni retarder le LCP. GA4 et Facebook restent fonctionnels,
// simplement déclenchés juste après le premier rendu.
// Ces modules sont accessoires : un chunk périmé (déploiement pendant la
// visite) ou une coupure réseau ne doit jamais faire tomber la page.
// On retente une fois, puis on abandonne silencieusement en rendant null.
const NullComponent = () => null;

const optionalLazy = (factory: () => Promise<{ default: ComponentType }>) =>
  lazy(async () => {
    try {
      return await factory();
    } catch {
      try {
        await new Promise((resolve) => setTimeout(resolve, 500));
        return await factory();
      } catch {
        return { default: NullComponent };
      }
    }
  });

const PageViewTracker = optionalLazy(() => import("./PageViewTracker"));
const FacebookReferralTracker = optionalLazy(() => import("./FacebookReferralTracker"));
const AiReferralTracker = optionalLazy(() => import("./AiReferralTracker"));
const FacebookReferralFeedback = optionalLazy(() => import("./FacebookReferralFeedback"));
const NetworkErrorMonitor = optionalLazy(() => import("@/components/layout/NetworkErrorMonitor"));

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
      <AiReferralTracker />
      <NetworkErrorMonitor />
      <FacebookReferralFeedback />
    </Suspense>
  );
};

export default DeferredTrackers;
