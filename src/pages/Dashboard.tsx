import { useAuth } from "@/contexts/AuthContext";
import { cn } from "@/lib/utils";
import OwnerDashboard from "@/components/dashboard/OwnerDashboard";
import SitterDashboard from "@/components/dashboard/SitterDashboard";

const Dashboard = () => {
  const { user, activeRole, setActiveRole } = useAuth();

  return (
    <div className="p-6 md:p-10 max-w-4xl mx-auto animate-fade-in">
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

      {activeRole === "owner" ? <OwnerDashboard /> : <SitterDashboard />}
    </div>
  );
};

export default Dashboard;
