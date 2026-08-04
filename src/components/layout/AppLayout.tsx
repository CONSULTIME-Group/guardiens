import { lazy, Suspense, useLayoutEffect, useRef, useState, type ReactNode } from "react";
import { Outlet, useSearchParams, useLocation, Link } from "react-router-dom";
import { Sidebar, BottomNav } from "./Navigation";
import { BackButton } from "./BackButton";
import Breadcrumbs from "./Breadcrumbs";
// NotificationBell tire date-fns + locale (vendor-date ~27Ko). Chargement
// différé pour ne pas peser sur les pages publiques (login, landing…) qui
// n'utilisent jamais le shell AppLayout mais partagent l'entry bundle.
const NotificationBell = lazy(() => import("./NotificationBell"));
const MessageBell = lazy(() => import("./MessageBell"));
const AlmaDock = lazy(() =>
  import("@/components/ai/alma/AlmaDock").then((m) => ({ default: m.AlmaDock })),
);
import { AlmaProvider } from "@/contexts/AlmaContext";
import LanguageSwitcher from "./LanguageSwitcher";
import { useAuth } from "@/contexts/AuthContext";
import OnboardingModal from "@/components/onboarding/OnboardingModal";
import OnboardingGate from "@/components/onboarding/OnboardingGate";
// DuplicateAccountGuard est monté globalement dans App.tsx pour s'exécuter
// même quand l'utilisateur retombe sur une page publique (Landing, FAQ…)
// après le retour OAuth Google. Ne pas le re-monter ici.
import { usePresenceHeartbeat } from "@/hooks/usePresenceHeartbeat";
import { AppShellProvider } from "./AppShellContext";
import UserMenu from "./UserMenu";

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

  const topBarRef = useRef<HTMLDivElement | null>(null);

  useLayoutEffect(() => {
    if (typeof window === "undefined" || typeof window.matchMedia !== "function") return;
    const query = window.matchMedia("(max-width: 767.98px)");
    const update = () => setMobileHeader(query.matches);
    update();
    query.addEventListener("change", update);
    return () => query.removeEventListener("change", update);
  }, []);

  // Hauteur réelle de la top bar mobile de la coquille applicative, exposée en
  // variable CSS pour que les barres collantes des pages s'y accrochent sans
  // valeur devinée. Nettoyée au démontage.
  useLayoutEffect(() => {
    const el = topBarRef.current;
    if (!el || typeof window === "undefined") return;
    const apply = () => {
      const h = Math.round(el.getBoundingClientRect().height);
      document.documentElement.style.setProperty("--app-topbar-h", `${h}px`);
    };
    apply();
    let ro: ResizeObserver | null = null;
    if (typeof ResizeObserver !== "undefined") {
      ro = new ResizeObserver(apply);
      ro.observe(el);
    }
    window.addEventListener("resize", apply);
    return () => {
      ro?.disconnect();
      window.removeEventListener("resize", apply);
      document.documentElement.style.removeProperty("--app-topbar-h");
    };
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
      <main id="main-content" className="flex-1 min-w-0 pb-20 md:pb-24 overflow-x-clip" role="main">
        {/* Mobile top bar unifiée : back (si applicable) + logo + cloche */}
        <div className="md:hidden sticky top-0 z-40 flex items-center justify-between gap-2 px-3 py-2 bg-background/95 backdrop-blur border-b border-border">
          <div className="flex items-center gap-1 min-w-0">
            <BackButton inline />
            <Link to="/" aria-label="Guardiens, accueil" className="font-heading text-lg font-bold tracking-tight truncate">
              <span className="text-primary">g</span>
              <span className="text-foreground">uardiens</span>
            </Link>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <LanguageSwitcher compact />
            {mobileHeader && (
              <>
                <Suspense fallback={<div className="w-11 h-11" aria-hidden />}>
                  <MessageBell />
                </Suspense>
                <Suspense fallback={<div className="w-11 h-11" aria-hidden />}>
                  <NotificationBell />
                </Suspense>
              </>
            )}
            <UserMenu compact />
          </div>
        </div>
        <div className="hidden md:block">
          <Breadcrumbs />
        </div>

        {children ?? <Outlet />}
      </main>
      <BottomNav />

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
