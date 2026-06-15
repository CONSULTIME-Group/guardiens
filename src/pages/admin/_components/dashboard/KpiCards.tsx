import { Link } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Users, UserPlus, Megaphone, CalendarCheck, Star, CreditCard, Globe,
} from "lucide-react";
import type { Stats } from "./types";
import { MONTHLY_SUBSCRIPTION_EUR } from "./types";

interface Props {
  stats: Stats;
}

export const KpiCards = ({ stats }: Props) => {
  const cards = [
    {
      title: "Inscrits",
      value: stats.totalUsers,
      subtitle: `${stats.owners} propriétaires · ${stats.sitters} gardiens · ${stats.both} polyvalents`,
      icon: Users,
      link: "/admin/users",
    },
    {
      title: "Nouveaux cette semaine",
      value: stats.newThisWeek,
      subtitle: "Depuis 7 jours",
      icon: UserPlus,
      link: "/admin/users",
    },
    {
      title: "Annonces actives",
      value: stats.activeListings,
      subtitle: "Publiées",
      icon: Megaphone,
      link: "/admin/listings",
    },
    {
      title: "Gardes en cours",
      value: stats.ongoingSits,
      subtitle: "Confirmées",
      icon: CalendarCheck,
      link: "/admin/sits-management",
    },
    {
      title: "Avis",
      value: stats.totalReviews,
      subtitle: stats.avgRating > 0 ? `Note moyenne : ${stats.avgRating}/5` : "Aucun avis",
      icon: Star,
      link: "/admin/reviews",
    },
    {
      title: "Revenus mensuels estimés",
      value: stats.monthRevenue.toLocaleString("fr-FR", { style: "currency", currency: "EUR", maximumFractionDigits: 0 }),
      subtitle: `Abonnements actifs × ${MONTHLY_SUBSCRIPTION_EUR.toLocaleString("fr-FR", { style: "currency", currency: "EUR" })}`,
      icon: CreditCard,
      link: "/admin/subscriptions",
    },
    {
      title: "Membres hors France",
      value: stats.intlMembers,
      subtitle: stats.intlMembers > 0 ? "Filtrer par pays dans Membres" : "Aucun pour l'instant",
      icon: Globe,
      link: "/admin/users",
    },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
      {cards.map((card) => (
        <Link
          key={card.title}
          to={card.link}
          className="block focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-lg"
        >
          <Card className="cursor-pointer hover:shadow-md transition-shadow h-full">
            <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {card.title}
              </CardTitle>
              <card.icon className="h-4 w-4 text-muted-foreground" aria-hidden />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{card.value}</div>
              <p className="text-xs text-muted-foreground mt-1">{card.subtitle}</p>
            </CardContent>
          </Card>
        </Link>
      ))}
    </div>
  );
};
