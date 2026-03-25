import { useAuth } from "@/contexts/AuthContext";
import { cn } from "@/lib/utils";

const Dashboard = () => {
  const { user, activeRole, setActiveRole } = useAuth();

  return (
    <div className="p-6 md:p-10 max-w-4xl mx-auto">
      {/* Role toggle */}
      {user?.role === "both" && (
        <div className="flex gap-1 p-1 bg-muted rounded-pill w-fit mb-8">
          <button
            onClick={() => setActiveRole("owner")}
            className={cn(
              "px-5 py-2 rounded-pill text-sm font-medium transition-all",
              activeRole === "owner"
                ? "bg-card text-foreground shadow-sm"
                : "text-muted-foreground"
            )}
          >
            Propriétaire
          </button>
          <button
            onClick={() => setActiveRole("sitter")}
            className={cn(
              "px-5 py-2 rounded-pill text-sm font-medium transition-all",
              activeRole === "sitter"
                ? "bg-card text-foreground shadow-sm"
                : "text-muted-foreground"
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

      {/* Skeleton cards */}
      <div className="grid md:grid-cols-2 gap-6 mt-10">
        {[
          activeRole === "owner" ? "Créer une annonce" : "Trouver une garde",
          "Mes candidatures",
          "Mes messages",
          "Mon profil",
        ].map((title) => (
          <div
            key={title}
            className="bg-card rounded-lg border border-border p-6 hover:shadow-md transition-shadow"
          >
            <h3 className="font-heading text-lg font-semibold mb-2">{title}</h3>
            <div className="h-2 bg-muted rounded-full w-3/4" />
          </div>
        ))}
      </div>
    </div>
  );
};

export default Dashboard;
