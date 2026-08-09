import { lazy, Suspense, useLayoutEffect, useState, type ReactNode } from "react";
import { Outlet, useSearchParams, useLocation } from "react-router-dom";
import { Sidebar } from "./Navigation";
import Breadcrumbs from "./Breadcrumbs";
const AlmaDock = lazy(() =>
  import("@/components/ai/alma/AlmaDock").then((m) => ({ default: m.AlmaDock })),
);
import { AlmaProvider } from "@/contexts/AlmaContext";
import { useAuth } from "@/contexts/AuthContext";
import OnboardingModal from "@/components/onboarding/OnboardingModal";
import OnboardingGate from "@/components/onboarding/OnboardingGate";
// DuplicateAccountGuard est monté globalement dans App.tsx pour s'exécuter
// même quand l'utilisateur retombe sur une page publique (Landing, FAQ…)
// après le retour OAuth Google. Ne pas le re-monter ici.
import { usePresenceHeartbeat } from "@/hooks/usePresenceHeartbeat";
import { AppShellProvider } from "./AppShellContext";
import { useChromeVisibility } from "./ChromeVisibility";
import AppTopBar from "./AppTopBar";

/**
 * Zone principale du shell. Quand un ecran plein cadre (fil de messagerie)
 * demande le retrait de la barre basse, on supprime aussi la reserve d'espace
 * qui lui etait destinee, en ne gardant que la zone sure du materiel.
 */
const ShellMain = ({ children }: { children?: ReactNode }) => {
  const { bottomNavHidden, topBarHidden } = useChromeVisibility();
  return (
    <main
      id="main-content"
      role="main"
      className={`flex-1 min-w-0 overflow-x-clip ${
        bottomNavHidden ? "pb-[env(safe-area-inset-bottom)] md:pb-0" : "md:pb-24"
      }`}
    >
      {!topBarHidden && <AppTopBar />}
      {children}
    </main>
  );
};

export const AppLayout = ({ children }: { children?: ReactNode }) => {
  const { user, refreshProfile } = useAuth();
  usePresenceHeartbeat();
  const [searchParams, setSearchParams] = useSearchParams();
  const location = useLocation();
  const [dismissed, setDismissed] = useState(false);
  const [mobileHeader, setMobileHeader] = useState(() =>
    typeof window !== "undefined" && typeof window.matchMedia === "function"
      ? window.matchMedia("(max-width: 767.98px)").matches
      : false,
  );

  useLayoutEffect(() => {
    if (typeof window === "undefined" || typeof window.matchMedia !== "function") return;
    const query = window.matchMedia("(max-width: 767.98px)");
    const update = () => setMobileHeader(query.matches);
    update();
    query.addEventListener("change", update);
    return () => query.removeEventListener("change", update);
  }, []);


  // Determine if onboarding modal should show
  const isTour = searchParams.get("tour") === "true";
  const needsMinimal = user && !user.onboardingMinimalCompleted;
  const needsOnboarding = user && !user.onboardingCompleted && !user.onboardingDismissedAt;

  // Le parcours pro a son propre formulaire dédié : on n'affiche pas
  // la modale d'onboarding propriétaire/gardien sur /pros/*.
  const isProContext = location.pathname.startsWith("/pros/");

  const showOnboarding = !dismissed && !isProContext && (isTour || needsMinimal || needsOnboarding);


  return (
    <AppShellProvider value={true}>
    <AlmaProvider>
    <OnboardingGate />
    <div className="flex min-h-screen bg-background">
      <Sidebar showHeaderBells={!mobileHeader} />
      <ShellMain>
        <div className="hidden md:block">
          <Breadcrumbs />
        </div>

        {children ?? <Outlet />}
      </ShellMain>

      {showOnboarding && (
        <OnboardingModal
          open
          onClose={() => {
            setDismissed(true);
            setSearchParams({});
            void Promise.resolve(refreshProfile()).catch(() => {});
          }}
          onMinimalComplete={() => {
            void Promise.resolve(refreshProfile()).catch(() => {});
          }}
        />
      )}
      <Suspense fallback={null}>
        <AlmaDock />
      </Suspense>
      {/* DuplicateAccountGuard mont\u00e9 globalement dans App.tsx */}
    </div>
    </AlmaProvider>
    </AppShellProvider>
  );
};
