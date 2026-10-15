import { useState, useEffect, useLayoutEffect, useCallback, useRef, Suspense } from "react";
import { lazyWithRetry as lazy } from "@/lib/lazyWithRetry";
import { Link, useLocation } from "react-router-dom";
import { useTranslation } from "@/i18n/react";
import { Button } from "@/components/ui/button";
import { Menu, X } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useInAppShell } from "./AppShellContext";
import UserMenu from "./LazyUserMenu";
import AppTopBar from "./AppTopBar";
import { useShellMode } from "./useShellMode";
import { runAfterFirstPaint } from "@/lib/bootSchedule";

/** Vrai sous le point de rupture md de Tailwind (768 px). */
const useIsMobileShell = () => {
  const query = "(max-width: 767.98px)";
  const [mobile, setMobile] = useState(() =>
    typeof window !== "undefined" && typeof window.matchMedia === "function"
      ? window.matchMedia(query).matches
      : false,
  );
  useEffect(() => {
    if (typeof window === "undefined" || typeof window.matchMedia !== "function") return;
    const mql = window.matchMedia(query);
    const onChange = () => setMobile(mql.matches);
    onChange();
    mql.addEventListener("change", onChange);
    return () => mql.removeEventListener("change", onChange);
  }, []);
  return mobile;
};

const NotificationBell = lazy(() => import("./NotificationBell"));
// Lot perf 6 : le menu mobile (Radix Dialog) n'est chargé qu'au premier
// survol, focus ou toucher du bouton, et préchargé après le premier affichage.
const loadMobileMenu = () => import("./PublicMobileMenu");
const PublicMobileMenu = lazy(loadMobileMenu, "PublicMobileMenu");
const preloadMobileMenu = () => { void loadMobileMenu().catch(() => {}); };
const MessageBell = lazy(() => import("./MessageBell"));

/** Vrai sous le point de rupture du header (960 px), la ou le burger est actif. */
const useIsCompactViewport = () => {
  const query = "(max-width: 959.98px)";
  const [compact, setCompact] = useState(() =>
    typeof window !== "undefined" && typeof window.matchMedia === "function"
      ? window.matchMedia(query).matches
      : false,
  );
  useEffect(() => {
    if (typeof window === "undefined" || typeof window.matchMedia !== "function") return;
    const mql = window.matchMedia(query);
    const onChange = () => setCompact(mql.matches);
    onChange();
    mql.addEventListener("change", onChange);
    return () => mql.removeEventListener("change", onChange);
  }, []);
  return compact;
};


// `key` reste la notion de marque (breadcrumbs, footer, sidebar). `shortKey`
// est le libellé court réservé à la navigation principale, en tête et burger.
export const NAV_DEFS: ReadonlyArray<{ key: string; shortKey?: string; to: string }> = [
  { key: "listings", shortKey: "listings_short", to: "/annonces" },
  // Un projet se lit comme une annonce, d'où sa place juste après.
  { key: "projets", to: "/projets" },
  { key: "small_missions", to: "/petites-missions" },
  { key: "associations", to: "/associations" },
  { key: "guides", shortKey: "guides_short", to: "/guides" },
  { key: "pricing", to: "/tarifs" },
  { key: "news", to: "/actualites" },
];

/** Classes partagées des liens Connexion et Inscription sur ordinateur. */
const AUTH_BTN = "min-h-11 whitespace-nowrap px-2 text-xs xl:px-3 xl:text-sm";
export const MOBILE_AUTH_BTN = "min-h-12 w-full";

export default function PublicHeader({ authedVariant = false }: { authedVariant?: boolean }) {
  const location = useLocation();
  const { t } = useTranslation();
  const loginLabel = t("nav.login");
  const registerLabel = t("nav.register");
  const mySpaceLabel = t("nav.my_space");
  const { hasSession, authChecked } = useAuth();
  const inAppShell = useInAppShell();
  const isCompact = useIsCompactViewport();
  const shellMode = useShellMode();
  const isMobileShell = useIsMobileShell();

  // En tête unique pour un connecté sous 768 px : la top bar applicative
  // remplace la version burger du header public, pour ne pas exposer deux
  // grammaires de navigation dans une même session. Au dessus de 768 px, et
  // pour un visiteur, rien ne change.
  const useAppTopBar = shellMode === "app" && isMobileShell;
  const [open, setOpen] = useState(false);
  const [menuMounted, setMenuMounted] = useState(false);
  const [msgUnread, setMsgUnread] = useState(0);
  const [notifUnread, setNotifUnread] = useState(0);
  const fixedBarRef = useRef<HTMLDivElement | null>(null);

  // Préchargement du menu mobile une fois la page affichée, sur petit écran.
  useEffect(() => {
    if (!isCompact) return;
    runAfterFirstPaint(preloadMobileMenu, 4000);
  }, [isCompact]);

  const onMsgUnread = useCallback((n: number) => setMsgUnread(n), []);
  const onNotifUnread = useCallback((n: number) => setNotifUnread(n), []);

  // Utilisateur connecté rendu dans la coquille authentifiée (AppLayout) :
  // la sidebar et la top bar mobile fournissent déjà la navigation, on ne
  // superpose pas un second en tête.
  const hidden = (hasSession && inAppShell && !authedVariant) || useAppTopBar;

  // La barre basse n'est plus montée ici : elle est globale (GlobalBottomNav
  // dans App.tsx), pour couvrir aussi les routes sans coquille applicative et
  // garantir qu'une seule instance existe. La réserve d'espace reste gérée par
  // la classe globale posée par ce montage unique.
  const hasUnread = msgUnread + notifUnread > 0;
  const showBells = authChecked && hasSession;

  // Hauteur réelle de l'en tête exposée en variable CSS, pour que les barres
  // collantes des pages (onglets de profil public par exemple) s'y accrochent
  // sans valeur en dur. Remise à zéro au démontage : sans en tête, offset nul.
  useLayoutEffect(() => {
    if (hidden) return;
    const el = fixedBarRef.current;
    if (!el || typeof window === "undefined") return;
    const apply = () => {
      document.documentElement.style.setProperty(
        "--public-header-h",
        `${Math.round(el.getBoundingClientRect().height)}px`,
      );
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
      document.documentElement.style.removeProperty("--public-header-h");
    };
  }, [hidden]);

  // Dans la coquille applicative, la top bar est déjà montée par AppLayout :
  // on ne la double pas.
  if (hasSession && inAppShell && !authedVariant) return null;
  if (useAppTopBar) return <AppTopBar standalone />;
  if (hidden) return null;

  const isActive = (path: string) => location.pathname === path || location.pathname.startsWith(path + "/");

  // Cloches montées une seule fois dans l'arbre, quel que soit le viewport :
  // un seul abonnement realtime et un seul jeu de requêtes par utilisateur.
  const bells = showBells ? (
    <>
      <Suspense fallback={<div className="w-11 h-11" aria-hidden />}>
        <MessageBell onUnreadChange={onMsgUnread} />
      </Suspense>
      <Suspense fallback={<div className="w-11 h-11" aria-hidden />}>
        <NotificationBell onUnreadChange={onNotifUnread} />
      </Suspense>
    </>
  ) : null;

  return (
    <>
    <header className="sticky top-0 z-50 max-w-[100vw] overflow-x-clip bg-background/80 backdrop-blur-md border-b border-border/50">
      <div ref={fixedBarRef} className="flex items-center justify-between gap-2 px-4 py-4 sm:px-6 min-[960px]:grid min-[960px]:grid-cols-[auto_minmax(0,1fr)_auto] min-[960px]:gap-x-6 min-[960px]:px-4 xl:gap-x-8 xl:px-8 2xl:px-[5%]">
        <Link to="/" aria-label="Guardiens, accueil" className="inline-flex min-h-[44px] items-center min-w-0 shrink-0 font-heading text-xl md:text-2xl font-bold">
          <span aria-hidden="true"><span className="text-primary">g</span>uardiens</span>
        </Link>


        {/* Les trois zones gardent chacune leur place dès le format ordinateur. */}
        <nav aria-label="Navigation principale" className="hidden min-[960px]:flex min-w-0 items-center justify-self-center gap-0 xl:gap-1">
          {NAV_DEFS.map((l) => (
            <Button
              key={l.to}
              asChild
              variant="ghost"
              size="sm"
              className={`min-h-11 whitespace-nowrap px-1.5 text-sm xl:px-2 2xl:px-3 ${isActive(l.to) ? "text-primary font-semibold" : ""}`}
            >
              <Link to={l.to} aria-current={isActive(l.to) ? "page" : undefined}>
                {t(`nav.${l.shortKey ?? l.key}`)}
              </Link>
            </Button>
          ))}
        </nav>

        <div className="hidden min-[960px]:flex shrink-0 items-center justify-self-end gap-0 xl:gap-1">
          {!authChecked ? (
            <div className="h-8 w-36 rounded-md bg-muted/40 animate-pulse" aria-hidden="true" />
          ) : hasSession ? (
            <>
              <Button asChild size="sm" className="min-h-11 whitespace-nowrap px-2 xl:px-3">
                <Link to="/dashboard">{mySpaceLabel}</Link>
              </Button>
              {!isCompact && bells}
              <UserMenu />
            </>
          ) : (
            <>
              <Button asChild variant="ghost" size="sm" className={AUTH_BTN}>
                <Link to="/login">{loginLabel}</Link>
              </Button>
              <Button asChild size="sm" className={AUTH_BTN}>
                <Link to="/inscription">{registerLabel}</Link>
              </Button>
            </>
          )}
        </div>

        <div className="flex min-[960px]:hidden shrink-0 items-center gap-1">
          {!authChecked ? (
            <div className="h-9 w-9 rounded-md bg-muted/40 animate-pulse" aria-hidden="true" />
          ) : hasSession ? (
            <UserMenu compact />
          ) : null}

          <Button
            size="icon"
            variant="ghost"
            aria-label={hasSession && hasUnread ? `${t("nav.menu")}, ${t("nav.unread_items")}` : `${t("nav.menu")}, ouvrir la navigation`}
            aria-expanded={open}
            aria-haspopup="dialog"
            className="relative h-11 w-11 min-h-11 min-w-11"
            onPointerEnter={preloadMobileMenu}
            onFocus={preloadMobileMenu}
            onClick={() => { setMenuMounted(true); setOpen(true); }}
          >
            <Menu className="h-5 w-5" />
            {hasSession && hasUnread && (
              <span aria-hidden="true" className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-primary" />
            )}
          </Button>
          {menuMounted && (
            <Suspense fallback={null}>
              <PublicMobileMenu
                open={open}
                onOpenChange={setOpen}
                isActive={isActive}
                authChecked={authChecked}
                hasSession={hasSession}
                mySpaceLabel={mySpaceLabel}
                loginLabel={loginLabel}
                registerLabel={registerLabel}
                bells={isCompact && showBells ? bells : null}
              />
            </Suspense>
          )}
        </div>
      </div>
    </header>
    </>
  );
}
