import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { FileText, MessageSquare, Search, ArrowRight } from "lucide-react";

interface QuickActionsCardProps {
  pendingAppsCount: number;
  unreadCount: number;
  isAvailable: boolean;
  onToggleAvailability: () => void;
}

/**
 * Carte d'actions rapides, placée en tête de l'aside ≥ xl.
 * Centralise : disponibilité + raccourcis candidatures/messages + CTA explorer.
 * Remplace l'aside décorative ; donne une vraie utilité actionnable.
 */
const QuickActionsCard = ({
  pendingAppsCount,
  unreadCount,
  isAvailable,
  onToggleAvailability,
}: QuickActionsCardProps) => (
  <div className="bg-card border border-border rounded-2xl p-4 sm:p-5 mb-6">
    <p className="text-xs uppercase tracking-widest text-muted-foreground font-sans mb-3">
      Actions rapides
    </p>

    {/* Indicateur de statut (lecture seule). Le toggle réel reste dans le Hero
       , source de vérité unique pour éviter les états divergents. */}
    <div className="flex items-center justify-between py-2 border-b border-border">
      <div>
        <p className="text-sm font-medium text-foreground">Mode disponible</p>
        <p className="text-xs text-muted-foreground">
          {isAvailable ? "Visible auprès des propriétaires" : "Vous n'apparaissez pas dans les résultats"}
        </p>
      </div>
      <span
        className={`inline-flex items-center gap-1.5 text-xs font-medium rounded-full px-2.5 py-1 ${
          isAvailable
            ? "bg-success/15 text-success border border-success/30"
            : "bg-muted text-muted-foreground border border-border"
        }`}
        aria-live="polite"
      >
        <span className={`w-1.5 h-1.5 rounded-full ${isAvailable ? "bg-success" : "bg-muted-foreground/50"}`} />
        {isAvailable ? "Actif" : "Inactif"}
      </span>
    </div>

    {/* Candidatures */}
    <Link
      to="/sits"
      className="group flex items-center justify-between py-3 border-b border-border hover:bg-muted/40 -mx-2 px-2 rounded-lg transition-all"
    >
      <div className="flex items-center gap-2">
        <FileText className="h-4 w-4 text-primary" aria-hidden="true" />
        <span className="text-sm text-foreground">Mes candidatures</span>
      </div>
      {pendingAppsCount > 0 ? (
        <span className="text-xs bg-primary text-primary-foreground rounded-full px-2 py-0.5 tabular-nums">
          {pendingAppsCount}
        </span>
      ) : (
        <ArrowRight className="h-3.5 w-3.5 text-muted-foreground group-hover:translate-x-0.5 transition-transform" aria-hidden="true" />
      )}
    </Link>

    {/* Messages */}
    <Link
      to="/messages"
      className="group flex items-center justify-between py-3 border-b border-border hover:bg-muted/40 -mx-2 px-2 rounded-lg transition-all"
    >
      <div className="flex items-center gap-2">
        <MessageSquare className="h-4 w-4 text-primary" aria-hidden="true" />
        <span className="text-sm text-foreground">Messages</span>
      </div>
      {unreadCount > 0 ? (
        <span className="text-xs bg-primary text-primary-foreground rounded-full px-2 py-0.5 tabular-nums">
          {unreadCount > 99 ? "99+" : unreadCount}
        </span>
      ) : (
        <ArrowRight className="h-3.5 w-3.5 text-muted-foreground group-hover:translate-x-0.5 transition-transform" aria-hidden="true" />
      )}
    </Link>

    {/* CTA secondaire, le CTA primaire de la page est porté par le Cockpit (PriorityActionCard).
        On reste en ghost pour ne pas concurrencer. */}
    <Button asChild variant="ghost" className="w-full mt-4 text-foreground/80 hover:text-primary" size="sm">
      <Link to="/search" className="gap-2">
        <Search className="h-4 w-4" aria-hidden="true" />
        Découvrir les gardes
      </Link>
    </Button>
  </div>
);

export default QuickActionsCard;
