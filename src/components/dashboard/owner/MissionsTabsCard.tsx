import { memo, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import type { SmallMission } from "./types";

interface MissionsTabsCardProps {
  myMissions: SmallMission[];
  nearbyMissions: SmallMission[];
}

/**
 * Carte unifiée "Petites missions", fusion de MyMissionsColumn + ExchangesColumn.
 * Deux onglets internes :
 *  - Mes missions : besoins/offres publiés par l'utilisateur
 *  - Autour de moi : missions des gens du coin
 * Réduit drastiquement l'empilement vertical dans la colonne droite.
 */
const MissionsTabsCard = memo(({ myMissions, nearbyMissions }: MissionsTabsCardProps) => {
  const navigate = useNavigate();
  const [tab, setTab] = useState<"mine" | "nearby">(
    myMissions.length > 0 ? "mine" : "nearby"
  );

  const { activeMine, archivedMine } = useMemo(() => {
    const active: SmallMission[] = [];
    const archived: SmallMission[] = [];
    for (const m of myMissions) {
      (m.status === "completed" ? archived : active).push(m);
    }
    return { activeMine: active, archivedMine: archived };
  }, [myMissions]);

  const tabBtn = (key: "mine" | "nearby", label: string, count: number) => {
    const active = tab === key;
    return (
      <button
        type="button"
        onClick={() => setTab(key)}
        className={`flex-1 px-3 py-1.5 rounded-lg text-xs font-medium transition-all duration-200 ease-out ${
          active
            ? "bg-card text-foreground shadow-sm"
            : "text-muted-foreground hover:text-foreground hover:bg-card/50"
        }`}
        aria-pressed={active}
      >
        {label}
        {count > 0 && (
          <span className={`ml-1.5 text-[10px] ${active ? "text-primary" : "text-muted-foreground/70"}`}>
            {count}
          </span>
        )}
      </button>
    );
  };

  return (
    <div className="bg-card border border-border rounded-2xl p-5 transition-shadow duration-300 hover:shadow-sm">
      <div className="flex items-center justify-between gap-2 mb-3">
        <h3 className="text-sm font-semibold text-foreground">Petites missions</h3>
        <Link to="/petites-missions" className="text-xs text-primary font-sans hover:underline shrink-0">
          Voir tout
        </Link>
      </div>

      {/* Onglets internes */}
      <div className="flex gap-1 p-1 bg-muted/50 rounded-xl mb-4" role="tablist">
        {tabBtn("mine", "Les miennes", myMissions.length)}
        {tabBtn("nearby", "Autour de moi", nearbyMissions.length)}
      </div>

      {/* Contenu : Mes missions */}
      {tab === "mine" && (
        activeMine.length === 0 && archivedMine.length === 0 ? (
          <div className="py-1">
            <p className="text-xs text-muted-foreground font-sans mb-3">
              <span className="font-semibold text-foreground">Osez !</span> Demandez un coup de main, ou proposez quelque chose en échange, un café, une histoire, un service…
            </p>
            <div className="flex flex-col gap-2">
              <Button
                onClick={() => navigate("/petites-missions/creer")}
                className="w-full rounded-xl text-xs font-medium"
                size="sm"
              >
                Publier un besoin →
              </Button>
              <Button
                variant="outline"
                onClick={() => navigate("/petites-missions")}
                className="w-full rounded-xl text-xs font-medium"
                size="sm"
              >
                Proposer mon aide →
              </Button>
            </div>
          </div>
        ) : (
          <div>
            {activeMine.length > 0 ? (
              activeMine.map(m => {
                const responseCount = m.small_mission_responses?.length || 0;
                return (
                  <Link
                    key={m.id}
                    to={`/petites-missions/${m.id}`}
                    className="group flex items-center gap-3 py-2.5 border-b border-border last:border-0 hover:bg-muted/40 -mx-2 px-2 rounded-lg transition-all duration-200 ease-out hover:translate-x-0.5"
                  >
                    <div className="w-2 h-2 rounded-full shrink-0 bg-primary transition-transform duration-200 group-hover:scale-125" />
                    <p className="text-xs font-sans flex-1 truncate text-foreground group-hover:text-primary transition-colors">
                      {m.title}
                    </p>
                    <p className="text-xs text-muted-foreground font-sans shrink-0">
                      {`${responseCount} réponse${responseCount > 1 ? "s" : ""}`}
                    </p>
                  </Link>
                );
              })
            ) : (
              <p className="text-xs text-muted-foreground italic py-1">Aucune mission active.</p>
            )}

            {archivedMine.length > 0 && (
              <details className="group mt-2">
                <summary className="cursor-pointer list-none text-xs text-muted-foreground hover:text-foreground transition-colors py-2 flex items-center justify-between">
                  <span>Archivées ({archivedMine.length})</span>
                  <span className="group-open:rotate-180 transition-transform" aria-hidden="true">▾</span>
                </summary>
                <div className="pt-1">
                  {archivedMine.map(m => (
                    <Link
                      key={m.id}
                      to={`/petites-missions/${m.id}`}
                      className="flex items-center gap-3 py-2.5 border-b border-border last:border-0 -mx-2 px-2 rounded-lg"
                    >
                      <div className="w-2 h-2 rounded-full shrink-0 bg-muted-foreground/30" />
                      <p className="text-xs font-sans flex-1 truncate text-muted-foreground line-through">
                        {m.title}
                      </p>
                      <p className="text-xs text-muted-foreground font-sans shrink-0">Terminée</p>
                    </Link>
                  ))}
                </div>
              </details>
            )}
          </div>
        )
      )}

      {/* Contenu : Autour de moi */}
      {tab === "nearby" && (
        nearbyMissions.length === 0 ? (
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
          <div>
            <p className="text-xs text-muted-foreground font-sans mb-3">
              Découvrez les besoins de gens du coin et proposez votre aide.
            </p>
            {nearbyMissions.map(m => (
              <Link
                key={m.id}
                to={`/petites-missions/${m.id}`}
                className="group flex items-center gap-3 py-2.5 border-b border-border last:border-0 hover:bg-muted/40 -mx-2 px-2 rounded-lg transition-all duration-200 ease-out hover:translate-x-0.5"
              >
                <div className="w-2 h-2 rounded-full shrink-0 bg-primary transition-transform duration-200 group-hover:scale-125" />
                <p className="text-xs font-sans flex-1 truncate text-foreground transition-colors group-hover:text-primary">{m.title}</p>
                <p className="text-xs text-muted-foreground font-sans shrink-0">{m.city || ""}</p>
              </Link>
            ))}
          </div>
        )
      )}
    </div>
  );
});

MissionsTabsCard.displayName = "MissionsTabsCard";
export default MissionsTabsCard;
