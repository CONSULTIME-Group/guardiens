import { Link } from "react-router-dom";
import { Eye } from "lucide-react";
import FounderBadge from "@/components/badges/FounderBadge";
import PriorityActionCard from "@/components/dashboard/shared/PriorityActionCard";
import LiveSignalStrip from "@/components/dashboard/shared/LiveSignalStrip";
import { useSitterPriorityAction } from "@/hooks/useSitterPriorityAction";

/**
 * Cockpit gardien, bloc unifié au-dessus du pli.
 *
 * Remplace l'empilement Hero + Checklist + FreePeriodBanner + NextGuard +
 * StatusBar (~900px) par 3 zones denses :
 *   1. Greeting condensé (avatar + nom + dispo toggle en 1 ligne)
 *   2. PriorityActionCard (UN seul CTA contextuel basé sur la règle de priorité)
 *   3. LiveSignalStrip (preuve sociale temps réel, pas de CTA)
 *
 * Pourquoi : un dashboard répond à 3 questions, Où en suis-je ? Que faire
 * maintenant ? Que se passe-t-il autour ? Pas 5 KPIs en strip horizontal.
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
  // Données pour la règle de priorité
  nextGuard: any | null;
  profileCompletion: number;
  postalCode: string | null;
  nearbyListings: any[];
  competencesCount?: number;
}

const SitterCockpit = ({
  userId, firstName, avatarUrl, isFounder,
  isAvailable, onToggleAvailability,
  nextGuard, profileCompletion, postalCode, nearbyListings, competencesCount,
}: SitterCockpitProps) => {
  const initial = firstName ? capitalize(firstName).charAt(0) : "?";
  const priority = useSitterPriorityAction({
    nextGuard, profileCompletion, postalCode, nearbyListings, isAvailable, competencesCount,
  });

  // Pour les CTA d'ancre vers le toggle dispo, scroll smooth + focus.
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
      className="px-4 sm:px-5 md:px-8 pt-3 sm:pt-4 md:pt-5 pb-1"
    >
      {/* ─── Tuile héro éditoriale ─── */}
      <div className="relative overflow-hidden rounded-3xl border border-border bg-gradient-to-br from-accent/60 via-card to-accent/30 shadow-sm">
        <div className="relative grid gap-0">
          {/* Colonne gauche, contenu */}
          <div className="p-5 sm:p-6 md:p-7 space-y-4">
            {/* Ligne 1 : eyebrow + avatar + nom + dispo */}
            <div className="flex items-start justify-between gap-3 flex-wrap">
              <div className="flex items-center gap-3 min-w-0 flex-1">
                <div className="shrink-0 w-12 h-12 rounded-full overflow-hidden ring-2 ring-card shadow-sm bg-muted flex items-center justify-center">
                  {avatarUrl ? (
                    <img src={avatarUrl} alt="Votre photo de profil" className="w-full h-full object-cover" loading="lazy" />
                  ) : (
                    <span className="font-heading font-bold text-lg text-foreground/70">{initial}</span>
                  )}
                </div>
                <div className="min-w-0">
                  <p className="text-[10px] uppercase tracking-[2px] text-primary font-sans font-semibold leading-tight">
                    Espace gardien
                  </p>
                  <div className="flex items-center gap-2 flex-wrap">
                    <h1 className="text-xl sm:text-2xl font-heading font-bold text-foreground leading-tight truncate">
                      Bonjour{firstName ? `, ${capitalize(firstName)}` : ""}
                    </h1>
                    {isFounder && <FounderBadge size="sm" />}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                {userId && (
                  <Link
                    to={`/gardiens/${userId}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label="Voir votre profil public (nouvel onglet)"
                    className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-card/80 backdrop-blur-sm hover:bg-card text-foreground text-xs font-sans font-medium px-2.5 py-1.5 transition-colors"
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
                      : "border-border bg-card/80 backdrop-blur-sm text-muted-foreground hover:bg-card"
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

            {/* Action prioritaire, un seul CTA dominant */}
            <PriorityActionCard
              eyebrow={priority.eyebrow}
              title={priority.title}
              description={priority.description}
              ctaLabel={priority.ctaLabel}
              ctaTo={priority.ctaTo}
              urgency={priority.urgency}
              onCtaClick={handlePriorityCta}
            />
          </div>
        </div>

        {/* Signal vivant en pied de tuile, fond légèrement teinté */}
        <div className="relative border-t border-border/60 bg-card/70 backdrop-blur-sm px-5 sm:px-6 md:px-7 py-2.5">
          <LiveSignalStrip />
        </div>
      </div>
    </section>
  );
};

export default SitterCockpit;
