import { useState } from "react";
import { Outlet, Navigate, NavLink, useNavigate, useLocation } from "react-router-dom";
import PageMeta from "@/components/PageMeta";
import { AdminSidebar, adminNavGroups_export, BADGE_TITLES, resolveNavActive } from "./AdminSidebar";
import { useAdminBadges } from "@/hooks/useAdminBadges";
import { AdminBadgePill, resolveBadge } from "./AdminBadgePill";
import { useAdmin } from "@/hooks/useAdmin";
import { useAuth } from "@/contexts/AuthContext";
import { Menu, X, ArrowLeft, LogOut } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Titres d'onglet pour les routes admin absentes de la sidebar
 * (outils techniques et pages dynamiques).
 */
const ADMIN_TITLE_FALLBACKS: Record<string, string> = {
  "/admin/build-info": "Build Info",
  "/admin/prerender": "Prerender",
  "/admin/lifecycle": "Lifecycle",
};

const resolveAdminTitle = (pathname: string): string => {
  const path = pathname.replace(/\/+$/, "") || "/admin";
  const navLabel = adminNavGroups_export
    .flatMap((group) => group.items)
    .find((item) => item.to.split("?")[0] === path)?.label;
  if (navLabel) return navLabel;
  if (ADMIN_TITLE_FALLBACKS[path]) return ADMIN_TITLE_FALLBACKS[path];
  if (path.startsWith("/admin/articles/")) return "Édition d'article";
  return "Administration";
};

export const AdminLayout = () => {
  const { isAuthenticated, loading: authLoading, logout } = useAuth();
  const { isAdmin, loading: adminLoading } = useAdmin();
  const navigate = useNavigate();
  const location = useLocation();
  const adminTitle = resolveAdminTitle(location.pathname);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  // Le hook est appelé avant la garde : on lui passe l'état admin pour qu'il
  // ne lise rien tant que l'admin n'est pas confirmé.
  const { badges, unavailable } = useAdminBadges(!authLoading && !adminLoading && isAuthenticated && isAdmin);

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
          <button onClick={() => navigate("/dashboard")} className="p-1.5 rounded-lg hover:bg-accent transition-colors">
            <ArrowLeft className="h-5 w-5 text-muted-foreground" />
          </button>
          <span className="font-body text-sm font-bold text-foreground">
            Guardiens <span className="text-muted-foreground font-normal">Admin</span>
          </span>
        </div>
        <button onClick={() => setMobileMenuOpen(!mobileMenuOpen)} className="p-1.5 rounded-lg hover:bg-accent transition-colors">
          {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </div>

      {/* Mobile menu overlay */}
      {mobileMenuOpen && (
        <div className="md:hidden fixed inset-0 z-40 bg-background/95 backdrop-blur-sm pt-16 overflow-y-auto">
          <nav className="px-4 py-4">
            {adminNavGroups_export.map((group) => (
              <div key={group.label} className="mb-4">
                <p className="px-4 py-1.5 text-[10px] font-semibold tracking-widest text-muted-foreground/60 uppercase">
                  {group.label}
                </p>
                <div className="space-y-0.5">
                  {group.items.map((item) => {
                    const badge = resolveBadge(item.badgeKey, badges as Record<string, number | undefined>, unavailable, BADGE_TITLES);
                    const badgeLabel = badge.show ? badge.label : undefined;
                    return (
                      <NavLink
                        key={item.to}
                        to={item.to}
                        end={item.end}
                        onClick={() => setMobileMenuOpen(false)}
                        className={({ isActive }) =>
                          cn(
                            "flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors",
                            resolveNavActive(item, location, isActive)
                              ? "bg-primary/10 text-primary"
                              : "text-muted-foreground hover:bg-accent hover:text-foreground"
                          )
                        }
                        aria-label={badgeLabel ? `${item.label}, ${badgeLabel}` : undefined}
                      >
                        <span className="relative shrink-0">
                          <item.icon className="h-4 w-4" />
                          {badge.show && (
                            <span
                              className="absolute -top-1 -right-1.5 h-2 w-2 rounded-full bg-destructive ring-2 ring-background"
                              aria-hidden="true"
                            />
                          )}
                        </span>
                        <span className="flex-1">{item.label}</span>
                        {badge.show && (
                          <AdminBadgePill text={badge.text} label={badge.label} className="ml-auto" />
                        )}
                      </NavLink>
                    );
                  })}
                </div>
              </div>
            ))}
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
