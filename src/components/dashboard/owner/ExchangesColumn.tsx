import { memo } from "react";
import { Link, useNavigate } from "react-router-dom";
import type { SmallMission } from "./types";

const ExchangesColumn = memo(({ missions }: { missions: SmallMission[] }) => {
  const navigate = useNavigate();

  return (
    <div className="bg-card border border-border rounded-2xl p-5">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-sm font-semibold text-foreground">Échanges autour de vous</h3>
        <Link to="/petites-missions" className="text-xs text-primary font-sans hover:underline">Voir tout</Link>
      </div>
      <p className="text-xs text-muted-foreground font-sans mb-3">
        Découvrez les besoins de gens du coin et proposez votre aide ponctuelle.
      </p>
      {missions.length === 0 ? (
        <div className="rounded-xl bg-muted/40 border border-dashed border-border p-3 text-center">
          <p className="text-xs text-muted-foreground font-sans italic">
            Aucune mission autour de vous pour le moment.
          </p>
          <button
            onClick={() => navigate("/petites-missions")}
            className="mt-2 text-xs text-primary hover:underline font-sans font-medium"
          >
            Parcourir toutes les missions →
          </button>
        </div>
      ) : (
        missions.map(m => (
          <Link key={m.id} to={`/petites-missions/${m.id}`} className="flex items-center gap-3 py-2.5 border-b border-border last:border-0">
            <div className="w-2 h-2 rounded-full shrink-0 bg-primary" />
            <p className="text-xs font-sans flex-1 text-foreground">{m.title}</p>
            <p className="text-xs text-muted-foreground font-sans shrink-0">{m.city || ""}</p>
          </Link>
        ))
      )}
    </div>
  );
});

ExchangesColumn.displayName = "ExchangesColumn";
export default ExchangesColumn;
