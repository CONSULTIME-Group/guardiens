import {
  UserCircle2,
  Eye,
  Heart,
  Star,
  BriefcaseBusiness,
  CreditCard,
  Settings,
  LifeBuoy,
  Shield,
  LogOut,
  type LucideIcon,
} from "lucide-react";

/**
 * Modèle du menu déroulant de l'avatar.
 *
 * Règle de rangement : ce menu, c'est MOI (identité, réglages, argent,
 * aide). Il ne porte jamais de pastille de notification : une pastille dit
 * « quelque chose vous attend », ce qui relève de la navigation principale.
 * Le composant UserMenu est déjà monté sur desktop et sur mobile, le modèle
 * est donc partagé sans duplication.
 */

export interface UserMenuItem {
  key: string;
  label: string;
  icon: LucideIcon;
  to?: string;
  action?: "logout";
  danger?: boolean;
}

export type UserMenuEntry = UserMenuItem | "separator";

export const buildUserMenuEntries = (opts: {
  profileTo: string;
  publicTo: string;
  isSitterView: boolean;
  isAdmin: boolean;
}): UserMenuEntry[] => {
  const entries: UserMenuEntry[] = [
    { key: "profile", label: "Mon profil", icon: UserCircle2, to: opts.profileTo },
    { key: "public", label: "Mon profil public", icon: Eye, to: opts.publicTo },
    { key: "favorites", label: "Mes favoris", icon: Heart, to: "/favoris" },
    { key: "reviews", label: "Mes avis", icon: Star, to: "/mes-avis" },
    {
      key: "pro",
      label: "Je suis un professionnel",
      icon: BriefcaseBusiness,
      to: "/settings?section=security&focus=pro",
    },
    "separator",
  ];
  if (opts.isSitterView) {
    entries.push({
      key: "subscription",
      label: "Mon abonnement",
      icon: CreditCard,
      to: "/mon-abonnement",
    });
  }
  entries.push(
    { key: "settings", label: "Paramètres", icon: Settings, to: "/settings" },
    { key: "help", label: "Aide & contact", icon: LifeBuoy, to: "/contact" },
  );
  if (opts.isAdmin) {
    entries.push({ key: "admin", label: "Espace admin", icon: Shield, to: "/admin" });
  }
  entries.push("separator", {
    key: "logout",
    label: "Déconnexion",
    icon: LogOut,
    action: "logout",
    danger: true,
  });
  return entries;
};
