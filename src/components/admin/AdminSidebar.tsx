import { useEffect, useState } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import {
  LayoutDashboard, Users, Megaphone, CalendarCheck, Star, Flag,
  ShieldCheck, Mail, FileText, LogOut, ArrowLeft, MapPin, HelpCircle,
  Compass, Handshake, Briefcase, CreditCard, MessageSquare, ScrollText, Settings,
  Lightbulb, AlertTriangle, Bug, Stethoscope, Sprout, BarChart3, Send,
  Sparkles,
  ChevronLeft, ChevronRight,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/contexts/AuthContext";
import { useAdminBadges } from "@/hooks/useAdminBadges";

interface NavItem {
  to: string;
  icon: React.ElementType;
  label: string;
  end?: boolean;
  badgeKey?: string;
}

export const BADGE_TITLES: Record<string, string> = {
  verifications: "vérifications d'identité en attente",
  pros: "dossiers Gardien Pro à modérer",
  experiences: "expériences externes à vérifier",
  skills: "compétences proposées à valider",
  reviewsModeration: "avis en attente de modération",
  reviewDisputes: "contestations d'avis à traiter",
  reports: "signalements ouverts",
  contactMessages: "messages de contact non traités",
  adminMessageFailed: "messages admin en échec",
  errors: "erreurs non résolues",
  guideRequests: "demandes de guides en attente",
  analysisRequests: "demandes d'analyse à traiter",
  reportsSit: "signalements visant des annonces",
  reportsMission: "signalements visant des petites missions",
};

interface NavGroup {
  label: string;
  items: NavItem[];
}

// 5 groupes max, dédupliqués, vocabulaire unifié
const adminNavGroups: NavGroup[] = [
  {
    label: "PILOTAGE",
    items: [
      { to: "/admin", icon: LayoutDashboard, label: "Vue d'ensemble", end: true },
      { to: "/admin/traffic", icon: BarChart3, label: "Trafic" },
      { to: "/admin/alma", icon: Sparkles, label: "Alma" },
      { to: "/admin/subscriptions", icon: CreditCard, label: "Abonnements" },
    ],
  },
  {
    label: "COMMUNAUTÉ",
    items: [
      { to: "/admin/users", icon: Users, label: "Utilisateurs" },
      { to: "/admin/verifications", icon: ShieldCheck, label: "Vérifications ID", badgeKey: "verifications" },
      { to: "/admin/pros", icon: Briefcase, label: "Vérifications Pro", badgeKey: "pros" },
      { to: "/admin/pros-annuaire", icon: Briefcase, label: "Annuaire pros" },
      { to: "/admin/experiences", icon: Briefcase, label: "Expériences", badgeKey: "experiences" },
      { to: "/admin/skills", icon: Lightbulb, label: "Compétences", badgeKey: "skills" },
    ],
  },
  {
    label: "ACTIVITÉ",
    items: [
      { to: "/admin/listings", icon: Megaphone, label: "Annonces", badgeKey: "reportsSit" },
      { to: "/admin/sits-management", icon: CalendarCheck, label: "Gardes" },
      { to: "/admin/small-missions", icon: Handshake, label: "Petites missions", badgeKey: "reportsMission" },
    ],
  },
  {
    label: "MODÉRATION",
    items: [
      { to: "/admin/reviews", icon: Star, label: "Avis", badgeKey: "reviewsModeration" },
      { to: "/admin/review-disputes", icon: AlertTriangle, label: "Contestations", badgeKey: "reviewDisputes" },
      { to: "/admin/reports", icon: Flag, label: "Signalements", badgeKey: "reports" },
      { to: "/admin/contact-messages", icon: MessageSquare, label: "Messages contact", badgeKey: "contactMessages" },
      { to: "/admin/messages", icon: Send, label: "Messagerie", badgeKey: "adminMessageFailed" },
      { to: "/admin/envois-groupes", icon: Mail, label: "Envois groupés" },
      { to: "/admin/envois-groupes/stats", icon: BarChart3, label: "Stats campagnes" },
      { to: "/admin/errors", icon: Bug, label: "Erreurs", badgeKey: "errors" },
    ],
  },
  {
    label: "CONTENU & SYSTÈME",
    items: [
      { to: "/admin/articles", icon: FileText, label: "Articles" },
      { to: "/admin/articles-longue-traine", icon: FileText, label: "Articles longue traîne" },
      { to: "/admin/faq", icon: HelpCircle, label: "FAQ" },
      { to: "/admin/guides", icon: Compass, label: "Guides locaux", badgeKey: "guideRequests" },
      { to: "/admin/analysis-requests", icon: HelpCircle, label: "Demandes d'analyse", badgeKey: "analysisRequests" },
      { to: "/admin/city-pages", icon: MapPin, label: "Pages villes" },
      { to: "/admin/departments", icon: MapPin, label: "Départements" },
      { to: "/admin/breeds", icon: MapPin, label: "Fiches de race" },
      { to: "/admin/legal", icon: ScrollText, label: "Pages légales" },
      { to: "/admin/emails", icon: Mail, label: "Santé email" },
      { to: "/admin/emails-transactionnels", icon: Mail, label: "Emails transactionnels" },
      { to: "/admin/nurturing", icon: Sprout, label: "Nurturing" },
      { to: "/admin/settings", icon: Settings, label: "Paramètres" },
      { to: "/admin/audit", icon: ScrollText, label: "Journal d'audit" },
      { to: "/admin/diagnostics", icon: Stethoscope, label: "Diagnostic" },
    ],
  },
];

const STORAGE_KEY = "admin.sidebar.collapsed";

export const AdminSidebar = () => {
  const { logout } = useAuth();
  const navigate = useNavigate();
  const badges = useAdminBadges() as unknown as Record<string, number>;
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
          <h1 className="font-heading text-lg font-bold tracking-tight text-foreground truncate">
            Guardiens <span className="text-muted-foreground font-normal text-sm">Admin</span>
          </h1>
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
                const badgeCount = item.badgeKey ? badges[item.badgeKey] || 0 : 0;
                const badgeLabel = item.badgeKey
                  ? `${badgeCount} ${BADGE_TITLES[item.badgeKey] ?? "à traiter"}`
                  : undefined;
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
                      {collapsed && badgeCount > 0 && (
                        <span
                          className="absolute -top-1.5 -right-2 bg-destructive text-destructive-foreground text-[9px] font-bold rounded-full min-w-[14px] h-[14px] flex items-center justify-center px-0.5"
                          aria-label={badgeLabel}
                        >
                          {badgeCount > 99 ? "99+" : badgeCount}
                        </span>
                      )}
                    </span>
                    {!collapsed && (
                      <>
                        <span className="truncate flex-1">{item.label}</span>
                        {badgeCount > 0 && (
                          <span
                            className="ml-auto bg-destructive text-destructive-foreground text-[10px] font-bold rounded-full min-w-[18px] h-[18px] flex items-center justify-center px-1"
                            title={badgeLabel}
                            aria-label={badgeLabel}
                          >
                            {badgeCount}
                          </span>
                        )}
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
