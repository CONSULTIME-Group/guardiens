import { memo } from "react";
import { ArrowUp } from "lucide-react";

interface MobileProfileProgressBarProps {
  /** Score live 0-100. */
  completion: number;
  /** Première section essentielle non complétée (id + label + count champs manquants). */
  nextIncomplete?: {
    id: string;
    label: string;
    missingCount: number;
  };
  /** Click sur le CTA, déclenche le saut de section + scroll. */
  onJumpToSection?: (id: string) => void;
}

/**
 * Barre de progression sticky bas, visible uniquement sur mobile (<lg).
 * Reste visible pendant l'édition du profil, pousse vers le prochain champ
 * manquant pour faire grimper le score sans avoir à remonter dans la sidebar.
 *
 * z-30 pour passer sous d'éventuels overlays (toasts z-50, dialogs z-50)
 * mais au-dessus du contenu standard.
 */
const MobileProfileProgressBar = memo(
  ({ completion, nextIncomplete, onJumpToSection }: MobileProfileProgressBarProps) => {
    const pct = Math.max(0, Math.min(100, completion));
    const isComplete = pct >= 100 || !nextIncomplete;

    return (
      <div
        className="lg:hidden fixed bottom-0 inset-x-0 z-30 bg-background/95 backdrop-blur-md border-t border-border shadow-[0_-4px_16px_-6px_hsl(var(--foreground)/0.1)]"
        role="region"
        aria-label="Progression du profil"
      >
        {/* Barre de progression fine en haut, lecture immédiate du score. */}
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

        <div className="px-4 py-2.5 flex items-center justify-between gap-3">
          <div className="min-w-0 flex-1">
            <div className="flex items-baseline gap-2">
              <span className="text-sm font-semibold text-foreground tabular-nums">
                {pct}%
              </span>
              <span className="text-xs text-muted-foreground truncate">
                {isComplete
                  ? "Profil complet, vous gagnez en visibilité"
                  : `Suivant : ${nextIncomplete!.label}`}
              </span>
            </div>
            {!isComplete && nextIncomplete!.missingCount > 0 && (
              <p className="text-[11px] text-muted-foreground mt-0.5">
                {nextIncomplete!.missingCount === 1
                  ? "1 champ à compléter"
                  : `${nextIncomplete!.missingCount} champs à compléter`}
              </p>
            )}
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

MobileProfileProgressBar.displayName = "MobileProfileProgressBar";
export default MobileProfileProgressBar;
