/**
 * Carte contextuelle au-dessus de chaque conversation.
 * Affichée après ConversationHeader. Affiche un rappel visuel + CTA selon contexte :
 *  - sit_application : récap annonce + bouton "Voir l'annonce"
 *  - sitter_inquiry  : badge "Demande de disponibilité" + CTA proprio "Créer mon annonce"
 *  - mission_help    : carte mission compacte (déjà gérée dans ConversationHeader)
 *  - owner_pitch     : alerte "Contact spontané"
 */

import { Link } from "react-router-dom";
import { Calendar, MapPin, Sparkles, AlertCircle, Compass, Plus } from "lucide-react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { Button } from "@/components/ui/button";

interface Props {
  contextType: string | null;
  isOwner: boolean; // viewer is the owner side of the conversation
  sit?: {
    id?: string;
    title?: string | null;
    start_date?: string | null;
    end_date?: string | null;
    status?: string;
  } | null;
  otherFirstName?: string | null;
  otherCity?: string | null;
}

const fmt = (d?: string | null) => {
  if (!d) return null;
  try { return format(new Date(d), "d MMM", { locale: fr }); } catch { return null; }
};

const ContextHeaderCard = ({ contextType, isOwner, sit, otherFirstName, otherCity }: Props) => {
  if (!contextType) return null;

  // sit_application → la carte annonce est déjà gérée par ConversationHeader
  if (contextType === "sit_application") return null;

  // mission_help → géré par les bannières mission existantes
  if (contextType === "mission_help") return null;

  if (contextType === "sitter_inquiry" || contextType === "helper_inquiry") {
    const isHelper = contextType === "helper_inquiry";
    return (
      <div className="px-4 py-3 bg-blue-50 dark:bg-blue-950/30 border-t border-blue-200 dark:border-blue-900/50">
        <div className="flex items-start gap-2">
          <Compass className="h-4 w-4 text-blue-700 dark:text-blue-300 shrink-0 mt-0.5" />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-blue-900 dark:text-blue-100">
              {isHelper ? "Demande d'entraide spontanée" : "Demande de disponibilité"}
            </p>
            <p className="text-xs text-blue-800/80 dark:text-blue-200/80 mt-0.5">
              {isHelper
                ? (isOwner
                    ? `Vous sondez ${otherFirstName || "ce membre"} pour un futur coup de main.`
                    : `${otherFirstName || "Une personne du coin"} vous sonde pour un futur coup de main.`)
                : (isOwner
                    ? `Vous avez sondé ${otherFirstName || "ce gardien"} avant de publier une annonce.`
                    : `${otherFirstName || "Ce propriétaire"} vous sonde avant de publier une annonce.`)}
            </p>
            {isOwner && !isHelper && (
              <Link to="/sits/create" className="inline-block mt-2">
                <Button size="sm" variant="outline" className="gap-1.5 h-8 border-blue-300 text-blue-700 hover:bg-blue-100 dark:border-blue-700 dark:text-blue-200 dark:hover:bg-blue-900/40">
                  <Plus className="h-3.5 w-3.5" /> Créer mon annonce
                </Button>
              </Link>
            )}
            {isOwner && isHelper && (
              <Link to="/petites-missions/creer" className="inline-block mt-2">
                <Button size="sm" variant="outline" className="gap-1.5 h-8 border-blue-300 text-blue-700 hover:bg-blue-100 dark:border-blue-700 dark:text-blue-200 dark:hover:bg-blue-900/40">
                  <Plus className="h-3.5 w-3.5" /> Créer une mission
                </Button>
              </Link>
            )}
          </div>
        </div>
      </div>
    );
  }

  if (contextType === "owner_pitch") {
    return (
      <div className="px-4 py-3 bg-amber-50 dark:bg-amber-950/30 border-t border-amber-200 dark:border-amber-900/50">
        <div className="flex items-start gap-2">
          <Sparkles className="h-4 w-4 text-amber-700 dark:text-amber-300 shrink-0 mt-0.5" />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-amber-900 dark:text-amber-100">
              Contact spontané
            </p>
            <p className="text-xs text-amber-800/80 dark:text-amber-200/80 mt-0.5">
              {isOwner
                ? `${otherFirstName || "Un gardien"} vous propose ses services. Aucune annonce de votre part n'est en cours.`
                : `Vous proposez vos services à ${otherFirstName || "ce propriétaire"} sans annonce active. Soyez clair et bref.`}
            </p>
          </div>
        </div>
      </div>
    );
  }

  return null;
};

export default ContextHeaderCard;
