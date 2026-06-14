import { memo } from "react";
import { ArrowUp } from "lucide-react";

interface ProfileProgressStripProps {
  completion: number;
  nextIncomplete?: { id: string; label: string; missingCount: number };
  onJumpToSection?: (id: string) => void;
}

/**
 * Bandeau de progression intégré en HAUT de la save bar mobile.
 * Affiche la barre fine + le prochain champ manquant + CTA "Compléter".
 * Caché sur desktop (sidebar déjà visible avec ScoreBreakdown).
 */
const ProfileProgressStrip = memo(
  ({ completion, nextIncomplete, onJumpToSection }: ProfileProgressStripProps) => {
    const pct = Math.max(0, Math.min(100, completion));
    const isComplete = pct >= 100 || !nextIncomplete;

    return (
      <div className="lg:hidden border-b border-border bg-muted/30">
        <div
          className="h-1 bg-muted overflow-hidden"
          role="progressbar"
          aria-valuenow={pct}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label={`Profil complété à ${pct} pourcent`}
        >
          <div
            className="h-full bg-primary transition-all duration-500 ease-out"
            style={{ width: `${pct}%` }}
          />
        </div>
        <div className="px-4 py-2 flex items-center justify-between gap-3">
          <div className="min-w-0 flex-1">
            <div className="flex items-baseline gap-2">
              <span className="text-sm font-semibold text-foreground tabular-nums">
                {pct}%
              </span>
              <span className="text-xs text-muted-foreground truncate">
                {isComplete
                  ? "Profil complet, visibilité maximale"
                  : `Suivant : ${nextIncomplete!.label}`}
              </span>
            </div>
          </div>
          {!isComplete && (
            <button
              type="button"
              onClick={() => onJumpToSection?.(nextIncomplete!.id)}
              className="shrink-0 inline-flex items-center gap-1 rounded-full bg-primary text-primary-foreground text-xs font-semibold px-3 py-1.5 hover:opacity-90 active:scale-95 transition-all"
              aria-label={`Aller à la section ${nextIncomplete!.label}`}
            >
              Compléter
              <ArrowUp className="h-3 w-3 rotate-45" aria-hidden="true" />
            </button>
          )}
        </div>
      </div>
    );
  },
);

ProfileProgressStrip.displayName = "ProfileProgressStrip";
export default ProfileProgressStrip;
