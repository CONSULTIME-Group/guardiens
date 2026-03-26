import { useState } from "react";
import { Outlet, Navigate, NavLink, useNavigate } from "react-router-dom";
import { AdminSidebar } from "./AdminSidebar";
import { useAdmin } from "@/hooks/useAdmin";
import { useAuth } from "@/contexts/AuthContext";
import { Menu, X, ArrowLeft, LogOut, LayoutDashboard, Users, Megaphone, CalendarCheck, Star, Flag, ShieldCheck, Mail, FileText, MapPin, HelpCircle, Compass } from "lucide-react";
import { cn } from "@/lib/utils";

const mobileAdminNav = [
  { to: "/admin", icon: LayoutDashboard, label: "Dashboard", end: true },
  { to: "/admin/users", icon: Users, label: "Utilisateurs" },
  { to: "/admin/listings", icon: Megaphone, label: "Annonces" },
  { to: "/admin/sits-management", icon: CalendarCheck, label: "Gardes" },
  { to: "/admin/reviews", icon: Star, label: "Avis" },
  { to: "/admin/reports", icon: Flag, label: "Signalements" },
  { to: "/admin/verifications", icon: ShieldCheck, label: "Vérifications ID" },
  { to: "/admin/emails", icon: Mail, label: "Emails" },
  { to: "/admin/articles", icon: FileText, label: "Articles" },
  { to: "/admin/city-pages", icon: MapPin, label: "Pages villes SEO" },
  { to: "/admin/faq", icon: HelpCircle, label: "FAQ" },
  { to: "/admin/guides", icon: Compass, label: "Guides locaux" },
  { to: "/admin/departments", icon: MapPin, label: "Départements SEO" },
];

export const AdminLayout = () => {
  const { isAuthenticated, loading: authLoading, logout } = useAuth();
  const { isAdmin, loading: adminLoading } = useAdmin();
  const navigate = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

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
          <nav className="px-4 py-4 space-y-1">
            {mobileAdminNav.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={"end" in item ? item.end : false}
                onClick={() => setMobileMenuOpen(false)}
                className={({ isActive }) =>
                  cn(
                    "flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors",
                    isActive
                      ? "bg-primary/10 text-primary"
                      : "text-muted-foreground hover:bg-accent hover:text-foreground"
                  )
                }
              >
                <item.icon className="h-4 w-4" />
                {item.label}
              </NavLink>
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

      <main className="flex-1 p-6 lg:p-8 overflow-auto pt-20 md:pt-6">
        <Outlet />
      </main>
    </div>
  );
};
