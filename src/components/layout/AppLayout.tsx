import { lazy, Suspense, useLayoutEffect, useRef, useState, type ReactNode } from "react";
import { Outlet, useSearchParams, useLocation, Link } from "react-router-dom";
import { Sidebar } from "./Navigation";
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
import { useChromeVisibility } from "./ChromeVisibility";
import UserMenu from "./UserMenu";
import AppTopBar from "./AppTopBar";

/**
 * Zone principale du shell. Quand un ecran plein cadre (fil de messagerie)
 * demande le retrait de la barre basse, on supprime aussi la reserve d'espace
 * qui lui etait destinee, en ne gardant que la zone sure du materiel.
 */
const ShellMain = ({ children }: { children?: ReactNode }) => {
  const { bottomNavHidden } = useChromeVisibility();
  return (
    <main
      id="main-content"
      role="main"
      className={`flex-1 min-w-0 overflow-x-clip ${
        bottomNavHidden ? "pb-[env(safe-area-inset-bottom)] md:pb-0" : "md:pb-24"
      }`}
    >
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
      <ShellMain>
        <AppTopBar />
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
