/**
 * Rail droit, carte Alma unique (une seule phrase en Playfair italique,
 * vouvoiement). Remplace l'empilement des trois whispers historiques sur le
 * profil public gardien. Choisit UNE phrase pertinente selon le contexte.
 *
 * Design : bordure pointillée, pastille dégradé radial, aucune décoration
 * lucide dans le contenu (icône Alma OK car elle EST l'identité de l'agent).
 *
 * Lot A6 (14/10/2026) : le profil public (/gardiens/:id) est rendu hors de la
 * coquille membre, le dock d'Alma n'y est jamais monté. « Parler à Alma »
 * envoyait un événement que personne n'écoutait. Désormais :
 *   - visiteur (signupHref) : lien vers l'inscription avec retour au profil ;
 *   - action explicite (onAction) : bouton ;
 *   - sinon : carte de lecture, sans bouton.
 */
import { Link } from "react-router-dom";
import AlmaAvatar from "@/components/ai/alma/AlmaAvatar";
import { trackEvent } from "@/lib/analytics";

interface AlmaWhisperCardProps {
  /** Phrase à afficher. Si vide, le composant ne rend rien. */
  phrase: string | null;
  /** Libellé de l'action (lien visiteur ou bouton). */
  actionLabel?: string;
  onAction?: () => void;
  /** Lot A6 : visiteur, adresse d'inscription (redirection vers le profil). */
  signupHref?: string | null;
  /** Lot A6 : onglet du profil, porté par l'événement de clic. */
  surface?: string;
}

const CARD_CLASS =
  "bg-card flex items-start gap-[14px] rounded-2xl border border-dashed border-border p-[15px_18px]";
const ACTIVE_CLASS =
  " cursor-pointer transition-shadow duration-200 hover:shadow-[0_2px_4px_hsl(var(--foreground)/0.05),0_18px_40px_hsl(var(--foreground)/0.09)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2";

const CardBody = ({ phrase, actionLabel }: { phrase: string; actionLabel?: string | null }) => (
  <>
    <div
      className="shrink-0 rounded-full border border-border flex items-center justify-center"
      style={{
        width: 38,
        height: 38,
        background:
          "radial-gradient(circle at 35% 30%, hsl(var(--card)) 0%, hsl(var(--primary) / 0.12) 100%)",
      }}
    >
      <AlmaAvatar size={32} mood="gentle" aria-hidden={true} />
    </div>
    <div className="min-w-0">
      <p className="text-primary text-[13px] font-bold">Alma</p>
      <p className="font-heading italic text-foreground mt-2 text-[14.5px] leading-[1.5]">
        «&nbsp;{phrase}&nbsp;»
      </p>
      {actionLabel && (
        <p className="text-primary mt-[10px] text-[12px] font-bold">{actionLabel}</p>
      )}
    </div>
  </>
);

const AlmaWhisperCard = ({
  phrase,
  actionLabel,
  onAction,
  signupHref = null,
  surface = "public_profile",
}: AlmaWhisperCardProps) => {
  if (!phrase) return null;

  if (signupHref) {
    const label = actionLabel ?? "Créer mon compte";
    return (
      <Link
        to={signupHref}
        data-testid="alma-whisper-card-signup"
        onClick={() => {
          void trackEvent("alma_whisper_card_clicked", {
            source: "public_profile",
            metadata: { is_visitor: true, surface, action: "signup" },
          });
        }}
        className={`${CARD_CLASS}${ACTIVE_CLASS} no-underline`}
      >
        <CardBody phrase={phrase} actionLabel={label} />
      </Link>
    );
  }

  if (onAction) {
    const label = actionLabel ?? "Parler à Alma";
    return (
      <button
        type="button"
        onClick={() => onAction()}
        aria-label={label}
        className={`${CARD_CLASS}${ACTIVE_CLASS} w-full text-left`}
      >
        <CardBody phrase={phrase} actionLabel={label} />
      </button>
    );
  }

  return (
    <aside className={CARD_CLASS} data-testid="alma-whisper-card">
      <CardBody phrase={phrase} />
    </aside>
  );
};

export default AlmaWhisperCard;
