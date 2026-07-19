/**
 * AlmaRailWhisper — clôture le rail (confirmé et nouveau gardien).
 * Carte à bordure pointillée, pastille Alma respirante, une seule phrase
 * choisie selon l'état réel du gardien. Jamais un bandeau système.
 *
 * Vague 14 : lit `useAlmaHidden`. Si Alma est masquée, la carte propose
 * de la réafficher plutôt que d'ouvrir le dock.
 */
import type { KeyboardEvent } from "react";
import AlmaAvatar from "@/components/ai/alma/AlmaAvatar";
import { useAlmaHidden } from "@/hooks/useAlmaHidden";
import { toast } from "sonner";

interface AlmaRailWhisperProps {
  profileCompletion?: number;
  isAvailable?: boolean;
  checklistVisible?: boolean;
  variant?: "confirmed" | "newSitter" | "owner";
  openingCardVisible?: boolean;
  /** Contexte propriétaire (variant="owner") */
  ownerState?: {
    ongoingSit: boolean;
    ongoingSitterFirstName?: string | null;
    pendingApps: boolean;
    noActiveSit: boolean;
  };
}

const AlmaRailWhisper = ({
  profileCompletion = 100,
  isAvailable = true,
  checklistVisible = false,
  variant = "confirmed",
  openingCardVisible = false,
  ownerState,
}: AlmaRailWhisperProps) => {
  const { hidden, setHidden } = useAlmaHidden();

  let phrase: string;
  if (hidden) {
    phrase = "Je reste à portée de voix si vous changez d'avis.";
  } else if (variant === "owner" && ownerState) {
    if (ownerState.ongoingSit) {
      phrase = ownerState.ongoingSitterFirstName
        ? `Tout se passe bien chez vous. ${ownerState.ongoingSitterFirstName} veille sur la maison.`
        : "Tout se passe bien chez vous, votre gardien veille sur la maison.";
    } else if (ownerState.pendingApps) {
      phrase = "Prenez le temps de lire chaque candidature, la bonne rencontre se sent vite.";
    } else if (ownerState.noActiveSit) {
      phrase = "Quand vous serez prêt à partir, je vous aide à raconter votre maison.";
    } else {
      phrase = "Votre annonce vit. Les bonnes personnes finissent toujours par se croiser.";
    }
  } else if (variant === "newSitter" && openingCardVisible) {
    phrase =
      "Bienvenue chez vous. Une photo, quelques mots, et je vous présente les maisons d'ici.";
  } else if (!checklistVisible && profileCompletion < 100) {
    phrase = "Quelques touches à votre profil, et les propriétaires vous remarquent davantage.";
  } else if (!isAvailable) {
    phrase = "Dites que vous êtes disponible, et les bonnes gardes viennent à vous.";
  } else {
    phrase = "Votre profil est prêt. Une belle rencontre peut arriver à tout moment.";
  }

  const handleActivate = () => {
    if (hidden) {
      void (async () => {
        try {
          await setHidden(false);
          toast.success("Alma est de retour à vos côtés.");
        } catch {
          /* silent */
        }
      })();
      return;
    }
    try {
      window.dispatchEvent(new CustomEvent("alma:open-dock"));
    } catch {
      /* silent */
    }
  };

  const onKeyDown = (e: KeyboardEvent<HTMLElement>) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      handleActivate();
    }
  };

  const linkLabel = hidden ? "Réafficher Alma" : "Parler à Alma";
  const ariaLabel = hidden ? "Réafficher Alma" : "Parler à Alma";

  return (
    <aside
      role="button"
      tabIndex={0}
      aria-label={ariaLabel}
      onClick={handleActivate}
      onKeyDown={onKeyDown}
      className="bg-card flex items-start cursor-pointer transition-shadow duration-200 hover:shadow-[0_2px_4px_rgba(29,27,22,.05),0_18px_40px_rgba(29,27,22,.09)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
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
        <p
          className="text-primary mt-[10px]"
          style={{ fontSize: "12px", fontWeight: 700 }}
          aria-hidden={true}
        >
          {linkLabel}
        </p>
      </div>
    </aside>
  );
};

export default AlmaRailWhisper;
