import { NavLink, useLocation, useNavigate } from "react-router-dom";
import {
  Home, Search, Calendar, MessageSquare, User, LogOut, Settings,
  PawPrint, Newspaper, Shield, Compass, Handshake, Menu, Star,
  MoreHorizontal, Crown, Plus, Heart, LifeBuoy, Briefcase,
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useAdmin } from "@/hooks/useAdmin";
import { cn } from "@/lib/utils";
import { lazy, Suspense, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
// Lazy : NotificationBell tire date-fns. On évite vendor-date dans l'entry.
const NotificationBell = lazy(() => import("./NotificationBell"));
const MessageBell = lazy(() => import("./MessageBell"));
import { Sheet, SheetContent, SheetTrigger, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import FeedbackDialog from "@/components/feedback/FeedbackDialog";
import { useSubscriptionAccess } from "@/hooks/useSubscriptionAccess";
import PremiumGateDialog from "@/components/premium/PremiumGateDialog";
import ActivateRoleDialog from "@/components/premium/ActivateRoleDialog";

// ── Sidebar group label ──
const GroupLabel = ({ label }: { label: string }) => (
  <p className="px-4 pt-5 pb-1.5 text-[10px] font-semibold tracking-widest uppercase text-muted-foreground/60 select-none">
    {label}
  </p>
);

// ── Sidebar nav item ──
const SidebarItem = ({
  to, icon: Icon, label, badge, beta,
}: {
  to: string; icon: typeof Home; label: string; badge?: number; beta?: boolean;
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
    <span className="flex-1 truncate">{label}</span>
    {beta && (
      <span className="text-[9px] uppercase tracking-wider font-bold bg-amber-100 text-amber-800 px-1.5 py-0.5 rounded">
        Bêta
      </span>
    )}
    {badge !== undefined && badge > 0 && (
      <span className="bg-destructive text-destructive-foreground text-[10px] rounded-full min-w-[18px] h-[18px] flex items-center justify-center px-1 font-semibold tabular-nums">
        {badge > 99 ? "99+" : badge}
      </span>
    )}
  </NavLink>
);

export const Sidebar = () => {
  const { user, logout, activeRole, setActiveRole } = useAuth();
  const { isAdmin } = useAdmin();
  const navigate = useNavigate();
  const { hasAccess } = useSubscriptionAccess();
  const [unreadCount, setUnreadCount] = useState(0);
  const [ownerInboxCount, setOwnerInboxCount] = useState(0);
  const [sitterActionCount, setSitterActionCount] = useState(0);
  const [missionBadgeCount, setMissionBadgeCount] = useState(0);
  const [feedbackOpen, setFeedbackOpen] = useState(false);
  const [gateOpen, setGateOpen] = useState(false);
  const [gateFeature, setGateFeature] = useState("");
  const [roleDialogOpen, setRoleDialogOpen] = useState(false);
  const [roleDialogTarget, setRoleDialogTarget] = useState<"gardien" | "proprio">("proprio");

  const effectiveRole = user?.role === "both" ? activeRole : user?.role;
  // Badge sidebar/bottom-nav /sits : owner = candidatures reçues à traiter,
  // sitter = candidatures propres en attente d'action (pending côté gardien).
  const sitsBadge = effectiveRole === "owner" ? ownerInboxCount : sitterActionCount;

  useEffect(() => {
    if (!user) return;
    const loadCounts = async () => {
      // Unread messages
      const { data: convs } = await supabase
        .from("conversations")
        .select("id")
        .or(`owner_id.eq.${user.id},sitter_id.eq.${user.id}`);
      if (convs?.length) {
        const convIds = convs.map((c: any) => c.id);
        const { count } = await supabase
          .from("messages")
          .select("id", { count: "exact", head: true })
          .in("conversation_id", convIds)
          .neq("sender_id", user.id)
          .is("read_at", null);
        setUnreadCount(count || 0);
      } else {
        setUnreadCount(0);
      }

      // Owner inbox : candidatures pending reçues sur les annonces de l'utilisateur
      const { data: userSits } = await supabase
        .from("sits")
        .select("id")
        .eq("user_id", user.id);
      if (userSits?.length) {
        const { count: appCount } = await supabase
          .from("applications")
          .select("id", { count: "exact", head: true })
          .in("sit_id", userSits.map((s: any) => s.id))
          .eq("status", "pending");
        setOwnerInboxCount(appCount || 0);
      } else {
        setOwnerInboxCount(0);
      }

      // Sitter action : candidatures propres en attente (pending) côté gardien
      const { count: myAppsCount } = await supabase
        .from("applications")
        .select("id", { count: "exact", head: true })
        .eq("sitter_id", user.id)
        .eq("status", "pending");
      setSitterActionCount(myAppsCount || 0);


      // Mission conversations with unread messages
      const { data: missionConvs } = await supabase
        .from("conversations")
        .select("id, small_mission_id")
        .or(`owner_id.eq.${user.id},sitter_id.eq.${user.id}`)
        .not("small_mission_id", "is", null);
      if (missionConvs?.length) {
        const mConvIds = missionConvs.map((c: any) => c.id);
        const { count: mCount } = await supabase
          .from("messages")
          .select("id", { count: "exact", head: true })
          .in("conversation_id", mConvIds)
          .neq("sender_id", user.id)
          .is("read_at", null);
        setMissionBadgeCount(mCount || 0);
      } else {
        setMissionBadgeCount(0);
      }
    };
    loadCounts();
    const interval = setInterval(loadCounts, 15000);
    return () => clearInterval(interval);
  }, [user]);


  return (
    <aside className="hidden md:flex flex-col w-64 border-r border-border bg-card h-screen sticky top-0">
      {/* Logo + bell */}
      <div className="p-6 pb-4 flex items-center justify-between">
        <span className="font-heading text-2xl font-bold tracking-tight" aria-label="Guardiens, version bêta">
          <span className="text-primary" aria-hidden="true">g</span>
          <span className="text-foreground" aria-hidden="true">uardiens</span>
          <span className="ml-1.5 text-[10px] font-medium tracking-wide text-foreground/35 align-middle select-none" aria-hidden="true">bêta</span>
        </span>
        <div className="flex items-center gap-1">
          <Suspense fallback={<div className="w-9 h-9" aria-hidden />}>
            <MessageBell />
          </Suspense>
          <Suspense fallback={<div className="w-9 h-9" aria-hidden />}>
            <NotificationBell />
          </Suspense>
        </div>
      </div>
      <FeedbackDialog open={feedbackOpen} onOpenChange={setFeedbackOpen} />
      <PremiumGateDialog open={gateOpen} onClose={() => setGateOpen(false)} featureName={gateFeature} />
      <ActivateRoleDialog open={roleDialogOpen} onClose={() => setRoleDialogOpen(false)} targetRole={roleDialogTarget} />

      {/* Role toggle */}
      <div className="px-3 pb-2">
        <div className="flex items-center bg-accent rounded-lg p-1 gap-1">
          <button
            onClick={() => {
              if (user?.role === "both" || user?.role === "owner") {
                setActiveRole("owner");
              } else {
                setRoleDialogTarget("proprio");
                setRoleDialogOpen(true);
              }
            }}
            className={cn(
              "flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-md text-xs font-medium transition-colors",
              (user?.role === "both" || user?.role === "owner") && activeRole === "owner"
                ? "bg-primary text-primary-foreground shadow-sm"
                : user?.role === "sitter"
                ? "text-muted-foreground/60 hover:text-muted-foreground"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            <PawPrint className="h-3.5 w-3.5" />
            Propriétaire
            {user?.role === "sitter" && <Plus className="h-[11px] w-[11px]" />}
          </button>
          <button
            onClick={() => {
              if (user?.role === "both" || user?.role === "sitter") {
                setActiveRole("sitter");
              } else {
                setRoleDialogTarget("gardien");
                setRoleDialogOpen(true);
              }
            }}
            className={cn(
              "flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-md text-xs font-medium transition-colors",
              (user?.role === "both" || user?.role === "sitter") && activeRole === "sitter"
                ? "bg-primary text-primary-foreground shadow-sm"
                : user?.role === "owner"
                ? "text-muted-foreground/60 hover:text-muted-foreground"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            <User className="h-3.5 w-3.5" />
            Gardien
            {user?.role === "owner" && <Plus className="h-[11px] w-[11px]" />}
          </button>
        </div>
      </div>

      {/* Nav groups */}
      <nav className="flex-1 px-3 overflow-y-auto" aria-label="Navigation principale">
        {(() => {
          const isSitterLocked = effectiveRole === "sitter" && !hasAccess;
          const premiumItems = [
            { to: "/search", label: effectiveRole === "owner" ? "Recherche gardiens" : "Recherche", featureName: "la recherche d'annonces" },
            { to: "/messages", label: "Messagerie", featureName: "la messagerie" },
          ];

          const handlePremiumClick = (featureName: string) => {
            setGateFeature(featureName);
            setGateOpen(true);
          };

          return (
            <>
              <GroupLabel label="Mon activité" />
              <SidebarItem to="/dashboard" icon={Home} label="Dashboard" />
              <SidebarItem to="/sits" icon={Calendar} label={effectiveRole === "owner" ? "Mes annonces" : "Mes candidatures"} badge={sitsBadge} />

              {/* Messagerie : déplacée dans la cloche du header (MessageBell)
                  pour désencombrer la sidebar et la traiter comme un canal de
                  notifications (popover) plutôt que comme une destination. */}

              <SidebarItem to={effectiveRole === "owner" ? "/owner-profile" : "/profile"} icon={User} label="Mon profil" />
              <SidebarItem to="/mes-avis" icon={Star} label="Mes avis" />
              <SidebarItem to="/favoris" icon={Heart} label="Mes favoris" />

              <GroupLabel label="Découvrir" />

              {isSitterLocked ? (
                <button
                  type="button"
                  onClick={() => handlePremiumClick("la recherche d'annonces")}
                  className="flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-medium transition-colors text-muted-foreground hover:bg-accent hover:text-foreground w-full text-left"
                >
                  <Search className="h-[18px] w-[18px]" strokeWidth={1.8} />
                  Recherche
                  <Crown className="h-[11px] w-[11px] text-amber-500 ml-1" />
                </button>
              ) : (
                <SidebarItem to="/search" icon={Search} label={effectiveRole === "owner" ? "Recherche gardiens" : "Recherche"} />
              )}

              <SidebarItem to="/pros" icon={Briefcase} label="Pros animaliers" beta />
              <SidebarItem to="/petites-missions" icon={Handshake} label="Petites missions" badge={missionBadgeCount} />

              <GroupLabel label="Ressources" />
              <SidebarItem to="/actualites" icon={Newspaper} label="Guides & Conseils" />
              <SidebarItem to="/guides" icon={Compass} label="Guides locaux" />
            </>
          );
        })()}
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
        <SidebarItem to="/contact" icon={LifeBuoy} label="Aide & contact" />

        {/* Feedback button */}
        <div className="border-t border-border/50 mt-auto pt-3">
          <Button
            variant="outline"
            onClick={() => setFeedbackOpen(true)}
            className="w-full justify-start gap-2 text-sm text-foreground/60 border-dashed hover:text-foreground hover:border-foreground/30"
          >
            <MessageSquare className="h-[15px] w-[15px]" />
            Donner mon avis
          </Button>
        </div>

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
  const { hasAccess } = useSubscriptionAccess();
  const [unreadCount, setUnreadCount] = useState(0);
  const [ownerInboxCount, setOwnerInboxCount] = useState(0);
  const [sitterActionCount, setSitterActionCount] = useState(0);
  const [missionBadgeCount, setMissionBadgeCount] = useState(0);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [feedbackOpen, setFeedbackOpen] = useState(false);
  const [gateOpen, setGateOpen] = useState(false);
  const [gateFeature, setGateFeature] = useState("");
  const [roleDialogOpen, setRoleDialogOpen] = useState(false);
  const [roleDialogTarget, setRoleDialogTarget] = useState<"gardien" | "proprio">("proprio");

  const effectiveRole = user?.role === "both" ? activeRole : user?.role;
  const sitsBadge = effectiveRole === "owner" ? ownerInboxCount : sitterActionCount;

  useEffect(() => {
    if (!user) return;
    const loadCount = async () => {
      const { data: convs } = await supabase
        .from("conversations")
        .select("id")
        .or(`owner_id.eq.${user.id},sitter_id.eq.${user.id}`);
      if (convs?.length) {
        const convIds = convs.map((c: any) => c.id);
        const { count } = await supabase
          .from("messages")
          .select("id", { count: "exact", head: true })
          .in("conversation_id", convIds)
          .neq("sender_id", user.id)
          .is("read_at", null);
        setUnreadCount(count || 0);
      } else {
        setUnreadCount(0);
      }

      const { data: userSits } = await supabase
        .from("sits")
        .select("id")
        .eq("user_id", user.id);
      if (userSits?.length) {
        const { count: appCount } = await supabase
          .from("applications")
          .select("id", { count: "exact", head: true })
          .in("sit_id", userSits.map((s: any) => s.id))
          .eq("status", "pending");
        setOwnerInboxCount(appCount || 0);
      } else {
        setOwnerInboxCount(0);
      }

      const { count: myAppsCount } = await supabase
        .from("applications")
        .select("id", { count: "exact", head: true })
        .eq("sitter_id", user.id)
        .eq("status", "pending");
      setSitterActionCount(myAppsCount || 0);

      const { data: missionConvs } = await supabase
        .from("conversations")
        .select("id, small_mission_id")
        .or(`owner_id.eq.${user.id},sitter_id.eq.${user.id}`)
        .not("small_mission_id", "is", null);
      if (missionConvs?.length) {
        const mConvIds = missionConvs.map((c: any) => c.id);
        const { count: mCount } = await supabase
          .from("messages")
          .select("id", { count: "exact", head: true })
          .in("conversation_id", mConvIds)
          .neq("sender_id", user.id)
          .is("read_at", null);
        setMissionBadgeCount(mCount || 0);
      } else {
        setMissionBadgeCount(0);
      }
    };
    loadCount();
    const interval = setInterval(loadCount, 15000);
    return () => clearInterval(interval);
  }, [user]);

  const navigate = useNavigate();

  // Signature Dock 2026 — 4 tabs role-aware + FAB central + Plus sheet
  const isOwnerView = effectiveRole === "owner";

  // FAB central : action de création contextuelle au rôle
  const fab = isOwnerView
    ? { to: "/sits/create", label: "Publier" }
    : { to: "/petites-missions/creer", label: "Demander" };

  // 2 onglets à gauche du FAB
  const leftTabs = [
    { to: "/dashboard", icon: Home, label: "Accueil", badge: isOwnerView ? ownerInboxCount : 0 },
    isOwnerView
      ? { to: "/sits", icon: Calendar, label: "Annonces", badge: ownerInboxCount }
      : { to: "/search", icon: Search, label: "Recherche", badge: 0 },
  ];

  // 1 onglet à droite du FAB (Plus sheet est le 4e slot)
  const rightTabs = [
    { to: "/petites-missions", icon: Handshake, label: "Entraide", badge: missionBadgeCount },
  ];


  const moreBadge = sitterActionCount + (isOwnerView ? 0 : sitsBadge);

  const renderTab = (item: { to: string; icon: typeof Home; label: string; badge?: number }) => {
    const isActive = location.pathname === item.to || location.pathname.startsWith(item.to + "/");
    const isSitterLocked = effectiveRole === "sitter" && !hasAccess;
    const isGated = isSitterLocked && item.to === "/search";

    if (isGated) {
      return (
        <button
          key={item.to}
          type="button"
          onClick={() => { setGateFeature("la recherche d'annonces"); setGateOpen(true); }}
          className="flex flex-col items-center justify-center flex-1 gap-1 transition-colors text-muted-foreground relative min-w-0"
        >
          <div className="relative">
            <item.icon className="h-5 w-5" strokeWidth={1.8} />
            <Crown className="h-[9px] w-[9px] text-amber-500 absolute -top-1 -right-1.5" />
          </div>
          <span className="text-[10px] font-medium tracking-wide uppercase truncate max-w-full px-1">{item.label}</span>
        </button>
      );
    }

    return (
      <NavLink
        key={item.to}
        to={item.to}
        className={cn(
          "flex flex-col items-center justify-center flex-1 gap-1 transition-colors relative min-w-0",
          isActive ? "text-primary" : "text-muted-foreground hover:text-foreground"
        )}
      >
        <div className="relative">
          <item.icon className="h-5 w-5" strokeWidth={isActive ? 2.2 : 1.8} />
          {item.badge !== undefined && item.badge > 0 && (
            <span className="absolute -top-1.5 -right-2 bg-destructive text-destructive-foreground text-[9px] rounded-full min-w-[16px] h-[16px] flex items-center justify-center px-1 font-bold tabular-nums border-2 border-card">
              {item.badge > 99 ? "99+" : item.badge}
            </span>
          )}
        </div>
        <span className="text-[10px] font-medium tracking-wide uppercase truncate max-w-full px-1">{item.label}</span>
      </NavLink>
    );
  };

  return (
    <>
      <FeedbackDialog open={feedbackOpen} onOpenChange={setFeedbackOpen} />
      <PremiumGateDialog open={gateOpen} onClose={() => setGateOpen(false)} featureName={gateFeature} />
      <ActivateRoleDialog open={roleDialogOpen} onClose={() => setRoleDialogOpen(false)} targetRole={roleDialogTarget} />

      <nav
        className="md:hidden fixed bottom-0 left-0 right-0 z-50 pointer-events-none px-3 pb-[max(0.5rem,env(safe-area-inset-bottom))]"
        aria-label="Navigation mobile"
      >
        <div className="pointer-events-auto mx-auto max-w-md bg-card border border-border/60 shadow-[0_20px_50px_-12px_hsl(var(--primary)/0.18)] rounded-3xl h-16 flex items-center justify-between px-1.5 relative">

          {leftTabs.map(renderTab)}

          {/* FAB central — action de création role-aware */}
          <div className="relative flex-1 flex justify-center -mt-7">
            <button
              type="button"
              onClick={() => navigate(fab.to)}
              aria-label={fab.label}
              className="group flex flex-col items-center justify-center"
            >
              <div className="w-14 h-14 bg-primary rounded-2xl shadow-lg shadow-primary/30 flex items-center justify-center text-primary-foreground transition-transform active:scale-95">
                <Plus className="h-7 w-7" strokeWidth={2} />
              </div>
              <span className="mt-1.5 text-primary font-serif italic text-[12px] font-semibold tracking-tight leading-none">
                {fab.label}
              </span>
            </button>
          </div>

          {rightTabs.map(renderTab)}

          {/* Plus sheet */}
          <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
            <SheetTrigger asChild>
              <button className="flex flex-col items-center justify-center flex-1 gap-1 text-muted-foreground hover:text-foreground transition-colors min-w-0 relative">
                <div className="relative">
                  <MoreHorizontal className="h-5 w-5" strokeWidth={1.8} />
                  {moreBadge > 0 && (
                    <span className="absolute -top-1.5 -right-2 bg-destructive text-destructive-foreground text-[9px] rounded-full min-w-[16px] h-[16px] flex items-center justify-center px-1 font-bold tabular-nums border-2 border-card">
                      {moreBadge > 99 ? "99+" : moreBadge}
                    </span>
                  )}
                </div>
                <span className="text-[10px] font-medium tracking-wide uppercase">Plus</span>
              </button>
            </SheetTrigger>

            <SheetContent side="bottom" className="rounded-t-2xl max-h-[80vh] overflow-y-auto">
              <SheetTitle className="sr-only">Menu</SheetTitle>
              <SheetDescription className="sr-only">Accès rapide aux profils, raccourcis et paramètres.</SheetDescription>
              {/* Role switcher */}
              <div className="mb-4">
                <p className="text-xs text-muted-foreground mb-2 font-medium">Profil actif</p>
                <div className="flex items-center bg-accent rounded-lg p-1 gap-1">
                  <button
                    onClick={() => {
                      if (user?.role === "both" || user?.role === "owner") {
                        setActiveRole("owner");
                      } else {
                        setSheetOpen(false);
                        setRoleDialogTarget("proprio");
                        setRoleDialogOpen(true);
                      }
                    }}
                    className={cn(
                      "flex-1 flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-md text-sm font-medium transition-colors",
                      (user?.role === "both" || user?.role === "owner") && activeRole === "owner"
                        ? "bg-primary text-primary-foreground shadow-sm"
                        : user?.role === "sitter"
                        ? "text-muted-foreground/60"
                        : "text-muted-foreground"
                    )}
                  >
                    <PawPrint className="h-4 w-4" /> Propriétaire
                    {user?.role === "sitter" && <Plus className="h-[11px] w-[11px]" />}
                  </button>
                  <button
                    onClick={() => {
                      if (user?.role === "both" || user?.role === "sitter") {
                        setActiveRole("sitter");
                      } else {
                        setSheetOpen(false);
                        setRoleDialogTarget("gardien");
                        setRoleDialogOpen(true);
                      }
                    }}
                    className={cn(
                      "flex-1 flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-md text-sm font-medium transition-colors",
                      (user?.role === "both" || user?.role === "sitter") && activeRole === "sitter"
                        ? "bg-primary text-primary-foreground shadow-sm"
                        : user?.role === "owner"
                        ? "text-muted-foreground/60"
                        : "text-muted-foreground"
                    )}
                  >
                    <User className="h-4 w-4" /> Gardien
                    {user?.role === "owner" && <Plus className="h-[11px] w-[11px]" />}
                  </button>
                </div>
              </div>

              <div className="space-y-1">
                {[
                  { to: "/search", icon: Search, label: effectiveRole === "owner" ? "Recherche gardiens" : "Annonces en cours", badge: 0 },
                  { to: "/sits", icon: Calendar, label: effectiveRole === "owner" ? "Mes annonces" : "Mes candidatures", badge: sitsBadge },
                  { to: "/favoris", icon: Heart, label: "Mes favoris", badge: 0 },
                  { to: "/petites-missions", icon: Handshake, label: "Petites missions", badge: missionBadgeCount },
                  { to: "/actualites", icon: Newspaper, label: "Guides & Conseils", badge: 0 },
                  { to: "/guides", icon: Compass, label: "Guides locaux", badge: 0 },
                  ...(effectiveRole === "sitter" ? [{ to: "/mon-abonnement", icon: Star, label: "Mon abonnement", badge: 0 }] : []),
                  { to: "/settings", icon: Settings, label: "Paramètres", badge: 0 },
                  { to: "/contact", icon: LifeBuoy, label: "Aide & contact", badge: 0 },
                  ...(isAdmin ? [{ to: "/admin", icon: Shield, label: "Espace admin", badge: 0 }] : []),
                ].map((item) => (
                  <NavLink
                    key={item.to}
                    to={item.to}
                    onClick={() => setSheetOpen(false)}
                    className={({ isActive }) =>
                      cn(
                        "flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors relative",
                        isActive
                          ? "bg-[hsl(var(--primary)/0.08)] text-primary"
                          : "text-muted-foreground hover:bg-accent hover:text-foreground"
                      )
                    }
                  >
                    <item.icon className="h-5 w-5" strokeWidth={1.8} />
                    {item.label}
                    {item.badge > 0 && (
                      <span className="absolute right-3 bg-destructive text-destructive-foreground text-[10px] rounded-full min-w-[18px] h-[18px] flex items-center justify-center px-1 font-semibold">
                        {item.badge > 99 ? "99+" : item.badge}
                      </span>
                    )}
                  </NavLink>
                ))}

                {/* Feedback button in mobile menu */}
                <div className="border-t border-border/50 pt-3 mt-3">
                  <Button
                    variant="outline"
                    onClick={() => { setSheetOpen(false); setFeedbackOpen(true); }}
                    className="w-full justify-start gap-2 text-sm text-foreground/60 border-dashed hover:text-foreground hover:border-foreground/30"
                  >
                    <MessageSquare className="h-[15px] w-[15px]" />
                    Donner mon avis
                  </Button>
                </div>

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
    </>
  );
};
