import { Link } from "react-router-dom";
import { Eye, Pencil } from "lucide-react";
import FounderBadge from "@/components/badges/FounderBadge";
import PriorityActionCard from "@/components/dashboard/shared/PriorityActionCard";
import { useSitterPriorityAction } from "@/hooks/useSitterPriorityAction";
import { trackEvent } from "@/lib/analytics";

/**
 * Cockpit gardien — version sobre.
 * Header minimal (avatar + Bonjour + toggle dispo) + 1 PriorityActionCard.
 * Plus de gradient, plus d'eyebrow, plus de LiveSignalStrip.
 */

const capitalize = (name: string) =>
  name ? name.charAt(0).toUpperCase() + name.slice(1).toLowerCase() : "";

interface SitterCockpitProps {
  userId?: string;
  firstName?: string;
  avatarUrl?: string | null;
  isFounder?: boolean;
  isAvailable: boolean;
  onToggleAvailability: () => void;
  nextGuard: any | null;
  profileCompletion: number;
  postalCode: string | null;
  nearbyListings: any[];
  competencesCount?: number;
  interestsCount?: number;
}

const SitterCockpit = ({
  userId, firstName, avatarUrl, isFounder,
  isAvailable, onToggleAvailability,
  nextGuard, profileCompletion, postalCode, nearbyListings, competencesCount, interestsCount,
}: SitterCockpitProps) => {
  const initial = firstName ? capitalize(firstName).charAt(0) : "?";
  const priority = useSitterPriorityAction({
    nextGuard, profileCompletion, postalCode, nearbyListings, isAvailable, competencesCount, interestsCount,
  });

  const handlePriorityCta = () => {
    if (priority.ctaTo === "#sitter-availability-toggle") {
      const el = document.getElementById("sitter-availability-toggle");
      el?.scrollIntoView({ behavior: "smooth", block: "center" });
      (el as HTMLElement | null)?.focus?.();
    }
  };

  return (
    <section
      aria-label="Espace gardien, synthèse"
      className="px-4 sm:px-5 md:px-8 pt-4 sm:pt-6 pb-2 space-y-4"
    >
      {/* Header minimal */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-3 min-w-0 flex-1">
          <Link
            to="/profile"
            aria-label="Modifier mon profil"
            className="shrink-0 w-11 h-11 rounded-full overflow-hidden bg-muted flex items-center justify-center ring-offset-background focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
          >
            {avatarUrl ? (
              <img src={avatarUrl} alt="" className="w-full h-full object-cover" loading="lazy" />
            ) : (
              <span className="font-heading font-bold text-base text-foreground/70">{initial}</span>
            )}
          </Link>
          <div className="min-w-0 flex items-center gap-2 flex-wrap">
            <h1 className="text-xl sm:text-2xl font-heading font-bold text-foreground leading-tight truncate">
              Bonjour{firstName ? `, ${capitalize(firstName)}` : ""}
            </h1>
            {isFounder && <FounderBadge size="sm" />}
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <Link
            to="/profile"
            aria-label="Modifier mon profil"
            className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-card hover:bg-muted/40 text-foreground text-xs font-medium px-2.5 py-1.5 transition-colors"
          >
            <Pencil className="w-3.5 h-3.5" aria-hidden="true" />
            <span className="hidden sm:inline">Modifier</span>
          </Link>
          {userId && (
            <Link
              to={`/gardiens/${userId}`}
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Voir votre profil public (nouvel onglet)"
              className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-card hover:bg-muted/40 text-foreground text-xs font-medium px-2.5 py-1.5 transition-colors"
            >
              <Eye className="w-3.5 h-3.5" aria-hidden="true" />
              <span className="hidden sm:inline">Profil public</span>
            </Link>
          )}
          <button
            id="sitter-availability-toggle"
            role="switch"
            aria-checked={isAvailable}
            aria-label={isAvailable ? "Vous êtes disponible, désactiver" : "Vous êtes indisponible, activer"}
            onClick={onToggleAvailability}
            className={`group inline-flex items-center gap-2 rounded-lg border px-2.5 py-1.5 text-xs font-medium transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 ${
              isAvailable
                ? "border-success/40 bg-success/10 text-success"
                : "border-border bg-card text-muted-foreground hover:bg-muted/40"
            }`}
          >
            <span className={`relative flex h-2 w-2 ${isAvailable ? "" : "opacity-40"}`} aria-hidden="true">
              {isAvailable && (
                <span className="absolute inline-flex h-full w-full rounded-full bg-success opacity-60 animate-ping" />
              )}
              <span className={`relative inline-flex h-2 w-2 rounded-full ${isAvailable ? "bg-success" : "bg-muted-foreground"}`} />
            </span>
            {isAvailable ? "Disponible" : "Indisponible"}
          </button>
        </div>
      </div>

      {/* Action prioritaire, seul élément emphatique du pli */}
      <PriorityActionCard
        eyebrow={priority.eyebrow}
        title={priority.title}
        description={priority.description}
        ctaLabel={priority.ctaLabel}
        ctaTo={priority.ctaTo}
        urgency={priority.urgency}
        onCtaClick={handlePriorityCta}
      />
    </section>
  );
};

export default SitterCockpit;
