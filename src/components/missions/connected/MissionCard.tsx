import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Lock, Sparkles, ChevronRight, UserPen } from "lucide-react";
import { Link } from "react-router-dom";
import { CATEGORY_META, formatCity, formatDuration, ModeFilter } from "./constants";
import { sanitizeBioForCard } from "@/lib/sanitizeBio";

const formatDateNeeded = (d?: string | null) => {
  if (!d) return null;
  try {
    return new Date(d).toLocaleDateString("fr-FR", { day: "numeric", month: "short" });
  } catch { return null; }
};

interface Props {
  mission: any;
  currentUserId?: string;
  isAuthenticated: boolean;
  canApplyMissions: boolean;
  mode: ModeFilter;
  onNavigateDetail: () => void;
  onPropose: () => void;
  /**
   * Mode compact pour la mini-bio : tronque à ~80 caractères et clamp 1 ligne.
   * Utile quand la grille rend beaucoup de cartes (densité visuelle / scroll).
   */
  compactBio?: boolean;
  /**
   * A/B test `mission_card_bio_v1` : si false, on ne rend pas du tout la bio
   * (ni texte, ni placeholder, ni CTA auteur). Permet de comparer A (sans bio)
   * vs B (avec bio) sur taux de clic + scroll dans `SmallMissions`.
   */
  showBio?: boolean;
}

const MissionCard = ({ mission: m, currentUserId, isAuthenticated, canApplyMissions, mode, onNavigateDetail, onPropose, compactBio = false, showBio = true }: Props) => {
  const meta = CATEGORY_META[m.category] || CATEGORY_META.animals;
  const isCompleted = m.status === "completed";
  const isMine = m.user_id === currentUserId;
  const authorName = (m.profiles as any)?.first_name || "un membre";
  const authorLabel = isMine ? "vous" : authorName;
  const authorInitial = authorName.charAt(0).toUpperCase();

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onNavigateDetail}
      onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); onNavigateDetail(); } }}
      className="cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-primary rounded-lg"
    >
      <Card className={`border-border transition-colors h-full ${isCompleted ? "opacity-50 grayscale" : "hover:border-primary/30"}`}>
        <CardContent className="p-4 space-y-2">
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{meta.label}</span>
            {m.response_count > 0 ? (
              <span className="text-xs text-muted-foreground bg-accent px-2 py-0.5 rounded-full">
                {m.response_count} proposition{m.response_count > 1 ? "s" : ""}
              </span>
            ) : !isCompleted && !isMine ? (
              <span className="inline-flex items-center gap-1 text-xs text-primary bg-primary/10 px-2 py-0.5 rounded-full">
                <Sparkles className="h-3 w-3" /> Premier à aider
              </span>
            ) : null}
          </div>
          <p className="font-medium text-sm text-foreground">{m.title}</p>
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            {(m.profiles as any)?.avatar_url ? (
              <img
                src={(m.profiles as any).avatar_url}
                alt=""
                loading="lazy"
                className="h-6 w-6 rounded-full border border-border object-cover"
              />
            ) : (
              <span className="flex h-6 w-6 items-center justify-center rounded-full border border-border bg-muted text-[11px] font-semibold text-foreground">
                {authorInitial || "?"}
              </span>
            )}
            <span>
              Demandé par <span className="font-medium text-foreground">{authorLabel}</span>
            </span>
          </div>
          {/* Mini bio de l'auteur, donne du contexte humain (« qui est cette personne ? »)
              avant que l'utilisateur clique pour ouvrir le détail. Caché si auteur = vous. */}
          {showBio && (() => {
            const safeBio = sanitizeBioForCard((m.profiles as any)?.bio);

            // Bio absente, l'auteur voit un CTA discret l'invitant à se présenter ;
            // les autres voient un placeholder neutre (« Sans présentation ») pour ne
            // pas stigmatiser la personne et garder la hauteur de carte stable.
            if (!safeBio) {
              if (isMine) {
                return (
                  <Link
                    to="/profile?focus=bio"
                    onClick={(e) => e.stopPropagation()}
                    className="inline-flex items-center gap-1 text-xs text-primary hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-primary rounded"
                  >
                    <UserPen className="h-3 w-3" />
                    Ajoutez une mini-bio pour rassurer les gardiens
                  </Link>
                );
              }
              return (
                <p className="text-xs italic text-muted-foreground/70 leading-snug">
                  Sans présentation pour l'instant
                </p>
              );
            }

            if (isMine) return null;

            // Mode compact : tronque à 80 car. + clamp 1 ligne (gain ~16px/carte,
            // utile sur grilles 3 colonnes ou liste mobile très longue).
            const displayBio = compactBio && safeBio.length > 80
              ? `${safeBio.slice(0, 80).trimEnd()}…`
              : safeBio;
            return (
              <p className={`text-xs italic text-foreground/70 leading-snug ${compactBio ? "line-clamp-1" : "line-clamp-2"}`}>
                « {displayBio} »
              </p>
            );
          })()}
          <p className="text-xs text-muted-foreground">
            {formatCity(m.city || ",")} · {formatDuration(m.duration_estimate || ",")}
            {formatDateNeeded(m.date_needed) && <> · pour le {formatDateNeeded(m.date_needed)}</>}
          </p>
          <p className="text-xs text-muted-foreground">En échange : {m.exchange_offer}</p>
          {isCompleted ? (
            <span className="inline-block text-xs bg-muted text-muted-foreground px-2 py-0.5 rounded-full">Trouvé</span>
          ) : m.status === "in_progress" ? (
            <span className="inline-block text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full">En cours</span>
          ) : null}
          {!isCompleted && (
            isMine ? (
              <span className="inline-block text-xs text-muted-foreground text-center w-full mt-2">Votre mission</span>
            ) : isAuthenticated && !canApplyMissions ? (
              <Button size="sm" variant="outline" className="w-full mt-2 gap-1 text-muted-foreground" disabled>
                <Lock className="h-3 w-3" /> Complétez votre profil
              </Button>
            ) : m.already_proposed ? (
              <Button size="sm" variant="outline" className="w-full mt-2 opacity-60 cursor-not-allowed" disabled>
                Proposition envoyée
              </Button>
            ) : (
              <Button
                size="sm"
                className="w-full mt-2"
                onClick={(e) => { e.preventDefault(); e.stopPropagation(); onPropose(); }}
              >
                {mode === "offer" ? `Aider ${authorName}` : `Proposer à ${authorName}`}
                <ChevronRight className="ml-1 h-3.5 w-3.5" />
              </Button>
            )
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default MissionCard;
