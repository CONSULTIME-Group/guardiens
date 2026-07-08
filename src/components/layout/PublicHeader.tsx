import { useState } from "react";
import { useNavigate, Link, useLocation } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Menu, X } from "lucide-react";
import LanguageSwitcher from "./LanguageSwitcher";
import { useAuth } from "@/contexts/AuthContext";


const NAV_DEFS: ReadonlyArray<{ key: string; to: string; beta?: boolean }> = [
  { key: "listings", to: "/annonces" },
  { key: "small_missions", to: "/petites-missions" },
  { key: "pros", to: "/pros", beta: true },
  { key: "guides", to: "/guides" },
  { key: "pricing", to: "/tarifs" },
  { key: "news", to: "/actualites" },
];

export default function PublicHeader() {
  const navigate = useNavigate();
  const location = useLocation();
  const { t } = useTranslation();
  const { isAuthenticated } = useAuth();
  const [open, setOpen] = useState(false);

  // Utilisateur connecté : l'en-tête public est masqué, la coquille
  // authentifiée (AppLayout) fournit déjà la navigation.
  if (isAuthenticated) return null;

  const isActive = (path: string) => location.pathname === path || location.pathname.startsWith(path + "/");


  return (
    <header className="sticky top-0 z-50 bg-background/80 backdrop-blur-md border-b border-border/50">
      <div className="flex items-center justify-between px-[5%] md:px-[8%] py-4">
        <Link to="/" className="font-heading text-xl md:text-2xl font-bold">
          <span className="text-primary">g</span>uardiens
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
          <Button variant="ghost" size="sm" onClick={() => navigate("/login")}>
            {t("nav.login")}
          </Button>
          <Button size="sm" onClick={() => navigate("/inscription")}>
            {t("nav.register")}
          </Button>
          <LanguageSwitcher />
        </nav>

        {/* Mobile: auth + burger */}
        <div className="flex sm:hidden items-center gap-1">
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
          <Button
            size="icon"
            variant="ghost"
            onClick={() => setOpen(!open)}
            aria-label={t("nav.menu")}
            aria-expanded={open}
            className="min-h-11 min-w-11"
          >
            {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
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
              className={`block py-2.5 px-3 rounded-lg text-sm font-medium transition-colors ${
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
          <div className="pt-2 border-t border-border">
            <Button className="w-full" size="sm" onClick={() => { setOpen(false); navigate("/inscription"); }}>
              {t("nav.register")}
            </Button>
          </div>
        </nav>
      )}
    </header>
  );
}
