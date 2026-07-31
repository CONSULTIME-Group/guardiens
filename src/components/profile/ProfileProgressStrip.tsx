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
  /** Items manquants nommés, avec leurs points, comme la sidebar desktop. */
  missingScoreItems?: Array<{ key: string; label: string; points: number }>;
}

/** Seuil à partir duquel le profil est actif : candidatures, recherche, contact. */
const ACTIVE_THRESHOLD = 80;

/**
 * Bandeau de progression intégré en HAUT de la save bar mobile.
 * Affiche la barre fine, les items manquants nommés avec leurs points,
 * et le CTA "Compléter".
 *
 * À partir de 80%, le registre change : le message dominant n'est plus un
 * décompte de ce qui manque mais un état de fait, le profil est actif et la
 * personne peut candidater. Ce qui reste est présenté comme un plus.
 *
 * Caché sur desktop (sidebar déjà visible avec ScoreBreakdown + lien public).
 */
const ProfileProgressStrip = memo(
  ({
    completion,
    nextIncomplete,
    onJumpToSection,
    publicProfileUrl,
    totalRemaining,
    missingScoreItems,
  }: ProfileProgressStripProps) => {
    const pct = Math.max(0, Math.min(100, completion));
    const isComplete = pct >= 100 || !nextIncomplete;
    const isActive = pct >= ACTIVE_THRESHOLD;

    if (totalRemaining !== undefined && totalRemaining < 2 && !isActive) return null;

    const named = (missingScoreItems ?? []).slice(0, 4);

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
        <div className="px-4 py-2 space-y-1.5">
          <div className="flex items-center justify-between gap-2">
            <div className="min-w-0 flex-1">
              <div className="flex items-baseline gap-2">
                <span className="text-sm font-semibold text-foreground tabular-nums">
                  {pct}%
                </span>
                <span className="text-xs text-muted-foreground truncate">
                  {isComplete
                    ? "Profil complet, visibilité maximale"
                    : isActive
                      ? "Votre profil est actif"
                      : totalRemaining !== undefined
                        ? `${totalRemaining} item${totalRemaining > 1 ? "s" : ""} à compléter`
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
                  {isActive ? "Continuer" : "Compléter"}
                  <ArrowUp className="h-3 w-3 rotate-45" aria-hidden="true" />
                </button>
              )}
            </div>
          </div>

          {isActive && !isComplete && (
            <p className="text-[11px] text-muted-foreground leading-snug" data-testid="profile-active-note">
              Vous pouvez candidater dès maintenant, votre profil apparaît dans les recherches et
              les propriétaires peuvent vous contacter. Ce qui suit est un plus, pas une condition.
            </p>
          )}

          {named.length > 0 && (
            <ul className="flex flex-wrap gap-1.5" data-testid="profile-missing-items">
              {named.map((it) => (
                <li
                  key={it.key}
                  className="inline-flex items-baseline gap-1 rounded-full border border-border bg-background px-2 py-0.5 text-[11px] text-muted-foreground"
                >
                  <span className="truncate max-w-[46vw]">{it.label}</span>
                  <span className="tabular-nums text-foreground/70">+{it.points}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    );
  },
);

ProfileProgressStrip.displayName = "ProfileProgressStrip";
export default ProfileProgressStrip;
