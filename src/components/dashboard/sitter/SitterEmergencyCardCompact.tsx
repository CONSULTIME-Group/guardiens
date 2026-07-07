import { Link } from "react-router-dom";
import { ChevronRight, Lock } from "lucide-react";

/**
 * Version 1-ligne du SitterEmergencyCard pour le bas du dashboard.
 *
 * Trois états :
 *  - Profil d'urgence actif : rappel avec lien vers les réglages.
 *  - Éligible (≥ 5 gardes réalisées ET note moyenne ≥ 4,7/5) :
 *    invitation à activer le statut.
 *  - Non éligible : état verrouillé factuel, sans CTA d'activation,
 *    qui indique la condition restante à débloquer.
 */

/** Seuil de note minimale du statut Gardien d'urgence (règle produit unique). */
export const EMERGENCY_MIN_RATING = 4.7;
/** Seuil de gardes réalisées pour ouvrir l'éligibilité. */
export const EMERGENCY_MIN_COMPLETED = 5;

interface Props {
  hasEmergencyProfile: boolean;
  completedSits?: number;
  avgRating?: number;
  reviewsCount?: number;
}

const SitterEmergencyCardCompact = ({
  hasEmergencyProfile,
  completedSits = 0,
  avgRating = 0,
  reviewsCount = 0,
}: Props) => {
  if (hasEmergencyProfile) {
    return (
      <Link
        to="/settings#emergency"
        className="group flex items-center justify-between gap-3 px-4 py-3 rounded-xl bg-card ring-1 ring-border hover:ring-primary/30 transition-all"
      >
        <div className="min-w-0">
          <p className="text-sm font-medium text-foreground">
            Profil de gardien d'urgence actif
          </p>
          <p className="text-xs text-muted-foreground truncate">
            Vous êtes prévenu en cas de garde de dernière minute.
          </p>
        </div>
        <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0 transition-transform group-hover:translate-x-0.5" aria-hidden="true" />
      </Link>
    );
  }

  const meetsCompleted = completedSits >= EMERGENCY_MIN_COMPLETED;
  const meetsRating = reviewsCount > 0 && avgRating >= EMERGENCY_MIN_RATING;
  const isEligible = meetsCompleted && meetsRating;

  if (!isEligible) {
    // État verrouillé, factuel et encourageant. Pas de CTA d'activation actif.
    const remaining = Math.max(0, EMERGENCY_MIN_COMPLETED - completedSits);
    const conditionText = !meetsCompleted
      ? remaining === EMERGENCY_MIN_COMPLETED
        ? "Se débloque après 5 gardes réalisées."
        : `Se débloque après ${remaining} garde${remaining > 1 ? "s" : ""} de plus (5 au total).`
      : `Se débloque avec une note moyenne d'au moins ${EMERGENCY_MIN_RATING.toString().replace(".", ",")}/5.`;

    return (
      <div
        className="flex items-center justify-between gap-3 px-4 py-3 rounded-xl bg-muted/30 ring-1 ring-border"
        aria-disabled="true"
      >
        <div className="min-w-0">
          <p className="text-sm font-medium text-foreground flex items-center gap-1.5">
            <Lock className="h-3.5 w-3.5 text-muted-foreground shrink-0" aria-hidden="true" />
            Gardien d'urgence
          </p>
          <p className="text-xs text-muted-foreground truncate">
            {conditionText}
          </p>
        </div>
        <Link
          to="/gardien-urgence"
          className="text-xs text-muted-foreground hover:text-foreground underline underline-offset-2 shrink-0"
        >
          En savoir plus
        </Link>
      </div>
    );
  }

  return (
    <Link
      to="/gardien-urgence"
      className="group flex items-center justify-between gap-3 px-4 py-3 rounded-xl bg-muted/40 ring-1 ring-dashed ring-border hover:ring-primary/30 transition-all"
    >
      <div className="min-w-0">
        <p className="text-sm font-medium text-foreground">
          Devenez gardien d'urgence
        </p>
        <p className="text-xs text-muted-foreground truncate">
          Vous remplissez les conditions. Activez votre profil en une minute.
        </p>
      </div>
      <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0 transition-transform group-hover:translate-x-0.5" aria-hidden="true" />
    </Link>
  );
};

export default SitterEmergencyCardCompact;
