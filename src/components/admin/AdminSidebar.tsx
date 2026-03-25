import { NavLink, useNavigate } from "react-router-dom";
import {
  LayoutDashboard,
  Users,
  Megaphone,
  CalendarCheck,
  Star,
  Flag,
  ShieldCheck,
  Mail,
  FileText,
  LogOut,
  ArrowLeft,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/contexts/AuthContext";

const adminNavItems = [
  { to: "/admin", icon: LayoutDashboard, label: "Dashboard", end: true },
  { to: "/admin/users", icon: Users, label: "Utilisateurs" },
  { to: "/admin/listings", icon: Megaphone, label: "Annonces" },
  { to: "/admin/sits-management", icon: CalendarCheck, label: "Gardes" },
  { to: "/admin/reviews", icon: Star, label: "Avis" },
  { to: "/admin/reports", icon: Flag, label: "Signalements" },
  { to: "/admin/verifications", icon: ShieldCheck, label: "Vérifications ID" },
  { to: "/admin/emails", icon: Mail, label: "Emails" },
  { to: "/admin/articles", icon: FileText, label: "Articles" },
];

export const AdminSidebar = () => {
  const { logout } = useAuth();
  const navigate = useNavigate();

  return (
    <aside className="hidden md:flex flex-col w-64 border-r border-border bg-card h-screen sticky top-0">
      <div className="p-6 pb-4">
        <h1 className="font-body text-lg font-bold tracking-tight text-foreground">
          Guardiens <span className="text-muted-foreground font-normal text-sm">Admin</span>
        </h1>
      </div>

      <nav className="flex-1 px-3 space-y-0.5">
        {adminNavItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={"end" in item ? item.end : false}
            className={({ isActive }) =>
              cn(
                "flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-medium transition-colors",
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
      </nav>

      <div className="p-3 border-t border-border space-y-1">
        <button
          onClick={() => navigate("/dashboard")}
          className="flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-medium text-muted-foreground hover:bg-accent hover:text-foreground transition-colors w-full"
        >
          <ArrowLeft className="h-4 w-4" />
          Retour à l'app
        </button>
        <button
          onClick={logout}
          className="flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-medium text-muted-foreground hover:bg-accent hover:text-foreground transition-colors w-full"
        >
          <LogOut className="h-4 w-4" />
          Déconnexion
        </button>
      </div>
    </aside>
  );
};
