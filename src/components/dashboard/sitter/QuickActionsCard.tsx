import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { MessageSquare, Search, ArrowRight } from "lucide-react";

interface QuickActionsCardProps {
  pendingAppsCount: number;
  unreadCount: number;
  isAvailable: boolean;
  onToggleAvailability: () => void;
}

/**
 * Carte d'actions rapides, placée en tête de l'aside ≥ xl.
 * V4 : on retire « Mes candidatures » (doublon avec la cloche topbar + onglet /sits).
 * On retire « Mode disponible » (doublon avec le toggle du Cockpit).
 * Reste : Messages + Découvrir les gardes.
 */
const QuickActionsCard = ({
  unreadCount,
}: QuickActionsCardProps) => (
  <div className="bg-card border border-border rounded-2xl p-4 sm:p-5">
    <p className="text-xs uppercase tracking-widest text-muted-foreground font-sans mb-3">
      Actions rapides
    </p>

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

    {/* CTA secondaire, le CTA primaire de la page est porté par le Cockpit. */}
    <Button asChild variant="ghost" className="w-full mt-4 text-foreground/80 hover:text-primary" size="sm">
      <Link to="/search" className="gap-2">
        <Search className="h-4 w-4" aria-hidden="true" />
        Découvrir les gardes
      </Link>
    </Button>
  </div>
);

export default QuickActionsCard;
