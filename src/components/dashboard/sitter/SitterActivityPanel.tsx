import { Link } from "react-router-dom";
import { Calendar, MessageSquare, FileText, MapPin } from "lucide-react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

interface SitterActivityPanelProps {
  isAvailable: boolean;
  profileCompletion: number;
  nextGuard: any | null;
  unreadCount: number;
  pendingAppsCount: number;
  nearbyListings: any[];
  variant?: "aside" | "inline";
}

/**
 * Panneau « Mon activité » — synthèse opérationnelle du gardien.
 * Variantes :
 *  - aside  : sticky 3/12 desktop, dense, avec mini TOC
 *  - inline : pleine largeur, juste sous le cockpit sur mobile
 */
const SitterActivityPanel = ({
  isAvailable, profileCompletion, nextGuard, unreadCount, pendingAppsCount, nearbyListings,
  variant = "aside",
}: SitterActivityPanelProps) => {
  const isAside = variant === "aside";

  return (
    <div
      className={
        isAside
          ? "sticky top-24 rounded-2xl border border-border bg-card divide-y divide-border overflow-hidden"
          : "rounded-2xl border border-border bg-card divide-y divide-border overflow-hidden"
      }
    >
      {/* Statut disponibilité */}
      <div className="px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2 min-w-0">
          <span className={`relative flex h-2 w-2 shrink-0`} aria-hidden="true">
            {isAvailable && (
              <span className="absolute inline-flex h-full w-full rounded-full bg-success opacity-60 animate-ping" />
            )}
            <span className={`relative inline-flex h-2 w-2 rounded-full ${isAvailable ? "bg-success" : "bg-muted-foreground/40"}`} />
          </span>
          <span className="text-sm font-medium text-foreground truncate">
            {isAvailable ? "Disponible aux gardes" : "Indisponible"}
          </span>
        </div>
        <Link to="/profile" className="text-xs text-primary hover:underline shrink-0">Modifier</Link>
      </div>

      {/* Profil */}
      <div className="px-4 py-3">
        <div className="flex items-center justify-between mb-1.5">
          <span className="text-xs text-muted-foreground">Profil</span>
          <span className="text-xs font-semibold text-foreground tabular-nums">{profileCompletion}%</span>
        </div>
        <div className="h-1.5 bg-muted rounded-full overflow-hidden">
          <div className="h-full bg-primary rounded-full transition-all" style={{ width: `${profileCompletion}%` }} />
        </div>
      </div>

      {/* Prochaine garde */}
      <Link
        to={nextGuard ? `/sits/${nextGuard.id}` : "/search"}
        className="px-4 py-3 flex items-start gap-3 hover:bg-muted/30 transition-colors"
      >
        <Calendar className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" aria-hidden="true" />
        <div className="min-w-0 flex-1">
          <p className="text-xs text-muted-foreground">Prochaine garde</p>
          {nextGuard ? (
            <p className="text-sm font-medium text-foreground truncate">
              {format(new Date(nextGuard.start_date), "d MMM", { locale: fr })}
              {" → "}
              {format(new Date(nextGuard.end_date), "d MMM", { locale: fr })}
            </p>
          ) : (
            <p className="text-sm text-foreground/70">Première garde à venir</p>
          )}
        </div>
      </Link>

      {/* Messages */}
      <Link to="/messages" className="px-4 py-3 flex items-center justify-between hover:bg-muted/30 transition-colors">
        <div className="flex items-center gap-3 min-w-0">
          <MessageSquare className="h-4 w-4 text-muted-foreground shrink-0" aria-hidden="true" />
          <span className="text-sm text-foreground">Messages</span>
        </div>
        <span className={`text-sm font-semibold tabular-nums ${unreadCount > 0 ? "text-primary" : "text-muted-foreground"}`}>
          {unreadCount}
        </span>
      </Link>

      {/* Candidatures en attente */}
      <Link to="/my-applications" className="px-4 py-3 flex items-center justify-between hover:bg-muted/30 transition-colors">
        <div className="flex items-center gap-3 min-w-0">
          <FileText className="h-4 w-4 text-muted-foreground shrink-0" aria-hidden="true" />
          <span className="text-sm text-foreground">Candidatures</span>
        </div>
        <span className={`text-sm font-semibold tabular-nums ${pendingAppsCount > 0 ? "text-primary" : "text-muted-foreground"}`}>
          {pendingAppsCount}
        </span>
      </Link>

      {/* Annonces autour */}
      <a href="#discovery-annonces-heading" className="px-4 py-3 flex items-center justify-between hover:bg-muted/30 transition-colors">
        <div className="flex items-center gap-3 min-w-0">
          <MapPin className="h-4 w-4 text-muted-foreground shrink-0" aria-hidden="true" />
          <span className="text-sm text-foreground">Annonces près de chez vous</span>
        </div>
        <span className="text-sm font-semibold tabular-nums text-muted-foreground">{nearbyListings.length}</span>
      </a>
    </div>
  );
};

export default SitterActivityPanel;
