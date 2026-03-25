import { useAuth } from "@/contexts/AuthContext";
import { cn } from "@/lib/utils";
import { Link } from "react-router-dom";
import { Plus, Search, MessageSquare, User } from "lucide-react";

const Dashboard = () => {
  const { user, activeRole, setActiveRole } = useAuth();

  const cards = activeRole === "owner"
    ? [
        { title: "Créer une annonce", desc: "Publiez une garde pour trouver un gardien", icon: Plus, to: "/sits/create" },
        { title: "Mes gardes", desc: "Suivez vos annonces en cours", icon: Search, to: "/sits" },
        { title: "Mes messages", desc: "Échangez avec les gardiens", icon: MessageSquare, to: "/messages" },
        { title: "Mon profil", desc: "Complétez votre profil propriétaire", icon: User, to: "/profile" },
      ]
    : [
        { title: "Trouver une garde", desc: "Parcourez les annonces disponibles", icon: Search, to: "/search" },
        { title: "Mes candidatures", desc: "Suivez vos candidatures en cours", icon: Plus, to: "/sits" },
        { title: "Mes messages", desc: "Échangez avec les propriétaires", icon: MessageSquare, to: "/messages" },
        { title: "Mon profil", desc: "Complétez votre profil gardien", icon: User, to: "/profile" },
      ];

  return (
    <div className="p-6 md:p-10 max-w-4xl mx-auto">
      {user?.role === "both" && (
        <div className="flex gap-1 p-1 bg-muted rounded-pill w-fit mb-8">
          <button
            onClick={() => setActiveRole("owner")}
            className={cn(
              "px-5 py-2 rounded-pill text-sm font-medium transition-all",
              activeRole === "owner" ? "bg-card text-foreground shadow-sm" : "text-muted-foreground"
            )}
          >
            Propriétaire
          </button>
          <button
            onClick={() => setActiveRole("sitter")}
            className={cn(
              "px-5 py-2 rounded-pill text-sm font-medium transition-all",
              activeRole === "sitter" ? "bg-card text-foreground shadow-sm" : "text-muted-foreground"
            )}
          >
            Gardien
          </button>
        </div>
      )}

      <div className="animate-fade-in">
        <h1 className="font-heading text-3xl font-bold mb-3">
          Bienvenue{user?.firstName ? `, ${user.firstName}` : ""} !
        </h1>
        <p className="text-muted-foreground text-lg">
          {activeRole === "owner"
            ? "Gérez vos annonces et trouvez le gardien idéal pour votre maison."
            : "Découvrez les gardes disponibles près de chez vous."}
        </p>
      </div>

      <div className="grid md:grid-cols-2 gap-6 mt-10">
        {cards.map((card) => (
          <Link
            key={card.title}
            to={card.to}
            className="bg-card rounded-lg border border-border p-6 hover:shadow-md transition-shadow group"
          >
            <div className="flex items-center gap-3 mb-2">
              <card.icon className="h-5 w-5 text-primary" />
              <h3 className="font-heading text-lg font-semibold group-hover:text-primary transition-colors">{card.title}</h3>
            </div>
            <p className="text-sm text-muted-foreground">{card.desc}</p>
          </Link>
        ))}
      </div>
    </div>
  );
};

export default Dashboard;
