import { useEffect, useState } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import {
  LayoutDashboard, Users, Megaphone, CalendarCheck, Star, Flag,
  ShieldCheck, Mail, FileText, LogOut, ArrowLeft, MapPin, HelpCircle,
  Compass, Handshake, Briefcase, CreditCard, MessageSquare, ScrollText, Settings,
  Lightbulb, AlertTriangle, Bug, Stethoscope,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";

interface NavItem {
  to: string;
  icon: React.ElementType;
  label: string;
  end?: boolean;
  badgeKey?: string;
  badgeTitle?: string;
}

const BADGE_TITLES: Record<string, string> = {
  verifications: "vérifications d'identité en attente",
  experiences: "expériences externes à vérifier",
  skills: "compétences proposées à valider",
  reviewsModeration: "avis en attente de modération",
  reviewDisputes: "contestations d'avis à traiter",
  reports: "signalements ouverts",
  contactMessages: "messages de contact non traités",
  adminMessageFailed: "messages admin en échec",
  errors: "erreurs non résolues",
  guideRequests: "demandes de guides en attente",
  reportsSit: "signalements visant des annonces / gardes",
  reportsMission: "signalements visant des petites missions",
};

interface NavGroup {
  label: string;
  items: NavItem[];
}

const adminNavGroups: NavGroup[] = [
  {
    label: "PILOTAGE",
    items: [
      { to: "/admin", icon: LayoutDashboard, label: "Dashboard", end: true },
      { to: "/admin/subscriptions", icon: CreditCard, label: "Abonnements" },
    ],
  },
  {
    label: "COMMUNAUTÉ",
    items: [
      { to: "/admin/users", icon: Users, label: "Utilisateurs" },
      { to: "/admin/verifications", icon: ShieldCheck, label: "Vérifications ID", badgeKey: "verifications" },
      { to: "/admin/experiences", icon: Briefcase, label: "Expériences à vérifier", badgeKey: "experiences" },
      { to: "/admin/skills", icon: Lightbulb, label: "Compétences", badgeKey: "skills" },
    ],
  },
  {
    label: "ACTIVITÉ",
    items: [
      { to: "/admin/listings", icon: Megaphone, label: "Annonces", badgeKey: "reportsSit" },
      { to: "/admin/sits-management", icon: CalendarCheck, label: "Gardes", badgeKey: "reportsSit" },
      { to: "/admin/small-missions", icon: Handshake, label: "Petites missions", badgeKey: "reportsMission" },
    ],
  },
  {
    label: "MODÉRATION",
    items: [
      { to: "/admin/reviews", icon: Star, label: "Avis", badgeKey: "reviewsModeration" },
      { to: "/admin/review-disputes", icon: AlertTriangle, label: "Contestations d'avis", badgeKey: "reviewDisputes" },
      { to: "/admin/reports", icon: Flag, label: "Signalements", badgeKey: "reports" },
      { to: "/admin/contact-messages", icon: MessageSquare, label: "Messages contact", badgeKey: "contactMessages" },
      { to: "/admin/messages", icon: MessageSquare, label: "Messagerie", badgeKey: "adminMessageFailed" },
      { to: "/admin/envois-groupes", icon: Mail, label: "Envois groupés" },
    ],
  },
  {
    label: "CONTENU",
    items: [
      { to: "/admin/articles", icon: FileText, label: "Articles" },
      { to: "/admin/faq", icon: HelpCircle, label: "FAQ" },
    ],
  },
  {
    label: "SEO / GEO",
    items: [
      { to: "/admin/city-pages", icon: MapPin, label: "Pages villes" },
      { to: "/admin/departments", icon: MapPin, label: "Départements" },
      { to: "/admin/guides", icon: Compass, label: "Guides locaux", badgeKey: "guideRequests" },
    ],
  },
  {
    label: "SEO & TRAFIC",
    items: [
      { to: "/admin/seo", icon: MapPin, label: "Dashboard SEO" },
      { to: "/admin/analytics", icon: LayoutDashboard, label: "Analytics" },
      { to: "/admin/errors", icon: Bug, label: "Erreurs", badgeKey: "errors" },
    ],
  },
  {
    label: "SYSTÈME",
    items: [
      { to: "/admin/emails", icon: Mail, label: "Emails" },
      { to: "/admin/legal", icon: ScrollText, label: "Pages légales" },
      { to: "/admin/settings", icon: Settings, label: "Paramètres" },
      { to: "/admin/diagnostics", icon: Stethoscope, label: "Diagnostic" },
    ],
  },
];

export const AdminSidebar = () => {
  const { logout } = useAuth();
  const navigate = useNavigate();
  const [badges, setBadges] = useState<Record<string, number>>({});

  useEffect(() => {
    const fetchBadges = async () => {
      const results = await Promise.all([
        supabase.from("profiles").select("id", { count: "exact", head: true }).eq("identity_verification_status", "pending"),
        supabase.from("external_experiences").select("id", { count: "exact", head: true }).eq("verification_status", "pending"),
        supabase.from("reports").select("id", { count: "exact", head: true }).eq("status", "new"),
        supabase.from("contact_messages").select("id", { count: "exact", head: true }).eq("status", "new"),
        supabase.from("skills_library").select("id", { count: "exact", head: true }).eq("status", "pending"),
        supabase.from("review_disputes").select("id", { count: "exact", head: true }).eq("status", "pending"),
        supabase.from("error_logs").select("id", { count: "exact", head: true }).is("resolved_at", null).neq("severity", "ignored_third_party"),
        supabase.from("guide_requests" as any).select("id", { count: "exact", head: true }).eq("status", "pending"),
      ]);
      setBadges({
        verifications: results[0].count || 0,
        experiences: results[1].count || 0,
        reports: results[2].count || 0,
        contactMessages: results[3].count || 0,
        skills: results[4].count || 0,
        reviewDisputes: results[5].count || 0,
        errors: results[6].count || 0,
        guideRequests: results[7].count || 0,
      });
    };
    fetchBadges();

    // Re-fetch when admin actions happen
    const handler = () => fetchBadges();
    window.addEventListener("admin-badges-refresh", handler);
    return () => window.removeEventListener("admin-badges-refresh", handler);
  }, []);

  return (
    <aside className="hidden md:flex flex-col w-64 border-r border-border bg-card h-screen sticky top-0">
      <div className="p-6 pb-4">
        <h1 className="font-body text-lg font-bold tracking-tight text-foreground">
          Guardiens <span className="text-muted-foreground font-normal text-sm">Admin</span>
        </h1>
      </div>

      <nav className="flex-1 px-3 overflow-y-auto">
        {adminNavGroups.map((group, gi) => (
          <div key={group.label} className={cn(gi > 0 && "mt-4")}>
            <p className="px-4 py-1.5 text-[10px] font-semibold tracking-widest text-muted-foreground/60 uppercase">
              {group.label}
            </p>
            <div className="space-y-0.5">
              {group.items.map((item) => {
                const badgeCount = item.badgeKey ? badges[item.badgeKey] || 0 : 0;
                return (
                  <NavLink
                    key={item.to}
                    to={item.to}
                    end={item.end}
                    className={({ isActive }) =>
                      cn(
                        "flex items-center gap-3 px-4 py-2 rounded-lg text-sm font-medium transition-colors",
                        isActive
                          ? "bg-primary/10 text-primary"
                          : "text-muted-foreground hover:bg-accent hover:text-foreground"
                      )
                    }
                  >
                    <item.icon className="h-4 w-4 shrink-0" />
                    <span className="truncate flex-1">{item.label}</span>
                    {badgeCount > 0 && (
                      <span className="ml-auto bg-destructive text-destructive-foreground text-[10px] font-bold rounded-full min-w-[18px] h-[18px] flex items-center justify-center px-1">
                        {badgeCount}
                      </span>
                    )}
                  </NavLink>
                );
              })}
            </div>
          </div>
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

// Export groups for mobile layout
export const adminNavGroups_export = adminNavGroups;
