import { memo } from "react";
import { Link } from "react-router-dom";
import { ArrowUp, Eye } from "lucide-react";

interface ProfileProgressStripProps {
  completion: number;
  nextIncomplete?: { id: string; label: string; missingCount: number };
  onJumpToSection?: (id: string) => void;
  /** URL du profil public, ouverte dans un nouvel onglet. */
  publicProfileUrl?: string;
  /** Nombre total d'items restants à compléter dans tout le profil. */
  totalRemaining?: number;
}

/**
 * Bandeau de progression intégré en HAUT de la save bar mobile.
 * Affiche la barre fine + le prochain champ manquant + CTA "Compléter".
 * Bouton "Voir profil public" en accès direct (nouvel onglet) pour permettre
 * à l'utilisateur de vérifier le rendu sans perdre son travail d'édition.
 * Caché sur desktop (sidebar déjà visible avec ScoreBreakdown + lien public).
 */
const ProfileProgressStrip = memo(
  ({ completion, nextIncomplete, onJumpToSection, publicProfileUrl }: ProfileProgressStripProps) => {
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
        <div className="px-4 py-2 flex items-center justify-between gap-2">
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
          <div className="flex items-center gap-1.5 shrink-0">
            {publicProfileUrl && publicProfileUrl !== "#" && (
              <Link
                to={publicProfileUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 rounded-full border border-border bg-background text-foreground/80 text-xs font-medium px-2.5 py-1.5 hover:bg-muted active:scale-95 transition-all"
                aria-label="Voir mon profil public dans un nouvel onglet"
                title="Aperçu profil public"
              >
                <Eye className="h-3.5 w-3.5" aria-hidden="true" />
                <span className="hidden xs:inline">Aperçu</span>
              </Link>
            )}
            {!isComplete && (
              <button
                type="button"
                onClick={() => onJumpToSection?.(nextIncomplete!.id)}
                className="inline-flex items-center gap-1 rounded-full bg-primary text-primary-foreground text-xs font-semibold px-3 py-1.5 hover:opacity-90 active:scale-95 transition-all"
                aria-label={`Aller à la section ${nextIncomplete!.label}`}
              >
                Compléter
                <ArrowUp className="h-3 w-3 rotate-45" aria-hidden="true" />
              </button>
            )}
          </div>
        </div>
      </div>
    );
  },
);

ProfileProgressStrip.displayName = "ProfileProgressStrip";
export default ProfileProgressStrip;
