import type { ElementType } from "react";

export interface Stats {
  totalUsers: number;
  owners: number;
  sitters: number;
  both: number;
  newThisWeek: number;
  activeListings: number;
  ongoingSits: number;
  totalReviews: number;
  avgRating: number;
  monthRevenue: number;
}

export interface ActivityItem {
  id: string;
  text: string;
  time: string;
  link: string;
  type: "inscription" | "annonce" | "avis" | "candidature" | "publication" | "depublication" | "suppression";
}

export interface ActionCard {
  label: string;
  count: number;
  link: string;
  icon: ElementType;
}

export interface WeeklySignup {
  week: string;
  sitters: number;
  owners: number;
}

export interface DeptData {
  dept: string;
  count: number;
}

// Tarif gardien standard mensuel (€), utilisé pour estimer les revenus du mois.
export const MONTHLY_SUBSCRIPTION_EUR = 6.99;
