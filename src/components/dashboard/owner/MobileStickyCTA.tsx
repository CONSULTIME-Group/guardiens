import { memo } from "react";
import { useNavigate } from "react-router-dom";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";

interface MobileStickyCTAProps {
  /** Libellé personnalisé selon contexte (ex: "Voir les candidatures") */
  label?: string;
  /** Route cible (par défaut création d'annonce) */
  to?: string;
  /** Compteur optionnel (ex: nombre de candidatures en attente) */
  badge?: number;
}

/**
 * CTA sticky bas d'écran pour mobile uniquement.
 * Améliore l'ergonomie tactile en gardant l'action principale toujours accessible
 * sans scroll. Caché en md+ (le bouton du hero header prend le relais).
 */
const MobileStickyCTA = memo((_props: MobileStickyCTAProps) => {
  // Désactivé depuis la refonte "Signature Dock" : le FAB central de la BottomNav
  // assure désormais l'action "Publier une annonce" en 1 tap. Évite la double-barre.
  return null;
});


MobileStickyCTA.displayName = "MobileStickyCTA";
export default MobileStickyCTA;
