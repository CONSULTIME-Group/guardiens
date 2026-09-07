import { useState, useEffect, useLayoutEffect, useCallback, useRef, lazy, Suspense } from "react";
import { useNavigate, Link, useLocation } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Menu, X } from "lucide-react";
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { useAuth } from "@/contexts/AuthContext";
import { useInAppShell } from "./AppShellContext";
import UserMenu from "./UserMenu";
import AppTopBar from "./AppTopBar";
import { useShellMode } from "./useShellMode";

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
const MessageBell = lazy(() => import("./MessageBell"));

/** Vrai sous le point de rupture sm de Tailwind (640 px). */
const useIsCompactViewport = () => {
  const query = "(max-width: 639.98px)";
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


export const NAV_DEFS: ReadonlyArray<{ key: string; to: string; beta?: boolean }> = [
  { key: "listings", to: "/annonces" },
  { key: "small_missions", to: "/petites-missions" },
  { key: "pros", to: "/pros", beta: true },
  { key: "guides", to: "/guides" },
  { key: "pricing", to: "/tarifs" },
  { key: "news", to: "/actualites" },
];

export default function PublicHeader({ authedVariant = false }: { authedVariant?: boolean }) {
  const navigate = useNavigate();
  const location = useLocation();
  const { t } = useTranslation();
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
  const [msgUnread, setMsgUnread] = useState(0);
  const [notifUnread, setNotifUnread] = useState(0);
  const fixedBarRef = useRef<HTMLDivElement | null>(null);

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
      <div ref={fixedBarRef} className="flex items-center justify-between gap-2 px-4 py-4 sm:px-6 min-[1120px]:grid min-[1120px]:grid-cols-[auto_minmax(0,1fr)_auto] min-[1120px]:gap-x-8 min-[1120px]:px-6 xl:px-8 2xl:px-[5%]">
        <Link to="/" aria-label="Guardiens, accueil" className="inline-flex min-h-[44px] items-center min-w-0 shrink-0 font-heading text-xl md:text-2xl font-bold">
          <span aria-hidden="true"><span className="text-primary">g</span>uardiens</span>
        </Link>


        {/* Les trois zones gardent chacune leur place dès le format ordinateur. */}
        <nav aria-label="Navigation principale" className="hidden min-[1120px]:flex min-w-0 items-center justify-self-center gap-0 xl:gap-1">
          {NAV_DEFS.map((l) => (
            <Button
              key={l.to}
              variant="ghost"
              size="sm"
              onClick={() => navigate(l.to)}
              className={`min-h-11 whitespace-nowrap px-1.5 text-xs xl:px-2 xl:text-sm 2xl:px-3 ${isActive(l.to) ? "text-primary font-semibold" : ""}`}
              aria-current={isActive(l.to) ? "page" : undefined}
            >
              {t(`nav.${l.key}`)}
              {l.beta && (
                <span className="ml-1.5 text-[11px] leading-none uppercase tracking-wider font-bold bg-amber-200 text-amber-900 px-1.5 py-0.5 rounded">
                  {t("nav.beta")}
                </span>
              )}
            </Button>
          ))}
        </nav>

        <div className="hidden min-[1120px]:flex shrink-0 items-center justify-self-end gap-0 xl:gap-1">
          {!authChecked ? (
            <div className="h-8 w-36 rounded-md bg-muted/40 animate-pulse" aria-hidden="true" />
          ) : hasSession ? (
            <>
              <Button size="sm" className="min-h-11 whitespace-nowrap px-2 xl:px-3" onClick={() => navigate("/dashboard")}>
                {t("nav.my_space")}
              </Button>
              {!isCompact && bells}
              <UserMenu />
            </>
          ) : (
            <>
              <Button variant="ghost" size="sm" className="min-h-11 whitespace-nowrap px-2 text-xs xl:px-3 xl:text-sm" onClick={() => navigate("/login")}>
                {t("nav.login")}
              </Button>
              <Button size="sm" className="min-h-11 whitespace-nowrap px-2 text-xs xl:px-3 xl:text-sm" onClick={() => navigate("/inscription")}>
                {t("nav.register")}
              </Button>
            </>
          )}
        </div>

        <div className="flex min-[1120px]:hidden shrink-0 items-center gap-1">
          {!authChecked ? (
            <div className="h-9 w-9 rounded-md bg-muted/40 animate-pulse" aria-hidden="true" />
          ) : hasSession ? (
            <UserMenu compact />
          ) : null}

          <Sheet open={open} onOpenChange={setOpen}>
            <SheetTrigger asChild>
              <Button
                size="icon"
                variant="ghost"
                aria-label={hasSession && hasUnread ? `${t("nav.menu")}, ${t("nav.unread_items")}` : `${t("nav.menu")}, ouvrir la navigation`}
                aria-expanded={open}
                className="relative h-11 w-11 min-h-11 min-w-11"
              >
                <Menu className="h-5 w-5" />
                {hasSession && hasUnread && (
                  <span aria-hidden="true" className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-primary" />
                )}
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="w-[min(88vw,24rem)] border-primary/20 bg-background p-0 [&>button]:hidden">
              <div className="flex min-h-full flex-col px-6 pb-8 pt-6">
                <div className="flex min-h-11 items-center justify-between border-b border-border pb-4">
                  <SheetTitle className="font-heading text-2xl font-bold">Navigation</SheetTitle>
                  <SheetClose asChild>
                    <Button variant="ghost" size="icon" className="h-11 w-11" aria-label="Fermer la navigation">
                      <X className="h-5 w-5" />
                    </Button>
                  </SheetClose>
                </div>

                <nav aria-label="Navigation mobile" className="flex flex-1 flex-col py-5 font-body">
                  {NAV_DEFS.map((l) => (
                    <SheetClose asChild key={l.to}>
                      <Link
                        to={l.to}
                        aria-current={isActive(l.to) ? "page" : undefined}
                        className={`flex min-h-12 items-center rounded-md px-3 text-base font-medium transition-colors ${
                          isActive(l.to) ? "bg-primary/10 text-primary font-semibold" : "text-foreground hover:bg-accent"
                        }`}
                      >
                        {t(`nav.${l.key}`)}
                        {l.beta && (
                          <span className="ml-2 rounded bg-amber-100 px-1.5 py-0.5 text-[11px] font-bold uppercase tracking-wider text-amber-800">
                            {t("nav.beta")}
                          </span>
                        )}
                      </Link>
                    </SheetClose>
                  ))}

                  <div className="mt-auto border-t border-border pt-5">
                    {!authChecked ? (
                      <div className="h-12 w-full rounded-md bg-muted/40 animate-pulse" aria-hidden="true" />
                    ) : hasSession ? (
                      <SheetClose asChild>
                        <Button className="min-h-12 w-full" onClick={() => navigate("/dashboard")}>
                          {t("nav.my_space")}
                        </Button>
                      </SheetClose>
                    ) : (
                      <div className="space-y-3">
                        <SheetClose asChild>
                          <Button variant="outline" className="min-h-12 w-full" onClick={() => navigate("/login")}>
                            {t("nav.login")}
                          </Button>
                        </SheetClose>
                        <SheetClose asChild>
                          <Button className="min-h-12 w-full" onClick={() => navigate("/inscription")}>
                            {t("nav.register")}
                          </Button>
                        </SheetClose>
                      </div>
                    )}
                    {isCompact && showBells && <div className="mt-4 flex items-center justify-center gap-2">{bells}</div>}
                  </div>
                </nav>
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </header>
    </>
  );
}
