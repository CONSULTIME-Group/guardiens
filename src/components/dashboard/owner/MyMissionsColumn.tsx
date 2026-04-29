import { memo } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import type { SmallMission } from "./types";

const MyMissionsColumn = memo(({ missions }: { missions: SmallMission[] }) => {
  const navigate = useNavigate();

  // Tri : actives (non terminées) d'abord, puis terminées — ordre interne préservé.
  const sortedMissions = [...missions].sort((a, b) => {
    const aDone = a.status === "completed" ? 1 : 0;
    const bDone = b.status === "completed" ? 1 : 0;
    return aDone - bDone;
  });

  return (
    <div className="bg-card border border-border rounded-2xl p-5">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-sm font-semibold text-foreground">Mes petites missions</h3>
        <Link to="/petites-missions" className="text-xs text-primary font-sans hover:underline">Voir tout</Link>
      </div>
      {sortedMissions.length === 0 ? (
        <div className="py-2">
          <p className="text-xs text-muted-foreground font-sans mb-3">
            <span className="font-semibold text-foreground">Osez !</span> Demandez un coup de main en publiant une petite mission, ou proposez quelque chose en échange — un café, une histoire, un service…
          </p>
          <div className="flex flex-col gap-2">
            <Button onClick={() => navigate("/petites-missions/creer")} className="w-full rounded-xl text-xs font-medium">Publier un besoin →</Button>
            <Button variant="outline" onClick={() => navigate("/petites-missions")} className="w-full rounded-xl text-xs font-medium">Proposer mon aide →</Button>
          </div>
        </div>
      ) : (
        sortedMissions.map(m => {
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
