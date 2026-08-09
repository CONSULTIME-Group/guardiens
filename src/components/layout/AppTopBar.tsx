import { lazy, Suspense, useLayoutEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { BackButton } from "./BackButton";
import LanguageSwitcher from "./LanguageSwitcher";
import UserMenu from "./UserMenu";

const NotificationBell = lazy(() => import("./NotificationBell"));
const MessageBell = lazy(() => import("./MessageBell"));

/**
 * Top bar applicative mobile, en tête unique d'un utilisateur connecté.
 *
 * Extraite d'AppLayout pour pouvoir être montée aussi sur les routes servies
 * par la coquille publique (annonces, tarifs, contact, landing), afin qu'un
 * connecté sous 768 px ne rencontre jamais deux grammaires de navigation.
 *
 * `standalone` : le composant est monté hors AppLayout, il expose alors aussi
 * la hauteur sous `--public-header-h`, variable à laquelle les barres
 * collantes des pages publiques s'accrochent.
 */
export const AppTopBar = ({ standalone = false }: { standalone?: boolean }) => {
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

  useLayoutEffect(() => {
    const el = topBarRef.current;
    if (!el || typeof window === "undefined") return;
    const apply = () => {
      const h = Math.round(el.getBoundingClientRect().height);
      document.documentElement.style.setProperty("--app-topbar-h", `${h}px`);
      if (standalone) {
        document.documentElement.style.setProperty("--public-header-h", `${h}px`);
      }
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
      if (standalone) document.documentElement.style.removeProperty("--public-header-h");
    };
  }, [standalone]);

  return (
    <div
      ref={topBarRef}
      className="md:hidden sticky top-0 z-40 flex items-center justify-between gap-2 px-3 py-2 bg-background/95 backdrop-blur border-b border-border"
    >
      <div className="flex items-center gap-1 min-w-0">
        <BackButton inline />
        <Link
          to="/"
          aria-label="Guardiens, accueil"
          className="font-heading text-lg font-bold tracking-tight shrink-0 whitespace-nowrap"
        >
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
  );
};

export default AppTopBar;
