/**
 * Contenu partagé du popover d'explication d'affinité.
 * Utilisé par AffinityBadge (chip) ET AffinityRing (SitterMatchSection).
 * Source unique de vérité pour l'explicabilité IA du score.
 */
import { Link } from "react-router-dom";
import { Sparkles } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import type { AffinityResult } from "@/lib/affinityScore";
import { useAuth } from "@/contexts/AuthContext";

interface Props {
  result: AffinityResult;
}

const AffinityDetailsPopoverContent = ({ result }: Props) => {
  const { activeRole } = useAuth();
  const reliability: "complete" | "partial" | "neutral" =
    result.total >= 6 ? "complete" : result.total <= 3 ? "partial" : "neutral";
  const profilePath = activeRole === "owner" ? "/owner-profile" : "/profile";

  return (
    <>
      <p className="text-xs font-semibold mb-1.5 text-foreground">
        {result.score}% de compatibilité{reliability === "partial" ? " (score partiel)" : ""}
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
        <p className="text-xs text-muted-foreground mb-2">Profils compatibles</p>
      )}
      <p className="text-[11px] text-muted-foreground/80">
        {result.total} critère{result.total > 1 ? "s" : ""} comparé{result.total > 1 ? "s" : ""} sur 7 possibles.
      </p>
      {reliability === "partial" && (
        <>
          <Alert className="mt-2 border-warning/40 bg-warning/5">
            <AlertDescription className="text-[11px] leading-snug text-foreground">
              Score partiel : 4 critères ne sont pas encore mesurables (rythme de vie, langues, intérêts, ambiance foyer). Le score gagne en précision avec chaque champ complété, du vôtre comme du gardien.
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
