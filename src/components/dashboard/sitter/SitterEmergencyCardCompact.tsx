import { Link } from "react-router-dom";
import { ChevronRight } from "lucide-react";

/**
 * Version 1-ligne du SitterEmergencyCard pour le bas du dashboard.
 *
 * L'ancienne carte occupait ~200px pour une fonction conditionnelle.
 * Cette version condense l'info en 1 ligne discrète, avec lien direct.
 * Le composant complet `SitterEmergencyCard` reste disponible pour la page
 * dédiée (paramètres / profil d'urgence) si besoin.
 */

interface Props {
  hasEmergencyProfile: boolean;
}

const SitterEmergencyCardCompact = ({ hasEmergencyProfile }: Props) => {
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

  return (
    <Link
      to="/settings#emergency"
      className="group flex items-center justify-between gap-3 px-4 py-3 rounded-xl bg-muted/40 ring-1 ring-dashed ring-border hover:ring-primary/30 transition-all"
    >
      <div className="min-w-0">
        <p className="text-sm font-medium text-foreground">
          Devenez gardien d'urgence
        </p>
        <p className="text-xs text-muted-foreground truncate">
          Soyez sollicité en priorité pour les gardes de dernière minute.
        </p>
      </div>
      <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0 transition-transform group-hover:translate-x-0.5" aria-hidden="true" />
    </Link>
  );
};

export default SitterEmergencyCardCompact;
