import { useEffect, useState } from "react";
import { NavLink, useNavigate, useLocation } from "react-router-dom";
import {
  LayoutDashboard, Users, Megaphone, CalendarCheck, Star, Flag,
  ShieldCheck, Mail, FileText, LogOut, ArrowLeft, MapPin, HelpCircle,
  Compass, Handshake, Briefcase, CreditCard, MessageSquare, ScrollText, Settings,
  Lightbulb, AlertTriangle, Bug, Stethoscope, Sprout, BarChart3, Send,
  Sparkles, UserX, HeartHandshake, Hammer, Building2, Award, MailCheck, Inbox, SearchCheck, PawPrint, Scale,
  ChevronLeft, ChevronRight,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/contexts/AuthContext";
import { useAdminBadges } from "@/hooks/useAdminBadges";
import { AdminBadgePill, resolveBadge } from "./AdminBadgePill";
import { PRICING_IS_ACTIVE } from "@/config/pricing";

interface NavItem {
  to: string;
  icon: React.ElementType;
  label: string;
  end?: boolean;
  badgeKey?: string;
  /** Lot A9 : destination d'un clic sur la pastille elle-même. */
  badgeTo?: string;
  /** Valeur du paramètre `tab` que cette entrée représente, quand plusieurs
   *  entrées pointent vers la même page. Sans cela les deux entrées seraient
   *  actives en même temps, le paramètre de recherche étant ignoré. */
  tabParam?: string;
  /** Onglet affiché par la page quand le paramètre `tab` est absent. */
  defaultTab?: string;
  /** Entrée active sur sa page SAUF pour ces onglets, représentés par une
   *  autre entrée du menu. */
  excludeTabs?: string[];
}

export const BADGE_TITLES: Record<string, string> = {
  verifications: "vérifications d'identité en attente",
  experiences: "expériences externes à vérifier",
  skills: "compétences proposées à valider",
  reviewsModeration: "avis en attente de modération",
  reviewDisputes: "contestations d'avis à traiter",
  reports: "signalements ouverts ou en cours",
  contactMessages: "messages de contact à traiter",
  adminMessageFailed: "échecs d'envoi sur 7 jours",
  errors: "erreurs non résolues",
  guideRequests: "demandes de guides en attente",
  analysisRequests: "demandes d'analyse à traiter",
  deletionRequests: "demandes de suppression en attente",
  sitsToStaff: "annonces à staffer (aucune candidature)",
};

interface NavGroup {
  label: string;
  items: NavItem[];
}

// Groupes dédupliqués, vocabulaire unifié
const adminNavGroups: NavGroup[] = [
  {
    label: "PILOTAGE",
    items: [
      { to: "/admin", icon: LayoutDashboard, label: "Vue d'ensemble", end: true },
      { to: "/admin/traffic", icon: BarChart3, label: "Trafic" },
      { to: "/admin/alma", icon: Sparkles, label: "Alma" },
      { to: "/admin/affinity", icon: HeartHandshake, label: "Affinité" },
    ],
  },
  {
    label: "COMMUNAUTÉ",
    items: [
      { to: "/admin/users", icon: Users, label: "Utilisateurs" },
      { to: "/admin/verifications", icon: ShieldCheck, label: "Vérifications ID", badgeKey: "verifications" },
      { to: "/admin/associations", icon: Building2, label: "Associations" },
      { to: "/admin/experiences", icon: Award, label: "Expériences", badgeKey: "experiences" },
      { to: "/admin/skills", icon: Lightbulb, label: "Compétences", badgeKey: "skills" },
    ],
  },
  {
    label: "ACTIVITÉ",
    items: [
      { to: "/admin/listings", icon: Megaphone, label: "Annonces", badgeKey: "sitsToStaff", badgeTo: "/admin/listings?filter=to_staff" },
      { to: "/admin/sits-management", icon: CalendarCheck, label: "Gardes" },
      { to: "/admin/small-missions", icon: Handshake, label: "Entraide", tabParam: "entraide", defaultTab: "entraide" },
      { to: "/admin/small-missions?tab=projets", icon: Hammer, label: "Projets", tabParam: "projets", defaultTab: "entraide" },
      // Pilotage produit de l'entraide, jusqu'ici accessible seulement depuis
      // un onglet de la page Emails, donc introuvable.
      { to: "/admin/pilotage-entraide", icon: BarChart3, label: "Pilotage entraide" },
    ],
  },
  {
    label: "MODÉRATION",
    items: [
      { to: "/admin/reviews", icon: Star, label: "Avis", badgeKey: "reviewsModeration" },
      { to: "/admin/review-disputes", icon: AlertTriangle, label: "Contestations", badgeKey: "reviewDisputes" },
      { to: "/admin/reports", icon: Flag, label: "Signalements", badgeKey: "reports" },
      { to: "/admin/contact-messages", icon: Mail, label: "Messages contact", badgeKey: "contactMessages" },
      { to: "/admin/messages", icon: MessageSquare, label: "Messagerie", badgeKey: "adminMessageFailed" },
      { to: "/admin/errors", icon: Bug, label: "Erreurs", badgeKey: "errors" },
      { to: "/admin/demandes-suppression", icon: UserX, label: "Demandes RGPD", badgeKey: "deletionRequests" },
    ],
  },
  {
    label: "EMAILS",
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
    label: "CONTENU & SYSTÈME",
    items: [
      { to: "/admin/articles", icon: FileText, label: "Articles" },
      // Articles longue traîne : module verrouillé depuis le 11/07, hors menu, route conservée.
      { to: "/admin/faq", icon: HelpCircle, label: "FAQ" },
      { to: "/admin/guides", icon: Compass, label: "Guides locaux", badgeKey: "guideRequests" },
      { to: "/admin/analysis-requests", icon: SearchCheck, label: "Demandes d'analyse", badgeKey: "analysisRequests" },
      { to: "/admin/city-pages", icon: MapPin, label: "Pages villes" },
      { to: "/admin/departments", icon: MapPin, label: "Départements" },
      { to: "/admin/breeds", icon: PawPrint, label: "Fiches de race" },
      { to: "/admin/legal", icon: Scale, label: "Pages légales" },
      { to: "/admin/hero-weights", icon: Sparkles, label: "Poids des hero" },
      { to: "/admin/settings", icon: Settings, label: "Paramètres" },
      { to: "/admin/audit", icon: ScrollText, label: "Journal d'audit" },
      { to: "/admin/diagnostics", icon: Stethoscope, label: "Diagnostic" },
    ],
  },
];

// « Abonnements » : masqué du menu tant que le pricing est inactif (la route
// /admin/subscriptions reste accessible par son URL).
if (PRICING_IS_ACTIVE) {
  adminNavGroups[0].items.push({ to: "/admin/subscriptions", icon: CreditCard, label: "Abonnements" });
}

const STORAGE_KEY = "admin.sidebar.collapsed";

/** Deux entrées peuvent viser la même page avec un onglet différent : l'état
 *  actif se lit alors sur le paramètre `tab` et non sur le seul chemin. */
export function resolveNavActive(
  item: NavItem,
  location: { pathname: string; search: string },
  navActive: boolean,
): boolean {
  if (item.excludeTabs) {
    if (!navActive) return false;
    const tab = new URLSearchParams(location.search).get("tab");
    return !(tab && item.excludeTabs.includes(tab));
  }
  if (!item.tabParam) return navActive;
  const path = item.to.split("?")[0];
  if (location.pathname !== path) return false;
  const current = new URLSearchParams(location.search).get("tab") || item.defaultTab || "";
  return current === item.tabParam;
}

export const AdminSidebar = () => {
  const { logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const { badges, unavailable } = useAdminBadges();
  const [collapsed, setCollapsed] = useState<boolean>(() => {
    if (typeof window === "undefined") return false;
    return localStorage.getItem(STORAGE_KEY) === "1";
  });

  useEffect(() => {
    if (typeof window !== "undefined") {
      localStorage.setItem(STORAGE_KEY, collapsed ? "1" : "0");
    }
  }, [collapsed]);

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
        {adminNavGroups.map((group, gi) => (
          <div key={group.label} className={cn(gi > 0 && "mt-3")}>
            {!collapsed && (
              <p className="px-3 py-1.5 text-[10px] font-semibold tracking-widest text-muted-foreground/60 uppercase">
                {group.label}
              </p>
            )}
            {collapsed && gi > 0 && <div className="my-2 border-t border-border/60" />}
            <div className="space-y-0.5">
              {group.items.map((item) => {
                const badge = resolveBadge(item.badgeKey, badges as Record<string, number | undefined>, unavailable, BADGE_TITLES);
                const badgeLabel = badge.show ? badge.label : undefined;
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
                        resolveNavActive(item, location, isActive)
                          ? "bg-primary/10 text-primary"
                          : "text-muted-foreground hover:bg-accent hover:text-foreground"
                      )
                    }
                    aria-label={collapsed ? `${item.label}${badgeLabel ? `, ${badgeLabel}` : ""}` : undefined}
                  >
                    <span className="relative shrink-0">
                      <item.icon className="h-4 w-4" />
                      {collapsed && badge.show && (
                        <AdminBadgePill compact text={badge.text} label={badge.label} className="absolute -top-1.5 -right-2" />
                      )}
                    </span>
                    {!collapsed && (
                      <>
                        <span className="truncate flex-1">{item.label}</span>
                        {badge.show && (item.badgeTo ? (
                          <span
                            role="link"
                            tabIndex={0}
                            className="ml-auto rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                            aria-label={`${item.label} : ${badge.label}`}
                            title={badge.label}
                            onClick={(e) => { e.preventDefault(); e.stopPropagation(); navigate(item.badgeTo!); }}
                            onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); e.stopPropagation(); navigate(item.badgeTo!); } }}
                          >
                            <AdminBadgePill text={badge.text} label={badge.label} />
                          </span>
                        ) : (
                          <AdminBadgePill text={badge.text} label={badge.label} className="ml-auto" />
                        ))}
                      </>
                    )}
                  </NavLink>
                );
              })}
            </div>
          </div>
        ))}
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
