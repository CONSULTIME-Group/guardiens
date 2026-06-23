import { memo } from "react";
import { Link, useNavigate } from "react-router-dom";
import { format, differenceInDays } from "date-fns";
import { fr } from "date-fns/locale";
import { Eye, RefreshCw, Plus, Inbox, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import ShareButtons from "@/components/sits/ShareButtons";
import { capitalize, SPECIES_LABEL } from "./helpers";
import type { SitRow, Pet } from "./types";
import {
  ENV_LABELS,
  TYPE_LABELS,
  getSitStatusConfig,
} from "@/components/sits/shared/sitConstants";

interface MonAnnonceCardProps {
  sits: SitRow[];
  pets: Pet[];
  propertyType: string | null;
  propertyEnvironment: string | null;
  pendingAppCount: number;
  coverPhoto?: string | null;
}

const MonAnnonceCard = memo(({ sits, pets, propertyType, propertyEnvironment, pendingAppCount, coverPhoto }: MonAnnonceCardProps) => {
  const navigate = useNavigate();
  const now = new Date();

  // Priorité hero : 1) garde en cours, 2) prochaine confirmée, 3) prochaine
  // publiée, 4) annonce publiée sans date.
  // /!\ On NE FALLBACK PLUS sur la dernière garde terminée : afficher un sit
  // passé comme « hero » est démotivant et trompeur (badge « Terminée » +
  // dates passées). On bascule sur un état dédié « Relancer / republier ».
  const nowTs = now.getTime();
  const startTs = (s: typeof sits[number]) =>
    s.start_date ? new Date(s.start_date).getTime() : Number.POSITIVE_INFINITY;

  const inProgress = sits.find(s => s.status === "in_progress");
  const upcomingConfirmed = sits
    .filter(s => s.status === "confirmed" && s.start_date && new Date(s.start_date).getTime() >= nowTs)
    .sort((a, b) => startTs(a) - startTs(b))[0];
  const upcomingPublished = sits
    .filter(s => s.status === "published" && s.start_date && new Date(s.start_date).getTime() >= nowTs)
    .sort((a, b) => startTs(a) - startTs(b))[0];
  const anyPublished = sits.find(s => s.status === "published");
  // Conservé uniquement pour le CTA « Republier » (pas pour le hero principal).
  const lastCompleted = sits
    .filter(s => s.status === "completed")
    .sort((a, b) => (new Date(b.end_date || 0).getTime()) - (new Date(a.end_date || 0).getTime()))[0];

  const currentSit =
    inProgress || upcomingConfirmed || upcomingPublished || anyPublished;

  // No sit ever + no profile data → empty state
  if (!currentSit && !lastCompleted && pets.length === 0 && !propertyType) {
    return (
      <div className="bg-card border border-border rounded-2xl p-6 text-center space-y-3">
        <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mx-auto">
          <span className="text-lg font-heading font-bold text-primary/70" aria-hidden="true">M</span>
        </div>
        <div>
          <h3 className="text-sm font-semibold text-foreground">Mon annonce</h3>
          <p className="text-xs text-muted-foreground mt-1">
            Complétez votre profil (logement + animaux) puis publiez votre première annonce.
          </p>
        </div>
        <Button size="sm" onClick={() => navigate("/owner-profile")}>
          Compléter mon profil
        </Button>
      </div>
    );
  }

  // Pas de garde active/à venir, mais une garde terminée existe → état « Relancer ».
  // On ne ressuscite PAS le passé en hero : on propose explicitement de republier.
  if (!currentSit && lastCompleted) {
    const lastDate = lastCompleted.end_date
      ? format(new Date(lastCompleted.end_date), "MMMM yyyy", { locale: fr })
      : null;
    return (
      <div className="bg-card border border-border rounded-2xl p-5 space-y-3">
        <div className="flex items-center justify-between gap-2">
          <h3 className="text-sm font-semibold text-foreground">Prochaine garde</h3>
          <span className="text-xs bg-muted text-muted-foreground rounded-full px-2 py-0.5">Aucune planifiée</span>
        </div>
        <p className="text-sm text-foreground/80">
          {lastDate
            ? `Votre dernière garde s'est terminée en ${lastDate}.`
            : "Votre dernière garde est terminée."}{" "}
          Republiez votre annonce ou créez-en une nouvelle pour préparer la suivante.
        </p>
        <div className="flex flex-wrap gap-2">
          <Button size="sm" variant="outline" onClick={() => navigate(`/sits/${lastCompleted.id}#republier`)}>
            <RefreshCw className="h-3.5 w-3.5 mr-1.5" /> Republier la précédente
          </Button>
          <Button size="sm" onClick={() => navigate("/sits/create")}>
            <Plus className="h-3.5 w-3.5 mr-1.5" /> Nouvelle annonce
          </Button>
        </div>
      </div>
    );
  }

  // No sit ever but profile data exists → ready to publish
  if (!currentSit) {
    return (
      <div className="bg-card border-2 border-dashed border-primary/30 rounded-2xl p-5 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-foreground">Mon annonce</h3>
          <span className="text-xs bg-muted text-muted-foreground rounded-full px-2 py-0.5">Brouillon</span>
        </div>

        {/* Preview from profile */}
        <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted-foreground">
          {propertyType && (
            <span>
              {TYPE_LABELS[propertyType] || propertyType}
              {propertyEnvironment ? ` · ${ENV_LABELS[propertyEnvironment] || propertyEnvironment}` : ""}
            </span>
          )}
          {propertyType && pets.length > 0 && <span aria-hidden="true">·</span>}
          {pets.length > 0 && (
            <span>{pets.map(p => capitalize(p.name)).join(", ")}</span>
          )}
        </div>

        <p className="text-xs text-muted-foreground">
          Votre profil est prêt, il ne manque que les dates pour mettre en ligne.
        </p>

        <Button size="sm" className="w-full" onClick={() => navigate("/sits/create")}>
          <Plus className="h-3.5 w-3.5 mr-1.5" /> Mettre en ligne
        </Button>
      </div>
    );
  }

  // Active or completed sit
  const isActive = ["published", "confirmed", "in_progress"].includes(currentSit.status);
  const statusConf = getSitStatusConfig(currentSit.status);
  const dateRange = [
    currentSit.start_date ? format(new Date(currentSit.start_date), "d MMM", { locale: fr }) : "",
    currentSit.end_date ? format(new Date(currentSit.end_date), "d MMM yyyy", { locale: fr }) : "",
  ].filter(Boolean).join(" → ");

  const appCount = currentSit.applications?.length || 0;
  const daysUntilStart = currentSit.start_date
    ? differenceInDays(new Date(currentSit.start_date), now)
    : null;

  // Diagnostic auto : annonce publiée depuis plus de 3 jours sans aucune
  // candidature → on bascule du compteur passif vers un bloc de leviers
  // actionnables. Ne s'affiche pas si la garde commence dans plus de 30 j
  // (normal qu'aucune candidature n'arrive sur une garde lointaine).
  const daysSincePublished = currentSit.created_at
    ? differenceInDays(now, new Date(currentSit.created_at))
    : 0;
  const showStallDiagnostic =
    currentSit.status === "published" &&
    appCount === 0 &&
    daysSincePublished >= 3 &&
    (daysUntilStart === null || daysUntilStart <= 30);

  return (
    <div className="group/card bg-card border border-border rounded-2xl overflow-hidden transition-all duration-300 hover:shadow-md hover:border-border/80">
      {coverPhoto ? (
        <div className="relative h-40 w-full overflow-hidden">
          <img
            src={coverPhoto}
            alt={`Photo de couverture de l'annonce ${currentSit.title || ""}`.trim()}
            loading="lazy"
            className="w-full h-full object-cover transition-transform duration-500 ease-out group-hover/card:scale-[1.03]"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-foreground/70 via-foreground/10 to-transparent" aria-hidden="true" />
          <div className="absolute top-3 left-3 right-3 flex items-start justify-between gap-2">
            <span className="text-[11px] uppercase tracking-wider text-background/90 font-sans bg-foreground/40 backdrop-blur-sm rounded-full px-2.5 py-1">
              {isActive ? "Mon annonce" : "Dernière garde"}
            </span>
            <span className={`text-xs rounded-full px-2.5 py-1 font-medium backdrop-blur-sm ${statusConf.className}`}>
              {statusConf.label}
            </span>
          </div>
          <div className="absolute bottom-3 left-4 right-4">
            <p className="text-base font-medium text-background leading-snug drop-shadow-sm">
              {currentSit.title}
            </p>
          </div>
        </div>
      ) : null}
      <div className="p-5 space-y-3">
      {!coverPhoto && (
        <>
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-foreground">
              {isActive ? "Mon annonce" : "Dernière garde"}
            </h3>
            <span className={`text-xs rounded-full px-2.5 py-0.5 font-medium ${statusConf.className}`}>
              {statusConf.label}
            </span>
          </div>
          <p className="text-sm font-medium text-foreground leading-snug">{currentSit.title}</p>
        </>
      )}

      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
        <span>{dateRange}</span>
        {isActive && daysUntilStart !== null && daysUntilStart > 0 && (
          <span>dans {daysUntilStart}j</span>
        )}
        {isActive && typeof currentSit.views_30d === "number" && currentSit.views_30d > 0 && (
          <span className="inline-flex items-center gap-1" title="Vues uniques estimées sur 30 jours">
            <Eye className="h-3 w-3" aria-hidden="true" />
            {currentSit.views_30d} vue{currentSit.views_30d > 1 ? "s" : ""} <span className="opacity-70">(30j)</span>
          </span>
        )}
        {isActive && appCount > 0 && (
          <span className="font-medium text-primary">
            {appCount} candidature{appCount > 1 ? "s" : ""}
            {pendingAppCount > 0 && ` (${pendingAppCount} nouvelle${pendingAppCount > 1 ? "s" : ""})`}
          </span>
        )}
      </div>

      {/* Encart candidatures, visible immédiatement, y compris à 0 */}
      {isActive && (
        pendingAppCount > 0 ? (
          <button
            type="button"
            onClick={() => navigate(`/sits/${currentSit.id}#candidatures`)}
            className="w-full flex items-center justify-between gap-3 rounded-xl border border-primary/30 bg-primary/5 hover:bg-primary/10 px-3 py-2.5 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            aria-label={`${pendingAppCount} candidature${pendingAppCount > 1 ? "s" : ""} en attente, voir les candidats`}
          >
            <span className="flex items-center gap-2.5 min-w-0">
              <span className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/15 text-primary shrink-0">
                <Inbox className="h-4 w-4" />
              </span>
              <span className="flex flex-col min-w-0">
                <span className="text-sm font-semibold text-foreground">
                  {pendingAppCount} candidature{pendingAppCount > 1 ? "s" : ""} en attente
                </span>
                <span className="text-xs text-muted-foreground">
                  sur {appCount} reçue{appCount > 1 ? "s" : ""} au total
                  {appCount === pendingAppCount ? ", à examiner dès maintenant" : ""}
                </span>
              </span>
            </span>
            <ArrowRight className="h-4 w-4 text-primary shrink-0" aria-hidden="true" />
          </button>
        ) : showStallDiagnostic ? (
          <div
            className="w-full rounded-xl border border-warning/40 bg-warning/5 px-3 py-3 space-y-2"
            role="status"
            aria-label="Aucune candidature reçue, diagnostic"
          >
            <div className="flex items-start gap-2.5">
              <span className="flex h-8 w-8 items-center justify-center rounded-full bg-warning/15 text-warning shrink-0 mt-0.5">
                <Inbox className="h-4 w-4" />
              </span>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-foreground">
                  Aucune candidature après {daysSincePublished} jours
                </p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Trois leviers pour relancer votre annonce&nbsp;:
                </p>
              </div>
            </div>
            <ul className="text-xs text-foreground/90 pl-10 space-y-1.5">
              <li className="flex items-start gap-2">
                <span className="text-warning" aria-hidden="true">·</span>
                <Link
                  to={`/sits/${currentSit.id}/edit#photos`}
                  className="hover:underline"
                >
                  Ajoutez 2–3 photos lumineuses (maison + animaux)
                </Link>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-warning" aria-hidden="true">·</span>
                <Link
                  to={`/sits/${currentSit.id}/edit#description`}
                  className="hover:underline"
                >
                  Étoffez la description (routine, lieu, attentes)
                </Link>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-warning" aria-hidden="true">·</span>
                <Link
                  to={`/sits/${currentSit.id}/edit#dates`}
                  className="hover:underline"
                >
                  Élargissez les dates ou proposez un week-end test
                </Link>
              </li>
            </ul>
          </div>
        ) : (
          <div
            className="w-full flex items-center gap-3 rounded-xl border border-dashed border-border bg-muted/30 px-3 py-2.5"
            role="status"
            aria-label="0 candidature en attente"
          >
            <span className="flex h-8 w-8 items-center justify-center rounded-full bg-muted text-muted-foreground shrink-0">
              <Inbox className="h-4 w-4" />
            </span>
            <span className="flex flex-col min-w-0">
              <span className="text-sm font-semibold text-foreground">
                0 candidature en attente
              </span>
              <span className="text-xs text-muted-foreground">
                Aucune candidature à examiner
                {appCount > 0 ? `, ${appCount} déjà traitée${appCount > 1 ? "s" : ""}` : ""}
              </span>
            </span>
          </div>
        )
      )}

      {/* Pet mini-icons */}
      {pets.length > 0 && (
        <div className="flex items-center gap-2">
          {pets.slice(0, 4).map(pet => (
            <div key={pet.id} className="flex items-center gap-1.5 text-xs text-muted-foreground">
              {pet.photo_url ? (
                <img src={pet.photo_url} alt={pet.name} className="w-5 h-5 rounded-full object-cover" />
              ) : (
                <span className="w-5 h-5 rounded-full bg-primary/10 text-primary text-[10px] font-semibold flex items-center justify-center" aria-hidden="true">
                  {pet.name?.[0]?.toUpperCase() || "·"}
                </span>
              )}
              <span>{capitalize(pet.name)}</span>
            </div>
          ))}
        </div>
      )}

      {/* Actions */}
      <div className="flex flex-wrap gap-2 pt-1">
        {isActive ? (
          <>
            <Button size="sm" className="flex-1 min-w-[110px] text-xs" onClick={() => navigate(`/sits/${currentSit.id}`)}>
              <Eye className="h-3.5 w-3.5 mr-1" /> Voir l'annonce
            </Button>
            <Button variant="outline" size="sm" className="flex-1 min-w-[110px] text-xs" onClick={() => navigate(`/sits/${currentSit.id}/edit`)}>
              Modifier
            </Button>
            {currentSit.status === "published" && (
              <ShareButtons
                sitId={currentSit.id}
                sitSlug={(currentSit as any).slug}
                title={currentSit.title || "Garde"}
                startDate={currentSit.start_date}
                endDate={currentSit.end_date}
                source="owner_dashboard_card"
                compact
              />
            )}
          </>
        ) : (
          <>
            <Button variant="outline" size="sm" className="flex-1 min-w-[140px] text-xs" onClick={() => navigate(`/sits/create?from=${currentSit.id}`)}>
              <RefreshCw className="h-3.5 w-3.5 mr-1" /> Republier
            </Button>
            <Button size="sm" className="flex-1 min-w-[140px] text-xs" onClick={() => navigate(`/sits/create`)}>
              <Plus className="h-3.5 w-3.5 mr-1" /> Nouvelle annonce
            </Button>
          </>
        )}
        </div>
      </div>
    </div>
  );
});

MonAnnonceCard.displayName = "MonAnnonceCard";
export default MonAnnonceCard;
