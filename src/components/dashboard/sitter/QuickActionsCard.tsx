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
 * Carte d'actions rapides — placée en tête de l'aside ≥ xl.
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

    {/* Toggle dispo */}
    <div className="flex items-center justify-between py-2 border-b border-border">
      <div>
        <p className="text-sm font-medium text-foreground">Mode disponible</p>
        <p className="text-xs text-muted-foreground">
          {isAvailable ? "Visible auprès des proprios" : "Vous n'apparaissez pas"}
        </p>
      </div>
      <button
        role="switch"
        aria-checked={isAvailable}
        aria-label="Basculer la disponibilité"
        onClick={onToggleAvailability}
        className={`relative w-11 h-6 rounded-full transition-colors duration-200 ${isAvailable ? "bg-toggle-active" : "bg-muted"}`}
      >
        <span className={`absolute top-0.5 w-5 h-5 bg-background rounded-full shadow transition-all duration-200 ${isAvailable ? "left-5" : "left-0.5"}`} />
      </button>
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

    {/* CTA principal */}
    <Button asChild className="w-full mt-4" size="sm">
      <Link to="/search" className="gap-2">
        <Search className="h-4 w-4" aria-hidden="true" />
        Découvrir les gardes
      </Link>
    </Button>
  </div>
);

export default QuickActionsCard;
