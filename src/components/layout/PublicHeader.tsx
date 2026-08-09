import { useState, useEffect, useLayoutEffect, useCallback, useRef, lazy, Suspense } from "react";
import { useNavigate, Link, useLocation } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Menu, X } from "lucide-react";
import LanguageSwitcher from "./LanguageSwitcher";
import { useAuth } from "@/contexts/AuthContext";
import { useInAppShell } from "./AppShellContext";
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
      <div ref={fixedBarRef} className="flex items-center justify-between gap-2 px-[5%] md:px-[8%] py-4">
        <Link to="/" aria-label="Guardiens, accueil" className="min-w-0 shrink font-heading text-xl md:text-2xl font-bold">
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
                {t("nav.my_space")}
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

        {/* Mobile : barre strictement allégée. Sous le point de rupture sm,
            seuls le logo et le burger (plus l'avatar d'un connecté) restent
            dans l'en tête. Langue, connexion et création de compte vivent
            dans le panneau du menu, sinon le cluster déborde du viewport. */}
        <div className="flex sm:hidden shrink-0 items-center gap-1">
          {!authChecked ? (
            <div className="h-9 w-9 rounded-md bg-muted/40 animate-pulse" aria-hidden="true" />
          ) : hasSession ? (
            <UserMenu compact />
          ) : null}

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
          {/* Actions de compte remontées en haut du panneau : elles ont quitté
              l'en tête mobile, qui ne peut plus les accueillir. */}
          {!authChecked ? (
            <div className="h-9 w-full rounded-md bg-muted/40 animate-pulse" aria-hidden="true" />
          ) : !hasSession ? (
            <div className="pb-3 mb-2 border-b border-border space-y-2">
              <Button
                className="w-full min-h-11"
                size="sm"
                onClick={() => { setOpen(false); navigate("/inscription"); }}
              >
                {t("nav.register")}
              </Button>
              <Button
                variant="outline"
                className="w-full min-h-11"
                size="sm"
                onClick={() => { setOpen(false); navigate("/login"); }}
              >
                {t("nav.login")}
              </Button>
            </div>
          ) : null}
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
          {authChecked && hasSession && (
            <div className="pt-2 border-t border-border space-y-2">
              <Button className="w-full" size="sm" onClick={() => { setOpen(false); navigate("/dashboard"); }}>
                {t("nav.my_space")}
              </Button>
            </div>
          )}
          {/* Sélecteur de langue en pied de panneau. Pour un connecté, il est
              déjà rendu dans la barre cloches ci dessous, on ne double pas. */}
          {!showBells && (
            <div className="pt-3 mt-2 border-t border-border flex justify-start">
              <LanguageSwitcher compact />
            </div>
          )}
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
    </>
  );
}
