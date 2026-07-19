/**
 * AlmaRailWhisper — clôture le rail confirmé (vague 4).
 * Carte à bordure pointillée, pastille Alma respirante, une seule phrase
 * choisie selon l'état réel du gardien. Jamais un bandeau système.
 */
import AlmaAvatar from "@/components/ai/alma/AlmaAvatar";

interface AlmaRailWhisperProps {
  profileCompletion: number;
  isAvailable: boolean;
}

const AlmaRailWhisper = ({ profileCompletion, isAvailable }: AlmaRailWhisperProps) => {
  let phrase: string;
  if (profileCompletion < 100) {
    phrase = "Quelques touches à votre profil, et les propriétaires vous remarquent davantage.";
  } else if (!isAvailable) {
    phrase = "Dites que vous êtes disponible, et les bonnes gardes viennent à vous.";
  } else {
    phrase = "Votre profil est prêt. Une belle rencontre peut arriver à tout moment.";
  }

  return (
    <aside
      className="bg-card flex items-start"
      style={{
        border: "1px dashed hsl(var(--border))",
        borderRadius: "16px",
        padding: "14px 22px",
        gap: "14px",
      }}
    >
      <div
        className="shrink-0 rounded-full border border-border flex items-center justify-center"
        style={{
          width: "38px",
          height: "38px",
          background:
            "radial-gradient(circle at 35% 30%, #ffffff 0%, hsl(var(--primary) / 0.12) 100%)",
        }}
      >
        <AlmaAvatar size={32} mood="gentle" aria-hidden={true} />
      </div>
      <div className="min-w-0">
        <p className="text-primary" style={{ fontSize: "13px", fontWeight: 700 }}>
          Alma
        </p>
        <p
          className="font-heading text-foreground mt-[8px]"
          style={{ fontSize: "14.5px", fontStyle: "italic", lineHeight: 1.5 }}
        >
          «&nbsp;{phrase}&nbsp;»
        </p>
      </div>
    </aside>
  );
};

export default AlmaRailWhisper;
