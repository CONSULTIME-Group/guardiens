import { memo } from "react";
import { Link, useNavigate } from "react-router-dom";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Skeleton } from "@/components/ui/skeleton";
import DashSection from "./DashSection";
import { capitalize } from "./helpers";
import type { AppRow, SitterInfo } from "./types";

interface ApplicationsSectionProps {
  recentApps: AppRow[];
  sitterProfiles: Record<string, SitterInfo>;
  sitterBadges: Record<string, { badge_key: string; count: number }[]>;
  loading?: boolean;
}

const AppCardSkeleton = () => (
  <div className="bg-card border border-border rounded-2xl p-4 flex gap-4" aria-hidden="true">
    <Skeleton className="w-12 h-12 rounded-full shrink-0" />
    <div className="flex-1 min-w-0 space-y-2">
      <Skeleton className="h-4 w-32" />
      <Skeleton className="h-3 w-48" />
      <Skeleton className="h-3 w-20" />
      <div className="flex gap-2 mt-3">
        <Skeleton className="h-7 w-24 rounded-xl" />
        <Skeleton className="h-7 w-28 rounded-xl" />
      </div>
    </div>
  </div>
);


const AppCard = memo(({ app, sitterProfiles }: { app: AppRow; sitterProfiles: Record<string, SitterInfo> }) => {
  const navigate = useNavigate();
  const sitter = (app.sitter?.id && sitterProfiles[app.sitter.id]) || app.sitter;
  const sitTitle = app.sit?.title || "";
  const dateRange = [
    app.sit?.start_date ? format(new Date(app.sit.start_date), "d MMM", { locale: fr }) : "",
    app.sit?.end_date ? format(new Date(app.sit.end_date), "d MMM", { locale: fr }) : "",
  ].filter(Boolean).join(" → ");

  const sitLink = app.sit_id ? `/sits/${app.sit_id}#candidatures` : null;

  return (
    <div className="bg-card border border-border rounded-2xl p-4 flex gap-4">
      <div className="w-12 h-12 rounded-full bg-primary/15 text-primary font-bold flex items-center justify-center text-lg font-sans shrink-0 overflow-hidden">
        {sitter?.avatar_url ? (
          <img src={sitter.avatar_url} alt={`Photo de ${sitter.first_name || 'gardien'}`} className="w-full h-full rounded-full object-cover" />
        ) : (
          sitter?.first_name?.charAt(0)?.toUpperCase() || "?"
        )}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-foreground">{capitalize(sitter?.first_name)}</p>
        {sitLink ? (
          <Link
            to={sitLink}
            className="block text-xs text-muted-foreground font-sans mt-0.5 truncate hover:text-primary hover:underline"
            title="Voir la candidature dans l'annonce"
          >
            {sitTitle}{dateRange ? ` · ${dateRange}` : ""}
          </Link>
        ) : (
          <p className="text-xs text-muted-foreground font-sans mt-0.5 truncate">
            {sitTitle}{dateRange ? ` · ${dateRange}` : ""}
          </p>
        )}
        <div className="flex items-center gap-2 mt-1.5 flex-wrap">
          {sitter?.avgNote ? (
            <span className="text-xs font-sans text-primary font-medium">★ {sitter.avgNote}</span>
          ) : (
            <span className="text-xs font-sans text-muted-foreground italic">Nouveau</span>
          )}
        </div>
        <div className="flex gap-2 mt-3 flex-wrap">
          {sitter?.id ? (
            <button
              onClick={() => navigate(`/gardiens/${sitter.id}`)}
              className="border border-border text-muted-foreground rounded-xl px-3 py-1.5 text-xs font-sans hover:bg-accent transition-colors"
            >
              Voir le profil
            </button>
          ) : null}
          {sitLink ? (
            <Link
              to={sitLink}
              className="border border-border text-muted-foreground rounded-xl px-3 py-1.5 text-xs font-sans hover:bg-accent transition-colors"
            >
              Voir dans l'annonce
            </Link>
          ) : null}
          <button
            onClick={() => navigate("/messages")}
            className="bg-primary text-primary-foreground rounded-xl px-4 py-1.5 text-xs font-sans font-medium hover:bg-primary/90 transition-colors"
          >
            Répondre
          </button>
        </div>
      </div>
    </div>
  );
});
AppCard.displayName = "AppCard";

const ApplicationsSection = memo(({ recentApps, sitterProfiles, sitterBadges, loading = false }: ApplicationsSectionProps) => {
  const unread = recentApps.filter(a => a.status === "pending" || a.status === "discussing");
  const read = recentApps.filter(a => a.status !== "pending" && a.status !== "discussing");

  return (
    <DashSection title="Candidatures reçues non lues" action={
      !loading && recentApps.length > 0 ? <Link to="/sits" className="text-xs text-primary hover:underline font-medium">Voir toutes</Link> : undefined
    }>
      {loading ? (
        <div className="space-y-3" role="status" aria-busy="true" aria-label="Chargement des candidatures reçues">
          <AppCardSkeleton />
          <AppCardSkeleton />
          <span className="sr-only">Chargement des candidatures reçues…</span>
        </div>
      ) : unread.length === 0 ? (
        <p className="text-sm text-muted-foreground font-sans italic py-4 text-center">Aucune candidature reçue en attente</p>
      ) : (
        <div className="space-y-3">
          {unread.map(a => <AppCard key={a.id} app={a} sitterProfiles={sitterProfiles} />)}
        </div>
      )}
      {loading ? (
        <div className="mt-4 border rounded-xl px-4 py-3 opacity-60 cursor-not-allowed" aria-disabled="true">
          <Skeleton className="h-4 w-56" />
        </div>
      ) : read.length > 0 && (
        <Accordion type="single" collapsible className="mt-4">
          <AccordionItem value="read" className="border rounded-xl">
            <AccordionTrigger className="px-4 py-3 text-sm text-muted-foreground hover:no-underline">
              Candidatures reçues déjà consultées ({read.length})
            </AccordionTrigger>
            <AccordionContent className="px-4 pb-4">
              <div className="space-y-3">
                {read.map(a => <AppCard key={a.id} app={a} sitterProfiles={sitterProfiles} />)}
              </div>
            </AccordionContent>
          </AccordionItem>
        </Accordion>
      )}
    </DashSection>
  );
});

ApplicationsSection.displayName = "ApplicationsSection";
export default ApplicationsSection;
