import { NavLink, Link, useLocation, useNavigate } from "react-router-dom";
import {
  Home, Search, Calendar, MessageSquare, User,
  PawPrint, Handshake, MoreHorizontal, Crown, Plus, Globe,
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { cn } from "@/lib/utils";
import { lazy, Suspense, useLayoutEffect, useRef, useState } from "react";
import { useNavBadgeCounts } from "@/hooks/useNavBadgeCounts";
import { useChromeVisibility } from "./ChromeVisibility";
import UserMenu from "./UserMenu";
import { isFabHidden } from "@/lib/bottomNavFab";
import {
  buildNavGroups,
  flattenNavGroups,
  entryBadge,
  sheetBadge,
  type NavBadgeValues,
} from "@/lib/navModel";

// Lazy : NotificationBell tire date-fns. On évite vendor-date dans l'entry.
const NotificationBell = lazy(() => import("./NotificationBell"));
const MessageBell = lazy(() => import("./MessageBell"));
import { Sheet, SheetContent, SheetTrigger, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import FeedbackDialog from "@/components/feedback/FeedbackDialog";
import { useSubscriptionAccess } from "@/hooks/useSubscriptionAccess";
import PremiumGateDialog from "@/components/premium/PremiumGateDialog";
import ActivateRoleDialog from "@/components/premium/ActivateRoleDialog";

// ── Libellé de groupe de la barre latérale ──
const GroupLabel = ({ label }: { label: string }) => (
  <p className="px-4 pt-2 pb-1 first:pt-1 text-[10px] font-semibold tracking-widest uppercase text-muted-foreground select-none">
    {label}
  </p>
);

// ── Entrée de navigation de la barre latérale ──
const SidebarItem = ({
  to, icon: Icon, label, badge, beta,
}: {
  to: string; icon: typeof Home; label: string; badge?: number; beta?: boolean;
}) => (
  <NavLink
    to={to}
    className={({ isActive }) =>
      cn(
        "flex items-center gap-3 px-4 py-2 rounded-lg text-sm font-medium transition-colors relative",
        isActive
          ? "bg-primary/8 text-primary before:absolute before:left-0 before:top-1/2 before:-translate-y-1/2 before:w-[3px] before:h-5 before:rounded-r before:bg-primary"
          : "text-muted-foreground hover:bg-accent hover:text-foreground"
      )
    }
  >
    <Icon className="h-[18px] w-[18px]" strokeWidth={1.8} />
    <span className="flex-1 truncate">{label}</span>
    {beta && (
      <span className="text-[9px] uppercase tracking-wider font-bold bg-warning/15 text-warning-foreground px-1.5 py-0.5 rounded">
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

export const Sidebar = ({ showHeaderBells = true }: { showHeaderBells?: boolean }) => {
  const { user, activeRole, setActiveRole } = useAuth();
  const navigate = useNavigate();
  const { hasAccess } = useSubscriptionAccess();
  const { unreadCount, ownerInboxCount, sitterActionCount, missionBadgeCount } =
    useNavBadgeCounts(user?.id);
  const [feedbackOpen, setFeedbackOpen] = useState(false);
  const [gateOpen, setGateOpen] = useState(false);
  const [gateFeature, setGateFeature] = useState("");
  const [roleDialogOpen, setRoleDialogOpen] = useState(false);
  const [roleDialogTarget, setRoleDialogTarget] = useState<"gardien" | "proprio">("proprio");

  const effectiveRole = user?.role === "both" ? activeRole : user?.role;
  // Pastille annonces/candidatures : propriétaire = candidatures reçues à
  // traiter, gardien = candidatures propres en attente.
  const sitsBadge = effectiveRole === "owner" ? ownerInboxCount : sitterActionCount;
  const navBadges: NavBadgeValues = {
    sits: sitsBadge,
    messages: unreadCount,
    entraide: missionBadgeCount,
  };
  const isSitterLocked = effectiveRole === "sitter" && !hasAccess;
  const groups = buildNavGroups(effectiveRole === "owner" ? "owner" : "sitter", isSitterLocked);

  // En-tête compact au défilement : quand le menu descend, la bascule de
  // rôle et le bouton d'action primaire se replient ; le logo et l'avatar
  // restent. Le repli est purement visuel et reste fonctionnel sans
  // animation (prefers-reduced-motion).
  const navRef = useRef<HTMLElement | null>(null);
  const [navScrolled, setNavScrolled] = useState(false);
  const handleNavScroll = () => {
    const el = navRef.current;
    if (!el) return;
    const next = el.scrollTop > 8;
    setNavScrolled((prev) => (prev === next ? prev : next));
  };

  return (
    <aside className="hidden md:flex flex-col w-64 border-r border-border bg-card h-screen sticky top-0">
      {/* Logo + cloches */}
      <div className="px-6 pt-5 pb-3 flex items-center justify-between">
        <Link
          to="/"
          aria-label="Guardiens, accueil"
          className="font-heading text-2xl font-bold tracking-tight rounded-md transition-colors hover:opacity-80"
        >
          <span className="text-primary" aria-hidden="true">g</span>
          <span className="text-foreground" aria-hidden="true">uardiens</span>
          <span className="ml-1.5 text-[10px] font-medium tracking-wide text-foreground/35 align-middle select-none" aria-hidden="true">bêta</span>
        </Link>
        {showHeaderBells && <div className="flex items-center gap-1">
          <Suspense fallback={<div className="w-9 h-9" aria-hidden />}>
            <MessageBell />
          </Suspense>
          <Suspense fallback={<div className="w-9 h-9" aria-hidden />}>
            <NotificationBell />
          </Suspense>
        </div>}
      </div>

      {/* Avatar et menu compte */}
      <div className="px-6 pb-2 flex items-center gap-2">
        <UserMenu />
        <span className="text-sm text-muted-foreground truncate">
          {user?.firstName || "Mon compte"}
        </span>
      </div>

      <FeedbackDialog open={feedbackOpen} onOpenChange={setFeedbackOpen} />
      <PremiumGateDialog open={gateOpen} onClose={() => setGateOpen(false)} featureName={gateFeature} />
      <ActivateRoleDialog open={roleDialogOpen} onClose={() => setRoleDialogOpen(false)} targetRole={roleDialogTarget} />

      {/* Bloc repliable au défilement : bascule de rôle + action primaire */}
      <div
        aria-hidden={navScrolled}
        className={cn(
          "overflow-hidden transition-[max-height,opacity] duration-300 ease-in-out motion-reduce:transition-none",
          navScrolled ? "max-h-0 opacity-0 pointer-events-none" : "max-h-[220px] opacity-100"
        )}
      >
        {/* Bascule de rôle */}
        <div className="px-3 pb-2">
          <div className="flex items-center bg-accent rounded-lg p-1 gap-1">
            <button
              tabIndex={navScrolled ? -1 : undefined}
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
              tabIndex={navScrolled ? -1 : undefined}
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

        {/* Action primaire */}
        <div className="px-3 pb-2">
          <Button
            tabIndex={navScrolled ? -1 : undefined}
            className="w-full gap-2"
            onClick={() =>
              navigate(
                effectiveRole === "owner"
                  ? "/sits/create"
                  : "/petites-missions/creer?type=offre"
              )
            }
          >
            <Plus className="h-4 w-4" />
            {effectiveRole === "owner" ? "Publier une annonce" : "Proposer un coup de main"}
          </Button>
        </div>
      </div>

      {/* Groupes de navigation, source unique : navModel.ts */}
      <nav
        ref={navRef}
        onScroll={handleNavScroll}
        className="flex-1 px-3 overflow-y-auto"
        aria-label="Navigation principale"
      >
        {groups.map((group) => (
          <div key={group.id}>
            <GroupLabel label={group.label} />
            {group.entries.map((entry) =>
              entry.premiumLock ? (
                <button
                  key={entry.to}
                  type="button"
                  onClick={() => {
                    setGateFeature(entry.premiumLock as string);
                    setGateOpen(true);
                  }}
                  className="flex items-center gap-3 px-4 py-2 rounded-lg text-sm font-medium transition-colors text-muted-foreground hover:bg-accent hover:text-foreground w-full text-left"
                >
                  <entry.icon className="h-[18px] w-[18px]" strokeWidth={1.8} />
                  <span className="flex-1 truncate">{entry.label}</span>
                  <Crown className="h-[11px] w-[11px] text-warning ml-1" />
                </button>
              ) : (
                <SidebarItem
                  key={entry.to}
                  to={entry.to}
                  icon={entry.icon}
                  label={entry.label}
                  badge={entryBadge(entry, navBadges)}
                  beta={entry.beta}
                />
              )
            )}
          </div>
        ))}
      </nav>

      {/* Bas de colonne : uniquement le bouton de retour d'expérience */}
      <div className="p-3 border-t border-border">
        <Button
          variant="outline"
          onClick={() => setFeedbackOpen(true)}
          className="w-full justify-start gap-2 text-sm text-foreground/60 border-dashed hover:text-foreground hover:border-foreground/30"
        >
          <MessageSquare className="h-[15px] w-[15px]" />
          Donner mon avis
        </Button>
      </div>
    </aside>
  );
};

// ── Barre de navigation basse mobile ──
export const BottomNav = () => {
  const location = useLocation();
  const { user, activeRole, setActiveRole } = useAuth();
  const { hasAccess } = useSubscriptionAccess();
  const { unreadCount, ownerInboxCount, sitterActionCount, missionBadgeCount } =
    useNavBadgeCounts(user?.id);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [feedbackOpen, setFeedbackOpen] = useState(false);
  const [gateOpen, setGateOpen] = useState(false);
  const [gateFeature, setGateFeature] = useState("");
  const [roleDialogOpen, setRoleDialogOpen] = useState(false);
  const [roleDialogTarget, setRoleDialogTarget] = useState<"gardien" | "proprio">("proprio");

  const effectiveRole = user?.role === "both" ? activeRole : user?.role;
  const sitsBadge = effectiveRole === "owner" ? ownerInboxCount : sitterActionCount;
  const navBadges: NavBadgeValues = {
    sits: sitsBadge,
    messages: unreadCount,
    entraide: missionBadgeCount,
  };

  const navigate = useNavigate();

  // La barre basse est rendue sans condition, sur toutes les routes. Aucune
  // lecture de défilement, aucun observateur, aucune boucle d'animation : la
  // navigation principale ne doit jamais dépendre d'un mécanisme que le
  // navigateur peut suspendre. Le recouvrement des boutons du hero est réglé
  // par la géométrie du hero, pas par du code au runtime.

  // Un écran plein cadre (fil de messagerie mobile) peut demander le retrait
  // complet de la barre basse et de son bouton flottant, pour ne jamais
  // recouvrir une zone de saisie.
  const { bottomNavHidden } = useChromeVisibility();

  // Hauteur réelle de la pilule exposée en variable CSS, pour que les barres
  // d'action collantes des pages s'empilent au dessus sans valeur en dur.
  const pillRef = useRef<HTMLElement | null>(null);
  useLayoutEffect(() => {
    if (typeof window === "undefined") return;
    if (bottomNavHidden) {
      document.documentElement.style.setProperty("--bottom-nav-h", "0px");
      return;
    }
    const el = pillRef.current;
    if (!el) return;

    const apply = () => {
      const h = Math.round(el.getBoundingClientRect().height);
      document.documentElement.style.setProperty("--bottom-nav-h", `${h}px`);
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
      document.documentElement.style.setProperty("--bottom-nav-h", "0px");
    };
  }, [bottomNavHidden]);

  // Dock : 4 onglets role-aware + FAB contextuel + feuille Plus
  const isOwnerView = effectiveRole === "owner";
  const path = location.pathname;

  // FAB contextuel : libellé et destination s'adaptent à la section et au rôle.
  // Propriétaire : publier une garde ou demander un coup de main.
  // Gardien : proposer son aide (mission type=offre).
  let fab: { to: string; label: string };
  if (path.startsWith("/petites-missions")) {
    fab = isOwnerView
      ? { to: "/petites-missions/creer?type=besoin", label: "Demander" }
      : { to: "/petites-missions/creer?type=offre", label: "Proposer" };
  } else if (path.startsWith("/sits") || path.startsWith("/recherche-gardiens")) {
    // Sur les pages annonces de garde, seul un propriétaire peut publier.
    // Pour un gardien, on bascule sur l'action principale de son rôle.
    fab = isOwnerView
      ? { to: "/sits/create", label: "Publier" }
      : { to: "/petites-missions/creer?type=offre", label: "Proposer" };
  } else {
    // Accueil, recherche, profil, réglages : action principale du rôle actif.
    fab = isOwnerView
      ? { to: "/sits/create", label: "Publier" }
      : { to: "/petites-missions/creer?type=offre", label: "Proposer" };
  }

  // 2 onglets à gauche du FAB
  const leftTabs = [
    { to: "/dashboard", icon: Home, label: "Accueil", badge: isOwnerView ? ownerInboxCount : 0 },
    isOwnerView
      ? { to: "/sits", icon: Calendar, label: "Annonces", badge: ownerInboxCount }
      : { to: "/search", icon: Search, label: "Recherche", badge: 0 },
  ];

  // 1 onglet à droite du FAB (la feuille Plus est le 4e slot)
  const rightTabs = [
    { to: "/petites-missions", icon: Handshake, label: "Entraide", badge: missionBadgeCount },
  ];

  const fabHidden = isFabHidden(path);

  // Pastille du bouton Plus : somme exacte des pastilles visibles dans la
  // feuille (voir navModel.sheetBadge), sans doublon.
  const isSitterLocked = effectiveRole === "sitter" && !hasAccess;
  const sheetEntries = flattenNavGroups(
    buildNavGroups(isOwnerView ? "owner" : "sitter", isSitterLocked)
  );
  const moreBadge = sheetBadge(navBadges);

  const renderTab = (item: { to: string; icon: typeof Home; label: string; badge?: number }) => {
    const isActive = path === item.to || path.startsWith(item.to + "/");
    const isGated = isSitterLocked && item.to === "/search";

    const inner = (
      <>
        {/* Indicateur d'onglet actif : barre fine en haut du slot */}
        <span
          className={cn(
            "absolute top-0 left-1/2 -translate-x-1/2 h-[3px] w-7 rounded-b-full bg-primary transition-all duration-300",
            isActive ? "opacity-100 scale-x-100" : "opacity-0 scale-x-50"
          )}
          aria-hidden="true"
        />
        <div className="relative">
          <item.icon className="h-5 w-5 transition-transform duration-200" strokeWidth={isActive ? 2.2 : 1.8} />
          {isGated && <Crown className="h-[9px] w-[9px] text-warning absolute -top-1 -right-1.5" />}
          {item.badge !== undefined && item.badge > 0 && (
            <span className="absolute -top-1.5 -right-2 bg-destructive text-destructive-foreground text-[9px] rounded-full min-w-[16px] h-[16px] flex items-center justify-center px-1 font-bold tabular-nums border-2 border-card">
              {item.badge > 99 ? "99+" : item.badge}
            </span>
          )}
        </div>
        <span className="text-[10px] font-medium tracking-tight truncate max-w-full px-0.5 leading-tight">{item.label}</span>
      </>
    );

    const baseCls = cn(
      "flex flex-col items-center justify-center flex-1 h-full min-h-[44px] gap-1 relative min-w-0 pt-1.5 transition-colors active:scale-95 duration-150",
      isActive ? "text-primary" : "text-muted-foreground hover:text-foreground"
    );

    if (isGated) {
      return (
        <button
          key={item.to}
          type="button"
          onClick={() => { setGateFeature("la recherche d'annonces"); setGateOpen(true); }}
          className={baseCls}
        >
          {inner}
        </button>
      );
    }

    return (
      <NavLink key={item.to} to={item.to} className={baseCls}>
        {inner}
      </NavLink>
    );
  };

  // Retrait complet demandé par l'écran courant (fil de messagerie mobile).
  // La barre est en md:hidden, le desktop n'est donc pas concerné.
  if (bottomNavHidden) return null;

  const sheetItemCls = (active: boolean) =>
    cn(
      "flex items-center gap-3 px-4 py-3 min-h-[44px] rounded-lg text-sm font-medium transition-colors relative",
      active
        ? "bg-primary/8 text-primary"
        : "text-muted-foreground hover:bg-accent hover:text-foreground"
    );

  return (
    <>
      <FeedbackDialog open={feedbackOpen} onOpenChange={setFeedbackOpen} />
      <PremiumGateDialog open={gateOpen} onClose={() => setGateOpen(false)} featureName={gateFeature} />
      <ActivateRoleDialog open={roleDialogOpen} onClose={() => setRoleDialogOpen(false)} targetRole={roleDialogTarget} />

      <nav
        ref={pillRef}
        className="md:hidden fixed bottom-0 left-0 right-0 z-50 pointer-events-none px-3 pb-[max(0.5rem,env(safe-area-inset-bottom))]"
        aria-label="Navigation mobile"
      >
        <div
          data-nav-pill
          className="pointer-events-auto mx-auto max-w-md bg-card border border-border/60 shadow-[0_20px_50px_-12px_hsl(var(--primary)/0.18)] rounded-3xl h-16 flex items-center justify-between px-1.5 relative"
        >
          {leftTabs.map(renderTab)}

          {/* FAB central, masqué quand la page porte déjà une action primaire */}
          {!fabHidden && (
          <div className="relative flex-1 flex justify-center -mt-7">
            <button
              type="button"
              onClick={() => navigate(fab.to)}
              aria-label={fab.label}
              className="group flex flex-col items-center justify-center"
            >
              <div className="w-14 h-14 bg-primary rounded-2xl shadow-lg shadow-primary/30 flex items-center justify-center text-primary-foreground transition-all duration-200 active:scale-90 group-hover:shadow-xl group-hover:shadow-primary/40 group-hover:-translate-y-0.5">
                <Plus className="h-7 w-7 transition-transform duration-300 group-active:rotate-90" strokeWidth={2} />
              </div>
              <span
                key={fab.label}
                className="mt-1.5 text-primary font-serif italic text-[12px] font-semibold tracking-tight leading-none animate-in fade-in slide-in-from-bottom-1 duration-300"
              >
                {fab.label}
              </span>
            </button>
          </div>
          )}

          {rightTabs.map(renderTab)}

          {/* Feuille Plus : même contenu que la barre latérale, source navModel */}
          <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
            <SheetTrigger asChild>
              <button className="flex flex-col items-center justify-center flex-1 h-full min-h-[44px] gap-1 text-muted-foreground hover:text-foreground transition-colors min-w-0 relative pt-1.5 active:scale-95 duration-150">
                <div className="relative">
                  <MoreHorizontal className="h-5 w-5" strokeWidth={1.8} />
                  {moreBadge > 0 && (
                    <span className="absolute -top-1.5 -right-2 bg-destructive text-destructive-foreground text-[9px] rounded-full min-w-[16px] h-[16px] flex items-center justify-center px-1 font-bold tabular-nums border-2 border-card">
                      {moreBadge > 99 ? "99+" : moreBadge}
                    </span>
                  )}
                </div>
                <span className="text-[10px] font-medium tracking-tight leading-tight">Plus</span>
              </button>
            </SheetTrigger>

            <SheetContent side="bottom" className="rounded-t-2xl max-h-[80vh] overflow-y-auto">
              <SheetTitle className="sr-only">Menu</SheetTitle>
              <SheetDescription className="sr-only">Accueil du site, bascule de rôle et navigation principale.</SheetDescription>

              {/* Retour à l'accueil du site */}
              <Link
                to="/"
                onClick={() => setSheetOpen(false)}
                aria-label="Accueil du site"
                className="flex items-center gap-3 px-4 py-3 mb-3 min-h-[44px] rounded-lg text-sm font-medium text-foreground hover:bg-accent transition-colors"
              >
                <Globe className="h-5 w-5" strokeWidth={1.8} aria-hidden="true" />
                Accueil du site
              </Link>

              {/* Bascule de rôle */}
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

              {/* Les 10 entrées de la barre latérale, même ordre, mêmes libellés */}
              <div className="space-y-1">
                {sheetEntries.map((entry) => {
                  const badge = entryBadge(entry, navBadges);
                  const inner = (
                    <>
                      <entry.icon className="h-5 w-5" strokeWidth={1.8} aria-hidden="true" />
                      <span className="flex-1 truncate text-left">{entry.label}</span>
                      {entry.beta && (
                        <span className="text-[9px] uppercase tracking-wider font-bold bg-warning/15 text-warning-foreground px-1.5 py-0.5 rounded">
                          Bêta
                        </span>
                      )}
                      {entry.premiumLock && (
                        <Crown className="h-[11px] w-[11px] text-warning ml-1" aria-hidden="true" />
                      )}
                      {badge > 0 && (
                        <span className="bg-destructive text-destructive-foreground text-[10px] rounded-full min-w-[18px] h-[18px] flex items-center justify-center px-1 font-semibold tabular-nums">
                          {badge > 99 ? "99+" : badge}
                        </span>
                      )}
                    </>
                  );
                  // Verrou premium : même règle que la barre latérale,
                  // la feuille n'ouvre plus la recherche librement.
                  if (entry.premiumLock) {
                    return (
                      <button
                        key={entry.to}
                        type="button"
                        onClick={() => {
                          setSheetOpen(false);
                          setGateFeature(entry.premiumLock as string);
                          setGateOpen(true);
                        }}
                        className={cn(sheetItemCls(false), "w-full")}
                      >
                        {inner}
                      </button>
                    );
                  }
                  return (
                    <NavLink
                      key={entry.to}
                      to={entry.to}
                      onClick={() => setSheetOpen(false)}
                      className={({ isActive }) => sheetItemCls(isActive)}
                    >
                      {inner}
                    </NavLink>
                  );
                })}

                {/* Retour d'expérience */}
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
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </nav>
    </>
  );
};
