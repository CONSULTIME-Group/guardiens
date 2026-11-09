import { useEffect, useState } from "react";
import { NavLink, useNavigate, useLocation } from "react-router-dom";
import {
  LayoutDashboard, Users, Megaphone, CalendarCheck, Star, Flag,
  ShieldCheck, Mail, FileText, LogOut, ArrowLeft, MapPin, HelpCircle,
  Compass, Handshake, CreditCard, MessageSquare, ScrollText, Settings,
  Lightbulb, AlertTriangle, Bug, Stethoscope, Sprout, BarChart3, Send,
  Sparkles, UserX, HeartHandshake, Building2, Award, MailCheck, Inbox, PawPrint, Scale,
  ChevronLeft, ChevronRight, ChevronDown, ChevronUp,
  Map as MapIcon, LineChart, Wrench,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/contexts/AuthContext";
import { useWorkList, workListBadgeLabel, workListBadgeText } from "@/hooks/useWorkList";
import { AdminBadgePill } from "./AdminBadgePill";
import { PRICING_IS_ACTIVE } from "@/config/pricing";

export interface NavItem {
  to: string;
  icon: React.ElementType;
  label: string;
  end?: boolean;
  /** Lot ADM14 : l'entrée porte la pastille unique, longueur de la liste de travail. */
  workList?: boolean;
}

export interface NavGroup {
  label: string;
  items: NavItem[];
  /** Lot ADM4 : groupe rangé sous « Outils », replié par défaut. */
  tool?: boolean;
}

// Lot ADM14 (lot 3 du plan de l'arène admin du 09/11/2026, décision 1 validée
// par Jérémie) : une seule pastille, sur la vue d'ensemble, égale au nombre de
// lignes de la liste de travail ; « Chaque semaine » pour les écrans qu'on lit
// sans file d'attente ; tout le reste rangé sous « Outils », replié, sans
// pastille. Projets, Demandes d'analyse et Poids des hero quittent le menu,
// leurs routes restent (Projets est un onglet d'Entraide, les demandes
// d'analyse entrent dans la liste quand il y en a une).
const adminNavGroups: NavGroup[] = [
  {
    label: "AU QUOTIDIEN",
    items: [
      { to: "/admin", icon: LayoutDashboard, label: "Vue d'ensemble", end: true, workList: true },
    ],
  },
  {
    label: "CHAQUE SEMAINE",
    items: [
      { to: "/admin/traffic", icon: BarChart3, label: "Trafic" },
      { to: "/admin/alma", icon: Sparkles, label: "Alma" },
      { to: "/admin/affinity", icon: HeartHandshake, label: "Affinité" },
      { to: "/admin/pilotage-entraide", icon: LineChart, label: "Pilotage entraide" },
    ],
  },
  {
    label: "MEMBRES ET ANNONCES",
    tool: true,
    items: [
      { to: "/admin/listings", icon: Megaphone, label: "Annonces" },
      { to: "/admin/small-missions", icon: Handshake, label: "Entraide" },
      { to: "/admin/sits-management", icon: CalendarCheck, label: "Gardes" },
      { to: "/admin/users", icon: Users, label: "Utilisateurs" },
      { to: "/admin/contact-messages", icon: Mail, label: "Messages contact" },
      { to: "/admin/reports", icon: Flag, label: "Signalements" },
      { to: "/admin/verifications", icon: ShieldCheck, label: "Vérifications ID" },
      { to: "/admin/reviews", icon: Star, label: "Avis" },
      { to: "/admin/review-disputes", icon: AlertTriangle, label: "Contestations" },
      { to: "/admin/demandes-suppression", icon: UserX, label: "Demandes RGPD" },
    ],
  },
  {
    label: "COMMUNAUTÉ",
    tool: true,
    items: [
      { to: "/admin/associations", icon: Building2, label: "Associations" },
      { to: "/admin/experiences", icon: Award, label: "Expériences" },
      { to: "/admin/skills", icon: Lightbulb, label: "Compétences" },
      { to: "/admin/messages", icon: MessageSquare, label: "Messagerie" },
    ],
  },
  {
    label: "EMAILS",
    tool: true,
    items: [
      { to: "/admin/emails", icon: MailCheck, label: "Santé email" },
      { to: "/admin/emails-transactionnels", icon: Inbox, label: "Emails transactionnels" },
      { to: "/admin/nurturing", icon: Sprout, label: "Nurturing" },
      // end : « Envois groupés » n'est pas actif sur la sous-page des stats.
      { to: "/admin/envois-groupes", icon: Send, label: "Envois groupés", end: true },
      { to: "/admin/envois-groupes/stats", icon: BarChart3, label: "Stats campagnes" },
    ],
  },
  {
    label: "CONTENU ET SYSTÈME",
    tool: true,
    items: [
      { to: "/admin/articles", icon: FileText, label: "Articles" },
      // Articles longue traîne : module verrouillé depuis le 11/07, hors menu, route conservée.
      { to: "/admin/faq", icon: HelpCircle, label: "FAQ" },
      { to: "/admin/guides", icon: Compass, label: "Guides locaux" },
      { to: "/admin/city-pages", icon: MapPin, label: "Pages villes" },
      { to: "/admin/departments", icon: MapIcon, label: "Départements" },
      { to: "/admin/breeds", icon: PawPrint, label: "Fiches de race" },
      { to: "/admin/legal", icon: Scale, label: "Pages légales" },
      { to: "/admin/settings", icon: Settings, label: "Paramètres" },
      { to: "/admin/audit", icon: ScrollText, label: "Journal d'audit" },
      { to: "/admin/errors", icon: Bug, label: "Erreurs" },
      { to: "/admin/diagnostics", icon: Stethoscope, label: "Diagnostic" },
    ],
  },
];

/** Lot ADM4 : la page courante est-elle dans les Outils ? (ouvre le groupe replié) */
export function isToolPath(pathname: string, groups: NavGroup[] = adminNavGroups): boolean {
  const daily = groups.filter((g) => !g.tool).flatMap((g) => g.items).map((i) => i.to.split("?")[0]);
  if (daily.some((p) => pathname === p)) return false;
  return groups.filter((g) => g.tool).flatMap((g) => g.items).some((i) => {
    const p = i.to.split("?")[0];
    return pathname === p || pathname.startsWith(p + "/");
  });
}

// « Abonnements » : masqué du menu tant que le pricing est inactif (la route
// /admin/subscriptions reste accessible par son URL).
if (PRICING_IS_ACTIVE) {
  adminNavGroups[adminNavGroups.length - 1].items.push({ to: "/admin/subscriptions", icon: CreditCard, label: "Abonnements" });
}

const STORAGE_KEY = "admin.sidebar.collapsed";
const TOOLS_KEY = "admin.sidebar.tools-open";

/** Pastille de l'entrée : celle de la liste de travail, sinon rien. */
export function navItemBadge(item: NavItem, workBadge: string | null): string | null {
  return item.workList ? workBadge : null;
}

export const AdminSidebar = () => {
  const { logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const { model, error } = useWorkList();
  const workBadge = workListBadgeText(model, !!error);
  const [collapsed, setCollapsed] = useState<boolean>(() => {
    if (typeof window === "undefined") return false;
    return localStorage.getItem(STORAGE_KEY) === "1";
  });

  useEffect(() => {
    if (typeof window !== "undefined") {
      localStorage.setItem(STORAGE_KEY, collapsed ? "1" : "0");
    }
  }, [collapsed]);

  const [toolsOpen, setToolsOpen] = useState<boolean>(() => {
    try { return typeof window !== "undefined" && localStorage.getItem(TOOLS_KEY) === "1"; } catch { return false; }
  });
  useEffect(() => {
    try { localStorage.setItem(TOOLS_KEY, toolsOpen ? "1" : "0"); } catch { /* stockage indisponible */ }
  }, [toolsOpen]);
  const dailyGroups = adminNavGroups.filter((g) => !g.tool);
  const toolGroups = adminNavGroups.filter((g) => g.tool);
  const onToolPage = isToolPath(location.pathname);
  const showTools = toolsOpen || onToolPage;

  const renderItem = (item: NavItem) => {
    const badge = navItemBadge(item, workBadge);
    const badgeLabel = badge ? workListBadgeLabel(badge) : undefined;
    return (
      <NavLink
        key={item.to}
        to={item.to}
        end={item.end}
        title={collapsed ? item.label : undefined}
        className={({ isActive }) =>
          cn(
            "flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
            collapsed && "justify-center",
            isActive
              ? "bg-primary/10 text-primary"
              : "text-muted-foreground hover:bg-accent hover:text-foreground"
          )
        }
        aria-label={collapsed ? `${item.label}${badgeLabel ? `, ${badgeLabel}` : ""}` : undefined}
      >
        <span className="relative shrink-0">
          <item.icon className="h-4 w-4" />
          {collapsed && badge && (
            <AdminBadgePill compact text={badge} label={badgeLabel} className="absolute -top-1.5 -right-2" />
          )}
        </span>
        {!collapsed && (
          <>
            <span className="truncate flex-1">{item.label}</span>
            {badge && <AdminBadgePill text={badge} label={badgeLabel} className="ml-auto" />}
          </>
        )}
      </NavLink>
    );
  };

  const renderGroup = (group: NavGroup, gi: number) => (
    <div key={group.label} className={cn(gi > 0 && "mt-3")}>
      {!collapsed && (
        <p className="px-3 py-1.5 text-[10px] font-semibold tracking-widest text-muted-foreground/60 uppercase">
          {group.label}
        </p>
      )}
      {collapsed && gi > 0 && <div className="my-2 border-t border-border/60" />}
      <div className="space-y-0.5">{group.items.map(renderItem)}</div>
    </div>
  );

  return (
    <aside
      className={cn(
        "hidden md:flex flex-col border-r border-border bg-card h-screen sticky top-0 transition-[width] duration-200",
        collapsed ? "w-16" : "w-64"
      )}
      aria-label="Navigation administration"
    >
      <div className={cn("flex items-center gap-2 p-4 pb-3", collapsed ? "justify-center" : "justify-between")}>
        {!collapsed && (
          <p className="font-heading text-lg font-bold tracking-tight text-foreground truncate">
            Guardiens <span className="text-muted-foreground font-normal text-sm">Admin</span>
          </p>
        )}
        <button
          type="button"
          onClick={() => setCollapsed((c) => !c)}
          className="p-1.5 rounded-md text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
          aria-label={collapsed ? "Déplier la navigation" : "Replier la navigation"}
          title={collapsed ? "Déplier" : "Replier"}
        >
          {collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
        </button>
      </div>

      <nav className="flex-1 px-2 overflow-y-auto" aria-label="Sections d'administration">
        {dailyGroups.map((group, gi) => renderGroup(group, gi))}
        {/* Lot ADM4, puis ADM14 : Outils replié, sans pastille. Replié, une seule icône qui ouvre le menu sur les outils. */}
        <div className="mt-3">
          {collapsed ? (
            <>
              <div className="my-2 border-t border-border/60" />
              <button
                type="button"
                onClick={() => { setCollapsed(false); setToolsOpen(true); }}
                title="Outils"
                aria-label="Ouvrir les outils"
                className={cn(
                  "flex w-full items-center justify-center px-3 py-2 rounded-lg transition-colors",
                  onToolPage ? "bg-primary/10 text-primary" : "text-muted-foreground hover:bg-accent hover:text-foreground",
                )}
                data-testid="admin-tools-collapsed"
              >
                <Wrench className="h-4 w-4" aria-hidden />
              </button>
            </>
          ) : (
            <>
              <button
                type="button"
                onClick={() => setToolsOpen((o) => !o)}
                aria-expanded={showTools}
                className="flex w-full items-center gap-2 px-3 py-1.5 rounded-lg text-[10px] font-semibold tracking-widest text-muted-foreground/80 uppercase hover:bg-accent"
                data-testid="admin-tools-toggle"
              >
                <span className="flex-1 text-left">Outils</span>
                {showTools ? <ChevronUp className="h-3 w-3" aria-hidden /> : <ChevronDown className="h-3 w-3" aria-hidden />}
              </button>
              {showTools && toolGroups.map((group, gi) => renderGroup(group, gi + 1))}
            </>
          )}
        </div>
      </nav>

      <div className="p-2 border-t border-border space-y-1">
        <button
          onClick={() => navigate("/dashboard")}
          className={cn(
            "flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium text-muted-foreground hover:bg-accent hover:text-foreground transition-colors w-full",
            collapsed && "justify-center"
          )}
          title={collapsed ? "Retour à l'app" : undefined}
          aria-label="Retour à l'app"
        >
          <ArrowLeft className="h-4 w-4 shrink-0" />
          {!collapsed && <span>Retour à l'app</span>}
        </button>
        <button
          onClick={logout}
          className={cn(
            "flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium text-muted-foreground hover:bg-accent hover:text-foreground transition-colors w-full",
            collapsed && "justify-center"
          )}
          title={collapsed ? "Déconnexion" : undefined}
          aria-label="Déconnexion"
        >
          <LogOut className="h-4 w-4 shrink-0" />
          {!collapsed && <span>Déconnexion</span>}
        </button>
      </div>
    </aside>
  );
};

// Export groups for mobile layout
export const adminNavGroups_export = adminNavGroups;
