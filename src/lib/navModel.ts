import {
  Home,
  Calendar,
  MessageCircle,
  Handshake,
  Search,
  Briefcase,
  PawPrint,
  Compass,
  Sparkles,
  Newspaper,
  type LucideIcon,
} from "lucide-react";

/**
 * Modèle unique de la navigation de l'espace connecté.
 *
 * Règle de rangement : la barre latérale et la feuille mobile « Plus »
 * portent CE QUE L'ON VIENT FAIRE sur le produit. Le menu de l'avatar porte
 * l'identité, les réglages et l'aide (voir userMenuModel.ts). Les deux
 * surfaces consomment ce modèle, ce qui garantit même ordre et mêmes
 * libellés sans duplication.
 */

export type NavRole = "owner" | "sitter";

export type NavBadgeKey = "sits" | "messages" | "entraide";

export interface NavEntry {
  to: string;
  icon: LucideIcon;
  label: string;
  badgeKey?: NavBadgeKey;
  beta?: boolean;
  /** Nom de la fonctionnalité affiché dans la modale de verrou premium. */
  premiumLock?: string;
}

export interface NavGroup {
  id: "espace" | "trouver" | "apprendre";
  label: string;
  entries: NavEntry[];
}

/**
 * @param role rôle actif effectif (owner ou sitter, jamais both)
 * @param sitterSearchLocked vrai quand un gardien sans accès premium doit
 *   voir la recherche derrière le verrou. Même règle que la barre latérale
 *   historique, désormais appliquée aussi à la feuille mobile.
 */
export const buildNavGroups = (role: NavRole, sitterSearchLocked: boolean): NavGroup[] => [
  {
    id: "espace",
    label: "Mon espace",
    entries: [
      { to: "/dashboard", icon: Home, label: "Accueil" },
      role === "owner"
        ? { to: "/sits", icon: Calendar, label: "Mes annonces", badgeKey: "sits" }
        : { to: "/mes-candidatures", icon: Calendar, label: "Mes candidatures", badgeKey: "sits" },
      { to: "/messages", icon: MessageCircle, label: "Messages", badgeKey: "messages" },
      { to: "/petites-missions", icon: Handshake, label: "Entraide", badgeKey: "entraide" },
    ],
  },
  {
    id: "trouver",
    label: "Trouver",
    entries: [
      {
        to: "/search",
        icon: Search,
        label: role === "owner" ? "Recherche gardiens" : "Recherche",
        ...(role === "sitter" && sitterSearchLocked
          ? { premiumLock: "la recherche d'annonces" }
          : {}),
      },
      { to: "/pros", icon: Briefcase, label: "Pros animaliers", beta: true },
    ],
  },
  {
    id: "apprendre",
    label: "Apprendre",
    entries: [
      { to: "/races", icon: PawPrint, label: "Fiches races" },
      // Guides locaux immédiatement après Fiches races (demande explicite).
      { to: "/guides", icon: Compass, label: "Guides locaux" },
      { to: "/conseils", icon: Sparkles, label: "Conseils d'Alma" },
      { to: "/actualites", icon: Newspaper, label: "Le journal" },
    ],
  },
];

export const flattenNavGroups = (groups: NavGroup[]): NavEntry[] =>
  groups.flatMap((g) => g.entries);

/** Compteurs résolus pour les pastilles de navigation. */
export interface NavBadgeValues {
  sits: number;
  messages: number;
  entraide: number;
}

export const entryBadge = (entry: NavEntry, badges: NavBadgeValues): number =>
  entry.badgeKey ? Math.max(0, badges[entry.badgeKey]) : 0;

/**
 * Pastille du bouton « Plus » mobile : exactement la somme des pastilles
 * visibles dans la feuille, sans doublon. Avant ce correctif, un gardien
 * additionnait sitterActionCount et sitsBadge, deux noms pour la même valeur,
 * et la pastille affichait le double.
 */
export const sheetBadge = (badges: NavBadgeValues): number =>
  Math.max(0, badges.sits) + Math.max(0, badges.messages) + Math.max(0, badges.entraide);

/**
 * Choix de comptage documenté : un même message non lu ne doit jamais
 * alimenter deux pastilles. La pastille Entraide compte les non lus des
 * conversations de petites missions ; la pastille Messages compte tout le
 * reste (total moins les missions).
 */
export const messagesUnreadExclusive = (totalUnread: number, missionUnread: number): number =>
  Math.max(0, totalUnread - Math.max(0, missionUnread));
