/**
 * Contenu partagé du popover d'explication d'affinité.
 * Utilisé par AffinityBadge (chip) ET AffinityRing (SitterMatchSection).
 * Source unique de vérité pour l'explicabilité IA du score.
 *
 * DOCTRINE : le popover dit la vérité, toujours en voix produit.
 *  - raisons positives : result.matched ;
 *  - freins déclarés : result.explanation (« A déclaré une allergie aux
 *    chats », « Ne déclare pas d'expérience avec vos animaux »…) ;
 *  - sujets à discuter : result.notes.
 * Jamais d'identifiant technique à l'écran.
 */
import { Link } from "react-router-dom";
import { Sparkles } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import type { AffinityResult } from "@/lib/affinityScore";
import { useAuth } from "@/contexts/AuthContext";

interface Props {
  result: AffinityResult;
  /**
   * Chiffre montré dans l'en-tête. Côté propriétaire : `result.sortScore`
   * (alignement chiffre/tri). Défaut : score brut (côté gardien).
   */
  displayScore?: number;
}

const AffinityDetailsPopoverContent = ({ result, displayScore }: Props) => {
  const { activeRole } = useAuth();
  const shown =
    typeof displayScore === "number" && Number.isFinite(displayScore)
      ? Math.round(displayScore)
      : result.score;
  const reliability: "complete" | "partial" | "neutral" =
    !result.scoreReliable || result.total <= 3
      ? "partial"
      : result.total >= 6
        ? "complete"
        : "neutral";
  const profilePath = activeRole === "owner" ? "/owner-profile" : "/profile";

  return (
    <>
      <p className="text-xs font-semibold mb-1.5 text-foreground">
        {result.scoreReliable
          ? `${shown}% de compatibilité${reliability === "partial" ? " (score partiel)" : ""}`
          : "Compatibilité en cours d'estimation"}
      </p>
      {result.matched.length > 0 ? (
        <ul className="space-y-0.5 mb-2">
          {result.matched.map((m) => (
            <li key={m} className="text-xs text-muted-foreground leading-snug">
              · {m}
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-xs text-muted-foreground mb-2">Profils comparés</p>
      )}
      {result.explanation.length > 0 && (
        <ul className="space-y-0.5 mb-2">
          {result.explanation.map((e) => (
            <li key={e} className="text-xs text-warning-foreground leading-snug">
              · {e}
            </li>
          ))}
        </ul>
      )}
      {result.notes.length > 0 && (
        <ul className="space-y-0.5 mb-2">
          {result.notes.map((n) => (
            <li key={n} className="text-xs text-muted-foreground italic leading-snug">
              · {n}
            </li>
          ))}
        </ul>
      )}
      <p className="text-[11px] text-muted-foreground/80">
        {result.total} critère{result.total > 1 ? "s" : ""} comparé{result.total > 1 ? "s" : ""} sur 8 possibles.
      </p>
      {reliability === "partial" && (
        <>
          <Alert className="mt-2 border-warning/40 bg-warning/5">
            <AlertDescription className="text-[11px] leading-snug text-foreground">
              Score partiel : certains critères ne sont pas encore mesurables (rythme de vie, langues, intérêts, ambiance foyer, besoins des animaux). Le score gagne en précision avec chaque champ complété, du vôtre comme de l'autre profil.
            </AlertDescription>
          </Alert>
          <Link
            to={profilePath}
            onClick={(e) => e.stopPropagation()}
            className="mt-2 inline-flex items-center gap-1.5 rounded-md bg-primary px-3 py-1.5 text-[11px] font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
          >
            <Sparkles className="h-3 w-3" aria-hidden />
            Compléter mon profil
          </Link>
        </>
      )}
      {reliability === "complete" && (
        <p className="mt-2 pt-2 border-t border-border text-[11px] font-medium text-success">
          Score complet, très fiable.
        </p>
      )}
    </>
  );
};

export default AffinityDetailsPopoverContent;
