import { BellRing, Sparkles, Globe2, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";

/**
 * Bandeau de découverte sitter, affiché EN HAUT de la liste de résultats
 * quand l'offre nationale est encore restreinte (phase de lancement) OU
 * quand un fort écart existe entre la zone locale et la France entière.
 *
 * 3 passes UX 2026 combinées :
 *  1. Rassurance contextuelle (phase de lancement) → ancre la rareté avant
 *     que l'utilisateur ne déçoive seul.
 *  2. Action utile (créer alerte + activer disponibilité) → transforme la
 *     déception en levier d'engagement.
 *  3. Auto-expansion douce (chip « voir aussi ailleurs en France ») → propose
 *     d'élargir SANS forcer le changement de filtre.
 */
interface SitterDiscoveryBannerProps {
  totalFrance: number;
  totalRadius: number;
  zoneMode: "radius" | "dept" | "region" | "france";
  city: string;
  alertCreated: boolean;
  isCreatingAlert: boolean;
  onCreateAlert: () => void;
  isAvailable: boolean;
  onActivateAvailable: () => void;
  onExpandToFrance: () => void;
}

const LOW_STOCK_THRESHOLD = 5;

export const SitterDiscoveryBanner = ({
  totalFrance,
  totalRadius,
  zoneMode,
  city,
  alertCreated,
  isCreatingAlert,
  onCreateAlert,
  isAvailable,
  onActivateAvailable,
  onExpandToFrance,
}: SitterDiscoveryBannerProps) => {
  const isLowStock = totalFrance < LOW_STOCK_THRESHOLD;
  const alertScopeLabel = zoneMode === "france" ? "en France" : city ? `sur ${city}` : "près de chez vous";
  const showExpansion =
    zoneMode === "radius" && totalFrance > totalRadius && totalFrance - totalRadius >= 2;

  // Aucun signal à montrer : on ne pollue pas l'UI.
  if (!isLowStock && !showExpansion) return null;

  return (
    <div className="rounded-2xl border border-primary/20 bg-primary/5 p-4 sm:p-5 mb-5 sm:mb-6">
      <div className="flex flex-col sm:flex-row sm:items-start gap-3 sm:gap-4">
        <div className="flex-1 min-w-0 space-y-1.5">
          {isLowStock ? (
            <>
              <div className="flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-primary shrink-0" />
                <p className="font-heading font-semibold text-sm text-foreground">
                  Vous découvrez Guardiens à ses débuts
                </p>
              </div>
              <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
                {totalFrance > 0 ? (
                  <>
                    <span className="font-medium text-foreground">{totalFrance}</span> annonce{totalFrance > 1 ? "s" : ""} publiée{totalFrance > 1 ? "s" : ""} en ce moment en France. La communauté grandit chaque semaine, créez une alerte pour ne rien manquer {alertScopeLabel}.
                  </>
                ) : (
                  <>Aucune annonce active pour le moment. Soyez prévenu(e) en premier dès qu'une garde se publie {alertScopeLabel}.</>
                )}
              </p>
            </>
          ) : (
            <>
              <div className="flex items-center gap-2">
                <Globe2 className="h-4 w-4 text-primary shrink-0" />
                <p className="font-heading font-semibold text-sm text-foreground">
                  Plus d'annonces ailleurs en France
                </p>
              </div>
              <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
                <span className="font-medium text-foreground">{totalFrance - totalRadius}</span> autre{totalFrance - totalRadius > 1 ? "s annonces sont disponibles" : " annonce est disponible"} en dehors de votre rayon. Élargissez sans perdre vos filtres.
              </p>
            </>
          )}
        </div>

        <div className="flex flex-wrap gap-2 shrink-0">
          {showExpansion && (
            <Button
              size="sm"
              variant="outline"
              className="gap-1.5 h-9"
              onClick={onExpandToFrance}
            >
              <Globe2 className="h-3.5 w-3.5" />
              Voir toute la France ({totalFrance})
            </Button>
          )}
          {isLowStock && !alertCreated && (
            <Button
              size="sm"
              className="gap-1.5 h-9"
              disabled={isCreatingAlert}
              onClick={onCreateAlert}
            >
              {isCreatingAlert ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <BellRing className="h-3.5 w-3.5" />
              )}
              Créer mon alerte
            </Button>
          )}
          {isLowStock && !isAvailable && (
            <Button
              size="sm"
              variant="ghost"
              className="gap-1.5 h-9"
              onClick={onActivateAvailable}
            >
              <Sparkles className="h-3.5 w-3.5" />
              Devenir visible
            </Button>
          )}
        </div>
      </div>
    </div>
  );
};

export default SitterDiscoveryBanner;
