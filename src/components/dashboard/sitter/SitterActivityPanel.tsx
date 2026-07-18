import { Link } from "react-router-dom";
import { Calendar, MessageSquare, FileText, MapPin, UserCircle2 } from "lucide-react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

interface SitterActivityPanelProps {
  isAvailable: boolean;
  profileCompletion: number;
  nextGuard: any | null;
  unreadCount: number;
  pendingAppsCount: number;
  nearbyListings: any[];
  completedSits: number;
  /** Conservé pour compat (ancien aside) mais ignoré : rendu toujours en strip horizontal. */
  variant?: "aside" | "inline" | "strip";
}

/**
 * Bandeau « Mon activité » — KPI strip horizontale pleine largeur.
 * Posée juste sous le cockpit, elle remplace l'ancienne colonne 3/12 isolée
 * qui destructurait la page. 6 tuiles cliquables, responsive 2 → 3 → 6 cols.
 */
const SitterActivityPanel = ({
  isAvailable, profileCompletion, nextGuard, unreadCount, pendingAppsCount, nearbyListings, completedSits,
}: SitterActivityPanelProps) => {
  const nextGuardLabel = nextGuard
    ? `${format(new Date(nextGuard.start_date), "d MMM", { locale: fr })} → ${format(new Date(nextGuard.end_date), "d MMM", { locale: fr })}`
    : null;

  const nearbyCount = nearbyListings.filter((s) => !s.is_beyond).length;

  const tiles = [
    {
      to: "#sitter-availability-toggle",
      label: "Disponibilité",
      value: isAvailable ? "Active" : "Inactive",
      sub: null,
      Icon: () => (
        <span className="relative flex h-2.5 w-2.5" aria-hidden="true">
          {isAvailable && (
            <span className="absolute inline-flex h-full w-full rounded-full bg-success opacity-60 animate-ping" />
          )}
          <span className={`relative inline-flex h-2.5 w-2.5 rounded-full ${isAvailable ? "bg-success" : "bg-muted-foreground/40"}`} />
        </span>
      ),
      emphasis: isAvailable ? "text-success" : "text-muted-foreground",
    },
    {
      to: "/profile",
      label: "Profil",
      value: profileCompletion === 0 ? "À compléter" : `${profileCompletion}%`,
      sub: profileCompletion === 0 ? "Un profil complet rassure les propriétaires" : null,
      Icon: UserCircle2,
      emphasis: profileCompletion === 0 ? "text-accent font-heading" : profileCompletion < 60 ? "text-warning" : "text-foreground",
    },
    {
      to: nextGuard ? `/sits/${nextGuard.id}` : "/search",
      label: "Prochaine garde",
      value: nextGuardLabel ?? "À décrocher",
      sub: nextGuardLabel ? null : "Postulez à une annonce proche",
      Icon: Calendar,
      emphasis: nextGuardLabel ? "text-foreground" : "text-accent font-heading",
    },
    {
      to: "/messages",
      label: "Messages",
      value: unreadCount === 0 ? "À lire" : String(unreadCount),
      sub: unreadCount === 0 ? "Vos conversations apparaissent ici" : null,
      Icon: MessageSquare,
      emphasis: unreadCount > 0 ? "text-primary" : "text-accent font-heading",
    },
    {
      to: "/my-applications",
      label: "Candidatures",
      value: pendingAppsCount === 0 ? "À envoyer" : String(pendingAppsCount),
      sub: pendingAppsCount === 0 ? "Postulez à une mission proche" : null,
      Icon: FileText,
      emphasis: pendingAppsCount > 0 ? "text-primary" : "text-accent font-heading",
    },
    {
      to: "#discovery-annonces-heading",
      label: "Annonces autour",
      value: nearbyCount === 0 ? "À explorer" : String(nearbyCount),
      sub: nearbyCount === 0 ? "Élargissez votre rayon de recherche" : null,
      Icon: MapPin,
      emphasis: nearbyCount > 0 ? "text-foreground" : "text-accent font-heading",
    },
  ];

  return (
    <div
      role="region"
      aria-label="Mon activité"
      className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 rounded-2xl border border-border bg-card overflow-hidden divide-x divide-y sm:divide-y-0 divide-border"
    >
      {tiles.map((t, i) => {
        const isAnchor = t.to.startsWith("#");
        const Wrapper: any = isAnchor ? "a" : Link;
        const props: any = isAnchor ? { href: t.to } : { to: t.to };
        const Icon = t.Icon;
        const isInvitation = Boolean(t.sub);
        return (
          <Wrapper
            key={i}
            {...props}
            className="group flex items-start gap-2.5 px-3 py-3 sm:px-4 sm:py-3.5 hover:bg-muted/30 transition-colors min-w-0"
          >
            <div className="mt-0.5 shrink-0 text-muted-foreground group-hover:text-foreground transition-colors">
              <Icon className="h-4 w-4" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-[11px] uppercase tracking-wide text-muted-foreground font-medium leading-none">
                {t.label}
              </p>
              <p className={`mt-1 text-sm font-semibold truncate ${isInvitation ? "" : "tabular-nums"} ${t.emphasis}`}>
                {t.value}
              </p>
              {isInvitation && (
                <p className="mt-0.5 text-[10px] leading-tight text-accent truncate">
                  {t.sub}
                </p>
              )}
            </div>
          </Wrapper>
        );
      })}
    </div>
  );
};

export default SitterActivityPanel;
