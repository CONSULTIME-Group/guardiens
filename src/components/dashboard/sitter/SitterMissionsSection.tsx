import { memo, useCallback, useMemo, useRef, useState, type KeyboardEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { AlertCircle, RefreshCw, Plus, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";

interface SitterMissionsSectionProps {
  myMissions: any[];
  nearbyMissions: any[];
  postalCode: string | null;
  myMissionsError?: string | null;
  nearbyMissionsError?: string | null;
}

/**
 * Section "Petites missions" côté gardien.
 * Deux onglets internes :
 *  - Les miennes : besoins/offres publiés par le gardien (états ouverte / terminée)
 *  - Autour de vous : missions publiées par les gens du coin
 *
 * Cohérence visuelle avec MissionsTabsCard côté propriétaire :
 * mêmes onglets, mêmes pastilles d'état, mêmes actions cohérentes.
 */
const SitterMissionsSection = memo(({
  myMissions,
  nearbyMissions,
  postalCode,
  myMissionsError = null,
  nearbyMissionsError = null,
}: SitterMissionsSectionProps) => {
  const navigate = useNavigate();
  const openCount = useMemo(
    () => myMissions.filter(m => m.status !== "completed").length,
    [myMissions]
  );
  // Item 12, ne pas atterrir sur "Les miennes" si seules des missions terminées
  // (cartes barrées en grisé = mauvais signal). On préfère "Autour de vous".
  const [tab, setTab] = useState<"mine" | "nearby">(
    openCount > 0 ? "mine" : "nearby"
  );

  // Tri : ouvertes d'abord, terminées en dessous (cohérent avec côté propriétaire).
  const sortedMine = useMemo(
    () =>
      [...myMissions].sort((a, b) => {
        const aDone = a.status === "completed" ? 1 : 0;
        const bDone = b.status === "completed" ? 1 : 0;
        return aDone - bDone;
      }),
    [myMissions]
  );

  const ErrorState = ({ message }: { message: string }) => (
    <div role="alert" className="rounded-xl border border-destructive/30 bg-destructive/5 p-4 text-center">
      <p className="text-xs text-destructive font-medium inline-flex items-center gap-1.5 justify-center mb-1">
        <AlertCircle className="h-3.5 w-3.5" aria-hidden="true" />
        {message}
      </p>
      <button
        type="button"
        onClick={() => window.location.reload()}
        className="mt-1 inline-flex items-center gap-1 text-xs text-destructive hover:underline"
      >
        <RefreshCw className="h-3 w-3" aria-hidden="true" /> Réessayer
      </button>
    </div>
  );

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
        role="tab"
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
    <div className="bg-card border border-border rounded-2xl p-4 sm:p-5 transition-shadow duration-300 hover:shadow-sm">
      <div className="flex items-center justify-between gap-2 mb-3">
        <h3 className="text-sm font-semibold text-foreground">Petites missions</h3>
        <Link to="/petites-missions" className="text-xs text-primary font-sans hover:underline shrink-0">
          Voir tout →
        </Link>
      </div>

      {/* Onglets */}
      <div className="flex gap-1 p-1 bg-muted/50 rounded-xl mb-4" role="tablist">
        {tabBtn("mine", "Les miennes", openCount)}
        {tabBtn("nearby", "Autour de vous", nearbyMissions.length)}
      </div>

      {/* ─── Onglet : Les miennes ─── */}
      {tab === "mine" && (
        myMissionsError ? (
          <ErrorState message={myMissionsError} />
        ) : sortedMine.length === 0 ? (
          <div className="flex items-center justify-between gap-3 py-1">
            <p className="text-xs text-muted-foreground font-sans flex-1">
              Demandez un coup de main ou proposez le vôtre.
            </p>
            <Button
              variant="outline"
              onClick={() => navigate("/petites-missions/creer")}
              className="shrink-0 rounded-xl text-xs font-medium gap-1.5"
              size="sm"
            >
              <Plus className="h-3.5 w-3.5" aria-hidden="true" />
              Publier
            </Button>
          </div>
        ) : (
          <>
            <div>
              {sortedMine.map((m: any) => {
                const responses = m.small_mission_responses || [];
                const responseCount = responses.length;
                const isCompleted = m.status === "completed";
                return (
                  <Link
                    key={m.id}
                    to={`/petites-missions/${m.id}`}
                    className="group flex items-center gap-3 py-2.5 border-b border-border last:border-0 hover:bg-muted/40 -mx-2 px-2 rounded-lg transition-all duration-200 ease-out hover:translate-x-0.5"
                  >
                    <div
                      className={`w-2 h-2 rounded-full shrink-0 transition-transform duration-200 group-hover:scale-125 ${
                        isCompleted ? "bg-muted-foreground/30" : "bg-primary"
                      }`}
                      aria-hidden="true"
                    />
                    <p
                      className={`text-xs font-sans flex-1 truncate transition-colors ${
                        isCompleted
                          ? "text-muted-foreground line-through"
                          : "text-foreground group-hover:text-primary"
                      }`}
                    >
                      {m.title}
                    </p>
                    <p className="text-xs text-muted-foreground font-sans shrink-0">
                      {isCompleted
                        ? "Terminée"
                        : responseCount > 0
                        ? `${responseCount} réponse${responseCount > 1 ? "s" : ""}`
                        : "Ouverte"}
                    </p>
                  </Link>
                );
              })}
            </div>
            <Button
              size="sm"
              variant="outline"
              onClick={() => navigate("/petites-missions/creer")}
              className="w-full rounded-xl text-xs mt-3 gap-1.5"
            >
              <Plus className="h-3.5 w-3.5" aria-hidden="true" />
              Publier une nouvelle mission
            </Button>
          </>
        )
      )}

      {/* ─── Onglet : Autour de vous ─── */}
      {tab === "nearby" && (
        nearbyMissionsError ? (
          <ErrorState message={nearbyMissionsError} />
        ) : nearbyMissions.length === 0 ? (
          <div className="rounded-xl bg-muted/40 border border-dashed border-border p-3 text-center">
            <p className="text-xs text-muted-foreground font-sans italic mb-2">
              {postalCode
                ? "Pas encore d'échange dans votre zone."
                : "Ajoutez votre code postal pour voir les échanges proches."}
            </p>
            <button
              onClick={() => navigate("/petites-missions")}
              className="text-xs text-primary hover:underline font-sans font-medium"
            >
              Parcourir toutes les missions →
            </button>
          </div>
        ) : (
          <>
            <p className="text-xs text-muted-foreground font-sans mb-3">
              Découvrez les besoins des gens du coin et proposez votre aide.
            </p>
            <div>
              {nearbyMissions.map((m: any) => {
                const distance = typeof m.distance_km === "number" ? Math.round(m.distance_km) : null;
                return (
                <Link
                  key={m.id}
                  to={`/petites-missions/${m.id}`}
                  className="group flex items-start gap-3 py-2.5 border-b border-border last:border-0 -mx-2 px-2 rounded-lg transition-all duration-200 ease-out hover:bg-muted/40 hover:translate-x-0.5"
                >
                  <div
                    className="w-2 h-2 rounded-full bg-accent-foreground/40 shrink-0 mt-1.5 transition-transform duration-200 group-hover:scale-125 group-hover:bg-primary"
                    aria-hidden="true"
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-foreground/80 font-sans leading-snug truncate transition-colors group-hover:text-foreground">
                      {m.title}
                    </p>
                    <p className="text-xs text-muted-foreground font-sans mt-0.5">
                      {m.city || "Près de vous"}
                      {m.date_needed
                        ? ` · ${format(new Date(m.date_needed), "d MMM", { locale: fr })}`
                        : ""}
                    </p>
                  </div>
                  {distance !== null && (
                    <span
                      className="shrink-0 inline-flex items-center rounded-full bg-primary/10 text-primary text-[11px] font-semibold font-sans px-2 py-0.5 tabular-nums"
                      aria-label={`À environ ${distance} kilomètres`}
                      title="Distance approximative (~1 km de précision)"
                    >
                      {distance}&nbsp;km
                    </span>
                  )}
                </Link>
                );
              })}
            </div>
            <div className="flex gap-2 mt-3">
              <Button
                size="sm"
                variant="outline"
                onClick={() => navigate("/petites-missions/creer")}
                className="flex-1 rounded-xl text-xs gap-1.5"
              >
                <Plus className="h-3.5 w-3.5" aria-hidden="true" />
                Publier
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => navigate("/petites-missions")}
                className="flex-1 rounded-xl text-xs text-foreground/80 hover:text-primary"
              >
                Voir tout
              </Button>
            </div>
          </>
        )
      )}
    </div>
  );
});

SitterMissionsSection.displayName = "SitterMissionsSection";
export default SitterMissionsSection;
