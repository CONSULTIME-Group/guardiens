import { NavLink, useLocation } from "react-router-dom";
import { Home, Search, Calendar, MessageSquare, User, LogOut, Bell, Settings, PawPrint, ArrowLeftRight, Newspaper, Shield, Compass, Handshake, Menu, X } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useAdmin } from "@/hooks/useAdmin";
import { cn } from "@/lib/utils";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import NotificationBell from "./NotificationBell";
import { Sheet, SheetContent, SheetTrigger, SheetClose } from "@/components/ui/sheet";

const navItems = [
  { to: "/dashboard", icon: Home, label: "Dashboard" },
  { to: "/search", icon: Search, label: "Recherche" },
  { to: "/sits", icon: Calendar, label: "Mes annonces", ownerLabel: "Mes annonces", sitterLabel: "Mes gardes" },
  { to: "/messages", icon: MessageSquare, label: "Messagerie" },
  { to: "/actualites", icon: Newspaper, label: "Actualités" },
  { to: "/guides", icon: Compass, label: "Guides locaux" },
  { to: "/petites-missions", icon: Handshake, label: "Entraide" },
  { to: "/owner-profile", icon: PawPrint, label: "Profil proprio", hideForRole: "sitter" as const },
  { to: "/profile", icon: User, label: "Mon profil" },
];

export const Sidebar = () => {
  const { user, logout, activeRole, setActiveRole } = useAuth();
  const { isAdmin } = useAdmin();
  const [unreadCount, setUnreadCount] = useState(0);

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
      <div className="p-6 pb-4 flex items-center justify-between">
        <h1 className="font-heading text-2xl font-bold tracking-tight">
          <span className="text-primary">g</span>
          <span className="text-foreground">uardiens</span>
        </h1>
        <NotificationBell />
      </div>

      {user?.role === "both" && (
        <div className="px-3 pb-3">
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

      <nav className="flex-1 px-3 space-y-1 overflow-y-auto">
        {navItems.filter(item => {
          if (!("hideForRole" in item)) return true;
          const effectiveRole = user?.role === "both" ? activeRole : user?.role;
          return effectiveRole !== item.hideForRole;
        }).map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            className={({ isActive }) =>
              cn(
                "flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors relative",
                isActive
                  ? "bg-primary/10 text-primary"
                  : "text-muted-foreground hover:bg-accent hover:text-foreground"
              )
            }
          >
            <item.icon className="h-5 w-5" />
            {item.label}
            {item.to === "/messages" && unreadCount > 0 && (
              <span className="absolute right-3 bg-primary text-primary-foreground text-xs rounded-full min-w-[20px] h-5 flex items-center justify-center px-1.5">
                {unreadCount}
              </span>
            )}
          </NavLink>
        ))}
      </nav>

      <div className="p-3 border-t border-border space-y-1">
        {isAdmin && (
          <NavLink
            to="/admin"
            className={({ isActive }) =>
              cn(
                "flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors",
                isActive
                  ? "bg-primary/10 text-primary"
                  : "text-muted-foreground hover:bg-accent hover:text-foreground"
              )
            }
          >
            <Shield className="h-5 w-5" />
            Espace admin
          </NavLink>
        )}
        <NavLink
          to="/settings"
          className={({ isActive }) =>
            cn(
              "flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors",
              isActive
                ? "bg-primary/10 text-primary"
                : "text-muted-foreground hover:bg-accent hover:text-foreground"
            )
          }
        >
          <Settings className="h-5 w-5" />
          Paramètres
        </NavLink>
        <button
          onClick={logout}
          className="flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium text-muted-foreground hover:bg-accent hover:text-foreground transition-colors w-full"
        >
          <LogOut className="h-5 w-5" />
          Déconnexion
        </button>
      </div>
    </aside>
  );
};

export const BottomNav = () => {
  const location = useLocation();
  const { user, activeRole, setActiveRole, logout } = useAuth();
  const { isAdmin } = useAdmin();
  const [notifCount, setNotifCount] = useState(0);
  const [sheetOpen, setSheetOpen] = useState(false);

  useEffect(() => {
    if (!user) return;
    const loadCount = async () => {
      const { count } = await supabase
        .from("notifications")
        .select("id", { count: "exact", head: true })
        .eq("user_id", user.id)
        .is("read_at", null);
      setNotifCount(count || 0);
    };
    loadCount();

    const channel = supabase
      .channel("bottomnav-notifs")
      .on("postgres_changes", {
        event: "INSERT",
        schema: "public",
        table: "notifications",
        filter: `user_id=eq.${user.id}`,
      }, () => setNotifCount((c) => c + 1))
      .on("postgres_changes", {
        event: "UPDATE",
        schema: "public",
        table: "notifications",
        filter: `user_id=eq.${user.id}`,
      }, () => loadCount())
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [user]);

  const effectiveRole = user?.role === "both" ? activeRole : user?.role;

  const mobileItems = [
    { to: "/dashboard", icon: Home, label: "Accueil" },
    { to: "/search", icon: Search, label: "Recherche" },
    { to: "/sits", icon: Calendar, label: "Gardes" },
    { to: "/notifications", icon: Bell, label: "Notifs" },
  ];

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-card border-t border-border z-50">
      <div className="flex justify-around items-center h-16 px-2">
        {mobileItems.map((item) => {
          const isActive = location.pathname === item.to;
          return (
            <NavLink
              key={item.to}
              to={item.to}
              className={cn(
                "flex flex-col items-center gap-1 px-2 py-1 text-xs transition-colors relative",
                isActive ? "text-primary" : "text-muted-foreground"
              )}
            >
              <div className="relative">
                <item.icon className="h-5 w-5" />
                {item.to === "/notifications" && notifCount > 0 && (
                  <span className="absolute -top-1.5 -right-2 bg-primary text-primary-foreground text-[9px] rounded-full min-w-[16px] h-4 flex items-center justify-center px-1 font-medium">
                    {notifCount > 99 ? "99+" : notifCount}
                  </span>
                )}
              </div>
              <span className="truncate max-w-[60px]">{item.label}</span>
            </NavLink>
          );
        })}

        {/* More menu */}
        <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
          <SheetTrigger asChild>
            <button className="flex flex-col items-center gap-1 px-2 py-1 text-xs text-muted-foreground transition-colors">
              <Menu className="h-5 w-5" />
              <span>Plus</span>
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
                      activeRole === "owner"
                        ? "bg-primary text-primary-foreground shadow-sm"
                        : "text-muted-foreground hover:text-foreground"
                    )}
                  >
                    <PawPrint className="h-4 w-4" />
                    Propriétaire
                  </button>
                  <button
                    onClick={() => setActiveRole("sitter")}
                    className={cn(
                      "flex-1 flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-md text-sm font-medium transition-colors",
                      activeRole === "sitter"
                        ? "bg-primary text-primary-foreground shadow-sm"
                        : "text-muted-foreground hover:text-foreground"
                    )}
                  >
                    <User className="h-4 w-4" />
                    Gardien
                  </button>
                </div>
              </div>
            )}

            <div className="space-y-1">
              {[
                { to: "/messages", icon: MessageSquare, label: "Messagerie" },
                { to: "/actualites", icon: Newspaper, label: "Actualités" },
                { to: "/guides", icon: Compass, label: "Guides locaux" },
                { to: "/petites-missions", icon: Handshake, label: "Entraide" },
                ...(effectiveRole !== "sitter" ? [{ to: "/owner-profile", icon: PawPrint, label: "Profil proprio" }] : []),
                { to: "/profile", icon: User, label: "Mon profil" },
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
                        ? "bg-primary/10 text-primary"
                        : "text-muted-foreground hover:bg-accent hover:text-foreground"
                    )
                  }
                >
                  <item.icon className="h-5 w-5" />
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
