import { useState, useEffect, useLayoutEffect, useCallback, useRef, lazy, Suspense } from "react";
import { useNavigate, Link, useLocation } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Menu, X } from "lucide-react";
import LanguageSwitcher from "./LanguageSwitcher";
import { useAuth } from "@/contexts/AuthContext";
import { useInAppShell } from "./AppShellContext";
import { BottomNav } from "./Navigation";
import UserMenu from "./UserMenu";

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


const NAV_DEFS: ReadonlyArray<{ key: string; to: string; beta?: boolean }> = [
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
  const [open, setOpen] = useState(false);
  const [msgUnread, setMsgUnread] = useState(0);
  const [notifUnread, setNotifUnread] = useState(0);
  const fixedBarRef = useRef<HTMLDivElement | null>(null);

  const onMsgUnread = useCallback((n: number) => setMsgUnread(n), []);
  const onNotifUnread = useCallback((n: number) => setNotifUnread(n), []);

  // Utilisateur connecté rendu dans la coquille authentifiée (AppLayout) :
  // la sidebar et la top bar mobile fournissent déjà la navigation, on ne
  // superpose pas un second en tête.
  const hidden = hasSession && inAppShell && !authedVariant;

  // Hors coquille authentifiée, la BottomNav mobile accompagne l'en tête
  // connecté. On attend la résolution de l'auth pour la monter, afin de ne
  // jamais provoquer un montage puis un démontage immédiat (saut de layout).
  const withBottomNav = authChecked && hasSession && !inAppShell;
  const hasUnread = msgUnread + notifUnread > 0;
  const showBells = authChecked && hasSession;

  useEffect(() => {
    if (!withBottomNav) return;
    document.body.classList.add("has-public-bottom-nav");
    return () => document.body.classList.remove("has-public-bottom-nav");
  }, [withBottomNav]);

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
    <header className="sticky top-0 z-50 bg-background/80 backdrop-blur-md border-b border-border/50">
      <div ref={fixedBarRef} className="flex items-center justify-between px-[5%] md:px-[8%] py-4">
        <Link to="/" aria-label="Guardiens, accueil" className="font-heading text-xl md:text-2xl font-bold">
          <span aria-hidden="true"><span className="text-primary">g</span>uardiens</span>
        </Link>

        {/* Desktop nav */}
        <nav className="hidden sm:flex gap-1 items-center">
          {NAV_DEFS.map((l) => (
            <Button
              key={l.to}
              variant="ghost"
              size="sm"
              onClick={() => navigate(l.to)}
              className={isActive(l.to) ? "text-primary font-semibold" : ""}
              aria-current={isActive(l.to) ? "page" : undefined}
            >
              {t(`nav.${l.key}`)}
              {l.beta && (
                <span className="ml-1.5 text-[9px] uppercase tracking-wider font-bold bg-amber-100 text-amber-800 px-1.5 py-0.5 rounded">
                  {t("nav.beta")}
                </span>
              )}
            </Button>
          ))}
          {!authChecked ? (
            <div className="h-8 w-40 rounded-md bg-muted/40 animate-pulse" aria-hidden="true" />
          ) : hasSession ? (
            <>
              <Button size="sm" onClick={() => navigate("/dashboard")}>
                Mon espace
              </Button>
              {!isCompact && bells}
              <UserMenu />
            </>
          ) : (
            <>
              <Button variant="ghost" size="sm" onClick={() => navigate("/login")}>
                {t("nav.login")}
              </Button>
              <Button size="sm" onClick={() => navigate("/inscription")}>
                {t("nav.register")}
              </Button>
            </>
          )}
          <LanguageSwitcher />
        </nav>

        {/* Mobile : barre allégée (avatar et burger uniquement pour un
            connecté). Langue, messagerie et notifications sont dans le menu. */}
        <div className="flex sm:hidden items-center gap-1">
          {!authChecked ? (
            <div className="h-9 w-24 rounded-md bg-muted/40 animate-pulse" aria-hidden="true" />
          ) : hasSession ? (
            <UserMenu compact />
          ) : (
            <>
              <LanguageSwitcher compact />
              <Button
                variant="ghost"
                size="sm"
                onClick={() => navigate("/login")}
                className="min-h-11 px-2"
              >
                {t("nav.login")}
              </Button>
              <Button
                size="sm"
                onClick={() => navigate("/inscription")}
                className="min-h-11 px-3"
              >
                {t("nav.register")}
              </Button>
            </>
          )}
          <Button
            size="icon"
            variant="ghost"
            onClick={() => setOpen(!open)}
            aria-label={
              hasSession && hasUnread
                ? `${t("nav.menu")}, ${t("nav.unread_items")}`
                : t("nav.menu")
            }
            aria-expanded={open}
            className="relative min-h-11 min-w-11"
          >
            {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            {hasSession && hasUnread && !open && (
              <span
                aria-hidden="true"
                className="absolute top-1.5 right-1.5 h-2 w-2 rounded-full bg-primary"
              />
            )}
          </Button>
        </div>
      </div>

      {/* Mobile dropdown */}
      {open && (
        <nav className="sm:hidden border-t border-border bg-background px-[5%] py-4 space-y-1 animate-in slide-in-from-top-2 duration-200">
          {NAV_DEFS.map((l) => (
            <Link
              key={l.to}
              to={l.to}
              onClick={() => setOpen(false)}
              aria-current={isActive(l.to) ? "page" : undefined}
              className={`block py-2.5 px-3 rounded-lg text-sm font-medium transition-colors min-h-[44px] ${
                isActive(l.to)
                  ? "text-primary bg-primary/5 font-semibold"
                  : "text-foreground hover:bg-accent"
              }`}
            >
              {t(`nav.${l.key}`)}
              {l.beta && (
                <span className="ml-1.5 text-[9px] uppercase tracking-wider font-bold bg-amber-100 text-amber-800 px-1.5 py-0.5 rounded">
                  {t("nav.beta")}
                </span>
              )}
            </Link>
          ))}
          <div className="pt-2 border-t border-border space-y-2">
            {!authChecked ? (
              <div className="h-9 w-full rounded-md bg-muted/40 animate-pulse" aria-hidden="true" />
            ) : hasSession ? (
              <>
                <Button className="w-full" size="sm" onClick={() => { setOpen(false); navigate("/dashboard"); }}>
                  Mon espace
                </Button>
              </>
            ) : (
              <Button className="w-full" size="sm" onClick={() => { setOpen(false); navigate("/inscription"); }}>
                {t("nav.register")}
              </Button>
            )}
          </div>
        </nav>
      )}

      {/* Messagerie, notifications et langue sur mobile : montés en
          permanence (une seule instance dans tout le composant) pour
          alimenter la pastille du burger, visibles uniquement menu ouvert. */}
      {isCompact && showBells && (
        <div
          className={`sm:hidden items-center gap-1 border-t border-border bg-background px-[5%] py-3 ${open ? "flex" : "hidden"}`}
        >
          {bells}
          <div className="ml-auto">
            <LanguageSwitcher compact />
          </div>
        </div>
      )}
    </header>
    {withBottomNav && <BottomNav />}
    </>
  );
}
