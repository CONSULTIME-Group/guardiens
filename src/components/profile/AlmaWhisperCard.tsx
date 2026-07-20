/**
 * Rail droit — carte Alma unique (une seule phrase en Playfair italique,
 * vouvoiement). Remplace l'empilement des trois whispers historiques sur le
 * profil public gardien. Choisit UNE phrase pertinente selon le contexte.
 *
 * Design : bordure pointillée, pastille dégradé radial, aucune décoration
 * lucide dans le contenu (icône Alma OK car elle EST l'identité de l'agent).
 */
import AlmaAvatar from "@/components/ai/alma/AlmaAvatar";

interface AlmaWhisperCardProps {
  /** Phrase à afficher. Si vide, le composant ne rend rien. */
  phrase: string | null;
  /** Label du lien d'action (défaut : "Parler à Alma"). */
  actionLabel?: string;
  onAction?: () => void;
}

const AlmaWhisperCard = ({
  phrase,
  actionLabel = "Parler à Alma",
  onAction,
}: AlmaWhisperCardProps) => {
  if (!phrase) return null;

  const handleActivate = () => {
    if (onAction) return onAction();
    try {
      window.dispatchEvent(new CustomEvent("alma:open-dock"));
    } catch {
      /* silent */
    }
  };

  return (
    <aside
      role="button"
      tabIndex={0}
      onClick={handleActivate}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          handleActivate();
        }
      }}
      aria-label={actionLabel}
      className="bg-card flex items-start gap-[14px] cursor-pointer rounded-2xl border border-dashed border-border p-[15px_18px] transition-shadow duration-200 hover:shadow-[0_2px_4px_hsl(var(--foreground)/0.05),0_18px_40px_hsl(var(--foreground)/0.09)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
    >
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
        <p className="text-primary mt-[10px] text-[12px] font-bold" aria-hidden={true}>
          {actionLabel}
        </p>
      </div>
    </aside>
  );
};

export default AlmaWhisperCard;
