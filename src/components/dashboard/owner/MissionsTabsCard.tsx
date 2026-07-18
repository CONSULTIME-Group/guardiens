import { memo, useMemo, useState, useRef, useCallback, type KeyboardEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import ExchangePactBanner from "@/components/missions/ExchangePactBanner";
import ExchangeHowItWorks from "@/components/missions/ExchangeHowItWorks";
import type { SmallMission } from "./types";

interface MissionsTabsCardProps {
  myMissions: SmallMission[];
  nearbyMissions: SmallMission[];
}

/**
 * Carte unifiée "Petites missions", fusion de MyMissionsColumn + ExchangesColumn.
 * Deux onglets internes :
 *  - Mes missions : besoins/offres publiés par l'utilisateur
 *  - Autour de vous : missions des gens du coin
 * Réduit drastiquement l'empilement vertical dans la colonne droite.
 */
const MissionsTabsCard = memo(({ myMissions, nearbyMissions }: MissionsTabsCardProps) => {
  const navigate = useNavigate();

  const openMine = useMemo(
    () => myMissions.filter((m) => m.status !== "completed").length,
    [myMissions]
  );

  const [tab, setTab] = useState<"mine" | "nearby">(openMine > 0 ? "mine" : "nearby");

  const { activeMine, archivedMine } = useMemo(() => {
    const active: SmallMission[] = [];
    const archived: SmallMission[] = [];
    for (const m of myMissions) {
      (m.status === "completed" ? archived : active).push(m);
    }
    return { activeMine: active, archivedMine: archived };
  }, [myMissions]);

  const TAB_ORDER: Array<"mine" | "nearby"> = ["mine", "nearby"];
  const tabRefs = useRef<Record<"mine" | "nearby", HTMLButtonElement | null>>({
    mine: null,
    nearby: null,
  });

  const onTabKeyDown = useCallback(
    (e: KeyboardEvent<HTMLButtonElement>) => {
      const idx = TAB_ORDER.indexOf(tab);
      let nextIdx = idx;
      if (e.key === "ArrowRight") nextIdx = (idx + 1) % TAB_ORDER.length;
      else if (e.key === "ArrowLeft")
        nextIdx = (idx - 1 + TAB_ORDER.length) % TAB_ORDER.length;
      else if (e.key === "Home") nextIdx = 0;
      else if (e.key === "End") nextIdx = TAB_ORDER.length - 1;
      else return;
      e.preventDefault();
      const nextKey = TAB_ORDER[nextIdx];
      setTab(nextKey);
      tabRefs.current[nextKey]?.focus();
    },
    [tab]
  );

  const tabBtn = (key: "mine" | "nearby", label: string, count: number) => {
    const active = tab === key;
    return (
      <button
        ref={(el) => (tabRefs.current[key] = el)}
        type="button"
        role="tab"
        id={`owner-missions-tab-${key}`}
        aria-selected={active}
        aria-controls={`owner-missions-panel-${key}`}
        tabIndex={active ? 0 : -1}
        onClick={() => setTab(key)}
        onKeyDown={onTabKeyDown}
        className={`flex-1 px-3 py-1.5 rounded-lg text-xs font-medium transition-all duration-200 ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background ${
          active
            ? "bg-card text-foreground shadow-sm"
            : "text-muted-foreground hover:text-foreground hover:bg-card/50"
        }`}
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
        <h3 className="text-sm font-semibold text-foreground">Coups de main</h3>
        <Link to="/petites-missions" className="text-xs text-primary font-sans hover:underline shrink-0">
          Voir tout
        </Link>
      </div>

      {myMissions.length === 0 && nearbyMissions.length === 0 ? (
        <>
          <ExchangePactBanner variant="owner" className="mb-4" />
          <ExchangeHowItWorks variant="owner" className="mb-4" />
        </>
      ) : (
        <details className="group mb-4 rounded-xl border border-border bg-muted/30 overflow-hidden">
          <summary className="cursor-pointer list-none px-3 py-2 flex items-center justify-between hover:bg-muted/50 transition-colors">
            <span className="text-xs font-semibold text-foreground">Comment fonctionne l'entraide</span>
            <span className="text-xs text-muted-foreground group-open:rotate-180 transition-transform" aria-hidden="true">▾</span>
          </summary>
          <div className="px-3 pb-3 pt-2">
            <ExchangePactBanner variant="owner" className="mb-3" />
            <ExchangeHowItWorks variant="owner" />
          </div>
        </details>
      )}

      {/* Onglets internes */}
      <div className="flex gap-1 p-1 bg-muted/50 rounded-xl mb-4" role="tablist" aria-label="Filtre des coups de main">
        {tabBtn("mine", "Les miennes", openMine)}
        {tabBtn("nearby", "Autour de vous", nearbyMissions.length)}
      </div>

      {/* ─── Panneau : Mes missions ─── */}
      <div
        role="tabpanel"
        id="owner-missions-panel-mine"
        aria-labelledby="owner-missions-tab-mine"
        hidden={tab !== "mine"}
      >
        {tab === "mine" && (
          activeMine.length === 0 && archivedMine.length === 0 ? (
            <div className="py-1">
              <p className="text-xs text-muted-foreground font-sans mb-3">
                Demandez un coup de main, proposez quelque chose en échange (café, œufs, un service, une histoire).
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
                activeMine.map((m) => {
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
                    {archivedMine.map((m) => (
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
      </div>

      {/* ─── Panneau : Autour de vous ─── */}
      <div
        role="tabpanel"
        id="owner-missions-panel-nearby"
        aria-labelledby="owner-missions-tab-nearby"
        hidden={tab !== "nearby"}
      >
        {tab === "nearby" && (
          nearbyMissions.length === 0 ? (
            <div className="rounded-xl bg-muted/40 border border-dashed border-border p-3 text-center">
              <p className="text-xs text-muted-foreground font-sans italic">
                Aucun coup de main autour de vous pour le moment.
              </p>
              <button
                onClick={() => navigate("/petites-missions")}
                className="mt-2 text-xs text-primary hover:underline font-sans font-medium"
              >
                Parcourir tous les échanges →
              </button>
            </div>
          ) : (
            <div>
              <p className="text-xs text-muted-foreground font-sans mb-3">
                Découvrez les besoins de gens du coin et proposez votre aide.
              </p>
              {nearbyMissions.map((m) => (
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
    </div>
  );
});

MissionsTabsCard.displayName = "MissionsTabsCard";
export default MissionsTabsCard;
