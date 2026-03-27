import { NavLink, useLocation } from "react-router-dom";
import {
  Home, Search, Calendar, MessageSquare, User, LogOut, Settings,
  PawPrint, Newspaper, Shield, Compass, Handshake, Menu, Star,
  MoreHorizontal,
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useAdmin } from "@/hooks/useAdmin";
import { cn } from "@/lib/utils";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import NotificationBell from "./NotificationBell";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";

// ── Sidebar group label ──
const GroupLabel = ({ label }: { label: string }) => (
  <p className="px-4 pt-5 pb-1.5 text-[10px] font-semibold tracking-widest uppercase text-muted-foreground/60 select-none">
    {label}
  </p>
);

// ── Sidebar nav item ──
const SidebarItem = ({
  to, icon: Icon, label, badge,
}: {
  to: string; icon: typeof Home; label: string; badge?: number;
}) => (
  <NavLink
    to={to}
    className={({ isActive }) =>
      cn(
        "flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-medium transition-colors relative",
        isActive
          ? "bg-[hsl(var(--primary)/0.08)] text-[#2D6A4F] before:absolute before:left-0 before:top-1/2 before:-translate-y-1/2 before:w-[3px] before:h-5 before:rounded-r before:bg-[#2D6A4F]"
          : "text-[#9A958A] hover:bg-accent hover:text-foreground"
      )
    }
  >
    <Icon className="h-[18px] w-[18px]" strokeWidth={1.8} />
    {label}
    {badge !== undefined && badge > 0 && (
      <span className="absolute right-3 bg-destructive text-destructive-foreground text-[10px] rounded-full min-w-[18px] h-[18px] flex items-center justify-center px-1 font-semibold">
        {badge > 99 ? "99+" : badge}
      </span>
    )}
  </NavLink>
);

export const Sidebar = () => {
  const { user, logout, activeRole, setActiveRole } = useAuth();
  const { isAdmin } = useAdmin();
  const [unreadCount, setUnreadCount] = useState(0);

  const effectiveRole = user?.role === "both" ? activeRole : user?.role;

  useEffect(() => {
    if (!user) return;
    const loadUnread = async () => {
      const { data: convs } = await supabase
        .from("conversations")
        .select("id")
        .or(`owner_id.eq.${user.id},sitter_id.eq.${user.id}`);
      if (!convs?.length) return;
      const convIds = convs.map((c: any) => c.id);
      const { count } = await supabase
        .from("messages")
        .select("id", { count: "exact", head: true })
        .in("conversation_id", convIds)
        .neq("sender_id", user.id)
        .is("read_at", null);
      setUnreadCount(count || 0);
    };
    loadUnread();
    const interval = setInterval(loadUnread, 15000);
    return () => clearInterval(interval);
  }, [user]);

  return (
    <aside className="hidden md:flex flex-col w-64 border-r border-border bg-card h-screen sticky top-0">
      {/* Logo + bell */}
      <div className="p-6 pb-4 flex items-center justify-between">
        <h1 className="font-heading text-2xl font-bold tracking-tight">
          <span className="text-primary">g</span>
          <span className="text-foreground">uardiens</span>
        </h1>
        <NotificationBell />
      </div>

      {/* Role toggle */}
      {user?.role === "both" && (
        <div className="px-3 pb-2">
          <div className="flex items-center bg-accent rounded-lg p-1 gap-1">
            <button
              onClick={() => setActiveRole("owner")}
              className={cn(
                "flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-md text-xs font-medium transition-colors",
                activeRole === "owner"
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              <PawPrint className="h-3.5 w-3.5" />
              Propriétaire
            </button>
            <button
              onClick={() => setActiveRole("sitter")}
              className={cn(
                "flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-md text-xs font-medium transition-colors",
                activeRole === "sitter"
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              <User className="h-3.5 w-3.5" />
              Gardien
            </button>
          </div>
        </div>
      )}

      {/* Nav groups */}
      <nav className="flex-1 px-3 overflow-y-auto">
        <GroupLabel label="Mon activité" />
        <SidebarItem to="/dashboard" icon={Home} label="Dashboard" />
        <SidebarItem to="/sits" icon={Calendar} label={effectiveRole === "owner" ? "Mes annonces" : "Mes gardes"} />
        <SidebarItem to="/messages" icon={MessageSquare} label="Messagerie" badge={unreadCount} />
        <SidebarItem to="/profile" icon={User} label="Mon profil" />

        <GroupLabel label="Découvrir" />
        <SidebarItem to="/search" icon={Search} label={effectiveRole === "owner" ? "Recherche gardiens" : "Recherche"} />
        <SidebarItem to="/petites-missions" icon={Handshake} label="Petites missions" />

        <GroupLabel label="Ressources" />
        <SidebarItem to="/actualites" icon={Newspaper} label="Actualités" />
        <SidebarItem to="/guides" icon={Compass} label="Guides locaux" />
      </nav>

      {/* Bottom section */}
      <div className="p-3 border-t border-border space-y-0.5">
        {effectiveRole === "sitter" && (
          <SidebarItem to="/mon-abonnement" icon={Star} label="Mon abonnement" />
        )}
        {isAdmin && (
          <SidebarItem to="/admin" icon={Shield} label="Espace admin" />
        )}
        <SidebarItem to="/settings" icon={Settings} label="Paramètres" />
        <button
          onClick={logout}
          className="flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-medium text-[#9A958A] hover:bg-accent hover:text-foreground transition-colors w-full"
        >
          <LogOut className="h-[18px] w-[18px]" strokeWidth={1.8} />
          Déconnexion
        </button>
      </div>
    </aside>
  );
};

// ── Mobile bottom nav ──
export const BottomNav = () => {
  const location = useLocation();
  const { user, activeRole, setActiveRole, logout } = useAuth();
  const { isAdmin } = useAdmin();
  const [unreadCount, setUnreadCount] = useState(0);
  const [sheetOpen, setSheetOpen] = useState(false);

  const effectiveRole = user?.role === "both" ? activeRole : user?.role;

  useEffect(() => {
    if (!user) return;
    const loadCount = async () => {
      const { data: convs } = await supabase
        .from("conversations")
        .select("id")
        .or(`owner_id.eq.${user.id},sitter_id.eq.${user.id}`);
      if (!convs?.length) { setUnreadCount(0); return; }
      const { count } = await supabase
        .from("messages")
        .select("id", { count: "exact", head: true })
        .in("conversation_id", convs.map((c: any) => c.id))
        .neq("sender_id", user.id)
        .is("read_at", null);
      setUnreadCount(count || 0);
    };
    loadCount();
    const interval = setInterval(loadCount, 15000);
    return () => clearInterval(interval);
  }, [user]);

  const tabs = [
    { to: "/dashboard", icon: Home, label: "Accueil" },
    { to: "/search", icon: Search, label: "Recherche" },
    { to: "/messages", icon: MessageSquare, label: "Messages", badge: unreadCount },
    { to: "/profile", icon: User, label: "Profil" },
  ];

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-card border-t border-border z-50">
      <div className="flex justify-around items-center h-16 px-1">
        {tabs.map((item) => {
          const isActive = location.pathname === item.to || location.pathname.startsWith(item.to + "/");
          return (
            <NavLink
              key={item.to}
              to={item.to}
              className={cn(
                "flex flex-col items-center gap-0.5 px-2 py-1 text-[10px] transition-colors relative min-w-[56px]",
                isActive ? "text-[#2D6A4F]" : "text-[#9A958A]"
              )}
            >
              <div className="relative">
                <item.icon className="h-5 w-5" strokeWidth={isActive ? 2.2 : 1.8} />
                {item.badge !== undefined && item.badge > 0 && (
                  <span className="absolute -top-1 -right-2 bg-destructive text-destructive-foreground text-[8px] rounded-full min-w-[14px] h-[14px] flex items-center justify-center px-0.5 font-bold">
                    {item.badge > 99 ? "99+" : item.badge}
                  </span>
                )}
              </div>
              <span className="font-medium">{item.label}</span>
            </NavLink>
          );
        })}

        {/* More */}
        <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
          <SheetTrigger asChild>
            <button className="flex flex-col items-center gap-0.5 px-2 py-1 text-[10px] text-[#9A958A] transition-colors min-w-[56px]">
              <MoreHorizontal className="h-5 w-5" strokeWidth={1.8} />
              <span className="font-medium">Plus</span>
            </button>
          </SheetTrigger>
          <SheetContent side="bottom" className="rounded-t-2xl max-h-[80vh] overflow-y-auto">
            {/* Role switcher */}
            {user?.role === "both" && (
              <div className="mb-4">
                <p className="text-xs text-muted-foreground mb-2 font-medium">Profil actif</p>
                <div className="flex items-center bg-accent rounded-lg p-1 gap-1">
                  <button
                    onClick={() => setActiveRole("owner")}
                    className={cn(
                      "flex-1 flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-md text-sm font-medium transition-colors",
                      activeRole === "owner" ? "bg-primary text-primary-foreground shadow-sm" : "text-muted-foreground"
                    )}
                  >
                    <PawPrint className="h-4 w-4" /> Propriétaire
                  </button>
                  <button
                    onClick={() => setActiveRole("sitter")}
                    className={cn(
                      "flex-1 flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-md text-sm font-medium transition-colors",
                      activeRole === "sitter" ? "bg-primary text-primary-foreground shadow-sm" : "text-muted-foreground"
                    )}
                  >
                    <User className="h-4 w-4" /> Gardien
                  </button>
                </div>
              </div>
            )}

            <div className="space-y-1">
              {[
                { to: "/sits", icon: Calendar, label: effectiveRole === "owner" ? "Mes annonces" : "Mes gardes" },
                { to: "/petites-missions", icon: Handshake, label: "Petites missions" },
                { to: "/actualites", icon: Newspaper, label: "Actualités" },
                { to: "/guides", icon: Compass, label: "Guides locaux" },
                ...(effectiveRole === "sitter" ? [{ to: "/pricing", icon: Star, label: "Mon abonnement" }] : []),
                { to: "/settings", icon: Settings, label: "Paramètres" },
                ...(isAdmin ? [{ to: "/admin", icon: Shield, label: "Espace admin" }] : []),
              ].map((item) => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  onClick={() => setSheetOpen(false)}
                  className={({ isActive }) =>
                    cn(
                      "flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors",
                      isActive
                        ? "bg-[hsl(var(--primary)/0.08)] text-[#2D6A4F]"
                        : "text-muted-foreground hover:bg-accent hover:text-foreground"
                    )
                  }
                >
                  <item.icon className="h-5 w-5" strokeWidth={1.8} />
                  {item.label}
                </NavLink>
              ))}

              <button
                onClick={() => { setSheetOpen(false); logout(); }}
                className="flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium text-destructive hover:bg-destructive/10 transition-colors w-full"
              >
                <LogOut className="h-5 w-5" />
                Déconnexion
              </button>
            </div>
          </SheetContent>
        </Sheet>
      </div>
    </nav>
  );
};
