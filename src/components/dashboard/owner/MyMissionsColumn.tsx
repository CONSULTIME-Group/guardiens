import { memo } from "react";
import { Link, useNavigate } from "react-router-dom";
import type { SmallMission } from "./types";

const MyMissionsColumn = memo(({ missions }: { missions: SmallMission[] }) => {
  const navigate = useNavigate();

  return (
    <div className="bg-card border border-border rounded-2xl p-5">
      <div className="flex justify-between items-center mb-4">
        <p className="text-sm font-semibold text-foreground">Mes petites missions</p>
        <Link to="/petites-missions" className="text-xs text-primary font-sans hover:underline">Voir tout</Link>
      </div>
      {missions.length === 0 ? (
        <p className="text-xs text-muted-foreground font-sans italic text-center py-4">Aucune mission pour le moment.</p>
      ) : (
        missions.map(m => {
          const responseCount = m.small_mission_responses?.length || 0;
          const isCompleted = m.status === "completed";
          return (
            <Link key={m.id} to={`/petites-missions/${m.id}`} className="flex items-center gap-3 py-2.5 border-b border-border last:border-0">
              <div className={`w-2 h-2 rounded-full shrink-0 ${isCompleted ? "bg-muted-foreground/30" : "bg-primary"}`} />
              <p className={`text-xs font-sans flex-1 ${isCompleted ? "text-muted-foreground line-through" : "text-foreground"}`}>{m.title}</p>
              <p className="text-xs text-muted-foreground font-sans shrink-0">
                {isCompleted ? "Terminée" : `${responseCount} réponse${responseCount > 1 ? "s" : ""}`}
              </p>
            </Link>
          );
        })
      )}
    </div>
  );
});

MyMissionsColumn.displayName = "MyMissionsColumn";
export default MyMissionsColumn;
