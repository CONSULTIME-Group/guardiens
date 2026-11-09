import { Fragment, useEffect, useState } from "react";
import { Outlet, Navigate, NavLink, useNavigate, useLocation } from "react-router-dom";
import PageMeta from "@/components/PageMeta";
import { AdminSidebar, adminNavGroups_export, isToolPath, navItemBadge, navItemNews } from "./AdminSidebar";
import { markAdminNewsSeen, useAdminNews } from "@/hooks/useAdminNews";
import { useWorkList, workListBadgeLabel, workListBadgeText } from "@/hooks/useWorkList";
import { AdminBadgePill, AdminNewsPill } from "./AdminBadgePill";
import { useAdmin } from "@/hooks/useAdmin";
import { useAuth } from "@/contexts/AuthContext";
import { Menu, X, ArrowLeft, LogOut, ChevronDown, ChevronUp } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Titres d'onglet pour les routes admin absentes de la sidebar
 * (outils techniques et pages dynamiques).
 */
const ADMIN_TITLE_FALLBACKS: Record<string, string> = {
  "/admin/build-info": "Version en ligne",
  "/admin/prerender": "Instantanés des pages",
  "/admin/articles-longue-traine": "Articles longue traîne",
  // Lot ADM14 : hors menu, routes gardées.
  "/admin/analysis-requests": "Demandes d'analyse",
  "/admin/hero-weights": "Poids des hero",
};

export const resolveAdminTitle = (pathname: string, search = ""): string => {
  const path = pathname.replace(/\/+$/, "") || "/admin";
  // Lot ADM14 : l'onglet Projets d'Entraide porte son nom dans l'onglet du navigateur.
  if (path === "/admin/small-missions" && new URLSearchParams(search).get("tab") === "projets") return "Projets";
  const navLabel = adminNavGroups_export
    .flatMap((group) => group.items)
    .find((item) => item.to.split("?")[0] === path)?.label;
  if (navLabel) return navLabel;
  if (ADMIN_TITLE_FALLBACKS[path]) return ADMIN_TITLE_FALLBACKS[path];
  if (path.startsWith("/admin/articles/")) return "Édition d'article";
  return "Administration";
};

export const AdminLayout = () => {
  const { isAuthenticated, loading: authLoading, logout, user } = useAuth();
  const { isAdmin, loading: adminLoading } = useAdmin();
  const navigate = useNavigate();
  const location = useLocation();
  const adminTitle = resolveAdminTitle(location.pathname, location.search);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  // Lot ADM4 : Outils replié sur mobile aussi, ouvert sur une page d'outil.
  const [mobileToolsOpen, setMobileToolsOpen] = useState(false);
  // Le hook est appelé avant la garde : on lui passe l'état admin pour qu'il
  // ne lise rien tant que l'admin n'est pas confirmé.
  // Lot ADM14 : le bouton du menu porte la pastille unique, longueur de la liste de travail.
  const { model, error } = useWorkList(!authLoading && !adminLoading && isAuthenticated && isAdmin);
  const totalBadges = workListBadgeText(model, !!error);
  const news = useAdminNews(!authLoading && !adminLoading && isAuthenticated && isAdmin);
  // Lot ADM14 : ouvrir Annonces ou Entraide efface leur compteur de nouveautés.
  useEffect(() => {
    if (isAdmin) markAdminNewsSeen(location.pathname, user?.id);
  }, [location.pathname, isAdmin, user?.id]);
  const mobileToolsShown = mobileToolsOpen || isToolPath(location.pathname);

  if (authLoading || adminLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center text-muted-foreground">
        Chargement…
      </div>
    );
  }

  if (!isAuthenticated) return <Navigate to="/login" replace />;
  if (!isAdmin) return <Navigate to="/dashboard" replace />;

  return (
    <div className="flex min-h-screen bg-background">
      <PageMeta
        title={`${adminTitle} | Admin Guardiens`}
        description={`${adminTitle} : administration Guardiens.`}
        noindex={true}
        nofollow={true}
      />
      <AdminSidebar />

      {/* Mobile top bar */}
      <div className="md:hidden fixed top-0 left-0 right-0 z-50 bg-card border-b border-border px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate("/dashboard")} aria-label="Retour à l'app" className="p-1.5 rounded-lg hover:bg-accent transition-colors">
            <ArrowLeft className="h-5 w-5 text-muted-foreground" />
          </button>
          <span className="font-body text-sm font-bold text-foreground">
            Guardiens <span className="text-muted-foreground font-normal">Admin</span>
          </span>
        </div>
        <button
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          aria-label={mobileMenuOpen ? "Fermer le menu" : totalBadges ? `Ouvrir le menu, ${workListBadgeLabel(totalBadges)}` : "Ouvrir le menu"}
          aria-expanded={mobileMenuOpen}
          className="relative p-1.5 rounded-lg hover:bg-accent transition-colors"
          data-testid="admin-mobile-menu-button"
        >
          {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          {/* Lot ADM4 : total des pastilles sur le bouton du menu mobile. */}
          {!mobileMenuOpen && totalBadges && (
            <AdminBadgePill compact text={totalBadges} label={workListBadgeLabel(totalBadges)} className="absolute -top-1 -right-1" />
          )}
        </button>
      </div>

      {/* Mobile menu overlay */}
      {mobileMenuOpen && (
        <div className="md:hidden fixed inset-0 z-40 bg-background/95 backdrop-blur-sm pt-16 overflow-y-auto">
          <nav className="px-4 py-4">

            {adminNavGroups_export.map((group, gi, arr) => {
              const firstTool = !!group.tool && !arr[gi - 1]?.tool;
              const toolsToggle = firstTool ? (
                <button
                  key="tools-toggle"
                  type="button"
                  onClick={() => setMobileToolsOpen((o) => !o)}
                  aria-expanded={mobileToolsShown}
                  className="mb-3 flex w-full items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold tracking-widest text-muted-foreground uppercase hover:bg-accent"
                  data-testid="admin-mobile-tools-toggle"
                >
                  <span className="flex-1 text-left">Outils</span>
                  {mobileToolsShown ? <ChevronUp className="h-4 w-4" aria-hidden /> : <ChevronDown className="h-4 w-4" aria-hidden />}
                </button>
              ) : null;
              if (group.tool && !mobileToolsShown) return toolsToggle;
              return (
              <Fragment key={group.label}>
              {toolsToggle}
              <div className="mb-4">
                <p className="px-4 py-1.5 text-[10px] font-semibold tracking-widest text-muted-foreground/60 uppercase">
                  {group.label}
                </p>
                <div className="space-y-0.5">
                  {group.items.map((item) => {
                    const badge = navItemBadge(item, totalBadges);
                    const fresh = navItemNews(item, news);
                    const badgeLabel = badge ? workListBadgeLabel(badge) : fresh?.label;
                    return (
                      <NavLink
                        key={item.to}
                        to={item.to}
                        end={item.end}
                        onClick={() => setMobileMenuOpen(false)}
                        className={({ isActive }) =>
                          cn(
                            "flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors",
                            isActive
                              ? "bg-primary/10 text-primary"
                              : "text-muted-foreground hover:bg-accent hover:text-foreground"
                          )
                        }
                        aria-label={badgeLabel ? `${item.label}, ${badgeLabel}` : undefined}
                      >
                        {/* Lot ADM12 : une seule marque par entrée, la pastille chiffrée. */}
                        <item.icon className="h-4 w-4 shrink-0" />
                        <span className="flex-1">{item.label}</span>
                        {badge && (
                          <AdminBadgePill text={badge} label={badgeLabel} className="ml-auto" />
                        )}
                        {fresh && <AdminNewsPill text={fresh.text} label={fresh.label} className="ml-auto" />}
                      </NavLink>
                    );
                  })}
                </div>
              </div>
              </Fragment>
              );
            })}
            <div className="border-t border-border mt-4 pt-4 space-y-1">
              <button
                onClick={() => { setMobileMenuOpen(false); navigate("/dashboard"); }}
                className="flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium text-muted-foreground hover:bg-accent hover:text-foreground transition-colors w-full"
              >
                <ArrowLeft className="h-4 w-4" />
                Retour à l'app
              </button>
              <button
                onClick={() => { setMobileMenuOpen(false); logout(); }}
                className="flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium text-muted-foreground hover:bg-accent hover:text-foreground transition-colors w-full"
              >
                <LogOut className="h-4 w-4" />
                Déconnexion
              </button>
            </div>
          </nav>
        </div>
      )}

      <main className="flex-1 min-w-0 p-6 lg:p-8 overflow-x-clip pt-20 md:pt-6">
        <Outlet />
      </main>
    </div>
  );
};
